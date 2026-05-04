#!/usr/bin/env node
/**
 * Rewrite tabloid-style headlines to neutral, accurate ones.
 *
 * Strategy: regex-strip the tabloid wrapper. If the result is too short
 * or weird, fall back to the original source title (which we already have
 * stored). Source title is always factual.
 *
 * Examples:
 *   "Shocking Injury Scare: Sinner's Future in Doubt!"
 *     → fallback to source title (because "Future in Doubt" doesn't match
 *       reality where Sinner WON)
 *
 *   "Stunning Achievement: Sinner Makes History at Masters 1000!"
 *     → "Sinner Makes History at Masters 1000"
 *
 *   "Exclusive: Raducanu's New Coach Sparks Excitement!"
 *     → "Raducanu's New Coach Announcement"
 *     (drop "Exclusive:" + "Sparks Excitement!" filler)
 *
 * Usage:
 *   node scripts/rewrite-tabloid-titles.mjs --dry-run
 *   node scripts/rewrite-tabloid-titles.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const TABLOID = /\b(shocking|stunning|bombshell|jaw-?dropping|revealed|secret|exclusive|leaked|exposed|mind-?blowing|unbelievable|astonishing)\b/i;

// Strip patterns — careful with hyphens:
// "Ex-Coach", "Mind-Blowing", "All-Time" should be PRESERVED.
// Only strip on word-space-dash-space-Word patterns, not internal hyphens.
const STRIP_PATTERNS = [
  // Front: "Shocking Adjective: ..." or "Shocking: ..."
  /^(shocking|stunning|exclusive|bombshell|jaw-?dropping|leaked|exposed|astonishing)\s*:\s*/i,
  /^(shocking|stunning|exclusive|bombshell|astonishing)\s+\w+\s*:\s*/i,
  // Trailing " Revealed!" / " Exposed!" — note REQUIRED leading space (not hyphen) to avoid "Mind-Blowing"
  /\s+(revealed|exposed|leaked)\s*!?\s*$/i,
  // Trailing filler: " Stuns Fans!", " Sparks Excitement!", etc. (require leading space, not hyphen)
  /\s+(stuns?\s+(?:fans|the\s+world|everyone)|sparks?\s+(?:excitement|buzz|drama|controversy|frenzy|outrage)|leaves?\s+(?:fans|everyone)\s+(?:speechless|in\s+awe))\s*!?\s*$/i,
  // Trailing vague questions: " What's Next?", " What Really Happened?"
  /\s+(?:and\s+|—\s+)?(?:what['’]?s?\s+(?:next|really\s+happened|going\s+on)\??)\s*$/i,
  // Trailing source-name suffix: " - SourceName.com" — require " - " (space-dash-space) not "X-Y" hyphen.
  // Also require either a dot in source name OR multi-capitalized word.
  /\s+[\-—]\s+[A-Z][\w]+(?:\.[a-z]+|\s+[A-Z][\w]+)$/,
];

// Trailing exclamation point at end of title — clean it up after other strips
const TRAILING_EXCL_RE = /!+\s*$/;

function stripTabloid(title) {
  let cleaned = title || '';
  let changed = true;
  let iter = 0;
  while (changed && iter < 5) {
    changed = false;
    iter++;
    for (const re of STRIP_PATTERNS) {
      const next = cleaned.replace(re, '').trim();
      if (next !== cleaned) { cleaned = next; changed = true; }
    }
  }
  // Clean up leftover punctuation at boundaries
  cleaned = cleaned.replace(/^[:\s,.!?]+/, '').replace(/[\s,]+$/, '').trim();
  // Remove standalone tabloid words that survived (but not inside compound words)
  cleaned = cleaned.replace(/\b(shocking|stunning|bombshell|astonishing)\b/gi, '').replace(/\s{2,}/g, ' ').trim();
  // Remove leading colon
  cleaned = cleaned.replace(/^[:\s,]+/, '').trim();
  // Strip trailing multiple exclamations down to single (or zero)
  if (TRAILING_EXCL_RE.test(cleaned)) {
    cleaned = cleaned.replace(/!+\s*$/, '');
  }
  // Capitalize
  if (cleaned.length > 0) cleaned = cleaned[0].toUpperCase() + cleaned.slice(1);
  return cleaned;
}

function looksGood(cleaned) {
  // Reasonable length, contains words
  if (!cleaned || cleaned.length < 15 || cleaned.length > 110) return false;
  if (TABLOID.test(cleaned)) return false; // still has tabloid words
  // At least 3 words
  const wc = cleaned.split(/\s+/).length;
  if (wc < 3) return false;
  return true;
}

function pickBetterTitle(currentTitle, sourceTitle) {
  // Try cleanup first
  const cleaned = stripTabloid(currentTitle);
  if (looksGood(cleaned)) return cleaned;

  // Fallback to source title (clean it of source-name suffix)
  if (sourceTitle) {
    let src = sourceTitle.trim();
    // Strip trailing " - SourceName.com" suffix (heavy.com, etc.)
    src = src.replace(/\s+[\-—]\s+[A-Za-z][\w]*(?:\.[a-z]{2,})\s*$/i, '').trim();
    // Strip trailing " - Source Name" (multi-word source like "The New York Times")
    src = src.replace(/\s+[\-—]\s+(?:[A-Z][\w'’]+\s*){1,6}$/, '').trim();
    // Strip trailing parenthesized bits "(wsxZqCOVti)"
    src = src.replace(/\s*\([^)]+\)\s*$/, '').trim();
    if (src.length >= 15 && src.length <= 110 && !TABLOID.test(src)) {
      return src.charAt(0).toUpperCase() + src.slice(1);
    }
  }

  // Last resort: cleaned version even if short
  return cleaned || currentTitle;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  console.log(`Loading active news...${dryRun ? ' [DRY RUN]' : ''}`);
  const all = [];
  let off = 0;
  while (true) {
    const { data, error } = await sb.from('news').select('id, slug, title, original_title').eq('is_active', true).range(off, off + 999);
    if (error) { console.error(error); break; }
    if (!data || !data.length) break;
    all.push(...data);
    if (data.length < 1000) break;
    off += 1000;
  }
  console.log(`Loaded ${all.length} active news items`);

  // Find tabloid-titled items
  const candidates = all.filter(n => TABLOID.test(n.title || ''));
  console.log(`${candidates.length} have tabloid headlines`);

  // Compute new titles
  const updates = [];
  let unchanged = 0;
  for (const item of candidates) {
    const newTitle = pickBetterTitle(item.title, item.original_title);
    if (newTitle === item.title || !newTitle) { unchanged++; continue; }
    updates.push({ id: item.id, slug: item.slug, oldTitle: item.title, newTitle });
  }

  console.log(`\n${updates.length} items have a cleaner title (${unchanged} unchanged)`);
  console.log('\nSample of 20 rewrites:');
  updates.slice(0, 20).forEach(u => {
    console.log(`OLD: ${u.oldTitle}`);
    console.log(`NEW: ${u.newTitle}`);
    console.log('---');
  });

  if (dryRun) {
    console.log('\n[DRY RUN] No changes made.');
    return;
  }

  console.log('\nApplying...');
  let done = 0;
  for (const u of updates) {
    const { error } = await sb.from('news').update({ title: u.newTitle }).eq('id', u.id);
    if (error) {
      console.error(`  Failed ${u.id}:`, error.message);
    } else {
      done++;
    }
    if (done % 50 === 0) process.stdout.write(`\r   ${done}/${updates.length}`);
  }
  console.log(`\n✅ Updated ${done}/${updates.length} titles`);
}

main().catch(err => { console.error(err); process.exit(1); });
