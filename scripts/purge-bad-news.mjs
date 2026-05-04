#!/usr/bin/env node
/**
 * Purge fabricated/tabloid news items.
 *
 * Strategy: SOFT-delete (set is_active=false) all news items scoring >= threshold.
 * Soft-delete is reversible. Hidden from /news/ feed and Bluesky.
 * Next SSG rebuild will not generate pages for them → eventual 404 → Google de-indexes.
 *
 * Usage:
 *   node scripts/purge-bad-news.mjs --dry-run        # preview only
 *   node scripts/purge-bad-news.mjs --threshold 70   # delete score >= 70 (CRITICAL only)
 *   node scripts/purge-bad-news.mjs --threshold 50   # delete score >= 50 (CRITICAL + HIGH)
 *   node scripts/purge-bad-news.mjs --threshold 50 --hard  # HARD-delete from DB
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const TABLOID_HEADLINE = /\b(shocking|stunning|bombshell|jaw-?dropping|you\s+won['’]t\s+believe|revealed|secret|exclusive|leaked|exposed|mind-?blowing|unbelievable|astonishing)\b/i;
const FABRICATION = /\b(an?\s+insider|sources?\s+close\s+to|reportedly|allegedly|rumor|rumour|whispers|tongues\s+wagging|gossip\s+mill)\b/i;
const FILLER = /\b(the\s+(tennis|sports?)\s+world\s+(is|was)\s+(buzzing|abuzz|on\s+fire)|stay\s+tuned|fans\s+can['’]t\s+wait|in\s+a\s+(stunning|shocking)\s+(twist|turn|move)|left\s+(everyone|fans|us)\s+(speechless|in\s+awe))\b/i;
const VAGUE_RUMOR = /\b(it\s+seems|it\s+appears|some\s+say|many\s+believe|it\s+is\s+rumored|word\s+on\s+the\s+street|tongues\s+(?:are\s+)?wagging)\b/i;

function countYou(body) {
  const matches = body.match(/\byou\b/gi);
  return matches ? matches.length : 0;
}
function bodyTitleOverlap(title, body) {
  if (!title || !body) return 0;
  const stop = new Set(['this','that','with','from','what','they','their','have','about','will','were','been','tennis','player']);
  const tw = title.toLowerCase().replace(/[^a-z\s]/g,' ').split(/\s+/).filter(w => w.length > 3 && !stop.has(w));
  if (tw.length === 0) return 1;
  const bl = body.toLowerCase();
  return tw.filter(w => bl.includes(w)).length / tw.length;
}
function scoreItem(item) {
  let score = 0;
  const title = item.title || '';
  const body = (item.body || item.summary || '') + '';
  if (TABLOID_HEADLINE.test(title)) score += 30;
  if (FABRICATION.test(body) || FABRICATION.test(title)) score += 25;
  if (FILLER.test(body)) score += 15;
  if (VAGUE_RUMOR.test(body)) score += 20;
  if (countYou(body) > 5) score += 15;
  if (bodyTitleOverlap(title, body) < 0.2) score += 15;
  if ((title.match(/!/g) || []).length > 1) score += 10;
  return score;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const hard = args.includes('--hard');
  const tArg = args.findIndex(a => a === '--threshold');
  const threshold = tArg >= 0 ? parseInt(args[tArg + 1], 10) : 50;

  console.log(`Threshold: ${threshold} (${hard ? 'HARD DELETE' : 'soft-delete'}) ${dryRun ? '[DRY RUN]' : ''}`);

  // Fetch ALL news in pages
  const all = [];
  let offset = 0;
  while (true) {
    const { data, error } = await sb.from('news')
      .select('id, slug, title, summary, body, is_active, original_title')
      .order('published_at', { ascending: false })
      .range(offset, offset + 999);
    if (error) { console.error(error); break; }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  console.log(`Fetched ${all.length} news items`);

  // Source-title overlap check — catches 100% fabrications regardless of style score
  function srcOverlap(srcTitle, ourTitle) {
    if (!srcTitle || !ourTitle) return 1;
    const stop = new Set(['this','that','with','from','what','they','their','have','about','will','were','been','tennis','player','star','open']);
    const sw = srcTitle.toLowerCase().replace(/[^a-z\s]/g,' ').split(/\s+/).filter(w => w.length > 3 && !stop.has(w));
    if (sw.length === 0) return 1;
    const ol = ourTitle.toLowerCase();
    return sw.filter(w => ol.includes(w)).length / sw.length;
  }

  // Score and filter — multiple triggers:
  //   1. style score >= threshold (tabloid words + fabrication keywords)
  //   2. source-title overlap < 0.15 (almost no shared words = fabrication)
  //   3. tabloid title + overlap < 0.30 (clickbait that doesn't match source well)
  //   4. body has fabrication keywords (insider/reportedly/source close to)
  const toDelete = [];
  for (const item of all) {
    const score = scoreItem(item);
    const overlap = srcOverlap(item.original_title, item.title);
    const titleTabloid = TABLOID_HEADLINE.test(item.title || '');
    const bodyFab = FABRICATION.test(item.body || '');

    const hitsThreshold = score >= threshold;
    const hitsOverlap = overlap < 0.15;
    const hitsTabloidLowOverlap = titleTabloid && overlap < 0.30;
    const hitsBodyFab = bodyFab;

    if (hitsThreshold || hitsOverlap || hitsTabloidLowOverlap || hitsBodyFab) {
      const reasons = [];
      if (hitsThreshold) reasons.push(`score=${score}`);
      if (hitsOverlap) reasons.push(`overlap=${(overlap*100).toFixed(0)}%`);
      else if (hitsTabloidLowOverlap) reasons.push(`tabloid+lowOverlap=${(overlap*100).toFixed(0)}%`);
      if (hitsBodyFab) reasons.push(`bodyFab`);
      toDelete.push({ ...item, score, overlap, reasons });
    }
  }
  toDelete.sort((a, b) => b.score - a.score);

  console.log(`\n${toDelete.length} items match (threshold=${threshold} OR overlap<15%):`);
  toDelete.slice(0, 30).forEach(i => {
    console.log(`  [${i.reasons.join(',')}] ${i.slug}`);
    console.log(`         ${i.title.slice(0, 80)}`);
  });
  if (toDelete.length > 30) console.log(`  ... and ${toDelete.length - 30} more`);

  if (dryRun) {
    console.log('\n[DRY RUN] No changes made. Re-run without --dry-run to apply.');
    return;
  }

  console.log('\nApplying changes...');
  const ids = toDelete.map(i => i.id);
  const BATCH = 100;
  let done = 0;
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH);
    if (hard) {
      const { error } = await sb.from('news').delete().in('id', batch);
      if (error) console.error(`Batch ${i} error:`, error.message);
    } else {
      const { error } = await sb.from('news').update({ is_active: false }).in('id', batch);
      if (error) console.error(`Batch ${i} error:`, error.message);
    }
    done += batch.length;
    process.stdout.write(`\r   ${done}/${ids.length}`);
  }
  console.log(`\n✅ ${hard ? 'Hard-deleted' : 'Soft-deleted'} ${done} items.`);
  console.log('\nNext steps:');
  console.log('  1. Trigger SSG rebuild so removed pages stop being served.');
  console.log('  2. Optionally submit URLs to Google Search Console removal tool for fastest de-indexing.');
}

main().catch(err => { console.error(err); process.exit(1); });
