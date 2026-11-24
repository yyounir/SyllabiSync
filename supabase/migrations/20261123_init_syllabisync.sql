-- ==============================================================================
-- SyllabiSync Initial Database Schema & RLS Policies
-- Product Tagline: "Your syllabus. Your semester. In sync."
-- ==============================================================================

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Profile trigger on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', 'Student'))
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Classes Table
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_name TEXT NOT NULL,
  course_code TEXT NOT NULL,
  professor_name TEXT,
  professor_email TEXT,
  description TEXT,
  semester TEXT NOT NULL DEFAULT 'Current Semester',
  color TEXT NOT NULL DEFAULT '#6366F1',
  grading_breakdown JSONB DEFAULT '[]'::jsonb,
  office_hours TEXT,
  attendance_policy TEXT,
  late_policy TEXT,
  required_textbooks JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own classes" ON public.classes;
CREATE POLICY "Users can view own classes"
  ON public.classes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own classes" ON public.classes;
CREATE POLICY "Users can insert own classes"
  ON public.classes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own classes" ON public.classes;
CREATE POLICY "Users can update own classes"
  ON public.classes FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own classes" ON public.classes;
CREATE POLICY "Users can delete own classes"
  ON public.classes FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_classes_user_id ON public.classes(user_id);

-- 3. Syllabi Table
CREATE TABLE IF NOT EXISTS public.syllabi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  extracted_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.syllabi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own syllabi" ON public.syllabi;
CREATE POLICY "Users can view own syllabi"
  ON public.syllabi FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own syllabi" ON public.syllabi;
CREATE POLICY "Users can insert own syllabi"
  ON public.syllabi FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own syllabi" ON public.syllabi;
CREATE POLICY "Users can delete own syllabi"
  ON public.syllabi FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_syllabi_class_id ON public.syllabi(class_id);
CREATE INDEX IF NOT EXISTS idx_syllabi_user_id ON public.syllabi(user_id);

-- 4. Academic Items Table (Unified for assignments, exams, quizzes, projects, etc.)
CREATE TABLE IF NOT EXISTS public.academic_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('assignment', 'exam', 'quiz', 'project', 'reading', 'other')),
  due_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  points NUMERIC,
  grade NUMERIC,
  source_excerpt TEXT,
  original_date_text TEXT,
  confidence NUMERIC,
  is_confirmed BOOLEAN NOT NULL DEFAULT true,
  google_event_id TEXT,
  google_calendar_id TEXT,
  last_google_sync_at TIMESTAMPTZ,
  google_sync_status TEXT NOT NULL DEFAULT 'not_synced' CHECK (google_sync_status IN ('not_synced', 'synced', 'pending', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.academic_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own academic items" ON public.academic_items;
CREATE POLICY "Users can view own academic items"
  ON public.academic_items FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own academic items" ON public.academic_items;
CREATE POLICY "Users can insert own academic items"
  ON public.academic_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own academic items" ON public.academic_items;
CREATE POLICY "Users can update own academic items"
  ON public.academic_items FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own academic items" ON public.academic_items;
CREATE POLICY "Users can delete own academic items"
  ON public.academic_items FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_academic_items_user_id ON public.academic_items(user_id);
CREATE INDEX IF NOT EXISTS idx_academic_items_class_id ON public.academic_items(class_id);
CREATE INDEX IF NOT EXISTS idx_academic_items_due_date ON public.academic_items(due_date);
CREATE INDEX IF NOT EXISTS idx_academic_items_status ON public.academic_items(status);

-- 5. Notes Table
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notes" ON public.notes;
CREATE POLICY "Users can view own notes"
  ON public.notes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own notes" ON public.notes;
CREATE POLICY "Users can insert own notes"
  ON public.notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notes" ON public.notes;
CREATE POLICY "Users can update own notes"
  ON public.notes FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notes" ON public.notes;
CREATE POLICY "Users can delete own notes"
  ON public.notes FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notes_class_id ON public.notes(class_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);

-- 6. Google Calendar Connections Table
CREATE TABLE IF NOT EXISTS public.google_calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  google_email TEXT NOT NULL,
  google_account_id TEXT,
  calendar_id TEXT NOT NULL DEFAULT 'primary',
  encrypted_refresh_token TEXT,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  last_synced_at TIMESTAMPTZ,
  connection_status TEXT NOT NULL DEFAULT 'connected' CHECK (connection_status IN ('connected', 'disconnected', 'error'))
);

ALTER TABLE public.google_calendar_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own google calendar connection" ON public.google_calendar_connections;
CREATE POLICY "Users can view own google calendar connection"
  ON public.google_calendar_connections FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own google calendar connection" ON public.google_calendar_connections;
CREATE POLICY "Users can insert own google calendar connection"
  ON public.google_calendar_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own google calendar connection" ON public.google_calendar_connections;
CREATE POLICY "Users can update own google calendar connection"
  ON public.google_calendar_connections FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own google calendar connection" ON public.google_calendar_connections;
CREATE POLICY "Users can delete own google calendar connection"
  ON public.google_calendar_connections FOR DELETE
  USING (auth.uid() = user_id);

-- 7. Supabase Storage Bucket for Syllabi
INSERT INTO storage.buckets (id, name, public)
VALUES ('syllabi', 'syllabi', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload their own syllabi files" ON storage.objects;
CREATE POLICY "Users can upload their own syllabi files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'syllabi' AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.role() = 'authenticated'));

DROP POLICY IF EXISTS "Users can read their own syllabi files" ON storage.objects;
CREATE POLICY "Users can read their own syllabi files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'syllabi' AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.role() = 'authenticated'));

DROP POLICY IF EXISTS "Users can delete their own syllabi files" ON storage.objects;
CREATE POLICY "Users can delete their own syllabi files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'syllabi' AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.role() = 'authenticated'));
