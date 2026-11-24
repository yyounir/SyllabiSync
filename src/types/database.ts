export type AcademicItemType =
  | 'assignment'
  | 'exam'
  | 'quiz'
  | 'project'
  | 'reading'
  | 'other';

export type AcademicItemStatus = 'pending' | 'in_progress' | 'completed';
export type AcademicItemPriority = 'low' | 'medium' | 'high';
export type GoogleSyncStatus = 'not_synced' | 'synced' | 'pending' | 'failed';

export interface GradingPolicy {
  category: string;
  weight: number; // percentage, e.g. 20 for 20%
}

export interface CoursePolicy {
  title: string;
  description: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  created_at: string;
}

export interface ClassItem {
  id: string;
  user_id: string;
  course_name: string;
  course_code: string;
  professor_name: string;
  professor_email: string;
  description: string;
  semester: string;
  color: string;
  grading_breakdown?: GradingPolicy[];
  office_hours?: string | null;
  attendance_policy?: string | null;
  late_policy?: string | null;
  required_textbooks?: string[] | null;
  is_archived?: boolean;
  created_at: string;
  updated_at: string;
}

export interface SyllabusItem {
  id: string;
  class_id: string;
  user_id: string;
  file_path: string;
  original_filename: string;
  extracted_text: string | null;
  created_at: string;
}

export interface AcademicItem {
  id: string;
  class_id: string;
  user_id: string;
  title: string;
  description: string;
  type: AcademicItemType;
  due_date: string | null; // ISO string
  status: AcademicItemStatus;
  priority: AcademicItemPriority;
  points: number | null;
  grade: number | null;
  source_excerpt: string | null;
  original_date_text: string | null;
  confidence: number | null;
  is_confirmed: boolean;
  google_event_id: string | null;
  google_calendar_id: string | null;
  last_google_sync_at: string | null;
  google_sync_status: GoogleSyncStatus;
  created_at: string;
  updated_at: string;
  // joined fields
  course_name?: string;
  course_code?: string;
  course_color?: string;
}

export interface NoteItem {
  id: string;
  class_id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface GoogleCalendarConnection {
  id: string;
  user_id: string;
  google_email: string;
  google_account_id: string | null;
  calendar_id: string;
  connected_at: string;
  last_synced_at: string | null;
  connection_status: 'connected' | 'disconnected' | 'error';
}
