/**
 * upload-photos-to-storage.mjs
 *
 * Downloads CC-licensed photos (from Wikimedia or Flickr) and re-hosts them
 * in Supabase Storage. Updates image_url in the articles table to the stable
 * Supabase CDN URL so we're never dependent on external hotlinks.
 *
 * Usage:
 *   node scripts/upload-photos-to-storage.mjs             # all articles with external URLs
 *   node scripts/upload-photos-to-storage.mjs --fill      # also find photos for null-image articles
 *   node scripts/upload-photos-to-storage.mjs --slug roland-garros-clay-records
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const BUCKET = 'article-photos';
const DELAY_MS = 600; // polite delay between downloads

// ─── Wikimedia Commons search for articles missing a photo ────────────────────
// Maps article slug → Wikimedia Commons search term (used with --fill flag)
const WIKIMEDIA_SEARCH_TERMS = {
  // Roland Garros extras
  'roland-garros-clay-records':              'Roland Garros clay court',
  'how-to-watch-french-open-2026':           'Court Suzanne Lenglen Roland Garros',
  'roland-garros-2026-mens-predictions':     'Jannik Sinner tennis Roland Garros',
  'roland-garros-2026-womens-predictions':   'Iga Swiatek tennis Roland Garros',
  'french-open-2026-preview':                'Roland Garros Philippe Chatrier exterior',
  // Madrid Open
  'madrid-open-2026-preview':                'Madrid Open Caja Magica tennis',
  'madrid-open-2026-mens':                   'Novak Djokovic clay court tennis',
  'madrid-open-2026-womens':                 'Elena Rybakina tennis clay',
  // Others
  'olympic-tennis-guide':                    'tennis 2024 Olympics Paris',
  'next-gen-atp-finals-guide':               'Next Generation ATP Finals Milan',
  'billie-jean-king-cup-guide':              'Billie Jean King Cup women tennis team',
  'a-journey-through-the-world-of-tennis-tournaments': 'Roland Garros court clay',
  // Gear
  'best-tennis-rackets-2026':                'tennis racket professional',
  'best-tennis-shoes-2026':                  'tennis shoes clay hard court',
  'best-tennis-strings-guide':               'tennis strings racket',
  'best-tennis-bags-guide':                  'tennis bag equipment',
  'best-tennis-balls-comparison':            'tennis balls yellow',
};

// ─── Utilities ─────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function ensureBucket() {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw new Error(`listBuckets failed: ${error.message}`);
  const exists = buckets?.find(b => b.name === BUCKET);
  if (!exists) {
    const { error: ce } = await supabase.storage.createBucket(BUCKET, { public: true });
    if (ce) throw new Error(`createBucket failed: ${ce.message}`);
    console.log(`✓ Created storage bucket: ${BUCKET}`);
  } else {
    console.log(`✓ Storage bucket exists: ${BUCKET}`);
  }
}

async function downloadImage(url) {
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'super.tennis/1.0 (editorial@super.tennis)' },
    redirect: 'follow',
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} from ${url}`);
  const ct = resp.headers.get('content-type') || 'image/jpeg';
  if (!ct.startsWith('image/')) throw new Error(`Not an image (${ct})`);
  const buf = Buffer.from(await resp.arrayBuffer());
  if (buf.length < 4000) throw new Error(`Image too small: ${buf.length}B`);
  return { buf, ct };
}

async function uploadToStorage(slug, buf, contentType) {
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  const filename = `${slug}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, buf, { contentType, upsert: true });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
  return data.publicUrl;
}

// ─── Wikimedia Commons search ───────────────────────────────────────────────

async function searchWikimedia(term) {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: `${term} filetype:bitmap`,
    gsrnamespace: '6',
    gsrlimit: '5',
    prop: 'imageinfo',
    iiprop: 'url,extmetadata,size',
    iiurlwidth: '800',
    format: 'json',
    origin: '*',
  });
  const resp = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`);
  if (!resp.ok) throw new Error(`Wikimedia API error: ${resp.status}`);
  const json = await resp.json();
  const pages = json?.query?.pages;
  if (!pages) return null;

  // Find the best image: prefer landscape, >200KB, skip SVG/gif
  for (const page of Object.values(pages)) {
    const info = page.imageinfo?.[0];
    if (!info?.url) continue;
    const url = info.thumburl || info.url;
    const license = info.extmetadata?.LicenseShortName?.value || '';
    // Only use CC or PD licenses
    if (!/^(CC|PD|Public domain)/i.test(license) && license !== '') continue;
    if (/\.svg$/i.test(url) || /\.gif$/i.test(url)) continue;
    if (info.size < 50000) continue; // skip tiny images
    const attribution = [
      info.extmetadata?.Artist?.value?.replace(/<[^>]+>/g, '') || '',
      info.extmetadata?.LicenseShortName?.value || 'CC',
      'via Wikimedia Commons',
    ].filter(Boolean).join(', ');
    return { url, attribution };
  }
  return null;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function processArticle(art, { autoSearch = false } = {}) {
  let sourceUrl = art.image_url;
  let needsSearch = !sourceUrl || (!sourceUrl.startsWith('https://upload.wikimedia') && !sourceUrl.startsWith('http'));

  // Skip articles already on our own Storage
  if (sourceUrl?.includes('supabase.co/storage')) {
    console.log(`  SKIP (already in Supabase Storage)`);
    return 'skip';
  }

  // For null image_url + autoSearch: search Wikimedia
  if (!sourceUrl && autoSearch) {
    const term = WIKIMEDIA_SEARCH_TERMS[art.slug];
    if (!term) {
      console.log(`  SKIP (no search term defined)`);
      return 'skip';
    }
    console.log(`  Searching Wikimedia: "${term}"`);
    const found = await searchWikimedia(term);
    if (!found) {
      console.log(`  No CC image found`);
      return 'fail';
    }
    sourceUrl = found.url;
    console.log(`  Found: ${sourceUrl.split('/').slice(-1)[0]}`);
  }

  if (!sourceUrl) {
    console.log(`  SKIP (no source URL)`);
    return 'skip';
  }

  try {
    const { buf, ct } = await downloadImage(sourceUrl);
    const publicUrl = await uploadToStorage(art.slug, buf, ct);

    const { error } = await supabase
      .from('articles')
      .update({ image_url: publicUrl })
      .eq('slug', art.slug);
    if (error) throw new Error(`DB update failed: ${error.message}`);

    console.log(`  ✓ ${(buf.length / 1024).toFixed(0)}KB → ${publicUrl.split('/').pop()}`);
    return 'ok';
  } catch (e) {
    console.error(`  ✗ ${e.message}`);
    return 'fail';
  }
}

async function main() {
  const args = process.argv.slice(2);
  const fillMode = args.includes('--fill');
  const singleSlug = args.includes('--slug') ? args[args.indexOf('--slug') + 1] : null;

  console.log('=== upload-photos-to-storage ===');
  if (fillMode) console.log('Mode: fill (also search Wikimedia for null-image articles)');
  if (singleSlug) console.log(`Mode: single slug — ${singleSlug}`);
  console.log('');

  await ensureBucket();
  console.log('');

  // Fetch articles
  let query = supabase.from('articles').select('slug, image_url, category, title');
  if (singleSlug) {
    query = query.eq('slug', singleSlug);
  } else if (fillMode) {
    // All articles with external URLs OR null (we'll search for null ones)
    query = query.or('image_url.is.null,image_url.like.https://%');
  } else {
    // Only articles with external (non-Supabase) image URLs
    query = query.like('image_url', 'https://%').not('image_url', 'like', '%supabase.co/storage%');
  }

  const { data: articles, error } = await query.order('category');
  if (error) throw error;

  console.log(`Processing ${articles.length} articles...\n`);

  const counts = { ok: 0, skip: 0, fail: 0 };

  for (let i = 0; i < articles.length; i++) {
    const art = articles[i];
    const prefix = `[${i + 1}/${articles.length}] [${art.category}] ${art.slug}`;
    console.log(prefix);

    const result = await processArticle(art, { autoSearch: fillMode });
    counts[result]++;

    await sleep(DELAY_MS);
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Total:    ${articles.length}`);
  console.log(`Uploaded: ${counts.ok}`);
  console.log(`Skipped:  ${counts.skip}`);
  console.log(`Failed:   ${counts.fail}`);
}

main().catch(console.error);
