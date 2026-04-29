// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://super.tennis',
  integrations: [
    react(),
    sitemap({
      serialize(item) {
        const url = item.url;
        const today = new Date().toISOString().split('T')[0];
        // Static pages that truly change daily get today's date
        // Article/player pages: lastmod reflects recent build date
        item.lastmod = today;

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
          url.includes('/calendar/') ||
          url.includes('/search/')
        ) {
          item.priority = 0.7;
          item.changefreq = 'monthly';
        } else if (
          url.includes('/privacy') ||
          url.includes('/terms') ||
          url.includes('/about') ||
          url.includes('/faq') ||
          url.includes('/contact') ||
          url.includes('/stats/')
        ) {
          // Skip utility pages from sitemap
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
