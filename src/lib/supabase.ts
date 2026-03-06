import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  category: 'players' | 'records' | 'gear' | 'lifestyle' | 'tournaments';
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

// Helper: get latest rankings
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
    .select('*, players!inner(first_name, last_name, slug, country_code)')
    .eq('tour', tour)
    .eq('ranking_date', latestDate)
    .order('ranking', { ascending: true })
    .limit(limit);

  if (error) console.error('getLatestRankings error:', error.message);
  return data || [];
}

// Helper: get published articles
export async function getArticles(options: {
  category?: string;
  limit?: number;
  playerSlug?: string;
} = {}) {
  let query = supabase
    .from('articles')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (options.category) query = query.eq('category', options.category);
  if (options.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) console.error('getArticles error:', error.message);
  return (data as Article[]) || [];
}
