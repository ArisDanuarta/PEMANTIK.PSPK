-- ============================================================
-- Migration: SES Auto-Recalculation Trigger
-- Spec §4c.1: Saat ses_variables di-update oleh Super Admin,
-- semua siswa yang pakai variabel tersebut dihitung ulang ses_score-nya.
-- - NULL jika ada komponen lain yang masih needs_review = true
-- - Angka jika semua komponen sudah direview
-- ============================================================

-- Fungsi trigger: dipanggil AFTER UPDATE pada ses_variables
CREATE OR REPLACE FUNCTION recalculate_student_ses_on_variable_update()
RETURNS TRIGGER AS $$
DECLARE
  student_rec RECORD;
  component_ids UUID[];
  has_unreviewed BOOLEAN;
  new_ses_score NUMERIC;
  new_ses_class TEXT;
  threshold_rec RECORD;
BEGIN
  -- Cari semua siswa yang pakai variabel yang baru diupdate
  FOR student_rec IN
    SELECT s.id,
           s.father_education_id,
           s.mother_education_id,
           s.father_occupation_id,
           s.mother_occupation_id
    FROM public.students s
    WHERE s.father_education_id  = NEW.id
       OR s.mother_education_id  = NEW.id
       OR s.father_occupation_id = NEW.id
       OR s.mother_occupation_id = NEW.id
  LOOP
    -- Kumpulkan semua komponen yang tidak NULL
    component_ids := ARRAY_REMOVE(
      ARRAY[
        student_rec.father_education_id,
        student_rec.mother_education_id,
        student_rec.father_occupation_id,
        student_rec.mother_occupation_id
      ],
      NULL
    );

    -- Cek apakah ada komponen yang masih needs_review
    SELECT EXISTS (
      SELECT 1 FROM public.ses_variables v
      WHERE v.id = ANY(component_ids)
        AND v.needs_review = TRUE
    ) INTO has_unreviewed;

    IF has_unreviewed THEN
      -- Belum semua komponen direview → ses_score = NULL, ses_class = NULL
      new_ses_score := NULL;
      new_ses_class := NULL;
    ELSIF array_length(component_ids, 1) > 0 THEN
      -- Semua komponen sudah direview → jumlahkan skor
      SELECT COALESCE(SUM(v.score), 0)
      FROM public.ses_variables v
      WHERE v.id = ANY(component_ids)
      INTO new_ses_score;

      -- Cari ses_class dari thresholds
      new_ses_class := NULL;
      FOR threshold_rec IN
        SELECT * FROM public.ses_thresholds
        WHERE new_ses_score >= min_score AND new_ses_score <= max_score
        LIMIT 1
      LOOP
        new_ses_class := threshold_rec.name;
      END LOOP;
    ELSE
      new_ses_score := NULL;
      new_ses_class := NULL;
    END IF;

    -- Update siswa
    UPDATE public.students
    SET ses_score = new_ses_score,
        ses_class = new_ses_class
    WHERE id = student_rec.id;

  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Buat trigger: jalankan setelah score atau needs_review di-update
DROP TRIGGER IF EXISTS trg_recalculate_student_ses ON public.ses_variables;
CREATE TRIGGER trg_recalculate_student_ses
  AFTER UPDATE OF score, needs_review ON public.ses_variables
  FOR EACH ROW
  WHEN (OLD.score IS DISTINCT FROM NEW.score OR OLD.needs_review IS DISTINCT FROM NEW.needs_review)
  EXECUTE FUNCTION recalculate_student_ses_on_variable_update();

-- Komentar: Trigger ini memastikan ses_score siswa selalu sinkron
-- dari endpoint manapun (API, dashboard, manual SQL) yang mengupdate ses_variables.
-- Implementasi aplikasi (ses.ts) juga tetap melakukan rekalkulasi manual
-- sebagai fallback untuk lingkungan yang tidak support trigger (mis. Edge Functions).
