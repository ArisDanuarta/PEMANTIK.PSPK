import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // use service role to bypass RLS for checking
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: stages, error } = await supabase
    .from("school_assessment_stages")
    .select("id, school_id, community_id, current_stage");
  console.log("Stages:", stages);
  console.log("Error:", error);
}

check();
