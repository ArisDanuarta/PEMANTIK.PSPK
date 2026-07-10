-- Test script for RLS Policies
BEGIN;

CREATE TEMP TABLE IF NOT EXISTS test_logs (
  id serial primary key,
  log_message text
);
GRANT ALL ON test_logs TO authenticated;
GRANT ALL ON SEQUENCE test_logs_id_seq TO authenticated;
GRANT ALL ON test_logs TO anon;




-- 1. Setup Test Data
DO $$
DECLARE
  v_community_id uuid := gen_random_uuid();
  v_school_id uuid := gen_random_uuid();
  v_class_id uuid := gen_random_uuid();
  v_student1_id uuid := gen_random_uuid();
  v_student2_id uuid := gen_random_uuid();
  v_category_id uuid := gen_random_uuid();
  v_access_id uuid;
BEGIN
  -- Insert test community
  INSERT INTO communities (id, name, code) VALUES (v_community_id, 'Test Comm', 'TEST-COMM-1');
  
  -- Insert test school
  INSERT INTO schools (id, community_id, name, is_active) VALUES (v_school_id, v_community_id, 'Test School', true);
  
  -- Insert test class
  INSERT INTO classes (id, school_id, name, grade, academic_year) VALUES (v_class_id, v_school_id, 'Test Class', 1, '2026');
  
  -- Insert test students
  INSERT INTO students (id, school_id, class_id, full_name, gender, pin_hash, username) 
  VALUES (v_student1_id, v_school_id, v_class_id, 'Student 1', 'L', 'hash', 's1');
  
  INSERT INTO students (id, school_id, class_id, full_name, gender, pin_hash, username) 
  VALUES (v_student2_id, v_school_id, v_class_id, 'Student 2', 'P', 'hash', 's2');
  
  -- Insert test category
  INSERT INTO question_categories (id, name, subject_area) VALUES (v_category_id, 'Test Cat', 'literasi');
  
  -- Create active access for the school
  INSERT INTO assessment_access (category_id, target_type, target_id, phase, valid_from, valid_until, is_active)
  VALUES (v_category_id, 'school', v_school_id, 'Tahap 1', now() - interval '1 day', now() + interval '1 day', true)
  RETURNING id INTO v_access_id;

  -- Test 1: S1 inserts own session (SHOULD SUCCEED)
  INSERT INTO test_logs (log_message) VALUES ('--- Test 1: S1 inserts own session (Active Access) ---');
  
  -- Debug the EXISTS clause directly (under authenticated role but before exception block)
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', format('{"role":"student","student_id":"%s","school_id":"%s"}', v_student1_id, v_school_id), true);

  
  IF EXISTS (
    SELECT 1 FROM assessment_access acc
    WHERE acc.category_id = v_category_id
      AND acc.phase = 'Tahap 1'
      AND acc.is_active = true
      AND now() >= acc.valid_from 
      AND now() <= acc.valid_until
      AND (
        (acc.target_type = 'student' AND acc.target_id = public.jwt_student_id())
        OR
        (acc.target_type = 'class' AND acc.target_id = (
           SELECT class_id FROM students WHERE id = public.jwt_student_id()
        ))
        OR
        (acc.target_type = 'school' AND acc.target_id = (
           SELECT school_id FROM students WHERE id = public.jwt_student_id()
        ))
        OR
        (acc.target_type = 'community' AND acc.target_id = (
           SELECT community_id FROM schools 
           WHERE id = (SELECT school_id FROM students WHERE id = public.jwt_student_id())
        ))
      )
  ) THEN
    INSERT INTO test_logs (log_message) VALUES ('DEBUG: EXISTS is TRUE');
  ELSE
    INSERT INTO test_logs (log_message) VALUES ('DEBUG: EXISTS is FALSE!');
    
    -- Let's find why it's false
    IF NOT EXISTS (SELECT 1 FROM assessment_access WHERE category_id = v_category_id) THEN
      INSERT INTO test_logs (log_message) VALUES ('DEBUG: no access for category');
    ELSIF NOT EXISTS (SELECT 1 FROM assessment_access WHERE target_type = 'school' AND target_id = v_school_id) THEN
      INSERT INTO test_logs (log_message) VALUES ('DEBUG: no access for school');
    ELSIF public.jwt_student_id() IS NULL THEN
      INSERT INTO test_logs (log_message) VALUES ('DEBUG: jwt_student_id is null');
    ELSIF (SELECT school_id FROM students WHERE id = public.jwt_student_id()) IS NULL THEN
      INSERT INTO test_logs (log_message) VALUES ('DEBUG: school_id for student is null');
    END IF;
  END IF;

  BEGIN
    INSERT INTO assessment_sessions (student_id, category_id, school_id, phase, status)
    VALUES (v_student1_id, v_category_id, v_school_id, 'Tahap 1', 'pending');
    
    INSERT INTO test_logs (log_message) VALUES ('Test 1 SUCCEEDED');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_logs (log_message) VALUES ('Test 1 FAILED: ' || SQLERRM);
  END;

  -- Test 2: S1 tries to insert session for S2 (SHOULD FAIL)
  INSERT INTO test_logs (log_message) VALUES ('--- Test 2: S1 inserts session for S2 (Isolation Check) ---');
  BEGIN
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claims', format('{"role":"student","student_id":"%s","school_id":"%s"}', v_student1_id, v_school_id), true);
    
    INSERT INTO assessment_sessions (student_id, category_id, school_id, phase, status)
    VALUES (v_student2_id, v_category_id, v_school_id, 'Tahap 1', 'pending');
    
    INSERT INTO test_logs (log_message) VALUES ('Test 2 SUCCEEDED (UNEXPECTED)');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_logs (log_message) VALUES ('Test 2 FAILED AS EXPECTED: ' || SQLERRM);
  END;

  -- Revoke access
  PERFORM set_config('role', 'postgres', true);
  UPDATE assessment_access SET is_active = false WHERE id = v_access_id;
  
  -- Test 3: S2 tries to insert session after access revoked (SHOULD FAIL)
  INSERT INTO test_logs (log_message) VALUES ('--- Test 3: S2 inserts session (Revoked Access) ---');
  BEGIN
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claims', format('{"role":"student","student_id":"%s","school_id":"%s"}', v_student2_id, v_school_id), true);
    
    INSERT INTO assessment_sessions (student_id, category_id, school_id, phase, status)
    VALUES (v_student2_id, v_category_id, v_school_id, 'Tahap 1', 'pending');
    
    INSERT INTO test_logs (log_message) VALUES ('Test 3 SUCCEEDED (UNEXPECTED)');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_logs (log_message) VALUES ('Test 3 FAILED AS EXPECTED: ' || SQLERRM);
  END;

  -- Create access for community (Target Type test)
  PERFORM set_config('role', 'postgres', true);
  INSERT INTO assessment_access (category_id, target_type, target_id, phase, valid_from, valid_until, is_active)
  VALUES (v_category_id, 'community', v_community_id, 'Tahap 1', now() - interval '1 day', now() + interval '1 day', true);

  -- Test 4: S2 inserts session with community access (SHOULD SUCCEED)
  INSERT INTO test_logs (log_message) VALUES ('--- Test 4: S2 inserts session (Community Access) ---');
  BEGIN
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claims', format('{"role":"student","student_id":"%s","school_id":"%s"}', v_student2_id, v_school_id), true);
    
    INSERT INTO assessment_sessions (student_id, category_id, school_id, phase, status)
    VALUES (v_student2_id, v_category_id, v_school_id, 'Tahap 1', 'pending');
    
    INSERT INTO test_logs (log_message) VALUES ('Test 4 SUCCEEDED');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_logs (log_message) VALUES ('Test 4 FAILED: ' || SQLERRM);
  END;
  
  -- Test 5: S1 updates own session after access is revoked (SHOULD SUCCEED)
  INSERT INTO test_logs (log_message) VALUES ('--- Test 5: S1 updates own session (Update while access revoked) ---');
  BEGIN
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claims', format('{"role":"student","student_id":"%s","school_id":"%s"}', v_student2_id, v_school_id), true);
    
    -- The first access is revoked, and community access is active. Let's revoke community too.
    PERFORM set_config('role', 'postgres', true);
    UPDATE assessment_access SET is_active = false WHERE target_type = 'community';
    
    PERFORM set_config('role', 'authenticated', true);
    UPDATE assessment_sessions SET status = 'completed' WHERE student_id = v_student1_id;
    
    INSERT INTO test_logs (log_message) VALUES ('Test 5 SUCCEEDED');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_logs (log_message) VALUES ('Test 5 FAILED: ' || SQLERRM);
  END;

END $$;

SELECT log_message FROM test_logs ORDER BY id;
ROLLBACK;
