import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  console.log("Updating users...")
  const { data: users1, error: err1 } = await supabase.from('users').update({ plain_password: 'Password123!' }).is('plain_password', null).select('id')
  const { data: users2, error: err1b } = await supabase.from('users').update({ plain_password: 'Password123!' }).eq('plain_password', '-').select('id')
  const { data: users3, error: err1c } = await supabase.from('users').update({ plain_password: 'Password123!' }).eq('plain_password', '').select('id')
  if (err1 || err1b || err1c) console.error("Error updating users:", err1, err1b, err1c)
  else console.log(`Updated ${(users1?.length || 0) + (users2?.length || 0) + (users3?.length || 0)} users.`)

  console.log("Updating schools...")
  const { data: schools1, error: err2 } = await supabase.from('schools').update({ plain_password: 'Password123!' }).is('plain_password', null).select('id')
  const { data: schools2, error: err2b } = await supabase.from('schools').update({ plain_password: 'Password123!' }).eq('plain_password', '-').select('id')
  const { data: schools3, error: err2c } = await supabase.from('schools').update({ plain_password: 'Password123!' }).eq('plain_password', '').select('id')
  if (err2 || err2b || err2c) console.error("Error updating schools:", err2, err2b, err2c)
  else console.log(`Updated ${(schools1?.length || 0) + (schools2?.length || 0) + (schools3?.length || 0)} schools.`)

  console.log("Updating communities...")
  const { data: communities1, error: err3 } = await supabase.from('communities').update({ plain_password: 'Password123!' }).is('plain_password', null).select('id')
  const { data: communities2, error: err3b } = await supabase.from('communities').update({ plain_password: 'Password123!' }).eq('plain_password', '-').select('id')
  const { data: communities3, error: err3c } = await supabase.from('communities').update({ plain_password: 'Password123!' }).eq('plain_password', '').select('id')
  if (err3 || err3b || err3c) console.error("Error updating communities:", err3, err3b, err3c)
  else console.log(`Updated ${(communities1?.length || 0) + (communities2?.length || 0) + (communities3?.length || 0)} communities.`)
}

run()
