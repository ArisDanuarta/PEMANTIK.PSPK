CREATE OR REPLACE FUNCTION get_peneliti_komparatif_stats(
  p_community_id TEXT DEFAULT 'all',
  p_province TEXT DEFAULT 'all',
  p_gender TEXT DEFAULT 'all'
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Filtered sessions
  WITH filtered_sessions AS (
    SELECT *
    FROM v_assessment_report
    WHERE is_sandbox = false 
      AND session_status = 'completed'
      AND (p_community_id = 'all' OR (community_id)::text = p_community_id)
      AND (p_province = 'all' OR province = p_province)
      AND (p_gender = 'all' OR gender::text = p_gender)
  ),
  ses_agg AS (
    SELECT 
      COALESCE(ses_class::text, 'Tidak Diketahui') AS name,
      ROUND(AVG(final_score)::numeric, 2) AS "RataRataSkor",
      COUNT(*) AS "JumlahSiswa"
    FROM filtered_sessions
    GROUP BY 1
  ),
  gender_agg AS (
    SELECT 
      CASE WHEN gender::text = 'L' THEN 'Laki-laki' WHEN gender::text = 'P' THEN 'Perempuan' ELSE 'Tidak Diketahui' END AS name,
      ROUND(AVG(final_score)::numeric, 2) AS "RataRataSkor",
      COUNT(*) AS "Jumlah"
    FROM filtered_sessions
    WHERE gender::text IN ('L', 'P')
    GROUP BY 1
  ),
  level_agg AS (
    SELECT 
      COALESCE(community_name, 'Tidak Diketahui') AS community,
      COUNT(*) FILTER (WHERE final_level_number = 0) AS level0,
      COUNT(*) FILTER (WHERE final_level_number = 1) AS level1,
      COUNT(*) FILTER (WHERE final_level_number = 2) AS level2,
      COUNT(*) FILTER (WHERE final_level_number = 3) AS level3,
      COUNT(*) FILTER (WHERE final_level_number = 4) AS level4,
      COUNT(*) FILTER (WHERE final_level_number = 5) AS level5,
      COUNT(*) AS total
    FROM filtered_sessions
    GROUP BY 1
    ORDER BY total DESC
    LIMIT 10
  )
  SELECT jsonb_build_object(
    'sesData', COALESCE((SELECT jsonb_agg(row_to_json(s)) FROM ses_agg s), '[]'::jsonb),
    'genderData', COALESCE((SELECT jsonb_agg(row_to_json(g)) FROM gender_agg g), '[]'::jsonb),
    'levelDistData', COALESCE((SELECT jsonb_agg(row_to_json(l)) FROM level_agg l), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
