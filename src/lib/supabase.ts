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

// Helper: get players with optional filters
export async function getPlayers(options: {
  tour?: 'atp' | 'wta';
  limit?: number;
  offset?: number;
  search?: string;
} = {}) {
  let query = supabase
    .from('players')
    .select('*')
    .eq('is_active', true)
    .order('career_titles', { ascending: false });

  if (options.tour) query = query.eq('tour', options.tour);
  if (options.limit) query = query.limit(options.limit);
  if (options.offset) query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  if (options.search) query = query.ilike('full_name', `%${options.search}%`);

  const { data, error } = await query;
  if (error) console.error('getPlayers error:', error.message);
  return (data as Player[]) || [];
}

// Helper: get single player by slug
export async function getPlayerBySlug(slug: string) {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) return null;
  return data as Player;
}

// Helper: get latest rankings (with player details)
export async function getLatestRankings(tour: 'atp' | 'wta', limit = 100) {
  // First get the latest date
  const { data: dateData } = await supabase
    .from('rankings')
    .select('ranking_date')
    .eq('tour', tour)
    .order('ranking_date', { ascending: false })
    .limit(1);

  if (!dateData || dateData.length === 0) return [];

  const latestDate = dateData[0].ranking_date;

  const { data, error } = await supabase
    .from('rankings')
    .select('*, players!inner(first_name, last_name, slug, country_code, career_titles, grand_slam_titles, image_url, career_win, career_loss)')
    .eq('tour', tour)
    .eq('ranking_date', latestDate)
    .order('ranking', { ascending: true })
    .limit(limit);

  if (error) console.error('getLatestRankings error:', error.message);
  return data || [];
}

// Helper: get top player slugs for static path generation
export async function getTopPlayerSlugs(limit = 100): Promise<string[]> {
  try {
    const [atpRes, wtaRes] = await Promise.all([
      supabase
        .from('players')
        .select('slug')
        .eq('tour', 'atp')
        .gt('career_titles', 0)
        .order('career_titles', { ascending: false })
        .limit(limit),
      supabase
        .from('players')
        .select('slug')
        .eq('tour', 'wta')
        .gt('career_titles', 0)
        .order('career_titles', { ascending: false })
        .limit(limit),
    ]);

    const slugs = [
      ...(atpRes.data || []).map(p => p.slug),
      ...(wtaRes.data || []).map(p => p.slug),
    ].filter(Boolean);

    return [...new Set(slugs)];
  } catch (e) {
    console.error('getTopPlayerSlugs error:', e);
    return [];
  }
}

// Helper: get related players (same tour, sorted by career titles)
export async function getRelatedPlayers(tour: 'atp' | 'wta', excludeSlug: string, limit = 4) {
  const { data, error } = await supabase
    .from('players')
    .select('first_name, last_name, slug, country_code, image_url, career_titles, grand_slam_titles')
    .eq('tour', tour)
    .neq('slug', excludeSlug)
    .gt('career_titles', 0)
    .order('career_titles', { ascending: false })
    .limit(limit);

  if (error) console.error('getRelatedPlayers error:', error.message);
  return (data as Partial<Player>[]) || [];
}

// Helper: get leaderboards for records page
export async function getLeaderboard(
  field: 'career_titles' | 'grand_slam_titles' | 'career_win' | 'career_prize_usd',
  tour: 'atp' | 'wta' | null = null,
  limit = 10
) {
  let query = supabase
    .from('players')
    .select('first_name, last_name, slug, country_code, tour, career_titles, grand_slam_titles, career_win, career_loss, career_prize_usd')
    .gt(field, 0)
    .order(field, { ascending: false })
    .limit(limit);

  if (tour) query = query.eq('tour', tour);

  const { data, error } = await query;
  if (error) console.error('getLeaderboard error:', error.message);
  return (data as Partial<Player>[]) || [];
}

// Helper: get articles (published or draft for SSG)
export async function getArticles(options: {
  category?: string;
  subcategory?: string;
  limit?: number;
  status?: string[];
} = {}) {
  let query = supabase
    .from('articles')
    .select('*')
    .in('status', options.status || ['published', 'draft'])
    .order('created_at', { ascending: false });

  if (options.category) query = query.eq('category', options.category);
  if (options.subcategory) query = query.eq('subcategory', options.subcategory);
  if (options.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) console.error('getArticles error:', error.message);
  return (data as Article[]) || [];
}

// Helper: get single article by slug
export async function getArticleBySlug(slug: string) {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) return null;
  return data as Article;
}

// Helper: get all article slugs for static path generation
export async function getArticleSlugs(category?: string): Promise<string[]> {
  try {
    let query = supabase
      .from('articles')
      .select('slug')
      .in('status', ['published', 'draft']);

    if (category) query = query.eq('category', category);

    const { data, error } = await query;
    if (error) return [];
    return (data || []).map(a => a.slug).filter(Boolean);
  } catch (e) {
    return [];
  }
}
