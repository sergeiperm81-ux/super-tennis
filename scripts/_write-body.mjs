// Usage: node --env-file=<.env> scripts/_write-body.mjs <slug> <infile>
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const [slug, infile] = process.argv.slice(2);
if (!slug || !infile) { console.error('Usage: _write-body.mjs <slug> <infile>'); process.exit(1); }

const body = readFileSync(infile, 'utf8');
if (body.length < 800) { console.error('Refusing to write suspiciously short body:', body.length); process.exit(1); }

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const { data, error } = await supabase
  .from('articles')
  .update({ body, updated_at: new Date().toISOString() })
  .eq('slug', slug)
  .select('id, slug');

if (error) { console.error('Error:', error.message); process.exit(1); }
if (!data || data.length === 0) { console.error('No row matched slug:', slug); process.exit(1); }
console.log(`Updated body for ${data[0].slug} (id ${data[0].id}), ${body.length} chars`);
