import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Let's get the school 'SD 1 PAGERUYUNG' which the user is looking at.
  const { data: schools } = await supabase.from('schools').select('id').eq('name', 'SD 1 PAGERUYUNG');
  if (!schools || schools.length === 0) return console.log("School not found");
  const schoolId = schools[0].id;
  
  // Get the 2 classes (1 and 2) for this school
  const { data: classes } = await supabase.from('classes').select('id, name').eq('school_id', schoolId).in('name', ['1', '2']);
  const classIds = classes.map(c => c.id);
  
  // Get students
  const { data: students } = await supabase.from('students').select('id').in('class_id', classIds);
  const studentIds = students.map(s => s.id);
  
  // Get sessions
  const { data: sessions } = await supabase
    .from('v_assessment_report')
    .select('subject_area, final_score, session_id')
    .in('student_id', studentIds)
    .eq('session_status', 'completed');
    
  if (sessions) {
    const lit = sessions.filter(s => s.subject_area === 'literasi');
    const num = sessions.filter(s => s.subject_area === 'numerasi');
    console.log(`Total sessions for these students: ${sessions.length}`);
    console.log(`Literasi: ${lit.length}, Scores:`, lit.map(l => l.final_score));
    console.log(`Numerasi: ${num.length}`);
  }
}
run();
