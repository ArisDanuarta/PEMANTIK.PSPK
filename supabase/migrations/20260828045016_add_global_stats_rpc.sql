-- Create an RPC to calculate global stats efficiently in PostgreSQL

CREATE OR REPLACE FUNCTION get_superadmin_dashboard_stats(
  p_category_id UUID DEFAULT NULL,
  p_community_id UUID DEFAULT NULL,
  p_school_id UUID DEFAULT NULL
)
RETURNS TABLE (
  total_siswa BIGINT,
  avg_score_total NUMERIC,
  avg_score_lit NUMERIC,
  avg_score_num NUMERIC
) AS $$
DECLARE
  v_session_ids UUID[];
BEGIN
  -- 1. Gather relevant non-sandbox sessions
  SELECT array_agg(session_id) INTO v_session_ids
  FROM v_assessment_report
  WHERE is_sandbox = false
    AND (p_category_id IS NULL OR category_id = p_category_id)
    AND (p_community_id IS NULL OR community_id = p_community_id)
    AND (p_school_id IS NULL OR school_id = p_school_id);

  IF v_session_ids IS NULL OR array_length(v_session_ids, 1) = 0 THEN
    RETURN QUERY SELECT 0::BIGINT, 0.0::NUMERIC, 0.0::NUMERIC, 0.0::NUMERIC;
    RETURN;
  END IF;

  -- 2. Return aggregates
  RETURN QUERY
  WITH SessionScores AS (
    SELECT 
      sa.session_id,
      SUM(CASE WHEN q.subject_area = 'literasi' AND (sa.score > 0 OR sa.is_correct = true) THEN COALESCE(sa.score, 1) ELSE 0 END) AS score_lit,
      SUM(CASE WHEN q.subject_area = 'numerasi' AND (sa.score > 0 OR sa.is_correct = true) THEN COALESCE(sa.score, 1) ELSE 0 END) AS score_num
    FROM student_answers sa
    JOIN questions q ON q.id = sa.question_id
    WHERE sa.session_id = ANY(v_session_ids)
    GROUP BY sa.session_id
  ),
  AggScores AS (
    SELECT 
      COALESCE(AVG(score_lit), 0.0) AS avg_lit,
      COALESCE(AVG(score_num), 0.0) AS avg_num
    FROM SessionScores
  ),
  TotalScores AS (
    SELECT COALESCE(AVG(final_score), 0.0) AS avg_total 
    FROM v_assessment_report 
    WHERE session_id = ANY(v_session_ids)
  )
  SELECT 
    array_length(v_session_ids, 1)::BIGINT AS total_siswa,
    (SELECT avg_total FROM TotalScores)::NUMERIC AS avg_score_total,
    (SELECT avg_lit FROM AggScores)::NUMERIC AS avg_score_lit,
    (SELECT avg_num FROM AggScores)::NUMERIC AS avg_score_num;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
