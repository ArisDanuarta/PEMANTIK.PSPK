const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
let url, key;
env.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].replace(/"/g, '').trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = line.split('=')[1].replace(/"/g, '').trim();
});
async function run() {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(url, key);
  
  const { data: communities } = await supabase.from('communities').select('*').limit(2);
  const { data: admins } = await supabase.from('users').select('community_id, username').eq('role', 'community');
  
  const commsWithAdmins = communities.map(c => {
    const admin = admins.find(a => a.community_id === c.id);
    return { ...c, username: admin ? admin.username : null };
  });
  console.log(JSON.stringify(commsWithAdmins, null, 2));
}
run();
