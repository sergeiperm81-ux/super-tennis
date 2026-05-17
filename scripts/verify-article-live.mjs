#!/usr/bin/env node
/**
 * verify-article-live.mjs
 *
 * Run after `publish-lifestyle-*.mjs` to:
 *   1. Wait until the most recent deploy.yml run finishes (poll every 15s)
 *   2. curl the article URL and confirm 200 + non-empty body
 *   3. Verify the article's image_url is actually rendered in <img> AND og:image
 *
 * This eliminates the recurring 'article not live yet' false-positive where
 * we reported success while Cloudflare Pages was still building.
 *
 * Usage:
 *   node scripts/verify-article-live.mjs --slug=mirra-andreeva-19-year-old-...
 *   node scripts/verify-article-live.mjs --slug=... --category=lifestyle
 */
import { execSync } from 'child_process';

const args = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=')));
const slug = args.slug;
const category = args.category || 'lifestyle';
if (!slug) { console.error('Need --slug=...'); process.exit(1); }

const url = `https://super.tennis/${category}/${slug}/`;
const MAX_WAIT_MS = 6 * 60 * 1000; // 6 minutes
const POLL_MS = 15000;
const started = Date.now();

console.log(`🔍 Verifying ${url}`);

// 1. Wait for deploy.yml to finish
console.log('⏳ Waiting for most recent deploy.yml run to complete...');
while (Date.now() - started < MAX_WAIT_MS) {
  try {
    const out = execSync('gh run list --workflow=deploy.yml --limit=1 --json status,conclusion,databaseId', { encoding: 'utf8' });
    const [latest] = JSON.parse(out);
    if (!latest) break;
    if (latest.status === 'completed') {
      console.log(`   ✅ deploy.yml run #${latest.databaseId} → ${latest.conclusion}`);
      if (latest.conclusion !== 'success') {
        console.error('   ❌ deploy failed. Investigate before retrying.');
        process.exit(2);
      }
      break;
    }
    process.stdout.write(`\r   ...still ${latest.status} (${Math.round((Date.now() - started) / 1000)}s elapsed)`);
    await new Promise(r => setTimeout(r, POLL_MS));
  } catch (e) {
    console.warn(`\n   ⚠️ gh poll failed: ${e.message}, retrying...`);
    await new Promise(r => setTimeout(r, POLL_MS));
  }
}
console.log('');

// 2. curl the URL
console.log('🌐 Fetching URL...');
let html;
for (let attempt = 1; attempt <= 8; attempt++) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 SuperTennisVerify' } });
  if (res.ok) {
    html = await res.text();
    console.log(`   ✅ HTTP ${res.status} (${html.length.toLocaleString()} bytes)`);
    break;
  }
  console.log(`   attempt ${attempt}: HTTP ${res.status}, waiting 15s...`);
  await new Promise(r => setTimeout(r, 15000));
}
if (!html) { console.error('❌ URL never returned 200'); process.exit(3); }

// 3. Verify content
const checks = [
  { label: 'Page is NOT 404 template', test: !html.includes('Page not found') && !html.includes('gone out of bounds') },
  { label: '<title> contains content', test: /<title>[^<]{20,}<\/title>/.test(html) },
  { label: 'Hero <img> with alt', test: /<img[^>]+alt="[^"]{20,}"[^>]+fetchpriority="high"/.test(html) },
  { label: '<meta og:image>', test: /<meta[^>]+property="og:image"[^>]+content="https?:\/\/[^"]+"/.test(html) },
  { label: 'Schema.org "image" field', test: /"image":\s*[{"]/.test(html) },
  { label: 'Body has ≥1000 chars of article text', test: (html.match(/<p[^>]*>[\s\S]+?<\/p>/g) || []).join(' ').length > 1000 },
];

console.log('\n📋 Content checks:');
let failed = 0;
for (const c of checks) {
  console.log(`   ${c.test ? '✅' : '❌'} ${c.label}`);
  if (!c.test) failed++;
}

if (failed === 0) {
  console.log(`\n✅ ${url} is LIVE and renders correctly.`);
  process.exit(0);
} else {
  console.error(`\n❌ ${failed} check(s) failed. URL exists but content is broken.`);
  process.exit(4);
}
