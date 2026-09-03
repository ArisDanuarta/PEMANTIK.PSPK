-- Create an RPC to calculate peneliti dashboard stats efficiently in PostgreSQL
-- Avoiding OOM issues by doing aggregations directly in the DB.

CREATE OR REPLACE FUNCTION get_peneliti_dashboard_stats()
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  WITH valid_sessions AS (
    SELECT 
      session_id, 
      student_id, 
      school_id, 
      community_id, 
      community_name, 
      session_status, 
      final_score, 
      final_level_number, 
      completed_at
    FROM v_assessment_report
    WHERE is_sandbox = false AND session_id IS NOT NULL
  ),
  completed_sessions AS (
    SELECT * FROM valid_sessions WHERE session_status = 'completed'
  ),
  basic_stats AS (
    SELECT 
      COUNT(DISTINCT student_id) AS total_students,
      COUNT(DISTINCT school_id) AS active_schools,
      COUNT(*) AS total_sessions,
      (SELECT COUNT(*) FROM completed_sessions) AS completed_count,
      COALESCE((SELECT AVG(final_score) FROM completed_sessions), 0) AS avg_score_total
    FROM valid_sessions
  ),
  monthly_trend AS (
    SELECT 
      to_char(completed_at, 'YYYY-MM') AS month,
      AVG(final_score) AS avg_score
    FROM completed_sessions
    WHERE completed_at IS NOT NULL
    GROUP BY 1
    ORDER BY 1
  ),
  top_communities AS (
    SELECT 
      community_name AS name,
      AVG(final_score) AS avg_score
    FROM completed_sessions
    WHERE community_id IS NOT NULL
    GROUP BY community_id, community_name
    ORDER BY avg_score DESC
    LIMIT 5
  ),
  student_max_levels AS (
    SELECT student_id, MAX(COALESCE(final_level_number, 0)) as max_level
    FROM completed_sessions
    WHERE student_id IS NOT NULL
    GROUP BY student_id
  ),
  level_distribution AS (
    SELECT 
      'Level ' || max_level AS level,
      COUNT(*) AS count,
      max_level as lvl_num
    FROM student_max_levels
    GROUP BY max_level
    ORDER BY max_level
  )
  SELECT jsonb_build_object(
    'totalStudents', (SELECT total_students FROM basic_stats),
    'activeSchools', (SELECT active_schools FROM basic_stats),
    'completionRate', CASE WHEN (SELECT total_sessions FROM basic_stats) > 0 THEN ((SELECT completed_count FROM basic_stats)::numeric / (SELECT total_sessions FROM basic_stats)) * 100 ELSE 0 END,
    'avgScoreTotal', (SELECT avg_score_total FROM basic_stats),
    'avgScoreLit', 0,
    'avgScoreNum', 0,
    'monthlyTrend', COALESCE((SELECT jsonb_agg(jsonb_build_object('month', month, 'avgScore', avg_score)) FROM monthly_trend), '[]'::jsonb),
    'topCommunities', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', name, 'avgScore', avg_score)) FROM top_communities), '[]'::jsonb),
    'levelDistribution', COALESCE((SELECT jsonb_agg(jsonb_build_object('level', level, 'count', count) ORDER BY lvl_num ASC) FROM level_distribution), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
