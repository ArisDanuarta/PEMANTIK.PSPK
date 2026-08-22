CREATE OR REPLACE FUNCTION get_community_item_analysis(p_community_id UUID, p_phase TEXT)
RETURNS TABLE (
  question_code TEXT,
  subject_area TEXT,
  total_answers BIGINT,
  correct_answers BIGINT,
  success_rate FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    q.question_code,
    q.subject_area::TEXT,
    COUNT(a.id) AS total_answers,
    SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END) AS correct_answers,
    (SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END)::FLOAT / NULLIF(COUNT(a.id)::FLOAT, 0)) * 100.0 AS success_rate
  FROM student_answers a
  JOIN assessment_sessions s ON a.session_id = s.id
  JOIN questions q ON a.question_id = q.id
  JOIN schools sc ON s.school_id = sc.id
  WHERE sc.community_id = p_community_id
    AND s.phase = p_phase
    AND s.is_void = false
    AND s.status = 'completed'
  GROUP BY q.question_code, q.subject_area;
END;
$$;
