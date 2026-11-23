import { z } from 'zod';

export const AcademicItemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().default(''),
  type: z.enum(['assignment', 'exam', 'quiz', 'project', 'reading', 'other']),
  due_date: z.string().nullable().optional(),
  status: z.enum(['pending', 'in_progress', 'completed']).default('pending'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  points: z.number().nullable().optional(),
  grade: z.number().nullable().optional(),
  source_excerpt: z.string().nullable().optional(),
  original_date_text: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
  is_confirmed: z.boolean().default(true),
});

export const ExtractedItemSchema = z.object({
  title: z.string(),
  description: z.string().optional().default(''),
  type: z.enum(['assignment', 'exam', 'quiz', 'project', 'reading', 'other']),
  due_date: z.string().nullable().optional(), // ISO date (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
  original_date_text: z.string().nullable().optional(),
  points: z.number().nullable().optional(),
  confidence: z.number().min(0).max(1).default(0.9),
  source_excerpt: z.string().nullable().optional(),
  is_tentative: z.boolean().default(false),
});

export const ExtractedSyllabusSchema = z.object({
  course_name: z.string(),
  course_code: z.string(),
  professor_name: z.string().default('TBD'),
  professor_email: z.string().default(''),
  description: z.string().default(''),
  semester: z.string().default('Fall 2026'),
  office_hours: z.string().nullable().optional(),
  attendance_policy: z.string().nullable().optional(),
  late_policy: z.string().nullable().optional(),
  grading_breakdown: z
    .array(
      z.object({
        category: z.string(),
        weight: z.number(),
      })
    )
    .default([]),
  required_textbooks: z.array(z.string()).default([]),
  items: z.array(ExtractedItemSchema).default([]),
});

export type ExtractedSyllabus = z.infer<typeof ExtractedSyllabusSchema>;
export type ExtractedItem = z.infer<typeof ExtractedItemSchema>;
