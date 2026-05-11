#!/usr/bin/env node
/**
 * Find URLs that are in BOTH the sitemap AND _redirects — those are
 * the pages Google sees as "Page with redirect" in Search Console.
 *
 * A sitemap URL that 301s instead of returning 200 is a soft error:
 *   - Cloudflare returns 301 → Google follows to canonical
 *   - But Google reports the listed URL as "not indexed: page with redirect"
 *
 * Fix: remove these URLs from the sitemap OR remove the redirect.
 */
import fs from 'fs';

const SITEMAP_URLS = 'https://super.tennis/sitemap-0.xml';
const REDIRECTS_FILE = 'public/_redirects';

const res = await fetch(SITEMAP_URLS);
const xml = await res.text();
const sitemapUrls = new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => {
  const u = m[1].replace('https://super.tennis', '');
  // Normalize: strip trailing slash for comparison
  return u.replace(/\/$/, '');
}));
console.log(`Sitemap URLs: ${sitemapUrls.size}`);

const redirects = fs.readFileSync(REDIRECTS_FILE, 'utf8');
const redirectSources = new Set();
for (const line of redirects.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const parts = trimmed.split(/\s+/);
  if (parts.length < 2) continue;
  const src = parts[0].replace(/\/$/, '');
  // Skip wildcard / dynamic redirects (we can't statically compare)
  if (src.includes('*') || src.includes(':')) continue;
  redirectSources.add(src);
}
console.log(`Redirect sources: ${redirectSources.size}`);

const conflicts = [];
for (const url of sitemapUrls) {
  if (redirectSources.has(url)) conflicts.push(url);
}

console.log(`\n${conflicts.length} URLs are in BOTH sitemap and _redirects:`);
conflicts.forEach(u => console.log('  ' + u));

// Live-test the redirects from sitemap to see actual responses
if (process.argv.includes('--live-test')) {
  console.log('\nLive-testing sitemap URLs (HEAD requests)...');
  let ok = 0, redirected = 0, errored = 0;
  for (const url of [...sitemapUrls].slice(0, 100)) {
    try {
      const r = await fetch('https://super.tennis' + url, { method: 'HEAD', redirect: 'manual' });
      if (r.status === 200) ok++;
      else if (r.status >= 300 && r.status < 400) { redirected++; console.log(`  ${r.status} ${url} → ${r.headers.get('location')}`); }
      else errored++;
    } catch (e) { errored++; }
  }
  console.log(`\nSampled 100: ${ok} OK, ${redirected} redirected, ${errored} errored`);
}
