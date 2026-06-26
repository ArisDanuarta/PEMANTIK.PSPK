-- ══════════════════════════════════════════════════════════════════════════════
-- PEMANTIK — Minggu 2: Fondasi Data — access_id, current_level_id, Index, RLS Komunitas
-- Tanggal: 2026-06-26
--
-- TUJUAN:
--   1. Tambah access_id + current_level_id di assessment_sessions
--      → Laporan bisa terikat ke akses ujian spesifik
--      → Level adaptif bisa ditrack per sesi
--   2. Tambah semua index yang dibutuhkan laporan
--   3. Perbaiki RLS komunitas di assessment_access
--      → Sebelumnya: komunitas punya FOR ALL (bisa DELETE akses Super Admin)
--      → Sesudah: komunitas hanya SELECT + INSERT ke sekolah binaannya
--
-- BACKWARD COMPATIBLE:
--   - Semua kolom baru nullable / dengan default → data lama tetap aman
--   - Index bersifat additive, tidak ada yang dihapus
-- ══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- BAGIAN 1: TAMBAH KOLOM DI assessment_sessions
-- ─────────────────────────────────────────────────────────────────────────────

-- 1A. access_id — FK ke assessment_access
-- ON DELETE SET NULL: jika akses dihapus, sesi lama tetap ada (data aman)
-- Sesi lama yang tidak punya access_id akan NULL — itu normal dan expected
ALTER TABLE assessment_sessions
  ADD COLUMN IF NOT EXISTS access_id uuid REFERENCES assessment_access(id) ON DELETE SET NULL;

-- 1B. current_level_id — FK ke question_levels untuk tracking level adaptif
-- ON DELETE SET NULL: jika level dihapus (edge case), sesi tidak ikut hilang
ALTER TABLE assessment_sessions
  ADD COLUMN IF NOT EXISTS current_level_id uuid REFERENCES question_levels(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- BAGIAN 2: INDEX PERFORMA untuk query laporan
-- (semua menggunakan IF NOT EXISTS — aman dijalankan ulang)
-- ─────────────────────────────────────────────────────────────────────────────

-- Index untuk kolom baru di assessment_sessions
CREATE INDEX IF NOT EXISTS idx_sessions_access_id
  ON assessment_sessions(access_id);

CREATE INDEX IF NOT EXISTS idx_sessions_current_level
  ON assessment_sessions(current_level_id);

-- Index tambahan untuk query laporan yang sering JOIN berantai
-- (student_id, school_id, category_id mungkin sudah ada, tapi dipastikan)
CREATE INDEX IF NOT EXISTS idx_sessions_student_id
  ON assessment_sessions(student_id);

CREATE INDEX IF NOT EXISTS idx_sessions_school_id
  ON assessment_sessions(school_id);

CREATE INDEX IF NOT EXISTS idx_sessions_category_id
  ON assessment_sessions(category_id);

-- Index untuk filter status sesi (sering dipakai di sync & laporan)
CREATE INDEX IF NOT EXISTS idx_sessions_status_school
  ON assessment_sessions(status, school_id);

-- Index untuk student_answers — JOIN ke sessions di laporan
CREATE INDEX IF NOT EXISTS idx_answers_session_id
  ON student_answers(session_id);

-- Index untuk students — JOIN ke schools & classes di laporan
CREATE INDEX IF NOT EXISTS idx_students_school_id
  ON students(school_id);

CREATE INDEX IF NOT EXISTS idx_students_class_id
  ON students(class_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- BAGIAN 3: PERBAIKI RLS KOMUNITAS di assessment_access
--
-- MASALAH SEBELUMNYA (di 20260618140000_phase2_access_management.sql):
--   Policy "admin_community_manage_access" memberi komunitas FOR ALL,
--   artinya komunitas bisa UPDATE/DELETE akses yang dibuat Super Admin.
--
-- SOLUSI:
--   - Super Admin: tetap FOR ALL (full control)
--   - Komunitas: split menjadi:
--       SELECT → lihat akses milik mereka & sekolah binaan
--       INSERT → hanya bisa distribusikan ke sekolah binaannya
--   - Komunitas TIDAK bisa UPDATE atau DELETE akses apapun
-- ─────────────────────────────────────────────────────────────────────────────

-- Hapus policy lama yang berbahaya (komunitas dapat FOR ALL)
DROP POLICY IF EXISTS "admin_community_manage_access" ON assessment_access;

-- Policy Super Admin: full control (tidak berubah)
CREATE POLICY "super_admin_full_access_control" ON assessment_access
  FOR ALL
  USING (public.jwt_user_role() = 'super_admin');

-- Policy Komunitas SELECT: lihat akses yang ditujukan ke mereka atau sekolah binaannya
CREATE POLICY "community_view_own_access" ON assessment_access
  FOR SELECT
  USING (
    public.jwt_user_role() = 'community'
    AND (
      -- Akses yang langsung ditujukan ke komunitas ini
      (target_type = 'community' AND target_id = public.jwt_community_id())
      OR
      -- Akses yang sudah didistribusikan ke sekolah binaannya
      (target_type = 'school' AND target_id IN (
        SELECT id FROM schools WHERE community_id = public.jwt_community_id()
      ))
    )
  );

-- Policy Komunitas INSERT: boleh distribusikan akses ke sekolah binaannya saja
-- Validasi rentang waktu (tidak boleh melebihi akses parent) dilakukan di Server Action
CREATE POLICY "community_distribute_to_schools" ON assessment_access
  FOR INSERT
  WITH CHECK (
    public.jwt_user_role() = 'community'
    AND target_type = 'school'
    AND target_id IN (
      SELECT id FROM schools WHERE community_id = public.jwt_community_id()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- BAGIAN 4: UPDATE RLS policy siswa untuk assessment_access
-- Sebelumnya policy 'student_view_own_access' menggunakan jwt_school_id()
-- tapi fungsi itu belum ada saat dibuat. Pastikan fungsi ada:
-- ─────────────────────────────────────────────────────────────────────────────

-- Buat jwt_school_id() berbasis JWT custom claims siswa (bukan auth.jwt())
-- Karena siswa pakai custom JWT, harus pakai current_setting bukan auth.jwt()
CREATE OR REPLACE FUNCTION public.jwt_school_id_student()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::jsonb ->> 'school_id',
    ''
  )::uuid
$$;

GRANT EXECUTE ON FUNCTION public.jwt_school_id_student() TO anon;

-- Update policy siswa untuk assessment_access menggunakan fungsi yang benar
DROP POLICY IF EXISTS "student_view_own_access" ON assessment_access;

CREATE POLICY "student_view_own_access" ON assessment_access
  FOR SELECT
  USING (
    public.jwt_user_role_extended() = 'student'
    AND is_active = true
    AND (
      (target_type = 'school' AND target_id = public.jwt_school_id_student())
      OR (target_type = 'community' AND target_id = (
        SELECT community_id FROM schools WHERE id = public.jwt_school_id_student()
      ))
    )
    AND valid_from  <= now()
    AND valid_until >= now()
  );

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFIKASI: Jalankan setelah migration selesai
-- ─────────────────────────────────────────────────────────────────────────────
/*
-- Cek kolom baru di assessment_sessions
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'assessment_sessions'
  AND column_name IN ('access_id', 'current_level_id')
ORDER BY column_name;

-- Cek RLS policy assessment_access (komunitas tidak boleh punya FOR ALL lagi)
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'assessment_access'
ORDER BY policyname;

-- Expected: tidak ada policy dengan cmd = 'ALL' untuk komunitas
-- Expected: ada 'community_view_own_access' (SELECT) + 'community_distribute_to_schools' (INSERT)
*/
