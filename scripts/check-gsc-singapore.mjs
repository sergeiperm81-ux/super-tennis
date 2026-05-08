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

async function dump(label, body) {
  try {
    const data = await query(body);
    console.log(`\n=== ${label} (${(data.rows||[]).length} rows) ===`);
    (data.rows || []).forEach(r => {
      const k = r.keys.join(' | ');
      console.log(`  ${String(r.clicks).padStart(4)}c ${String(r.impressions).padStart(5)}i ${(r.ctr*100).toFixed(1)}% pos ${r.position?.toFixed(1)||'-'} | ${k}`);
    });
  } catch (e) { console.error(`  ERROR: ${e.message}`); }
}

await dump('TOP COUNTRIES May 1-7 (entire site)', {
  startDate: '2026-05-01', endDate: '2026-05-07',
  dimensions: ['country'], rowLimit: 15,
});

await dump('SINGAPORE pages May 1-7', {
  startDate: '2026-05-01', endDate: '2026-05-07',
  dimensions: ['page'],
  dimensionFilterGroups: [{ filters: [{ dimension: 'country', operator: 'equals', expression: 'sgp' }] }],
  rowLimit: 20,
});

await dump('SINGAPORE queries May 1-7', {
  startDate: '2026-05-01', endDate: '2026-05-07',
  dimensions: ['query'],
  dimensionFilterGroups: [{ filters: [{ dimension: 'country', operator: 'equals', expression: 'sgp' }] }],
  rowLimit: 20,
});

await dump('TOP PAGES May 4 (any country)', {
  startDate: '2026-05-04', endDate: '2026-05-04',
  dimensions: ['page'], rowLimit: 15,
});

await dump('TOP PAGES May 5 (any country)', {
  startDate: '2026-05-05', endDate: '2026-05-05',
  dimensions: ['page'], rowLimit: 15,
});

await dump('TOP QUERIES May 4 (any country)', {
  startDate: '2026-05-04', endDate: '2026-05-04',
  dimensions: ['query'], rowLimit: 15,
});

await dump('Last 28 days - top countries', {
  startDate: new Date(Date.now() - 28 * 86400000).toISOString().split('T')[0],
  endDate: new Date().toISOString().split('T')[0],
  dimensions: ['country'], rowLimit: 15,
});
