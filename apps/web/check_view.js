import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: sessions, error } = await supabase
    .from("v_assessment_report")
    .select("session_id, student_id, class_id, teacher_id, session_status")
    .limit(10);
    
  if (error) {
    console.error("Error fetching view:", error);
  } else {
    console.log("Samples from v_assessment_report:");
    console.log(sessions);
  }
}
run();
