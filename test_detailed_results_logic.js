require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function test() {
  const { data: schools } = await supabase.from('schools').select('id').ilike('name', 'SD Alhilaal Jamilu').single();
  const { data: sessions } = await supabase.from('assessment_sessions').select('id').eq('school_id', schools.id).limit(10);
  const sessionIds = sessions.map(s => s.id);
  const { data: answers } = await supabase.from('student_answers').select('id, session_id, question_id, is_correct, answer_data, questions(id, level_id)').in('session_id', sessionIds);
  
  const activeLevelIds = new Set();
  answers.forEach(ans => {
    const q = Array.isArray(ans.questions) ? ans.questions[0] : ans.questions;
    if (q?.level_id) activeLevelIds.add(q.level_id);
  });
  console.log("activeLevelIds size:", activeLevelIds.size);
  
  let levelsQuery = supabase.from("question_levels").select("id, level_number").in("id", [...activeLevelIds]);
  const { data: levelsData } = await levelsQuery;
  console.log("levelsData length:", levelsData?.length);
  
  const levelMap = new Map();
  (levelsData || []).forEach(l => levelMap.set(l.id, l.level_number));
  const levelIds = [...levelMap.keys()];
  console.log("levelIds length:", levelIds.length);
  
  const { data: qData } = await supabase.from("questions").select("id, level_id, question_code").in("level_id", levelIds);
  console.log("allQuestions length:", qData?.length);
}
test();
