import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function test() {
  const { data, error } = await supabase
    .from("students")
    .select(`
      id, full_name,
      assessment_sessions(
        id, status, score, last_level_completed, phase,
        question_categories(name, subject_area)
      )
    `)
    .limit(1);
    
  console.log("Error:", error?.message);
  console.log("Data:", data);
}
test();
