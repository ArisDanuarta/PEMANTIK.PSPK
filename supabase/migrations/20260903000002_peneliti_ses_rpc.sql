CREATE OR REPLACE FUNCTION get_peneliti_ses_stats()
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  WITH student_stats AS (
    SELECT id, city, district, province, ses_score
    FROM students
    WHERE province IS NOT NULL
  ),
  province_agg AS (
    SELECT 
      UPPER(province) AS province,
      COUNT(*) AS count,
      SUM(ses_score) AS total_score
    FROM student_stats
    GROUP BY 1
  ),
  city_district_agg AS (
    SELECT 
      TRIM(REGEXP_REPLACE(UPPER(city), 'KABUPATEN|KAB\.|KOTA|ADMINISTRASI', '', 'g')) AS city,
      TRIM(REGEXP_REPLACE(UPPER(district), 'KECAMATAN|KEC\.', '', 'g')) AS district,
      COUNT(*) AS count,
      SUM(ses_score) AS total_score
    FROM student_stats
    WHERE city IS NOT NULL
    GROUP BY 1, 2
  ),
  correlation_prep AS (
    SELECT student_id, AVG(final_score) AS avg_assess_score
    FROM v_assessment_report
    WHERE session_status = 'completed' AND is_sandbox = false
    GROUP BY 1
  ),
  correlation_pairs AS (
    SELECT 
      s.ses_score, 
      c.avg_assess_score
    FROM student_stats s
    JOIN correlation_prep c ON s.id = c.student_id
    WHERE s.ses_score IS NOT NULL
  )
  SELECT jsonb_build_object(
    'provinceStats', COALESCE((SELECT jsonb_agg(row_to_json(p)) FROM province_agg p), '[]'::jsonb),
    'cityStats', COALESCE((SELECT jsonb_agg(row_to_json(c)) FROM city_district_agg c), '[]'::jsonb),
    'correlationCoef', COALESCE((SELECT CORR(avg_assess_score, ses_score) FROM correlation_pairs), 0),
    'correlationData', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('sesScore', ROUND(ses_score::numeric, 1), 'assessScore', ROUND(avg_assess_score::numeric, 1))) 
      FROM (SELECT ses_score, avg_assess_score FROM correlation_pairs LIMIT 2000) AS sample
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
