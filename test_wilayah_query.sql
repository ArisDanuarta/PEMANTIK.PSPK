WITH valid_sessions AS (
    SELECT 
      session_id, 
      student_id, 
      school_id,
      school_name,
      session_status, 
      final_score,
      COALESCE(province, student_province) AS province,
      COALESCE(city, student_city) AS city,
      student_district AS district,
      student_village AS village
    FROM v_assessment_report
    WHERE is_sandbox = false AND session_id IS NOT NULL AND school_id IS NOT NULL
  ),
  school_agg AS (
    SELECT 
      school_id,
      MAX(school_name) AS school_name,
      UPPER(MAX(province)) AS province,
      TRIM(REGEXP_REPLACE(UPPER(MAX(city)), 'KABUPATEN|KAB\.|KOTA|ADMINISTRASI', '', 'g')) AS city,
      UPPER(MAX(district)) AS district,
      UPPER(MAX(village)) AS village,
      COUNT(DISTINCT student_id) AS student_count,
      AVG(final_score) FILTER (WHERE session_status = 'completed') AS avg_score
    FROM valid_sessions
    GROUP BY school_id
  )
  SELECT count(*), sum(student_count) FROM school_agg WHERE province IS NOT NULL;
