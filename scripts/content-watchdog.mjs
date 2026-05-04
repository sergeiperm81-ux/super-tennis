#!/usr/bin/env node
/**
 * CONTENT QUALITY WATCHDOG — runs weekly via GitHub Actions.
 *
 * Combines audit + purge + title-rewrite into a single automated pass.
 * Sends a Telegram report with what was changed.
 *
 * Detection rules (must match what worker uses for new content):
 *   1. style score >= 50 (tabloid words + fabrication keywords + filler)
 *   2. source-title overlap < 15% (pure fabrication — different event)
 *   3. tabloid title + overlap < 30% (clickbait disguising different story)
 *   4. body has fabrication keywords (insider/reportedly/source close to)
 *
 * Items meeting ANY rule → soft-delete (is_active=false).
 * Items with tabloid title only and clean body → rewrite title.
 *
 * Env required:
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY
 *   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (optional — alert if set)
 *
 * Exit codes:
 *   0 — ran successfully (whether or not items were changed)
 *   1 — fatal error (DB connection, etc.)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ──────── Detection patterns ────────
const TABLOID = /\b(shocking|stunning|bombshell|jaw-?dropping|revealed|secret|exclusive|leaked|exposed|mind-?blowing|unbelievable|astonishing)\b/i;
const FABRICATION = /\b(an?\s+insider|sources?\s+close\s+to|reportedly|allegedly|rumor|rumour|whispers|tongues\s+wagging|gossip\s+mill)\b/i;
const FILLER = /\b(the\s+(tennis|sports?)\s+world\s+(is|was)\s+(buzzing|abuzz|on\s+fire)|stay\s+tuned|fans\s+can['’]t\s+wait|in\s+a\s+(stunning|shocking)\s+(twist|turn|move)|left\s+(everyone|fans|us)\s+(speechless|in\s+awe))\b/i;
const VAGUE_RUMOR = /\b(it\s+seems|it\s+appears|some\s+say|many\s+believe|it\s+is\s+rumored|word\s+on\s+the\s+street|tongues\s+(?:are\s+)?wagging)\b/i;

const STOP = new Set(['this','that','with','from','what','they','their','have','about','will','were','been','tennis','player','star','open','title','the','for','and']);

function scoreItem(item) {
  let score = 0;
  const title = item.title || '';
  const body = (item.body || item.summary || '') + '';
  if (TABLOID.test(title)) score += 30;
  if (FABRICATION.test(body) || FABRICATION.test(title)) score += 25;
  if (FILLER.test(body)) score += 15;
  if (VAGUE_RUMOR.test(body)) score += 20;
  if ((body.match(/\byou\b/gi) || []).length > 5) score += 15;
  const overlap = bodyTitleOverlap(title, body);
  if (overlap < 0.2) score += 15;
  if ((title.match(/!/g) || []).length > 1) score += 10;
  return score;
}

function bodyTitleOverlap(title, body) {
  if (!title || !body) return 0;
  const tw = title.toLowerCase().replace(/[^a-z\s]/g,' ').split(/\s+/).filter(w => w.length > 3 && !STOP.has(w));
  if (tw.length === 0) return 1;
  const bl = body.toLowerCase();
  return tw.filter(w => bl.includes(w)).length / tw.length;
}

function srcOverlap(srcTitle, ourTitle) {
  if (!srcTitle || !ourTitle) return 1;
  const sw = srcTitle.toLowerCase().replace(/[^a-z\s]/g,' ').split(/\s+/).filter(w => w.length > 3 && !STOP.has(w));
  if (sw.length === 0) return 1;
  const ol = ourTitle.toLowerCase();
  return sw.filter(w => ol.includes(w)).length / sw.length;
}

// ──────── Title rewriter ────────
const STRIP_PATTERNS = [
  /^(shocking|stunning|exclusive|bombshell|jaw-?dropping|leaked|exposed|astonishing)\s*:\s*/i,
  /^(shocking|stunning|exclusive|bombshell|astonishing)\s+\w+\s*:\s*/i,
  /\s+(revealed|exposed|leaked)\s*!?\s*$/i,
  /\s+(stuns?\s+(?:fans|the\s+world|everyone)|sparks?\s+(?:excitement|buzz|drama|controversy|frenzy|outrage)|leaves?\s+(?:fans|everyone)\s+(?:speechless|in\s+awe))\s*!?\s*$/i,
  /\s+(?:and\s+|—\s+)?(?:what['’]?s?\s+(?:next|really\s+happened|going\s+on)\??)\s*$/i,
  /\s+[\-—]\s+[A-Z][\w]+(?:\.[a-z]+|\s+[A-Z][\w]+)$/,
];

function stripTabloid(title) {
  let cleaned = title || '';
  let changed = true;
  let iter = 0;
  while (changed && iter < 5) {
    changed = false; iter++;
    for (const re of STRIP_PATTERNS) {
      const next = cleaned.replace(re, '').trim();
      if (next !== cleaned) { cleaned = next; changed = true; }
    }
  }
  cleaned = cleaned.replace(/^[:\s,.!?]+/, '').replace(/[\s,]+$/, '').trim();
  cleaned = cleaned.replace(/\b(shocking|stunning|bombshell|astonishing)\b/gi, '').replace(/\s{2,}/g, ' ').trim();
  cleaned = cleaned.replace(/^[:\s,]+/, '').trim();
  cleaned = cleaned.replace(/!+\s*$/, '');
  if (cleaned.length > 0) cleaned = cleaned[0].toUpperCase() + cleaned.slice(1);
  return cleaned;
}

function pickBetterTitle(currentTitle, sourceTitle) {
  const cleaned = stripTabloid(currentTitle);
  const looksGood = cleaned && cleaned.length >= 15 && cleaned.length <= 110 && !TABLOID.test(cleaned) && cleaned.split(/\s+/).length >= 3;
  if (looksGood) return cleaned;

  if (sourceTitle) {
    let src = sourceTitle.trim();
    src = src.replace(/\s+[\-—]\s+[A-Za-z][\w]*(?:\.[a-z]{2,})\s*$/i, '').trim();
    src = src.replace(/\s+[\-—]\s+(?:[A-Z][\w'’]+\s*){1,6}$/, '').trim();
    src = src.replace(/\s*\([^)]+\)\s*$/, '').trim();
    if (src.length >= 15 && src.length <= 110 && !TABLOID.test(src)) {
      return src.charAt(0).toUpperCase() + src.slice(1);
    }
  }
  return cleaned || currentTitle;
}

// ──────── Telegram ────────
async function sendTelegram(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log('(Telegram not configured — skipping alert)');
    return;
  }
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'Markdown', disable_web_page_preview: true }),
    });
  } catch (err) {
    console.error('Telegram send failed:', err.message);
  }
}

// ──────── Main ────────
async function main() {
  console.log('🐺 Content quality watchdog — starting weekly scan');
  const startTime = Date.now();

  // Load all active news
  const all = [];
  let off = 0;
  while (true) {
    const { data, error } = await sb.from('news')
      .select('id, slug, title, summary, body, original_title, published_at')
      .eq('is_active', true)
      .order('published_at', { ascending: false })
      .range(off, off + 999);
    if (error) { console.error('DB error:', error); process.exit(1); }
    if (!data || !data.length) break;
    all.push(...data);
    if (data.length < 1000) break;
    off += 1000;
  }
  console.log(`Loaded ${all.length} active news items`);

  // Compute deletion + rewrite candidates
  const toDelete = [];
  const toRewrite = [];
  for (const item of all) {
    const score = scoreItem(item);
    const overlap = srcOverlap(item.original_title, item.title);
    const titleTabloid = TABLOID.test(item.title || '');
    const bodyFab = FABRICATION.test(item.body || '');

    const hitDelete =
      score >= 50 ||
      overlap < 0.15 ||
      (titleTabloid && overlap < 0.30) ||
      bodyFab;

    if (hitDelete) {
      toDelete.push({ id: item.id, slug: item.slug, title: item.title, score, overlap });
    } else if (titleTabloid) {
      // Body OK, just clickbait title — rewrite
      const newTitle = pickBetterTitle(item.title, item.original_title);
      if (newTitle && newTitle !== item.title) {
        toRewrite.push({ id: item.id, slug: item.slug, oldTitle: item.title, newTitle });
      }
    }
  }

  console.log(`\n📊 Scan complete:`);
  console.log(`   To delete : ${toDelete.length}`);
  console.log(`   To rewrite: ${toRewrite.length}`);

  // Apply soft-delete
  let deleted = 0, deleteErrors = 0;
  if (toDelete.length > 0) {
    const ids = toDelete.map(i => i.id);
    const BATCH = 100;
    for (let i = 0; i < ids.length; i += BATCH) {
      const batch = ids.slice(i, i + BATCH);
      const { error } = await sb.from('news').update({ is_active: false }).in('id', batch);
      if (error) { console.error(`Batch error:`, error.message); deleteErrors++; }
      else deleted += batch.length;
    }
  }

  // Apply title rewrites
  let rewritten = 0, rewriteErrors = 0;
  for (const u of toRewrite) {
    const { error } = await sb.from('news').update({ title: u.newTitle }).eq('id', u.id);
    if (error) rewriteErrors++; else rewritten++;
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);

  console.log(`\n✅ Done in ${elapsed}s`);
  console.log(`   Soft-deleted : ${deleted}/${toDelete.length}`);
  console.log(`   Rewritten    : ${rewritten}/${toRewrite.length}`);

  // Build Telegram report
  const totalChanges = deleted + rewritten;
  const lines = [
    `🐺 *Content Watchdog Report*`,
    ``,
    `📊 Scanned: ${all.length} active news items`,
    `🗑 Deleted: *${deleted}* items (style score ≥ 50, source overlap < 15%, body fabrications)`,
    `✏️ Title rewrites: *${rewritten}* items (clickbait headlines on otherwise-OK content)`,
    `⏱ Runtime: ${elapsed}s`,
  ];

  if (deleteErrors > 0 || rewriteErrors > 0) {
    lines.push(``);
    lines.push(`⚠️ Errors: ${deleteErrors + rewriteErrors}`);
  }

  if (totalChanges > 0) {
    lines.push(``);
    lines.push(`Sample of deleted items:`);
    toDelete.slice(0, 5).forEach(d => {
      const safeTitle = (d.title || '').slice(0, 70).replace(/[*_`\[\]]/g, '');
      lines.push(`• ${safeTitle}`);
    });
  }

  // High-volume alert
  if (deleted > 20) {
    lines.push(``);
    lines.push(`🚨 *High deletion volume!* Worker may be regressing — check curation prompt and RSS sources.`);
  }

  const summary = lines.join('\n');
  console.log('\n' + summary);
  await sendTelegram(summary);
}

main().catch(err => {
  console.error(err);
  sendTelegram(`❌ *Content watchdog FAILED*\n${err.message}`).finally(() => process.exit(1));
});
