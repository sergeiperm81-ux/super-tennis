#!/usr/bin/env node
/**
 * Submit URL_DELETED notifications to Google Indexing API for soft-deleted news.
 *
 * Tells Google to drop indexed pages from search results faster than waiting
 * for re-crawl to discover the 404. Uses the same service account as
 * bulk-indexing.mjs.
 *
 * Quota: 200 URLs/day per service account (resets midnight Pacific).
 * 394 deleted URLs ÷ 200 = 2 days to fully process.
 *
 * Usage:
 *   node scripts/submit-deindex.mjs            # submit up to 200
 *   node scripts/submit-deindex.mjs --dry-run  # preview only
 *   node scripts/submit-deindex.mjs --limit=50 # cap at 50
 */

import 'dotenv/config';
import { GoogleAuth } from 'google-auth-library';
import { createClient } from '@supabase/supabase-js';

const GOOGLE_SA_JSON = process.env.GOOGLE_SA_JSON;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const limitFlag = args.find(a => a.startsWith('--limit='));
const LIMIT = limitFlag ? parseInt(limitFlag.split('=')[1], 10) : 200;

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const sleep = ms => new Promise(r => setTimeout(r, ms));

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

async function submitDeindex(url, token) {
  const res = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ url, type: 'URL_DELETED' }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
  return data;
}

async function run() {
  console.log('═══════════════════════════════════════════════');
  console.log('  Google Indexing API — Bulk De-indexer');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Limit: ${LIMIT} URLs (per-day quota: 200)`);
  console.log(`  Dry run: ${DRY_RUN}`);
  console.log('');

  if (!GOOGLE_SA_JSON && !DRY_RUN) {
    console.error('❌ GOOGLE_SA_JSON not set. See bulk-indexing.mjs setup.');
    process.exit(1);
  }

  // Fetch soft-deleted news that hasn't been de-indexed yet (we track this
  // by adding a deindex_submitted_at flag; for now, just fetch all inactive).
  let off = 0;
  const all = [];
  while (true) {
    const { data, error } = await sb.from('news')
      .select('slug, deindex_submitted_at')
      .eq('is_active', false)
      .is('deindex_submitted_at', null)
      .range(off, off + 999);
    if (error) {
      // Column might not exist yet — try without filter
      if (error.message?.includes('deindex_submitted_at')) {
        console.log('   ℹ️ deindex_submitted_at column missing — fetching all inactive');
        const { data: data2, error: error2 } = await sb.from('news')
          .select('slug')
          .eq('is_active', false)
          .range(off, off + 999);
        if (error2) { console.error(error2); process.exit(1); }
        if (!data2 || !data2.length) break;
        all.push(...data2);
        if (data2.length < 1000) break;
        off += 1000;
        continue;
      }
      console.error(error); process.exit(1);
    }
    if (!data || !data.length) break;
    all.push(...data);
    if (data.length < 1000) break;
    off += 1000;
  }
  console.log(`📋 Found ${all.length} URLs to de-index\n`);

  if (all.length === 0) {
    console.log('✅ Nothing to do');
    return;
  }

  const batch = all.slice(0, LIMIT);
  const urls = batch.map(r => `https://super.tennis/news/${r.slug}/`);

  if (DRY_RUN) {
    console.log('Sample of URLs to submit:');
    urls.slice(0, 10).forEach(u => console.log('  -', u));
    if (urls.length > 10) console.log(`  ... and ${urls.length - 10} more`);
    console.log(`\n[DRY RUN] Would submit ${urls.length} URL_DELETED notifications`);
    return;
  }

  const token = await getAuthToken();
  let success = 0;
  let failed = 0;
  let quotaExceeded = false;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      await submitDeindex(url, token);
      success++;
      if (success % 25 === 0) console.log(`  ✅ ${success}/${urls.length}`);

      // Mark as submitted (best-effort — column may not exist)
      try {
        await sb.from('news')
          .update({ deindex_submitted_at: new Date().toISOString() })
          .eq('slug', batch[i].slug);
      } catch { /* column missing, ignore */ }
    } catch (err) {
      if (err.message.includes('Quota exceeded') || err.message.includes('429')) {
        console.log(`\n  ⚠️ Quota exceeded at ${i + 1}/${urls.length} — stopping`);
        quotaExceeded = true;
        break;
      }
      failed++;
      console.error(`  ❌ ${url}: ${err.message}`);
    }
    if (i < urls.length - 1 && !quotaExceeded) await sleep(350);
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log(`  ✅ De-index requests submitted: ${success}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📋 Remaining: ${all.length - success}`);
  if (quotaExceeded) console.log('  ⚠️ Daily quota hit — re-run tomorrow');
  console.log('═══════════════════════════════════════════════');
}

run().catch(err => {
  console.error('❌ Fatal:', err.message);
  process.exit(1);
});
