// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Load per-URL freshness map (generated pre-build by
// scripts/generate-freshness-map.mjs from Supabase article.updated_at,
// news.updated_at, players.stats_updated_at). Empty object if missing
// (e.g. local dev without Supabase creds).
const __dirname = dirname(fileURLToPath(import.meta.url));
let freshnessMap = {};
try {
  const raw = readFileSync(resolve(__dirname, 'src/data/freshness-map.json'), 'utf8');
  freshnessMap = JSON.parse(raw);
} catch (e) {
  console.warn('[astro.config] freshness-map.json missing — falling back to stable dates');
}

const BASE = 'https://super.tennis';

/**
 * Extract URL path from full URL (e.g. https://super.tennis/lifestyle/x/ → /lifestyle/x/).
 */
function urlPath(fullUrl) {
  if (!fullUrl.startsWith(BASE)) return null;
  return fullUrl.slice(BASE.length) || '/';
}

export default defineConfig({
  site: 'https://super.tennis',
  integrations: [
    react(),
    sitemap({
      serialize(item) {
        const url = item.url;
        const today = new Date().toISOString().split('T')[0];
        // 2026-05-17: stop tagging EVERY URL with today's lastmod — Google
        // discounts this as a false-freshness signal. Now: only true-daily
        // content (homepage, rankings, calendar, news index) gets today.
        // Evergreen content gets a stable older date so freshness signals
        // mean something when articles ARE updated.
        const truly_daily = url === 'https://super.tennis/' ||
                            url.includes('/rankings/') ||
                            url === 'https://super.tennis/news/' ||
                            url === 'https://super.tennis/calendar/';
        const stable_2026 = '2026-05-01'; // global evergreen anchor
        const stable_2025 = '2025-09-01'; // older static pages

        // Look up real updated_at from the freshness map first — when the
        // content-refresh Worker bumps Supabase.updated_at, the next build
        // emits a fresh lastmod for that URL. Falls back to stable dates.
        const path = urlPath(url);
        const realFreshness = path ? freshnessMap[path] : null;

        if (truly_daily) {
          item.lastmod = today;
        } else if (realFreshness) {
          item.lastmod = realFreshness;
        } else if (url.includes('/news/') || /\/\d{4}-\d{2}-\d{2}-/.test(url)) {
          // Individual news items keep recent lastmod since they ARE recent
          item.lastmod = today;
        } else if (url.includes('/about') || url.includes('/faq') || url.includes('/contact') ||
                   url.includes('/privacy') || url.includes('/terms') || url.includes('/authors/')) {
          item.lastmod = stable_2025;
        } else {
          // articles, players, vs, gear, lifestyle, records, tournaments — evergreen
          item.lastmod = stable_2026;
        }

        // Priority tiers:
        // 1.0 — Homepage + Rankings (highest traffic)
        // 0.9 — Player profiles, News articles, VS pages
        // 0.8 — Gear, Lifestyle, Records articles
        // 0.7 — Tournaments, Calendar, Search
        // 0.5 — Legal, About, FAQ (low SEO value)
        // Skip stats/ (password-protected)

        if (url === 'https://super.tennis/' || url.includes('/rankings/')) {
          item.priority = 1.0;
          item.changefreq = 'daily';
        } else if (
          url.includes('/players/') ||
          url.includes('/news/') ||
          url.includes('/vs/')
        ) {
          item.priority = 0.9;
          item.changefreq = 'weekly';
        } else if (
          url.includes('/gear/') ||
          url.includes('/lifestyle/') ||
          url.includes('/records/')
        ) {
          item.priority = 0.8;
          item.changefreq = 'monthly';
        } else if (
          url.includes('/tournaments/') ||
          url.includes('/calendar/')
        ) {
          item.priority = 0.7;
          item.changefreq = 'monthly';
        } else if (
          url.includes('/search/') ||
          url.includes('/privacy') ||
          url.includes('/terms') ||
          url.includes('/about') ||
          url.includes('/faq') ||
          url.includes('/contact') ||
          url.includes('/stats/') ||
          url.includes('/authors/')
        ) {
          // Drop utility / service pages from sitemap — Codex audit 2026-05-17.
          // Was including /search/ at priority 0.7 (false signal: search is
          // utility, not landing). Now excluded entirely along with stats/
          // privacy/terms/about/faq/contact/authors (already excluded — kept).
          return undefined;
        } else {
          item.priority = 0.6;
          item.changefreq = 'monthly';
        }

        return item;
      },
    }),
  ],
  output: 'static',
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    // SUPABASE_SERVICE_KEY is read via import.meta.env at SSG build time only
    // Do NOT put it in vite.define — it could leak into client bundles
    build: {
      cssMinify: true,
    },
  },
});
