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
 * Get N fresh headlines for today's videos
 */
export async function getHeadlinesForToday(count = 3) {
  const published = new Set(getPublishedSlugs());
  const all = await fetchHeadlines(30);
  const fresh = all.filter(h => !published.has(h.slug));

  if (fresh.length < count) {
    console.log(`⚠️ Only ${fresh.length} fresh headlines available (need ${count})`);
    // If not enough fresh, recycle oldest
    return all.slice(0, count);
  }

  // Pick randomly from fresh headlines (not always the same top 3)
  const shuffled = fresh.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
