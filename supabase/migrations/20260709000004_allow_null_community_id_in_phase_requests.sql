-- =====================================================================================
-- PEMANTIK — Mengizinkan Sekolah Berdiri Sendiri (community_id NULL) Mengajukan Fase
-- Tanggal: 20260709000004
-- =====================================================================================

BEGIN;

-- 1. Izinkan kolom community_id di tabel assessment_phase_requests menjadi NULL (untuk Sekolah Independen)
ALTER TABLE public.assessment_phase_requests ALTER COLUMN community_id DROP NOT NULL;

-- 2. Izinkan kolom community_id di tabel school_assessment_stages menjadi NULL (untuk Sekolah Independen)
ALTER TABLE public.school_assessment_stages ALTER COLUMN community_id DROP NOT NULL;

COMMIT;
