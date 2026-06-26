-- ══════════════════════════════════════════════════════════════════════════════
-- PEMANTIK — Minggu 3: Logika Bisnis — advance_student_level RPC
-- Tanggal: 2026-06-26
--
-- TUJUAN:
--   Buat fungsi advance_student_level() yang dipanggil dari Flutter setelah
--   semua jawaban sebuah level ter-upload ke Supabase.
--
--   Fungsi ini menggantikan validate_level_completion() yang hanya membaca data
--   tanpa melakukan update apapun di database.
--
-- KEUNGGULAN DIBANDING validate_level_completion():
--   - Satu transaksi: baca skor + UPDATE sessions (atomic)
--   - Return jsonb kaya informasi untuk Flutter (action, level_score, reason)
--   - SECURITY DEFINER: fungsi berjalan sebagai pemilik bukan sebagai caller,
--     memungkinkan update assessment_sessions meskipun RLS siswa terbatas
-- ══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNGSI UTAMA: advance_student_level
-- Input:
--   p_session_id     : UUID sesi yang sedang berjalan
--   p_current_level_id : UUID level yang baru saja selesai dikerjakan
--
-- Return jsonb contoh:
--   advance  : {"action":"advance","next_level_id":"...","next_level_number":2,"level_score":85.0}
--   complete : {"action":"complete","final_level":1,"level_score":65.0,"reason":"below_threshold"}
--   complete : {"action":"complete","final_level":3,"level_score":92.0,"reason":"last_level_completed"}
--   error    : {"action":"error","reason":"session_not_found"}
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.advance_student_level(
  p_session_id      uuid,
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

  -- Jika sesi sudah completed/void, jangan update lagi
  IF v_session.status IN ('completed', 'expired') THEN
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
  -- Hanya hitung jawaban dari soal-soal di level ini
  SELECT
    COUNT(*),
    COALESCE(
      AVG(CASE WHEN sa.is_correct = true THEN 100.0 ELSE 0.0 END),
      0.0
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
    SET current_level_id = v_next_level.id
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
      completed_at = now()
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
  -- Jangan crash app siswa karena error RPC — return error yang bisa di-log
  RETURN jsonb_build_object(
    'action',  'error',
    'reason',  'unexpected_error',
    'detail',  SQLERRM
  );
END;
$$;

-- Grant execute ke role anon (siswa pakai anon + custom JWT)
GRANT EXECUTE ON FUNCTION public.advance_student_level(uuid, uuid) TO anon;

-- Tambah komentar dokumentasi
COMMENT ON FUNCTION public.advance_student_level(uuid, uuid) IS
'Hitung skor level siswa dan advance ke level berikutnya atau selesaikan sesi.
Dipanggil dari Flutter setelah semua jawaban satu level ter-upload ke Supabase.
Return jsonb dengan action: advance | complete | error.';

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFIKASI: Jalankan di SQL Editor setelah migration
-- ─────────────────────────────────────────────────────────────────────────────
/*
-- Cek fungsi terdaftar
SELECT proname, prosecdef, pronargs
FROM pg_proc
WHERE proname = 'advance_student_level';

-- Test dengan session dummy (akan return error session_not_found)
SELECT advance_student_level(
  '00000000-0000-0000-0000-000000000000'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid
);
-- Expected: {"action":"error","reason":"session_not_found"}
*/
