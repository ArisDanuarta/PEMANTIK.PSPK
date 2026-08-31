import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const teacherId = '2a5b6b66-c95a-40a2-9b24-7f1c1f93f5be'; // wait, I don't know the teacher ID. Let's just query by school name or get all sessions.
  const { data, error } = await supabase
    .from("v_assessment_report")
    .select("subject_area")
    .eq("session_status", "completed");
    
  if (error) {
    console.error("Error fetching view:", error);
  } else {
    const lit = data.filter(d => d.subject_area === 'literasi').length;
    const num = data.filter(d => d.subject_area === 'numerasi').length;
    console.log(`Total completed sessions: ${data.length}`);
    console.log(`Literasi: ${lit}`);
    console.log(`Numerasi: ${num}`);
  }
}
run();
