-- Migration: Menanamkan (Seed) 2 Paket Akses Permanen untuk Super Admin

INSERT INTO public.assessment_packages 
  (id, name, description, subject_area, total_questions, time_limit_min, is_published)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Asesmen Literasi', 'Akses utama untuk menyelenggarakan seluruh ujian Literasi dari Bank Soal.', 'literasi', 0, 120, true),
  ('22222222-2222-2222-2222-222222222222', 'Asesmen Numerasi', 'Akses utama untuk menyelenggarakan seluruh ujian Numerasi dari Bank Soal.', 'numerasi', 0, 120, true)
ON CONFLICT (id) DO NOTHING;
