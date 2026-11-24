import { supabase } from '@/lib/supabase';
import { SyllabusItem } from '@/types/database';
import { Platform } from 'react-native';

export const syllabusService = {
  async uploadSyllabusFile(
    userId: string,
    file: { uri: string; name: string; mimeType?: string; file?: File; base64?: string | null }
  ): Promise<{ path: string | null; error: any }> {
    try {
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${userId}/${timestamp}_${sanitizedName}`;

      let fileBody: any;

      if (Platform.OS === 'web' && file.file) {
        fileBody = file.file;
      } else if (file.base64) {
        // Universal base64 to Uint8Array across Hermes, Node, and Web
        if (typeof Buffer !== 'undefined') {
          fileBody = new Uint8Array(Buffer.from(file.base64, 'base64'));
        } else if (typeof atob !== 'undefined') {
          const binaryString = atob(file.base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          fileBody = bytes;
        } else {
          const response = await fetch(`data:application/octet-stream;base64,${file.base64}`);
          fileBody = await response.blob();
        }
      } else {
        // Native file upload via FormData / fetch blob
        const response = await fetch(file.uri);
        fileBody = await response.blob();
      }

      const { data, error } = await supabase.storage
        .from('syllabi')
        .upload(storagePath, fileBody, {
          contentType: file.mimeType || 'application/pdf',
          upsert: true,
        });

      if (error) {
        console.warn('Supabase storage upload error:', error);
        return { path: null, error };
      }

      return { path: data.path, error: null };
    } catch (error) {
      console.warn('syllabusService.uploadSyllabusFile exception:', error);
      return { path: null, error };
    }
  },

  async recordSyllabus(
    classId: string,
    userId: string,
    filePath: string,
    originalFilename: string,
    extractedText?: string
  ): Promise<{ data: SyllabusItem | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('syllabi')
        .insert({
          class_id: classId,
          user_id: userId,
          file_path: filePath,
          original_filename: originalFilename,
          extracted_text: extractedText || null,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (!error && data) {
        return { data, error: null };
      }
    } catch (error) {
      console.warn('syllabusService.recordSyllabus exception:', error);
    }

    return {
      data: {
        id: `syl_${Date.now()}`,
        class_id: classId,
        user_id: userId,
        file_path: filePath,
        original_filename: originalFilename,
        extracted_text: extractedText || null,
        created_at: new Date().toISOString(),
      },
      error: null,
    };
  },
};
