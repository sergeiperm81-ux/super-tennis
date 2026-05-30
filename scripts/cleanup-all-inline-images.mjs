import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// The layout renders ONE hero photo at the top from image_url. Any inline
// ![alt](upload.wikimedia.org/...) image in the body is either a duplicate of
// that hero or an extra the user no longer wants. Strip every inline Wikimedia
// image and its immediately-following italic caption line. Leave the trailing
// "Photo: ..." credit line and "### Photo credits" prose intact (those are text,
// not images, and carry attribution for the hero).
const INLINE_IMG_RE = /!\[[^\]]*\]\(https:\/\/upload\.wikimedia\.org\/[^)]+\)\s*\r?\n+(\*[^\n]+\*\s*\r?\n+)?/g;

const { data, error } = await supabase
  .from('articles')
  .select('id, slug, category, body')
  .in('category', ['lifestyle', 'gear'])
  .not('body', 'is', null);

if (error) { console.error(error.message); process.exit(1); }

console.log(`Scanning ${data.length} lifestyle/gear articles for inline images...\n`);

let fixed = 0, skipped = 0, failed = 0;
for (const a of data) {
  const imgs = (a.body.match(/!\[[^\]]*\]\(https:\/\/upload\.wikimedia\.org\/[^)]+\)/g) || []).length;
  if (imgs === 0) { skipped++; continue; }
  const newBody = a.body.replace(INLINE_IMG_RE, '');
  if (newBody.length < 500) { console.log(`  SKIP (suspect) ${a.slug}`); skipped++; continue; }
  const { error: upErr } = await supabase
    .from('articles')
    .update({ body: newBody, updated_at: new Date().toISOString() })
    .eq('id', a.id);
  if (upErr) { console.log(`  FAIL ${a.slug}: ${upErr.message}`); failed++; continue; }
  fixed++;
  console.log(`  fixed  ${a.slug} — removed ${imgs} inline image(s) (-${a.body.length - newBody.length} chars)`);
}

console.log(`\nDone. fixed=${fixed} skipped=${skipped} failed=${failed} of ${data.length}`);
