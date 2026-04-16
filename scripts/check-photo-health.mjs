#!/usr/bin/env node
/**
 * Photo health monitor — HEADs every image_url stored in Supabase
 * (news, articles, players) and reports any that 404 or time out.
 *
 * Intended to run weekly from GitHub Actions. Catches the class of bugs
 * where code/validator is green but DB-level paths drift — e.g. the
 * 2026-04-15 incident where 207 news rows pointed at .jpg while files
 * were .webp (all 404, invisible to the build validator).
 *
 * Exits non-zero on ≥ FAIL_THRESHOLD dead URLs so the workflow's
 * failure hook can fire a Telegram alert.
 *
 * Env required: SUPABASE_URL, SUPABASE_SERVICE_KEY.
 * Optional:     FAIL_THRESHOLD (default 1), CONCURRENCY (default 20).
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const FAIL_THRESHOLD = parseInt(process.env.FAIL_THRESHOLD || '5', 10);
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '8', 10);
const TIMEOUT_MS = 10_000;
const SITE_ORIGIN = 'https://super.tennis';
// Wikimedia aggressively rate-limits unidentified traffic. Always send a UA.
const USER_AGENT =
  process.env.USER_AGENT ||
  'SuperTennisPhotoHealth/1.0 (+https://super.tennis; operator: sergeiperm81@gmail.com)';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(2);
}

/** Fetch distinct image_urls from a table. Returns string[]. */
async function fetchImageUrls(table, field = 'image_url') {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  url.searchParams.set('select', field);
  url.searchParams.set(field, 'not.is.null');
  // Cap at 5000 rows per table — this is health-check, not exhaustive audit.
  const res = await fetch(url.toString(), {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Range: '0-4999',
    },
  });
  if (!res.ok) throw new Error(`Supabase ${table}: HTTP ${res.status}`);
  const rows = await res.json();
  return [...new Set(rows.map((r) => r[field]).filter(Boolean))];
}

/** Resolve relative paths like `/images/x.webp` to full super.tennis URL. */
function normalizeUrl(url) {
  if (url.startsWith('/')) return SITE_ORIGIN + url;
  return url;
}

/** HEAD a URL with timeout. Returns { url, status, ok, error? }. */
async function probe(rawUrl) {
  const url = normalizeUrl(rawUrl);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const headers = { 'User-Agent': USER_AGENT };
  try {
    // Some CDNs (Wikimedia) don't serve HEAD for images; fall back to tiny GET.
    let res = await fetch(url, { method: 'HEAD', signal: ctrl.signal, redirect: 'follow', headers });
    if (res.status === 405 || res.status === 403) {
      res = await fetch(url, {
        method: 'GET',
        signal: ctrl.signal,
        redirect: 'follow',
        headers: { ...headers, Range: 'bytes=0-0' },
      });
    }
    return { url: rawUrl, status: res.status, ok: res.ok || res.status === 206 };
  } catch (e) {
    return { url: rawUrl, status: 0, ok: false, error: e.name === 'AbortError' ? 'timeout' : e.message };
  } finally {
    clearTimeout(t);
  }
}

/** Run `tasks` in batches of CONCURRENCY. */
async function runBatched(items, worker) {
  const results = [];
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const slice = items.slice(i, i + CONCURRENCY);
    const r = await Promise.all(slice.map(worker));
    results.push(...r);
    process.stdout.write(`\r  checked ${results.length}/${items.length}`);
  }
  process.stdout.write('\n');
  return results;
}

async function main() {
  console.log('Fetching image URLs from Supabase…');
  const [newsUrls, articleUrls, playerUrls] = await Promise.all([
    fetchImageUrls('news'),
    fetchImageUrls('articles'),
    fetchImageUrls('players'),
  ]);
  const all = [...new Set([...newsUrls, ...articleUrls, ...playerUrls])];
  console.log(
    `  news=${newsUrls.length} articles=${articleUrls.length} players=${playerUrls.length} unique=${all.length}`
  );

  console.log(`Probing ${all.length} URLs (concurrency=${CONCURRENCY}, timeout=${TIMEOUT_MS}ms)…`);
  const results = await runBatched(all, probe);

  // 429 = rate-limited, not dead. Log as warning, don't fail build.
  const ratelimited = results.filter((r) => r.status === 429);
  const dead = results.filter((r) => !r.ok && r.status !== 429);
  const byHost = {};
  for (const d of dead) {
    const host = (() => { try { return new URL(normalizeUrl(d.url)).host; } catch { return '?'; } })();
    (byHost[host] ||= []).push(d);
  }

  console.log(`\n✓ OK:          ${results.length - dead.length - ratelimited.length}`);
  console.log(`⚠ Rate-limited: ${ratelimited.length}  (ignored — not a failure)`);
  console.log(`✗ DEAD:        ${dead.length}`);
  if (dead.length > 0) {
    console.log('\nFailures by host:');
    for (const [host, list] of Object.entries(byHost)) {
      console.log(`  ${host}: ${list.length}`);
      for (const d of list.slice(0, 5)) {
        console.log(`    [${d.status || d.error}] ${d.url}`);
      }
      if (list.length > 5) console.log(`    … and ${list.length - 5} more`);
    }
  }

  if (dead.length >= FAIL_THRESHOLD) {
    console.error(`\nExiting non-zero: ${dead.length} dead ≥ FAIL_THRESHOLD ${FAIL_THRESHOLD}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(2);
});
