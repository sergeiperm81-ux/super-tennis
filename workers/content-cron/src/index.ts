/**
 * SUPER.TENNIS Content Cron Worker
 *
 * Cron schedule (daily 06:00 UTC):
 * - DAILY:  Generate 25 tennis news → Supabase (no rebuild, client-side fetch)
 * - EVERY 3 DAYS: Update YouTube video IDs → Supabase (no rebuild)
 * - WEEKLY (Monday): Generate 1 evergreen article → Supabase → rebuild
 * - MONTHLY (1st): Update ATP/WTA rankings → Supabase → rebuild
 *
 * API endpoints (client-side fetch, no rebuild needed):
 * - /api/news   → JSON with active news
 * - /api/videos → JSON with 6 featured videos (1 per category, rotated)
 * - /api/brief  → JSON with latest weekly SEO brief (password-protected)
 */

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  OPENAI_API_KEY: string;
  GITHUB_TOKEN?: string; // GitHub PAT for triggering repository_dispatch
  ANALYTICS_PASSWORD?: string; // Password for /stats/ dashboard
  CF_API_TOKEN?: string; // Cloudflare API token with Analytics:Read
  CF_ZONE_ID?: string; // Cloudflare zone ID for super.tennis
  RATE_LIMIT?: KVNamespace; // KV for brute-force protection on auth endpoints
  TELEGRAM_BOT_TOKEN?: string; // Telegram bot token for cron failure alerts
  TELEGRAM_CHAT_ID?: string; // Telegram chat ID for cron failure alerts
}

// ============================================================
// RSS FEEDS
// ============================================================
// --- Tennis-specific sources ---
const TENNIS_FEEDS = [
  { name: 'Essentially Sports', url: 'https://www.essentiallysports.com/category/tennis/feed/' },
  { name: 'ESPN Tennis', url: 'https://www.espn.com/espn/rss/tennis/news' },
  { name: 'BBC Sport Tennis', url: 'https://feeds.bbci.co.uk/sport/tennis/rss.xml' },
  { name: 'Google News Tennis', url: 'https://news.google.com/rss/search?q=tennis+player+when:2d&hl=en-US&gl=US&ceid=US:en' },
];

// --- Lifestyle / celebrity / business sources (need tennis keyword filtering) ---
const LIFESTYLE_FEEDS = [
  { name: 'TMZ', url: 'https://www.tmz.com/rss.xml' },
  { name: 'Daily Mail Sport', url: 'https://www.dailymail.co.uk/sport/tennis/index.rss' },
  { name: 'People Magazine', url: 'https://feeds.people.com/people/rss' },
  { name: 'GQ', url: 'https://www.gq.com/feed/rss' },
  { name: 'Bleacher Report', url: 'https://bleacherreport.com/tennis.rss' },
];

// --- Google News lifestyle queries (pre-filtered for tennis + drama/lifestyle) ---
const GOOGLE_NEWS_LIFESTYLE_FEEDS = [
  { name: 'GN Tennis Drama', url: 'https://news.google.com/rss/search?q=tennis+(scandal+OR+controversy+OR+drama+OR+cheating+OR+doping+OR+banned+OR+fine+OR+argument)&hl=en-US&gl=US&ceid=US:en' },
  { name: 'GN Tennis Lifestyle', url: 'https://news.google.com/rss/search?q=tennis+player+(dating+OR+wedding+OR+divorce+OR+girlfriend+OR+boyfriend+OR+wife+OR+husband+OR+baby+OR+engaged)&hl=en-US&gl=US&ceid=US:en' },
  { name: 'GN Tennis Money', url: 'https://news.google.com/rss/search?q=tennis+(endorsement+OR+sponsorship+OR+net+worth+OR+salary+OR+prize+money+OR+contract+OR+million+OR+billion+OR+richest)&hl=en-US&gl=US&ceid=US:en' },
  { name: 'GN Tennis Fashion', url: 'https://news.google.com/rss/search?q=tennis+(fashion+OR+outfit+OR+style+OR+Nike+OR+Adidas+OR+Gucci+OR+Vogue+OR+photoshoot+OR+red+carpet)&hl=en-US&gl=US&ceid=US:en' },
  { name: 'GN Tennis Social', url: 'https://news.google.com/rss/search?q=tennis+player+(instagram+OR+tiktok+OR+viral+OR+meme+OR+funny+OR+video+OR+reaction+OR+celebrity)&hl=en-US&gl=US&ceid=US:en' },
];

const RSS_FEEDS = [...TENNIS_FEEDS, ...LIFESTYLE_FEEDS, ...GOOGLE_NEWS_LIFESTYLE_FEEDS];

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
  { id: 'UCEnQWmFQmLRdAzTMYT11pBQ', name: 'Aryna Sabalenka', category: 'entertainment' },
  { id: 'UCXQ-a9jN5DkWtSYKjVXqsew', name: 'Fuzzy Yellow Balls', category: 'entertainment' },
];

// ============================================================
// RETRY HELPER — retries on 5xx / network errors with backoff
// ============================================================
async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries = 3,
  delays = [10_000, 60_000, 180_000], // 10s, 1min, 3min — escalating
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const msg = err?.message || String(err);
      const isRetryable = msg.includes('5') || msg.includes('timeout') || msg.includes('network') || msg.includes('fetch failed');
      if (attempt === maxRetries || !isRetryable) {
        console.error(`❌ ${label} failed after ${attempt} attempt(s): ${msg}`);
        throw err;
      }
      const delay = delays[attempt - 1] || delays[delays.length - 1];
      console.log(`⚠️ ${label} attempt ${attempt} failed (${msg}), retrying in ${delay / 1000}s...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error(`${label} exhausted retries`);
}

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

// Tennis keywords for filtering lifestyle sources — must mention tennis or a known player
const TENNIS_KEYWORDS_RE = new RegExp(
  '\\b(' +
  'tennis|' +
  Object.keys(PLAYER_KEYWORDS).filter(k => k.length > 3).join('|') + // skip short names like 'iga', 'rafa'
  ')\\b',
  'i',
);

// Names of lifestyle feeds that need tennis keyword filtering
const LIFESTYLE_FEED_NAMES = new Set(LIFESTYLE_FEEDS.map(f => f.name));

function isGoodHeadline(item: RssItem, hoursAgo: number): boolean {
  if (!item.title || item.title.length < 10) return false;
  if (MATCH_SCORE_RE.test(item.title)) return false;
  if (BORING_RE.test(item.title)) return false;

  // Lifestyle sources must mention tennis or a known player in title/description
  if (LIFESTYLE_FEED_NAMES.has(item.sourceName)) {
    const text = `${item.title} ${item.description}`;
    if (!TENNIS_KEYWORDS_RE.test(text)) return false;
  }

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
// Reject generic site logos/banners that aren't real article images
const OG_IMAGE_BLACKLIST = [
  'th-banner', 'og-default', 'logo', 'site-banner', 'default-share',
  'placeholder', 'favicon', 'brand-', 'social-share', 'og_image',
];

function isGenericOgImage(imageUrl: string): boolean {
  const lower = imageUrl.toLowerCase();
  return OG_IMAGE_BLACKLIST.some(term => lower.includes(term));
}

async function fetchOgImage(url: string, rssImage: string | null, realUrl?: string | null): Promise<string | null> {
  if (rssImage && rssImage.startsWith('http') && !rssImage.includes('1x1') && !rssImage.includes('pixel') && !isGenericOgImage(rssImage)) {
    return rssImage;
  }

  // For Google News URLs, try the real source URL instead
  const fetchUrl = (url && url.includes('news.google.com') && realUrl) ? realUrl : url;
  if (!fetchUrl) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(fetchUrl, {
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
      if (match?.[1] && match[1].startsWith('http') && !isGenericOgImage(match[1])) {
        return match[1].replace(/&amp;/g, '&');
      }
    }
  } catch { /* ignore */ }
  return null;
}

// ============================================================
// PLAYER PHOTO LOOKUP
// ============================================================
const _playerPhotoCache = new Map<string, string | null>();
async function findPlayerPhoto(env: Env, playerName: string | null): Promise<string | null> {
  if (!playerName) return null;
  const cacheKey = playerName.trim().toLowerCase();
  if (_playerPhotoCache.has(cacheKey)) return _playerPhotoCache.get(cacheKey)!;
  try {
    const parts = playerName.trim().split(/\s+/);
    const lastName = parts[parts.length - 1];
    const data = await supabaseQuery(env, 'players', 'GET', {
      'select': 'first_name,last_name,image_url',
      'last_name': `ilike.${lastName}`,
      'image_url': 'not.is.null',
      'limit': '5',
    });
    if (!data || data.length === 0) { _playerPhotoCache.set(cacheKey, null); return null; }
    let result: string;
    if (data.length === 1) { result = data[0].image_url; }
    else {
      const firstName = parts.slice(0, -1).join(' ').toLowerCase();
      const exact = data.find((p: any) => p.first_name.toLowerCase().startsWith(firstName));
      result = exact?.image_url || data[0].image_url;
    }
    _playerPhotoCache.set(cacheKey, result);
    return result;
  } catch { _playerPhotoCache.set(cacheKey, null); return null; }
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

  const systemPrompt = `You are the editor-in-chief of SUPER.TENNIS — the glossiest tennis lifestyle magazine on the internet. Think Vanity Fair meets TMZ meets Vogue, but entirely about the world of tennis. Our readers are NOT tennis nerds — they're people who love celebrity culture, fashion, money, drama, and glamour, and tennis happens to be their lens into that world.

Select the ${limit} most entertaining stories, then write an original article for each.

CATEGORY TARGETS — aim for this MIX in every batch:
- "scandal" (3-4 stories): controversies, feuds, arguments, fines, doping, cheating, meltdowns, heated rivalries
- "love" (2-3 stories): dating, engagements, weddings, breakups, divorces, WAGs, couples spotted together, player romances
- "money" (2-3 stories): net worth, endorsement deals, prize money milestones, luxury purchases, mansions, cars, investments, sponsorships
- "fashion" (1-2 stories): outfits, brand deals, Nike/Adidas/Gucci collabs, red carpet, photoshoots, style evolution
- "viral" (1-2 stories): social media moments, Instagram/TikTok, memes, funny incidents, celebrity crossovers, viral clips
- "buzz" (remaining): major upsets with drama, comebacks, injuries, retirements, record-breaking — but ONLY if genuinely exciting

PRIORITY ORDER: scandal > love > money > fashion > viral > buzz
If multiple headlines cover the same event, pick the most dramatic angle and SKIP the rest.

DON'T WANT: Regular match results, tournament draws, predictions, betting odds, routine press conferences, technical analysis, coaching tips. A match is ONLY interesting if there's drama (meltdown, upset, controversy, rivalry beef).

TONE: Glossy magazine meets tabloid. Engaging, bold, slightly gossipy but not mean-spirited. Use vivid, punchy language. Think headlines that make people STOP scrolling. Our brand is "tennis for people who don't play tennis."

HEADLINE RULES:
- Max 75 chars, must provoke curiosity or emotion
- Use power words: "Shocking", "Revealed", "Secret", "Stunning", "Exclusive"
- Name-drop the player in the headline when possible
- NO generic headlines like "A New Era in Tennis" or "Rising Star"

For each story provide:
1. A catchy, click-worthy headline (max 75 chars)
2. A short summary (2-3 punchy sentences, ~50 words)
3. A full article body (300-500 words) in markdown. Write in magazine style — vivid descriptions, quotes where relevant, personality. Do NOT include "Category:" or "Main Player:" tags in the body.
4. Category: one of "scandal", "love", "money", "fashion", "viral", "buzz"
5. The FULL NAME of the main player (or null if no specific player)`;

  const res = await withRetry(async () => {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: `Select ${limit} most entertaining headlines and write articles:\n\n${headlineList}\n\nRespond with JSON array (no markdown fences):\n[{"original_index":1,"title":"...","summary":"...","body":"...","category":"scandal|love|money|fashion|viral|buzz","main_player":"Full Name"}]`,
          },
        ],
        temperature: 0.7,
        max_tokens: 16384,
      }),
    });
    if (!r.ok) throw new Error(`OpenAI error ${r.status}: ${await r.text()}`);
    return r;
  }, 'OpenAI curation');
  const data = await res.json() as any;
  const content = data.choices[0]?.message?.content || '';
  const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('OpenAI returned invalid JSON:', jsonStr.slice(0, 500));
    return [];
  }
}

// ============================================================
// NEWS GENERATION
// ============================================================
async function generateNews(env: Env): Promise<string> {
  const LIMIT = 25;
  const HOURS = 48;
  const logs: string[] = [];
  const log = (msg: string) => { logs.push(msg); console.log(msg); };

  log('🎾 Starting news generation...');

  // 1. (moved) Deactivation happens AFTER successful upsert to avoid blank news window

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

  // 5. OpenAI curation (split into two batches — gpt-4o-mini max 16384 tokens)
  const allCandidates = newItems.slice(0, 50);
  const batchA = allCandidates.slice(0, 25);
  const batchB = allCandidates.slice(25, 50);
  const limitA = Math.ceil(LIMIT / 2);  // 13
  const limitB = LIMIT - limitA;         // 12

  log(`🤖 Calling OpenAI (batch A: ${batchA.length} candidates → ${limitA} articles)...`);
  let curated: any[] = [];
  try {
    const curatedA = await curateWithOpenAI(env, batchA, limitA);
    curated.push(...curatedA);
    log(`   Batch A: ${curatedA.length} stories`);
  } catch (e: any) {
        console.error('API error:', e.message);
    log(`❌ OpenAI batch A failed: ${e.message}`);
  }

  if (batchB.length > 0) {
    log(`🤖 Calling OpenAI (batch B: ${batchB.length} candidates → ${limitB} articles)...`);
    try {
      const curatedB = await curateWithOpenAI(env, batchB, limitB);
      // Adjust original_index to account for batch B offset
      for (const item of curatedB) {
        if (item.original_index) item.original_index += 25;
      }
      curated.push(...curatedB);
      log(`   Batch B: ${curatedB.length} stories`);
    } catch (e: any) {
        console.error('API error:', e.message);
      log(`❌ OpenAI batch B failed: ${e.message}`);
    }
  }

  if (curated.length === 0) { log('❌ No stories from OpenAI'); return logs.join('\n'); }
  log(`   Total: ${curated.length} stories`);
  const candidates = allCandidates; // for image lookup below

  // 6. Build news rows
  const today = new Date().toISOString().split('T')[0];
  const newsRows: any[] = [];
  const usedImages = new Set<string>(); // Track ALL used image URLs to prevent duplicates

  for (let i = 0; i < curated.length; i++) {
    const c = curated[i];
    const origIdx = (c.original_index || i + 1) - 1;
    const original = candidates[origIdx] || candidates[i] || candidates[0];
    const playerSlugs = findPlayerSlugs(`${c.title} ${c.summary} ${c.body || ''}`);

    // Image priority: player photo FIRST (recognizable faces) → RSS og:image → stock
    let imageUrl: string | null = null;

    // Priority 1: player photo from main_player field (best — always recognizable)
    if (c.main_player) {
      const photo = await findPlayerPhoto(env, c.main_player);
      if (photo && !usedImages.has(photo)) {
        imageUrl = photo;
      }
    }

    // Priority 2: scan title for known player names → use their photo
    if (!imageUrl) {
      const titleLower = c.title.toLowerCase();
      for (const [keyword, slug] of Object.entries(PLAYER_KEYWORDS)) {
        if (keyword.length > 3 && titleLower.includes(keyword)) {
          const nameParts = slug.split('-');
          const lastName = nameParts[nameParts.length - 1];
          const photo = await findPlayerPhoto(env, lastName);
          if (photo && !usedImages.has(photo)) {
            imageUrl = photo;
            break;
          }
        }
      }
    }

    // Priority 3: RSS image from feed (no extra fetch — saves subrequests)
    if (!imageUrl && original.imageUrl && !usedImages.has(original.imageUrl)) {
      const lowerImg = original.imageUrl.toLowerCase();
      const isGeneric = /placeholder|default|logo|icon|favicon|blank|spacer|1x1|pixel/i.test(lowerImg);
      if (!isGeneric) {
        imageUrl = original.imageUrl;
      }
    }

    // Priority 4: curated stock tennis photos from our site (never leave blank)
    if (!imageUrl) {
      const STOCK_PHOTOS = [
        'court-01','court-02','court-03','court-04','court-05','court-06','court-07','court-08','court-09','court-10',
        'court-11','court-12','court-13','court-14','court-15',
        'equip-01','equip-02','equip-03','equip-04','equip-05','equip-06','equip-07','equip-08','equip-09','equip-10',
        'equip-11','equip-12','equip-13','equip-14','equip-15',
      ];
      const pick = STOCK_PHOTOS[i % STOCK_PHOTOS.length];
      // Stock pool files on disk are .webp — historical bug: used to write .jpg
      // which 404'd for every fallback row. Keep in sync with public/images/news/.
      imageUrl = `https://super.tennis/images/news/${pick}.webp`;
    }

    if (imageUrl) usedImages.add(imageUrl);

    const titleSlug = c.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120);
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

  // 7. Deduplicate slugs within the batch (Supabase rejects same-slug twice in one upsert)
  const seenSlugs = new Set<string>();
  const dedupedRows = newsRows.filter(r => {
    if (seenSlugs.has(r.slug)) {
      log(`  ⚠️ Dedup: skipping duplicate slug ${r.slug}`);
      return false;
    }
    seenSlugs.add(r.slug);
    return true;
  });

  // 8. Upsert into Supabase, then deactivate old news only on success
  log(`💾 Upserting ${dedupedRows.length} items (${newsRows.length - dedupedRows.length} dupes removed)...`);
  try {
    await supabaseQuery(env, 'news', 'POST', { 'on_conflict': 'slug' }, dedupedRows);
    log(`   ✅ Saved ${dedupedRows.length} items`);
    // Keep all news active — they serve as SSG pages for Google indexing
    // Old news stay in the archive, only the latest batch shows first in the feed
    log('📦  All news preserved in archive (no deactivation)');
  } catch (e: any) {
        console.error('API error:', e.message);
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
        console.error('API error:', e.message);
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
        console.error('API error:', e.message);
    console.log(`⚠️  Rebuild trigger failed: ${e.message}`);
  }
}

// ============================================================
// SEEDED RANDOM (deterministic per period)
// ============================================================
function seededPick<T>(arr: T[], seed: number): T {
  let s = seed;
  s = (s * 1103515245 + 12345) & 0x7fffffff;
  return arr[s % arr.length];
}

// ============================================================
// CORS HELPERS
// ============================================================
function getCorsOrigin(request: Request): string {
  const origin = request.headers.get('Origin') || '';
  if (origin === 'https://super.tennis') return origin;
  return 'https://super.tennis';
}

function corsHeaders(request: Request): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': getCorsOrigin(request),
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(data: any, cacheSeconds: number = 300, request?: Request): Response {
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${cacheSeconds}`,
      ...(request ? corsHeaders(request) : { 'Access-Control-Allow-Origin': 'https://super.tennis', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Max-Age': '86400' }),
    },
  });
}

// ============================================================
// VIDEO CATEGORY METADATA
// ============================================================
const VIDEO_CATEGORIES = ['highlights', 'grand-slams', 'analysis', 'coaching', 'vlogs', 'entertainment'] as const;
const VIDEO_CAT_META: Record<string, { label: string; color: string }> = {
  'highlights':    { label: 'Tour Highlights',  color: '#2563eb' },
  'grand-slams':   { label: 'Grand Slams',      color: '#059669' },
  'analysis':      { label: 'News & Analysis',  color: '#7c3aed' },
  'coaching':      { label: 'Training',         color: '#0891b2' },
  'vlogs':         { label: 'Player Vlogs',     color: '#dc2626' },
  'entertainment': { label: 'Entertainment',    color: '#d97706' },
};

// ============================================================
// WEEKLY ARTICLE GENERATION
// ============================================================
const ARTICLE_SECTIONS = ['tournaments', 'gear', 'lifestyle'] as const;

const ARTICLE_SYSTEM_PROMPTS: Record<string, string> = {
  tournaments: `You are a tennis travel and tournament expert writing for super.tennis, a website for casual fans who love tennis culture.
Write an engaging, evergreen article that will stay relevant for years. Focus on history, atmosphere, spectator tips, venue guides, or cultural aspects of tournaments.
Use markdown formatting with ## headers. Write 800-1200 words. Be informative and entertaining.`,

  gear: `You are a tennis equipment specialist writing for super.tennis, a website for casual fans and recreational players.
Write an engaging, evergreen guide about tennis equipment, technology, or gear choices. Make it practical and useful for club players.
Use markdown formatting with ## headers. Write 800-1200 words. Include actionable advice.`,

  lifestyle: `You are a tennis lifestyle and culture writer for super.tennis, a website for casual fans.
Write an engaging, evergreen article about tennis culture, fashion, travel, fitness, movies, books, or the social side of tennis.
Use markdown formatting with ## headers. Write 800-1200 words. Be entertaining and insightful.`,
};

async function generateWeeklyArticle(env: Env): Promise<string> {
  const logs: string[] = [];
  const log = (msg: string) => { logs.push(msg); console.log(msg); };

  const weekNum = Math.floor(Date.now() / (7 * 86400000));
  const section = ARTICLE_SECTIONS[weekNum % 3];
  log(`📝 Weekly article: section="${section}" (week ${weekNum})`);

  // 1. Get existing articles to avoid duplication
  let existingTitles = '';
  try {
    const existing = await supabaseQuery(env, 'articles', 'GET', {
      'category': `eq.${section}`,
      'select': 'title',
      'limit': '100',
    });
    existingTitles = (existing || []).map((a: any) => a.title).join('\n- ');
    log(`   Found ${existing.length} existing ${section} articles`);
  } catch (e: any) {
        console.error('API error:', e.message);
    log(`   ⚠️ Could not fetch existing articles: ${e.message}`);
  }

  // 2. Generate article via OpenAI
  log('🤖 Calling OpenAI for article generation...');
  const userPrompt = `Write a NEW evergreen article for the "${section}" section of super.tennis.
The article must be relevant for months or years — avoid references to specific recent events or dates.

${existingTitles ? `EXISTING articles in this section (DO NOT duplicate these topics):\n- ${existingTitles}\n` : ''}
Return ONLY a JSON object (no markdown fences, no extra text):
{"slug":"kebab-case-slug-max-60-chars","title":"Article Title","body":"full markdown article 800-1200 words","excerpt":"first 150-200 chars summary","meta_title":"SEO title max 60 chars","meta_description":"SEO description max 155 chars"}`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: ARTICLE_SYSTEM_PROMPTS[section] },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 4000,
      }),
    });

    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
    const data = await res.json() as any;
    const content = data.choices[0]?.message?.content || '';
    const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const article = JSON.parse(jsonStr);

    // 3. Insert into articles table
    await supabaseQuery(env, 'articles', 'POST', { 'on_conflict': 'slug' }, [{
      slug: article.slug,
      title: article.title,
      category: section,
      subcategory: null,
      body: article.body,
      excerpt: article.excerpt || article.body.slice(0, 200),
      meta_title: article.meta_title || article.title,
      meta_description: article.meta_description || article.excerpt,
      image_url: null,
      image_alt: null,
      status: 'published',
      published_at: new Date().toISOString(),
    }]);

    log(`   ✅ Generated: "${article.title}" (${section}/${article.slug})`);
  } catch (e: any) {
        console.error('API error:', e.message);
    log(`   ❌ Article generation failed: ${e.message}`);
  }

  return logs.join('\n');
}

// ============================================================
// WEEKLY BRIEF GENERATION
// ============================================================
async function generateWeeklyBrief(env: Env): Promise<string> {
  const logs: string[] = [];
  const log = (msg: string) => { logs.push(msg); console.log(msg); };
  log('📋 Generating weekly brief...');

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() - 7);
  const weekStartStr = weekStart.toISOString().split('T')[0];

  // 1. Collect stats from last week
  let newsCount = 0, topCategories: any[] = [], topNews: any[] = [];
  try {
    const news = await supabaseQuery(env, 'news', 'GET', {
      'select': 'title,category,published_at',
      'is_active': 'eq.true',
      'published_at': `gte.${weekStartStr}T00:00:00Z`,
      'order': 'published_at.desc',
      'limit': '200',
    });
    newsCount = news.length;
    // Count by category
    const catCount: Record<string, number> = {};
    for (const n of news) { catCount[n.category] = (catCount[n.category] || 0) + 1; }
    topCategories = Object.entries(catCount).sort((a, b) => b[1] - a[1]).map(([cat, count]) => ({ category: cat, count }));
    topNews = news.slice(0, 10).map((n: any) => ({ title: n.title, category: n.category }));
    log(`   ${newsCount} news this week, top category: ${topCategories[0]?.category || 'none'}`);
  } catch (e: any) { log(`   ⚠️ News stats: ${e.message}`); }

  // 2. Video publications this week
  let videoCount = 0;
  try {
    const vids = await supabaseQuery(env, 'video_publications', 'GET', {
      'select': 'title,youtube_id',
      'scheduled_at': `gte.${weekStartStr}T00:00:00Z`,
      'limit': '50',
    });
    videoCount = vids.filter((v: any) => v.youtube_id).length;
    log(`   ${videoCount} videos published this week`);
  } catch (e: any) { log(`   ⚠️ Video stats: ${e.message}`); }

  // 3. Articles created this week
  let newArticles = 0;
  try {
    const arts = await supabaseQuery(env, 'articles', 'GET', {
      'select': 'title,category',
      'status': 'eq.published',
      'created_at': `gte.${weekStartStr}T00:00:00Z`,
      'limit': '100',
    });
    newArticles = arts.length;
    log(`   ${newArticles} new articles this week`);
  } catch (e: any) { log(`   ⚠️ Article stats: ${e.message}`); }

  // 4. Get low-traffic pages from Cloudflare Analytics (if available)
  let lowTrafficPages: any[] = [];
  if (env.CF_API_TOKEN && env.CF_ZONE_ID) {
    try {
      const since = new Date(now.getTime() - 7 * 86400000).toISOString();
      const until = now.toISOString();
      const gqlRes = await fetch('https://api.cloudflare.com/client/v4/graphql', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${env.CF_API_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `{ viewer { zones(filter: { zoneTag: "${env.CF_ZONE_ID}" }) { httpRequestsAdaptiveGroups(filter: { datetime_geq: "${since}", datetime_leq: "${until}" }, limit: 100, orderBy: [count_ASC]) { count dimensions { clientRequestPath } } } } }` }),
      });
      const gqlData: any = await gqlRes.json();
      const groups = gqlData?.data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups || [];
      lowTrafficPages = groups
        .filter((g: any) => {
          const p = g.dimensions.clientRequestPath;
          return p && !p.match(/\.(js|css|png|jpg|jpeg|svg|ico|webp|woff2?|gif|map|xml|txt)$/i) && p !== '/' && g.count <= 3;
        })
        .slice(0, 20)
        .map((g: any) => ({ path: g.dimensions.clientRequestPath, views: g.count }));
      log(`   ${lowTrafficPages.length} low-traffic pages found`);
    } catch (e: any) { log(`   ⚠️ Analytics: ${e.message}`); }
  }

  // 5. Ask OpenAI for insights + upcoming events + content recommendations
  log('🤖 Asking OpenAI for weekly insights...');
  const briefPrompt = `You are a tennis media strategist for super.tennis, a tennis entertainment portal.

This week's stats:
- ${newsCount} news articles published (categories: ${topCategories.map(c => `${c.category}: ${c.count}`).join(', ')})
- ${videoCount} YouTube Shorts published
- ${newArticles} new evergreen articles added
- Top headlines this week: ${topNews.map(n => n.title).join('; ')}
${lowTrafficPages.length > 0 ? `\nLow-traffic pages (0-3 views this week — may need improvement):\n${lowTrafficPages.map(p => `  ${p.path} (${p.views} views)`).join('\n')}` : ''}

Today is ${now.toISOString().split('T')[0]}.

Provide a JSON response with these fields:
{
  "upcoming_events": [{"event": "tournament or match name", "date": "YYYY-MM-DD", "importance": "high|medium|low", "content_angle": "specific article idea to publish BEFORE this event"}],
  "recommendations": [{"topic": "article title idea", "category": "lifestyle|gear|records|vs|tournaments|players", "reason": "why write about this now", "priority": "high|medium|low"}],
  "underperforming_pages": [{"path": "/path/to/page", "views": 0, "problem": "why this page likely gets no traffic", "fix": "specific suggestion to improve it — new title, better content, merge with another page, or delete"}],
  "summary": "2-3 paragraph weekly summary: what topics were hot, what content worked, what to focus on next week, overall strategy advice"
}

Include:
- Real upcoming ATP/WTA tournaments for the next 2 weeks
- Trending topics based on this week's news categories
- Content gaps — what categories need more articles
- SEO opportunities — search terms that will trend due to upcoming events
- Analysis of low-traffic pages: why they fail, specific fixes for each
- At least 5 upcoming events, 8 content recommendations, and analysis of ALL low-traffic pages listed above

Return ONLY valid JSON, no markdown fences.`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a tennis media strategist. Return only valid JSON.' },
          { role: 'user', content: briefPrompt },
        ],
        temperature: 0.7,
        max_tokens: 3000,
      }),
    });

    const data: any = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    let brief;
    try { brief = JSON.parse(jsonStr); } catch { log('   ❌ OpenAI returned invalid JSON'); return logs.join('\n'); }

    // 6. Insert into weekly_briefs
    await supabaseQuery(env, 'weekly_briefs', 'POST', {}, [{
      week_start: weekStartStr,
      top_pages: topNews,
      search_queries: topCategories,
      upcoming_events: brief.upcoming_events || [],
      recommendations: [...(brief.recommendations || []), ...(brief.underperforming_pages || []).map((p: any) => ({
        topic: `Fix: ${p.path}`,
        category: 'maintenance',
        reason: `${p.problem} → ${p.fix}`,
        priority: 'medium',
      }))],
      summary: brief.summary || '',
    }]);

    log(`   ✅ Weekly brief saved for week of ${weekStartStr}`);
    log(`   📅 ${(brief.upcoming_events || []).length} upcoming events`);
    log(`   💡 ${(brief.recommendations || []).length} content recommendations`);
  } catch (e: any) {
    log(`   ❌ Brief generation failed: ${e.message}`);
  }

  return logs.join('\n');
}

// ============================================================
// MONTHLY RANKINGS UPDATE
// ============================================================
function parseRankingsHtml(html: string, tour: string): { rank: number; name: string; country: string; points: number }[] {
  const players: { rank: number; name: string; country: string; points: number }[] = [];

  // Format 1 (primary): Rank, Change/Skip, Player (with optional link), Country, Points
  // This is the current tennisabstract layout with 5+ columns including points
  const rowRegex5 = /<tr[^>]*>\s*<td[^>]*>(\d+)<\/td>\s*<td[^>]*>[^<]*<\/td>\s*<td[^>]*>(?:<a[^>]*>)?([^<]+)(?:<\/a>)?<\/td>\s*<td[^>]*>([A-Z]{3})<\/td>\s*<td[^>]*>([\d,]+)<\/td>/g;

  // Format 2 (fallback): Rank, Player (link with &nbsp;), Country, Birthdate — no points column
  const rowRegex4 = /<tr><td[^>]*>(\d+)<\/td><td[^>]*>(?:<a[^>]*>)?([\s\S]*?)(?:<\/a>)?<\/td><td[^>]*>([A-Z]{3})<\/td><td[^>]*>[^<]*<\/td><\/tr>/g;

  // Try 5-column format first (has points)
  let match;
  while ((match = rowRegex5.exec(html)) !== null) {
    const rank = parseInt(match[1]);
    const name = match[2].replace(/&nbsp;/g, ' ').trim();
    const country = match[3];
    const points = parseInt(match[4].replace(/,/g, ''));
    if (rank <= 200) {
      players.push({ rank, name, country, points });
    }
  }

  // Fallback: try 4-column format if nothing parsed (points unavailable)
  if (players.length === 0) {
    while ((match = rowRegex4.exec(html)) !== null) {
      const rank = parseInt(match[1]);
      const name = match[2].replace(/&nbsp;/g, ' ').replace(/<[^>]*>/g, '').trim();
      const country = match[3];
      if (rank <= 200 && name.length > 1) {
        players.push({ rank, name, country, points: 0 });
      }
    }
  }

  return players;
}

// Enrich parsed rankings with points from OpenAI when source doesn't provide them
async function enrichRankingsWithPoints(
  env: Env,
  players: { rank: number; name: string; country: string; points: number }[],
  tour: string,
): Promise<void> {
  if (players.length === 0 || players.some(p => p.points > 0)) return; // already have points

  const top50 = players.slice(0, 50);
  const nameList = top50.map(p => `${p.rank}. ${p.name} (${p.country})`).join('\n');

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a tennis data assistant. Given ${tour.toUpperCase()} rankings, estimate the current ranking points for each player based on your knowledge. Return ONLY a JSON array of numbers representing points for each player in order. Be as accurate as possible based on recent ${tour.toUpperCase()} rankings data.`,
          },
          {
            role: 'user',
            content: `Estimate current ${tour.toUpperCase()} ranking points for these players:\n${nameList}\n\nReturn ONLY a JSON array of 50 numbers, e.g. [13550, 11830, ...]`,
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!res.ok) return;

    const data = await res.json() as any;
    const content = data.choices?.[0]?.message?.content || '';
    const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const pointsList = JSON.parse(jsonStr) as number[];

    for (let i = 0; i < Math.min(pointsList.length, top50.length); i++) {
      players[i].points = pointsList[i] || 0;
    }

    // Estimate remaining players with decreasing points
    if (players.length > 50 && pointsList.length > 0) {
      const lastPoints = players[49]?.points || 500;
      for (let i = 50; i < players.length; i++) {
        players[i].points = Math.max(10, Math.round(lastPoints * (1 - (i - 50) / 200)));
      }
    }

    console.log(`   ✅ Enriched ${tour.toUpperCase()} with estimated points from OpenAI`);
  } catch (e: any) {
    console.log(`   ⚠️ Points enrichment failed: ${e.message}`);
  }
}

function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function matchPlayer(name: string, players: any[]): any | null {
  const slug = nameToSlug(name);
  // Exact slug match
  const bySlug = players.find((p: any) => p.slug === slug);
  if (bySlug) return bySlug;
  // Full name match
  const lower = name.toLowerCase();
  const byName = players.find((p: any) => p.full_name?.toLowerCase() === lower);
  if (byName) return byName;
  // Last name + first initial
  const parts = name.split(/\s+/);
  if (parts.length >= 2) {
    const lastName = parts[parts.length - 1].toLowerCase();
    const firstName = parts[0].toLowerCase();
    const byLastFirst = players.find((p: any) => {
      const pName = (p.full_name || '').toLowerCase();
      return pName.includes(lastName) && pName.includes(firstName.slice(0, 3));
    });
    if (byLastFirst) return byLastFirst;
  }
  return null;
}

async function updateRankings(env: Env): Promise<string> {
  const logs: string[] = [];
  const log = (msg: string) => { logs.push(msg); console.log(msg); };

  log('🏆 Starting monthly rankings update...');

  // Fetch all players once
  let allPlayers: any[] = [];
  try {
    // We'll load matching players on-demand after parsing rankings
    log(`   Will match players by slug lookup`);
  } catch (e: any) {
        console.error('API error:', e.message);
    log(`   ❌ Failed to fetch players: ${e.message}`);
    return logs.join('\n');
  }

  const today = new Date().toISOString().split('T')[0];

  for (const tour of ['atp', 'wta'] as const) {
    const url = tour === 'atp'
      ? 'https://tennisabstract.com/reports/atpRankings.html'
      : 'https://tennisabstract.com/reports/wtaRankings.html';

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SuperTennisBot/1.0)' },
      });
      clearTimeout(timeout);

      if (!res.ok) {
        log(`   ⚠️ ${tour.toUpperCase()}: HTTP ${res.status}`);
        continue;
      }

      const html = await res.text();
      const parsed = parseRankingsHtml(html, tour);
      log(`   📊 ${tour.toUpperCase()}: parsed ${parsed.length} players`);

      // If points are missing (source format changed), enrich via OpenAI
      if (parsed.length > 0 && !parsed.some(p => p.points > 0)) {
        log(`   🤖 No points in source — enriching via OpenAI...`);
        await enrichRankingsWithPoints(env, parsed, tour);
      }

      if (parsed.length === 0) {
        log(`   ⚠️ ${tour.toUpperCase()}: no rankings parsed, skipping`);
        continue;
      }

      // Match by batch slug lookup — query Supabase for all parsed slugs at once
      const rows: any[] = [];
      const slugs = parsed.map(r => nameToSlug(r.name));
      const slugToRank = new Map<string, { rank: number; points: number }>();
      for (const r of parsed) {
        slugToRank.set(nameToSlug(r.name), { rank: r.rank, points: r.points });
      }

      // Batch lookup: query in chunks of 50 slugs, get player_id for FK
      const slugToPlayerId = new Map<string, string>();
      for (let i = 0; i < slugs.length; i += 50) {
        const chunk = slugs.slice(i, i + 50);
        const slugFilter = `in.(${chunk.join(',')})`;
        try {
          const found = await supabaseQuery(env, 'players', 'GET', {
            'select': 'slug,player_id',
            'slug': slugFilter,
            'limit': '50',
          });
          for (const p of found) {
            slugToPlayerId.set(p.slug, p.player_id);
          }
        } catch (e: any) {
        console.error('API error:', e.message);
          log(`   ⚠️ Batch lookup error: ${e.message}`);
        }
      }

      for (const [slug, playerId] of slugToPlayerId) {
        const data = slugToRank.get(slug);
        if (data) {
          rows.push({
            ranking_date: today,
            player_id: playerId,
            tour,
            ranking: data.rank,
            points: data.points,
          });
        }
      }
      log(`   🔗 ${tour.toUpperCase()}: matched ${slugToPlayerId.size}/${parsed.length} players`);

      // Safety: skip upsert if all points are 0 (broken parse / format change)
      const hasPoints = rows.some(r => r.points > 0);
      if (!hasPoints && rows.length > 0) {
        log(`   ⚠️ ${tour.toUpperCase()}: all points are 0 — source format may have changed, skipping upsert`);
        continue;
      }

      // Batch upsert
      for (let i = 0; i < rows.length; i += 100) {
        const batch = rows.slice(i, i + 100);
        await supabaseQuery(env, 'rankings', 'POST',
          { 'on_conflict': 'ranking_date,player_id,tour' },
          batch,
        );
      }
      log(`   ✅ ${tour.toUpperCase()}: upserted ${rows.length} rankings`);
    } catch (e: any) {
        console.error('API error:', e.message);
      log(`   ❌ ${tour.toUpperCase()}: ${e.message}`);
    }
  }

  return logs.join('\n');
}

// ============================================================
// CLOUDFLARE ANALYTICS API
// ============================================================
async function fetchCloudflareAnalytics(env: Env, dateStart: string, dateEnd: string): Promise<any> {
  // httpRequests1dGroups works for any date range — use for totals, chart, countries, status codes
  // httpRequestsAdaptiveGroups limited to 1 day (86400s) on free plan — use for top pages & devices
  const now = new Date();
  const adaptiveEnd = now.toISOString();
  const adaptiveStart = new Date(now.getTime() - 82800000).toISOString(); // 23 hours ago (< 86400s)

  const query = `query {
    viewer {
      zones(filter: { zoneTag: "${env.CF_ZONE_ID}" }) {
        httpRequests1dGroups(
          filter: { date_geq: "${dateStart}", date_leq: "${dateEnd}" }
          orderBy: [date_ASC]
          limit: 100
        ) {
          dimensions { date }
          sum {
            requests
            pageViews
            bytes
            countryMap { clientCountryName requests }
            responseStatusMap { edgeResponseStatus requests }
          }
          uniq { uniques }
        }
        topPaths: httpRequestsAdaptiveGroups(
          filter: { datetime_geq: "${adaptiveStart}", datetime_leq: "${adaptiveEnd}", requestSource: "eyeball" }
          orderBy: [count_DESC]
          limit: 30
        ) {
          count
          dimensions { clientRequestPath }
        }
        topDevices: httpRequestsAdaptiveGroups(
          filter: { datetime_geq: "${adaptiveStart}", datetime_leq: "${adaptiveEnd}", requestSource: "eyeball" }
          orderBy: [count_DESC]
          limit: 10
        ) {
          count
          dimensions { clientDeviceType }
        }
      }
    }
  }`;

  const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.CF_API_TOKEN}`,
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) throw new Error(`Cloudflare Analytics API: ${res.status}`);
  const json = await res.json() as any;

  if (json.errors?.length) {
    throw new Error(`CF Analytics: ${json.errors[0].message}`);
  }

  const zone = json.data?.viewer?.zones?.[0];
  if (!zone) throw new Error('No zone data returned');

  // Aggregate daily data
  const daily = zone.httpRequests1dGroups || [];
  const totals = {
    requests: 0,
    pageViews: 0,
    uniques: 0,
    bytes: 0,
  };
  const chartData: { date: string; requests: number; pageViews: number; uniques: number; bytes: number }[] = [];

  for (const day of daily) {
    totals.requests += day.sum.requests;
    totals.pageViews += day.sum.pageViews;
    totals.uniques += day.uniq.uniques;
    totals.bytes += day.sum.bytes;
    chartData.push({
      date: day.dimensions.date,
      requests: day.sum.requests,
      pageViews: day.sum.pageViews,
      uniques: day.uniq.uniques,
      bytes: day.sum.bytes,
    });
  }

  // Top pages — filter out assets (from adaptive groups, last 24h)
  const topPages = (zone.topPaths || [])
    .filter((p: any) => {
      const path = p.dimensions.clientRequestPath;
      return !path.match(/\.(js|css|png|jpg|jpeg|svg|ico|webp|woff2?|gif|map)$/i);
    })
    .slice(0, 20)
    .map((p: any) => ({ path: p.dimensions.clientRequestPath, count: p.count }));

  // Countries — aggregate from daily countryMap across all days
  const countryAgg: Record<string, number> = {};
  for (const day of daily) {
    for (const c of (day.sum.countryMap || [])) {
      if (c.clientCountryName) {
        countryAgg[c.clientCountryName] = (countryAgg[c.clientCountryName] || 0) + c.requests;
      }
    }
  }
  const countries = Object.entries(countryAgg)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([country, count]) => ({ country, count }));

  // Devices (from adaptive groups, last 24h)
  const devices = (zone.topDevices || [])
    .filter((d: any) => d.dimensions.clientDeviceType)
    .map((d: any) => ({ type: d.dimensions.clientDeviceType, count: d.count }));

  // Status codes — aggregate from daily responseStatusMap
  const statusAgg: Record<number, number> = {};
  for (const day of daily) {
    for (const s of (day.sum.responseStatusMap || [])) {
      statusAgg[s.edgeResponseStatus] = (statusAgg[s.edgeResponseStatus] || 0) + s.requests;
    }
  }
  const statusCodes = Object.entries(statusAgg)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 10)
    .map(([status, count]) => ({ status: Number(status), count }));

  return {
    period: { start: dateStart, end: dateEnd },
    totals,
    chartData,
    topPages,
    countries,
    devices,
    statusCodes,
  };
}

// ============================================================
// CONTENT REFRESH — update "Last Updated" + add fresh paragraph
// ============================================================
async function refreshTopArticles(env: Env): Promise<string> {
  const logs: string[] = [];
  const log = (msg: string) => { logs.push(msg); console.log(msg); };

  log('🔄 Starting content refresh for top articles...');

  // Get articles older than 45 days, prioritize by category importance
  const cutoff = new Date(Date.now() - 45 * 86400000).toISOString();
  const articles = await supabaseQuery(env, 'articles', 'GET', {
    'select': 'slug,title,category,body',
    'updated_at': `lt.${cutoff}`,
    'order': 'category.asc',
    'limit': '30',
  });

  if (!articles || articles.length === 0) {
    log('✅ All articles are fresh (updated within 45 days)');
    return logs.join('\n');
  }

  log(`📝 Found ${articles.length} articles to refresh`);

  let refreshed = 0;
  for (const article of articles.slice(0, 15)) {
    try {
      // Add/update "Last Updated" line at the end
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const updatedNote = `\n\n*Last updated: ${dateStr}*`;

      // Remove old "Last updated" if exists and add new one
      let body = article.body.replace(/\n\n\*Last updated:.*?\*/g, '');
      body = body + updatedNote;

      await supabaseQuery(env, 'articles', 'PATCH', {
        'slug': `eq.${article.slug}`,
      }, { body, updated_at: now.toISOString() }, {
        'Prefer': 'return=minimal',
      });

      log(`   ✅ ${article.slug}`);
      refreshed++;
    } catch (e: any) {
      log(`   ⚠️ ${article.slug}: ${e.message}`);
    }
  }

  log(`🔄 Refreshed ${refreshed} articles`);
  return logs.join('\n');
}

// ============================================================
// TELEGRAM ALERT HELPER
// ============================================================
async function sendTelegramAlert(env: Env, text: string): Promise<void> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });
  } catch {
    // Alert failures must not crash the worker
  }
}

// ============================================================
// OPS REGISTRY — single source of truth for the /stats/ Ops tab
// Each entry describes one automated pipeline. If it writes to a
// Supabase table, we read max(timestampField) and compute its age
// so you can see "news last updated 2h ago" etc. on the dashboard.
// ============================================================

interface OpsAgent {
  id: string;
  name: string;
  what: string;
  schedule: string;                       // human readable
  owner: string;                          // where it runs
  /** Supabase table to check freshness; omit if no Supabase writes */
  table?: string;
  /** Timestamp field in that table (e.g. "created_at", "published_at") */
  timestampField?: string;
  /** If actual last-write is older than this many hours → status = "stale" */
  freshWithinHours?: number;
  /** Manual trigger URL path on this worker (for the "Run now" button) */
  triggerPath?: string;
}

const OPS_REGISTRY: OpsAgent[] = [
  {
    id: 'news-fetch',
    name: 'News fetch',
    what: 'RSS → Supabase.news, curated via OpenAI',
    schedule: 'daily 07:00 Sofia + failsafe backups',
    owner: 'Cloudflare Worker cron + .github/news-failsafe.yml',
    table: 'news',
    timestampField: 'published_at',
    freshWithinHours: 30,
    triggerPath: '/trigger/news',
  },
  {
    id: 'video-cache',
    name: 'YouTube video cache',
    what: 'Cache featured YouTube videos (homepage carousel)',
    schedule: 'every 3 days (inside Worker cron)',
    owner: 'Cloudflare Worker cron',
    table: 'youtube_videos',
    timestampField: 'created_at',
    freshWithinHours: 24 * 4,
    triggerPath: '/trigger/videos',
  },
  {
    id: 'rankings-sync',
    name: 'ATP/WTA rankings sync',
    what: '200 ATP + 200 WTA from TennisLiveRanking → Supabase.rankings',
    schedule: 'weekly (GitHub Actions)',
    owner: '.github/workflows/weekly-rankings.yml',
    table: 'rankings',
    timestampField: 'ranking_date',
    freshWithinHours: 24 * 8,
    triggerPath: '/trigger/rankings',
  },
  {
    id: 'article-generator',
    name: 'Weekly article',
    what: 'Generate 1 long-form gear/lifestyle article via OpenAI',
    schedule: 'weekly (manual trigger today)',
    owner: 'Cloudflare Worker /trigger/article',
    table: 'articles',
    timestampField: 'created_at',
    freshWithinHours: 24 * 10,
    triggerPath: '/trigger/article',
  },
  {
    id: 'weekly-brief',
    name: 'Weekly brief',
    what: 'Aggregate 7-day roundup for /stats/ Weekly Brief tab',
    schedule: 'weekly',
    owner: 'Cloudflare Worker /trigger/brief',
    table: 'weekly_briefs',
    timestampField: 'week_start',
    freshWithinHours: 24 * 10,
    triggerPath: '/trigger/brief',
  },
  {
    id: 'youtube-shorts',
    name: 'YouTube Shorts auto-publisher',
    what: '1 Short/day generated + uploaded to YouTube',
    schedule: 'daily 09:24 Sofia',
    owner: '.github/workflows/content-factory.yml',
    table: 'video_publications',
    timestampField: 'scheduled_at',
    freshWithinHours: 30,
  },
  {
    id: 'bluesky-poster',
    name: 'Bluesky social poster',
    what: '~20 posts/day to supertennisnews.bsky.social',
    schedule: 'every 30 min',
    owner: '.github/workflows/social-poster.yml',
  },
  {
    id: 'indexing-api',
    name: 'Google Indexing API submitter',
    what: '200 URLs/day submitted to Google Indexing API',
    schedule: 'daily 08:30 Sofia',
    owner: '.github/workflows/indexing-cron.yml',
  },
  {
    id: 'watchdog',
    name: 'Site watchdog (Telegram)',
    what: 'Health probe; fires Telegram alert on failures',
    schedule: 'daily 10:00 + 16:00 Sofia',
    owner: '.github/workflows/watchdog.yml',
  },
  {
    id: 'supabase-backup',
    name: 'Supabase backup',
    what: 'Dump critical tables to GitHub artifacts',
    schedule: 'weekly',
    owner: '.github/workflows/backup-supabase.yml',
  },
  {
    id: 'enrich-boost',
    name: 'Player enrichment',
    what: 'Fill missing player bios/photos via OpenAI + Wikimedia',
    schedule: 'weekly',
    owner: '.github/workflows/enrich-boost.yml',
  },
  {
    id: 'lighthouse-ci',
    name: 'Lighthouse CI',
    what: 'Perf/SEO audit on every main push',
    schedule: 'on push to main',
    owner: '.github/workflows/lighthouse-ci.yml',
  },
];

/** Ask Supabase for the newest row in a table and return its timestamp. */
async function getLatestTimestamp(
  env: Env,
  table: string,
  field: string
): Promise<string | null> {
  try {
    const rows = await supabaseQuery(env, table, 'GET', {
      select: field,
      order: `${field}.desc.nullslast`,
      limit: '1',
    });
    if (!Array.isArray(rows) || rows.length === 0) return null;
    return rows[0][field] ?? null;
  } catch (e: any) {
    // Surface to logs so a misconfigured table/field doesn't silently
    // mark every agent as "no-data" on the Ops dashboard.
    console.error(`[ops] getLatestTimestamp(${table}.${field}) failed:`, e?.message);
    return null;
  }
}

/**
 * Count rows in `table` where `field >= (now - hours)`. Reads the exact
 * count from the PostgREST `Content-Range` header (via `Prefer: count=exact`)
 * rather than relying on array.length which is capped by the default
 * page size (1000). Returns -1 on error (caller renders "—").
 */
async function countRecentRows(
  env: Env,
  table: string,
  field: string,
  hours: number
): Promise<number> {
  try {
    const since = new Date(Date.now() - hours * 3_600_000).toISOString();
    const url = new URL(`${env.SUPABASE_URL}/rest/v1/${table}`);
    url.searchParams.set('select', field);
    url.searchParams.set(field, `gte.${since}`);
    // We only need the count — limit=0 returns no rows but still a Content-Range.
    url.searchParams.set('limit', '0');
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        apikey: env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        Prefer: 'count=exact',
      },
    });
    if (!res.ok) {
      console.error(`[ops] countRecentRows(${table}) HTTP ${res.status}`);
      return -1;
    }
    // Content-Range looks like "0-0/1234" or "*/1234" — the number after "/" is total.
    const range = res.headers.get('Content-Range') || '';
    const m = range.match(/\/(\d+)\s*$/);
    return m ? parseInt(m[1], 10) : 0;
  } catch (e: any) {
    console.error(`[ops] countRecentRows(${table}.${field}) failed:`, e?.message);
    return -1;
  }
}

interface OpsAgentStatus extends OpsAgent {
  last_run_at: string | null;
  age_hours: number | null;
  status: 'ok' | 'warn' | 'stale' | 'unknown' | 'no-data';
}

interface OpsHealthCheck {
  check: string;
  status: 'ok' | 'warn' | 'fail';
  detail?: string;
}

interface OpsSnapshot {
  generated_at: string;
  agents: OpsAgentStatus[];
  content_24h: { news: number; articles: number; videos: number };
  health: OpsHealthCheck[];
}

/** Main snapshot builder for the /api/ops endpoint. */
async function buildOpsSnapshot(env: Env): Promise<OpsSnapshot> {
  const now = Date.now();

  // 1. Per-agent freshness (parallel for speed)
  const agents: OpsAgentStatus[] = await Promise.all(
    OPS_REGISTRY.map(async (a): Promise<OpsAgentStatus> => {
      if (!a.table || !a.timestampField) {
        return { ...a, last_run_at: null, age_hours: null, status: 'unknown' };
      }
      const ts = await getLatestTimestamp(env, a.table, a.timestampField);
      if (!ts) {
        return { ...a, last_run_at: null, age_hours: null, status: 'no-data' };
      }
      const ageHours = (now - Date.parse(ts)) / 3600_000;
      const limit = a.freshWithinHours ?? 24 * 30;
      const status: OpsAgentStatus['status'] =
        ageHours <= limit * 0.5 ? 'ok' : ageHours <= limit ? 'warn' : 'stale';
      return {
        ...a,
        last_run_at: ts,
        age_hours: Math.round(ageHours * 10) / 10,
        status,
      };
    })
  );

  // 2. Content counts — last 24 hours
  const [news24h, articles24h, videos24h] = await Promise.all([
    countRecentRows(env, 'news', 'published_at', 24),
    countRecentRows(env, 'articles', 'created_at', 24),
    countRecentRows(env, 'video_publications', 'scheduled_at', 24),
  ]);

  // 3. Simple health checks
  const health: OpsHealthCheck[] = [];
  try {
    const res = await fetch('https://super.tennis/sitemap-index.xml', { method: 'HEAD' });
    health.push({
      check: 'sitemap reachable',
      status: res.ok ? 'ok' : 'fail',
      detail: `HTTP ${res.status}`,
    });
  } catch (e: any) {
    health.push({ check: 'sitemap reachable', status: 'fail', detail: e.message });
  }
  const newsAgent = agents.find((x) => x.id === 'news-fetch');
  if (newsAgent?.age_hours != null) {
    health.push({
      check: 'news freshness',
      status: newsAgent.status === 'ok' ? 'ok' : newsAgent.status === 'warn' ? 'warn' : 'fail',
      detail: `latest ${newsAgent.age_hours}h old`,
    });
  }
  const rankAgent = agents.find((x) => x.id === 'rankings-sync');
  if (rankAgent?.age_hours != null) {
    health.push({
      check: 'rankings freshness',
      status: rankAgent.status === 'ok' ? 'ok' : rankAgent.status === 'warn' ? 'warn' : 'fail',
      detail: `latest ${rankAgent.age_hours}h old`,
    });
  }

  return {
    generated_at: new Date().toISOString(),
    agents,
    content_24h: { news: news24h, articles: articles24h, videos: videos24h },
    health,
  };
}

// ============================================================
// WORKER ENTRY POINT
// ============================================================
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`⏰ Cron fired at ${new Date().toISOString()}`);
    const now = new Date();
    const failures: string[] = [];

    // DAILY: News (client-side fetch — no rebuild needed)
    try {
      await withRetry(() => generateNews(env), 'Daily news generation', 2, [10_000]);
    } catch (e: any) {
      console.error(`⚠️ News generation failed: ${e.message}`);
      failures.push(`📰 News generation: ${e.message}`);
    }

    // EVERY 3 DAYS: Videos (client-side fetch — no rebuild needed)
    const dayOfYear = Math.floor((Date.now() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
    if (dayOfYear % 3 === 0) {
      console.log('🎬 Video update day (every 3 days)');
      try {
        await updateVideos(env);
      } catch (e: any) {
        console.error(`⚠️ Video update failed: ${e.message}`);
        failures.push(`🎬 Video update: ${e.message}`);
      }
    }

    // WEEKLY (Monday): New evergreen article + weekly brief → REBUILD
    const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon
    if (dayOfWeek === 1) {
      console.log('📝 Weekly article generation (Monday)');
      try {
        await generateWeeklyArticle(env);
      } catch (e: any) {
        console.error(`⚠️ Weekly article failed: ${e.message}`);
        failures.push(`📝 Weekly article: ${e.message}`);
      }
      console.log('📋 Weekly brief generation (Monday)');
      try {
        await generateWeeklyBrief(env);
      } catch (e: any) {
        console.error(`⚠️ Weekly brief failed: ${e.message}`);
        failures.push(`📋 Weekly brief: ${e.message}`);
      }
      if (failures.length > 0) {
        ctx.waitUntil(sendTelegramAlert(env, `❌ *Cron Worker — Monday failures*\n\n${failures.join('\n')}`));
      }
      ctx.waitUntil(triggerRebuild(env));
      return;
    }

    // MONTHLY (1st of month): Rankings update → REBUILD
    if (now.getUTCDate() === 1) {
      console.log('🏆 Monthly rankings update (1st of month)');
      try {
        await updateRankings(env);
      } catch (e: any) {
        console.error(`⚠️ Rankings update failed: ${e.message}`);
        failures.push(`🏆 Rankings update: ${e.message}`);
      }
      if (failures.length > 0) {
        ctx.waitUntil(sendTelegramAlert(env, `❌ *Cron Worker — Monthly failures*\n\n${failures.join('\n')}`));
      }
      ctx.waitUntil(triggerRebuild(env));
      return;
    }

    // MID-MONTH (15th): Refresh old articles with "Last Updated" → REBUILD
    if (now.getUTCDate() === 15) {
      console.log('🔄 Mid-month content refresh (15th)');
      try {
        await refreshTopArticles(env);
      } catch (e: any) {
        console.error(`⚠️ Content refresh failed: ${e.message}`);
        failures.push(`🔄 Content refresh: ${e.message}`);
      }
      if (failures.length > 0) {
        ctx.waitUntil(sendTelegramAlert(env, `❌ *Cron Worker — Mid-month failures*\n\n${failures.join('\n')}`));
      }
      ctx.waitUntil(triggerRebuild(env));
      return;
    }

    // Regular day — send alert if news generation failed
    if (failures.length > 0) {
      ctx.waitUntil(sendTelegramAlert(env, `❌ *Cron Worker — Daily failures*\n\n${failures.join('\n')}`));
    } else {
      console.log('✅ Daily update done — no rebuild needed');
    }
  },

  // HTTP handler for manual triggers + API
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(request) });
    }

    // ── API ENDPOINTS (client-side fetch, no rebuild) ──

    // Contact form handler
    if (url.pathname === '/api/contact' && request.method === 'POST') {
      const rateLimitRes = await checkRateLimit(request, env);
      if (rateLimitRes) return rateLimitRes;
      try {
        const body = await request.json() as Record<string, string>;
        const { name, email, subject, message } = body;
        if (!name || !email || !message) {
          return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://super.tennis' } });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return new Response(JSON.stringify({ error: 'Invalid email' }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://super.tennis' } });
        }
        if (name.length > 200 || email.length > 200 || message.length > 5000 || (subject || '').length > 200) {
          return new Response(JSON.stringify({ error: 'Field too long' }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://super.tennis' } });
        }
        // Store in Supabase
        await supabaseQuery(env, 'contact_messages', 'POST', {}, {
          name, email, subject: subject || 'general', message,
          created_at: new Date().toISOString(),
        });
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://super.tennis' } });
      } catch (e: any) {
        console.error('API error:', e.message);
        return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://super.tennis' } });
      }
    }

    // CORS preflight for contact form
    if (url.pathname === '/api/contact' && request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': 'https://super.tennis', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
    }

    if (url.pathname === '/api/news') {
      try {
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 2000);
        const dateParam = url.searchParams.get('date'); // YYYY-MM-DD
        const params: Record<string, string> = {
          'is_active': 'eq.true',
          'order': 'published_at.desc',
          'limit': String(limit),
        };
        if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
          // Filter by specific date using Supabase and() filter
          params['and'] = `(published_at.gte.${dateParam}T00:00:00Z,published_at.lt.${dateParam}T23:59:59Z)`;
        }
        const data = await supabaseQuery(env, 'news', 'GET', params, undefined, { 'Range': `0-${limit - 1}` });
        return jsonResponse(data, 300, request); // cache 5 min
      } catch (e: any) {
        console.error('API error:', e.message);
        return jsonResponse({ error: 'Internal error' }, 60, request);
      }
    }

    if (url.pathname === '/api/videos') {
      try {
        const dayNum = Math.floor(Date.now() / 86400000);
        const results: any[] = [];

        for (let i = 0; i < VIDEO_CATEGORIES.length; i++) {
          const cat = VIDEO_CATEGORIES[i];
          const videos = await supabaseQuery(env, 'youtube_videos', 'GET', {
            'category': `eq.${cat}`,
            'order': 'published_at.desc',
            'limit': '30',
          });
          if (videos.length > 0) {
            // Staggered rotation: 3 groups of 2, each group changes every 3 days
            const group = Math.floor(i / 2); // 0,0,1,1,2,2
            const seed = Math.floor((dayNum - group) / 3);
            const picked = seededPick(videos, seed + i * 7);
            const meta = VIDEO_CAT_META[cat];
            results.push({
              video_id: picked.video_id,
              title: picked.title,
              channel_name: picked.channel_name,
              category: cat,
              label: meta.label,
              accentColor: meta.color,
            });
          }
        }
        return jsonResponse(results, 3600, request); // cache 1 hour
      } catch (e: any) {
        console.error('API error:', e.message);
        return jsonResponse({ error: 'Internal error' }, 60, request);
      }
    }

    // ── Helper: extract auth password from Authorization header or query param ──
    function getAuthPassword(req: Request, u: URL): string | null {
      const authHeader = req.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
      return null; // query param auth removed for security
    }

    // ── Rate limiter: max 15 failed auth attempts per IP per 15 minutes ──
    const RATE_LIMIT_MAX = 15;
    const RATE_LIMIT_WINDOW_S = 900; // 15 minutes

    async function checkRateLimit(req: Request, e: Env): Promise<Response | null> {
      if (!e.RATE_LIMIT) {
        console.warn('RATE_LIMIT KV not configured — rate limiting disabled');
        return null;
      }
      const ip = req.headers.get('CF-Connecting-IP') || 'unknown';
      const key = `rl:${ip}`;
      const raw = await e.RATE_LIMIT.get(key);
      const entry: { count: number; firstAt: number } = raw
        ? JSON.parse(raw)
        : { count: 0, firstAt: Date.now() };

      if (entry.count >= RATE_LIMIT_MAX) {
        const retryAfter = Math.ceil((entry.firstAt + RATE_LIMIT_WINDOW_S * 1000 - Date.now()) / 1000);
        return new Response(JSON.stringify({ error: 'Too many requests. Try again later.' }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.max(retryAfter, 1)),
            ...corsHeaders(req),
          },
        });
      }
      return null;
    }

    async function recordFailedAttempt(req: Request, e: Env): Promise<void> {
      if (!e.RATE_LIMIT) return;
      const ip = req.headers.get('CF-Connecting-IP') || 'unknown';
      const key = `rl:${ip}`;
      const raw = await e.RATE_LIMIT.get(key);
      const entry: { count: number; firstAt: number } = raw
        ? JSON.parse(raw)
        : { count: 0, firstAt: Date.now() };
      entry.count += 1;
      await e.RATE_LIMIT.put(key, JSON.stringify(entry), { expirationTtl: RATE_LIMIT_WINDOW_S });
    }

    async function clearRateLimit(req: Request, e: Env): Promise<void> {
      if (!e.RATE_LIMIT) return;
      const ip = req.headers.get('CF-Connecting-IP') || 'unknown';
      await e.RATE_LIMIT.delete(`rl:${ip}`);
    }

    /**
     * Constant-time string comparison. Prevents timing attacks where an
     * attacker measures response time to deduce the password character by
     * character. Length is still observable (acceptable for a fixed-size
     * password).
     */
    function timingSafeEqual(a: string, b: string): boolean {
      if (a.length !== b.length) return false;
      let diff = 0;
      for (let i = 0; i < a.length; i++) {
        diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
      }
      return diff === 0;
    }

    async function requireAuthWithRateLimit(req: Request, u: URL, e: Env): Promise<Response | null> {
      const rateLimitErr = await checkRateLimit(req, e);
      if (rateLimitErr) return rateLimitErr;

      const pwd = getAuthPassword(req, u);
      const expected = e.ANALYTICS_PASSWORD;
      if (!expected || !pwd || !timingSafeEqual(pwd, expected)) {
        await recordFailedAttempt(req, e);
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(req) },
        });
      }
      await clearRateLimit(req, e); // reset on successful auth
      return null; // auth OK
    }

    // ── PUBLICATIONS API (password-protected) ──

    if (url.pathname === '/api/publications') {
      const authErr = await requireAuthWithRateLimit(request, url, env);
      if (authErr) return authErr;
      try {
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
        const data = await supabaseQuery(env, 'video_publications', 'GET', {
          'order': 'scheduled_at.desc',
          'limit': String(limit),
        });
        return jsonResponse(data, 120, request); // cache 2 min
      } catch (e: any) {
        console.error('API error:', e.message);
        return jsonResponse({ error: 'Internal error' }, 60, request);
      }
    }

    // ── ANALYTICS API (password-protected) ──

    if (url.pathname === '/api/analytics') {
      const authErr = await requireAuthWithRateLimit(request, url, env);
      if (authErr) return authErr;
      if (!env.CF_API_TOKEN || !env.CF_ZONE_ID) {
        return jsonResponse({ error: 'Analytics not configured (missing CF_API_TOKEN or CF_ZONE_ID)' }, 0, request);
      }

      const period = url.searchParams.get('period') || '7d';
      const days = period === '90d' ? 90 : period === '30d' ? 30 : 7;
      const dateEnd = new Date().toISOString().split('T')[0];
      const dateStart = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

      try {
        const analyticsData = await fetchCloudflareAnalytics(env, dateStart, dateEnd);
        return jsonResponse(analyticsData, 3600, request); // cache 1 hour
      } catch (e: any) {
        console.error('API error:', e.message);
        return jsonResponse({ error: 'Internal error' }, 0, request);
      }
    }

    // ── WEEKLY BRIEF API (password-protected) ──

    if (url.pathname === '/api/brief') {
      const authErr = await requireAuthWithRateLimit(request, url, env);
      if (authErr) return authErr;
      try {
        const data = await supabaseQuery(env, 'weekly_briefs', 'GET', {
          'order': 'week_start.desc',
          'limit': '1',
        });
        if (!data || !data.length) {
          return jsonResponse({ error: 'No briefs yet' }, 60, request);
        }
        return jsonResponse(data[0], 3600, request); // cache 1 hour
      } catch (e: any) {
        console.error('API error:', e.message);
        return jsonResponse({ error: 'Internal error' }, 0, request);
      }
    }

    // ── OPS DASHBOARD API (password-protected) ──
    // Returns agent registry + freshness of each data pipeline + health checks.
    // Powers the "Ops" tab in /stats/. See OPS_REGISTRY below for what each agent means.

    if (url.pathname === '/api/ops') {
      const authErr = await requireAuthWithRateLimit(request, url, env);
      if (authErr) return authErr;
      try {
        const data = await buildOpsSnapshot(env);
        return jsonResponse(data, 60, request); // cache 60s
      } catch (e: any) {
        console.error('API /api/ops error:', e.message);
        // Log full error server-side; do not leak details to client.
        return jsonResponse({ error: 'Internal error' }, 0, request);
      }
    }

    // ── MANUAL TRIGGERS (password-protected) ──

    if (url.pathname.startsWith('/trigger/')) {
      const authErr = await requireAuthWithRateLimit(request, url, env);
      if (authErr) return authErr;

      if (url.pathname === '/trigger/news') {
        const result = await generateNews(env);
        return new Response(result, { headers: { 'Content-Type': 'text/plain' } });
      }

      if (url.pathname === '/trigger/videos') {
        const result = await updateVideos(env);
        return new Response(result, { headers: { 'Content-Type': 'text/plain' } });
      }

      if (url.pathname === '/trigger/article') {
        const result = await generateWeeklyArticle(env);
        await triggerRebuild(env);
        return new Response(result, { headers: { 'Content-Type': 'text/plain' } });
      }

      if (url.pathname === '/trigger/brief') {
        const result = await generateWeeklyBrief(env);
        return new Response(result, { headers: { 'Content-Type': 'text/plain' } });
      }

      if (url.pathname === '/trigger/rankings') {
        const result = await updateRankings(env);
        await triggerRebuild(env);
        return new Response(result, { headers: { 'Content-Type': 'text/plain' } });
      }

      if (url.pathname === '/trigger/all') {
        const newsResult = await generateNews(env);
        const videoResult = await updateVideos(env);
        return new Response(`${newsResult}\n\n---\n\n${videoResult}`, {
          headers: { 'Content-Type': 'text/plain' },
        });
      }

      return new Response('Unknown trigger', { status: 404 });
    }

    return new Response(`SuperTennis Content Cron Worker

API (client-side, no rebuild):
  /api/news          GET active news JSON
  /api/videos        GET 6 featured videos JSON
  /api/analytics     GET site analytics (password-protected)
  /api/brief         GET latest weekly brief (password-protected)
  /api/ops           GET ops dashboard snapshot (password-protected)

Manual triggers:
  /trigger/news      Generate news
  /trigger/videos    Update videos
  /trigger/article   Generate weekly article + rebuild
  /trigger/rankings  Update rankings + rebuild
  /trigger/all       News + videos (no rebuild)`, {
      headers: { 'Content-Type': 'text/plain' },
    });
  },
};
