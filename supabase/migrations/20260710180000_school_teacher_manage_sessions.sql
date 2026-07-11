-- 20260710180000_school_teacher_manage_sessions.sql
-- Fix bug: School and Teacher need UPDATE and INSERT permissions 
-- to void/reset sessions (ujian ulang)

CREATE POLICY "school_manage_own_sessions" ON assessment_sessions
  FOR ALL
  USING (
    public.jwt_user_role() = 'school'
    AND school_id = public.jwt_school_id()
  )
  WITH CHECK (
    public.jwt_user_role() = 'school'
    AND school_id = public.jwt_school_id()
  );

CREATE POLICY "teacher_manage_school_sessions" ON assessment_sessions
  FOR ALL
  USING (
    public.jwt_user_role() = 'teacher'
    AND school_id = public.jwt_school_id()
  )
  WITH CHECK (
    public.jwt_user_role() = 'teacher'
    AND school_id = public.jwt_school_id()
  );
