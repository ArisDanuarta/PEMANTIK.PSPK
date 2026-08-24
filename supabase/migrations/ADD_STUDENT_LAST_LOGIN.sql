-- ====================================================================
-- PEMANTIK: ADD last_login_at TO students
-- Silakan jalankan script ini di menu "SQL Editor" pada dashboard Supabase Bapak.
-- ====================================================================

ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Tambahkan komentar untuk dokumentasi database
COMMENT ON COLUMN public.students.last_login_at IS 'Waktu terakhir siswa berhasil login menggunakan PIN (diperbarui oleh edge function authenticate-student)';
