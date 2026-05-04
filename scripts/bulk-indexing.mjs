/**
 * Google Indexing API — Bulk URL submitter
 *
 * Fetches all URLs from the sitemap, submits 200/day via Google Indexing API.
 * Uses day-of-year offset to cycle through ALL pages every ~30 days.
 *
 * Setup (one-time):
 *   1. Go to console.cloud.google.com → Create project → Enable "Web Search Indexing API"
 *   2. IAM & Admin → Service Accounts → Create → Download JSON key
 *   3. Go to search.google.com/search-console → Settings → Users & permissions
 *      → Add user → paste service account email → Owner
 *   4. base64-encode the JSON key:
 *      Windows PowerShell: [Convert]::ToBase64String([IO.File]::ReadAllBytes("key.json"))
 *      Linux/Mac:          base64 -w 0 key.json
 *   5. Add to GitHub Secrets as GOOGLE_SA_JSON
 *
 * Usage:
 *   node scripts/bulk-indexing.mjs [--limit=200] [--dry-run] [--offset=0]
 *
 * Quota: 200 URLs/day per service account (resets midnight Pacific)
 */

import 'dotenv/config';
import { GoogleAuth } from 'google-auth-library';
import { createClient } from '@supabase/supabase-js';

const GOOGLE_SA_JSON = process.env.GOOGLE_SA_JSON;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SITEMAP_URL = 'https://super.tennis/sitemap-index.xml';
const DAILY_LIMIT = 200;

const LIMIT_FLAG = process.argv.find(a => a.startsWith('--limit='));
const LIMIT = LIMIT_FLAG ? parseInt(LIMIT_FLAG.split('=')[1]) : DAILY_LIMIT;
const DRY_RUN = process.argv.includes('--dry-run');
const OFFSET_FLAG = process.argv.find(a => a.startsWith('--offset='));
// Default offset: rotate by day-of-year so we cycle through all pages
const DAY_OF_YEAR = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
const OFFSET = OFFSET_FLAG ? parseInt(OFFSET_FLAG.split('=')[1]) : (DAY_OF_YEAR * DAILY_LIMIT);

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchSitemapUrls(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const xml = await res.text();

  // Check if this is a sitemap index (contains <sitemap> tags)
  if (xml.includes('<sitemapindex')) {
    const childUrls = [...xml.matchAll(/<loc>(https?:\/\/[^<]+)<\/loc>/g)].map(m => m[1].trim());
    const allPageUrls = [];
    for (const childUrl of childUrls) {
      try {
        const childUrls = await fetchSitemapUrls(childUrl);
        allPageUrls.push(...childUrls);
      } catch (e) {
        console.warn(`  ⚠️ Failed to fetch child sitemap ${childUrl}: ${e.message}`);
      }
    }
    return allPageUrls;
  }

  // Regular sitemap — extract <loc> tags
  return [...xml.matchAll(/<loc>(https?:\/\/[^<]+)<\/loc>/g)].map(m => m[1].trim());
}

async function getAuthToken() {
  const saJson = JSON.parse(Buffer.from(GOOGLE_SA_JSON, 'base64').toString('utf8'));
  const auth = new GoogleAuth({
    credentials: saJson,
    scopes: ['https://www.googleapis.com/auth/indexing'],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token;
}

async function requestIndexing(url, token, type = 'URL_UPDATED') {
  const res = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ url, type }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
  return data;
}

// Pull pending soft-deleted news URLs that haven't been de-indexed yet.
// Priority over fresh sitemap submission — 404'd content hurts SEO more
// than fresh content not yet indexed.
async function fetchPendingDeindex(maxCount) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return [];
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  try {
    const { data, error } = await sb.from('news')
      .select('slug, deindex_submitted_at')
      .eq('is_active', false)
      .is('deindex_submitted_at', null)
      .limit(maxCount);
    if (error) {
      // Column missing → skip de-index pass (older deployments)
      if (error.message?.includes('deindex_submitted_at')) return [];
      console.warn('   ⚠️ Could not fetch de-index queue:', error.message);
      return [];
    }
    return (data || []).map(r => ({
      url: `https://super.tennis/news/${r.slug}/`,
      slug: r.slug,
      type: 'URL_DELETED',
    }));
  } catch (err) {
    console.warn('   ⚠️ De-index queue unavailable:', err.message);
    return [];
  }
}

async function markDeindexSubmitted(slug) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return;
  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    await sb.from('news').update({ deindex_submitted_at: new Date().toISOString() }).eq('slug', slug);
  } catch { /* best-effort */ }
}

async function run() {
  console.log('═══════════════════════════════════════════════');
  console.log('  Google Indexing API — Bulk Submitter');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Limit: ${LIMIT} URLs`);
  console.log(`  Offset: ${OFFSET} (day ${DAY_OF_YEAR} of year)`);
  console.log(`  Dry run: ${DRY_RUN}`);
  console.log('');

  if (!GOOGLE_SA_JSON && !DRY_RUN) {
    console.error('❌ GOOGLE_SA_JSON not set. See setup instructions at top of this file.');
    console.error('   Run with --dry-run to test without credentials.');
    process.exit(1);
  }

  // Fetch all URLs from sitemap
  console.log(`📡 Fetching sitemap: ${SITEMAP_URL}`);
  const allUrls = await fetchSitemapUrls(SITEMAP_URL);
  console.log(`   Found ${allUrls.length} total URLs in sitemap`);

  if (allUrls.length === 0) {
    console.error('❌ No URLs found in sitemap');
    process.exit(1);
  }

  // Sort for consistent ordering, then apply offset rotation
  // Priority order: homepage > rankings > players > news > articles
  const priorityOrder = (url) => {
    if (url === 'https://super.tennis/') return 0;
    if (url.includes('/rankings/')) return 1;
    if (url.includes('/players/')) return 2;
    if (url.includes('/news/')) return 3;
    if (url.includes('/vs/')) return 4;
    if (url.includes('/gear/')) return 5;
    if (url.includes('/lifestyle/')) return 6;
    if (url.includes('/records/')) return 7;
    return 8;
  };

  const sorted = [...allUrls].sort((a, b) => {
    const pd = priorityOrder(a) - priorityOrder(b);
    if (pd !== 0) return pd;
    return a.localeCompare(b);
  });

  // Apply offset with wrap-around to cycle through all pages
  const effectiveOffset = OFFSET % sorted.length;
  const rotated = [
    ...sorted.slice(effectiveOffset),
    ...sorted.slice(0, effectiveOffset),
  ];
  const batch = rotated.slice(0, LIMIT);

  console.log(`\n📋 Batch: URLs ${effectiveOffset + 1}–${effectiveOffset + batch.length} of ${sorted.length}`);
  console.log(`   Cycle: ~${Math.ceil(sorted.length / LIMIT)} days to index all pages\n`);

  // ── De-index queue takes priority — 404'd pages hurt SEO more than
  //    new pages not yet indexed. Up to half the daily quota goes here.
  const deindexQuota = Math.min(LIMIT, 100);
  const deindexQueue = await fetchPendingDeindex(deindexQuota);
  if (deindexQueue.length > 0) {
    console.log(`🗑  De-index queue: ${deindexQueue.length} pending soft-deleted URLs (will use up to ${deindexQuota} of today's quota)`);
  }

  // Combine: de-index FIRST, then fresh URLs from sitemap. Total ≤ LIMIT.
  const indexBatch = batch.slice(0, Math.max(0, LIMIT - deindexQueue.length))
    .map(u => ({ url: u, slug: null, type: 'URL_UPDATED' }));
  const allBatch = [...deindexQueue, ...indexBatch];

  console.log(`\n📋 Total batch: ${allBatch.length} URLs (${deindexQueue.length} de-index + ${indexBatch.length} index)\n`);

  if (DRY_RUN) {
    console.log('🏜️  Dry run — URLs that would be submitted:');
    allBatch.forEach((u, i) => console.log(`  ${String(i + 1).padStart(3)}. [${u.type}] ${u.url}`));
    console.log('\n✅ Dry run complete — no requests sent');
    return;
  }

  const token = await getAuthToken();
  let successIndex = 0, successDeindex = 0;
  let failed = 0;
  let quotaExceeded = false;

  for (let i = 0; i < allBatch.length; i++) {
    const item = allBatch[i];
    try {
      await requestIndexing(item.url, token, item.type);
      process.stdout.write(`  ✅ [${i + 1}/${allBatch.length}] [${item.type}] ${item.url}\n`);
      if (item.type === 'URL_DELETED') {
        successDeindex++;
        if (item.slug) await markDeindexSubmitted(item.slug);
      } else {
        successIndex++;
      }
    } catch (err) {
      if (err.message.includes('Quota exceeded') || err.message.includes('429')) {
        console.log(`\n  ⚠️ Quota exceeded at ${i + 1}/${allBatch.length} — stopping`);
        quotaExceeded = true;
        break;
      }
      process.stdout.write(`  ❌ [${i + 1}/${allBatch.length}] ${item.url}: ${err.message}\n`);
      failed++;
    }
    if (i < allBatch.length - 1 && !quotaExceeded) await sleep(350);
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log(`  ✅ Indexed: ${successIndex}`);
  console.log(`  🗑  De-indexed: ${successDeindex}`);
  console.log(`  ❌ Failed: ${failed}`);
  if (quotaExceeded) console.log('  ⚠️ Quota exceeded — remainder scheduled for tomorrow');
  console.log(`  📅 Next batch: offset ${effectiveOffset + indexBatch.length}`);
  console.log('═══════════════════════════════════════════════');
}

run().catch(err => {
  console.error('❌ Fatal:', err.message);
  process.exit(1);
});
