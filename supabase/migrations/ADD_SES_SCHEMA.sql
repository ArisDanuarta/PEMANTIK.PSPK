-- =====================================================================================
-- PEMANTIK SES (SOCIO-ECONOMIC STATUS) MIGRATION
-- Eksekusi query ini di SQL Editor Supabase Anda.
-- =====================================================================================

BEGIN;

-- 1. Buat tipe Enum untuk Tipe Variabel SES dan update ses_class
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ses_variable_type') THEN
    CREATE TYPE ses_variable_type AS ENUM ('education', 'occupation');
  END IF;
  
  -- Tambah value baru ke ses_class jika belum ada
  ALTER TYPE ses_class ADD VALUE IF NOT EXISTS 'menengah_atas';
  ALTER TYPE ses_class ADD VALUE IF NOT EXISTS 'menengah_bawah';
END $$;

-- 2. Buat tabel ses_variables (untuk menyimpan daftar bobot nilai pendidikan & pekerjaan)
CREATE TABLE IF NOT EXISTS public.ses_variables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type ses_variable_type NOT NULL,
  name TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(type, name)
);

-- 3. Buat tabel ses_thresholds (untuk menyimpan rentang kelas SES: Atas, Menengah, Bawah)
CREATE TABLE IF NOT EXISTS public.ses_thresholds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  min_score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Insert default thresholds sesuai gambar referensi
INSERT INTO public.ses_thresholds (name, min_score, max_score)
VALUES 
  ('Atas', 15, 16),
  ('Menengah Atas', 11, 14),
  ('Menengah Bawah', 6, 10),
  ('Bawah', 4, 5)
ON CONFLICT (name) DO UPDATE 
SET min_score = EXCLUDED.min_score, max_score = EXCLUDED.max_score;

-- 5. Perbarui tabel students untuk menyimpan data ayah/ibu, lokasi geografis, dan total SES score
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS father_education_id UUID REFERENCES public.ses_variables(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS mother_education_id UUID REFERENCES public.ses_variables(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS father_occupation_id UUID REFERENCES public.ses_variables(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS mother_occupation_id UUID REFERENCES public.ses_variables(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS province TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS district TEXT,
ADD COLUMN IF NOT EXISTS village TEXT,
ADD COLUMN IF NOT EXISTS ses_score INTEGER DEFAULT 0;

-- 6. Fungsi Trigger untuk otomatis menghitung total SES Score siswa saat ada perubahan pada kolom relasi SES
CREATE OR REPLACE FUNCTION calculate_student_ses_score()
RETURNS TRIGGER AS $$
DECLARE
  f_edu_score INTEGER := 0;
  m_edu_score INTEGER := 0;
  f_occ_score INTEGER := 0;
  m_occ_score INTEGER := 0;
  total_score INTEGER := 0;
  new_ses_class public.ses_class;
BEGIN
  -- Ambil skor dari tabel ses_variables
  IF NEW.father_education_id IS NOT NULL THEN
    SELECT score INTO f_edu_score FROM public.ses_variables WHERE id = NEW.father_education_id;
  END IF;
  IF NEW.mother_education_id IS NOT NULL THEN
    SELECT score INTO m_edu_score FROM public.ses_variables WHERE id = NEW.mother_education_id;
  END IF;
  IF NEW.father_occupation_id IS NOT NULL THEN
    SELECT score INTO f_occ_score FROM public.ses_variables WHERE id = NEW.father_occupation_id;
  END IF;
  IF NEW.mother_occupation_id IS NOT NULL THEN
    SELECT score INTO m_occ_score FROM public.ses_variables WHERE id = NEW.mother_occupation_id;
  END IF;
  
  total_score := COALESCE(f_edu_score, 0) + COALESCE(m_edu_score, 0) + COALESCE(f_occ_score, 0) + COALESCE(m_occ_score, 0);
  NEW.ses_score := total_score;

  -- Cocokkan total_score dengan ses_thresholds untuk update nilai enum ses_class
  -- Asumsikan kita punya maping teks threshold ke enum ses_class
  SELECT
    CASE name
      WHEN 'Atas' THEN 'atas'::public.ses_class
      WHEN 'Menengah Atas' THEN 'menengah_atas'::public.ses_class
      WHEN 'Menengah Bawah' THEN 'menengah_bawah'::public.ses_class
      WHEN 'Bawah' THEN 'bawah'::public.ses_class
      ELSE NULL
    END
  INTO new_ses_class
  FROM public.ses_thresholds
  WHERE total_score >= min_score AND total_score <= max_score
  LIMIT 1;

  NEW.ses_class := new_ses_class;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Pasang trigger ke tabel students
DROP TRIGGER IF EXISTS trigger_calculate_student_ses_score ON public.students;
CREATE TRIGGER trigger_calculate_student_ses_score
BEFORE INSERT OR UPDATE OF father_education_id, mother_education_id, father_occupation_id, mother_occupation_id
ON public.students
FOR EACH ROW
EXECUTE FUNCTION calculate_student_ses_score();

-- 8. Aktifkan RLS dan bypass buat super_admin
ALTER TABLE public.ses_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ses_thresholds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin can manage ses_variables" ON public.ses_variables;
CREATE POLICY "Super admin can manage ses_variables" ON public.ses_variables FOR ALL USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin');

DROP POLICY IF EXISTS "Super admin can manage ses_thresholds" ON public.ses_thresholds;
CREATE POLICY "Super admin can manage ses_thresholds" ON public.ses_thresholds FOR ALL USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin');

DROP POLICY IF EXISTS "Public read ses_variables" ON public.ses_variables;
CREATE POLICY "Public read ses_variables" ON public.ses_variables FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read ses_thresholds" ON public.ses_thresholds;
CREATE POLICY "Public read ses_thresholds" ON public.ses_thresholds FOR SELECT USING (true);

COMMIT;
