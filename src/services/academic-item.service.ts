import { supabase } from '@/lib/supabase';
import { AcademicItem, AcademicItemStatus } from '@/types/database';

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

      if (error) return { data: null, error };

      // Map joined class information
      const mapped: AcademicItem[] = (data || []).map((item: any) => ({
        ...item,
        course_name: item.classes?.course_name,
        course_code: item.classes?.course_code,
        course_color: item.classes?.color,
      }));

      return { data: mapped, error: null };
    } catch (error) {
      console.error('academicItemService.getItems error:', error);
      return { data: null, error };
    }
  },

  async createItem(
    item: Omit<AcademicItem, 'id' | 'created_at' | 'updated_at'>
  ): Promise<{ data: AcademicItem | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('academic_items')
        .insert({
          ...item,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('academicItemService.createItem error:', error);
      return { data: null, error };
    }
  },

  async createItemsBulk(
    items: Omit<AcademicItem, 'id' | 'created_at' | 'updated_at'>[]
  ): Promise<{ data: AcademicItem[] | null; error: any }> {
    try {
      const now = new Date().toISOString();
      const payload = items.map((item) => ({
        ...item,
        created_at: now,
        updated_at: now,
      }));

      const { data, error } = await supabase
        .from('academic_items')
        .insert(payload)
        .select();

      return { data, error };
    } catch (error) {
      console.error('academicItemService.createItemsBulk error:', error);
      return { data: null, error };
    }
  },

  async updateItem(
    itemId: string,
    updates: Partial<AcademicItem>
  ): Promise<{ data: AcademicItem | null; error: any }> {
    try {
      // Clean undefined and joined fields before updating
      const { course_name, course_code, course_color, ...cleanUpdates } = updates as any;

      const { data, error } = await supabase
        .from('academic_items')
        .update({
          ...cleanUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('academicItemService.updateItem error:', error);
      return { data: null, error };
    }
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
    try {
      const { error } = await supabase
        .from('academic_items')
        .delete()
        .eq('id', itemId);

      return { error };
    } catch (error) {
      console.error('academicItemService.deleteItem error:', error);
      return { error };
    }
  },
};
