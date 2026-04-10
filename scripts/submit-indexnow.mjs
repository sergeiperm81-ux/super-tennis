/**
 * IndexNow bulk submit — sends top pages to Bing/Yandex/Seznam instantly.
 * IndexNow does NOT index Google directly, but reduces crawl latency.
 *
 * Run: node scripts/submit-indexnow.mjs [--limit=200]
 * Requires env: SUPABASE_URL, SUPABASE_SERVICE_KEY
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SITE = 'super.tennis';
const KEY = '91c5dc98807613af2ffb83361ebbd154';
const KEY_LOC = `https://${SITE}/${KEY}.txt`;
const BASE = `https://${SITE}`;

const LIMIT_FLAG = process.argv.find(a => a.startsWith('--limit='));
const LIMIT = LIMIT_FLAG ? parseInt(LIMIT_FLAG.split('=')[1]) : 200;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function collectUrls() {
  const urls = [
    `${BASE}/`,
    `${BASE}/rankings/`,
    `${BASE}/players/`,
    `${BASE}/news/`,
    `${BASE}/calendar/`,
    `${BASE}/gear/`,
    `${BASE}/lifestyle/`,
    `${BASE}/records/`,
    `${BASE}/tournaments/`,
    `${BASE}/vs/`,
  ];

  // Top player pages
  const { data: players } = await supabase
    .from('players')
    .select('slug')
    .not('image_url', 'is', null)
    .gt('career_win', 5)
    .order('career_win', { ascending: false })
    .limit(80);
  for (const p of players || []) urls.push(`${BASE}/players/${p.slug}/`);

  // Latest news
  const { data: news } = await supabase
    .from('news')
    .select('slug')
    .eq('active', true)
    .order('published_at', { ascending: false })
    .limit(50);
  for (const n of news || []) urls.push(`${BASE}/news/${n.slug}/`);

  // VS + gear articles
  const { data: articles } = await supabase
    .from('articles')
    .select('slug, category')
    .in('category', ['vs', 'gear', 'lifestyle', 'records', 'tournaments'])
    .order('created_at', { ascending: false })
    .limit(60);
  for (const a of articles || []) urls.push(`${BASE}/${a.category}/${a.slug}/`);

  return [...new Set(urls)].slice(0, LIMIT);
}

async function submitBatch(urls) {
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ host: SITE, key: KEY, keyLocation: KEY_LOC, urlList: urls }),
  });
  return res.status;
}

async function run() {
  console.log(`\n📤 IndexNow Bulk Submit\n`);
  const urls = await collectUrls();
  console.log(`📋 ${urls.length} URLs collected\n`);

  // IndexNow allows max 10,000 URLs per batch
  const BATCH = 500;
  let submitted = 0;
  for (let i = 0; i < urls.length; i += BATCH) {
    const batch = urls.slice(i, i + BATCH);
    const status = await submitBatch(batch);
    if (status === 200 || status === 202) {
      console.log(`  ✅ Batch ${Math.floor(i / BATCH) + 1}: ${batch.length} URLs → HTTP ${status}`);
      submitted += batch.length;
    } else {
      console.log(`  ⚠️ Batch ${Math.floor(i / BATCH) + 1}: HTTP ${status}`);
    }
  }

  console.log(`\n🎉 Done: ${submitted}/${urls.length} URLs submitted to IndexNow`);
  console.log('   Bing/Yandex/Seznam typically index within 24 hours.');
}

run().catch(err => { console.error('❌', err.message); process.exit(1); });
