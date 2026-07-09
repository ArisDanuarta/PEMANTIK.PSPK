-- =====================================================================================
-- PEMANTIK — Tambahan Kolom allowed_categories di Tabel communities
-- Tanggal: 20260709000002
-- =====================================================================================

BEGIN;

ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS allowed_categories UUID[] DEFAULT NULL;

COMMENT ON COLUMN public.communities.allowed_categories IS 'Daftar ID paket/kategori soal yang diizinkan untuk komunitas ini. NULL berarti mendapatkan semua paket default.';

COMMIT;
