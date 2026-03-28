#!/usr/bin/env node
/**
 * Auto-post news to Bluesky (FREE API, no credits needed)
 *
 * Picks one unpublished news item from Supabase, posts to Bluesky,
 * marks as posted. Designed to run every 30 min via GitHub Actions.
 *
 * Env vars: BLUESKY_HANDLE, BLUESKY_APP_PASSWORD,
 *           SUPABASE_URL, SUPABASE_SERVICE_KEY
 */

import { createClient } from '@supabase/supabase-js';

const SITE_URL = 'https://super.tennis';
const CATEGORY_TAGS = {
  scandal:  ['tennis', 'drama', 'tennisdrama'],
  love:     ['tennis', 'love', 'tennislove'],
  money:    ['tennis', 'money', 'networth'],
  fashion:  ['tennis', 'fashion', 'tennisfashion'],
  viral:    ['tennis', 'viral', 'trending'],
  buzz:     ['tennis', 'news', 'tennisnews'],
  wellness: ['tennis', 'fitness', 'health'],
};

// --- Supabase ---
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// --- Bluesky AT Protocol ---
class BlueskyClient {
  constructor(handle, appPassword) {
    this.handle = handle;
    this.appPassword = appPassword;
    this.service = 'https://bsky.social';
    this.session = null;
  }

  async login() {
    const res = await fetch(`${this.service}/xrpc/com.atproto.server.createSession`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: this.handle,
        password: this.appPassword,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Bluesky login failed: ${err.message || res.status}`);
    }
    this.session = await res.json();
  }

  async post(text, link) {
    if (!this.session) throw new Error('Not logged in');

    // Build rich text with link facet
    const linkStart = text.indexOf(link);
    const facets = [];

    if (linkStart !== -1) {
      const encoder = new TextEncoder();
      const byteStart = encoder.encode(text.substring(0, linkStart)).length;
      const byteEnd = byteStart + encoder.encode(link).length;
      facets.push({
        index: { byteStart, byteEnd },
        features: [{ $type: 'app.bsky.richtext.facet#link', uri: link }],
      });
    }

    // Add hashtag facets
    const hashtagRegex = /#(\w+)/g;
    let match;
    const encoder = new TextEncoder();
    while ((match = hashtagRegex.exec(text)) !== null) {
      const byteStart = encoder.encode(text.substring(0, match.index)).length;
      const byteEnd = byteStart + encoder.encode(match[0]).length;
      facets.push({
        index: { byteStart, byteEnd },
        features: [{
          $type: 'app.bsky.richtext.facet#tag',
          tag: match[1],
        }],
      });
    }

    const record = {
      $type: 'app.bsky.feed.post',
      text,
      facets,
      createdAt: new Date().toISOString(),
    };

    // Add link card (external embed)
    record.embed = {
      $type: 'app.bsky.embed.external',
      external: {
        uri: link,
        title: text.split('\n')[0],
        description: 'Read the full story on super.tennis',
      },
    };

    const res = await fetch(`${this.service}/xrpc/com.atproto.repo.createRecord`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.session.accessJwt}`,
      },
      body: JSON.stringify({
        repo: this.session.did,
        collection: 'app.bsky.feed.post',
        record,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Bluesky post failed: ${err.message || res.status}`);
    }

    return await res.json();
  }
}

// --- Build post text ---
function buildPost(news) {
  const tags = CATEGORY_TAGS[news.category] || ['tennis'];
  const articleUrl = `${SITE_URL}/news/${news.slug}/`;
  const hashtags = tags.map(t => `#${t}`).join(' ');

  // Bluesky limit: 300 graphemes
  const maxTitleLen = 300 - articleUrl.length - hashtags.length - 6;
  let title = news.title;
  if (title.length > maxTitleLen) {
    title = title.substring(0, maxTitleLen - 1) + '…';
  }

  return { text: `${title}\n\n${articleUrl}\n\n${hashtags}`, url: articleUrl };
}

// --- Main ---
async function main() {
  if (!process.env.BLUESKY_HANDLE || !process.env.BLUESKY_APP_PASSWORD) {
    console.log('⏭️  Bluesky: credentials not set, skipping');
    process.exit(0);
  }

  // Get one unposted news item
  const today6am = new Date();
  today6am.setUTCHours(6, 0, 0, 0);

  const { data: news, error } = await supabase
    .from('news')
    .select('id, slug, title, category, summary')
    .eq('is_active', true)
    .is('bluesky_posted_at', null)
    .gte('published_at', today6am.toISOString())
    .order('published_at', { ascending: true })
    .limit(1)
    .single();

  if (error || !news) {
    console.log('📭 No unposted news for today — done');
    process.exit(0);
  }

  // Verify the page exists (avoid posting 404 links)
  const articleUrl = `${SITE_URL}/news/${news.slug}/`;
  const pageCheck = await fetch(articleUrl, { method: 'HEAD' }).catch(() => null);
  if (!pageCheck || pageCheck.status === 404) {
    console.log(`⏭️  Page not deployed yet: ${articleUrl} — skipping`);
    process.exit(0);
  }

  console.log(`📝 Posting: "${news.title}"`);

  const { text, url } = buildPost(news);
  console.log(`   Post (${text.length} chars):\n   ${text.replace(/\n/g, '\n   ')}`);

  // Post to Bluesky
  const bsky = new BlueskyClient(process.env.BLUESKY_HANDLE, process.env.BLUESKY_APP_PASSWORD);
  await bsky.login();
  console.log('   ✅ Logged in to Bluesky');

  const result = await bsky.post(text, url);
  console.log(`   ✅ Posted: ${result.uri}`);

  // Mark as posted
  const { error: updateErr } = await supabase
    .from('news')
    .update({ bluesky_posted_at: new Date().toISOString() })
    .eq('id', news.id);

  if (updateErr) {
    console.warn(`   ⚠️ Could not mark as posted: ${updateErr.message}`);
  }

  console.log('✅ Done');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
