/**
 * Smart internal linking — Codex SEO audit 2026-05-17 Round 2 item #8.
 *
 * Discovers content related to a given player so we can build a richer
 * "Player Universe" panel on /players/{slug}/ pages. This improves:
 *   - Internal linking depth (Google ranks deeper hub-and-spoke structures higher)
 *   - User dwell time (more in-context links to follow)
 *   - AI citability (related content is co-located, so when AI quotes one
 *     SUPER.TENNIS page it sees the others nearby)
 *
 * Functions are all pure / cache-friendly — they read from the in-memory
 * caches built by lib/supabase.ts, so calling them once per player page
 * adds zero extra Supabase requests.
 */

import { getArticles, getActiveNews } from './supabase';
import type { Article, NewsItem, Player } from './supabase';

export interface RelatedLink {
  href: string;
  title: string;
  // Short label shown when the title alone isn't enough context
  // (e.g., "Latest news", "Career record")
  contextLabel?: string;
}

/**
 * Get the most recent news mentioning a given player.
 * News items tag relevant players via news.player_slugs[].
 */
export async function getLatestNewsForPlayer(
  playerSlug: string,
  limit = 3,
): Promise<RelatedLink[]> {
  try {
    // Pull a generous pool so we have enough to filter
    const allNews = await getActiveNews(300);
    const matches = allNews.filter(
      (n: NewsItem) => Array.isArray(n.player_slugs) && n.player_slugs.includes(playerSlug),
    );

    return matches.slice(0, limit).map((n: NewsItem) => ({
      href: `/news/${n.slug}/`,
      title: n.title,
      contextLabel: 'News',
    }));
  } catch (_) {
    return [];
  }
}

/**
 * Get articles (records, lifestyle, gear) where this player is the primary
 * subject (matched via article.player_id or via title/slug containing the
 * player's surname).
 */
export async function getArticlesAboutPlayer(
  player: Pick<Player, 'slug' | 'player_id' | 'last_name'>,
  limit = 6,
): Promise<RelatedLink[]> {
  try {
    const all = await getArticles({ limit: 1000 });
    const surname = (player.last_name || '').toLowerCase();
    const slug = player.slug;

    // Sub-article suffixes that get embedded into the player profile page
    // (they have Supabase records but no standalone URLs — 301-redirected
    // in public/_redirects). Linking to them wastes crawl budget.
    const SUB_ARTICLE_SUFFIXES = [
      '-stats', '-grand-slams', '-career-timeline', '-net-worth',
      '-racket', '-partner', '-age', '-bio', '-profile',
    ];
    const isEmbeddedSubArticle = (s: string): boolean =>
      SUB_ARTICLE_SUFFIXES.some(suf => s === `${slug}${suf}`);

    const matches = all.filter((a: Article) => {
      // Skip the player's own profile article (we're already on that page)
      if (a.slug === slug) return false;
      // Skip players category entirely — covered by the profile page itself
      if (a.category === 'players') return false;
      // Skip embedded sub-articles (redirected URLs)
      if (isEmbeddedSubArticle(a.slug)) return false;
      // Skip vs/ articles — those are linked separately as h2h
      if (a.category === 'vs') return false;
      // Skip news category (handled separately)
      if (a.category === ('news' as any)) return false;

      // Primary match: player_id link
      if (a.player_id && a.player_id === player.player_id) return true;

      // Secondary match: slug contains player slug (e.g., djokovic-vs-nadal-masters-final-2026)
      if (a.slug.includes(slug)) return true;

      // Tertiary match: title contains surname AND the surname is reasonably
      // distinctive (length >= 5 to avoid false positives on common names)
      if (surname.length >= 5 && a.title.toLowerCase().includes(surname)) return true;

      return false;
    });

    return matches.slice(0, limit).map((a: Article) => ({
      href: `/${a.category}/${a.slug}/`,
      title: a.title,
      contextLabel: categoryLabel(a.category),
    }));
  } catch (_) {
    return [];
  }
}

/**
 * Map article.category to a human-readable label for the chip / context line.
 */
function categoryLabel(category: string): string {
  switch (category) {
    case 'records': return 'Record';
    case 'gear': return 'Gear';
    case 'lifestyle': return 'Lifestyle';
    case 'tournaments': return 'Tournament';
    case 'players': return 'Player';
    default: return 'Article';
  }
}

/**
 * Get a curated list of "explore further" generic links that always make
 * sense from a player page. These are hand-picked, not data-driven, but
 * the targets are evergreen so they're safe to hardcode.
 */
export function getEvergreenPlayerLinks(player: Pick<Player, 'tour'>): RelatedLink[] {
  const tourLabel = player.tour === 'atp' ? 'ATP' : 'WTA';
  const pointsExplainer = player.tour === 'atp'
    ? { href: '/rankings/atp-ranking-points-explained/', title: 'ATP Ranking Points', contextLabel: 'How math works' }
    : { href: '/rankings/wta-ranking-points-explained/', title: 'WTA Ranking Points', contextLabel: 'How math works' };
  return [
    { href: `/rankings/`, title: `${tourLabel} Rankings`, contextLabel: 'Live data' },
    pointsExplainer,
    { href: `/rankings/how-tennis-rankings-work/`, title: 'How Rankings Work', contextLabel: 'System overview' },
    { href: `/records/`, title: 'Tennis Records', contextLabel: 'All-time stats' },
    { href: `/tournaments/`, title: 'Tournament Guides', contextLabel: 'Grand Slams + Masters' },
    { href: `/rules/`, title: 'Tennis Rules', contextLabel: 'Scoring, sets, tiebreak' },
    { href: `/lifestyle/money/`, title: 'Tennis Money', contextLabel: 'Prize money & net worth' },
    { href: `/lifestyle/career/`, title: 'Tennis Career Paths', contextLabel: 'Going pro' },
  ];
}

// ===========================================================================
// TOURNAMENT SMART LINKING — Codex audit #8 (tournament → past champions,
// prize money, news, related guides)
// ===========================================================================

/**
 * Derive a list of search keywords from a tournament slug.
 * E.g. 'wimbledon-guide' → ['wimbledon']
 *      'how-to-watch-french-open-2026' → ['french open', 'roland garros']
 *      'us-open-guide' → ['us open']
 */
function tournamentKeywords(slug: string): string[] {
  const base = slug
    .replace(/-guide$/, '')
    .replace(/-complete$/, '')
    .replace(/^how-to-watch-/, '')
    .replace(/-\d{4}$/, '')
    .replace(/-/g, ' ')
    .trim()
    .toLowerCase();

  // Slam alias map — Roland Garros / French Open / Wimbledon etc. are
  // referenced by multiple names across news + articles
  const aliases: Record<string, string[]> = {
    'french open': ['french open', 'roland garros'],
    'roland garros': ['roland garros', 'french open'],
    'us open': ['us open'],
    'australian open': ['australian open', 'aus open', 'aussie open'],
    'wimbledon': ['wimbledon'],
    'atp finals': ['atp finals', 'year-end finals', 'turin'],
    'wta finals': ['wta finals', 'year-end finals'],
    'indian wells': ['indian wells', 'bnp paribas'],
    'miami open': ['miami open', 'miami masters'],
    'monte carlo': ['monte carlo', 'monaco'],
    'shanghai masters': ['shanghai masters', 'shanghai'],
  };

  if (aliases[base]) return aliases[base];
  return [base];
}

/**
 * Get recent news related to a tournament. Matches against news.title and
 * news.summary (case-insensitive substring match on any of the keywords).
 */
export async function getLatestNewsForTournament(
  slug: string,
  limit = 3,
): Promise<RelatedLink[]> {
  try {
    const keywords = tournamentKeywords(slug);
    const allNews = await getActiveNews(500);

    const matches = allNews.filter((n: NewsItem) => {
      const haystack = `${n.title} ${n.summary || ''}`.toLowerCase();
      return keywords.some(kw => haystack.includes(kw));
    });

    return matches.slice(0, limit).map((n: NewsItem) => ({
      href: `/news/${n.slug}/`,
      title: n.title,
      contextLabel: 'News',
    }));
  } catch (_) {
    return [];
  }
}

/**
 * Get articles related to a tournament. Matches against article.slug, title,
 * and meta_description.
 */
export async function getArticlesAboutTournament(
  slug: string,
  limit = 6,
): Promise<RelatedLink[]> {
  try {
    const keywords = tournamentKeywords(slug);
    const all = await getArticles({ limit: 1000 });

    const matches = all.filter((a: Article) => {
      if (a.slug === slug) return false;
      if (a.category === 'vs') return false;
      if (a.category === ('news' as any)) return false;

      const haystack = `${a.slug} ${a.title} ${a.meta_description || ''}`.toLowerCase();
      return keywords.some(kw => haystack.includes(kw));
    });

    return matches.slice(0, limit).map((a: Article) => ({
      href: `/${a.category}/${a.slug}/`,
      title: a.title,
      contextLabel: categoryLabel(a.category),
    }));
  } catch (_) {
    return [];
  }
}

/**
 * Evergreen "explore further" links that always make sense from a
 * tournament page.
 */
export function getEvergreenTournamentLinks(): RelatedLink[] {
  return [
    { href: `/tournaments/`, title: 'All Tournaments', contextLabel: 'Index' },
    { href: `/calendar/`, title: '2026 Tennis Calendar', contextLabel: 'Schedule' },
    { href: `/rankings/`, title: 'ATP & WTA Rankings', contextLabel: 'Live data' },
    { href: `/rankings/how-tennis-rankings-work/`, title: 'How Rankings Work', contextLabel: 'Points & seeding' },
    { href: `/rules/how-many-sets-in-tennis/`, title: 'Match Format Rules', contextLabel: 'Best of 3 vs 5' },
    { href: `/lifestyle/money/`, title: 'Tennis Prize Money', contextLabel: 'Earnings & purse' },
    { href: `/lifestyle/travel/`, title: 'Tennis Travel Guides', contextLabel: 'Visit a Slam' },
  ];
}
