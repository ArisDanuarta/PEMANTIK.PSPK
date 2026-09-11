CREATE OR REPLACE FUNCTION get_peneliti_wilayah_stats()
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  WITH student_agg AS (
    SELECT 
      st.school_id,
      COUNT(DISTINCT st.id) AS student_count,
      AVG(v.final_score) AS avg_score
    FROM students st
    LEFT JOIN v_assessment_report v ON st.id = v.student_id AND v.session_status = 'completed' AND v.is_sandbox = false
    GROUP BY st.school_id
  ),
  teacher_agg AS (
    SELECT 
      school_id,
      COUNT(id) AS teacher_count
    FROM teachers
    GROUP BY school_id
  ),
  school_stats AS (
    SELECT 
      sc.id AS school_id,
      sc.name AS school_name,
      UPPER(sc.province) AS province,
      TRIM(REGEXP_REPLACE(UPPER(sc.city), 'KABUPATEN|KAB\.|KOTA|ADMINISTRASI', '', 'g')) AS city,
      TRIM(REGEXP_REPLACE(UPPER(sc.district), 'KECAMATAN|KEC\.', '', 'g')) AS district,
      UPPER(sc.village) AS village,
      COALESCE(sa.student_count, 0) AS student_count,
      COALESCE(ta.teacher_count, 0) AS teacher_count,
      sa.avg_score
    FROM schools sc
    LEFT JOIN student_agg sa ON sc.id = sa.school_id
    LEFT JOIN teacher_agg ta ON sc.id = ta.school_id
    WHERE sc.province IS NOT NULL
  )
  SELECT jsonb_agg(row_to_json(s))
  INTO v_result
  FROM school_stats s;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
