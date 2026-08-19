require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      'SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY harus di-set di file .env ' +
      '(pakai Service Role Key, BUKAN anon key, supaya bisa bypass RLS).'
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

module.exports = { getSupabaseClient };
