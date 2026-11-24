import { supabase } from '@/lib/supabase';
import { ClassItem } from '@/types/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCAL_CLASSES_KEY = 'syllabisync_local_classes';

async function getLocalClasses(): Promise<ClassItem[]> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_CLASSES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveLocalClass(newClass: ClassItem): Promise<void> {
  try {
    const classes = await getLocalClasses();
    const updated = [newClass, ...classes.filter((c) => c.id !== newClass.id)];
    await AsyncStorage.setItem(LOCAL_CLASSES_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Error saving class locally:', err);
  }
}

async function removeLocalClass(classId: string): Promise<void> {
  try {
    const classes = await getLocalClasses();
    const updated = classes.filter((c) => c.id !== classId);
    await AsyncStorage.setItem(LOCAL_CLASSES_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Error removing local class:', err);
  }
}

export const classService = {
  async getClasses(userId: string): Promise<{ data: ClassItem[] | null; error: any }> {
    let remoteData: ClassItem[] | null = null;
    let remoteError: any = null;

    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        remoteData = data;
      } else {
        remoteError = error;
      }
    } catch (error) {
      remoteError = error;
    }

    const localClasses = await getLocalClasses();

    if (remoteData && remoteData.length > 0) {
      // Merge remote and any offline local classes
      const remoteIds = new Set(remoteData.map((c) => c.id));
      const merged = [...remoteData, ...localClasses.filter((c) => !remoteIds.has(c.id))];
      return { data: merged, error: null };
    }

    // Fall back to local classes if Supabase table is not yet created or returns error
    if (localClasses.length > 0) {
      return { data: localClasses, error: null };
    }

    return { data: remoteData || [], error: remoteError ? null : null };
  },

  async getClassById(classId: string): Promise<{ data: ClassItem | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .single();

      if (!error && data) {
        return { data, error: null };
      }
    } catch {
      // ignore
    }

    // Check local classes fallback
    const localClasses = await getLocalClasses();
    const found = localClasses.find((c) => c.id === classId) || null;
    return { data: found, error: found ? null : new Error('Class not found') };
  },

  async createClass(
    newClass: Omit<ClassItem, 'id' | 'created_at' | 'updated_at'>
  ): Promise<{ data: ClassItem | null; error: any }> {
    const now = new Date().toISOString();

    // 1. Try Supabase cloud insert first
    try {
      const { data, error } = await supabase
        .from('classes')
        .insert({
          ...newClass,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (!error && data) {
        await saveLocalClass(data);
        return { data, error: null };
      }

      console.warn('Supabase createClass encountered error, saving locally:', error?.message);
    } catch (err: any) {
      console.warn('Supabase createClass exception, saving locally:', err?.message);
    }

    // 2. Fallback to resilient local storage if table doesn't exist yet
    const localClass: ClassItem = {
      ...newClass,
      id: `class_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      created_at: now,
      updated_at: now,
    };

    await saveLocalClass(localClass);
    return { data: localClass, error: null };
  },

  async updateClass(
    classId: string,
    updates: Partial<ClassItem>
  ): Promise<{ data: ClassItem | null; error: any }> {
    const now = new Date().toISOString();

    try {
      const { data, error } = await supabase
        .from('classes')
        .update({
          ...updates,
          updated_at: now,
        })
        .eq('id', classId)
        .select()
        .single();

      if (!error && data) {
        await saveLocalClass(data);
        return { data, error: null };
      }
    } catch {
      // ignore
    }

    // Update in local storage
    const localClasses = await getLocalClasses();
    const existing = localClasses.find((c) => c.id === classId);
    if (existing) {
      const updated: ClassItem = {
        ...existing,
        ...updates,
        updated_at: now,
      };
      await saveLocalClass(updated);
      return { data: updated, error: null };
    }

    return { data: null, error: new Error('Failed to update class') };
  },

  async deleteClass(classId: string): Promise<{ error: any }> {
    await removeLocalClass(classId);

    try {
      const { error } = await supabase.from('classes').delete().eq('id', classId);
      return { error };
    } catch (error) {
      return { error: null };
    }
  },
};
