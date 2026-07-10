-- =====================================================================================
-- PEMANTIK — Perbaikan RLS Presisi untuk Sesi Ujian Siswa
-- Tanggal: 2026-07-10
--
-- MASALAH SEBELUMNYA:
--   Policy "student_manage_own_sessions" pada tabel assessment_sessions berupa FOR ALL.
--   Ini menyebabkan jika asesmen di-revoke (is_active=false), siswa yang sedang berjalan
--   masih bisa update, TAPI siswa juga masih bisa INSERT sesi baru yang seharusnya dilarang.
--
-- SOLUSI:
--   1. Drop policy FOR ALL lama.
--   2. Buat policy FOR SELECT (hanya cek student_id).
--   3. Buat policy FOR UPDATE (hanya cek student_id) → membolehkan submit jawaban
--      walau akses induknya mati di tengah jalan.
--   4. Buat policy FOR INSERT dengan filter validasi assessment_access aktif yang
--      mendukung 4 tipe target: student, class, school, community.
--   5. Tambah index performa.
-- =====================================================================================

BEGIN;

-- 1. Tambah index pendukung untuk query EXISTS di policy INSERT (Performa)
CREATE INDEX IF NOT EXISTS idx_access_policy_check 
  ON assessment_access(target_id, category_id, phase, is_active)
  INCLUDE (valid_from, valid_until);

-- 2. Hapus policy FOR ALL yang lama
DROP POLICY IF EXISTS "student_manage_own_sessions" ON assessment_sessions;
DROP POLICY IF EXISTS "student_select_own_sessions" ON assessment_sessions;
DROP POLICY IF EXISTS "student_update_own_sessions" ON assessment_sessions;
DROP POLICY IF EXISTS "student_insert_own_sessions" ON assessment_sessions;

-- 3. Policy SELECT: Siswa bisa melihat sesinya sendiri
CREATE POLICY "student_select_own_sessions" ON assessment_sessions
  FOR SELECT
  USING (
    public.jwt_user_role_extended() = 'student'
    AND student_id = public.jwt_student_id()
  );

-- 4. Policy UPDATE: Siswa bisa update sesinya sendiri (meskipun akses mati tengah jalan)
CREATE POLICY "student_update_own_sessions" ON assessment_sessions
  FOR UPDATE
  USING (
    public.jwt_user_role_extended() = 'student'
    AND student_id = public.jwt_student_id()
  )
  WITH CHECK (
    public.jwt_user_role_extended() = 'student'
    AND student_id = public.jwt_student_id()
  );

-- 5. Helper Function untuk Validasi Akses (Bypass RLS)
--    SECURITY DEFINER memastikan subquery ke tabel students, schools, assessment_access
--    tidak terhalang oleh RLS.
CREATE OR REPLACE FUNCTION public.is_assessment_access_valid(
  p_category_id uuid,
  p_phase text,
  p_student_id uuid
) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  v_school_id uuid;
  v_class_id uuid;
  v_community_id uuid;
  v_is_valid boolean;
BEGIN
  -- Ambil data hierarki siswa
  SELECT school_id, class_id INTO v_school_id, v_class_id
  FROM public.students
  WHERE id = p_student_id;

  IF v_school_id IS NOT NULL THEN
    SELECT community_id INTO v_community_id
    FROM public.schools
    WHERE id = v_school_id;
  END IF;

  -- Cek apakah ada akses aktif
  SELECT EXISTS (
    SELECT 1 FROM public.assessment_access acc
    WHERE acc.category_id = p_category_id
      AND acc.phase = p_phase
      AND acc.is_active = true
      AND now() >= acc.valid_from 
      AND now() <= acc.valid_until
      AND (
        (acc.target_type = 'student' AND acc.target_id = p_student_id)
        OR
        (acc.target_type = 'class' AND acc.target_id = v_class_id)
        OR
        (acc.target_type = 'school' AND acc.target_id = v_school_id)
        OR
        (acc.target_type = 'community' AND acc.target_id = v_community_id)
      )
  ) INTO v_is_valid;

  RETURN v_is_valid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_assessment_access_valid(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_assessment_access_valid(uuid, text, uuid) TO anon;

-- 6. Policy INSERT: Siswa bisa membuat sesi baru HANYA JIKA akses masih aktif
CREATE POLICY "student_insert_own_sessions" ON assessment_sessions
  FOR INSERT
  WITH CHECK (
    public.jwt_user_role_extended() = 'student'
    AND student_id = public.jwt_student_id()
    AND public.is_assessment_access_valid(
      category_id,
      COALESCE(phase, 'Tahap 1'),
      public.jwt_student_id()
    )
  );

COMMIT;
