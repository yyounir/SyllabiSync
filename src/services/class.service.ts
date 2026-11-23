import { supabase } from '@/lib/supabase';
import { ClassItem } from '@/types/database';

export const classService = {
  async getClasses(userId: string): Promise<{ data: ClassItem[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      return { data, error };
    } catch (error) {
      console.error('classService.getClasses error:', error);
      return { data: null, error };
    }
  },

  async getClassById(classId: string): Promise<{ data: ClassItem | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .single();

      return { data, error };
    } catch (error) {
      console.error('classService.getClassById error:', error);
      return { data: null, error };
    }
  },

  async createClass(newClass: Omit<ClassItem, 'id' | 'created_at' | 'updated_at'>): Promise<{ data: ClassItem | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('classes')
        .insert({
          ...newClass,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('classService.createClass error:', error);
      return { data: null, error };
    }
  },

  async updateClass(classId: string, updates: Partial<ClassItem>): Promise<{ data: ClassItem | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('classes')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', classId)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('classService.updateClass error:', error);
      return { data: null, error };
    }
  },

  async deleteClass(classId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase.from('classes').delete().eq('id', classId);
      return { error };
    } catch (error) {
      console.error('classService.deleteClass error:', error);
      return { error };
    }
  },
};
