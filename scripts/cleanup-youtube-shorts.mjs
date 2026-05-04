#!/usr/bin/env node
/**
 * Cleanup orphaned YouTube Shorts that link to soft-deleted news.
 *
 * Pairs with cleanup-bluesky-posts.mjs and content-watchdog.mjs.
 *
 * Quota: youtube.videos.delete = 50 units. Daily quota 10,000 units.
 * So 100 deletions = 5,000 units, safe.
 *
 * Env required:
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY
 *   YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN
 *   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (optional)
 *
 * Args:
 *   --dry-run       List only, don't actually delete
 *   --limit N       Stop after N deletions
 */

import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const YT_CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const YT_CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
const YT_REFRESH_TOKEN = process.env.YOUTUBE_REFRESH_TOKEN;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}
if (!YT_CLIENT_ID || !YT_REFRESH_TOKEN) {
  console.error('Missing YouTube credentials');
  process.exit(1);
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitIdx = args.indexOf('--limit');
const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : Infinity;

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function getYouTube() {
  const oauth2 = new google.auth.OAuth2(YT_CLIENT_ID, YT_CLIENT_SECRET);
  oauth2.setCredentials({ refresh_token: YT_REFRESH_TOKEN });
  return google.youtube({ version: 'v3', auth: oauth2 });
}

async function sendTelegram(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'Markdown', disable_web_page_preview: true }),
    });
  } catch {}
}

async function main() {
  console.log(`📺 YouTube orphan cleanup ${dryRun ? '[DRY RUN]' : ''}`);

  // 1. Load soft-deleted news with youtube_video_id
  const { data, error } = await sb.from('news')
    .select('id, slug, title, youtube_video_id')
    .eq('is_active', false)
    .not('youtube_video_id', 'is', null);
  if (error) throw error;

  const items = data || [];
  console.log(`📋 Found ${items.length} orphaned YouTube Shorts`);

  if (items.length === 0) {
    console.log('✅ Nothing to clean up');
    return;
  }

  console.log('\nSamples:');
  items.slice(0, 5).forEach(i => {
    console.log(`  https://youtube.com/shorts/${i.youtube_video_id} — ${i.title.slice(0, 60)}`);
  });

  if (dryRun) {
    console.log(`\n[DRY RUN] Would delete ${Math.min(items.length, limit)} videos`);
    return;
  }

  // 2. Delete each via YouTube API
  const youtube = getYouTube();
  let deleted = 0;
  let errors = 0;
  const errorDetails = [];

  for (const item of items) {
    if (deleted + errors >= limit) {
      console.log(`\n⏸ Reached --limit ${limit}, stopping`);
      break;
    }
    try {
      await youtube.videos.delete({ id: item.youtube_video_id });
      // Clear DB field
      await sb.from('news').update({ youtube_video_id: null }).eq('id', item.id);
      deleted++;
      if (deleted % 5 === 0) process.stdout.write(`\r   ${deleted}/${items.length}`);
    } catch (err) {
      errors++;
      // Common error: 404 (video already deleted manually) — clear DB anyway
      const status = err.response?.status || err.code;
      if (status === 404 || status === 410) {
        await sb.from('news').update({ youtube_video_id: null }).eq('id', item.id);
        console.log(`\n  (already gone) ${item.youtube_video_id}`);
      } else {
        errorDetails.push(`${item.youtube_video_id}: ${err.message}`);
        console.error(`\n  ❌ ${item.youtube_video_id}: ${err.message}`);
      }
    }
    // Throttle slightly
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\n✅ Done: ${deleted} deleted, ${errors} errors`);

  // Telegram report
  const report = [
    `📺 *YouTube cleanup*`,
    ``,
    `📋 Found ${items.length} orphaned Shorts (linked to soft-deleted news)`,
    `🗑 Deleted: *${deleted}*${dryRun ? ' (dry run)' : ''}`,
    errors > 0 ? `⚠️ Errors: ${errors}` : '',
    errorDetails.length > 0 ? '\n' + errorDetails.slice(0, 3).join('\n') : '',
  ].filter(Boolean).join('\n');
  await sendTelegram(report);
}

main().catch(err => {
  console.error(err);
  sendTelegram(`❌ *YouTube cleanup FAILED*\n${err.message}`).finally(() => process.exit(1));
});
