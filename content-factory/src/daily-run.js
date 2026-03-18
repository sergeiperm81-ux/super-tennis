/**
 * Daily Content Factory — Main Orchestrator
 *
 * Flow:
 *   1. Fetch fresh headlines from Supabase
 *   2. Register in video_publications table (scheduled)
 *   3. Generate short videos with FFmpeg (headline + summary + CTA)
 *   4. Publish to YouTube Shorts → update video_publications
 *   5. Publish to TikTok (when configured) → update video_publications
 *   6. Log results
 *
 * Run: node src/daily-run.js
 * Cron: GitHub Actions — 3 times/day
 */

import 'dotenv/config';
import { getHeadlinesForToday, markPublished } from './fetch-headlines.js';
import { generateVideo } from './generate-video.js';
import { publishToYouTube } from './publish-youtube.js';
import fs from 'fs';

const VIDEOS_PER_RUN = parseInt(process.env.VIDEOS_PER_RUN || '1');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

// ── Supabase helpers for video_publications ──

async function supabaseInsert(table, row) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase INSERT ${table} failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  return data[0]; // return created row with id
}

async function supabaseUpdate(table, id, fields) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(fields),
  });
  if (!res.ok) {
    const text = await res.text();
    console.warn(`   ⚠️ Supabase UPDATE ${table} id=${id} failed (${res.status}): ${text}`);
  }
}

async function main() {
  const startTime = Date.now();
  console.log('━'.repeat(60));
  console.log(`🎾 SUPER.TENNIS Content Factory — ${new Date().toISOString()}`);
  console.log('━'.repeat(60));

  // 1. Fetch headlines
  console.log(`\n📰 Fetching ${VIDEOS_PER_RUN} headline(s)...`);
  let headlines;
  try {
    headlines = await getHeadlinesForToday(VIDEOS_PER_RUN);
    console.log(`   Got ${headlines.length} headlines:`);
    headlines.forEach((h, i) => console.log(`   ${i + 1}. [${h.category}] ${h.title}`));
  } catch (err) {
    console.error('❌ Failed to fetch headlines:', err.message);
    process.exit(1);
  }

  if (headlines.length === 0) {
    console.log('⚠️ No headlines available. Exiting.');
    process.exit(0);
  }

  // 2. Register in video_publications + generate videos
  console.log(`\n🎬 Generating ${headlines.length} video(s)...`);
  const videos = [];
  for (let i = 0; i < headlines.length; i++) {
    const h = headlines[i];

    // INSERT into video_publications (scheduled)
    let pubRow = null;
    try {
      pubRow = await supabaseInsert('video_publications', {
        news_slug: h.slug,
        title: h.title,
        category: h.category || 'buzz',
        image_url: h.image_url || null,
        scheduled_at: new Date().toISOString(),
      });
      console.log(`   📋 Registered publication #${pubRow.id}: ${h.title}`);
    } catch (e) {
      console.warn(`   ⚠️ Failed to register publication: ${e.message}`);
    }

    const videoPath = await generateVideo({
      title: h.title,
      summary: h.summary || '',
      category: h.category || 'buzz',
      index: i,
    });
    if (videoPath) {
      videos.push({ headline: h, path: videoPath, index: i, pubId: pubRow?.id });
    }
  }

  if (videos.length === 0) {
    console.error('❌ No videos generated. Exiting.');
    process.exit(1);
  }
  console.log(`   Generated ${videos.length} video(s)`);

  // 3. Publish to YouTube
  console.log(`\n📤 Publishing to YouTube...`);
  const results = [];

  for (const video of videos) {
    const { headline, path: videoPath, pubId } = video;
    console.log(`\n── ${headline.title} ──`);

    const result = {
      title: headline.title,
      slug: headline.slug,
      category: headline.category,
      youtube: null,
      youtubeError: null,
      pubId,
    };

    try {
      result.youtube = await publishToYouTube(videoPath, {
        title: headline.title,
        summary: headline.summary || '',
        category: headline.category,
      });

      // Update video_publications with YouTube result
      if (pubId && result.youtube) {
        await supabaseUpdate('video_publications', pubId, {
          youtube_id: result.youtube,
          youtube_published_at: new Date().toISOString(),
        });
        console.log(`   ✅ YouTube: https://youtube.com/shorts/${result.youtube}`);
      } else if (pubId && !result.youtube) {
        await supabaseUpdate('video_publications', pubId, {
          youtube_error: 'Upload returned null (skipped or quota exceeded)',
        });
        console.log(`   ⏭️ YouTube: skipped`);
      }
    } catch (err) {
      result.youtubeError = err.message;
      if (pubId) {
        await supabaseUpdate('video_publications', pubId, {
          youtube_error: err.message.slice(0, 500),
        });
      }
      console.error(`   ❌ YouTube error: ${err.message}`);
    }

    results.push(result);
  }

  // 4. Mark headlines as used + save YouTube IDs to news table (backward compat)
  const usedSlugs = results.map(r => r.slug);
  markPublished(usedSlugs);

  for (const r of results) {
    if (r.youtube && r.slug) {
      try {
        const url = `${SUPABASE_URL}/rest/v1/news?slug=eq.${encodeURIComponent(r.slug)}`;
        await fetch(url, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ youtube_video_id: r.youtube }),
        });
      } catch (e) {
        console.log(`   ⚠️ Failed to save YouTube ID to news: ${e.message}`);
      }
    }
  }

  // 5. Cleanup
  console.log(`\n🧹 Cleaning up...`);
  for (const video of videos) {
    try { fs.unlinkSync(video.path); } catch {}
  }

  // 6. Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n' + '━'.repeat(60));
  console.log('📊 SUMMARY');
  console.log('━'.repeat(60));
  for (const r of results) {
    const yt = r.youtube ? `✅ https://youtube.com/shorts/${r.youtube}` : (r.youtubeError ? `❌ ${r.youtubeError}` : '⏭️ skipped');
    console.log(`  ${yt} │ ${r.title}`);
  }
  console.log(`\n⏱️  Done in ${elapsed}s`);
}

main().catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
