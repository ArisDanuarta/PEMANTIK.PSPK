-- =====================================================================================
-- PEMANTIK — Mengizinkan Sekolah Berdiri Sendiri (community_id NULL) & Hapus Dummy Komunitas
-- Tanggal: 20260709000003
-- =====================================================================================

BEGIN;

-- 1. Izinkan kolom community_id di tabel schools menjadi NULL (Sekolah Independen murni)
ALTER TABLE public.schools ALTER COLUMN community_id DROP NOT NULL;

-- 2. Jika ada sekolah yang terlanjur dihubungkan ke dummy komunitas 'SEKOLAH INDEPENDEN',
-- ubah community_id mereka menjadi NULL
UPDATE public.schools
SET community_id = NULL
WHERE community_id IN (
  SELECT id FROM public.communities WHERE name = 'SEKOLAH INDEPENDEN' OR code = 'IND'
);

-- 3. Hapus dummy komunitas 'SEKOLAH INDEPENDEN' dari tabel communities agar tidak muncul di daftar Komunitas
DELETE FROM public.communities
WHERE name = 'SEKOLAH INDEPENDEN' OR code = 'IND';

COMMIT;
