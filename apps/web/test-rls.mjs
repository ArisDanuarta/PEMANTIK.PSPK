import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const url = env.split("\n").find(l => l.startsWith("NEXT_PUBLIC_SUPABASE_URL=")).split("=")[1];
const key = env.split("\n").find(l => l.startsWith("SUPABASE_SERVICE_ROLE_KEY=")).split("=")[1];

const supabase = createClient(url.replace(/['"]/g, ''), key.replace(/['"]/g, ''));

async function test() {
  const { data: requests } = await supabase.from("assessment_retake_requests").select("*").order("created_at", { ascending: false }).limit(5);
  console.log("Latest retake requests:", requests);
  
  if (requests && requests.length > 0) {
    const r = requests[0];
    const { data: access } = await supabase.from("assessment_access").select("*").eq("target_type", "student").eq("target_id", r.student_id);
    console.log("Student access:", access);
    
    // Also fetch the old session
    const { data: sess } = await supabase.from("assessment_sessions").select("*").eq("id", r.session_id);
    console.log("Old session:", sess);
  }
}
test();
