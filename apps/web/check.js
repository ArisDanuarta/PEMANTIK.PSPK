const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if(key && val) env[key] = val.join('=').trim().replace(/["']/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('system_logs').select('*').limit(5);
  console.log("system_logs:", JSON.stringify(data, null, 2));
  console.log("error:", error);
}

check();
