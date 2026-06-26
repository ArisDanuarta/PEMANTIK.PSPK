-- ══════════════════════════════════════════════════════════════════════════════
-- PEMANTIK — Row Level Security (RLS) Policies v1.1
-- FIX: Helper functions dipindah dari auth.* → public.*
--      (auth schema locked di Supabase SQL Editor)
-- ══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper functions di public schema (bukan auth schema)
-- Menggunakan auth.jwt() dan auth.uid() yang tersedia secara built-in
-- ─────────────────────────────────────────────────────────────────────────────

-- Ambil role dari JWT custom claims
CREATE OR REPLACE FUNCTION public.jwt_user_role()
RETURNS user_role AS $$
  SELECT (auth.jwt() ->> 'user_role')::user_role;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Ambil community_id dari JWT custom claims
CREATE OR REPLACE FUNCTION public.jwt_community_id()
RETURNS UUID AS $$
  SELECT (auth.jwt() ->> 'community_id')::UUID;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Ambil school_id dari JWT custom claims
CREATE OR REPLACE FUNCTION public.jwt_school_id()
RETURNS UUID AS $$
  SELECT (auth.jwt() ->> 'school_id')::UUID;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Grant execute ke authenticated users
GRANT EXECUTE ON FUNCTION public.jwt_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.jwt_community_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.jwt_school_id() TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Enable RLS di semua tabel
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE communities                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE students                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_packages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_package_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_access            ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_sessions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_answers              ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- COMMUNITIES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "super_admin_all_communities" ON communities
  FOR ALL USING (public.jwt_user_role() = 'super_admin');

CREATE POLICY "community_view_own" ON communities
  FOR SELECT USING (
    public.jwt_user_role() = 'community'
    AND id = public.jwt_community_id()
  );

CREATE POLICY "school_teacher_view_community" ON communities
  FOR SELECT USING (
    public.jwt_user_role() IN ('school', 'teacher')
    AND id = (SELECT community_id FROM schools WHERE id = public.jwt_school_id())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- SCHOOLS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "super_admin_all_schools" ON schools
  FOR ALL USING (public.jwt_user_role() = 'super_admin');

CREATE POLICY "community_manage_schools" ON schools
  FOR ALL USING (
    public.jwt_user_role() = 'community'
    AND community_id = public.jwt_community_id()
  );

CREATE POLICY "school_teacher_view_own_school" ON schools
  FOR SELECT USING (
    public.jwt_user_role() IN ('school', 'teacher')
    AND id = public.jwt_school_id()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "super_admin_all_users" ON users
  FOR ALL USING (public.jwt_user_role() = 'super_admin');

CREATE POLICY "community_manage_community_users" ON users
  FOR ALL USING (
    public.jwt_user_role() = 'community'
    AND community_id = public.jwt_community_id()
  );

CREATE POLICY "school_manage_school_users" ON users
  FOR ALL USING (
    public.jwt_user_role() = 'school'
    AND school_id = public.jwt_school_id()
  );

CREATE POLICY "user_view_own_profile" ON users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "user_update_own_profile" ON users
  FOR UPDATE USING (id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- CLASSES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "super_admin_all_classes" ON classes
  FOR ALL USING (public.jwt_user_role() = 'super_admin');

CREATE POLICY "school_manage_classes" ON classes
  FOR ALL USING (
    public.jwt_user_role() = 'school'
    AND school_id = public.jwt_school_id()
  );

CREATE POLICY "teacher_view_own_classes" ON classes
  FOR SELECT USING (
    public.jwt_user_role() = 'teacher'
    AND (school_id = public.jwt_school_id() OR teacher_id = auth.uid())
  );

CREATE POLICY "community_view_classes" ON classes
  FOR SELECT USING (
    public.jwt_user_role() = 'community'
    AND school_id IN (
      SELECT id FROM schools WHERE community_id = public.jwt_community_id()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- STUDENTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "super_admin_all_students" ON students
  FOR ALL USING (public.jwt_user_role() = 'super_admin');

CREATE POLICY "school_manage_students" ON students
  FOR ALL USING (
    public.jwt_user_role() = 'school'
    AND school_id = public.jwt_school_id()
  );

CREATE POLICY "teacher_view_school_students" ON students
  FOR SELECT USING (
    public.jwt_user_role() = 'teacher'
    AND school_id = public.jwt_school_id()
  );

CREATE POLICY "community_view_students" ON students
  FOR SELECT USING (
    public.jwt_user_role() = 'community'
    AND school_id IN (
      SELECT id FROM schools WHERE community_id = public.jwt_community_id()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- QUESTIONS (Bank Soal)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "admin_manage_questions" ON questions
  FOR ALL USING (
    public.jwt_user_role() IN ('super_admin', 'question_admin')
  );

CREATE POLICY "others_view_published_questions" ON questions
  FOR SELECT USING (
    public.jwt_user_role() IN ('community', 'school', 'teacher')
    AND is_published = true
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- ASSESSMENT PACKAGES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "admin_manage_packages" ON assessment_packages
  FOR ALL USING (
    public.jwt_user_role() IN ('super_admin', 'question_admin')
  );

CREATE POLICY "others_view_published_packages" ON assessment_packages
  FOR SELECT USING (
    public.jwt_user_role() IN ('community', 'school', 'teacher')
    AND is_published = true
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- ASSESSMENT PACKAGE QUESTIONS (junction)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "admin_manage_pkg_questions" ON assessment_package_questions
  FOR ALL USING (
    public.jwt_user_role() IN ('super_admin', 'question_admin')
  );

CREATE POLICY "others_view_pkg_questions" ON assessment_package_questions
  FOR SELECT USING (
    public.jwt_user_role() IN ('community', 'school', 'teacher')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- ASSESSMENT ACCESS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "admin_community_manage_access" ON assessment_access
  FOR ALL USING (
    public.jwt_user_role() = 'super_admin'
    OR (
      public.jwt_user_role() = 'community'
      AND school_id IN (
        SELECT id FROM schools WHERE community_id = public.jwt_community_id()
      )
    )
  );

CREATE POLICY "school_teacher_view_access" ON assessment_access
  FOR SELECT USING (
    public.jwt_user_role() IN ('school', 'teacher')
    AND school_id = public.jwt_school_id()
    AND is_active = true
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- ASSESSMENT SESSIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "super_admin_all_sessions" ON assessment_sessions
  FOR ALL USING (public.jwt_user_role() = 'super_admin');

CREATE POLICY "community_view_sessions" ON assessment_sessions
  FOR SELECT USING (
    public.jwt_user_role() = 'community'
    AND school_id IN (
      SELECT id FROM schools WHERE community_id = public.jwt_community_id()
    )
  );

CREATE POLICY "school_view_sessions" ON assessment_sessions
  FOR SELECT USING (
    public.jwt_user_role() = 'school'
    AND school_id = public.jwt_school_id()
  );

CREATE POLICY "teacher_view_school_sessions" ON assessment_sessions
  FOR SELECT USING (
    public.jwt_user_role() = 'teacher'
    AND school_id = public.jwt_school_id()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- STUDENT ANSWERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "super_admin_all_answers" ON student_answers
  FOR ALL USING (public.jwt_user_role() = 'super_admin');

CREATE POLICY "teacher_view_answers" ON student_answers
  FOR SELECT USING (
    public.jwt_user_role() = 'teacher'
    AND session_id IN (
      SELECT id FROM assessment_sessions
      WHERE school_id = public.jwt_school_id()
    )
  );

CREATE POLICY "school_view_answers" ON student_answers
  FOR SELECT USING (
    public.jwt_user_role() = 'school'
    AND session_id IN (
      SELECT id FROM assessment_sessions
      WHERE school_id = public.jwt_school_id()
    )
  );

CREATE POLICY "community_view_answers" ON student_answers
  FOR SELECT USING (
    public.jwt_user_role() = 'community'
    AND session_id IN (
      SELECT s.id FROM assessment_sessions s
      JOIN schools sc ON sc.id = s.school_id
      WHERE sc.community_id = public.jwt_community_id()
    )
  );
