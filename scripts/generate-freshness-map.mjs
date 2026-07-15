#!/usr/bin/env node
/**
 * Freshness map generator — runs at build time.
 *
 * Codex SEO audit Round 3: sitemap.xml previously assigned a hardcoded
 * `stable_2026 = '2026-05-01'` lastmod to every evergreen article URL.
 * This meant when the content-refresh Worker bumped `articles.updated_at`
 * in Supabase, the sitemap didn't reflect it — so Google had no signal
 * that the page was refreshed.
 *
 * This script reads `updated_at` for every published article + every
 * news item from Supabase and writes a JSON freshness map keyed by URL
 * path. astro.config.mjs's sitemap.serialize() reads this map and uses
 * real per-URL lastmod values, falling back to the old stable dates
 * only when no map entry exists.
 *
 * Run order in package.json:
 *   npm run build → astro build (uses freshness-map.json) → sitemap-images
 *
 * Since this generates a file that astro.config.mjs imports, we have to
 * run it BEFORE astro build. Wired as a "prebuild" npm script.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('[freshness-map] Missing SUPABASE creds — writing empty map');
  fs.writeFileSync(
    path.resolve(process.cwd(), 'src/data/freshness-map.json'),
    JSON.stringify({}, null, 2),
  );
  process.exit(0);
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

function isoDate(dateInput) {
  if (!dateInput) return null;
  try {
    const d = new Date(dateInput);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

async function fetchArticles() {
  const all = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await sb
      .from('articles')
      .select('slug, category, updated_at, published_at')
      .eq('status', 'published')
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

async function fetchNews() {
  // news table has no updated_at column — use published_at as freshness.
  const all = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await sb
      .from('news')
      .select('slug, published_at')
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

// Mirrors PLAYERS_CACHE_FILTER in src/lib/supabase.ts — the players the site
// actually builds pages for. Without it we pulled all 136,025 rows on every
// build just to date ~1,200 sitemap entries, which was a large share of the
// egress that tripped Supabase into HTTP 402 on 2026-07-15. Players outside the
// filter simply get no lastmod, which the sitemap already tolerates.
const PLAYERS_FILTER = 'career_titles.gt.0,career_win.gt.20,career_prize_usd.gt.0';

async function fetchPlayers() {
  const all = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await sb
      .from('players')
      .select('slug, stats_updated_at')
      .or(PLAYERS_FILTER)
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

async function main() {
  console.log('🔄 Generating freshness map from Supabase...');
  const startMs = Date.now();

  let articles = [];
  let news = [];
  let players = [];
  try {
    [articles, news, players] = await Promise.all([
      fetchArticles(),
      fetchNews(),
      fetchPlayers(),
    ]);
  } catch (e) {
    console.error('[freshness-map] Supabase fetch failed:', e.message);
    console.warn('[freshness-map] Writing empty map and continuing.');
    fs.writeFileSync(
      path.resolve(process.cwd(), 'src/data/freshness-map.json'),
      JSON.stringify({}, null, 2),
    );
    return;
  }

  const map = {};

  for (const a of articles) {
    const date = isoDate(a.updated_at) || isoDate(a.published_at);
    if (!date || !a.category || !a.slug) continue;
    map[`/${a.category}/${a.slug}/`] = date;
  }

  for (const n of news) {
    const date = isoDate(n.published_at);
    if (!date || !n.slug) continue;
    map[`/news/${n.slug}/`] = date;
  }

  for (const p of players) {
    const date = isoDate(p.stats_updated_at);
    if (!date || !p.slug) continue;
    map[`/players/${p.slug}/`] = date;
  }

  // Ensure target directory exists
  const outPath = path.resolve(process.cwd(), 'src/data/freshness-map.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(map, null, 2));

  const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
  console.log(`✅ Freshness map written to ${outPath}`);
  console.log(`   ${Object.keys(map).length} URLs (${articles.length} articles + ${news.length} news + ${players.length} players)`);
  console.log(`   Generated in ${elapsed}s`);
}

main().catch(err => {
  console.error('[freshness-map] Fatal error:', err);
  process.exit(1);
});
