#!/usr/bin/env node
/**
 * Cleanup orphaned Bluesky posts that link to soft-deleted news.
 *
 * After the 2026-05-04 content audit soft-deleted ~400 fabricated news items,
 * 162 of them were already posted to Bluesky. Their links now 404 and the
 * posts themselves contain fabricated headlines — must be removed.
 *
 * Algorithm:
 *   1. Load all soft-deleted news slugs from Supabase
 *   2. Login to Bluesky bot account
 *   3. Paginate through bot's author feed
 *   4. For each post, parse the embed URL to extract the news slug
 *   5. If slug is in the soft-deleted set → delete via com.atproto.repo.deleteRecord
 *   6. Clear bluesky_posted_at in DB to maintain consistency
 *
 * Env required:
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY
 *   BLUESKY_HANDLE, BLUESKY_APP_PASSWORD
 *   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (optional)
 *
 * Args:
 *   --dry-run       List what would be deleted, don't actually delete
 *   --limit N       Stop after N deletions (safety cap)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BLUESKY_HANDLE = process.env.BLUESKY_HANDLE;
const BLUESKY_APP_PASSWORD = process.env.BLUESKY_APP_PASSWORD;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_KEY');
  process.exit(1);
}
if (!BLUESKY_HANDLE || !BLUESKY_APP_PASSWORD) {
  console.error('Missing BLUESKY_HANDLE / BLUESKY_APP_PASSWORD');
  process.exit(1);
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitIdx = args.indexOf('--limit');
const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : Infinity;

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const BSKY = 'https://bsky.social';

async function bskyLogin() {
  const res = await fetch(`${BSKY}/xrpc/com.atproto.server.createSession`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: BLUESKY_HANDLE, password: BLUESKY_APP_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function fetchAuthorFeed(actor, accessJwt, cursor) {
  const url = new URL(`${BSKY}/xrpc/app.bsky.feed.getAuthorFeed`);
  url.searchParams.set('actor', actor);
  url.searchParams.set('limit', '100');
  if (cursor) url.searchParams.set('cursor', cursor);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessJwt}` } });
  if (!res.ok) throw new Error(`getAuthorFeed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function deletePost(accessJwt, repo, rkey) {
  const res = await fetch(`${BSKY}/xrpc/com.atproto.repo.deleteRecord`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessJwt}` },
    body: JSON.stringify({ repo, collection: 'app.bsky.feed.post', rkey }),
  });
  if (!res.ok) throw new Error(`deleteRecord: ${res.status} ${await res.text()}`);
  return res.json();
}

function extractSlugFromPost(post) {
  // Look for super.tennis/news/<slug>/ in the post's embed (external link)
  const embed = post.post?.embed;
  if (!embed) return null;
  const uri = embed.external?.uri || embed.record?.uri;
  if (!uri) return null;
  const match = uri.match(/super\.tennis\/news\/([^\/?#]+)/);
  return match ? match[1] : null;
}

function rkeyFromUri(uri) {
  // at://did:plc:xxx/app.bsky.feed.post/<rkey>
  const parts = uri.split('/');
  return parts[parts.length - 1];
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
  console.log(`🧹 Bluesky orphan cleanup ${dryRun ? '[DRY RUN]' : ''}`);

  // 1. Load soft-deleted news slugs from Supabase
  const deletedSlugs = new Set();
  const deletedPosted = new Map(); // slug → news.id (so we can clear bluesky_posted_at)
  let off = 0;
  while (true) {
    const { data, error } = await sb.from('news')
      .select('id, slug')
      .eq('is_active', false)
      .not('bluesky_posted_at', 'is', null)
      .range(off, off + 999);
    if (error) throw error;
    if (!data || !data.length) break;
    data.forEach(r => { deletedSlugs.add(r.slug); deletedPosted.set(r.slug, r.id); });
    if (data.length < 1000) break;
    off += 1000;
  }
  console.log(`📋 Soft-deleted news posted to Bluesky: ${deletedSlugs.size}`);

  if (deletedSlugs.size === 0) {
    console.log('✅ Nothing to clean up');
    return;
  }

  // 2. Login to Bluesky
  console.log(`🔑 Logging in as ${BLUESKY_HANDLE}...`);
  const session = await bskyLogin();
  const did = session.did;
  console.log(`   did: ${did}`);

  // 3. Paginate through author feed, find matches
  console.log(`📖 Scanning author feed...`);
  let cursor = null;
  let scanned = 0;
  let matched = 0;
  let deleted = 0;
  let errors = 0;
  const matchedRkeys = []; // {rkey, slug, newsId}

  // Walk feed until we either run out of pages or find all our deleted slugs
  while (matched < deletedSlugs.size) {
    const { feed, cursor: nextCursor } = await fetchAuthorFeed(did, session.accessJwt, cursor);
    if (!feed || feed.length === 0) break;

    for (const item of feed) {
      scanned++;
      const slug = extractSlugFromPost(item);
      if (slug && deletedSlugs.has(slug)) {
        const rkey = rkeyFromUri(item.post.uri);
        matchedRkeys.push({ rkey, slug, newsId: deletedPosted.get(slug), uri: item.post.uri });
        matched++;
      }
    }

    if (!nextCursor || nextCursor === cursor) break;
    cursor = nextCursor;
    process.stdout.write(`\r   scanned ${scanned} posts, matched ${matched} ...`);
  }
  console.log(`\n   Scanned ${scanned} total posts; matched ${matched}/${deletedSlugs.size}`);

  if (matched === 0) {
    console.log('No orphaned posts found — all deleted news posts may already be gone or out of feed range.');
    return;
  }

  // 4. Delete each matched post
  console.log(`\n🗑  ${dryRun ? 'Would delete' : 'Deleting'} ${matchedRkeys.length} posts...`);
  for (const m of matchedRkeys) {
    if (deleted + errors >= limit) {
      console.log(`\n⏸ Reached --limit ${limit}, stopping`);
      break;
    }
    if (dryRun) {
      console.log(`  [DRY] would delete ${m.rkey}  (${m.slug})`);
      deleted++;
      continue;
    }
    try {
      await deletePost(session.accessJwt, did, m.rkey);
      // Clear bluesky_posted_at so it could theoretically be re-posted (won't be —
      // it's also soft-deleted, but keeps DB consistent)
      await sb.from('news').update({ bluesky_posted_at: null }).eq('id', m.newsId);
      deleted++;
      if (deleted % 10 === 0) process.stdout.write(`\r   ${deleted}/${matchedRkeys.length}`);
    } catch (err) {
      errors++;
      console.error(`\n  ❌ ${m.rkey} (${m.slug}): ${err.message}`);
    }
    // Throttle ~10 req/s
    await new Promise(r => setTimeout(r, 100));
  }
  console.log(`\n✅ Done: ${deleted} deleted, ${errors} errors`);

  // Telegram report
  const report = [
    `🧹 *Bluesky cleanup*`,
    ``,
    `📋 Found ${matched} orphaned posts (linking to soft-deleted news)`,
    `🗑 Deleted: *${deleted}*${dryRun ? ' (dry run)' : ''}`,
    errors > 0 ? `⚠️ Errors: ${errors}` : '',
  ].filter(Boolean).join('\n');
  await sendTelegram(report);
}

main().catch(err => {
  console.error(err);
  sendTelegram(`❌ *Bluesky cleanup FAILED*\n${err.message}`).finally(() => process.exit(1));
});
