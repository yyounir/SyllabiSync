import { supabase } from '@/lib/supabase';
import { AcademicItem, AcademicItemStatus } from '@/types/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCAL_ITEMS_KEY = 'syllabisync_local_academic_items';
const LOCAL_CLASSES_KEY = 'syllabisync_local_classes';

async function getLocalItems(): Promise<AcademicItem[]> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_ITEMS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveLocalItems(newItems: AcademicItem[]): Promise<void> {
  try {
    const existing = await getLocalItems();
    const newIds = new Set(newItems.map((i) => i.id));
    const merged = [...newItems, ...existing.filter((i) => !newIds.has(i.id))];
    await AsyncStorage.setItem(LOCAL_ITEMS_KEY, JSON.stringify(merged));
  } catch (err) {
    console.warn('Error saving local items:', err);
  }
}

async function removeLocalItem(itemId: string): Promise<void> {
  try {
    const existing = await getLocalItems();
    const filtered = existing.filter((i) => i.id !== itemId);
    await AsyncStorage.setItem(LOCAL_ITEMS_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.warn('Error removing local item:', err);
  }
}

async function getLocalClassLookup(): Promise<Record<string, { course_name: string; course_code: string; color: string }>> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_CLASSES_KEY);
    if (!raw) return {};
    const classes = JSON.parse(raw);
    const lookup: Record<string, { course_name: string; course_code: string; color: string }> = {};
    for (const c of classes) {
      lookup[c.id] = {
        course_name: c.course_name,
        course_code: c.course_code,
        color: c.color,
      };
    }
    return lookup;
  } catch {
    return {};
  }
}

export const academicItemService = {
  async getItems(
    userId: string,
    options?: {
      classId?: string;
      status?: AcademicItemStatus;
      type?: string;
      limit?: number;
    }
  ): Promise<{ data: AcademicItem[] | null; error: any }> {
    let remoteData: AcademicItem[] | null = null;
    let remoteError: any = null;

    try {
      let query = supabase
        .from('academic_items')
        .select(
          `
          *,
          classes:class_id (
            course_name,
            course_code,
            color
          )
        `
        )
        .eq('user_id', userId);

      if (options?.classId) {
        query = query.eq('class_id', options.classId);
      }
      if (options?.status) {
        query = query.eq('status', options.status);
      }
      if (options?.type) {
        query = query.eq('type', options.type);
      }

      query = query.order('due_date', { ascending: true, nullsFirst: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (!error && data) {
        remoteData = (data || []).map((item: any) => ({
          ...item,
          course_name: item.classes?.course_name,
          course_code: item.classes?.course_code,
          course_color: item.classes?.color,
        }));
      } else {
        remoteError = error;
      }
    } catch (error) {
      remoteError = error;
    }

    // Load local items
    const localItems = await getLocalItems();
    const classLookup = await getLocalClassLookup();

    const mappedLocal = localItems.map((item) => ({
      ...item,
      course_name: item.course_name || classLookup[item.class_id]?.course_name,
      course_code: item.course_code || classLookup[item.class_id]?.course_code,
      course_color: item.course_color || classLookup[item.class_id]?.color,
    }));

    // Filter local items
    let filteredLocal = mappedLocal;
    if (options?.classId) {
      filteredLocal = filteredLocal.filter((i) => i.class_id === options.classId);
    }
    if (options?.status) {
      filteredLocal = filteredLocal.filter((i) => i.status === options.status);
    }
    if (options?.type) {
      filteredLocal = filteredLocal.filter((i) => i.type === options.type);
    }

    filteredLocal.sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });

    if (options?.limit) {
      filteredLocal = filteredLocal.slice(0, options.limit);
    }

    if (remoteData && remoteData.length > 0) {
      const remoteIds = new Set(remoteData.map((i) => i.id));
      const merged = [...remoteData, ...filteredLocal.filter((i) => !remoteIds.has(i.id))];
      return { data: merged, error: null };
    }

    if (filteredLocal.length > 0) {
      return { data: filteredLocal, error: null };
    }

    return { data: remoteData || [], error: remoteError ? null : null };
  },

  async createItem(
    item: Omit<AcademicItem, 'id' | 'created_at' | 'updated_at'>
  ): Promise<{ data: AcademicItem | null; error: any }> {
    const now = new Date().toISOString();

    try {
      const { data, error } = await supabase
        .from('academic_items')
        .insert({
          ...item,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (!error && data) {
        await saveLocalItems([data]);
        return { data, error: null };
      }
    } catch {
      // ignore
    }

    const localItem: AcademicItem = {
      ...item,
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      created_at: now,
      updated_at: now,
    };

    await saveLocalItems([localItem]);
    return { data: localItem, error: null };
  },

  async createItemsBulk(
    items: Omit<AcademicItem, 'id' | 'created_at' | 'updated_at'>[]
  ): Promise<{ data: AcademicItem[] | null; error: any }> {
    const now = new Date().toISOString();
    const payload = items.map((item) => ({
      ...item,
      created_at: now,
      updated_at: now,
    }));

    try {
      const { data, error } = await supabase
        .from('academic_items')
        .insert(payload)
        .select();

      if (!error && data) {
        await saveLocalItems(data);
        return { data, error: null };
      }

      console.warn('Supabase createItemsBulk error, saving locally:', error?.message);
    } catch (err: any) {
      console.warn('Supabase createItemsBulk exception, saving locally:', err?.message);
    }

    // Local fallback for bulk items
    const localItems: AcademicItem[] = items.map((item, idx) => ({
      ...item,
      id: `item_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
      created_at: now,
      updated_at: now,
    }));

    await saveLocalItems(localItems);
    return { data: localItems, error: null };
  },

  async updateItem(
    itemId: string,
    updates: Partial<AcademicItem>
  ): Promise<{ data: AcademicItem | null; error: any }> {
    const { course_name, course_code, course_color, ...cleanUpdates } = updates as any;
    const now = new Date().toISOString();

    try {
      const { data, error } = await supabase
        .from('academic_items')
        .update({
          ...cleanUpdates,
          updated_at: now,
        })
        .eq('id', itemId)
        .select()
        .single();

      if (!error && data) {
        await saveLocalItems([data]);
        return { data, error: null };
      }
    } catch {
      // ignore
    }

    const existing = await getLocalItems();
    const target = existing.find((i) => i.id === itemId);
    if (target) {
      const updated: AcademicItem = {
        ...target,
        ...cleanUpdates,
        updated_at: now,
      };
      await saveLocalItems([updated]);
      return { data: updated, error: null };
    }

    return { data: null, error: new Error('Item not found') };
  },

  async toggleStatus(
    itemId: string,
    currentStatus: AcademicItemStatus
  ): Promise<{ data: AcademicItem | null; error: any }> {
    const nextStatus: AcademicItemStatus =
      currentStatus === 'completed' ? 'pending' : 'completed';
    return this.updateItem(itemId, { status: nextStatus });
  },

  async deleteItem(itemId: string): Promise<{ error: any }> {
    await removeLocalItem(itemId);

    try {
      const { error } = await supabase
        .from('academic_items')
        .delete()
        .eq('id', itemId);

      return { error };
    } catch {
      return { error: null };
    }
  },

  async deleteItemsByClassId(classId: string): Promise<void> {
    try {
      const items = await getLocalItems();
      const updated = items.filter((i) => i.class_id !== classId);
      await AsyncStorage.setItem(LOCAL_ITEMS_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('Error removing local items by classId:', err);
    }

    try {
      await supabase.from('academic_items').delete().eq('class_id', classId);
    } catch {
      // ignore
    }
  },
};
