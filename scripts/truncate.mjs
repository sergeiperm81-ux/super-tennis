import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Delete in small batches to avoid timeout
let total = 0;
let retries = 0;
while (retries < 5) {
  const { data, error } = await supabase.from('players').delete().gt('id', 0).limit(1000).select('id');
  if (error) {
    console.log('Error (retrying):', error.message);
    retries++;
    await new Promise(r => setTimeout(r, 2000));
    continue;
  }
  retries = 0;
  if (!data || data.length === 0) break;
  total += data.length;
  process.stdout.write(`\rDeleted ${total} players...`);
}
console.log(`\nDone. Total deleted: ${total}`);
