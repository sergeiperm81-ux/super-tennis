/**
 * Fetch latest news headlines from Supabase for video generation.
 *
 * Selection strategy (since 2026-04-15 — based on real YouTube analytics):
 * Instead of random shuffle, headlines are SCORED against 5 patterns that
 * correlated with high views / CTR in our Jan–Apr 2026 analytics:
 *
 *   +3  named A-tier star (Nadal, Djokovic, Sinner, Alcaraz, Serena…) in title
 *   +1  named star appears in the FIRST 3 words (hooks viewer faster)
 *   +2  contains a specific number ("7 Times", "$50M", "Top 5")
 *   +2  published within last 24 hours (algo amplifies topical news)
 *   +1  contains high-performing action verb (Slams/Withdraws/Announces…)
 *   -3  uses generic placeholder ("Tennis Star", "World No. 1", "Forgotten Star")
 *   -1  published > 72 hours ago (stale)
 *
 * Emergency rollback: set env SCORING_STRATEGY=random to revert to old behavior.
 *
 * Returns headlines that haven't been used for videos yet, enforcing 1 per
 * subject per run.
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SCORING_STRATEGY = process.env.SCORING_STRATEGY || 'analytics';

/**
 * Fetch active news from Supabase. We now also pull `published_at` so we can
 * age-score each headline.
 */
export async function fetchHeadlines(limit = 10) {
  const url = `${SUPABASE_URL}/rest/v1/news?is_active=eq.true&order=published_at.desc&limit=${limit}&select=title,slug,category,summary,published_at`;
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase error: ${res.status}`);
  return res.json();
}

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_FILE = path.join(__dirname, '..', 'published-log.json');

function getPublishedSlugs() {
  try {
    return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
  } catch { return []; }
}

export function markPublished(slugs) {
  const existing = getPublishedSlugs();
  const updated = [...new Set([...existing, ...slugs])].slice(-200); // keep last 200
  fs.writeFileSync(LOG_FILE, JSON.stringify(updated, null, 2));
}

// ── A-tier stars: players whose videos consistently cleared 1000+ views ──
// Derived from the Jan–Apr 2026 dataset (top decile of Shorts).
const A_TIER_STARS = [
  'Djokovic', 'Nadal', 'Alcaraz', 'Sinner', 'Federer',
  'Serena', 'Williams', 'Swiatek', 'Sabalenka',
  'Medvedev', 'Raducanu', 'Garcia', 'Rybakina',
];

// B-tier: named but historically underperforms, still scores 1 (not 3).
const B_TIER_STARS = [
  'Zverev', 'Tsitsipas', 'Rune', 'Fritz', 'Shelton', 'Draper',
  'Gauff', 'Pegula', 'Osaka', 'Murray',
  'Navratilova', 'Graf', 'Sharapova', 'Wozniacki',
  'Kvitova', 'Halep', 'Cerundolo', 'Opelka', 'Isner',
  'Becker', 'Schwartzman', 'Dimitrov',
];

// Placeholder phrases that correlated with <500 views. Avoiding names = flop.
const GENERIC_PLACEHOLDERS = [
  'Tennis Star', 'Tennis Player', 'Tennis Icon',
  'World No. 1', 'World No. 2', 'Former Star',
  'Forgotten Star', 'Local Tennis', 'Rising Star',
];

// Verbs that signalled drama / specificity in high-view titles.
const POWER_VERBS = [
  'slams', 'smashes', 'smashing', 'withdraws', 'announces',
  'admits', 'spotted', 'withdrawal', 'apologizes',
  'storms off', 'sparks', 'revealed', 'exit', 'meltdown',
];

/**
 * Detect a named player (A or B tier). Used for diversity filter and scoring.
 * Uses word-boundary regex to avoid false positives like "Rune" matching
 * "fortune", "Graf" matching "photograph", "Becker" matching "debecker".
 */
function matchesName(title, name) {
  // \b doesn't play well with apostrophes and non-ASCII — roll our own.
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^A-Za-z])${escaped}([^A-Za-z]|$)`).test(title);
}

function extractSubject(title) {
  for (const p of [...A_TIER_STARS, ...B_TIER_STARS]) {
    if (matchesName(title, p)) return p;
  }
  return null;
}

/**
 * Score a headline against the 5 analytics-backed patterns.
 * Returns { score, reasons } for logging.
 */
function scoreHeadline(headline) {
  const title = headline.title || '';
  const reasons = [];
  let score = 0;

  // 1. Named star (word-boundary match to avoid Rune/fortune collisions)
  const firstA = A_TIER_STARS.find((p) => matchesName(title, p));
  const firstB = B_TIER_STARS.find((p) => matchesName(title, p));
  if (firstA) {
    score += 3;
    reasons.push(`+3 A-star (${firstA})`);
    // 1b. Star in first 3 words
    const firstWords = title.split(/\s+/).slice(0, 3).join(' ');
    if (firstWords.includes(firstA)) {
      score += 1;
      reasons.push('+1 star in first 3 words');
    }
  } else if (firstB) {
    score += 1;
    reasons.push(`+1 B-star (${firstB})`);
  }

  // 2. Generic placeholder penalty
  for (const ph of GENERIC_PLACEHOLDERS) {
    if (title.includes(ph)) {
      score -= 3;
      reasons.push(`-3 placeholder ("${ph}")`);
      break;
    }
  }

  // 3. Specific number in title (digit-based, ignores "1" alone which is noisy)
  const numMatch = title.match(/\b(\d{2,}|\$\d+|\d+(st|nd|rd|th)|Top\s*\d+|No\.?\s*\d+)\b/i);
  if (numMatch) {
    score += 2;
    reasons.push(`+2 number ("${numMatch[0]}")`);
  }

  // 4. Freshness score based on published_at
  if (headline.published_at) {
    const ageHours = (Date.now() - Date.parse(headline.published_at)) / 3_600_000;
    if (ageHours <= 24) {
      score += 2;
      reasons.push(`+2 fresh (${ageHours.toFixed(1)}h)`);
    } else if (ageHours > 72) {
      score -= 1;
      reasons.push(`-1 stale (${ageHours.toFixed(0)}h)`);
    }
  }

  // 5. Power verb
  const titleLower = title.toLowerCase();
  const verb = POWER_VERBS.find((v) => titleLower.includes(v));
  if (verb) {
    score += 1;
    reasons.push(`+1 verb ("${verb}")`);
  }

  return { score, reasons };
}

/**
 * Get N fresh headlines for today's videos.
 * Uses analytics-based scoring unless SCORING_STRATEGY=random is set.
 */
export async function getHeadlinesForToday(count = 3) {
  const published = new Set(getPublishedSlugs());
  const all = await fetchHeadlines(50);
  const fresh = all.filter((h) => !published.has(h.slug));
  const pool = fresh.length >= count ? fresh : all;

  if (fresh.length < count) {
    console.log(`⚠️ Only ${fresh.length} fresh headlines available (need ${count}), recycling`);
  }

  // Order the pool by strategy
  let ordered;
  if (SCORING_STRATEGY === 'random') {
    // Legacy behavior — useful as a safety escape hatch.
    ordered = [...pool].sort(() => Math.random() - 0.5);
    console.log('   Strategy: random (legacy rollback mode)');
  } else {
    // Analytics-based scoring. Sort desc by score; tie-break by random so
    // the same top-score candidate isn't picked every single run.
    // Score + sort, but do NOT mutate the original headline objects —
    // downstream code (markPublished, Supabase inserts) reads them as-is.
    // Keep the debug info in a side array, indexed by the same position.
    const scored = pool
      .map((h) => ({ h, ...scoreHeadline(h) }))
      .sort((a, b) => (b.score - a.score) || (Math.random() - 0.5));
    ordered = scored.map((x) => x.h);
    const debugByHeadline = new WeakMap();
    for (const x of scored) debugByHeadline.set(x.h, { score: x.score, reasons: x.reasons });
    console.log(`   Strategy: analytics — top candidates:`);
    for (const h of ordered.slice(0, Math.min(count + 2, ordered.length))) {
      const d = debugByHeadline.get(h);
      console.log(`     [${d?.score ?? '?'}] ${h.title}`);
      if (d?.reasons?.length) {
        console.log(`        ${d.reasons.join(' | ')}`);
      }
    }
  }

  // Pick with subject diversity — max 1 per player per run.
  const selected = [];
  const usedSubjects = new Set();

  for (const h of ordered) {
    if (selected.length >= count) break;
    const subject = extractSubject(h.title);
    if (subject && usedSubjects.has(subject)) continue;
    selected.push(h);
    if (subject) usedSubjects.add(subject);
  }

  // If diversity filter left us short, fill with whatever's left
  if (selected.length < count) {
    for (const h of ordered) {
      if (selected.length >= count) break;
      if (!selected.includes(h)) selected.push(h);
    }
  }

  console.log(`   Subjects: ${selected.map((h) => extractSubject(h.title) || 'misc').join(', ')}`);
  return selected;
}
