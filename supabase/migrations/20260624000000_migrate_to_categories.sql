-- Migration: Menghapus "Paket Ujian" dan menjadikan "Kategori" sebagai sumber ujian utama

-- 1. Hapus RPC, Trigger, dan view yang terkait paket ujian (jika ada)
DROP FUNCTION IF EXISTS public.assemble_package_questions(uuid, text, uuid[]);
DROP TRIGGER IF EXISTS trigger_auto_assign_package ON public.questions;
DROP FUNCTION IF EXISTS public.trg_auto_assign_package_questions();

-- 2. Kosongkan tabel sesi dan akses karena kita mengganti foreign key (Data aman dihapus di dev)
DELETE FROM public.assessment_access;
DELETE FROM public.assessment_sessions;

-- 3. Perbarui tabel assessment_access
ALTER TABLE public.assessment_access DROP COLUMN package_id CASCADE;
ALTER TABLE public.assessment_access 
  ADD COLUMN category_id uuid REFERENCES public.question_categories(id) ON DELETE CASCADE;
-- Memastikan category_id wajib diisi (karena datanya sudah dikosongkan, ini aman)
ALTER TABLE public.assessment_access ALTER COLUMN category_id SET NOT NULL;

-- 4. Perbarui tabel assessment_sessions
ALTER TABLE public.assessment_sessions DROP COLUMN package_id CASCADE;
ALTER TABLE public.assessment_sessions 
  ADD COLUMN category_id uuid REFERENCES public.question_categories(id) ON DELETE CASCADE;
ALTER TABLE public.assessment_sessions ALTER COLUMN category_id SET NOT NULL;

-- 5. Hapus tabel assessment_packages dan assessment_package_questions
DROP TABLE IF EXISTS public.assessment_package_questions CASCADE;
DROP TABLE IF EXISTS public.assessment_packages CASCADE;
