import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const sql = `
CREATE OR REPLACE FUNCTION get_community_item_analysis(p_community_id UUID, p_phase TEXT)
RETURNS TABLE (
  question_code TEXT,
  subject_area TEXT,
  total_answers BIGINT,
  correct_answers BIGINT,
  success_rate FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    q.question_code,
    q.subject_area,
    COUNT(a.id) AS total_answers,
    SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END) AS correct_answers,
    (SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END)::FLOAT / COUNT(a.id)::FLOAT) * 100.0 AS success_rate
  FROM assessment_answers a
  JOIN assessment_sessions s ON a.session_id = s.id
  JOIN questions q ON a.question_id = q.id
  JOIN schools sc ON s.school_id = sc.id
  WHERE sc.community_id = p_community_id
    AND s.phase = p_phase
    AND s.is_void = false
    AND s.status = 'completed'
  GROUP BY q.question_code, q.subject_area;
END;
$$;
`;

// wait, how to execute raw SQL in Supabase JS SDK?
// Supabase JS doesn't support executing raw SQL directly.
// But we can use REST API endpoint /rest/v1/rpc if we created a generic exec_sql function previously, OR we can connect to pg via node-postgres.
