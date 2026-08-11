import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function fixSync() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Fixing old sessions sync_status...');
  
  const { data, error } = await supabase
    .from('assessment_sessions')
    .update({ sync_status: 'synced', synced_at: new Date().toISOString() })
    .eq('status', 'completed')
    .eq('sync_status', 'pending');

  if (error) {
    console.error('Error updating sessions:', error);
  } else {
    console.log('Successfully updated old sessions to "synced"!');
  }
}

fixSync();
