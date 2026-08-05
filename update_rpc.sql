BEGIN;

CREATE OR REPLACE FUNCTION public.advance_student_level(
  p_session_id       uuid,
  p_current_level_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session       assessment_sessions%ROWTYPE;
  v_current_level question_levels%ROWTYPE;
  v_next_level    question_levels%ROWTYPE;
  v_level_score   numeric;
  v_total_answers integer;
  v_result        jsonb;
BEGIN
  -- ── 1. Ambil dan validasi sesi ──────────────────────────────────────────
  SELECT * INTO v_session
  FROM assessment_sessions
  WHERE id = p_session_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'action', 'error',
      'reason', 'session_not_found'
    );
  END IF;

  -- Jika sesi sudah expired, jangan update lagi.
  -- Catatan: Status 'completed' dari mobile diperbolehkan agar RPC bisa mengevaluasi kelulusan.
  -- Menghapus pengecekan 'void' karena menyebabkan error enum, dan web app menggunakan 'expired' untuk void.
  IF v_session.status::text IN ('expired') THEN
    RETURN jsonb_build_object(
      'action', 'error',
      'reason', 'session_already_closed',
      'current_status', v_session.status
    );
  END IF;

  -- ── 2. Ambil informasi level saat ini ───────────────────────────────────
  SELECT * INTO v_current_level
  FROM question_levels
  WHERE id = p_current_level_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'action', 'error',
      'reason', 'level_not_found'
    );
  END IF;

  -- ── 3. Hitung persentase benar dari student_answers ─────────────────────
  -- Gunakan COUNT agar sesuai dengan absolute passing_threshold (misal: 3 benar)
  SELECT COUNT(*) INTO v_total_answers
  FROM student_answers
  WHERE session_id = p_session_id;

  IF v_total_answers = 0 THEN
    RETURN jsonb_build_object(
      'action', 'error',
      'reason', 'no_answers_found',
      'hint', 'Pastikan semua jawaban sudah ter-upload sebelum memanggil advance_student_level'
    );
  END IF;

  SELECT COALESCE(SUM(CASE WHEN is_correct THEN 1 ELSE 0 END), 0)
    INTO v_level_score
  FROM student_answers
  WHERE session_id = p_session_id;

  -- ── 4. Cari level berikutnya berdasarkan urutan ─────────────────────────
  SELECT * INTO v_next_level
  FROM question_levels
  WHERE category_id = v_current_level.category_id
    AND level_number = v_current_level.level_number + 1;

  -- ── 5. Logika: advance atau complete ────────────────────────────────────
  IF v_level_score >= v_current_level.passing_threshold
     AND v_next_level.id IS NOT NULL THEN
    -- ── CASE A: LULUS dan masih ada level berikutnya → NAIK LEVEL ──────
    UPDATE assessment_sessions
    SET
      current_level_id = v_next_level.id,
      level_id         = COALESCE(level_id, p_current_level_id)
    WHERE id = p_session_id;

    v_result := jsonb_build_object(
      'action',             'advance',
      'next_level_id',      v_next_level.id,
      'next_level_number',  v_next_level.level_number,
      'level_score',        ROUND(v_level_score, 1),
      'passing_threshold',  v_current_level.passing_threshold,
      'completed_level',    v_current_level.level_number
    );
  ELSE
    -- ── CASE B: TIDAK LULUS atau level terakhir → SELESAI ──────────────
    UPDATE assessment_sessions
    SET
      status       = 'completed',
      completed_at = COALESCE(completed_at, now()),
      level_id     = COALESCE(level_id, p_current_level_id)
    WHERE id = p_session_id;

    v_result := jsonb_build_object(
      'action',            'complete',
      'final_level',       v_current_level.level_number,
      'level_score',       ROUND(v_level_score, 1),
      'passing_threshold', v_current_level.passing_threshold,
      'reason',            CASE
        WHEN v_level_score < v_current_level.passing_threshold
          THEN 'below_threshold'
        ELSE 'last_level_completed'
      END
    );
  END IF;

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'action',  'error',
    'reason',  'unexpected_error',
    'detail',  SQLERRM
  );
END;
$$;

COMMIT;
