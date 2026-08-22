import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function checkDatabaseCounts() {
  console.log("Memeriksa jumlah data di database...");

  // Count Students
  const { count: studentCount, error: err1 } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true });
    
  if (err1) console.error("Error fetching students count:", err1.message);

  // Count Assessment Sessions
  const { count: sessionCount, error: err2 } = await supabase
    .from('assessment_sessions')
    .select('*', { count: 'exact', head: true });
    
  if (err2) console.error("Error fetching sessions count:", err2.message);

  // Count Student Answers
  const { count: answerCount, error: err3 } = await supabase
    .from('student_answers')
    .select('*', { count: 'exact', head: true });
    
  if (err3) console.error("Error fetching answers count:", err3.message);

  console.log("-----------------------------------------");
  console.log(`Total Siswa di Database: ${studentCount}`);
  console.log(`Total Sesi Asesmen di Database: ${sessionCount}`);
  console.log(`Total Jawaban Asesmen di Database: ${answerCount}`);
  console.log("-----------------------------------------");
  console.log(`Target dari Excel:`);
  console.log(` - Siswa: 10940`);
  console.log(` - Sesi Asesmen: 21580`);
  console.log(` - Jawaban: 121453 (kurang lebih)`);
}

checkDatabaseCounts();
