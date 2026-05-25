import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Slugs of the lifestyle articles I authored that contain duplicate inline photos
// (a markdown image + optional italic caption) inside the body. ArticleLayout
// already renders the hero from image_url, so the inline copy is a duplicate.
const slugs = [
  'tennis-engagement-boom-class-of-2026-weddings',
  'iga-swiatek-fired-fissette-hired-roig-roland-garros-2026',
  'best-european-tennis-resorts-2026-grand-slam-holiday',
  'naomi-osaka-roland-garros-2026-wiktorowski-comeback',
  'coco-gauff-defending-roland-garros-2026-not-rafa',
  'yannick-noah-day-roland-garros-2026-last-french-champion',
  'casper-ruud-roland-garros-2026-third-time-final',
  'tennis-parenthood-generation-2026-mothers-fathers-on-tour',
];

// Pattern: markdown image line, optional blank line, optional italic caption (line that
// starts and ends with '*'), optional blank line(s) after.
// We strip the image and its immediately-following italic caption (the credit line).
function stripInlinePhotos(body) {
  let out = body;

  // Strip markdown images that point at upload.wikimedia.org
  // Capture: image line + any following italic caption (single line starting with *)
  // Followed by an optional blank line.
  const pattern = /!\[[^\]]*\]\(https:\/\/upload\.wikimedia\.org\/[^)]+\)\s*\n+(\*[^\n]+\*\s*\n+)?/g;
  out = out.replace(pattern, '');

  return out;
}

let totalStripped = 0;
const results = [];

for (const slug of slugs) {
  // Fetch the article
  const { data: rows, error: fetchErr } = await supabase
    .from('articles')
    .select('id, slug, body')
    .eq('slug', slug)
    .limit(1);

  if (fetchErr) {
    console.error(`Fetch error for ${slug}:`, fetchErr.message);
    continue;
  }
  if (!rows || rows.length === 0) {
    console.warn(`Article not found: ${slug}`);
    continue;
  }

  const original = rows[0].body;
  const cleaned = stripInlinePhotos(original);
  const removedBytes = original.length - cleaned.length;

  if (removedBytes === 0) {
    console.log(`  ${slug} — no inline photos found, skipping`);
    results.push({ slug, status: 'skipped', removed: 0 });
    continue;
  }

  // Count how many image tags were removed (rough)
  const removedImages = (original.match(/!\[[^\]]*\]\(https:\/\/upload\.wikimedia\.org\/[^)]+\)/g) || []).length;

  // Update
  const { error: updateErr } = await supabase
    .from('articles')
    .update({
      body: cleaned,
      updated_at: new Date().toISOString(),
    })
    .eq('id', rows[0].id);

  if (updateErr) {
    console.error(`Update error for ${slug}:`, updateErr.message);
    continue;
  }

  totalStripped += removedImages;
  results.push({ slug, status: 'updated', removed: removedImages, bytes: removedBytes });
  console.log(`  ${slug} — removed ${removedImages} inline image(s) (-${removedBytes} bytes)`);
}

console.log(`\nDone. Total inline images removed: ${totalStripped}\n`);
console.log('Summary:');
for (const r of results) {
  console.log(`  ${r.status.padEnd(7)} ${r.slug.padEnd(60)} ${r.removed || 0} image(s)`);
}
