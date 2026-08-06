import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: cols } = await supabase.rpc('get_columns', { table_name: 'school_assessment_stages' })
  console.log("Cols:", cols)
}
run()
