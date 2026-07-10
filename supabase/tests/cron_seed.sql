-- Setup test data for cron-auto-transition
BEGIN;

DO $$
DECLARE
  v_community_id uuid := gen_random_uuid();
  v_school_id uuid := gen_random_uuid();
  v_category_id uuid := gen_random_uuid();
BEGIN
  -- Insert test community
  INSERT INTO communities (id, name, code) VALUES (v_community_id, 'Cron Test Comm', 'CRON-TEST');
  
  -- Insert test school
  INSERT INTO schools (id, community_id, name, is_active) VALUES (v_school_id, v_community_id, 'Cron Test School', true);
  
  -- Insert test category
  INSERT INTO question_categories (id, name, subject_area) VALUES (v_category_id, 'Cron Test Cat', 'literasi');
  
  -- Create EXPIRED access
  INSERT INTO assessment_access (category_id, target_type, target_id, phase, valid_from, valid_until, is_active)
  VALUES (v_category_id, 'school', v_school_id, 'Tahap 1', now() - interval '2 days', now() - interval '1 day', true);

  -- Create stage in proses_asesmen
  INSERT INTO school_assessment_stages (school_id, community_id, phase, current_stage)
  VALUES (v_school_id, v_community_id, 'Tahap 1', 'proses_asesmen');

END $$;

COMMIT;
