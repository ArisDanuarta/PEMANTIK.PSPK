-- Function to calculate geographical area stats for peneliti dashboard
CREATE OR REPLACE FUNCTION get_peneliti_wilayah_stats()
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- We base our stats on v_assessment_report to match the Dashboard's "Siswa Asesmen" and "Sekolah Aktif".
  -- We also count teachers by joining the users table.
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
  ),
  teacher_agg AS (
    SELECT 
      school_id, 
      COUNT(DISTINCT id) AS teacher_count
    FROM users
    WHERE role = 'teacher' AND school_id IS NOT NULL
    GROUP BY school_id
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'province', sa.province,
      'city', sa.city,
      'district', sa.district,
      'village', sa.village,
      'school_id', sa.school_id,
      'school_name', sa.school_name,
      'student_count', sa.student_count,
      'teacher_count', COALESCE(ta.teacher_count, 0),
      'avg_score', COALESCE(sa.avg_score, 0)
    )
  ), '[]'::jsonb)
  INTO v_result
  FROM school_agg sa
  LEFT JOIN teacher_agg ta ON sa.school_id = ta.school_id
  WHERE sa.province IS NOT NULL;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
