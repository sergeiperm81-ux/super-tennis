#!/usr/bin/env node
/**
 * Investigates the "Page with redirect" GSC report.
 *
 * Approach:
 *   1. Pull top pages that have impressions (Google found them)
 *   2. URL-inspect a sample — Google's view of each URL
 *      (indexing status, canonical, last crawl, etc.)
 *   3. Identify pages stuck in "URL redirects to another URL" status
 */
import 'dotenv/config';
import { GoogleAuth } from 'google-auth-library';

const SA = JSON.parse(Buffer.from(process.env.GOOGLE_SA_JSON, 'base64').toString('utf8'));
const auth = new GoogleAuth({
  credentials: SA,
  scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
});
const client = await auth.getClient();
const tok = (await client.getAccessToken()).token;

const SITE = 'sc-domain:super.tennis';

async function searchAnalytics(body) {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${tok}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  return data;
}

async function urlInspect(inspectionUrl) {
  const url = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${tok}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      inspectionUrl,
      siteUrl: SITE,
    }),
  });
  const data = await res.json();
  if (!res.ok) return { error: data?.error?.message || `HTTP ${res.status}` };
  return data.inspectionResult || data;
}

// Test specific URLs we KNOW are 301'd to see what GSC says about them
const REDIRECTS_TO_CHECK = [
  // Old slugs (should be redirected)
  'https://super.tennis/vs/zverev-vs-alcaraz-masters-rivalry/',
  'https://super.tennis/records/fastest-serve-tennis/',
  'https://super.tennis/lifestyle/tennis-diet-nutrition/',
  'https://super.tennis/gear/best-tennis-balls-2026/',
  'https://super.tennis/tournaments/indian-wells-guide/',
  // Player sub-pages (should redirect to /players/X/)
  'https://super.tennis/players/jannik-sinner/stats/',
  'https://super.tennis/players/coco-gauff/net-worth/',
  // Canonical URLs (should be indexed)
  'https://super.tennis/vs/zverev-vs-alcaraz/',
  'https://super.tennis/players/jannik-sinner/',
  'https://super.tennis/',
];

console.log('=== URL Inspection results ===\n');
for (const u of REDIRECTS_TO_CHECK) {
  const r = await urlInspect(u);
  if (r.error) {
    console.log(`❌ ${u}\n   ${r.error}\n`);
    continue;
  }
  const idx = r.indexStatusResult || {};
  console.log(`URL: ${u}`);
  console.log(`  Verdict        : ${idx.verdict || '?'}`);
  console.log(`  Coverage state : ${idx.coverageState || '?'}`);
  console.log(`  Index status   : ${idx.indexingState || '?'}`);
  console.log(`  Last crawl     : ${idx.lastCrawlTime || 'never'}`);
  console.log(`  Page fetch     : ${idx.pageFetchState || '?'}`);
  console.log(`  Robots         : ${idx.robotsTxtState || '?'}`);
  console.log(`  Google canonical: ${idx.googleCanonical || '(same)'}`);
  console.log(`  User canonical  : ${idx.userCanonical || '(same)'}`);
  console.log('');
  await new Promise(r => setTimeout(r, 500));
}
