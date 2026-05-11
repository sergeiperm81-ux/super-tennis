#!/usr/bin/env node
/**
 * Add every redirect-source URL from public/_redirects to the Google
 * Indexing API URL_DELETED queue. The bulk-indexing cron will process
 * them at 100/day along with the existing soft-deleted-news queue.
 *
 * Why: GSC URL Inspection shows several redirect sources are still
 * "Submitted and indexed" as themselves (e.g. /lifestyle/tennis-diet-nutrition/
 * — last crawled before we added the 301). Google won't notice the
 * redirect until it re-crawls. Pushing URL_DELETED accelerates that.
 *
 * We store these URLs in news.deindex_pending with a synthetic slug so
 * the existing bulk-indexing.mjs can pick them up. Schema reuse keeps
 * the cron logic untouched.
 */
import 'dotenv/config';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const lines = fs.readFileSync('public/_redirects', 'utf8').split('\n');
const sources = new Set();
for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const parts = trimmed.split(/\s+/);
  if (parts.length < 2) continue;
  const src = parts[0];
  // Skip wildcards and templates (Cloudflare-specific syntax we can't statically expand)
  if (src.includes('*') || src.includes(':')) continue;
  // Normalize: must start with /
  if (!src.startsWith('/')) continue;
  // Strip trailing slash for the canonical version we'll keep
  const normalized = src.endsWith('/') ? src.slice(0, -1) : src;
  sources.add(normalized);
}

console.log(`Found ${sources.size} unique redirect sources in _redirects`);

// We need a place to enqueue these for de-indexing. The simplest path:
// reuse the existing news table by inserting a SYNTHETIC row with
// is_active=false, deindex_submitted_at=NULL — bulk-indexing.mjs will
// pick it up and submit URL_DELETED.
//
// To make it idempotent, use slugs that won't collide with real news.
// Prefix with 'redirect-source-' so a re-run skips already-existing rows.

const rows = [];
for (const src of sources) {
  const cleanSrc = src.startsWith('/') ? src.slice(1) : src;
  const synSlug = `redirect-source-${cleanSrc.replace(/\//g, '-')}`;
  rows.push({
    slug: synSlug,
    title: `[redirect source] ${src}`,
    summary: 'Synthetic row to enqueue URL_DELETED for an old slug that 301s. Not visible on site.',
    body: '',
    category: 'buzz',
    image_url: 'https://super.tennis/og/default.png',
    source_name: 'redirect-cleanup',
    source_url: `https://super.tennis${src}`,
    original_title: '',
    is_active: false,
    deindex_submitted_at: null,
    published_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 86400000).toISOString(),
  });
}

// Bulk upsert with on_conflict on slug — re-runs are safe (no-op on existing)
console.log(`Upserting ${rows.length} synthetic de-index rows...`);
const BATCH = 50;
let inserted = 0, errors = 0;
for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH);
  const { error } = await sb.from('news').upsert(batch, { onConflict: 'slug' });
  if (error) { console.error(`  Batch ${i}:`, error.message); errors++; }
  else inserted += batch.length;
}

console.log(`\n✅ Enqueued ${inserted} URLs (${errors} batch errors)`);
console.log('The daily bulk-indexing cron will process 100/day, prioritizing URL_DELETED');
console.log('Estimated time to clear backlog:', Math.ceil(sources.size / 100), 'days');

// BUT — important hack note: bulk-indexing.mjs builds the URL as
//   https://super.tennis/news/${slug}/
// We need it to use source_url instead for these synthetic rows.
// Let me check that script and patch it...
console.log('\n⚠️ Next step: patch scripts/bulk-indexing.mjs to read source_url');
console.log('   for synthetic redirect rows (slug starts with "redirect-source-")');
