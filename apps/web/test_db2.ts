import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const classId = "42991697-46c2-445a-87bf-f964b7df3ee6";
  const { data: ctData } = await supabase.from("class_teachers").select("teacher_id").eq("class_id", classId);
  console.log("Teachers for class:", ctData);
}
run();
