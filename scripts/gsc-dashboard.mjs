#!/usr/bin/env node
/**
 * GSC analytics dashboard — comprehensive report on site traffic, indexing
 * status, top pages, and week-over-week trends. Pulls from Search Console API
 * and prints a structured report.
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

async function query(body) {
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

const today = new Date();
const fmt = (d) => d.toISOString().split('T')[0];
const daysAgo = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return fmt(d); };

const THIS_WEEK_START = daysAgo(7);
const THIS_WEEK_END = daysAgo(1);
const LAST_WEEK_START = daysAgo(14);
const LAST_WEEK_END = daysAgo(8);
const LAST_28_START = daysAgo(28);

function totals(rows) {
  return (rows || []).reduce(
    (acc, r) => ({ clicks: acc.clicks + r.clicks, impressions: acc.impressions + r.impressions }),
    { clicks: 0, impressions: 0 }
  );
}

function deltaStr(curr, prev) {
  if (prev === 0) return curr > 0 ? `+${curr} (∞%)` : '0 (=)';
  const pct = ((curr - prev) / prev * 100).toFixed(1);
  const sign = curr >= prev ? '+' : '';
  return `${sign}${curr - prev} (${sign}${pct}%)`;
}

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║  SUPER.TENNIS — Google Search Console dashboard                  ║');
console.log(`║  Reporting window: ${THIS_WEEK_START} → ${THIS_WEEK_END} (last 7 days)     ║`);
console.log('╚═══════════════════════════════════════════════════════════════╝');

// 1. Week-over-week site total
console.log('\n📊 WEEK-OVER-WEEK SITE TOTAL');
const thisWeek = await query({ startDate: THIS_WEEK_START, endDate: THIS_WEEK_END, dimensions: ['date'], rowLimit: 7 });
const lastWeek = await query({ startDate: LAST_WEEK_START, endDate: LAST_WEEK_END, dimensions: ['date'], rowLimit: 7 });
const tT = totals(thisWeek.rows);
const tL = totals(lastWeek.rows);
console.log(`   Clicks:      ${tT.clicks.toString().padStart(5)}   (last week: ${tL.clicks})   ${deltaStr(tT.clicks, tL.clicks)}`);
console.log(`   Impressions: ${tT.impressions.toString().padStart(5)}   (last week: ${tL.impressions})   ${deltaStr(tT.impressions, tL.impressions)}`);
if (tT.impressions > 0) {
  const ctr = (tT.clicks / tT.impressions * 100).toFixed(2);
  console.log(`   CTR:         ${ctr}%`);
}

// 2. Daily breakdown — this week
console.log('\n📅 DAILY BREAKDOWN (this week)');
(thisWeek.rows || []).forEach(r => {
  console.log(`   ${r.keys[0]}: ${String(r.clicks).padStart(3)} clicks, ${String(r.impressions).padStart(5)} impressions, ${(r.ctr*100).toFixed(2)}% CTR, avg pos ${r.position?.toFixed(1) || '-'}`);
});

// 3. Top queries (last 28 days)
console.log('\n🔍 TOP SEARCH QUERIES (last 28 days, by clicks)');
const topQueries = await query({
  startDate: LAST_28_START, endDate: THIS_WEEK_END,
  dimensions: ['query'], rowLimit: 25,
});
const qWithClicks = (topQueries.rows || []).filter(r => r.clicks > 0).slice(0, 15);
if (qWithClicks.length === 0) {
  console.log('   (no clicks yet — site too new)');
} else {
  qWithClicks.forEach(r => {
    console.log(`   ${String(r.clicks).padStart(3)} clicks  ${String(r.impressions).padStart(5)} impr  pos ${r.position?.toFixed(1) || '-'}  "${r.keys[0]}"`);
  });
}

// Queries with high impressions but 0 clicks (opportunity)
console.log('\n💎 HIGH-IMPRESSION QUERIES WITH 0 CLICKS (SEO opportunities)');
const opp = (topQueries.rows || []).filter(r => r.clicks === 0 && r.impressions >= 5).slice(0, 10);
if (opp.length === 0) console.log('   (none yet)');
else opp.forEach(r => {
  console.log(`   ${String(r.impressions).padStart(4)} impr  pos ${r.position?.toFixed(1) || '-'}  "${r.keys[0]}"`);
});

// 4. Top pages (last 28 days)
console.log('\n📄 TOP PAGES (last 28 days, by clicks)');
const topPages = await query({
  startDate: LAST_28_START, endDate: THIS_WEEK_END,
  dimensions: ['page'], rowLimit: 25,
});
const pWithClicks = (topPages.rows || []).filter(r => r.clicks > 0).slice(0, 15);
if (pWithClicks.length === 0) {
  console.log('   (no clicks yet on any page)');
} else {
  pWithClicks.forEach(r => {
    const url = r.keys[0].replace('https://super.tennis', '');
    console.log(`   ${String(r.clicks).padStart(3)} clicks  ${String(r.impressions).padStart(5)} impr  pos ${r.position?.toFixed(1) || '-'}  ${url}`);
  });
}

// Highest-impression pages (regardless of clicks)
console.log('\n👁  HIGHEST-IMPRESSION PAGES (visibility leaders)');
const visPages = [...(topPages.rows || [])].sort((a, b) => b.impressions - a.impressions).slice(0, 10);
visPages.forEach(r => {
  const url = r.keys[0].replace('https://super.tennis', '');
  console.log(`   ${String(r.impressions).padStart(4)} impr  ${String(r.clicks).padStart(2)} clicks  pos ${r.position?.toFixed(1) || '-'}  ${url}`);
});

// 5. Top countries
console.log('\n🌍 TOP COUNTRIES (last 28 days)');
const topCountries = await query({
  startDate: LAST_28_START, endDate: THIS_WEEK_END,
  dimensions: ['country'], rowLimit: 15,
});
(topCountries.rows || []).forEach(r => {
  console.log(`   ${r.keys[0].toUpperCase()}  ${String(r.clicks).padStart(3)} clicks  ${String(r.impressions).padStart(5)} impr  pos ${r.position?.toFixed(1) || '-'}`);
});

// 6. Device breakdown
console.log('\n📱 DEVICE BREAKDOWN (last 28 days)');
const topDevices = await query({
  startDate: LAST_28_START, endDate: THIS_WEEK_END,
  dimensions: ['device'], rowLimit: 5,
});
(topDevices.rows || []).forEach(r => {
  console.log(`   ${r.keys[0].toUpperCase().padEnd(8)}  ${String(r.clicks).padStart(3)} clicks  ${String(r.impressions).padStart(5)} impr  pos ${r.position?.toFixed(1) || '-'}`);
});

// 7. Search type (web/image/video)
console.log('\n🔎 SEARCH TYPE (last 28 days)');
for (const type of ['web', 'image', 'video']) {
  try {
    const data = await query({
      startDate: LAST_28_START, endDate: THIS_WEEK_END,
      type, rowLimit: 1, dimensions: ['date'],
    });
    const t = totals(data.rows);
    console.log(`   ${type.toUpperCase().padEnd(6)}  ${String(t.clicks).padStart(3)} clicks  ${String(t.impressions).padStart(5)} impressions`);
  } catch (e) { console.log(`   ${type}: error - ${e.message}`); }
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('Sources:');
console.log(`  Search Console:        https://search.google.com/search-console`);
console.log(`  Cloudflare Pages:      https://dash.cloudflare.com (Web Analytics)`);
console.log(`  Microsoft Clarity:     https://clarity.microsoft.com (project w1th9vjy1k)`);
