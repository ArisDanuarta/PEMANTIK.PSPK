-- Migration for Phase 2: Polymorphic assessment_access & assessment_sessions tracking

-- 1. Modify assessment_access to be polymorphic
ALTER TABLE assessment_access ADD COLUMN target_type TEXT;
ALTER TABLE assessment_access ADD COLUMN target_id UUID;
ALTER TABLE assessment_access ADD COLUMN phase TEXT DEFAULT 'Tahap 1';

-- Update existing data
UPDATE assessment_access SET target_type = 'school', target_id = school_id;

-- Make columns NOT NULL and add CHECK constraint
ALTER TABLE assessment_access ALTER COLUMN target_type SET NOT NULL;
ALTER TABLE assessment_access ALTER COLUMN target_id SET NOT NULL;
ALTER TABLE assessment_access ADD CONSTRAINT chk_target_type CHECK (target_type IN ('community', 'school', 'class', 'student'));

-- Drop old policies before modifying columns that they depend on
DROP POLICY IF EXISTS "admin_community_manage_access" ON assessment_access;
DROP POLICY IF EXISTS "school_teacher_view_access" ON assessment_access;

-- Drop old unique constraint and foreign keys
ALTER TABLE assessment_access DROP CONSTRAINT IF EXISTS assessment_access_package_id_school_id_key;
ALTER TABLE assessment_access DROP CONSTRAINT IF EXISTS assessment_access_school_id_fkey;

-- Drop the old column
ALTER TABLE assessment_access DROP COLUMN school_id;

-- Add new unique constraint
ALTER TABLE assessment_access ADD CONSTRAINT assessment_access_target_key UNIQUE(package_id, target_id, phase);

-- Recreate policies with polymorphic logic
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

-- 2. Modify assessment_sessions
ALTER TABLE assessment_sessions ADD COLUMN phase TEXT DEFAULT 'Tahap 1';
ALTER TABLE assessment_sessions ADD COLUMN attempt_number INTEGER NOT NULL DEFAULT 1;
ALTER TABLE assessment_sessions ADD COLUMN is_void BOOLEAN NOT NULL DEFAULT false;

-- Add index on new columns for better query performance
CREATE INDEX IF NOT EXISTS idx_access_target ON assessment_access(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_sessions_phase ON assessment_sessions(phase);
