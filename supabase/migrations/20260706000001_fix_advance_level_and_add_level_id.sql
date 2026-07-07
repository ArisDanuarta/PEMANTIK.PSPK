-- ══════════════════════════════════════════════════════════════════════════════
-- PEMANTIK — Fix advance_student_level & Add level_id to assessment_sessions
-- Tanggal: 2026-07-06
--
-- TUJUAN:
--   1. Menambahkan kolom level_id ke assessment_sessions agar sesi yang dikerjakan
--      untuk level tertentu tetap menyimpan referensi level awalnya meskipun
--      current_level_id berubah atau disinkronisasi ulang.
--   2. Memperbaiki advance_student_level() agar:
--      - Tidak menolak sesi yang statusnya sudah di-upload sebagai 'completed' oleh mobile.
--      - Menghitung v_level_score berdasarkan jumlah jawaban benar (COUNT/SUM),
--        bukan persentase rata-rata (AVG 100.0), sehingga cocok dengan passing_threshold.
-- ══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Tambahkan kolom level_id pada assessment_sessions ──────────────────────
ALTER TABLE public.assessment_sessions
ADD COLUMN IF NOT EXISTS level_id UUID REFERENCES public.question_levels(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.assessment_sessions.level_id IS
'ID level awal saat sesi dibuat/dikerjakan. Mencegah hilangnya konteks level saat disinkronisasi.';

-- ── 2. Update atau buat ulang fungsi advance_student_level ────────────────────
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

  -- Jika sesi sudah void atau expired, jangan update lagi.
  -- Catatan: Status 'completed' dari mobile diperbolehkan agar RPC bisa mengevaluasi kelulusan.
  IF v_session.status IN ('void', 'expired') THEN
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
  -- Menghitung jumlah jawaban benar (bukan persentase) agar sesuai dengan passing_threshold (count)
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

GRANT EXECUTE ON FUNCTION public.advance_student_level(uuid, uuid) TO anon;

COMMENT ON FUNCTION public.advance_student_level(uuid, uuid) IS
'Hitung skor level siswa (jumlah benar) dan advance ke level berikutnya atau selesaikan sesi. Dipanggil dari Flutter setelah upload.';

COMMIT;
