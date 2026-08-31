import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
async function main() {
  const { data, error } = await supabase.from('students').select('*').limit(1)
  console.log('students:', data ? Object.keys(data[0]) : error)
}
main()
