BEGIN;

-- Hapus view lama
DROP VIEW IF EXISTS v_assessment_report;

-- ── v_assessment_report ──────────────────────────────────────────────────────
-- View ini mencakup DUA jenis sesi:
--   A) Sesi via assessment_access (sesi baru via akses ujian normal)
--   B) Sesi legacy hasil migrasi (access_id IS NULL, dihubungkan via school_id)
-- Filter is_void = false sudah built-in di kedua bagian.
-- SECURITY INVOKER: RLS tabel dasar tetap berlaku.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_assessment_report WITH (security_invoker = true) AS

-- ── BAGIAN A: Sesi via assessment_access (sesi normal) ──────────────────────
SELECT
  aa.id           AS access_id,
  aa.phase,
  aa.valid_from,
  aa.valid_until,
  aa.category_id,
  qc.name         AS category_name,
  qc.subject_area,

  cm.id           AS community_id,
  cm.name         AS community_name,
  COALESCE(cm.is_sandbox, false) AS is_sandbox,
  sc.id           AS school_id,
  sc.name         AS school_name,
  sc.npsn,
  sc.province,
  sc.city,

  cl.id           AS class_id,
  cl.name         AS class_name,
  cl.grade,
  us.id           AS teacher_id,
  us.full_name    AS teacher_name,

  st.id           AS student_id,
  st.full_name    AS student_name,
  st.username     AS student_username,
  st.nisn,
  st.gender,
  st.birth_date,
  st.ses_class,
  st.ses_score,
  st.province     AS student_province,
  st.city         AS student_city,
  st.district     AS student_district,
  st.village      AS student_village,

  ses.id          AS session_id,
  ses.status      AS session_status,
  ses.started_at,
  ses.completed_at,
  ses.score       AS final_score,
  ses.time_spent_sec,
  ses.attempt_number,
  ses.is_void,
  ses.current_level_id,

  ql.level_number AS final_level_number,
  ql.passing_threshold

FROM assessment_access aa
JOIN  question_categories qc ON qc.id = aa.category_id
JOIN  schools sc              ON sc.id = aa.target_id AND aa.target_type = 'school'
LEFT JOIN  communities cm          ON cm.id = sc.community_id
LEFT JOIN assessment_sessions ses ON ses.access_id  = aa.id
                                 AND ses.is_void = false
LEFT JOIN students st         ON st.id = ses.student_id
LEFT JOIN classes cl          ON cl.id = st.class_id
LEFT JOIN users us            ON us.id = cl.teacher_id
LEFT JOIN question_levels ql  ON ql.id = ses.current_level_id

UNION ALL

-- ── BAGIAN B: Sesi hasil migrasi (access_id IS NULL) ────────────────────────
SELECT
  NULL            AS access_id,
  ses.phase       AS phase,
  NULL            AS valid_from,
  NULL            AS valid_until,
  ses.category_id,
  qc.name         AS category_name,
  qc.subject_area,

  cm.id           AS community_id,
  cm.name         AS community_name,
  COALESCE(cm.is_sandbox, false) AS is_sandbox,
  sc.id           AS school_id,
  sc.name         AS school_name,
  sc.npsn,
  sc.province,
  sc.city,

  cl.id           AS class_id,
  cl.name         AS class_name,
  cl.grade,
  us.id           AS teacher_id,
  us.full_name    AS teacher_name,

  st.id           AS student_id,
  st.full_name    AS student_name,
  st.username     AS student_username,
  st.nisn,
  st.gender,
  st.birth_date,
  st.ses_class,
  st.ses_score,
  st.province     AS student_province,
  st.city         AS student_city,
  st.district     AS student_district,
  st.village      AS student_village,

  ses.id          AS session_id,
  ses.status      AS session_status,
  ses.started_at,
  ses.completed_at,
  ses.score       AS final_score,
  ses.time_spent_sec,
  ses.attempt_number,
  ses.is_void,
  ses.current_level_id,

  ql.level_number AS final_level_number,
  ql.passing_threshold

FROM assessment_sessions ses
JOIN  students st         ON st.id  = ses.student_id
JOIN  schools sc          ON sc.id  = ses.school_id
LEFT JOIN  communities cm      ON cm.id  = sc.community_id
LEFT JOIN question_categories qc ON qc.id = ses.category_id
LEFT JOIN classes cl          ON cl.id  = st.class_id
LEFT JOIN users us            ON us.id  = cl.teacher_id
LEFT JOIN question_levels ql  ON ql.id  = ses.current_level_id

WHERE ses.access_id IS NULL
  AND ses.is_void = false;

-- ─────────────────────────────────────────────────────────────────────────────
COMMENT ON VIEW v_assessment_report IS
'View laporan utama PEMANTIK. Mencakup dua jenis sesi:
(A) Sesi via assessment_access (sesi normal/baru), dan
(B) Sesi hasil migrasi legacy (access_id IS NULL, link via school_id).
Filter is_void=false built-in. Field is_sandbox dari tabel communities.
SECURITY INVOKER: RLS tabel dasar tetap berlaku.';

COMMIT;
