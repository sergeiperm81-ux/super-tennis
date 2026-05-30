import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ArticleLayout.astro auto-renders the affiliate disclosure as a grey banner for
// every gear/lifestyle article. Any copy of that sentence at the top of the body
// is therefore a duplicate. Strip the leading disclosure line (and the blank
// line(s) after it) wherever it appears as the body's opening paragraph.
const DISCLOSURE_RE = /^﻿?\s*This article contains affiliate links\.[^\n]*\r?\n+/;

const { data, error } = await supabase
  .from('articles')
  .select('id, slug, category, body')
  .in('category', ['lifestyle', 'gear'])
  .not('body', 'is', null);

if (error) { console.error(error.message); process.exit(1); }

console.log(`Scanning ${data.length} lifestyle/gear articles...\n`);

let fixed = 0, skipped = 0, failed = 0;
for (const a of data) {
  if (!DISCLOSURE_RE.test(a.body)) { skipped++; continue; }
  const newBody = a.body.replace(DISCLOSURE_RE, '');
  if (newBody.length < 500 || newBody === a.body) { console.log(`  SKIP (suspect) ${a.slug}`); skipped++; continue; }
  const { error: upErr } = await supabase
    .from('articles')
    .update({ body: newBody, updated_at: new Date().toISOString() })
    .eq('id', a.id);
  if (upErr) { console.log(`  FAIL ${a.slug}: ${upErr.message}`); failed++; continue; }
  fixed++;
  console.log(`  fixed  ${a.slug} (-${a.body.length - newBody.length} chars)`);
}

console.log(`\nDone. fixed=${fixed} skipped=${skipped} failed=${failed} of ${data.length}`);
