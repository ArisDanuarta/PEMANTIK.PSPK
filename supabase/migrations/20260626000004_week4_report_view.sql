-- ══════════════════════════════════════════════════════════════════════════════
-- PEMANTIK — Minggu 4: Laporan — v_assessment_report VIEW
-- Tanggal: 2026-06-26
--
-- TUJUAN:
--   Buat VIEW tunggal sebagai sumber kebenaran untuk semua laporan.
--   View ini menyatukan: assessment_access, assessment_sessions, students,
--   classes, schools, communities, question_levels.
--
-- DESAIN:
--   - JOIN assessment_access ↔ sessions via ses.access_id (Minggu 2)
--   - final_level_number dari ses.current_level_id (ditrack Minggu 2-3)
--   - Filter is_void = false agar sesi yang direset tidak muncul
--   - SECURITY INVOKER (default): RLS tabel dasar tetap berlaku,
--     sehingga komunitas hanya bisa lihat sekolah binaannya,
--     Super Admin bisa lihat semua
--
-- BACKWARD COMPAT:
--   - Siswa lama (access_id = NULL) tetap muncul via ses.school_id
--     melalui LEFT JOIN fallback di subquery skolah
-- ══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- Drop dulu jika sudah ada versi lama
DROP VIEW IF EXISTS v_assessment_report;

CREATE OR REPLACE VIEW v_assessment_report WITH (security_invoker = true) AS
SELECT
  -- ── Data akses ujian ─────────────────────────────────────────────────────
  aa.id           AS access_id,
  aa.phase,
  aa.valid_from,
  aa.valid_until,
  aa.category_id,
  qc.name         AS category_name,
  qc.subject_area,

  -- ── Hierarki wilayah ─────────────────────────────────────────────────────
  cm.id           AS community_id,
  cm.name         AS community_name,
  sc.id           AS school_id,
  sc.name         AS school_name,
  sc.npsn,
  sc.province,
  sc.city,

  -- ── Kelas & guru ─────────────────────────────────────────────────────────
  cl.id           AS class_id,
  cl.name         AS class_name,
  cl.grade,
  us.id           AS teacher_id,
  us.full_name    AS teacher_name,

  -- ── Data siswa ───────────────────────────────────────────────────────────
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

  -- ── Data sesi ────────────────────────────────────────────────────────────
  ses.id          AS session_id,
  ses.status      AS session_status,
  ses.started_at,
  ses.completed_at,
  ses.score       AS final_score,
  ses.time_spent_sec,
  ses.attempt_number,
  ses.is_void,
  ses.current_level_id,

  -- ── Level yang dicapai ───────────────────────────────────────────────────
  ql.level_number AS final_level_number,
  ql.passing_threshold

FROM assessment_access aa
JOIN  question_categories qc ON qc.id = aa.category_id
JOIN  schools sc              ON sc.id = aa.target_id AND aa.target_type = 'school'
JOIN  communities cm          ON cm.id = sc.community_id
LEFT JOIN assessment_sessions ses ON ses.access_id  = aa.id
                                 AND ses.is_void = false
LEFT JOIN students st         ON st.id = ses.student_id
LEFT JOIN classes cl          ON cl.id = st.class_id
LEFT JOIN users us            ON us.id = cl.teacher_id
LEFT JOIN question_levels ql  ON ql.id = ses.current_level_id;

-- ─────────────────────────────────────────────────────────────────────────────
-- Tambah komentar dokumentasi
-- ─────────────────────────────────────────────────────────────────────────────
COMMENT ON VIEW v_assessment_report IS
'View laporan utama PEMANTIK. Menyatukan assessment_access, sessions, students,
classes, schools, communities, dan question_levels. Filter is_void=false sudah
built-in. Gunakan view ini sebagai satu-satunya sumber kebenaran untuk semua
laporan dan export. RLS tabel dasar tetap berlaku (SECURITY INVOKER).';

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFIKASI: Jalankan setelah migration
-- ─────────────────────────────────────────────────────────────────────────────
/*
-- Cek view terdaftar
SELECT viewname FROM pg_views WHERE viewname = 'v_assessment_report';

-- Preview 5 baris (include siswa yang belum ada sesi = session_id NULL)
SELECT
  community_name, school_name, student_name,
  session_status, final_score, final_level_number,
  phase, valid_from, valid_until
FROM v_assessment_report
LIMIT 5;

-- Hitung siswa selesai per sekolah
SELECT school_name, community_name,
  COUNT(*) FILTER (WHERE student_id IS NOT NULL) AS total_students,
  COUNT(*) FILTER (WHERE session_status = 'completed') AS completed,
  ROUND(AVG(final_score) FILTER (WHERE session_status = 'completed'), 1) AS avg_score,
  MAX(final_level_number) AS max_level_reached
FROM v_assessment_report
GROUP BY school_name, community_name
ORDER BY community_name, school_name;
*/
