import { getArticles } from '../../lib/supabase';
import { stripMarkdown } from '../../lib/fallback-data';
import { vsPlayerSlugs, getPlayerPhotosBatch, slugToName } from '../../lib/player-photos';

function getEra(slug: string): string {
  const modern = ['alcaraz-vs-sinner', 'djokovic-vs-alcaraz', 'swiatek-vs-sabalenka', 'sinner-vs-medvedev', 'zverev-vs-alcaraz', 'gauff-vs-swiatek', 'kyrgios-vs-djokovic'];
  const bigThree = ['djokovic-vs-nadal', 'federer-vs-nadal', 'djokovic-vs-federer', 'djokovic-vs-murray', 'federer-vs-djokovic-wimbledon', 'big-three-comparison', 'federer-vs-murray', 'tsitsipas-vs-medvedev'];
  const women = ['evert-vs-navratilova', 'williams-vs-williams', 'graf-vs-seles', 'sharapova-vs-williams', 'henin-vs-clijsters'];
  const classic = ['sampras-vs-agassi', 'borg-vs-mcenroe', 'connors-vs-lendl'];

  if (modern.includes(slug)) return 'Current Era';
  if (bigThree.includes(slug)) return 'Big Three Era';
  if (women.includes(slug)) return "Women's Tennis";
  if (classic.includes(slug)) return 'Classic Era';
  return 'Rivalry';
}

function getEraClass(slug: string): string {
  const era = getEra(slug);
  if (era === 'Current Era') return 'current';
  if (era === 'Big Three Era') return 'big-three';
  if (era === "Women's Tennis") return 'wta';
  if (era === 'Classic Era') return 'classic';
  return 'default';
}

export async function GET({ request }: { request: Request }) {
  const url = new URL(request.url);
  const filterEra = url.searchParams.get('era') || 'all';
  const searchQuery = url.searchParams.get('q') || '';

  try {
    // Fetch all VS articles
    let articles = await getArticles({ category: 'vs', limit: 100 });

    // Filter by era
    if (filterEra !== 'all') {
      const eraMap: Record<string, string> = { 'big-three': 'Big Three Era', 'current': 'Current Era', 'wta': "Women's Tennis", 'classic': 'Classic Era' };
      const targetEra = eraMap[filterEra];
      articles = articles.filter(a => getEra(a.slug) === targetEra);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      articles = articles.filter(a =>
        a.title.toLowerCase().includes(query) ||
        (a.excerpt || '').toLowerCase().includes(query)
      );
    }

    // Get player photos
    const allPlayerPairs = Object.values(vsPlayerSlugs).flat();
    const photoMap = await getPlayerPhotosBatch(allPlayerPairs);

    // Map to response format
    const result = articles.map(article => {
      const pair = vsPlayerSlugs[article.slug];
      const name1 = pair ? slugToName(pair[0]) : '';
      const name2 = pair ? slugToName(pair[1]) : '';

      return {
        slug: article.slug,
        title: article.title,
        excerpt: stripMarkdown(article.excerpt || article.meta_description || ''),
        era: getEra(article.slug),
        era_class: getEraClass(article.slug),
        p1: pair ? photoMap.get(pair[0]) || null : null,
        p2: pair ? photoMap.get(pair[1]) || null : null,
        name1,
        name2
      };
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    console.error('API error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch articles' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
