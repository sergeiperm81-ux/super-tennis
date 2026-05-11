#!/usr/bin/env node
/**
 * Find duplicate YouTube Shorts (same news_slug → multiple youtube_id rows).
 * Fetch view counts for each, then output a "keep highest" / "delete others"
 * plan that can be applied manually via YouTube Studio.
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function fetchViews(videoId) {
  try {
    const res = await fetch(`https://www.youtube.com/shorts/${videoId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15' },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const m = html.match(/"viewCount":"(\d+)"/);
    return m ? parseInt(m[1], 10) : null;
  } catch { return null; }
}

const { data } = await sb.from('video_publications')
  .select('news_slug, youtube_id, title, youtube_published_at')
  .not('youtube_id', 'is', null)
  .gte('youtube_published_at', '2026-05-04')
  .order('youtube_published_at');

const bySlug = {};
for (const v of (data || [])) {
  (bySlug[v.news_slug] ||= []).push(v);
}

console.log('Fetching view counts (may take a moment)...\n');
const keep = [];
const remove = [];
for (const [slug, vids] of Object.entries(bySlug)) {
  if (vids.length < 2) continue;
  for (const v of vids) {
    v.views = await fetchViews(v.youtube_id);
    await new Promise(r => setTimeout(r, 500));
  }
  vids.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
  const [winner, ...losers] = vids;
  console.log('▼ ' + (vids[0].title || slug).slice(0, 70));
  console.log(`  ✅ KEEP    ${winner.youtube_id} — ${winner.views ?? '?'} views (${winner.youtube_published_at.slice(0,16)})`);
  for (const loser of losers) {
    console.log(`  🗑  DELETE  ${loser.youtube_id} — ${loser.views ?? '?'} views (${loser.youtube_published_at.slice(0,16)})`);
    remove.push(loser.youtube_id);
  }
  keep.push(winner.youtube_id);
  console.log('');
}

console.log('═══════════════════════════════════════════');
console.log(`Keep:   ${keep.length}`);
console.log(`Delete: ${remove.length}`);
console.log('');
console.log('YouTube IDs to DELETE manually in YouTube Studio:');
console.log(remove.join('\n'));
