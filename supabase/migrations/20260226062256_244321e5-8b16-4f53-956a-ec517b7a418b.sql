
-- =============================================
-- PROFILES TABLE
-- =============================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'ta')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (NEW.id, 'student');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Security definer function to check TA role
CREATE OR REPLACE FUNCTION public.is_ta(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role = 'ta'
  );
$$;

-- =============================================
-- COURSES TABLE
-- =============================================
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  term int NOT NULL DEFAULT 1,
  program text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read courses"
  ON public.courses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "TAs can insert courses"
  ON public.courses FOR INSERT
  TO authenticated
  WITH CHECK (public.is_ta(auth.uid()));

CREATE POLICY "TAs can update courses"
  ON public.courses FOR UPDATE
  TO authenticated
  USING (public.is_ta(auth.uid()));

CREATE POLICY "TAs can delete courses"
  ON public.courses FOR DELETE
  TO authenticated
  USING (public.is_ta(auth.uid()));

-- =============================================
-- TIMETABLE SESSIONS TABLE
-- =============================================
CREATE TABLE public.timetable_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  session_number int NOT NULL,
  session_date date,
  start_time time,
  end_time time,
  location text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.timetable_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read sessions"
  ON public.timetable_sessions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "TAs can insert sessions"
  ON public.timetable_sessions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_ta(auth.uid()));

CREATE POLICY "TAs can update sessions"
  ON public.timetable_sessions FOR UPDATE
  TO authenticated
  USING (public.is_ta(auth.uid()));

CREATE POLICY "TAs can delete sessions"
  ON public.timetable_sessions FOR DELETE
  TO authenticated
  USING (public.is_ta(auth.uid()));

-- Auto-create 18 sessions when course is created
CREATE OR REPLACE FUNCTION public.create_default_sessions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.timetable_sessions (course_id, session_number)
  SELECT NEW.id, s FROM generate_series(1, 18) AS s;
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_sessions_on_course_insert
  AFTER INSERT ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_sessions();

-- =============================================
-- PRE-READS TABLE
-- =============================================
CREATE TABLE public.pre_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.timetable_sessions(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size int NOT NULL DEFAULT 0,
  source_text text,
  source_text_status text NOT NULL DEFAULT 'none',
  summary_status text NOT NULL DEFAULT 'none',
  summary_text text,
  summary_prompt text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pre_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read pre_reads"
  ON public.pre_reads FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "TAs can insert pre_reads"
  ON public.pre_reads FOR INSERT
  TO authenticated
  WITH CHECK (public.is_ta(auth.uid()));

CREATE POLICY "TAs can update pre_reads"
  ON public.pre_reads FOR UPDATE
  TO authenticated
  USING (public.is_ta(auth.uid()));

CREATE POLICY "TAs can delete pre_reads"
  ON public.pre_reads FOR DELETE
  TO authenticated
  USING (public.is_ta(auth.uid()));

-- =============================================
-- STORAGE BUCKET
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('pre-reads', 'pre-reads', false);

CREATE POLICY "Authenticated users can read pre-read files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'pre-reads');

CREATE POLICY "TAs can upload pre-read files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'pre-reads' AND public.is_ta(auth.uid()));

CREATE POLICY "TAs can delete pre-read files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'pre-reads' AND public.is_ta(auth.uid()));
