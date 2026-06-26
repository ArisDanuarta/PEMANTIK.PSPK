  -- Migration: ADD_QUESTION_LEVELS

  CREATE TABLE question_categories (
    id              UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    subject_area    subject_area NOT NULL,
    name            TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE question_levels (
    id                UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    category_id       UUID REFERENCES question_categories(id) ON DELETE CASCADE,
    level_number      INTEGER NOT NULL,
    time_limit_sec    INTEGER DEFAULT 60,
    passing_threshold INTEGER DEFAULT 0, -- number of correct answers to pass
    access_code       TEXT, -- optional code to start
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(category_id, level_number)
  );

  -- Delete constraints/indices relying on difficulty/grade_target
  DROP INDEX IF EXISTS idx_questions_difficulty;

  -- Modify questions table
  ALTER TABLE questions
    DROP COLUMN IF EXISTS difficulty,
    DROP COLUMN IF EXISTS grade_target,
    DROP COLUMN IF EXISTS time_limit_sec,
    ADD COLUMN level_id UUID REFERENCES question_levels(id) ON DELETE SET NULL;

  CREATE INDEX idx_questions_level ON questions(level_id);

  -- RLS Policies
  ALTER TABLE question_categories ENABLE ROW LEVEL SECURITY;
  ALTER TABLE question_levels ENABLE ROW LEVEL SECURITY;

  -- Question Categories Policies
  CREATE POLICY "admin_manage_categories" ON question_categories
    FOR ALL USING (public.jwt_user_role() IN ('super_admin', 'question_admin'));

  CREATE POLICY "others_view_categories" ON question_categories
    FOR SELECT USING (public.jwt_user_role() IN ('community', 'school', 'teacher'));

  -- Question Levels Policies
  CREATE POLICY "admin_manage_levels" ON question_levels
    FOR ALL USING (public.jwt_user_role() IN ('super_admin', 'question_admin'));

  CREATE POLICY "others_view_levels" ON question_levels
    FOR SELECT USING (public.jwt_user_role() IN ('community', 'school', 'teacher'));
