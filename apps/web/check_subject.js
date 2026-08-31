import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from("v_assessment_report")
    .select("subject_area")
    .limit(100);
    
  if (error) {
    console.error("Error fetching view:", error);
  } else {
    const uniqueSubjects = [...new Set(data.map(d => d.subject_area))];
    console.log("Distinct subject_area values in v_assessment_report:");
    console.log(uniqueSubjects);
  }
}
run();
