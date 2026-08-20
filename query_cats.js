const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'apps/web/.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data } = await supabase.from('question_categories').select('id, subject_area');
  console.log(data);
}
run();
