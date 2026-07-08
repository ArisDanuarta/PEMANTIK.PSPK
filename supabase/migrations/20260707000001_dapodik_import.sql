-- =====================================================================================
-- PEMANTIK — DAPODIK IMPORT MIGRATION
-- Eksekusi query ini di SQL Editor Supabase Anda (pastikan tidak ada konflik migrasi).
-- Versi: 20260707000001
-- =====================================================================================

BEGIN;

-- ============================================================
-- 1. Kolom baru pada tabel public.schools
-- ============================================================
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS import_source TEXT DEFAULT 'manual'
    CHECK (import_source IN ('manual', 'dapodik')),
  ADD COLUMN IF NOT EXISTS dapodik_imported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS raw_dapodik_header JSONB; -- Arsip teks header baris 2-3 file asli

-- Catatan: kolom npsn sudah UNIQUE di schema lama, tidak perlu diubah.

-- ============================================================
-- 2. Kolom baru pada tabel public.students
-- ============================================================
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS nik TEXT,                     -- NIK siswa dari Dapodik
  ADD COLUMN IF NOT EXISTS nipd TEXT,                    -- Nomor Induk Peserta Didik (kunci de-duplikasi)
  ADD COLUMN IF NOT EXISTS agama TEXT,                   -- Agama
  ADD COLUMN IF NOT EXISTS wali_nama TEXT,               -- Nama wali (jika bukan ayah/ibu)
  ADD COLUMN IF NOT EXISTS wali_nik TEXT,                -- NIK wali
  ADD COLUMN IF NOT EXISTS wali_pekerjaan TEXT,          -- Pekerjaan wali (fallback SES)
  ADD COLUMN IF NOT EXISTS wali_pendidikan TEXT,         -- Pendidikan wali (fallback SES)
  ADD COLUMN IF NOT EXISTS import_source TEXT DEFAULT 'manual'
    CHECK (import_source IN ('manual', 'dapodik')),
  ADD COLUMN IF NOT EXISTS birth_date_parse_error BOOLEAN NOT NULL DEFAULT false, -- Flag tanggal gagal di-parse
  ADD COLUMN IF NOT EXISTS raw_dapodik JSONB;            -- Arsip mentah 60 kolom per siswa

-- ============================================================
-- 3. Kolom baru pada tabel public.ses_variables
-- ============================================================
ALTER TABLE public.ses_variables
  ADD COLUMN IF NOT EXISTS needs_review BOOLEAN NOT NULL DEFAULT false, -- Auto-created, perlu diisi bobotnya
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual'
    CHECK (source IN ('manual', 'dapodik_auto'));

-- ============================================================
-- 4. Tabel baru: riwayat & audit setiap proses import Dapodik
-- ============================================================
CREATE TABLE IF NOT EXISTS public.dapodik_import_batches (
  id            UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id     UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  uploaded_by   UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  file_name     TEXT NOT NULL,
  total_rows    INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  fail_count    INTEGER NOT NULL DEFAULT 0,
  errors        JSONB,             -- [{row: 12, message: "...", field: "nama"}]
  warnings      JSONB,             -- [{row: 5, message: "...", field: "rombel"}]
  new_ses_variables JSONB,         -- [{type: "education", name: "SMA", id: "uuid"}]
  status        TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'processing', 'completed', 'completed_with_errors', 'failed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dapodik_batches_school ON public.dapodik_import_batches(school_id);
CREATE INDEX IF NOT EXISTS idx_dapodik_batches_status ON public.dapodik_import_batches(status);

-- ============================================================
-- 5. Tabel baru: cache sementara hasil parsing file Dapodik
--    Menggunakan "parse-token pattern" agar frontend tidak perlu
--    re-transmit ratusan baris ke server saat submit konfirmasi.
--    TTL 30 menit, dibersihkan on-read atau via cron.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.dapodik_parse_cache (
  parse_token UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  uploaded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  parsed_data JSONB NOT NULL,  -- Seluruh ParsedDapodikRow[] + metadata
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dapodik_cache_expires ON public.dapodik_parse_cache(expires_at);

-- ============================================================
-- 6. Row Level Security
-- ============================================================
ALTER TABLE public.dapodik_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dapodik_parse_cache    ENABLE ROW LEVEL SECURITY;

-- Super Admin: full access ke dapodik_import_batches
DROP POLICY IF EXISTS "super_admin_manage_dapodik_batches" ON public.dapodik_import_batches;
CREATE POLICY "super_admin_manage_dapodik_batches"
  ON public.dapodik_import_batches
  FOR ALL
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
  );

-- Super Admin: full access ke dapodik_parse_cache
DROP POLICY IF EXISTS "super_admin_manage_parse_cache" ON public.dapodik_parse_cache;
CREATE POLICY "super_admin_manage_parse_cache"
  ON public.dapodik_parse_cache
  FOR ALL
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
  );

-- ============================================================
-- 7. Tambah unique constraint untuk UPSERT anti-duplikat siswa
--    Digunakan oleh fallback chain Q4: NISN → NIPD → warning
--    Catatan: partial unique index (hanya berlaku jika kolom tidak NULL)
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_nisn_school
  ON public.students(nisn, school_id)
  WHERE nisn IS NOT NULL AND nisn != '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_nipd_school
  ON public.students(nipd, school_id)
  WHERE nipd IS NOT NULL AND nipd != '';

COMMIT;

-- =====================================================================================
-- CATATAN IMPLEMENTASI:
-- - RLS yang ada pada tabel students, schools, ses_variables TIDAK diubah sama sekali.
--   Kolom baru (nik, nipd, raw_dapodik, dll) otomatis mengikuti policy yang sudah ada.
-- - Reassign community_id (dari SEKOLAH INDEPENDEN ke komunitas baru) cukup dengan
--   UPDATE schools SET community_id = ... — tidak perlu perubahan RLS.
-- - Tabel dapodik_parse_cache sebaiknya di-cleanup secara berkala.
--   Rekomendasi: buat pg_cron job atau cleanup on-read di API.
-- =====================================================================================
