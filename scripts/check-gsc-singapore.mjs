#!/usr/bin/env node
/**
 * One-shot: query Google Search Console for top queries + pages
 * from Singapore on May 4-5. Uses the same GOOGLE_SA_JSON we already
 * use for the Indexing API (service account must also have Search
 * Console "Owner" or "Full" access on the property).
 */
import 'dotenv/config';
import { GoogleAuth } from 'google-auth-library';

const SA_JSON = process.env.GOOGLE_SA_JSON;
if (!SA_JSON) { console.error('Missing GOOGLE_SA_JSON'); process.exit(1); }

const sa = JSON.parse(Buffer.from(SA_JSON, 'base64').toString('utf8'));
const auth = new GoogleAuth({
  credentials: sa,
  scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
});
const client = await auth.getClient();
const tok = (await client.getAccessToken()).token;

const SITE = 'sc-domain:super.tennis';
const URL = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`;

async function query(body) {
  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${tok}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  return data;
}

console.log('=== Top SINGAPORE landing pages May 4-5 ===');
const pages = await query({
  startDate: '2026-05-03', endDate: '2026-05-06',
  dimensions: ['page'],
  dimensionFilterGroups: [{ filters: [{ dimension: 'country', operator: 'equals', expression: 'sgp' }] }],
  rowLimit: 20,
});
(pages.rows || []).forEach(r => console.log(`  ${String(r.clicks).padStart(4)} clicks | ${String(r.impressions).padStart(5)} impr | ${(r.ctr*100).toFixed(1)}% | pos ${r.position.toFixed(1)} | ${r.keys[0]}`));

console.log('\n=== Top SINGAPORE search queries May 4-5 ===');
const queries = await query({
  startDate: '2026-05-03', endDate: '2026-05-06',
  dimensions: ['query'],
  dimensionFilterGroups: [{ filters: [{ dimension: 'country', operator: 'equals', expression: 'sgp' }] }],
  rowLimit: 20,
});
(queries.rows || []).forEach(r => console.log(`  ${String(r.clicks).padStart(4)} clicks | ${String(r.impressions).padStart(5)} impr | ${(r.ctr*100).toFixed(1)}% | "${r.keys[0]}"`));

console.log('\n=== TOP COUNTRIES May 4-5 (for context) ===');
const countries = await query({
  startDate: '2026-05-03', endDate: '2026-05-06',
  dimensions: ['country'],
  rowLimit: 10,
});
(countries.rows || []).forEach(r => console.log(`  ${String(r.clicks).padStart(5)} clicks | ${String(r.impressions).padStart(6)} impr | ${r.keys[0].toUpperCase()}`));
