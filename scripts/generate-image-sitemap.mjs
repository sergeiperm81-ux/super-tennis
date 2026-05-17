#!/usr/bin/env node
/**
 * Image sitemap generator — runs after Astro build.
 *
 * GSC reports 0 image-search impressions for SUPER.TENNIS despite 1,100+
 * player photos and 500+ article images on the site. Google's image
 * crawler discovers images via the standard sitemap, but a dedicated
 * image sitemap with semantic metadata (caption, title, geo) dramatically
 * accelerates indexing for image search.
 *
 * Spec: https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps
 *
 * Run as `npm run sitemap:images` or after `astro build`.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
const BASE = 'https://super.tennis';

function escapeXml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function fetchAllPlayers() {
  const all = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await sb.from('players')
      .select('slug, first_name, last_name, country_code, image_url')
      .not('image_url', 'is', null)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

async function fetchAllArticles() {
  const all = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await sb.from('articles')
      .select('slug, category, title, image_url, image_alt')
      .eq('status', 'published')
      .not('image_url', 'is', null)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

async function fetchActiveNews() {
  const all = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await sb.from('news')
      .select('slug, title, summary, image_url, published_at')
      .eq('is_active', true)
      .not('image_url', 'is', null)
      .gte('published_at', '2026-01-01')  // exclude oldest archive
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

console.log('🖼  Generating image sitemap...');
const [players, articles, news] = await Promise.all([
  fetchAllPlayers(),
  fetchAllArticles(),
  fetchActiveNews(),
]);
console.log(`   ${players.length} player images, ${articles.length} article images, ${news.length} news images`);

const entries = [];

// Players — each profile URL gets its image
for (const p of players) {
  const pageUrl = `${BASE}/players/${p.slug}/`;
  const imageUrl = p.image_url.startsWith('http') ? p.image_url : `${BASE}${p.image_url}`;
  const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim();
  const caption = fullName
    ? `${fullName} — ATP/WTA tennis player profile photo${p.country_code ? ` (${p.country_code})` : ''}`
    : 'Tennis player profile photo';
  entries.push({ loc: pageUrl, image: imageUrl, caption, title: fullName || 'Tennis player' });
}

// Articles
for (const a of articles) {
  const pageUrl = `${BASE}/${a.category}/${a.slug}/`;
  const imageUrl = a.image_url.startsWith('http') ? a.image_url : `${BASE}${a.image_url}`;
  const caption = a.image_alt || `${a.title} — SUPER.TENNIS ${a.category} article`;
  entries.push({ loc: pageUrl, image: imageUrl, caption, title: a.title });
}

// News
for (const n of news) {
  const pageUrl = `${BASE}/news/${n.slug}/`;
  const imageUrl = n.image_url.startsWith('http') ? n.image_url : `${BASE}${n.image_url}`;
  const caption = (n.summary || `${n.title} — tennis news`).slice(0, 200);
  entries.push({ loc: pageUrl, image: imageUrl, caption, title: n.title });
}

console.log(`   ${entries.length} total entries`);

// Group entries by page URL — sitemap spec allows multiple <image:image>
// per <url>, but we only have one image per page so this is just direct mapping.
const xml = [];
xml.push('<?xml version="1.0" encoding="UTF-8"?>');
xml.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
xml.push('        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">');
for (const e of entries) {
  xml.push('  <url>');
  xml.push(`    <loc>${escapeXml(e.loc)}</loc>`);
  xml.push('    <image:image>');
  xml.push(`      <image:loc>${escapeXml(e.image)}</image:loc>`);
  xml.push(`      <image:title>${escapeXml(e.title)}</image:title>`);
  xml.push(`      <image:caption>${escapeXml(e.caption)}</image:caption>`);
  xml.push('    </image:image>');
  xml.push('  </url>');
}
xml.push('</urlset>');

// Write to dist (built site) AND public (copy to dist on next build)
const xmlStr = xml.join('\n');
const distPath = 'dist/sitemap-images.xml';
const publicPath = 'public/sitemap-images.xml';

if (fs.existsSync('dist')) {
  fs.writeFileSync(distPath, xmlStr);
  console.log(`✅ ${distPath} (${(xmlStr.length / 1024).toFixed(1)} KB)`);
}
fs.writeFileSync(publicPath, xmlStr);
console.log(`✅ ${publicPath} (${(xmlStr.length / 1024).toFixed(1)} KB)`);
console.log(`   Sample: ${entries[0]?.loc}`);
console.log(`           ${entries[0]?.image}`);
