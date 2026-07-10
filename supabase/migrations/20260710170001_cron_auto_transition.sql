-- =====================================================================================
-- PEMANTIK — Setup pg_cron untuk Edge Function cron-auto-transition
-- Tanggal: 2026-07-10
--
-- Tujuan: Menjadwalkan Edge Function `cron-auto-transition` setiap 15 menit
--         untuk mengupdate `school_assessment_stages.current_stage` dari 'proses_asesmen'
--         menjadi 'intervensi' jika waktu asesmen telah kedaluwarsa.
-- =====================================================================================

BEGIN;

-- 1. Index pendukung untuk memfilter stage yang sedang berjalan
--    Sangat penting agar cron (atau API) tidak melakukan full table scan.
CREATE INDEX IF NOT EXISTS idx_school_assessment_stages_current_stage 
  ON school_assessment_stages(current_stage);

-- 2. Index pendukung untuk assessment_access
--    Di migrasi 20260710170000_student_session_rls.sql sudah dibuat idx_access_policy_check
--    Jadi kita cukup pastikan saja atau biarkan.
CREATE INDEX IF NOT EXISTS idx_access_valid_until_active 
  ON assessment_access(valid_until, is_active);

-- =====================================================================================
-- INSTRUKSI PENJADWALAN CRON (JALANKAN MANUAL DI SUPABASE SQL EDITOR)
-- =====================================================================================
-- Karena scheduling cron memerlukan URL spesifik project dan Service Role Key yang 
-- tidak boleh di-hardcode di file migrasi ini, admin / developer wajib menjalankan 
-- perintah di bawah ini secara manual di dashboard Supabase dengan mengganti 
-- <PROJECT_REF> dan <SERVICE_ROLE_KEY>:
--
-- SELECT cron.schedule(
--   'cron-auto-transition',
--   '*/15 * * * *',  -- Setiap 15 menit
--   $$
--   SELECT net.http_post(
--     url := 'https://<PROJECT_REF>.supabase.co/functions/v1/cron-auto-transition',
--     headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb
--   );
--   $$
-- );
--
-- Untuk membatalkan/menghapus jadwal:
-- SELECT cron.unschedule('cron-auto-transition');
-- =====================================================================================

COMMIT;
