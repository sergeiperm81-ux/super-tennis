/**
 * Fetch latest news headlines from Supabase for video generation.
 * Returns headlines that haven't been used for videos yet.
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

/**
 * Fetch active news from Supabase
 * @param {number} limit
 * @returns {Promise<Array<{title: string, slug: string, category: string, summary: string}>>}
 */
export async function fetchHeadlines(limit = 10) {
  const url = `${SUPABASE_URL}/rest/v1/news?is_active=eq.true&order=published_at.desc&limit=${limit}&select=title,slug,category,summary`;
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase error: ${res.status}`);
  return res.json();
}

/**
 * Pick N headlines that haven't been used yet (track in published-log.json)
 */
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

/**
 * Extract the main subject (player name) from a headline title.
 * Used to avoid picking 2+ headlines about the same player.
 */
function extractSubject(title) {
  // Match known player last names
  const players = [
    'Djokovic','Alcaraz','Sinner','Federer','Nadal','Murray','Medvedev',
    'Zverev','Tsitsipas','Rune','Fritz','Shelton','Draper',
    'Swiatek','Sabalenka','Gauff','Rybakina','Pegula','Osaka',
    'Williams','Navratilova','Graf','Sharapova','Wozniacki',
    'Raducanu','Garcia','Kvitova','Halep',
  ];
  for (const p of players) {
    if (title.includes(p)) return p;
  }
  return null;
}

/**
 * Get N fresh headlines for today's videos.
 * Enforces player diversity — max 1 headline per player per run.
 */
export async function getHeadlinesForToday(count = 3) {
  const published = new Set(getPublishedSlugs());
  const all = await fetchHeadlines(50); // fetch more to have room for diversity filter
  const fresh = all.filter(h => !published.has(h.slug));

  const pool = fresh.length >= count ? fresh : all; // fallback to all if not enough fresh

  if (fresh.length < count) {
    console.log(`⚠️ Only ${fresh.length} fresh headlines available (need ${count}), recycling`);
  }

  // Shuffle for variety
  const shuffled = [...pool].sort(() => Math.random() - 0.5);

  // Pick with player diversity — max 1 per player
  const selected = [];
  const usedSubjects = new Set();

  for (const h of shuffled) {
    if (selected.length >= count) break;
    const subject = extractSubject(h.title);
    if (subject && usedSubjects.has(subject)) continue; // skip same player
    selected.push(h);
    if (subject) usedSubjects.add(subject);
  }

  // If diversity filter left us short, fill with whatever's left
  if (selected.length < count) {
    for (const h of shuffled) {
      if (selected.length >= count) break;
      if (!selected.includes(h)) selected.push(h);
    }
  }

  console.log(`   Subjects: ${selected.map(h => extractSubject(h.title) || 'misc').join(', ')}`);
  return selected;
}
