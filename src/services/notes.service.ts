import { supabase } from '@/lib/supabase';
import { NoteItem } from '@/types/database';

export const notesService = {
  async getNotes(classId: string): Promise<{ data: NoteItem[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('class_id', classId)
        .order('created_at', { ascending: false });

      return { data, error };
    } catch (error) {
      console.error('notesService.getNotes error:', error);
      return { data: null, error };
    }
  },

  async createNote(
    note: Omit<NoteItem, 'id' | 'created_at' | 'updated_at'>
  ): Promise<{ data: NoteItem | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          ...note,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('notesService.createNote error:', error);
      return { data: null, error };
    }
  },

  async updateNote(
    noteId: string,
    updates: Partial<NoteItem>
  ): Promise<{ data: NoteItem | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('notes')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', noteId)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('notesService.updateNote error:', error);
      return { data: null, error };
    }
  },

  async deleteNote(noteId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase.from('notes').delete().eq('id', noteId);
      return { error };
    } catch (error) {
      console.error('notesService.deleteNote error:', error);
      return { error };
    }
  },
};
