CREATE OR REPLACE FUNCTION get_peneliti_soal_stats()
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  WITH valid_sessions AS (
    SELECT session_id
    FROM v_assessment_report
    WHERE session_status = 'completed' AND is_sandbox = false
  ),
  answers_agg AS (
    SELECT 
      sa.question_id,
      COUNT(*) AS total_answers,
      COUNT(*) FILTER (WHERE sa.is_correct = true) AS correct_answers
    FROM student_answers sa
    JOIN valid_sessions vs ON sa.session_id = vs.session_id
    GROUP BY sa.question_id
  ),
  soal_stats AS (
    SELECT 
      q.id,
      q.question_code,
      q.subject_area,
      q.question_type,
      ql.level_number,
      a.total_answers,
      a.correct_answers,
      CASE WHEN a.total_answers > 0 
           THEN ROUND((a.correct_answers::numeric / a.total_answers::numeric) * 100, 2) 
           ELSE 0 END AS success_rate,
      0 AS avg_time
    FROM answers_agg a
    JOIN questions q ON a.question_id = q.id
    LEFT JOIN question_levels ql ON q.id = ql.question_id
    WHERE q.question_code NOT LIKE 'TES-%' 
      AND a.total_answers >= 5
    ORDER BY success_rate ASC
  )
  SELECT COALESCE(jsonb_agg(row_to_json(s)), '[]'::jsonb)
  INTO v_result
  FROM soal_stats s;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
