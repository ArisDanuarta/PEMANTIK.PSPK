import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: requests } = await supabase.from("assessment_retake_requests").select("*").order("created_at", { ascending: false }).limit(5);
  console.log("Latest retake requests:", requests);
  
  if (requests && requests.length > 0) {
    const r = requests[0];
    const { data: access } = await supabase.from("assessment_access").select("*").eq("target_type", "student").eq("target_id", r.student_id);
    console.log("Student access:", access);
    
    // Also fetch the old session
    const { data: sess } = await supabase.from("assessment_sessions").select("*").eq("id", r.session_id);
    console.log("Old session phase:", sess?.[0]?.phase, "category:", sess?.[0]?.category_id);
  }
}
test();
