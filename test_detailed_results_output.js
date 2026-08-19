require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function test() {
  const { data: schools } = await supabase.from('schools').select('id').ilike('name', 'SD Alhilaal Jamilu').single();
  const { data: sessions } = await supabase.from('assessment_sessions').select('*').eq('school_id', schools.id).limit(1);
  const rows = sessions.map(s => ({ session_id: s.id, student_id: s.student_id }));
  const sessionIds = [rows[0].session_id];
  
  const { data: answers } = await supabase.from('student_answers').select('id, session_id, question_id, is_correct, answer_data, questions(id, level_id)').in('session_id', sessionIds);
  
  let activeLevelIds = new Set();
  const { data: qlData } = await supabase.from("assessment_sessions").select("current_level_id").in("id", sessionIds).not("current_level_id", "is", null);
  qlData?.forEach((q) => activeLevelIds.add(q.current_level_id));
  
  const { data: levelsData } = await supabase.from("question_levels").select("id, level_number").in("id", [...activeLevelIds]);
  const levelMap = new Map();
  (levelsData || []).forEach(l => levelMap.set(l.id, l.level_number));
  
  const { data: qData } = await supabase.from("questions").select("id, level_id, question_code").in("level_id", [...levelMap.keys()]);
  const allQuestions = (qData ?? []);
  
  const questionHeaders = [];
  allQuestions.forEach(q => questionHeaders.push(q.question_code || `Soal-${q.id}`));
  
  const answerMatrixMap = new Map();
  answers.forEach((ans) => {
    if (!answerMatrixMap.has(ans.session_id)) answerMatrixMap.set(ans.session_id, new Map());
    const val = ans.is_correct === true ? 1 : 0;
    answerMatrixMap.get(ans.session_id).set(ans.question_id, val);
  });
  
  const sessMatrix = answerMatrixMap.get(rows[0].session_id);
  const baseRow = {};
  allQuestions.forEach((q, idx) => {
    const headerName = questionHeaders[idx];
    baseRow[headerName] = sessMatrix && sessMatrix.has(q.id) ? sessMatrix.get(q.id) : "-";
  });
  
  console.log("Answers:", answers.map(a => a.question_id));
  console.log("Questions in headers:", allQuestions.map(q => q.id));
  console.log("Row output:", baseRow);
}
test();
