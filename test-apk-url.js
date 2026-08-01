const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://bhrqorbjdmlewwmlajfg.supabase.co',
  'sb_publishable_SzhpIVvCr63y2FuU4fAAHg_pUw-rB7u'
);

async function main() {
  const { data, error } = await supabase
    .from('app_releases')
    .select('download_url')
    .eq('is_active', true)
    .order('version_code', { ascending: false })
    .limit(1)
    .maybeSingle();

  console.log('Data:', data);
  console.log('Error:', error);
}

main();
