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
export async function publishToYouTube(filePath, { title, summary = '', category = 'buzz' }) {
  if (!CLIENT_ID || !REFRESH_TOKEN) {
    console.log('⏭️  YouTube: skipped (no credentials)');
    return null;
  }

  const auth = getAuthClient();
  const youtube = google.youtube({ version: 'v3', auth });

  // Build description — no links (YouTube dislikes them in Shorts)
  const hashtags = buildHashtags(category);
  const fullDescription = [
    summary,
    '',
    'Get the full story and more tennis news on super.tennis',
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
