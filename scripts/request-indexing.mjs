/**
 * Google Indexing API — request indexing for priority pages
 *
 * Uses Google Search Console API service account to submit URLs
 * for fast indexing (works best for player profiles + news articles).
 *
 * Setup:
 *   1. Create Service Account in Google Cloud Console
 *   2. Add it as owner in GSC: Settings → Users and permissions
 *   3. Download service-account.json → store as GOOGLE_SA_JSON env var (base64)
 *   4. Run: node scripts/request-indexing.mjs [--limit=100] [--type=news|players|all]
 *
 * Requires env:
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY, GOOGLE_SA_JSON (base64 encoded)
 *
 * Quota: 200 URLs/day free, resets midnight Pacific time
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { GoogleAuth } from 'google-auth-library';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const GOOGLE_SA_JSON = process.env.GOOGLE_SA_JSON;
const SITE_BASE = 'https://super.tennis';

const LIMIT_FLAG = process.argv.find(a => a.startsWith('--limit='));
const LIMIT = LIMIT_FLAG ? parseInt(LIMIT_FLAG.split('=')[1]) : 100;
const TYPE_FLAG = process.argv.find(a => a.startsWith('--type='));
const TYPE = TYPE_FLAG ? TYPE_FLAG.split('=')[1] : 'all';
const DRY_RUN = process.argv.includes('--dry-run');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}
if (!GOOGLE_SA_JSON && !DRY_RUN) {
  console.error('❌ Missing GOOGLE_SA_JSON (base64 encoded service account JSON)');
  console.error('   To test without it, use --dry-run');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
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

async function collectUrls() {
  const urls = [];

  if (TYPE === 'all' || TYPE === 'players') {
    // Top player profiles
    const { data: players } = await supabase
      .from('players')
      .select('slug, image_url, career_win')
      .not('image_url', 'is', null)
      .gt('career_win', 10)
      .order('career_win', { ascending: false })
      .limit(Math.ceil(LIMIT * 0.4));

    for (const p of players || []) {
      urls.push(`${SITE_BASE}/players/${p.slug}/`);
    }
  }

  if (TYPE === 'all' || TYPE === 'news') {
    // Most recent news articles
    const { data: news } = await supabase
      .from('news')
      .select('slug, published_at')
      .eq('active', true)
      .order('published_at', { ascending: false })
      .limit(Math.ceil(LIMIT * 0.4));

    for (const n of news || []) {
      urls.push(`${SITE_BASE}/news/${n.slug}/`);
    }
  }

  if (TYPE === 'all' || TYPE === 'articles') {
    // VS articles + gear + lifestyle
    const { data: articles } = await supabase
      .from('articles')
      .select('slug, category, created_at')
      .in('category', ['vs', 'gear', 'lifestyle', 'records'])
      .order('created_at', { ascending: false })
      .limit(Math.ceil(LIMIT * 0.2));

    for (const a of articles || []) {
      urls.push(`${SITE_BASE}/${a.category}/${a.slug}/`);
    }
  }

  // Always include key static pages
  const staticPages = [
    `${SITE_BASE}/`,
    `${SITE_BASE}/rankings/`,
    `${SITE_BASE}/players/`,
    `${SITE_BASE}/news/`,
    `${SITE_BASE}/calendar/`,
  ];
  urls.unshift(...staticPages);

  return [...new Set(urls)].slice(0, LIMIT);
}

async function run() {
  console.log(`\n🔍 Google Indexing API\n  Type: ${TYPE}\n  Limit: ${LIMIT}\n  Dry run: ${DRY_RUN}\n`);

  const urls = await collectUrls();
  console.log(`📋 Collected ${urls.length} URLs to submit\n`);

  if (DRY_RUN) {
    urls.forEach((u, i) => console.log(`  ${i + 1}. ${u}`));
    console.log('\n🏜️ Dry run complete — no requests sent');
    return;
  }

  const token = await getAuthToken();
  let success = 0, failed = 0;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      await requestIndexing(url, token);
      console.log(`  ✅ [${i + 1}/${urls.length}] ${url}`);
      success++;
    } catch (err) {
      console.log(`  ❌ [${i + 1}/${urls.length}] ${url}: ${err.message}`);
      failed++;
    }
    // Rate limit: 600 req/min max, but stay polite
    if (i < urls.length - 1) await sleep(400);
  }

  console.log(`\n🎉 Done: ${success} submitted, ${failed} failed`);
  console.log('   Google typically indexes submitted pages within 24-48 hours.');
}

run().catch(err => {
  console.error('❌ Fatal:', err.message);
  process.exit(1);
});
