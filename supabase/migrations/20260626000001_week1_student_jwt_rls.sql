-- ══════════════════════════════════════════════════════════════════════════════
-- PEMANTIK — Minggu 1: Perbaikan RLS Siswa via JWT Custom Claims
-- Tanggal: 2026-06-26
--
-- MASALAH SEBELUMNYA:
--   Policy di 20260624000001_mobile_anon_policies.sql menggunakan auth.role() = 'anon'
--   yang tidak punya isolasi antar siswa — semua anon bisa baca data semua siswa.
--
-- SOLUSI:
--   1. Tambah helper functions untuk membaca custom claims dari JWT siswa
--   2. Drop semua policy anon lama
--   3. Buat policy baru berbasis student_id dari JWT claims
--
-- CATATAN PENTING:
--   - Jalankan seluruh script ini dalam SATU eksekusi di Supabase SQL Editor
--   - Pastikan Edge Function authenticate-student sudah di-deploy dulu
--     sebelum menjalankan script ini
--   - Data sesi lama yang sudah ada tidak terpengaruh (backward safe)
-- ══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- BAGIAN 1: HELPER FUNCTIONS untuk membaca JWT custom claims siswa
-- ─────────────────────────────────────────────────────────────────────────────

-- Fungsi membaca student_id dari JWT payload custom claims
-- Dipanggil oleh RLS policy untuk identifikasi siswa yang sedang request
CREATE OR REPLACE FUNCTION public.jwt_student_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::jsonb ->> 'student_id',
    ''
  )::uuid
$$;

-- Fungsi membaca user_role dari JWT custom claims (student / community / school / dst)
-- Fallback ke 'role' (claim standar) jika 'user_role' tidak ada
CREATE OR REPLACE FUNCTION public.jwt_user_role_extended()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'user_role', ''),
    NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '')
  )
$$;

-- Grant execute ke anon (siswa pakai role anon)
GRANT EXECUTE ON FUNCTION public.jwt_student_id() TO anon;
GRANT EXECUTE ON FUNCTION public.jwt_user_role_extended() TO anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- BAGIAN 2: DROP semua RLS policy anon lama yang berbahaya
-- (policy-policy ini membuka akses data ke SEMUA orang tanpa isolasi)
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "student_view_access"      ON assessment_access;
DROP POLICY IF EXISTS "student_view_categories"  ON question_categories;
DROP POLICY IF EXISTS "student_view_levels"      ON question_levels;
DROP POLICY IF EXISTS "student_view_questions"   ON questions;
DROP POLICY IF EXISTS "student_manage_sessions"  ON assessment_sessions;
DROP POLICY IF EXISTS "student_manage_answers"   ON student_answers;

-- ─────────────────────────────────────────────────────────────────────────────
-- BAGIAN 3: BUAT RLS POLICY BARU berbasis JWT custom claims siswa
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 3A. assessment_access ────────────────────────────────────────────────────
-- Siswa hanya bisa melihat akses yang valid untuk sekolahnya sendiri,
-- dalam rentang waktu yang aktif.
-- Dibatasi oleh school_id dari JWT — tidak bisa akses sekolah lain.
CREATE POLICY "student_view_own_access" ON assessment_access
  FOR SELECT
  USING (
    public.jwt_user_role_extended() = 'student'
    AND is_active = true
    AND (
      -- Akses langsung ke sekolah siswa
      (target_type = 'school' AND target_id = public.jwt_school_id())
      OR
      -- Akses ke komunitas yang menaungi sekolah siswa
      (target_type = 'community' AND target_id = (
        SELECT community_id FROM schools WHERE id = public.jwt_school_id()
      ))
    )
    AND valid_from  <= now()
    AND valid_until >= now()
  );

-- ── 3B. question_categories ──────────────────────────────────────────────────
-- Siswa bisa baca semua kategori soal (perlu untuk sync awal)
-- Tidak ada data sensitif di tabel ini.
CREATE POLICY "student_view_categories" ON question_categories
  FOR SELECT
  USING (public.jwt_user_role_extended() = 'student');

-- ── 3C. question_levels ──────────────────────────────────────────────────────
-- Siswa bisa baca semua level (perlu untuk menampilkan soal per level)
CREATE POLICY "student_view_levels" ON question_levels
  FOR SELECT
  USING (public.jwt_user_role_extended() = 'student');

-- ── 3D. questions ─────────────────────────────────────────────────────────────
-- Siswa hanya bisa baca soal yang sudah dipublish
CREATE POLICY "student_view_published_questions" ON questions
  FOR SELECT
  USING (
    public.jwt_user_role_extended() = 'student'
    AND is_published = true
  );

-- ── 3E. assessment_sessions ───────────────────────────────────────────────────
-- ISOLASI KRITIS: siswa hanya bisa SELECT / INSERT / UPDATE sesi MILIKNYA SENDIRI
-- student_id di row harus sama dengan student_id dari JWT
CREATE POLICY "student_manage_own_sessions" ON assessment_sessions
  FOR ALL
  USING (
    public.jwt_user_role_extended() = 'student'
    AND student_id = public.jwt_student_id()
  )
  WITH CHECK (
    public.jwt_user_role_extended() = 'student'
    AND student_id = public.jwt_student_id()
  );

-- ── 3F. student_answers ───────────────────────────────────────────────────────
-- ISOLASI KRITIS: siswa hanya bisa akses jawaban yang session_id-nya miliknya
-- Double check: session_id harus ada di assessment_sessions milik siswa ini
CREATE POLICY "student_manage_own_answers" ON student_answers
  FOR ALL
  USING (
    public.jwt_user_role_extended() = 'student'
    AND session_id IN (
      SELECT id FROM assessment_sessions
      WHERE student_id = public.jwt_student_id()
    )
  )
  WITH CHECK (
    public.jwt_user_role_extended() = 'student'
    AND session_id IN (
      SELECT id FROM assessment_sessions
      WHERE student_id = public.jwt_student_id()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- BAGIAN 4: PASTIKAN question_categories & question_levels punya RLS enabled
-- (mungkin belum ada di schema lama karena tabel ini lebih baru)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE question_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_levels     ENABLE ROW LEVEL SECURITY;

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFIKASI: Jalankan query ini setelah script selesai untuk cek policy aktif
-- ─────────────────────────────────────────────────────────────────────────────
/*
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN (
  'assessment_access', 'question_categories', 'question_levels',
  'questions', 'assessment_sessions', 'student_answers'
)
ORDER BY tablename, policyname;
*/
