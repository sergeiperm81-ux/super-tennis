// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://super.tennis',
  integrations: [
    react(),
    sitemap(),
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
