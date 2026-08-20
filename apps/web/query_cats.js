const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
let url, key;
env.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].replace(/"/g, '').trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = line.split('=')[1].replace(/"/g, '').trim();
});
async function run() {
  const res = await fetch(url + '/rest/v1/assessment_sessions?select=*&limit=1', {
    headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
  });
  console.log(await res.json());
}
run();
