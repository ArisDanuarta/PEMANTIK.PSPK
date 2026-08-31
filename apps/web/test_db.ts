import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // use service role for full access

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const classId = "42991697-46c2-445a-87bf-f964b7df3ee6"; // from user log
  console.log("Querying v_assessment_report for class:", classId);
  const { data: viewData, error: viewErr } = await supabase
    .from("v_assessment_report")
    .select("student_id, session_status")
    .eq("class_id", classId);
  console.log("View data:", viewData?.length, "Error:", viewErr);

  console.log("Querying assessment_sessions for students in class...");
  const { data: stIds } = await supabase.from("students").select("id").eq("class_id", classId);
  const validStIds = (stIds ?? []).map((st: any) => st.id);
  console.log("Found", validStIds.length, "students in class");

  if (validStIds.length > 0) {
    const { data: sessData, error: sessErr } = await supabase
      .from("assessment_sessions")
      .select("id, status, is_void")
      .in("student_id", validStIds);
    console.log("Session data:", sessData?.length, "Error:", sessErr);
  }
}
run();
