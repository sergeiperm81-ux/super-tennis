#!/usr/bin/env node
/**
 * Content quality audit — scans ALL news + articles for AI graphomania,
 * fabrications, tabloid headlines, and unsourced claims.
 *
 * Run modes:
 *   node scripts/audit-content-quality.mjs            # full report
 *   node scripts/audit-content-quality.mjs --news     # news only
 *   node scripts/audit-content-quality.mjs --articles # articles only
 *   node scripts/audit-content-quality.mjs --recent   # last 7 days news only
 *   node scripts/audit-content-quality.mjs --csv      # output CSV for review
 *
 * Detection rules — each item gets a 0-100 risk score:
 *   +30  tabloid headline word (Shocking/Stunning/Revealed/Bombshell/...)
 *   +25  fabrication keyword in body (insider/reportedly/source close to/...)
 *   +15  generic filler phrases ("the tennis world is buzzing", "stay tuned")
 *   +20  body uses "you" excessively (>5x — clickbait pattern)
 *   +15  no-overlap between body and title (semantic disconnect)
 *   +10  excessive exclamation marks in title
 *
 * Score >= 50 → flagged for review/deletion.
 * Score >= 70 → strongly recommend deletion.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// --- Detection patterns ---
const TABLOID_HEADLINE = /\b(shocking|stunning|bombshell|jaw-?dropping|you\s+won['’]t\s+believe|revealed|secret|exclusive|leaked|exposed|mind-?blowing|unbelievable|astonishing)\b/i;
const FABRICATION = /\b(an?\s+insider|sources?\s+close\s+to|reportedly|allegedly|rumor|rumour|whispers|tongues\s+wagging|gossip\s+mill)\b/i;
const FILLER = /\b(the\s+(tennis|sports?)\s+world\s+(is|was)\s+(buzzing|abuzz|on\s+fire)|stay\s+tuned|fans\s+can['’]t\s+wait|in\s+a\s+(stunning|shocking)\s+(twist|turn|move)|left\s+(everyone|fans|us)\s+(speechless|in\s+awe))\b/i;
const VAGUE_RUMOR = /\b(it\s+seems|it\s+appears|some\s+say|many\s+believe|it\s+is\s+rumored|word\s+on\s+the\s+street|tongues\s+(?:are\s+)?wagging)\b/i;

// Common "you" pattern check
function countYou(body) {
  const matches = body.match(/\byou\b/gi);
  return matches ? matches.length : 0;
}

function bodyTitleOverlap(title, body) {
  if (!title || !body) return 0;
  const stopWords = new Set(['this','that','with','from','what','they','their','have','about','will','were','been','tennis','player','that','have','been','their']);
  const titleWords = title
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w));
  if (titleWords.length === 0) return 1;
  const bodyLower = body.toLowerCase();
  const overlap = titleWords.filter(w => bodyLower.includes(w)).length;
  return overlap / titleWords.length;
}

function scoreItem(item) {
  const reasons = [];
  let score = 0;

  const title = item.title || '';
  const body = (item.body || item.summary || '') + '';

  if (TABLOID_HEADLINE.test(title)) {
    score += 30;
    reasons.push('tabloid_headline');
  }
  if (FABRICATION.test(body) || FABRICATION.test(title)) {
    score += 25;
    reasons.push('fabrication_keyword');
  }
  if (FILLER.test(body)) {
    score += 15;
    reasons.push('filler_phrase');
  }
  if (VAGUE_RUMOR.test(body)) {
    score += 20;
    reasons.push('vague_rumor');
  }

  const youCount = countYou(body);
  if (youCount > 5) {
    score += 15;
    reasons.push(`you_${youCount}x`);
  }

  const overlap = bodyTitleOverlap(title, body);
  if (overlap < 0.2) {
    score += 15;
    reasons.push(`low_overlap_${Math.round(overlap*100)}%`);
  }

  const exclaimCount = (title.match(/!/g) || []).length;
  if (exclaimCount > 1) {
    score += 10;
    reasons.push(`title_${exclaimCount}_excl`);
  }

  return { score, reasons };
}

async function fetchAllNews(recentOnly = false) {
  const all = [];
  let offset = 0;
  const PAGE = 1000;
  const cutoff = recentOnly ? new Date(Date.now() - 7 * 86400000).toISOString() : null;

  while (true) {
    let q = sb.from('news')
      .select('id, slug, title, summary, body, category, source_name, original_title, published_at')
      .order('published_at', { ascending: false })
      .range(offset, offset + PAGE - 1);
    if (cutoff) q = q.gte('published_at', cutoff);
    const { data, error } = await q;
    if (error) { console.error(error); return all; }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

async function fetchAllArticles(category = null) {
  const all = [];
  let offset = 0;
  const PAGE = 1000;
  while (true) {
    let q = sb.from('articles')
      .select('id, slug, title, excerpt, body, category')
      .order('published_at', { ascending: false })
      .range(offset, offset + PAGE - 1);
    if (category) q = q.eq('category', category);
    const { data, error } = await q;
    if (error) { console.error(error); return all; }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

function summarize(items, kind, csvOut) {
  let critical = 0; // score >= 70
  let high = 0;     // 50-69
  let medium = 0;   // 30-49
  let clean = 0;    // < 30

  const flagged = [];
  for (const item of items) {
    const { score, reasons } = scoreItem(item);
    if (score >= 70) { critical++; flagged.push({ ...item, score, reasons }); }
    else if (score >= 50) { high++; flagged.push({ ...item, score, reasons }); }
    else if (score >= 30) { medium++; flagged.push({ ...item, score, reasons }); }
    else clean++;
  }

  flagged.sort((a, b) => b.score - a.score);

  console.log('');
  console.log('='.repeat(80));
  console.log(`${kind.toUpperCase()} — ${items.length} items`);
  console.log('='.repeat(80));
  console.log(`  CRITICAL (>=70):  ${critical} (${(critical/items.length*100).toFixed(1)}%)`);
  console.log(`  HIGH (50-69):     ${high} (${(high/items.length*100).toFixed(1)}%)`);
  console.log(`  MEDIUM (30-49):   ${medium} (${(medium/items.length*100).toFixed(1)}%)`);
  console.log(`  CLEAN (<30):      ${clean} (${(clean/items.length*100).toFixed(1)}%)`);

  if (flagged.length > 0) {
    console.log('');
    console.log('--- TOP 20 WORST OFFENDERS ---');
    flagged.slice(0, 20).forEach((f, i) => {
      console.log(`${String(i+1).padStart(2)}. [${f.score}] ${f.reasons.join(', ')}`);
      console.log(`     ${f.slug}`);
      console.log(`     "${(f.title || '').slice(0, 100)}"`);
    });
  }

  if (csvOut) {
    const csv = ['id,kind,score,reasons,slug,title,category,source_name'];
    for (const f of flagged) {
      const row = [
        f.id,
        kind,
        f.score,
        f.reasons.join('|'),
        f.slug,
        `"${(f.title || '').replace(/"/g, '""')}"`,
        f.category || '',
        f.source_name || '',
      ];
      csv.push(row.join(','));
    }
    fs.appendFileSync(csvOut, csv.join('\n') + '\n');
  }

  return { critical, high, medium, clean, flagged };
}

async function main() {
  const args = process.argv.slice(2);
  const onlyNews = args.includes('--news');
  const onlyArticles = args.includes('--articles');
  const recentOnly = args.includes('--recent');
  const csvOut = args.includes('--csv') ? `audit-${new Date().toISOString().split('T')[0]}.csv` : null;

  if (csvOut) {
    fs.writeFileSync(csvOut, ''); // reset
    console.log(`📄 CSV output: ${csvOut}`);
  }

  if (!onlyArticles) {
    console.log(`Fetching news${recentOnly ? ' (last 7 days)' : ''}...`);
    const news = await fetchAllNews(recentOnly);
    summarize(news, 'NEWS', csvOut);
  }

  if (!onlyNews) {
    const categories = ['lifestyle', 'gear', 'records', 'vs', 'tournaments', 'players'];
    for (const cat of categories) {
      console.log(`\nFetching articles: ${cat}...`);
      const articles = await fetchAllArticles(cat);
      const normalized = articles.map(a => ({ ...a, summary: a.excerpt }));
      summarize(normalized, `ARTICLES/${cat}`, csvOut);
    }
  }

  console.log('\n✅ Audit complete');
  if (csvOut) console.log(`   Full report: ${csvOut}`);
}

main().catch(err => { console.error(err); process.exit(1); });
