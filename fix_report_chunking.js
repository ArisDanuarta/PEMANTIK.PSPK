const fs = require('fs');
const files = [
  'apps/web/src/app/api/report/school-sections/route.ts',
  'apps/web/src/app/api/report/community-sections/route.ts'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, 'utf8');
  
  // Replace the .in("session_id", sessionIds.map((s) => s.id)) with chunking
  const regex = /const \{ data: answers, error: answersErr \} = await supabase\s*\.from\("student_answers"\)\s*\.select\([\s\S]*?\.in\("session_id", sessionIds\.map\(\(s\) => s\.id\)\);/;
  
  if (regex.test(code)) {
    const replacement = `
    const allSessionIds = sessionIds.map((s) => s.id);
    let answers: any[] = [];
    let answersErr = null;
    
    // Chunk requests to avoid URL too long (414) in PostgREST
    const CHUNK_SIZE = 100;
    for (let i = 0; i < allSessionIds.length; i += CHUNK_SIZE) {
      const chunkIds = allSessionIds.slice(i, i + CHUNK_SIZE);
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
    console.log(`Fixed ${file}`);
  }
});
