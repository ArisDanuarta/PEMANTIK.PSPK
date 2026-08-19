const fs = require('fs');
const file = 'apps/web/src/app/api/report/community-sections/route.ts';

let code = fs.readFileSync(file, 'utf8');

const regex = /const \{ data: answers, error: answersErr \} = await supabase\s*\.from\("student_answers"\)\s*\.select\([\s\S]*?\.in\("session_id", sessionIds\);/;

if (regex.test(code)) {
  const replacement = `
    let answers: any[] = [];
    let answersErr = null;
    
    // Chunk requests to avoid URL too long (414) in PostgREST
    const CHUNK_SIZE = 100;
    for (let i = 0; i < sessionIds.length; i += CHUNK_SIZE) {
      const chunkIds = sessionIds.slice(i, i + CHUNK_SIZE);
      const { data, error } = await supabase
        .from("student_answers")
        .select(\`
          session_id,
          questions (
            level_id,
            question_levels ( level_number )
          )
        \`)
        .in("session_id", chunkIds);
        
      if (error) {
        answersErr = error;
        break;
      }
      if (data) answers.push(...data);
    }`;
  code = code.replace(regex, replacement);
  fs.writeFileSync(file, code);
  console.log("Fixed community-sections");
} else {
  console.log("Regex not matched in community-sections");
}
