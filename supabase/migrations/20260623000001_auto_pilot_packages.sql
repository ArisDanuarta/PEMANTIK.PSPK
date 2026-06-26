-- 0. Hapus constraint unik pada order_index karena kita menggunakan random shuffle per level
ALTER TABLE public.assessment_package_questions DROP CONSTRAINT IF EXISTS assessment_package_questions_package_id_order_index_key;

-- 1. Pastikan 2 Paket Default ada
DO $$
DECLARE
  v_lit_id uuid;
  v_num_id uuid;
BEGIN
  -- Cek dan Buat Paket Literasi Default
  SELECT id INTO v_lit_id FROM public.assessment_packages WHERE name = 'Paket Literasi Default';
  IF NOT FOUND THEN
    INSERT INTO public.assessment_packages (name, subject_area, total_questions)
    VALUES ('Paket Literasi Default', 'literasi', 0)
    RETURNING id INTO v_lit_id;
  END IF;

  -- Cek dan Buat Paket Numerasi Default
  SELECT id INTO v_num_id FROM public.assessment_packages WHERE name = 'Paket Numerasi Default';
  IF NOT FOUND THEN
    INSERT INTO public.assessment_packages (name, subject_area, total_questions)
    VALUES ('Paket Numerasi Default', 'numerasi', 0)
    RETURNING id INTO v_num_id;
  END IF;
END $$;

-- 2. Buat Fungsi Trigger untuk menautkan otomatis
CREATE OR REPLACE FUNCTION public.trg_auto_assign_package_questions()
RETURNS trigger AS $$
DECLARE
  v_package_id uuid;
BEGIN
  -- Hanya proses jika soal baru saja di-publish
  IF (TG_OP = 'INSERT' AND NEW.is_published = true) OR (TG_OP = 'UPDATE' AND NEW.is_published = true AND OLD.is_published = false) THEN
    
    -- Cari paket default berdasarkan subject_area
    IF NEW.subject_area = 'literasi' THEN
      SELECT id INTO v_package_id FROM public.assessment_packages WHERE name = 'Paket Literasi Default' LIMIT 1;
    ELSIF NEW.subject_area = 'numerasi' THEN
      SELECT id INTO v_package_id FROM public.assessment_packages WHERE name = 'Paket Numerasi Default' LIMIT 1;
    END IF;

    IF v_package_id IS NOT NULL THEN
      -- Masukkan ke relasi paket
      INSERT INTO public.assessment_package_questions (package_id, question_id, order_index)
      VALUES (v_package_id, NEW.id, 0)
      ON CONFLICT (package_id, question_id) DO NOTHING;
    END IF;
    
  -- Jika soal diubah jadi draft kembali (unpublish)
  ELSIF TG_OP = 'UPDATE' AND NEW.is_published = false AND OLD.is_published = true THEN
    DELETE FROM public.assessment_package_questions WHERE question_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Pasang Trigger di tabel questions
DROP TRIGGER IF EXISTS trigger_auto_assign_package ON public.questions;
CREATE TRIGGER trigger_auto_assign_package
AFTER INSERT OR UPDATE OF is_published
ON public.questions
FOR EACH ROW
EXECUTE FUNCTION public.trg_auto_assign_package_questions();

-- 4. Tautkan semua soal yang saat ini sudah berstatus published ke paket default
DO $$
DECLARE
  v_lit_id uuid;
  v_num_id uuid;
  r RECORD;
BEGIN
  SELECT id INTO v_lit_id FROM public.assessment_packages WHERE name = 'Paket Literasi Default';
  SELECT id INTO v_num_id FROM public.assessment_packages WHERE name = 'Paket Numerasi Default';

  FOR r IN SELECT id, subject_area FROM public.questions WHERE is_published = true LOOP
    IF r.subject_area = 'literasi' AND v_lit_id IS NOT NULL THEN
      INSERT INTO public.assessment_package_questions (package_id, question_id, order_index)
      VALUES (v_lit_id, r.id, 0)
      ON CONFLICT (package_id, question_id) DO NOTHING;
    ELSIF r.subject_area = 'numerasi' AND v_num_id IS NOT NULL THEN
      INSERT INTO public.assessment_package_questions (package_id, question_id, order_index)
      VALUES (v_num_id, r.id, 0)
      ON CONFLICT (package_id, question_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;
