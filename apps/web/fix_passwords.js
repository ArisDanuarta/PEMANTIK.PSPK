import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  console.log("Updating users...")
  const { data: users, error: err1 } = await supabase.from('users').update({ plain_password: 'Password123!' }).is('plain_password', null).select('id')
  if (err1) console.error("Error updating users:", err1)
  else console.log(`Updated ${users.length} users.`)

  console.log("Updating schools...")
  const { data: schools, error: err2 } = await supabase.from('schools').update({ plain_password: 'Password123!' }).is('plain_password', null).select('id')
  if (err2) console.error("Error updating schools:", err2)
  else console.log(`Updated ${schools.length} schools.`)

  console.log("Updating communities...")
  const { data: communities, error: err3 } = await supabase.from('communities').update({ plain_password: 'Password123!' }).is('plain_password', null).select('id')
  if (err3) console.error("Error updating communities:", err3)
  else console.log(`Updated ${communities.length} communities.`)
}

run()
