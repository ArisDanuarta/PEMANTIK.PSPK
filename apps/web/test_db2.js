const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
let url, key;
env.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].replace(/"/g, '').trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = line.split('=')[1].replace(/"/g, '').trim();
});
async function run() {
  const commRes = await fetch(url + '/rest/v1/communities?select=id&name=eq.UNESA', {
    headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
  });
  const commId = (await commRes.json())[0]?.id;

  const schoolRes = await fetch(url + '/rest/v1/schools?select=id&community_id=eq.' + commId, {
    headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
  });
  const schoolIds = (await schoolRes.json()).map(s => s.id);

  if (schoolIds.length > 0) {
    const sessionRes = await fetch(url + '/rest/v1/assessment_sessions?select=id,category_id,student_id,status&school_id=in.(' + schoolIds.join(',') + ')', {
      headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
    });
    const sessions = await sessionRes.json();
    console.log("Total sessions:", sessions.length);
    const numSessions = sessions.filter(s => s.category_id === '67fd8d19-f9ed-4539-ac9f-0389bb6ad9fd');
    console.log("Numerasi sessions:", numSessions.length);
    console.log("Literasi sessions:", sessions.length - numSessions.length);
  }
}
run();
