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
    // Make env variables available at build time for SSG
    define: {
      'import.meta.env.SUPABASE_SERVICE_KEY': JSON.stringify(process.env.SUPABASE_SERVICE_KEY || ''),
    },
    build: {
      cssMinify: true,
    },
  },
});
