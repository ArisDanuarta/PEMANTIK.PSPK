import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const url = env.split("\n").find(l => l.startsWith("NEXT_PUBLIC_SUPABASE_URL=")).split("=")[1].replace(/['"]/g, '').trim();
const serviceKey = env.split("\n").find(l => l.startsWith("SUPABASE_SERVICE_ROLE_KEY=")).split("=")[1].replace(/['"]/g, '').trim();

const supabaseAdmin = createClient(url, serviceKey);

async function test() {
  const { data, error } = await supabaseAdmin.rpc("get_schema_info"); 
  // No such RPC. Just select a row from assessment_sessions.
  const { data: rows } = await supabaseAdmin.from("assessment_sessions").select("*").limit(1);
  console.log("assessment_sessions columns:", Object.keys(rows[0]));
}
test();
