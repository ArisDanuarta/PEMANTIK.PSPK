import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

const envLocal = dotenv.parse(fs.readFileSync(path.join(process.cwd(), ".env.local")));
const supabaseUrl = envLocal.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envLocal.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Fetching users with school_id but without community_id...");
  const { data: users, error } = await supabase
    .from("users")
    .select("id, school_id, community_id")
    .not("school_id", "is", null)
    .is("community_id", null);

  if (error) {
    console.error("Error fetching users:", error);
    process.exit(1);
  }

  console.log(`Found ${users.length} users to update.`);

  if (users.length === 0) return;

  // fetch distinct schools
  const schoolIds = [...new Set(users.map(u => u.school_id))];
  const { data: schools, error: schoolErr } = await supabase
    .from("schools")
    .select("id, community_id")
    .in("id", schoolIds);

  if (schoolErr) {
    console.error("Error fetching schools:", schoolErr);
    process.exit(1);
  }

  const schoolMap = {};
  schools.forEach(s => schoolMap[s.id] = s.community_id);

  let updated = 0;
  for (const user of users) {
    const cid = schoolMap[user.school_id];
    if (cid) {
      const { error: updateErr } = await supabase.from("users").update({ community_id: cid }).eq("id", user.id);
      if (updateErr) {
        console.error(`Failed to update user ${user.id}:`, updateErr);
      } else {
        updated++;
      }
    }
  }

  console.log(`Successfully updated ${updated} users.`);
}

main().catch(console.error);
