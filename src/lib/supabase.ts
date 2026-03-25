import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.SUPABASE_URL || '';
// Use service key for SSG builds (never exposed to client, only at build time)
// Falls back to anon key if service key is not available
const supabaseKey = import.meta.env.SUPABASE_SERVICE_KEY || import.meta.env.SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Type helpers for database tables
export interface Player {
  id: number;
  player_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  slug: string;
  hand: 'R' | 'L' | 'U' | 'A';
  birth_date: string | null;
  country_code: string | null;
  height_cm: number | null;
  tour: 'atp' | 'wta';
  bio_short: string | null;
  image_url: string | null;
  is_active: boolean;
  career_titles: number;
  grand_slam_titles: number;
  career_win: number;
  career_loss: number;
  career_prize_usd: number;
  meta_title: string | null;
  meta_description: string | null;
}

export interface Ranking {
  id: number;
  ranking_date: string;
  player_id: string;
  tour: 'atp' | 'wta';
  ranking: number;
  points: number | null;
  tours_played: number | null;
}

export interface Tournament {
  id: number;
  tourney_id: string;
  name: string;
  slug: string;
  surface: string | null;
  level: string | null;
  tour: 'atp' | 'wta';
  country_code: string | null;
  city: string | null;
  draw_size: number | null;
}

export interface Article {
  id: number;
  slug: string;
  title: string;
  category: 'players' | 'records' | 'gear' | 'lifestyle' | 'tournaments' | 'vs';
  subcategory: string | null;
  excerpt: string | null;
  body: string | null;
  image_url: string | null;
  image_alt: string | null;
  meta_title: string | null;
  meta_description: string | null;
  player_id: string | null;
  tournament_id: string | null;
  status: 'draft' | 'review' | 'published' | 'archived';
  published_at: string | null;
}

// ============================================================
// BUILD-TIME CACHE
// In-memory cache for SSG builds. Each table is fetched once,
// then all subsequent lookups are served from Maps.
// ============================================================

let _playersCache: Player[] | null = null;
let _playersBySlug: Map<string, Player> | null = null;

let _articlesCache: Article[] | null = null;
let _articlesBySlug: Map<string, Article> | null = null;

let _newsCache: NewsItem[] | null = null;
let _newsBySlug: Map<string, NewsItem> | null = null;

// Rankings keyed by tour, stores the full joined result
let _rankingsCache: Map<string, any[]> = new Map();
let _rankingsDateCache: Map<string, string> = new Map();

async function ensurePlayersCache(): Promise<Player[]> {
  if (_playersCache) return _playersCache;

  console.log('[cache] Fetching ALL players from Supabase...');
  const startMs = Date.now();

  // Supabase default limit is 1000; fetch in batches to get all
  const allPlayers: Player[] = [];
  const batchSize = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .range(offset, offset + batchSize - 1);

    if (error) {
      console.error('[cache] ensurePlayersCache error:', error.message);
      break;
    }

    if (data && data.length > 0) {
      allPlayers.push(...(data as Player[]));
      offset += batchSize;
      hasMore = data.length === batchSize;
    } else {
      hasMore = false;
    }
  }

  _playersCache = allPlayers;
  _playersBySlug = new Map(allPlayers.map(p => [p.slug, p]));

  console.log(`[cache] Cached ${allPlayers.length} players in ${Date.now() - startMs}ms`);
  return _playersCache;
}

async function ensureArticlesCache(): Promise<Article[]> {
  if (_articlesCache) return _articlesCache;

  console.log('[cache] Fetching ALL articles from Supabase...');
  const startMs = Date.now();

  const allArticles: Article[] = [];
  const batchSize = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .range(offset, offset + batchSize - 1);

    if (error) {
      console.error('[cache] ensureArticlesCache error:', error.message);
      break;
    }

    if (data && data.length > 0) {
      allArticles.push(...(data as Article[]));
      offset += batchSize;
      hasMore = data.length === batchSize;
    } else {
      hasMore = false;
    }
  }

  _articlesCache = allArticles;
  _articlesBySlug = new Map(allArticles.map(a => [a.slug, a]));

  console.log(`[cache] Cached ${allArticles.length} articles in ${Date.now() - startMs}ms`);
  return _articlesCache;
}

async function ensureNewsCache(): Promise<NewsItem[]> {
  if (_newsCache) return _newsCache;

  console.log('[cache] Fetching ALL news from Supabase...');
  const startMs = Date.now();

  const { data, error } = await supabase
    .from('news')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(1000);

  if (error) {
    console.error('[cache] ensureNewsCache error:', error.message);
    _newsCache = [];
    _newsBySlug = new Map();
    return _newsCache;
  }

  _newsCache = (data as NewsItem[]) || [];
  _newsBySlug = new Map(_newsCache.map(n => [n.slug, n]));

  console.log(`[cache] Cached ${_newsCache.length} news items in ${Date.now() - startMs}ms`);
  return _newsCache;
}

async function ensureRankingsCache(tour: 'atp' | 'wta'): Promise<{ date: string; data: any[] }> {
  const cachedDate = _rankingsDateCache.get(tour);
  const cachedData = _rankingsCache.get(tour);
  if (cachedDate && cachedData) return { date: cachedDate, data: cachedData };

  console.log(`[cache] Fetching ${tour.toUpperCase()} rankings from Supabase...`);
  const startMs = Date.now();

  // Get latest date
  const { data: dateData } = await supabase
    .from('rankings')
    .select('ranking_date')
    .eq('tour', tour)
    .order('ranking_date', { ascending: false })
    .limit(1);

  if (!dateData || dateData.length === 0) {
    _rankingsDateCache.set(tour, '');
    _rankingsCache.set(tour, []);
    return { date: '', data: [] };
  }

  const latestDate = dateData[0].ranking_date;

  // Fetch all rankings for the latest date (with player join)
  const { data, error } = await supabase
    .from('rankings')
    .select('*, players!inner(first_name, last_name, slug, country_code, career_titles, grand_slam_titles, image_url, career_win, career_loss)')
    .eq('tour', tour)
    .eq('ranking_date', latestDate)
    .order('ranking', { ascending: true })
    .limit(1000);

  if (error) {
    console.error(`[cache] ensureRankingsCache(${tour}) error:`, error.message);
    _rankingsDateCache.set(tour, latestDate);
    _rankingsCache.set(tour, []);
    return { date: latestDate, data: [] };
  }

  const rankings = data || [];
  _rankingsDateCache.set(tour, latestDate);
  _rankingsCache.set(tour, rankings);

  console.log(`[cache] Cached ${rankings.length} ${tour.toUpperCase()} rankings in ${Date.now() - startMs}ms`);
  return { date: latestDate, data: rankings };
}

// ============================================================
// PUBLIC API — all signatures unchanged
// ============================================================

// Helper: get players with optional filters
export async function getPlayers(options: {
  tour?: 'atp' | 'wta';
  limit?: number;
  offset?: number;
  search?: string;
} = {}) {
  const allPlayers = await ensurePlayersCache();

  // Filter to active players only (original query had .eq('is_active', true))
  let filtered = allPlayers.filter(p => p.is_active);

  if (options.tour) filtered = filtered.filter(p => p.tour === options.tour);
  if (options.search) {
    const needle = options.search.toLowerCase();
    filtered = filtered.filter(p => p.full_name.toLowerCase().includes(needle));
  }

  // Sort by career_titles descending (original query order)
  filtered.sort((a, b) => (b.career_titles ?? 0) - (a.career_titles ?? 0));

  // Pagination
  const offset = options.offset ?? 0;
  const limit = options.limit ?? filtered.length;
  filtered = filtered.slice(offset, offset + limit);

  return filtered;
}

// Helper: get single player by slug
export async function getPlayerBySlug(slug: string) {
  await ensurePlayersCache();
  return _playersBySlug!.get(slug) ?? null;
}

// Helper: get latest rankings (with player details)
export async function getLatestRankings(tour: 'atp' | 'wta', limit = 100) {
  const { data } = await ensureRankingsCache(tour);
  return data.slice(0, limit);
}

// Helper: get top player slugs for static path generation
export async function getTopPlayerSlugs(limit = 200): Promise<string[]> {
  try {
    const allPlayers = await ensurePlayersCache();

    // Replicate the original multi-pool logic in memory
    const slugs: string[] = [];

    // Players with photos AND career titles
    for (const p of allPlayers) {
      if (p.image_url && p.career_titles > 0) slugs.push(p.slug);
    }
    // Players with photos AND significant wins
    for (const p of allPlayers) {
      if (p.image_url && p.career_win > 20) slugs.push(p.slug);
    }
    // Players with prize money
    for (const p of allPlayers) {
      if (p.career_prize_usd > 0) slugs.push(p.slug);
    }
    // ATP players with titles, sorted, limited
    const atpWithTitles = allPlayers
      .filter(p => p.tour === 'atp' && p.career_titles > 0)
      .sort((a, b) => b.career_titles - a.career_titles)
      .slice(0, limit);
    for (const p of atpWithTitles) slugs.push(p.slug);

    // WTA players with titles, sorted, limited
    const wtaWithTitles = allPlayers
      .filter(p => p.tour === 'wta' && p.career_titles > 0)
      .sort((a, b) => b.career_titles - a.career_titles)
      .slice(0, limit);
    for (const p of wtaWithTitles) slugs.push(p.slug);

    // All ranked players from rankings cache
    const [atpRankings, wtaRankings] = await Promise.all([
      ensureRankingsCache('atp'),
      ensureRankingsCache('wta'),
    ]);
    for (const r of atpRankings.data.slice(0, 100)) {
      const slug = (r as any).players?.slug;
      if (slug) slugs.push(slug);
    }
    for (const r of wtaRankings.data.slice(0, 100)) {
      const slug = (r as any).players?.slug;
      if (slug) slugs.push(slug);
    }

    return [...new Set(slugs.filter(Boolean))];
  } catch (e) {
    console.error('getTopPlayerSlugs error:', e);
    return [];
  }
}

// Helper: get related players (same tour, sorted by career titles)
export async function getRelatedPlayers(tour: 'atp' | 'wta', excludeSlug: string, limit = 4) {
  const allPlayers = await ensurePlayersCache();

  const related = allPlayers
    .filter(p => p.tour === tour && p.slug !== excludeSlug && p.career_titles > 0)
    .sort((a, b) => b.career_titles - a.career_titles)
    .slice(0, limit)
    .map(p => ({
      first_name: p.first_name,
      last_name: p.last_name,
      slug: p.slug,
      country_code: p.country_code,
      image_url: p.image_url,
      career_titles: p.career_titles,
      grand_slam_titles: p.grand_slam_titles,
    }));

  return related as Partial<Player>[];
}

// Helper: get leaderboards for records page
export async function getLeaderboard(
  field: 'career_titles' | 'grand_slam_titles' | 'career_win' | 'career_prize_usd',
  tour: 'atp' | 'wta' | null = null,
  limit = 10
) {
  const allPlayers = await ensurePlayersCache();

  let filtered = allPlayers.filter(p => (p[field] ?? 0) > 0);
  if (tour) filtered = filtered.filter(p => p.tour === tour);

  filtered.sort((a, b) => ((b[field] as number) ?? 0) - ((a[field] as number) ?? 0));
  filtered = filtered.slice(0, limit);

  return filtered.map(p => ({
    first_name: p.first_name,
    last_name: p.last_name,
    slug: p.slug,
    country_code: p.country_code,
    tour: p.tour,
    career_titles: p.career_titles,
    grand_slam_titles: p.grand_slam_titles,
    career_win: p.career_win,
    career_loss: p.career_loss,
    career_prize_usd: p.career_prize_usd,
    image_url: p.image_url,
  })) as Partial<Player>[];
}

// Helper: get articles (published or draft for SSG)
export async function getArticles(options: {
  category?: string;
  subcategory?: string;
  limit?: number;
  status?: string[];
} = {}) {
  const allArticles = await ensureArticlesCache();
  const validStatuses = options.status || ['published', 'draft'];

  let filtered = allArticles.filter(a => validStatuses.includes(a.status));

  if (options.category) filtered = filtered.filter(a => a.category === options.category);
  if (options.subcategory) filtered = filtered.filter(a => a.subcategory === options.subcategory);

  // Sort by created_at descending — articles have no created_at in the interface,
  // but the original query used it. We'll use published_at as proxy, nulls last.
  filtered.sort((a, b) => {
    const da = a.published_at || '';
    const db = b.published_at || '';
    return db.localeCompare(da);
  });

  if (options.limit) filtered = filtered.slice(0, options.limit);

  return filtered;
}

// Helper: get single article by slug
export async function getArticleBySlug(slug: string) {
  await ensureArticlesCache();
  return _articlesBySlug!.get(slug) ?? null;
}

// ============================================================
// NEWS
// ============================================================
export interface NewsItem {
  id: number;
  slug: string;
  title: string;
  summary: string;
  body: string | null;
  category: string;
  image_url: string | null;
  source_name: string;
  source_url: string;
  player_slugs: string[];
  published_at: string;
}

export async function getActiveNews(limit = 6): Promise<NewsItem[]> {
  try {
    const allNews = await ensureNewsCache();
    const active = allNews
      .filter((n: any) => n.is_active === true || n.is_active === undefined)
      .sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''))
      .slice(0, limit);
    return active;
  } catch (e) {
    console.warn('getActiveNews: Supabase unavailable');
    return [];
  }
}

export async function getNewsBySlug(slug: string): Promise<NewsItem | null> {
  try {
    await ensureNewsCache();
    return _newsBySlug!.get(slug) ?? null;
  } catch { return null; }
}

export async function getAllNewsSlugs(): Promise<string[]> {
  try {
    const allNews = await ensureNewsCache();
    return allNews
      .filter((n: any) => n.is_active === true || n.is_active === undefined)
      .sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''))
      .slice(0, 200)
      .map(n => n.slug);
  } catch { return []; }
}

// Helper: get all article slugs for static path generation
export async function getArticleSlugs(category?: string): Promise<string[]> {
  try {
    const allArticles = await ensureArticlesCache();
    let filtered = allArticles.filter(a => ['published', 'draft'].includes(a.status));
    if (category) filtered = filtered.filter(a => a.category === category);
    return filtered.map(a => a.slug).filter(Boolean);
  } catch (e) {
    return [];
  }
}
