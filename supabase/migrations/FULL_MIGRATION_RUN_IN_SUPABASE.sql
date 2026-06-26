-- ══════════════════════════════════════════════════════════════════════════════
-- PEMANTIK — Database Schema v1.0
-- Blueprint: Sistem Pemantik Literasi & Numerasi PSPK
-- PostgreSQL 14 + Supabase RLS
-- ══════════════════════════════════════════════════════════════════════════════

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM (
  'super_admin',
  'question_admin',
  'community',
  'school',
  'teacher'
);

CREATE TYPE question_type AS ENUM (
  'multiple_choice',       -- Pilihan ganda
  'drag_drop',             -- Seret & lepas
  'image_choice',          -- Pilihan gambar
  'audio_question',        -- Soal audio (siswa mendengar)
  'video_question',        -- Soal video (siswa menonton)
  'voice_recording'        -- Rekaman suara siswa
);

CREATE TYPE difficulty_level AS ENUM ('mudah', 'sedang', 'sulit');

CREATE TYPE subject_area AS ENUM ('literasi', 'numerasi');

CREATE TYPE gender AS ENUM ('L', 'P');

CREATE TYPE ses_class AS ENUM ('atas', 'menengah', 'bawah');

CREATE TYPE session_status AS ENUM (
  'pending',      -- Belum dimulai
  'active',       -- Sedang berlangsung
  'completed',    -- Selesai
  'expired'       -- Kedaluwarsa
);

CREATE TYPE answer_status AS ENUM (
  'answered',
  'skipped',
  'flagged'
);

CREATE TYPE sync_status AS ENUM (
  'synced',       -- Sudah tersinkron ke server
  'pending',      -- Menunggu sinkronisasi
  'failed'        -- Gagal sync, perlu retry
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABEL 1: communities (Komunitas — Level 2)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE communities (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  code          TEXT UNIQUE NOT NULL,               -- Kode komunitas unik (misal: "KOM-JKT-01")
  address       TEXT,
  contact_name  TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE communities IS 'Komunitas/lembaga yang mengelola sekolah-sekolah dalam ekosistem Pemantik';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABEL 2: schools (Sekolah — Level 3)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE schools (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id    UUID NOT NULL REFERENCES communities(id) ON DELETE RESTRICT,
  name            TEXT NOT NULL,
  npsn            TEXT UNIQUE,                       -- Nomor Pokok Sekolah Nasional
  address         TEXT,
  province        TEXT,
  city            TEXT,
  principal_name  TEXT,
  contact_phone   TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_schools_community ON schools(community_id);
COMMENT ON TABLE schools IS 'Sekolah di bawah komunitas tertentu';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABEL 3: users (Semua user portal web — Level 1-5)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT UNIQUE NOT NULL,
  full_name     TEXT NOT NULL,
  role          user_role NOT NULL,
  -- entity_id menunjuk ke komunitas / sekolah tergantung role
  community_id  UUID REFERENCES communities(id) ON DELETE SET NULL,
  school_id     UUID REFERENCES schools(id) ON DELETE SET NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints: community & school assignment per role
  CONSTRAINT chk_super_admin_no_entity
    CHECK (role != 'super_admin' OR (community_id IS NULL AND school_id IS NULL)),
  CONSTRAINT chk_question_admin_no_entity
    CHECK (role != 'question_admin' OR (community_id IS NULL AND school_id IS NULL)),
  CONSTRAINT chk_community_has_community
    CHECK (role != 'community' OR community_id IS NOT NULL),
  CONSTRAINT chk_school_has_school
    CHECK (role NOT IN ('school', 'teacher') OR school_id IS NOT NULL)
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_community ON users(community_id);
CREATE INDEX idx_users_school ON users(school_id);
COMMENT ON TABLE users IS 'Pengguna portal web Pemantik (admin, guru, dll). Siswa disimpan di tabel students.';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABEL 4: classes (Kelas)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE classes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,                         -- Misal: "Kelas 5A"
  grade       INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 9),
  academic_year TEXT NOT NULL,                       -- Misal: "2024/2025"
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_classes_school ON classes(school_id);
CREATE INDEX idx_classes_teacher ON classes(teacher_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABEL 5: students (Siswa — Level 6, login via mobile app)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE students (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
  class_id      UUID REFERENCES classes(id) ON DELETE SET NULL,
  nis           TEXT,                                -- Nomor Induk Siswa
  full_name     TEXT NOT NULL,
  gender        gender NOT NULL,
  birth_date    DATE,
  ses_class     ses_class,                           -- Kelas sosial ekonomi
  -- Login credentials (NO email — ramah anak)
  pin_hash      TEXT NOT NULL,                       -- bcrypt hash dari 6-digit PIN
  username      TEXT UNIQUE NOT NULL,                -- username sederhana untuk anak
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_students_school ON students(school_id);
CREATE INDEX idx_students_class ON students(class_id);
COMMENT ON TABLE students IS 'Siswa yang mengakses via mobile app dengan username + PIN (tanpa email)';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABEL 6: questions (Bank Soal)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE questions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  subject_area    subject_area NOT NULL,
  question_type   question_type NOT NULL,
  difficulty      difficulty_level NOT NULL,
  grade_target    INTEGER CHECK (grade_target BETWEEN 1 AND 9),
  -- Konten soal (fleksibel per tipe)
  question_text   TEXT,
  question_audio_url TEXT,                           -- Untuk tipe audio_question
  question_video_url TEXT,                           -- Untuk tipe video_question
  question_image_url TEXT,                           -- Untuk tipe image_choice
  -- Jawaban (JSONB untuk fleksibilitas per tipe soal)
  options         JSONB,                             -- Array opsi jawaban
  correct_answer  JSONB NOT NULL,                    -- Kunci jawaban
  explanation     TEXT,                              -- Penjelasan jawaban
  time_limit_sec  INTEGER DEFAULT 60,               -- Batas waktu dalam detik
  tags            TEXT[],                            -- Tag untuk pencarian
  is_published    BOOLEAN NOT NULL DEFAULT false,
  version         INTEGER NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_questions_subject ON questions(subject_area);
CREATE INDEX idx_questions_type ON questions(question_type);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);
CREATE INDEX idx_questions_published ON questions(is_published);
COMMENT ON TABLE questions IS 'Bank soal dengan 6 tipe: pilihan ganda, drag-drop, gambar, audio, video, voice recording';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABEL 7: assessment_packages (Paket Ujian)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE assessment_packages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  subject_area    subject_area NOT NULL,
  grade_target    INTEGER CHECK (grade_target BETWEEN 1 AND 9),
  total_questions INTEGER NOT NULL DEFAULT 0,
  time_limit_min  INTEGER NOT NULL DEFAULT 60,       -- Durasi ujian dalam menit
  is_published    BOOLEAN NOT NULL DEFAULT false,
  valid_from      TIMESTAMPTZ,
  valid_until     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Junction: soal dalam paket
CREATE TABLE assessment_package_questions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_id      UUID NOT NULL REFERENCES assessment_packages(id) ON DELETE CASCADE,
  question_id     UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  order_index     INTEGER NOT NULL,                  -- Urutan soal dalam paket
  UNIQUE(package_id, question_id),
  UNIQUE(package_id, order_index)
);

CREATE INDEX idx_pkg_questions_package ON assessment_package_questions(package_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABEL 8: assessment_access (Hak Akses Ujian per Sekolah)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE assessment_access (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_id      UUID NOT NULL REFERENCES assessment_packages(id) ON DELETE CASCADE,
  target_type     TEXT NOT NULL CHECK (target_type IN ('community', 'school', 'class', 'student')),
  target_id       UUID NOT NULL,
  granted_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  valid_from      TIMESTAMPTZ NOT NULL,
  valid_until     TIMESTAMPTZ NOT NULL,
  max_attempts    INTEGER NOT NULL DEFAULT 1,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  phase           TEXT DEFAULT 'Tahap 1',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(package_id, target_id, phase)
);

CREATE INDEX idx_access_package ON assessment_access(package_id);
CREATE INDEX idx_access_target ON assessment_access(target_type, target_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABEL 9: assessment_sessions (Sesi Ujian Siswa)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE assessment_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  package_id      UUID NOT NULL REFERENCES assessment_packages(id) ON DELETE RESTRICT,
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
  status          session_status NOT NULL DEFAULT 'pending',
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  score           NUMERIC(5,2),                      -- Skor 0–100
  time_spent_sec  INTEGER,                           -- Total waktu pengerjaan
  device_info     JSONB,                             -- Info perangkat siswa
  sync_status     sync_status NOT NULL DEFAULT 'pending',
  synced_at       TIMESTAMPTZ,
  phase           TEXT DEFAULT 'Tahap 1',
  attempt_number  INTEGER NOT NULL DEFAULT 1,
  is_void         BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_student ON assessment_sessions(student_id);
CREATE INDEX idx_sessions_package ON assessment_sessions(package_id);
CREATE INDEX idx_sessions_school ON assessment_sessions(school_id);
CREATE INDEX idx_sessions_status ON assessment_sessions(status);
CREATE INDEX idx_sessions_sync ON assessment_sessions(sync_status);
CREATE INDEX idx_sessions_phase ON assessment_sessions(phase);
COMMENT ON TABLE assessment_sessions IS 'Sesi ujian siswa, mendukung offline-first (sync_status)';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABEL 10: student_answers (Jawaban Siswa)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE student_answers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      UUID NOT NULL REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  question_id     UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  answer_data     JSONB NOT NULL,                    -- Jawaban (fleksibel per tipe soal)
  recording_url   TEXT,                              -- URL audio rekaman (voice_recording)
  is_correct      BOOLEAN,                           -- NULL jika belum dinilai (voice)
  score           NUMERIC(5,2),                      -- Skor per soal
  time_spent_sec  INTEGER,                           -- Waktu pengerjaan soal ini
  status          answer_status NOT NULL DEFAULT 'answered',
  answered_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sync_status     sync_status NOT NULL DEFAULT 'pending',
  UNIQUE(session_id, question_id)
);

CREATE INDEX idx_answers_session ON student_answers(session_id);
CREATE INDEX idx_answers_question ON student_answers(question_id);
CREATE INDEX idx_answers_sync ON student_answers(sync_status);
COMMENT ON TABLE student_answers IS 'Jawaban siswa per soal, termasuk URL rekaman untuk soal voice recording';

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGERS: auto-update updated_at
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Terapkan trigger ke semua tabel yang punya updated_at
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'communities', 'schools', 'users', 'classes',
    'students', 'questions', 'assessment_packages'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at
       BEFORE UPDATE ON %s
       FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      tbl, tbl
    );
  END LOOP;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGERS: hitung ulang total_questions di assessment_packages
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION sync_package_question_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE assessment_packages
  SET total_questions = (
    SELECT COUNT(*) FROM assessment_package_questions
    WHERE package_id = COALESCE(NEW.package_id, OLD.package_id)
  )
  WHERE id = COALESCE(NEW.package_id, OLD.package_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pkg_q_count_insert
  AFTER INSERT ON assessment_package_questions
  FOR EACH ROW EXECUTE FUNCTION sync_package_question_count();

CREATE TRIGGER trg_pkg_q_count_delete
  AFTER DELETE ON assessment_package_questions
  FOR EACH ROW EXECUTE FUNCTION sync_package_question_count();


-- ══════════════════════════════════════════════════════════════════════════════
-- PEMANTIK — Row Level Security (RLS) Policies v1.1
-- FIX: Helper functions dipindah dari auth.* → public.*
--      (auth schema locked di Supabase SQL Editor)
-- ══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper functions di public schema (bukan auth schema)
-- Menggunakan auth.jwt() dan auth.uid() yang tersedia secara built-in
-- ─────────────────────────────────────────────────────────────────────────────

-- Ambil role dari JWT custom claims
CREATE OR REPLACE FUNCTION public.jwt_user_role()
RETURNS user_role AS $$
  SELECT (auth.jwt() ->> 'user_role')::user_role;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Ambil community_id dari JWT custom claims
CREATE OR REPLACE FUNCTION public.jwt_community_id()
RETURNS UUID AS $$
  SELECT (auth.jwt() ->> 'community_id')::UUID;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Ambil school_id dari JWT custom claims
CREATE OR REPLACE FUNCTION public.jwt_school_id()
RETURNS UUID AS $$
  SELECT (auth.jwt() ->> 'school_id')::UUID;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Grant execute ke authenticated users
GRANT EXECUTE ON FUNCTION public.jwt_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.jwt_community_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.jwt_school_id() TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Enable RLS di semua tabel
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE communities                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE students                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_packages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_package_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_access            ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_sessions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_answers              ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- COMMUNITIES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "super_admin_all_communities" ON communities
  FOR ALL USING (public.jwt_user_role() = 'super_admin');

CREATE POLICY "community_view_own" ON communities
  FOR SELECT USING (
    public.jwt_user_role() = 'community'
    AND id = public.jwt_community_id()
  );

CREATE POLICY "school_teacher_view_community" ON communities
  FOR SELECT USING (
    public.jwt_user_role() IN ('school', 'teacher')
    AND id = (SELECT community_id FROM schools WHERE id = public.jwt_school_id())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- SCHOOLS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "super_admin_all_schools" ON schools
  FOR ALL USING (public.jwt_user_role() = 'super_admin');

CREATE POLICY "community_manage_schools" ON schools
  FOR ALL USING (
    public.jwt_user_role() = 'community'
    AND community_id = public.jwt_community_id()
  );

CREATE POLICY "school_teacher_view_own_school" ON schools
  FOR SELECT USING (
    public.jwt_user_role() IN ('school', 'teacher')
    AND id = public.jwt_school_id()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "super_admin_all_users" ON users
  FOR ALL USING (public.jwt_user_role() = 'super_admin');

CREATE POLICY "community_manage_community_users" ON users
  FOR ALL USING (
    public.jwt_user_role() = 'community'
    AND community_id = public.jwt_community_id()
  );

CREATE POLICY "school_manage_school_users" ON users
  FOR ALL USING (
    public.jwt_user_role() = 'school'
    AND school_id = public.jwt_school_id()
  );

CREATE POLICY "user_view_own_profile" ON users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "user_update_own_profile" ON users
  FOR UPDATE USING (id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- CLASSES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "super_admin_all_classes" ON classes
  FOR ALL USING (public.jwt_user_role() = 'super_admin');

CREATE POLICY "school_manage_classes" ON classes
  FOR ALL USING (
    public.jwt_user_role() = 'school'
    AND school_id = public.jwt_school_id()
  );

CREATE POLICY "teacher_view_own_classes" ON classes
  FOR SELECT USING (
    public.jwt_user_role() = 'teacher'
    AND (school_id = public.jwt_school_id() OR teacher_id = auth.uid())
  );

CREATE POLICY "community_view_classes" ON classes
  FOR SELECT USING (
    public.jwt_user_role() = 'community'
    AND school_id IN (
      SELECT id FROM schools WHERE community_id = public.jwt_community_id()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- STUDENTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "super_admin_all_students" ON students
  FOR ALL USING (public.jwt_user_role() = 'super_admin');

CREATE POLICY "school_manage_students" ON students
  FOR ALL USING (
    public.jwt_user_role() = 'school'
    AND school_id = public.jwt_school_id()
  );

CREATE POLICY "teacher_view_school_students" ON students
  FOR SELECT USING (
    public.jwt_user_role() = 'teacher'
    AND school_id = public.jwt_school_id()
  );

CREATE POLICY "community_view_students" ON students
  FOR SELECT USING (
    public.jwt_user_role() = 'community'
    AND school_id IN (
      SELECT id FROM schools WHERE community_id = public.jwt_community_id()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- QUESTIONS (Bank Soal)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "admin_manage_questions" ON questions
  FOR ALL USING (
    public.jwt_user_role() IN ('super_admin', 'question_admin')
  );

CREATE POLICY "others_view_published_questions" ON questions
  FOR SELECT USING (
    public.jwt_user_role() IN ('community', 'school', 'teacher')
    AND is_published = true
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- ASSESSMENT PACKAGES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "admin_manage_packages" ON assessment_packages
  FOR ALL USING (
    public.jwt_user_role() IN ('super_admin', 'question_admin')
  );

CREATE POLICY "others_view_published_packages" ON assessment_packages
  FOR SELECT USING (
    public.jwt_user_role() IN ('community', 'school', 'teacher')
    AND is_published = true
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- ASSESSMENT PACKAGE QUESTIONS (junction)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "admin_manage_pkg_questions" ON assessment_package_questions
  FOR ALL USING (
    public.jwt_user_role() IN ('super_admin', 'question_admin')
  );

CREATE POLICY "others_view_pkg_questions" ON assessment_package_questions
  FOR SELECT USING (
    public.jwt_user_role() IN ('community', 'school', 'teacher')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- ASSESSMENT ACCESS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "admin_community_manage_access" ON assessment_access
  FOR ALL USING (
    public.jwt_user_role() = 'super_admin'
    OR (
      public.jwt_user_role() = 'community'
      AND (
        (target_type = 'community' AND target_id = public.jwt_community_id())
        OR 
        (target_type = 'school' AND target_id IN (SELECT id FROM schools WHERE community_id = public.jwt_community_id()))
      )
    )
  );

CREATE POLICY "school_teacher_view_access" ON assessment_access
  FOR SELECT USING (
    public.jwt_user_role() IN ('school', 'teacher')
    AND (
      (target_type = 'school' AND target_id = public.jwt_school_id())
      OR
      (target_type = 'class' AND target_id IN (SELECT id FROM classes WHERE school_id = public.jwt_school_id()))
    )
    AND is_active = true
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- ASSESSMENT SESSIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "super_admin_all_sessions" ON assessment_sessions
  FOR ALL USING (public.jwt_user_role() = 'super_admin');

CREATE POLICY "community_view_sessions" ON assessment_sessions
  FOR SELECT USING (
    public.jwt_user_role() = 'community'
    AND school_id IN (
      SELECT id FROM schools WHERE community_id = public.jwt_community_id()
    )
  );

CREATE POLICY "school_view_sessions" ON assessment_sessions
  FOR SELECT USING (
    public.jwt_user_role() = 'school'
    AND school_id = public.jwt_school_id()
  );

CREATE POLICY "teacher_view_school_sessions" ON assessment_sessions
  FOR SELECT USING (
    public.jwt_user_role() = 'teacher'
    AND school_id = public.jwt_school_id()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- STUDENT ANSWERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "super_admin_all_answers" ON student_answers
  FOR ALL USING (public.jwt_user_role() = 'super_admin');

CREATE POLICY "teacher_view_answers" ON student_answers
  FOR SELECT USING (
    public.jwt_user_role() = 'teacher'
    AND session_id IN (
      SELECT id FROM assessment_sessions
      WHERE school_id = public.jwt_school_id()
    )
  );

CREATE POLICY "school_view_answers" ON student_answers
  FOR SELECT USING (
    public.jwt_user_role() = 'school'
    AND session_id IN (
      SELECT id FROM assessment_sessions
      WHERE school_id = public.jwt_school_id()
    )
  );

CREATE POLICY "community_view_answers" ON student_answers
  FOR SELECT USING (
    public.jwt_user_role() = 'community'
    AND session_id IN (
      SELECT s.id FROM assessment_sessions s
      JOIN schools sc ON sc.id = s.school_id
      WHERE sc.community_id = public.jwt_community_id()
    )
  );
