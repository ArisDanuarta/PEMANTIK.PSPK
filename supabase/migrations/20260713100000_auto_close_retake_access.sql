-- =====================================================================================
-- PEMANTIK — Auto Close Retake Access
-- Tanggal: 2026-07-13
--
-- DESKRIPSI:
-- Saat student selesai melakukan ujian (sync ke supabase dengan status 'completed'),
-- sistem akan mengevaluasi apakah student sedang menggunakan akses retake individu
-- (target_type = 'student'). Jika iya, sistem akan memeriksa kelulusannya.
-- Jika GAGAL, atau jika LULUS DI LEVEL TERAKHIR (tamat), maka akses retake
-- akan langsung dimatikan (is_active = false) agar tidak bisa diulang terus menerus.
-- =====================================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_session_completion_for_retake()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_target_type text;
  v_passing_threshold int;
  v_level_number int;
  v_max_level_number int;
  v_is_passed boolean;
  v_should_close_access boolean := false;
BEGIN
  -- Hanya proses jika status berubah menjadi 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Pastikan sesi ini terikat dengan access_id dan level tertentu
    IF NEW.access_id IS NOT NULL AND NEW.current_level_id IS NOT NULL THEN
      
      -- Ambil tipe target dari assessment_access
      SELECT target_type INTO v_target_type 
      FROM public.assessment_access 
      WHERE id = NEW.access_id;

      -- Hanya proses jika ini adalah akses individu (ujian ulang)
      IF v_target_type = 'student' THEN
        
        -- Dapatkan info level yang baru saja diselesaikan
        SELECT passing_threshold, level_number INTO v_passing_threshold, v_level_number
        FROM public.question_levels
        WHERE id = NEW.current_level_id;

        -- Dapatkan level tertinggi untuk kategori ini
        SELECT MAX(level_number) INTO v_max_level_number
        FROM public.question_levels
        WHERE category_id = NEW.category_id;

        -- Tentukan kelulusan (jika passing_threshold tidak ada, asumsikan butuh minimal 1 benar, atau lolos jika score >= 0)
        IF v_passing_threshold IS NOT NULL THEN
          v_is_passed := (NEW.score >= v_passing_threshold);
        ELSE
          v_is_passed := (NEW.score > 0);
        END IF;

        -- Logika penutupan akses:
        -- 1. Jika TIDAK LULUS (Gagal) -> Tutup
        -- 2. Jika LULUS, tapi ini adalah level terakhir (Tamat) -> Tutup
        IF NOT v_is_passed THEN
          v_should_close_access := true;
        ELSIF v_is_passed AND (v_level_number = v_max_level_number) THEN
          v_should_close_access := true;
        END IF;

        -- Lakukan penutupan jika syarat terpenuhi
        IF v_should_close_access THEN
          -- Matikan hak akses agar tidak muncul lagi di aplikasi anak
          UPDATE public.assessment_access 
          SET is_active = false 
          WHERE id = NEW.access_id;
          
          -- Tandai request ujian ulang sebagai selesai agar tidak menggantung di dashboard Admin
          -- (opsional tapi disarankan agar rapi)
          UPDATE public.assessment_retake_requests
          SET status = 'completed',
              updated_at = NOW()
          WHERE student_id = NEW.student_id 
            AND status = 'approved'
            AND category_id = NEW.category_id;
        END IF;

      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Pastikan trigger sebelumnya dihapus jika ada (idempoten)
DROP TRIGGER IF EXISTS trg_check_retake_completion ON public.assessment_sessions;

-- Pasang trigger pada tabel assessment_sessions
CREATE TRIGGER trg_check_retake_completion
AFTER INSERT OR UPDATE ON public.assessment_sessions
FOR EACH ROW
EXECUTE FUNCTION public.handle_session_completion_for_retake();

COMMIT;
