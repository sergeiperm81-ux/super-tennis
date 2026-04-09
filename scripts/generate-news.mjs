#!/usr/bin/env node
/**
 * SUPER.TENNIS — Daily Tennis News Generator
 *
 * Fetches tennis news from RSS feeds, uses OpenAI to curate and rewrite
 * the most interesting stories (lifestyle, scandals, business, fashion),
 * then stores them in the Supabase `news` table.
 *
 * Usage: node scripts/generate-news.mjs [options]
 *
 * Options:
 *   --limit N         Max news items to generate (default: 6)
 *   --dry-run         Show what would be generated without writing to DB
 *   --hours N         How far back to look for news (default: 48)
 *   --deploy          Trigger Cloudflare Pages rebuild after inserting
 *   --deactivate-old  Deactivate news older than 7 days
 */

import { createClient } from '@supabase/supabase-js';
import { XMLParser } from 'fast-xml-parser';
import { config } from 'dotenv';
config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}
if (!OPENAI_KEY || OPENAI_KEY === 'sk-your-key') {
  console.error('❌ Missing or placeholder OPENAI_API_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================
// CLI ARGS
// ============================================================
const args = process.argv.slice(2);
function getArg(name, defaultVal) {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return defaultVal;
  return args[idx + 1] || defaultVal;
}
const LIMIT = parseInt(getArg('limit', '6'));
const HOURS = parseInt(getArg('hours', '48'));
const DRY_RUN = args.includes('--dry-run');
const DEPLOY = args.includes('--deploy');
const DEACTIVATE_OLD = args.includes('--deactivate-old');

// ============================================================
// RSS FEED SOURCES
// ============================================================
const RSS_FEEDS = [
  // Feeds with media:content / enclosure images
  {
    name: 'Essentially Sports',
    url: 'https://www.essentiallysports.com/category/tennis/feed/',
  },
  {
    name: 'ESPN Tennis',
    url: 'https://www.espn.com/espn/rss/tennis/news',
  },
  {
    name: 'BBC Sport Tennis',
    url: 'https://feeds.bbci.co.uk/sport/tennis/rss.xml',
  },
  // Google News (broad coverage, but no images — used for headline discovery)
  {
    name: 'Google News Tennis',
    url: 'https://news.google.com/rss/search?q=tennis+player+when:2d&hl=en-US&gl=US&ceid=US:en',
  },
  {
    name: 'Google News Tennis Buzz',
    url: 'https://news.google.com/rss/search?q=tennis+(scandal+OR+fashion+OR+engagement+OR+controversy+OR+dating+OR+wedding+OR+injury+OR+retire)&hl=en-US&gl=US&ceid=US:en',
  },
];

// ============================================================
// KNOWN PLAYER NAMES → SLUGS (for photo matching)
// ============================================================
const PLAYER_KEYWORDS = {
  'djokovic': 'novak-djokovic',
  'novak': 'novak-djokovic',
  'nadal': 'rafael-nadal',
  'rafa': 'rafael-nadal',
  'federer': 'roger-federer',
  'roger': 'roger-federer',
  'alcaraz': 'carlos-alcaraz',
  'carlos': 'carlos-alcaraz',
  'sinner': 'jannik-sinner',
  'jannik': 'jannik-sinner',
  'swiatek': 'iga-swiatek',
  'iga': 'iga-swiatek',
  'sabalenka': 'aryna-sabalenka',
  'aryna': 'aryna-sabalenka',
  'gauff': 'coco-gauff',
  'coco': 'coco-gauff',
  'medvedev': 'daniil-medvedev',
  'zverev': 'alexander-zverev',
  'tsitsipas': 'stefanos-tsitsipas',
  'rublev': 'andrey-rublev',
  'murray': 'andy-murray',
  'serena': 'serena-williams',
  'venus': 'venus-williams',
  'osaka': 'naomi-osaka',
  'sharapova': 'maria-sharapova',
  'kyrgios': 'nick-kyrgios',
  'ruud': 'casper-ruud',
  'fritz': 'taylor-fritz',
  'tiafoe': 'frances-tiafoe',
  'pegula': 'jessica-pegula',
  'keys': 'madison-keys',
  'raducanu': 'emma-raducanu',
  'rybakina': 'elena-rybakina',
  'jabeur': 'ons-jabeur',
  'wozniacki': 'caroline-wozniacki',
  'berrettini': 'matteo-berrettini',
  'draper': 'jack-draper',
  'shelton': 'ben-shelton',
};

// ============================================================
// STOCK IMAGE POOL — 60 diverse tennis photos (Unsplash, free license)
// Assigned without repeats across daily news batch
// ============================================================
const STOCK_IMAGES = [
  // Courts (15) — various surfaces, angles, aerial views
  '/images/news/court-01.jpg', '/images/news/court-02.jpg', '/images/news/court-03.jpg',
  '/images/news/court-04.jpg', '/images/news/court-05.jpg', '/images/news/court-06.jpg',
  '/images/news/court-07.jpg', '/images/news/court-08.jpg', '/images/news/court-09.jpg',
  '/images/news/court-10.jpg', '/images/news/court-11.jpg', '/images/news/court-12.jpg',
  '/images/news/court-13.jpg', '/images/news/court-14.jpg', '/images/news/court-15.jpg',
  // Equipment (15) — rackets, balls, shoes, strings, accessories
  '/images/news/equip-01.jpg', '/images/news/equip-02.jpg', '/images/news/equip-03.jpg',
  '/images/news/equip-04.jpg', '/images/news/equip-05.jpg', '/images/news/equip-06.jpg',
  '/images/news/equip-07.jpg', '/images/news/equip-08.jpg', '/images/news/equip-09.jpg',
  '/images/news/equip-10.jpg', '/images/news/equip-11.jpg', '/images/news/equip-12.jpg',
  '/images/news/equip-13.jpg', '/images/news/equip-14.jpg', '/images/news/equip-15.jpg',
  // Venues & stadiums (10)
  '/images/news/venue-01.jpg', '/images/news/venue-02.jpg', '/images/news/venue-03.jpg',
  '/images/news/venue-04.jpg', '/images/news/venue-05.jpg', '/images/news/venue-06.jpg',
  '/images/news/venue-07.jpg', '/images/news/venue-08.jpg', '/images/news/venue-09.jpg',
  '/images/news/venue-10.jpg',
  // Abstract close-ups (10) — net, strings, ball, lines
  '/images/news/detail-01.jpg', '/images/news/detail-02.jpg', '/images/news/detail-03.jpg',
  '/images/news/detail-04.jpg', '/images/news/detail-05.jpg', '/images/news/detail-06.jpg',
  '/images/news/detail-07.jpg', '/images/news/detail-08.jpg', '/images/news/detail-09.jpg',
  '/images/news/detail-10.jpg',
  // Atmosphere (10) — sunset, evening, mood
  '/images/news/atmo-01.jpg', '/images/news/atmo-02.jpg', '/images/news/atmo-03.jpg',
  '/images/news/atmo-04.jpg', '/images/news/atmo-05.jpg', '/images/news/atmo-06.jpg',
  '/images/news/atmo-07.jpg', '/images/news/atmo-08.jpg', '/images/news/atmo-09.jpg',
  '/images/news/atmo-10.jpg',
];

// Shuffle array (Fisher-Yates)
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ============================================================
// FETCH & PARSE RSS
// ============================================================
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});

async function fetchFeed(feed) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(feed.url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*;q=0.1',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`⚠️  ${feed.name}: HTTP ${res.status}`);
      return [];
    }

    const xml = await res.text();
    const parsed = xmlParser.parse(xml);

    // Handle both RSS 2.0 and Atom formats
    let items = [];
    if (parsed?.rss?.channel?.item) {
      items = Array.isArray(parsed.rss.channel.item)
        ? parsed.rss.channel.item
        : [parsed.rss.channel.item];
    } else if (parsed?.feed?.entry) {
      items = Array.isArray(parsed.feed.entry)
        ? parsed.feed.entry
        : [parsed.feed.entry];
    }

    return items.map(item => {
      // Google News RSS <source url="https://realsite.com">Source Name</source>
      // Extract the real article URL from the source element when available
      const sourceUrl = item.source?.['@_url'] || null;
      const rawLink = item.link?.['@_href'] || item.link || '';

      return {
        title: item.title || '',
        link: rawLink,
        // Store the real article URL from Google News <source url="..."> attribute
        realUrl: sourceUrl || null,
        pubDate: item.pubDate || item.published || item.updated || '',
        description: item.description || item.summary || '',
        source: item.source?.['#text'] || item.source || feed.name,
        sourceName: feed.name,
        imageUrl: extractImage(item),
      };
    });
  } catch (e) {
    console.warn(`⚠️  ${feed.name}: ${e.message}`);
    return [];
  }
}

function extractImage(item) {
  // Try media:content, media:thumbnail, enclosure
  if (item['media:content']?.['@_url']) return item['media:content']['@_url'];
  if (item['media:thumbnail']?.['@_url']) return item['media:thumbnail']['@_url'];
  if (item.enclosure?.['@_url'] && item.enclosure?.['@_type']?.startsWith('image'))
    return item.enclosure['@_url'];

  // Try to extract from description HTML
  const desc = item.description || '';
  const imgMatch = desc.match(/<img[^>]+src="([^"]+)"/);
  if (imgMatch) return imgMatch[1];

  return null;
}

// ============================================================
// FILTER & DEDUPLICATE
// ============================================================
const MATCH_SCORE_REGEX = /\d{1,2}-\d{1,2}[,\s]+\d{1,2}-\d{1,2}/;
const BRACKET_DRAW_REGEX = /\b(draw|bracket|seeds|qualifying)\b/i;
const PREDICTION_REGEX = /\b(prediction|preview|odds|betting line|pick|tip)\b/i;

function isMatchResult(title) {
  return MATCH_SCORE_REGEX.test(title);
}

function isBoring(title) {
  return BRACKET_DRAW_REGEX.test(title) || PREDICTION_REGEX.test(title);
}

function isRecent(pubDateStr, hoursAgo) {
  if (!pubDateStr) return true; // if no date, include it
  try {
    const pubDate = new Date(pubDateStr);
    const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    return pubDate >= cutoff;
  } catch {
    return true;
  }
}

async function getExistingSourceUrls(urls) {
  if (urls.length === 0) return new Set();
  const { data } = await supabase
    .from('news')
    .select('source_url')
    .in('source_url', urls);
  return new Set((data || []).map(r => r.source_url));
}

// ============================================================
// FETCH OG:IMAGE FROM ARTICLE PAGE
// ============================================================

// Shared fetch headers — realistic Chrome browser to avoid bot blocks
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Sec-Ch-Ua': '"Chromium";v="134", "Google Chrome";v="134", "Not:A-Brand";v="99"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
};

/**
 * Try to decode a Google News /rss/articles/CBMi... URL to extract the real article URL.
 * Google News encodes the destination URL in a Base64 blob within the path.
 */
function decodeGoogleNewsUrl(url) {
  try {
    // Google News URLs look like:
    // https://news.google.com/rss/articles/CBMi<base64>?oc=5
    const match = url.match(/\/rss\/articles\/([A-Za-z0-9_-]+)/);
    if (!match) return null;

    // The token is a protobuf-encoded blob; the URL is usually embedded as ASCII text.
    // Decode from URL-safe Base64
    const token = match[1];
    const padded = token.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = Buffer.from(padded, 'base64').toString('binary');

    // Extract the first https:// URL from the decoded binary (protobuf contains it as UTF-8)
    const urlMatch = decoded.match(/https?:\/\/[^\s\x00-\x1f"'<>]+/);
    if (urlMatch) {
      // Clean up: sometimes there's trailing garbage bytes
      let extracted = urlMatch[0];
      // Remove trailing non-URL characters (control chars, protobuf padding)
      extracted = extracted.replace(/[\x00-\x1f\x80-\xff]+$/, '');
      // Validate it looks like a real URL
      if (extracted.includes('.') && !extracted.includes('google.com/rss')) {
        return extracted;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Resolve a Google News redirect URL by following the HTTP redirect chain.
 * Falls back to decoding the Base64 token in the URL path.
 */
async function resolveGoogleNewsUrl(url) {
  // First try: decode the Base64 token directly (fast, no network)
  const decoded = decodeGoogleNewsUrl(url);
  if (decoded) return decoded;

  // Second try: follow HTTP redirects (Google sometimes uses 302 chains)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: BROWSER_HEADERS,
      redirect: 'follow',
    });
    clearTimeout(timeout);

    // If we ended up on a different domain, that's our real URL
    const finalUrl = res.url;
    if (finalUrl && !finalUrl.includes('news.google.com') && !finalUrl.includes('consent.google.com')) {
      return finalUrl;
    }

    // Third try: parse the HTML for meta-refresh or JavaScript redirect
    const html = await res.text();

    // Check for <meta http-equiv="refresh" content="0;url=...">
    const metaRefresh = html.match(/content=["']\d+;\s*url=["']?([^"'\s>]+)/i);
    if (metaRefresh?.[1] && !metaRefresh[1].includes('google.com')) {
      return metaRefresh[1];
    }

    // Check for window.location or location.href in script
    const jsRedirect = html.match(/(?:window\.location|location\.href)\s*=\s*["']([^"']+)/i);
    if (jsRedirect?.[1] && jsRedirect[1].startsWith('http') && !jsRedirect[1].includes('google.com')) {
      return jsRedirect[1];
    }

    // Check for a data-url or data-redirect attribute
    const dataUrl = html.match(/data-(?:url|redirect|href)=["'](https?:\/\/[^"']+)/i);
    if (dataUrl?.[1] && !dataUrl[1].includes('google.com')) {
      return dataUrl[1];
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extract og:image URL from an HTML string.
 * Tries multiple meta tag patterns and falls back to prominent img tags.
 */
function extractOgImageFromHtml(html) {
  // Extract og:image (try multiple patterns — sites vary in attribute order)
  const ogPatterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']og:image["']/i,
    /<meta[^>]+property=["']og:image:url["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
    /<meta[^>]+name=["']twitter:image:src["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image:src["']/i,
  ];

  for (const pattern of ogPatterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      let imgUrl = match[1].trim();
      // Decode HTML entities (&amp; → &)
      imgUrl = imgUrl.replace(/&amp;/g, '&');
      // Must be a real URL (some sites put relative paths)
      if (!imgUrl.startsWith('http')) continue;
      // Skip Google's generic news icon
      if (imgUrl.includes('lh3.googleusercontent.com') && imgUrl.includes('J6_coFbogxhRI9')) continue;
      // Skip tiny placeholder/logo images (common 1x1 px tracking pixels)
      if (imgUrl.includes('1x1') || imgUrl.includes('pixel') || imgUrl.includes('spacer')) continue;
      return imgUrl;
    }
  }

  // Last resort: find a prominent image tag (hero, featured, article, thumbnail)
  const imgTagMatch = html.match(/<img[^>]+src=["'](https?:\/\/[^"']+(?:\.jpg|\.jpeg|\.png|\.webp)[^"']*)["'][^>]*(?:width=["']\d{3,}|class=["'][^"']*(?:hero|featured|main|article|thumbnail|lead|primary))/i);
  if (imgTagMatch?.[1]) {
    return imgTagMatch[1].replace(/&amp;/g, '&');
  }

  // Alternative: image with large width attribute
  const largeImg = html.match(/<img[^>]+width=["'](\d+)["'][^>]+src=["'](https?:\/\/[^"']+)["']/i);
  if (largeImg && parseInt(largeImg[1]) >= 400) {
    return largeImg[2].replace(/&amp;/g, '&');
  }

  return null;
}

/**
 * Fetch a URL with a generous timeout and realistic browser headers.
 * Returns the HTML text or null on failure.
 */
async function fetchPageHtml(url, timeoutMs = 15000) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: BROWSER_HEADERS,
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.log(`     ⚠️  HTTP ${res.status} for ${url.slice(0, 80)}`);
      return null;
    }

    return await res.text();
  } catch (e) {
    console.log(`     ⚠️  Fetch failed: ${e.message?.slice(0, 60)} for ${url.slice(0, 60)}`);
    return null;
  }
}

/**
 * Master function: get the best image for a news item.
 *
 * Priority:
 *  1. Image already extracted from RSS feed (media:content, enclosure, etc.)
 *  2. OG:image fetched from the article page
 *  3. For Google News items: resolve real URL first, then fetch OG:image
 *
 * @param {string} url - The article link (may be Google News redirect)
 * @param {string|null} realUrl - The real article URL (from Google News <source url="...">)
 * @param {string|null} rssImageUrl - Image already extracted from RSS feed
 * @returns {string|null} - Best image URL found, or null
 */
async function fetchOgImage(url, realUrl, rssImageUrl) {
  // Tier 0: If RSS already provided an image, validate and use it
  if (rssImageUrl && rssImageUrl.startsWith('http')) {
    // Skip tiny/placeholder images
    if (!rssImageUrl.includes('1x1') && !rssImageUrl.includes('pixel')) {
      return rssImageUrl;
    }
  }

  if (!url) return null;

  // Determine the actual article URL to fetch
  let articleUrl = url;

  if (url.includes('news.google.com')) {
    // For Google News URLs, try to get the real article URL
    const resolved = realUrl || await resolveGoogleNewsUrl(url);
    if (resolved) {
      articleUrl = resolved;
      console.log(`     🔗 Resolved Google News → ${articleUrl.slice(0, 80)}`);
    } else {
      console.log(`     ⚠️  Could not resolve Google News URL: ${url.slice(0, 80)}`);
      return null;
    }
  }

  // Fetch the article page and extract OG image
  const html = await fetchPageHtml(articleUrl);
  if (!html) return null;

  const ogImage = extractOgImageFromHtml(html);
  if (ogImage) return ogImage;

  console.log(`     ⚠️  No OG image found on ${articleUrl.slice(0, 80)}`);
  return null;
}

// ============================================================
// FIND PLAYER PHOTOS
// ============================================================
function findPlayerSlugs(text) {
  const lower = text.toLowerCase();
  const found = new Set();
  for (const [keyword, slug] of Object.entries(PLAYER_KEYWORDS)) {
    if (lower.includes(keyword)) {
      found.add(slug);
    }
  }
  return [...found];
}

// ============================================================
// FIND PLAYER PHOTO BY FULL NAME (from Supabase)
// ============================================================
async function findPlayerPhotoByName(fullName) {
  if (!fullName) return null;
  try {
    // Split "Aryna Sabalenka" → first_name: "Aryna", last_name: "Sabalenka"
    const parts = fullName.trim().split(/\s+/);
    const lastName = parts[parts.length - 1];

    // Search by last name (most reliable), then verify first name
    const { data } = await supabase
      .from('players')
      .select('first_name, last_name, slug, image_url')
      .ilike('last_name', lastName)
      .not('image_url', 'is', null)
      .limit(10);

    if (!data || data.length === 0) return null;

    // If only one result, use it
    if (data.length === 1) return data[0].image_url;

    // Multiple results (e.g., "Williams") — match first name too
    const firstName = parts.slice(0, -1).join(' ').toLowerCase();
    const exact = data.find(p =>
      p.first_name.toLowerCase() === firstName ||
      p.first_name.toLowerCase().startsWith(firstName)
    );
    return exact?.image_url || data[0].image_url;
  } catch {
    return null;
  }
}

// ============================================================
// OPENAI CURATION
// ============================================================
async function curateWithOpenAI(headlines) {
  const headlineList = headlines
    .map((h, i) => {
      return `${i + 1}. [${h.sourceName}] ${h.title}`;
    })
    .join('\n');

  const systemPrompt = `You are a senior editor at SUPER.TENNIS, a tennis website for casual fans who love the human side of tennis — the personalities, stories, and moments that go beyond match scores.

Your job: Select the ${LIMIT} most interesting stories from the list below, then write an original article for each.

PRIORITIZE (roughly in this order):
- Off-court lifestyle: travel, fashion, charity, family, personal milestones
- Injuries, comebacks, retirement decisions — human interest angles
- Business deals, endorsements, brand partnerships
- Funny or unusual moments
- Surprising achievements or records
- Controversies (only if genuinely newsworthy, not manufactured drama)

SKIP:
- Regular match results (who beat whom with scores)
- Tournament draws, brackets, seedings
- Match predictions or betting odds
- Routine pre-match press conferences
- Technical playing-style analysis

HEADLINE RULES (critical):
- Max 80 characters
- Clear, accurate, and intriguing — NOT clickbait
- No ALL CAPS, no excessive punctuation (!!!, ???)
- No "You won't believe…", "shocking", "jaw-dropping", or similar bait phrases
- A good headline tells you what the story is about while making you want to read more

For each selected story, provide:
1. A clear, engaging headline (max 80 chars — see rules above)
2. A short summary (2-3 sentences, ~50 words) for the homepage card
3. A full article body (300-500 words) written in your own words. Engaging editorial tone for casual fans. Use markdown: ## for subheadings, **bold** for emphasis. Do NOT copy original text.
4. Category: one of "buzz", "scandal", "business", "fashion", "funny", "wellness"
5. The FULL NAME of the single most prominent player (e.g. "Aryna Sabalenka"). Use null if no specific player.

WRITING RULES:
- Stay truthful — never invent facts
- Write engagingly but accurately — opinionated commentary is fine, fabrication is not
- Give casual fans context (who the player is, why this matters)
- The "body" field must contain ONLY article text — no "Category:", "Main Player:" or other tags`;

  const userPrompt = `Here are today's tennis headlines. Select the ${LIMIT} most interesting ones and write original articles.

${headlineList}

Respond with a JSON array (no markdown fences):
[
  {
    "original_index": 1,
    "title": "Rewritten headline here",
    "summary": "Short 2-3 sentence summary for homepage card",
    "body": "Full 300-500 word article in markdown...",
    "category": "buzz",
    "main_player": "Full Name Here"
  }
]`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 6000,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const content = data.choices[0]?.message?.content || '';

  // Parse JSON (handle markdown fences if present)
  const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('❌ Failed to parse OpenAI response:', content.slice(0, 500));
    throw new Error('Invalid JSON from OpenAI');
  }
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('🎾 SUPER.TENNIS News Generator');
  console.log(`   Limit: ${LIMIT} | Hours: ${HOURS} | Dry Run: ${DRY_RUN}`);
  console.log('');

  // 1. Deactivate old news if requested
  if (DEACTIVATE_OLD) {
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('news')
      .update({ is_active: false })
      .lt('published_at', monthAgo)
      .eq('is_active', true)
      .select('id', { count: 'exact', head: true });
    console.log(`🗑️  Deactivated ${count || 0} old news items`);
  }

  // 2. Fetch all RSS feeds in parallel
  console.log('📡 Fetching RSS feeds...');
  const feedResults = await Promise.all(RSS_FEEDS.map(f => fetchFeed(f)));
  const allItems = feedResults.flat();
  console.log(`   Found ${allItems.length} total items across ${RSS_FEEDS.length} feeds`);

  // 3. Filter: recent, not match results, not boring
  const recentItems = allItems.filter(item => {
    if (!isRecent(item.pubDate, HOURS)) return false;
    if (isMatchResult(item.title)) return false;
    if (isBoring(item.title)) return false;
    if (!item.title || item.title.length < 10) return false;
    return true;
  });
  console.log(`   After filtering: ${recentItems.length} items`);

  if (recentItems.length === 0) {
    console.log('⚠️  No suitable news items found. Exiting.');
    return;
  }

  // 4. Deduplicate against existing DB entries
  const allUrls = recentItems.map(i => i.link).filter(Boolean);
  const existingUrls = await getExistingSourceUrls(allUrls);
  const newItems = recentItems.filter(i => !existingUrls.has(i.link));
  console.log(`   After dedup: ${newItems.length} new items (${existingUrls.size} already in DB)`);

  if (newItems.length === 0) {
    console.log('✅ All current news already in database. Nothing new to add.');
    return;
  }

  // 5. Take top candidates for OpenAI (limit to 25 to save tokens)
  const candidates = newItems.slice(0, 25);

  if (DRY_RUN) {
    console.log('\n📋 DRY RUN — Would send these headlines to OpenAI:\n');
    candidates.forEach((item, i) => {
      console.log(`  ${i + 1}. [${item.sourceName}] ${item.title}`);
    });
    console.log('\n🏁 Dry run complete. No DB writes.');
    return;
  }

  // 6. Send to OpenAI for curation
  console.log('\n🤖 Sending to OpenAI for curation...');
  let curated;
  try {
    curated = await curateWithOpenAI(candidates);
  } catch (e) {
    console.error('❌ OpenAI curation failed:', e.message);
    return;
  }
  console.log(`   OpenAI selected ${curated.length} stories\n`);

  // 7. Build news rows
  const today = new Date().toISOString().split('T')[0]; // 2026-03-10
  const newsRows = [];

  // Shuffle stock images for fallback (no repeats)
  const shuffledImages = shuffleArray(STOCK_IMAGES);
  const usedPlayerPhotos = new Set(); // track used photos to avoid repeats
  let stockIdx = 0;

  for (let i = 0; i < curated.length; i++) {
    const c = curated[i];
    const origIdx = (c.original_index || i + 1) - 1;
    const original = candidates[origIdx] || candidates[i] || candidates[0];

    // Find player slugs from title + summary + body (for metadata)
    const playerSlugs = findPlayerSlugs(`${c.title} ${c.summary} ${c.body || ''} ${original.title}`);

    // Image priority (handled inside fetchOgImage):
    // 1. Image from RSS feed (media:content / enclosure — already parsed)
    // 2. OG:image from the source article page
    // 3. For Google News: resolve real URL → fetch OG:image
    // Fallback tiers below:
    // 4. Player photo from Supabase (good — recognizable face)
    // 5. Stock tennis image (fallback — generic)
    let imageUrl = null;

    // Tier 1: Try RSS image + og:image from source article
    const ogImage = await fetchOgImage(original.link, original.realUrl, original.imageUrl);
    if (ogImage) {
      imageUrl = ogImage;
      console.log(`     🖼️  Image: ${ogImage.slice(0, 80)}`);
    }

    // Tier 2: Try player photo
    if (!imageUrl) {
      const mainPlayer = c.main_player || null;
      if (mainPlayer) {
        const playerPhoto = await findPlayerPhotoByName(mainPlayer);
        if (playerPhoto && !usedPlayerPhotos.has(playerPhoto)) {
          imageUrl = playerPhoto;
          usedPlayerPhotos.add(imageUrl);
          console.log(`     👤 ${mainPlayer}`);
        }
      }
    }

    // Tier 3: Stock image fallback
    if (!imageUrl) {
      imageUrl = shuffledImages[stockIdx % shuffledImages.length];
      stockIdx++;
      console.log(`     🎾 Stock: ${imageUrl.split('/').pop()}`);
    }

    // Generate SEO-friendly slug from title
    const titleSlug = c.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60);
    const slug = `${today}-${titleSlug}`;

    const sourceName = typeof original.source === 'string'
      ? original.source
      : original.sourceName || 'Unknown';

    newsRows.push({
      slug,
      title: c.title.replace(/\s*📷\s*/g, '').trim(),
      summary: c.summary,
      body: c.body || null,
      category: c.category || 'buzz',
      image_url: imageUrl,
      source_name: sourceName,
      source_url: original.link || '',
      original_title: original.title || '',
      player_slugs: playerSlugs,
      published_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      is_active: true,
    });

    console.log(`  ✅ ${(c.category || 'buzz').toUpperCase().padEnd(8)} ${c.title}`);
    if (playerSlugs.length > 0) {
      console.log(`     👤 ${playerSlugs.join(', ')}`);
    }
  }

  // 8. Upsert into Supabase
  console.log(`\n💾 Upserting ${newsRows.length} news items to Supabase...`);
  const { data, error } = await supabase
    .from('news')
    .upsert(newsRows, { onConflict: 'slug' })
    .select('id, slug');

  if (error) {
    console.error('❌ Supabase upsert error:', error.message);
    return;
  }
  console.log(`   Saved ${data?.length || 0} items`);

  // 9. Build & deploy to Cloudflare Pages if requested (Direct Upload)
  if (DEPLOY) {
    const { execSync } = await import('child_process');
    const { fileURLToPath } = await import('url');
    const { dirname, resolve } = await import('path');
    const cwd = resolve(dirname(fileURLToPath(import.meta.url)), '..');

    console.log('\n🔨 Building Astro site...');
    try {
      execSync('npx astro build', { cwd, stdio: 'inherit', timeout: 600_000 });
      console.log('   ✅ Build complete');
    } catch (e) {
      console.error('❌ Build failed:', e.message);
      return;
    }

    console.log('\n🚀 Deploying to Cloudflare Pages...');
    try {
      execSync('npx wrangler pages deploy dist --project-name supertennis', {
        cwd, stdio: 'inherit', timeout: 300_000,
      });
      console.log('   ✅ Deploy complete');
    } catch (e) {
      console.error('❌ Deploy failed:', e.message);
    }
  }

  console.log('\n🏁 Done!');
}

main().catch(e => {
  console.error('❌ Fatal error:', e);
  process.exit(1);
});
