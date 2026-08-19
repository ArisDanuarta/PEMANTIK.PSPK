require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function check() {
  const { data: answers } = await supabase.from('student_answers').select('is_correct, score, answer_data').limit(5);
  console.log(answers);
}
check();
