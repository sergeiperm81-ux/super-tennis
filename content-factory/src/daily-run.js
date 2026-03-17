/**
 * Daily Content Factory — Main Orchestrator
 *
 * Flow:
 *   1. Fetch fresh headlines from Supabase
 *   2. Generate short videos with FFmpeg (headline + summary + CTA)
 *   3. Publish to YouTube Shorts
 *   4. Log results
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

  // 2. Generate videos (with summary for lead text)
  console.log(`\n🎬 Generating ${headlines.length} video(s)...`);
  const videos = [];
  for (let i = 0; i < headlines.length; i++) {
    const h = headlines[i];
    const videoPath = await generateVideo({
      title: h.title,
      summary: h.summary || '',
      category: h.category || 'buzz',
      index: i,
    });
    if (videoPath) {
      videos.push({ headline: h, path: videoPath, index: i });
    }
  }

  if (videos.length === 0) {
    console.error('❌ No videos generated. Exiting.');
    process.exit(1);
  }
  console.log(`   Generated ${videos.length} video(s)`);

  // 3. Publish to YouTube
  console.log(`\n📤 Publishing...`);
  const results = [];

  for (const video of videos) {
    const { headline, path: videoPath } = video;
    console.log(`\n── ${headline.title} ──`);

    const result = {
      title: headline.title,
      slug: headline.slug,
      category: headline.category,
      youtube: null,
    };

    result.youtube = await publishToYouTube(videoPath, {
      title: headline.title,
      summary: headline.summary || '',
      category: headline.category,
    });

    results.push(result);
  }

  // 4. Mark headlines as used + save YouTube IDs to Supabase
  const usedSlugs = results.map(r => r.slug);
  markPublished(usedSlugs);

  // Save YouTube video IDs back to Supabase
  for (const r of results) {
    if (r.youtube && r.slug) {
      try {
        const url = `${process.env.SUPABASE_URL}/rest/v1/news?slug=eq.${encodeURIComponent(r.slug)}`;
        await fetch(url, {
          method: 'PATCH',
          headers: {
            'apikey': process.env.SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ youtube_video_id: r.youtube }),
        });
        console.log(`   📎 Saved YouTube ID for "${r.slug}"`);
      } catch (e) {
        console.log(`   ⚠️ Failed to save YouTube ID: ${e.message}`);
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
    const yt = r.youtube ? `✅ https://youtube.com/shorts/${r.youtube}` : '⏭️ skipped';
    console.log(`  ${yt} │ ${r.title}`);
  }
  console.log(`\n⏱️  Done in ${elapsed}s`);
}

main().catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
