/**
 * Google Indexing API — Priority push for the 4 evergreen clusters
 * (Round 1-4: Rules / Rankings explainers / Money / Watch).
 *
 * Runs additively to bulk-indexing.mjs — doesn't touch the daily 200-URL
 * rotation. Use this script after publishing a new cluster to nudge Google
 * to crawl the new URLs within ~24 hours instead of waiting for the
 * day-of-year rotation to reach them.
 *
 * Usage:
 *   GOOGLE_SA_JSON=<base64> node scripts/index-new-clusters.mjs [--dry-run]
 *
 * Quota: each URL counts against the 200/day Google Indexing API limit.
 * This script submits 16 URLs, leaving ~184 for the regular daily rotation.
 */

import 'dotenv/config';
import { GoogleAuth } from 'google-auth-library';

const GOOGLE_SA_JSON = process.env.GOOGLE_SA_JSON;
const DRY_RUN = process.argv.includes('--dry-run');

// The 16 evergreen cluster URLs that need priority indexing. Update this
// list when a new cluster is published.
const PRIORITY_URLS = [
  // Round 1: Rules cluster (published 2026-05-17)
  'https://super.tennis/rules/',
  'https://super.tennis/rules/tennis-scoring-explained/',
  'https://super.tennis/rules/tie-break-rules-explained/',
  'https://super.tennis/rules/how-many-sets-in-tennis/',
  // Round 2: Rankings explainers (published 2026-05-17)
  'https://super.tennis/rankings/how-tennis-rankings-work/',
  'https://super.tennis/rankings/atp-ranking-points-explained/',
  'https://super.tennis/rankings/wta-ranking-points-explained/',
  'https://super.tennis/rankings/live-rankings-vs-official-rankings/',
  // Round 3: Money cluster (published 2026-05-17)
  'https://super.tennis/money/',
  'https://super.tennis/money/tennis-prize-money-explained/',
  'https://super.tennis/money/how-much-tennis-players-earn/',
  'https://super.tennis/money/grand-slam-prize-money-breakdown/',
  // Round 4: Watch cluster (published 2026-05-18)
  'https://super.tennis/watch/',
  'https://super.tennis/watch/where-to-watch-grand-slams/',
  'https://super.tennis/watch/best-tennis-streaming-services/',
  'https://super.tennis/watch/tennis-tv-rights-by-country/',
];

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

async function requestIndexing(url, token) {
  const res = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ url, type: 'URL_UPDATED' }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
  return data;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run() {
  console.log('═════════════════════════════════════════════════════════');
  console.log('  Google Indexing API — Priority Cluster Push');
  console.log('═════════════════════════════════════════════════════════');
  console.log(`  URLs to submit: ${PRIORITY_URLS.length}`);
  console.log(`  Dry run: ${DRY_RUN}`);
  console.log('');

  if (!GOOGLE_SA_JSON && !DRY_RUN) {
    console.error('❌ GOOGLE_SA_JSON not set.');
    console.error('   This script runs in GitHub Actions where the secret is wired up.');
    console.error('   Run locally with --dry-run to test without credentials.');
    process.exit(1);
  }

  let token = null;
  if (!DRY_RUN) {
    console.log('🔑 Authenticating with Google Indexing API...');
    token = await getAuthToken();
    console.log('   ✅ Token acquired');
    console.log('');
  }

  let success = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < PRIORITY_URLS.length; i++) {
    const url = PRIORITY_URLS[i];
    const prefix = `[${String(i + 1).padStart(2)}/${PRIORITY_URLS.length}]`;

    if (DRY_RUN) {
      console.log(`${prefix} DRY-RUN ${url}`);
      success++;
      continue;
    }

    try {
      await requestIndexing(url, token);
      console.log(`${prefix} ✅ ${url}`);
      success++;
      await sleep(250); // small spacing to avoid rate-limit blip
    } catch (e) {
      console.error(`${prefix} ❌ ${url} — ${e.message}`);
      errors.push({ url, error: e.message });
      failed++;
    }
  }

  console.log('');
  console.log('═════════════════════════════════════════════════════════');
  console.log(`  Success: ${success} / ${PRIORITY_URLS.length}`);
  console.log(`  Failed:  ${failed}`);
  console.log('═════════════════════════════════════════════════════════');

  if (failed > 0) {
    console.log('');
    console.log('Failed URLs:');
    for (const err of errors) console.log(`  - ${err.url}: ${err.error}`);
    process.exit(1);
  }
}

run().catch(err => {
  console.error('💥 Fatal error:', err.message);
  process.exit(1);
});
