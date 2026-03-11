/**
 * SUPER.TENNIS Content Cron Worker
 *
 * Runs on Cloudflare Workers with cron triggers:
 * - Daily 06:00 UTC (08:00 Sofia): Generate tennis news → Supabase
 * - Every 3 days 07:00 UTC: Update YouTube video IDs → Supabase
 *
 * After data generation, triggers a site rebuild via deploy hook.
 */

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  OPENAI_API_KEY: string;
  GITHUB_TOKEN?: string; // GitHub PAT for triggering repository_dispatch
}

// ============================================================
// RSS FEEDS
// ============================================================
const RSS_FEEDS = [
  { name: 'Essentially Sports', url: 'https://www.essentiallysports.com/category/tennis/feed/' },
  { name: 'ESPN Tennis', url: 'https://www.espn.com/espn/rss/tennis/news' },
  { name: 'BBC Sport Tennis', url: 'https://feeds.bbci.co.uk/sport/tennis/rss.xml' },
  { name: 'Google News Tennis', url: 'https://news.google.com/rss/search?q=tennis+player+when:2d&hl=en-US&gl=US&ceid=US:en' },
  { name: 'Google News Tennis Buzz', url: 'https://news.google.com/rss/search?q=tennis+(scandal+OR+fashion+OR+engagement+OR+controversy+OR+dating+OR+wedding+OR+injury+OR+retire)&hl=en-US&gl=US&ceid=US:en' },
];

// ============================================================
// PLAYER KEYWORDS → SLUGS
// ============================================================
const PLAYER_KEYWORDS: Record<string, string> = {
  'djokovic': 'novak-djokovic', 'novak': 'novak-djokovic',
  'nadal': 'rafael-nadal', 'rafa': 'rafael-nadal',
  'federer': 'roger-federer', 'roger': 'roger-federer',
  'alcaraz': 'carlos-alcaraz', 'carlos': 'carlos-alcaraz',
  'sinner': 'jannik-sinner', 'jannik': 'jannik-sinner',
  'swiatek': 'iga-swiatek', 'iga': 'iga-swiatek',
  'sabalenka': 'aryna-sabalenka', 'gauff': 'coco-gauff',
  'medvedev': 'daniil-medvedev', 'zverev': 'alexander-zverev',
  'tsitsipas': 'stefanos-tsitsipas', 'rublev': 'andrey-rublev',
  'murray': 'andy-murray', 'serena': 'serena-williams',
  'osaka': 'naomi-osaka', 'kyrgios': 'nick-kyrgios',
  'ruud': 'casper-ruud', 'fritz': 'taylor-fritz',
  'pegula': 'jessica-pegula', 'keys': 'madison-keys',
  'raducanu': 'emma-raducanu', 'rybakina': 'elena-rybakina',
  'draper': 'jack-draper', 'shelton': 'ben-shelton',
};

// ============================================================
// YOUTUBE CHANNEL IDS (for video RSS updates)
// ============================================================
const YOUTUBE_CHANNELS = [
  { id: 'UCbcxFkd6B9xUU54InHv4Tig', name: 'Tennis TV', category: 'highlights' },
  { id: 'UCaBIVVpHjq6j3tSyxwTE-8Q', name: 'WTA', category: 'highlights' },
  { id: 'UCF3K1Jf8hjFW8qliei8fQ3A', name: 'Roland-Garros', category: 'grand-slams' },
  { id: 'UCNa8NxMgSm7m4Ii9d4QGk1Q', name: 'Wimbledon', category: 'grand-slams' },
  { id: 'UC7joGi4V3-r9i5tmmw7dM6g', name: 'US Open Tennis', category: 'grand-slams' },
  { id: 'UCeTKJSW1NTAkf27nNmjWt5A', name: 'Australian Open', category: 'grand-slams' },
  { id: 'UCDitdIjOjS9Myza9I21IqzQ', name: 'Tennis Channel', category: 'analysis' },
  { id: 'UC9ZPFOiLoEeOBJseKICaFFQ', name: 'The Tennis Podcast', category: 'analysis' },
  { id: 'UCtak3C1t8k3u8CVzVGYvemA', name: 'Intuitive Tennis', category: 'analysis' },
  { id: 'UCeCmnibUIaXUI1WEbUO7lVw', name: 'Essential Tennis', category: 'coaching' },
  { id: 'UCT4PpIx1TWzgzi4gZKaZamA', name: 'Top Tennis Training', category: 'coaching' },
  { id: 'UC5LvAVo8fSKuEMsBN7s7ZhA', name: 'Functional Tennis', category: 'coaching' },
  { id: 'UCNes26KJrwooRadnxzJfcPA', name: 'Ben Shelton', category: 'vlogs' },
];

// ============================================================
// SUPABASE REST HELPERS
// ============================================================
async function supabaseQuery(
  env: Env,
  table: string,
  method: string,
  params?: Record<string, string>,
  body?: any,
  headers?: Record<string, string>,
): Promise<any> {
  const url = new URL(`${env.SUPABASE_URL}/rest/v1/${table}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    method,
    headers: {
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'resolution=merge-duplicates,return=representation' : 'return=representation',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${method} ${table}: ${res.status} ${text}`);
  }
  return res.json();
}

// ============================================================
// SIMPLE XML PARSER (regex-based for RSS, no npm dependency)
// ============================================================
interface RssItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
  sourceName: string;
  imageUrl: string | null;
  realUrl: string | null;
}

function parseRssXml(xml: string, feedName: string): RssItem[] {
  const items: RssItem[] = [];
  // Match all <item>...</item> blocks
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = extractTag(block, 'title');
    const link = extractTag(block, 'link') || extractAttr(block, 'link', 'href');
    const pubDate = extractTag(block, 'pubDate') || extractTag(block, 'published') || extractTag(block, 'updated');
    const description = extractTag(block, 'description') || extractTag(block, 'summary');
    const sourceTag = block.match(/<source[^>]*url="([^"]*)"[^>]*>([^<]*)<\/source>/i);
    const realUrl = sourceTag ? sourceTag[1] : null;
    const source = sourceTag ? sourceTag[2] : feedName;

    // Extract image from media:content, enclosure, or description
    let imageUrl: string | null = null;
    const mediaContent = block.match(/<media:content[^>]+url="([^"]+)"/i);
    const mediaThumbnail = block.match(/<media:thumbnail[^>]+url="([^"]+)"/i);
    const enclosure = block.match(/<enclosure[^>]+url="([^"]+)"[^>]+type="image/i);
    const descImg = (description || '').match(/<img[^>]+src="([^"]+)"/i);
    imageUrl = mediaContent?.[1] || mediaThumbnail?.[1] || enclosure?.[1] || descImg?.[1] || null;

    if (title) {
      items.push({
        title: decodeHtmlEntities(title),
        link: link || '',
        pubDate: pubDate || '',
        description: description || '',
        source,
        sourceName: feedName,
        imageUrl,
        realUrl,
      });
    }
  }

  // Also try Atom format <entry>
  if (items.length === 0) {
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
    while ((match = entryRegex.exec(xml)) !== null) {
      const block = match[1];
      const title = extractTag(block, 'title');
      const link = extractAttr(block, 'link', 'href');
      const pubDate = extractTag(block, 'published') || extractTag(block, 'updated');
      if (title) {
        items.push({
          title: decodeHtmlEntities(title),
          link: link || '',
          pubDate: pubDate || '',
          description: '',
          source: feedName,
          sourceName: feedName,
          imageUrl: null,
          realUrl: null,
        });
      }
    }
  }

  return items;
}

function extractTag(xml: string, tag: string): string {
  // Handle CDATA
  const cdataMatch = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i'));
  if (cdataMatch) return cdataMatch[1].trim();
  const match = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, 'i'));
  return match ? match[1].trim() : '';
}

function extractAttr(xml: string, tag: string, attr: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]+${attr}="([^"]*)"`, 'i'));
  return match ? match[1] : '';
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
}

// ============================================================
// RSS FETCHING
// ============================================================
async function fetchFeed(feed: { name: string; url: string }): Promise<RssItem[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(feed.url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SuperTennisBot/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRssXml(xml, feed.name);
  } catch {
    return [];
  }
}

// ============================================================
// FILTERS
// ============================================================
const MATCH_SCORE_RE = /\d{1,2}-\d{1,2}[,\s]+\d{1,2}-\d{1,2}/;
const BORING_RE = /\b(draw|bracket|seeds|qualifying|prediction|preview|odds|betting|pick|tip)\b/i;

function isGoodHeadline(item: RssItem, hoursAgo: number): boolean {
  if (!item.title || item.title.length < 10) return false;
  if (MATCH_SCORE_RE.test(item.title)) return false;
  if (BORING_RE.test(item.title)) return false;
  if (item.pubDate) {
    try {
      const pub = new Date(item.pubDate).getTime();
      const cutoff = Date.now() - hoursAgo * 3600000;
      if (pub < cutoff) return false;
    } catch { /* include if unparseable */ }
  }
  return true;
}

// ============================================================
// OG:IMAGE EXTRACTION
// ============================================================
async function fetchOgImage(url: string, rssImage: string | null): Promise<string | null> {
  if (rssImage && rssImage.startsWith('http') && !rssImage.includes('1x1') && !rssImage.includes('pixel')) {
    return rssImage;
  }
  if (!url || url.includes('news.google.com')) return null; // Skip Google News URLs (redirect issues)

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SuperTennisBot/1.0)' },
      redirect: 'follow',
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();

    const patterns = [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1] && match[1].startsWith('http')) {
        return match[1].replace(/&amp;/g, '&');
      }
    }
  } catch { /* ignore */ }
  return null;
}

// ============================================================
// PLAYER PHOTO LOOKUP
// ============================================================
async function findPlayerPhoto(env: Env, playerName: string | null): Promise<string | null> {
  if (!playerName) return null;
  try {
    const parts = playerName.trim().split(/\s+/);
    const lastName = parts[parts.length - 1];
    const data = await supabaseQuery(env, 'players', 'GET', {
      'select': 'first_name,last_name,image_url',
      'last_name': `ilike.${lastName}`,
      'image_url': 'not.is.null',
      'limit': '5',
    });
    if (!data || data.length === 0) return null;
    if (data.length === 1) return data[0].image_url;
    const firstName = parts.slice(0, -1).join(' ').toLowerCase();
    const exact = data.find((p: any) => p.first_name.toLowerCase().startsWith(firstName));
    return exact?.image_url || data[0].image_url;
  } catch { return null; }
}

function findPlayerSlugs(text: string): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const [keyword, slug] of Object.entries(PLAYER_KEYWORDS)) {
    if (lower.includes(keyword)) found.add(slug);
  }
  return [...found];
}

// ============================================================
// OPENAI CURATION
// ============================================================
async function curateWithOpenAI(env: Env, headlines: RssItem[], limit: number): Promise<any[]> {
  const headlineList = headlines.map((h, i) => `${i + 1}. [${h.sourceName}] ${h.title}`).join('\n');

  const systemPrompt = `You are an editorial writer for SUPER.TENNIS, a tennis website for casual fans who love the drama and lifestyle around tennis — not just match scores.

Select the ${limit} most interesting stories, then write an original article for each.

WANT: Scandals, controversies, drama, fashion, style, business deals, endorsements, relationships, engagements, unusual/funny stories, injuries, comebacks, retirement news, off-court lifestyle, record-breaking achievements.

DON'T WANT: Regular match results, tournament draws, predictions, betting odds, routine press conferences, technical analysis.

For each story provide:
1. A catchy headline (max 80 chars)
2. A short summary (2-3 sentences, ~50 words)
3. A full article body (300-500 words) in markdown. Do NOT include "Category:" or "Main Player:" tags in the body.
4. Category: one of "buzz", "scandal", "business", "fashion", "funny", "wellness"
5. The FULL NAME of the main player (or null if no specific player)`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Select ${limit} most interesting headlines and write articles:\n\n${headlineList}\n\nRespond with JSON array (no markdown fences):\n[{"original_index":1,"title":"...","summary":"...","body":"...","category":"buzz","main_player":"Full Name"}]`,
        },
      ],
      temperature: 0.7,
      max_tokens: 6000,
    }),
  });

  if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
  const data = await res.json() as any;
  const content = data.choices[0]?.message?.content || '';
  const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(jsonStr);
}

// ============================================================
// NEWS GENERATION
// ============================================================
async function generateNews(env: Env): Promise<string> {
  const LIMIT = 8;
  const HOURS = 48;
  const logs: string[] = [];
  const log = (msg: string) => { logs.push(msg); console.log(msg); };

  log('🎾 Starting news generation...');

  // 1. Deactivate old news (>30 days)
  try {
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    await supabaseQuery(env, 'news', 'PATCH',
      { 'published_at': `lt.${monthAgo}`, 'is_active': 'eq.true' },
      { is_active: false },
    );
    log('🗑️  Deactivated old news');
  } catch (e: any) { log(`⚠️  Deactivate error: ${e.message}`); }

  // 2. Fetch RSS feeds
  log('📡 Fetching RSS feeds...');
  const feedResults = await Promise.all(RSS_FEEDS.map(f => fetchFeed(f)));
  const allItems = feedResults.flat();
  log(`   Found ${allItems.length} total items`);

  // 3. Filter
  const filtered = allItems.filter(item => isGoodHeadline(item, HOURS));
  log(`   After filtering: ${filtered.length} items`);
  if (filtered.length === 0) { log('⚠️ No suitable items'); return logs.join('\n'); }

  // 4. Deduplicate against existing
  const urls = filtered.map(i => i.link).filter(Boolean);
  let existingUrls = new Set<string>();
  try {
    const existing = await supabaseQuery(env, 'news', 'GET', {
      'select': 'source_url',
      'source_url': `in.(${urls.map(u => `"${u}"`).join(',')})`,
    });
    existingUrls = new Set((existing || []).map((r: any) => r.source_url));
  } catch { /* ignore dedup errors */ }
  const newItems = filtered.filter(i => !existingUrls.has(i.link));
  log(`   After dedup: ${newItems.length} new items`);
  if (newItems.length === 0) { log('✅ All news already in DB'); return logs.join('\n'); }

  // 5. OpenAI curation
  const candidates = newItems.slice(0, 25);
  log('🤖 Calling OpenAI...');
  let curated: any[];
  try {
    curated = await curateWithOpenAI(env, candidates, LIMIT);
  } catch (e: any) {
    log(`❌ OpenAI failed: ${e.message}`);
    return logs.join('\n');
  }
  log(`   Selected ${curated.length} stories`);

  // 6. Build news rows
  const today = new Date().toISOString().split('T')[0];
  const newsRows: any[] = [];
  const usedPhotos = new Set<string>();

  for (let i = 0; i < curated.length; i++) {
    const c = curated[i];
    const origIdx = (c.original_index || i + 1) - 1;
    const original = candidates[origIdx] || candidates[i] || candidates[0];
    const playerSlugs = findPlayerSlugs(`${c.title} ${c.summary} ${c.body || ''}`);

    // Image: RSS → og:image → player photo → null
    let imageUrl = await fetchOgImage(original.link, original.imageUrl);
    if (!imageUrl && c.main_player) {
      const photo = await findPlayerPhoto(env, c.main_player);
      if (photo && !usedPhotos.has(photo)) {
        imageUrl = photo;
        usedPhotos.add(photo);
      }
    }

    const titleSlug = c.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
    const slug = `${today}-${titleSlug}`;

    newsRows.push({
      slug,
      title: c.title.replace(/\s*📷\s*/g, '').trim(),
      summary: c.summary,
      body: c.body || null,
      category: c.category || 'buzz',
      image_url: imageUrl,
      source_name: typeof original.source === 'string' ? original.source : original.sourceName,
      source_url: original.link || '',
      original_title: original.title || '',
      player_slugs: playerSlugs,
      published_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
      is_active: true,
    });

    log(`  ✅ ${(c.category || 'buzz').toUpperCase().padEnd(8)} ${c.title}`);
  }

  // 7. Upsert into Supabase
  log(`💾 Upserting ${newsRows.length} items...`);
  try {
    await supabaseQuery(env, 'news', 'POST', { 'on_conflict': 'slug' }, newsRows);
    log(`   ✅ Saved ${newsRows.length} items`);
  } catch (e: any) {
    log(`❌ Supabase error: ${e.message}`);
  }

  return logs.join('\n');
}

// ============================================================
// YOUTUBE VIDEO UPDATE
// ============================================================
interface YouTubeVideoEntry {
  videoId: string;
  title: string;
  channelName: string;
  channelId: string;
  category: string;
  publishedAt: string;
}

async function fetchYouTubeRss(channelId: string, channelName: string, category: string): Promise<YouTubeVideoEntry[]> {
  try {
    const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const xml = await res.text();

    const entries: YouTubeVideoEntry[] = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
    let match;
    while ((match = entryRegex.exec(xml)) !== null) {
      const block = match[1];
      const videoIdMatch = block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
      const titleMatch = block.match(/<title>([^<]+)<\/title>/);
      const publishedMatch = block.match(/<published>([^<]+)<\/published>/);
      if (videoIdMatch && titleMatch) {
        entries.push({
          videoId: videoIdMatch[1],
          title: decodeHtmlEntities(titleMatch[1]),
          channelName,
          channelId,
          category,
          publishedAt: publishedMatch?.[1] || new Date().toISOString(),
        });
      }
    }
    return entries.slice(0, 15); // Latest 15 per channel
  } catch { return []; }
}

async function updateVideos(env: Env): Promise<string> {
  const logs: string[] = [];
  const log = (msg: string) => { logs.push(msg); console.log(msg); };

  log('🎬 Starting video update...');

  const allVideos: YouTubeVideoEntry[] = [];
  for (const ch of YOUTUBE_CHANNELS) {
    const videos = await fetchYouTubeRss(ch.id, ch.name, ch.category);
    allVideos.push(...videos);
    log(`  📺 ${ch.name}: ${videos.length} videos`);
  }

  log(`   Total: ${allVideos.length} videos from ${YOUTUBE_CHANNELS.length} channels`);

  // Upsert into youtube_videos table in Supabase
  // Table schema: video_id (PK), title, channel_name, channel_id, category, published_at
  if (allVideos.length > 0) {
    const rows = allVideos.map(v => ({
      video_id: v.videoId,
      title: v.title,
      channel_name: v.channelName,
      channel_id: v.channelId,
      category: v.category,
      published_at: v.publishedAt,
    }));

    try {
      await supabaseQuery(env, 'youtube_videos', 'POST', { 'on_conflict': 'video_id' }, rows);
      log(`   ✅ Saved ${rows.length} videos to Supabase`);
    } catch (e: any) {
      log(`   ⚠️ Supabase video upsert error: ${e.message}`);
      log('   ℹ️  Make sure youtube_videos table exists with columns: video_id (PK), title, channel_name, channel_id, category, published_at');
    }
  }

  return logs.join('\n');
}

// ============================================================
// TRIGGER REBUILD via GitHub repository_dispatch
// ============================================================
async function triggerRebuild(env: Env): Promise<void> {
  if (!env.GITHUB_TOKEN) {
    console.log('ℹ️  No GITHUB_TOKEN set — skipping rebuild trigger');
    return;
  }
  try {
    const res = await fetch('https://api.github.com/repos/sergeiperm81-ux/super-tennis/dispatches', {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'SuperTennis-Cron-Worker',
      },
      body: JSON.stringify({
        event_type: 'content-updated',
        client_payload: { timestamp: new Date().toISOString() },
      }),
    });
    console.log(`🔄 GitHub rebuild triggered: ${res.status}`);
  } catch (e: any) {
    console.log(`⚠️  Rebuild trigger failed: ${e.message}`);
  }
}

// ============================================================
// WORKER ENTRY POINT
// ============================================================
export default {
  // Single cron trigger handler — runs daily at 06:00 UTC (08:00 Sofia)
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`⏰ Cron fired at ${new Date().toISOString()}`);

    // Always generate news (daily)
    await generateNews(env);

    // Update videos every 3 days (check day of year % 3)
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    if (dayOfYear % 3 === 0) {
      console.log('🎬 Video update day (every 3 days)');
      await updateVideos(env);
    }

    ctx.waitUntil(triggerRebuild(env));
  },

  // HTTP handler for manual triggers
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/trigger/news') {
      const result = await generateNews(env);
      return new Response(result, { headers: { 'Content-Type': 'text/plain' } });
    }

    if (url.pathname === '/trigger/videos') {
      const result = await updateVideos(env);
      return new Response(result, { headers: { 'Content-Type': 'text/plain' } });
    }

    if (url.pathname === '/trigger/all') {
      const newsResult = await generateNews(env);
      const videoResult = await updateVideos(env);
      return new Response(`${newsResult}\n\n---\n\n${videoResult}`, {
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    return new Response('SuperTennis Content Cron Worker\n\nEndpoints:\n  /trigger/news\n  /trigger/videos\n  /trigger/all', {
      headers: { 'Content-Type': 'text/plain' },
    });
  },
};
