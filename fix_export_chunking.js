const fs = require('fs');
const file = 'apps/web/src/app/api/export/detailed-results/route.ts';
let code = fs.readFileSync(file, 'utf8');

const targetQuery = `    // 2. Ambil data Jawaban (student_answers)
    let answers: any[] = [];
    let answerQuery = supabase
      .from("student_answers")
      .select(\`
        id, session_id, question_id,
        is_correct, score, answer_data, time_spent_sec, answered_at,
        recording_url,
        questions (
          id, question_code, question_text, question_type, subject_area, level_id,
          order_index,
          question_levels ( level_number )
        )
      \`)
      .in("session_id", sessionIds);

    if (vAssessmentReportIsUsed && levelParam && levelParam !== "all") {
      const targetLevelNum = parseInt(levelParam, 10);
      if (!isNaN(targetLevelNum)) {
        answerQuery = answerQuery.eq("questions.question_levels.level_number", targetLevelNum);
      }
    }

    // Gunakan POST untuk fetch jika filter IDs panjang, tapi Supabase JS
    // secara default mengubah list besar jadi \`in\` clause di URL.
    // Jika terlalu panjang, query bisa error. Disarankan slice atau limit 
    // jika di production error 414 URI Too Long.
    // (Aman untuk saat ini dengan jumlah ribuan, tapi perlu dipantau)
    const { data: answersData, error: ansErr } = await answerQuery;
    if (ansErr) {
      console.error("Error fetching student_answers:", ansErr);
    }
    answers = (answersData ?? []);`;

const replacementQuery = `    // 2. Ambil data Jawaban (student_answers) dengan chunking (Mencegah 414 URI Too Long)
    let answers: any[] = [];
    const chunkSize = 100;
    
    for (let i = 0; i < sessionIds.length; i += chunkSize) {
      const chunkIds = sessionIds.slice(i, i + chunkSize);
      let answerQuery = supabase
        .from("student_answers")
        .select(\`
          id, session_id, question_id,
          is_correct, score, answer_data, time_spent_sec, answered_at,
          recording_url,
          questions (
            id, question_code, question_text, question_type, subject_area, level_id,
            order_index,
            question_levels ( level_number )
          )
        \`)
        .in("session_id", chunkIds);

      if (vAssessmentReportIsUsed && levelParam && levelParam !== "all") {
        const targetLevelNum = parseInt(levelParam, 10);
        if (!isNaN(targetLevelNum)) {
          answerQuery = answerQuery.eq("questions.question_levels.level_number", targetLevelNum);
        }
      }

      const { data: chunkAnswers, error: ansErr } = await answerQuery;
      if (ansErr) {
        console.error("Error fetching student_answers chunk:", ansErr);
      } else if (chunkAnswers) {
        answers.push(...chunkAnswers);
      }
    }`;

if (code.includes(targetQuery)) {
  code = code.replace(targetQuery, replacementQuery);
  fs.writeFileSync(file, code);
  console.log("Fixed export answer chunking!");
} else {
  console.log("Could not find target chunking query.");
}
