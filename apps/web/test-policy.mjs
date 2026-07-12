import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const url = env.split("\n").find(l => l.startsWith("NEXT_PUBLIC_SUPABASE_URL=")).split("=")[1].replace(/['"]/g, '').trim();
const serviceKey = env.split("\n").find(l => l.startsWith("SUPABASE_SERVICE_ROLE_KEY=")).split("=")[1].replace(/['"]/g, '').trim();

const supabaseAdmin = createClient(url, serviceKey);

async function test() {
  const { data, error } = await supabaseAdmin.rpc("get_schema_info"); // doesn't exist
  // We can query pg_policies! But pg_policies is a system table, Supabase API (PostgREST) doesn't expose it by default.
  // We can just use raw postgres if we have the connection string.
  // Do we have the connection string? Let's check .env.local
  const envContent = fs.readFileSync(".env.local", "utf8");
  const pgUrl = envContent.split("\n").find(l => l.startsWith("DATABASE_URL="))?.split("=")[1]?.replace(/['"]/g, '')?.trim();
  console.log("Has DATABASE_URL:", !!pgUrl);
}
test();
