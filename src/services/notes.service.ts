import { supabase } from '@/lib/supabase';
import { NoteItem } from '@/types/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCAL_NOTES_KEY = 'syllabisync_local_notes';

async function getLocalNotes(): Promise<NoteItem[]> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_NOTES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveLocalNote(note: NoteItem): Promise<void> {
  try {
    const existing = await getLocalNotes();
    const updated = [note, ...existing.filter((n) => n.id !== note.id)];
    await AsyncStorage.setItem(LOCAL_NOTES_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Error saving local note:', err);
  }
}

async function removeLocalNote(noteId: string): Promise<void> {
  try {
    const existing = await getLocalNotes();
    const filtered = existing.filter((n) => n.id !== noteId);
    await AsyncStorage.setItem(LOCAL_NOTES_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.warn('Error removing local note:', err);
  }
}

export const notesService = {
  async getNotes(classId: string): Promise<{ data: NoteItem[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('class_id', classId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return { data, error: null };
      }
    } catch {
      // ignore
    }

    const localNotes = await getLocalNotes();
    const filtered = localNotes.filter((n) => n.class_id === classId);
    return { data: filtered, error: null };
  },

  async createNote(
    note: Omit<NoteItem, 'id' | 'created_at' | 'updated_at'>
  ): Promise<{ data: NoteItem | null; error: any }> {
    const now = new Date().toISOString();

    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          ...note,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (!error && data) {
        await saveLocalNote(data);
        return { data, error: null };
      }
    } catch {
      // ignore
    }

    const localNote: NoteItem = {
      ...note,
      id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      created_at: now,
      updated_at: now,
    };

    await saveLocalNote(localNote);
    return { data: localNote, error: null };
  },

  async updateNote(
    noteId: string,
    updates: Partial<NoteItem>
  ): Promise<{ data: NoteItem | null; error: any }> {
    const now = new Date().toISOString();

    try {
      const { data, error } = await supabase
        .from('notes')
        .update({
          ...updates,
          updated_at: now,
        })
        .eq('id', noteId)
        .select()
        .single();

      if (!error && data) {
        await saveLocalNote(data);
        return { data, error: null };
      }
    } catch {
      // ignore
    }

    const localNotes = await getLocalNotes();
    const target = localNotes.find((n) => n.id === noteId);
    if (target) {
      const updated: NoteItem = {
        ...target,
        ...updates,
        updated_at: now,
      };
      await saveLocalNote(updated);
      return { data: updated, error: null };
    }

    return { data: null, error: new Error('Note not found') };
  },

  async deleteNote(noteId: string): Promise<{ error: any }> {
    await removeLocalNote(noteId);

    try {
      const { error } = await supabase.from('notes').delete().eq('id', noteId);
      return { error };
    } catch {
      return { error: null };
    }
  },
};
