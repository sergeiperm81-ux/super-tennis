// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap, { ChangeFreqEnum } from '@astrojs/sitemap';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Load per-URL freshness map (generated pre-build by
// scripts/generate-freshness-map.mjs from Supabase article.updated_at,
// news.updated_at, players.stats_updated_at). Empty object if missing
// (e.g. local dev without Supabase creds).
const __dirname = dirname(fileURLToPath(import.meta.url));
/** @type {Record<string, string>} */
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
 * @param {string} fullUrl
 * @returns {string | null}
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

        // 2026-05-18: separated the live `/rankings/` index from the static
        // `/rankings/{slug}/` explainer pages (Round 2 cluster). The index
        // is genuinely daily-changing live data → priority 1.0 daily. The
        // explainer slugs are evergreen content → priority 0.8 monthly.
        const isRankingsIndex = url === 'https://super.tennis/rankings/' ||
                                url === 'https://super.tennis/rankings';
        const isRankingsExplainer = /\/rankings\/[a-z-]+\/?$/.test(url) && !isRankingsIndex;

        const truly_daily = url === 'https://super.tennis/' ||
                            isRankingsIndex ||
                            url === 'https://super.tennis/news/' ||
                            url === 'https://super.tennis/calendar/';

        const stable_2026 = '2026-05-01'; // global evergreen anchor
        const stable_2025 = '2025-09-01'; // older static pages

        // 2026-05-18: hardcoded publication dates for static evergreen
        // cluster pages (Round 1-4: /rules/, /money/, /watch/ + the
        // /rankings/ explainers + /lifestyle/{subhub}/). These pages
        // aren't in Supabase, so the freshness-map can't track them.
        // Without this map they fell into the global 2026-05-01 fallback
        // even though they were published in May 2026 — Google saw them
        // as stale. Update these dates when the page content is materially
        // refreshed.
        /** @type {Record<string, string>} */
        const STATIC_CLUSTER_DATES = {
          '/rules/': '2026-05-17',
          '/rules/tennis-scoring-explained/': '2026-05-17',
          '/rules/tie-break-rules-explained/': '2026-05-17',
          '/rules/how-many-sets-in-tennis/': '2026-05-17',
          '/rankings/how-tennis-rankings-work/': '2026-05-17',
          '/rankings/atp-ranking-points-explained/': '2026-05-17',
          '/rankings/wta-ranking-points-explained/': '2026-05-17',
          '/rankings/live-rankings-vs-official-rankings/': '2026-05-17',
          '/money/': '2026-05-17',
          '/money/tennis-prize-money-explained/': '2026-05-17',
          '/money/how-much-tennis-players-earn/': '2026-05-17',
          '/money/grand-slam-prize-money-breakdown/': '2026-05-17',
          '/watch/': '2026-05-18',
          '/watch/where-to-watch-grand-slams/': '2026-05-18',
          '/watch/best-tennis-streaming-services/': '2026-05-18',
          '/watch/tennis-tv-rights-by-country/': '2026-05-18',
          '/lifestyle/money/': '2026-05-17',
          '/lifestyle/style/': '2026-05-17',
          '/lifestyle/culture/': '2026-05-17',
          '/lifestyle/health/': '2026-05-17',
          '/lifestyle/media/': '2026-05-17',
          '/lifestyle/travel/': '2026-05-17',
          '/lifestyle/career/': '2026-05-17',
        };

        // Look up real updated_at from the freshness map first — when the
        // content-refresh Worker bumps Supabase.updated_at, the next build
        // emits a fresh lastmod for that URL. Falls back to stable dates.
        const path = urlPath(url);
        const staticClusterDate = path ? STATIC_CLUSTER_DATES[path] : null;
        const realFreshness = path ? freshnessMap[path] : null;

        if (truly_daily) {
          item.lastmod = today;
        } else if (staticClusterDate) {
          item.lastmod = staticClusterDate;
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
        // 1.0 — Homepage + live Rankings index (highest traffic, daily-changing)
        // 0.9 — Player profiles, News articles, VS pages
        // 0.8 — Gear, Lifestyle, Records, Rules, Money, Watch, Rankings explainers
        //       (the four evergreen-explainer clusters — Round 1-4 — sit here)
        // 0.7 — Tournaments, Calendar
        // 0.5 — Legal, About, FAQ (low SEO value)
        // Skip stats/ search/ (password-protected / utility)

        if (url === 'https://super.tennis/' || isRankingsIndex) {
          item.priority = 1.0;
          item.changefreq = ChangeFreqEnum.DAILY;
        } else if (
          url.includes('/players/') ||
          url.includes('/news/') ||
          url.includes('/vs/')
        ) {
          item.priority = 0.9;
          item.changefreq = ChangeFreqEnum.WEEKLY;
        } else if (
          url.includes('/gear/') ||
          url.includes('/lifestyle/') ||
          url.includes('/records/') ||
          url.includes('/rules/') ||
          url.includes('/money/') ||
          url.includes('/watch/') ||
          isRankingsExplainer
        ) {
          item.priority = 0.8;
          item.changefreq = ChangeFreqEnum.MONTHLY;
        } else if (
          url.includes('/tournaments/') ||
          url.includes('/calendar/')
        ) {
          item.priority = 0.7;
          item.changefreq = ChangeFreqEnum.MONTHLY;
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
          return undefined;
        } else {
          item.priority = 0.6;
          item.changefreq = ChangeFreqEnum.MONTHLY;
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
