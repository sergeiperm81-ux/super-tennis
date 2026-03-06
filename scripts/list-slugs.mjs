import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const { data, error } = await sb.from('articles').select('slug, category').in('status', ['published', 'draft']);
if (error) { console.error('Error:', error); process.exit(1); }

const byCategory = {};
for (const a of data || []) {
  if (!byCategory[a.category]) byCategory[a.category] = [];
  byCategory[a.category].push(a.slug);
}

for (const [cat, slugs] of Object.entries(byCategory)) {
  console.log(`--- ${cat} (${slugs.length}) ---`);
  console.log(JSON.stringify(slugs));
  console.log();
}
