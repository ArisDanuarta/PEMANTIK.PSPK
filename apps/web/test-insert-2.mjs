import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const url = env.split("\n").find(l => l.startsWith("NEXT_PUBLIC_SUPABASE_URL=")).split("=")[1].replace(/['"]/g, '').trim();
const key = env.split("\n").find(l => l.startsWith("NEXT_PUBLIC_SUPABASE_ANON_KEY=")).split("=")[1].replace(/['"]/g, '').trim();
const serviceKey = env.split("\n").find(l => l.startsWith("SUPABASE_SERVICE_ROLE_KEY=")).split("=")[1].replace(/['"]/g, '').trim();

const supabaseAdmin = createClient(url, serviceKey);

async function test() {
  const { data: requests } = await supabaseAdmin.from("assessment_retake_requests").select("*").eq("status", "approved").limit(1);
  const r = requests[0];
  
  const studentId = r.student_id;
  const schoolId = r.school_id;
  
  const { data: accessData } = await supabaseAdmin.from("assessment_access").select("*").eq("target_id", r.student_id);
  const acc = accessData[0];
  
  // Create a JWT for this student manually?
  // Or we can just use the supabase client with the auth headers set
  // To do that, we need a valid JWT. But we don't know the password.
  // Instead, we can use RPC to test the RLS policy!
  // No, we can't test RLS easily without auth.
  
  // BUT wait, is there a chance that `is_assessment_access_valid` returns FALSE because `now()` is timezone aware and maybe the timezone of the DB is different?
  // `now()` returns TIMESTAMPTZ, so timezone doesn't matter, it's absolute time.
  console.log("We can't impersonate easily via script without a custom jwt function. Let's look at the DB logs instead.");
}
test();
