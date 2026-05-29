// Usage: node --env-file=<.env> scripts/_read-body.mjs <slug> <outfile>
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const [slug, outfile] = process.argv.slice(2);
if (!slug || !outfile) { console.error('Usage: _read-body.mjs <slug> <outfile>'); process.exit(1); }

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const { data, error } = await supabase
  .from('articles')
  .select('body')
  .eq('slug', slug)
  .limit(1);

if (error) { console.error('Error:', error.message); process.exit(1); }
if (!data || data.length === 0) { console.error('Not found:', slug); process.exit(1); }

writeFileSync(outfile, data[0].body, 'utf8');
console.log(`Wrote ${data[0].body.length} chars to ${outfile}`);
