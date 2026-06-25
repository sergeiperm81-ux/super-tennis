/**
 * Publish video to YouTube Shorts via Data API v3.
 *
 * Quota: 10,000 units/day. Each upload = 1,600 units → max 6 uploads/day.
 */

import { google } from 'googleapis';
import fs from 'fs';

const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.YOUTUBE_REFRESH_TOKEN;

function getAuthClient() {
  const oauth2 = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
  oauth2.setCredentials({ refresh_token: REFRESH_TOKEN });
  return oauth2;
}

/**
 * Upload a video to YouTube as a Short
 * @param {string} filePath - Path to .mp4 file
 * @param {object} opts
 * @param {string} opts.title - Video title (max 100 chars)
 * @param {string} opts.summary - Lead text for description
 * @param {string} opts.category - News category for hashtags
 * @returns {Promise<string>} Video ID
 */
export async function publishToYouTube(filePath, { title, summary = '', category = 'buzz', slug = '', playerSlugs = [] }) {
  if (!CLIENT_ID || !REFRESH_TOKEN) {
    console.log('⏭️  YouTube: skipped (no credentials)');
    return null;
  }

  const auth = getAuthClient();
  const youtube = google.youtube({ version: 'v3', auth });

  // Phase 1 funnel (2026-06-25): drive viewers to the article so YouTube
  // actually sends traffic to the site (GA4 showed ~0 before). All env-flagged
  // for instant rollback / A-B. Description links ARE clickable on Shorts —
  // the old "no links" note was over-cautious.
  const utmCampaign = process.env.YT_UTM_CAMPAIGN || 'shorts';
  const articleUrl = slug
    ? `https://super.tennis/news/${slug}/?utm_source=youtube&utm_medium=shorts&utm_campaign=${utmCampaign}`
    : null;
  const linkLine = (flagOn('YT_DESC_LINK') && articleUrl)
    ? `▶ Full story: ${articleUrl}`
    : 'Full story & more tennis news on super.tennis';
  const hashtags = [
    buildHashtags(category),
    flagOn('YT_PLAYER_HASHTAGS') ? playerHashtags(playerSlugs) : '',
  ].filter(Boolean).join(' ').trim();
  const fullDescription = [
    summary,
    '',
    linkLine,
    '',
    hashtags,
    '#Shorts',
  ].filter(Boolean).join('\n');

  // Truncate title to 100 chars (YouTube limit)
  const safeTitle = title.length > 100 ? title.slice(0, 97) + '...' : title;

  console.log(`📺 YouTube: uploading "${safeTitle}"...`);

  try {
    const res = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: safeTitle,
          description: fullDescription,
          categoryId: '17', // Sports
          tags: ['tennis', 'super tennis', 'atp', 'wta', 'tennis news', category],
          defaultLanguage: 'en',
        },
        status: {
          privacyStatus: 'public',
          selfDeclaredMadeForKids: false,
        },
      },
      media: {
        body: fs.createReadStream(filePath),
      },
    });

    const videoId = res.data.id;
    console.log(`   ✅ YouTube: https://youtube.com/shorts/${videoId}`);

    // Optional top comment carrying the article link — an extra funnel surface.
    // Also gated on YT_DESC_LINK so flipping YT_DESC_LINK off yields a genuinely
    // link-free A/B arm (no link in the description AND none in a comment).
    // commentThreads.insert requires snippet.channelId per the API — we resolve
    // the channel that owns the video via channels.list(mine:true), so there's
    // no hardcode and no extra secret. Uses the existing youtube.force-ssl
    // scope (no re-auth). Non-fatal: never fails the upload.
    if (flagOn('YT_TOP_COMMENT') && flagOn('YT_DESC_LINK') && articleUrl) {
      try {
        const chRes = await youtube.channels.list({ part: ['id'], mine: true });
        const channelId = chRes.data.items?.[0]?.id;
        if (!channelId) throw new Error('could not resolve channelId (channels.list mine=true returned none)');
        await youtube.commentThreads.insert({
          part: ['snippet'],
          requestBody: {
            snippet: {
              channelId,
              videoId,
              topLevelComment: { snippet: { textOriginal: `📰 Full story → ${articleUrl}` } },
            },
          },
        });
        console.log('   💬 Top comment posted with article link');
      } catch (e) {
        console.warn(`   ⚠️ Top comment failed (non-fatal): ${e.message}`);
      }
    }

    return videoId;
  } catch (err) {
    console.error(`   ❌ YouTube error:`, err.message);
    if (err.errors) console.error('   Details:', JSON.stringify(err.errors));
    return null;
  }
}

function buildHashtags(category) {
  const base = '#tennis #supertennis #tennislife';
  const catTags = {
    scandal: '#drama #tennisdrama #controversy',
    love: '#tenniscouple #relationship #love',
    money: '#money #networth #earnings',
    fashion: '#fashion #tennisfashion #style',
    viral: '#viral #trending #tennismoments',
    buzz: '#news #tennisnews #breakingnews',
    wellness: '#health #fitness #tennisfitness',
  };
  return `${base} ${catTags[category] || catTags.buzz}`;
}

// Env flag helper: ON unless explicitly disabled. Defaults to ON so the funnel
// works with zero configuration ("без участия"); set to 0/false/off to A-B.
function flagOn(name) {
  const v = String(process.env[name] ?? '1').toLowerCase();
  return v !== '0' && v !== 'false' && v !== 'off';
}

// player_slugs → human-readable hashtags: "jannik-sinner" → "#JannikSinner".
// Capped at 3 to avoid a spammy tag wall.
function playerHashtags(slugs) {
  if (!Array.isArray(slugs)) return '';
  return slugs
    .slice(0, 3)
    .map((s) => '#' + String(s).split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(''))
    .join(' ');
}
