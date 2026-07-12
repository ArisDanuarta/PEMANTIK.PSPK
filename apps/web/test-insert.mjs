import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const url = env.split("\n").find(l => l.startsWith("NEXT_PUBLIC_SUPABASE_URL=")).split("=")[1].replace(/['"]/g, '').trim();
const key = env.split("\n").find(l => l.startsWith("NEXT_PUBLIC_SUPABASE_ANON_KEY=")).split("=")[1].replace(/['"]/g, '').trim();
const serviceKey = env.split("\n").find(l => l.startsWith("SUPABASE_SERVICE_ROLE_KEY=")).split("=")[1].replace(/['"]/g, '').trim();

const supabaseAdmin = createClient(url, serviceKey);

async function test() {
  // get a student who has a retake request approved
  const { data: requests } = await supabaseAdmin.from("assessment_retake_requests").select("*").eq("status", "approved").limit(1);
  const r = requests[0];
  
  // get student email / password or impersonate? 
  // Wait, we can impersonate using service_role and auth.admin.generateLink or similar.
  // actually, we can just call the postgres function directly via RPC to check if `is_assessment_access_valid` works
  // But we need to test RLS!
  
  // Instead of logging in, let's just test is_assessment_access_valid from service_role.
  const { data: accessData } = await supabaseAdmin.from("assessment_access").select("*").eq("target_id", r.student_id);
  const acc = accessData[0];
  
  const { data: rpcRes, error } = await supabaseAdmin.rpc("is_assessment_access_valid", {
    p_category_id: acc.category_id,
    p_phase: acc.phase,
    p_student_id: r.student_id
  });
  console.log("is_assessment_access_valid for student:", rpcRes, error);
}
test();
