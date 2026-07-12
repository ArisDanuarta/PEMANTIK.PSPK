const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const communityId = '442920c8-57ae-4a09-aff1-f9746aee1d45'; // from earlier logs

  const { data: schools, error: err1 } = await supabase
    .from('schools')
    .select('id, name')
    .eq('community_id', communityId);
  console.log("Schools:", schools, err1);

  const schoolIds = schools?.map(s => s.id) || [];
  console.log("School IDs:", schoolIds);

  if (schoolIds.length > 0) {
    const { data: stages, error: err2 } = await supabase
      .from('school_assessment_stages')
      .select('id, school_id, phase, current_stage, valid_until')
      .in('school_id', schoolIds);
    console.log("Stages:", stages, err2);
  }
}
test();
