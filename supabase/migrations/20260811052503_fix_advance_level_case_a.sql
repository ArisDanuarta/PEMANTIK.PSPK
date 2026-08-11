-- PEMANTIK — Fix advance_student_level score and status recording in Case A

CREATE OR REPLACE FUNCTION public.advance_student_level(
  p_session_id uuid,
  p_current_level_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_session           RECORD;
  v_current_level     RECORD;
  v_next_level        RECORD;
  v_total_answers     INTEGER;
  v_level_score       NUMERIC;
  v_result            JSONB;
BEGIN
  -- ── 1. Ambil data session & pastikan masih valid ────────────────────────
  SELECT * INTO v_session
  FROM assessment_sessions
  WHERE id = p_session_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'action', 'error',
      'reason', 'session_not_found'
    );
  END IF;

  -- Jika sesi sudah void atau expired, jangan update lagi.
  -- Catatan: Status 'completed' dari mobile diperbolehkan agar RPC bisa mengevaluasi kelulusan.
  IF v_session.is_void = true OR v_session.status = 'expired' THEN
    RETURN jsonb_build_object(
      'action', 'error',
      'reason', 'session_already_closed',
      'current_status', v_session.status
    );
  END IF;

  -- ── 2. Ambil data level saat ini ────────────────────────────────────────
  SELECT * INTO v_current_level
  FROM question_levels
  WHERE id = p_current_level_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'action', 'error',
      'reason', 'level_not_found'
    );
  END IF;

  -- ── 3. Hitung skor level ini dari student_answers yang sudah di-upload ──
  SELECT
    COUNT(*),
    COALESCE(
      SUM(CASE WHEN sa.is_correct = true THEN 1 ELSE 0 END),
      0
    )
  INTO v_total_answers, v_level_score
  FROM student_answers sa
  JOIN questions q ON q.id = sa.question_id
  WHERE sa.session_id = p_session_id
    AND q.level_id = p_current_level_id;

  -- Jika tidak ada jawaban terupload untuk level ini (offline / belum sync)
  IF v_total_answers = 0 THEN
    RETURN jsonb_build_object(
      'action', 'error',
      'reason', 'no_answers_found_for_level',
      'hint', 'Pastikan semua jawaban sudah ter-upload sebelum memanggil advance_student_level'
    );
  END IF;

  -- ── 4. Cek apakah ada level berikutnya dalam kategori yang sama ─────────
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
      level_id         = COALESCE(level_id, p_current_level_id),
      score            = ROUND(v_level_score, 1),
      status           = 'completed',
      completed_at     = COALESCE(completed_at, now()),
      sync_status      = 'synced',
      synced_at        = now()
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
      level_id     = COALESCE(level_id, p_current_level_id),
      score        = ROUND(v_level_score, 1),
      sync_status  = 'synced',
      synced_at    = now()
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
END;
$function$;
