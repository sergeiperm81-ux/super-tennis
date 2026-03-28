#!/usr/bin/env node
/**
 * Auto-post news to X/Twitter
 *
 * Picks one unpublished news item from Supabase, posts to X,
 * marks as posted. Designed to run every 30 min via GitHub Actions.
 *
 * Env vars: X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET,
 *           SUPABASE_URL, SUPABASE_SERVICE_KEY
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// --- Config ---
const SITE_URL = 'https://super.tennis';
const MAX_TWEET_LENGTH = 280;
const CATEGORY_HASHTAGS = {
  scandal:  '#TennisDrama #Tennis',
  love:     '#TennisLove #Tennis',
  money:    '#TennisMoney #Tennis',
  fashion:  '#TennisFashion #Tennis',
  viral:    '#TennisViral #Tennis',
  buzz:     '#TennisNews #Tennis',
  wellness: '#TennisFitness #Tennis',
};

// --- Supabase ---
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// --- OAuth 1.0a for X API v2 ---
function createOAuthHeader(method, url, params = {}) {
  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET;

  const oauthParams = {
    oauth_consumer_key: apiKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: '1.0',
  };

  const allParams = { ...oauthParams, ...params };
  const sortedKeys = Object.keys(allParams).sort();
  const paramString = sortedKeys
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(allParams[k])}`)
    .join('&');

  const baseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(paramString),
  ].join('&');

  const signingKey = `${encodeURIComponent(apiSecret)}&${encodeURIComponent(accessTokenSecret)}`;
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(baseString)
    .digest('base64');

  oauthParams.oauth_signature = signature;

  const header = 'OAuth ' + Object.keys(oauthParams)
    .sort()
    .map(k => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`)
    .join(', ');

  return header;
}

async function postTweet(text) {
  const url = 'https://api.x.com/2/tweets';
  const body = JSON.stringify({ text });
  const authHeader = createOAuthHeader('POST', url);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(`X API error ${res.status}: ${JSON.stringify(data)}`);
  }

  return data.data; // { id, text }
}

// --- Build tweet text ---
function buildTweet(news) {
  const hashtags = CATEGORY_HASHTAGS[news.category] || '#Tennis';
  const articleUrl = `${SITE_URL}/news/${news.slug}/`;

  // Title + URL + hashtags, fit in 280 chars
  // URL = 23 chars (t.co shortening), hashtags ~20 chars, newlines ~3
  const maxTitleLen = MAX_TWEET_LENGTH - 23 - hashtags.length - 6; // 6 for newlines + spaces

  let title = news.title;
  if (title.length > maxTitleLen) {
    title = title.substring(0, maxTitleLen - 1) + '…';
  }

  return `${title}\n\n${articleUrl}\n\n${hashtags}`;
}

// --- Main ---
async function main() {
  // Check credentials
  if (!process.env.X_API_KEY || !process.env.X_ACCESS_TOKEN) {
    console.log('⏭️  X/Twitter: credentials not set, skipping');
    process.exit(0);
  }

  // Get one unposted news item (oldest first, spread through the day)
  const today6am = new Date();
  today6am.setUTCHours(6, 0, 0, 0);

  const { data: news, error } = await supabase
    .from('news')
    .select('id, slug, title, category, summary')
    .eq('is_active', true)
    .is('tweeted_at', null)
    .gte('published_at', today6am.toISOString())
    .order('published_at', { ascending: true })
    .limit(1)
    .single();

  if (error || !news) {
    console.log('📭 No untweeted news for today — done');
    process.exit(0);
  }

  console.log(`📝 Posting: "${news.title}"`);

  const tweetText = buildTweet(news);
  console.log(`   Tweet (${tweetText.length} chars):\n   ${tweetText.replace(/\n/g, '\n   ')}`);

  // Post to X
  const result = await postTweet(tweetText);
  console.log(`✅ Posted: https://x.com/i/status/${result.id}`);

  // Mark as tweeted
  const { error: updateErr } = await supabase
    .from('news')
    .update({ tweeted_at: new Date().toISOString() })
    .eq('id', news.id);

  if (updateErr) {
    console.warn(`⚠️  Could not mark as tweeted: ${updateErr.message}`);
  }

  console.log('✅ Done');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
