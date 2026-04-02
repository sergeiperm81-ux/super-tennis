import { getArticles } from '../../lib/supabase';
import { stripMarkdown } from '../../lib/fallback-data';

export async function GET({ request }: { request: Request }) {
  const url = new URL(request.url);
  const searchQuery = url.searchParams.get('q') || '';
  const offset = parseInt(url.searchParams.get('offset') || '0');

  try {
    // Fetch all record articles
    let articles = await getArticles({ category: 'records', limit: 100 });

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      articles = articles.filter(a =>
        a.title.toLowerCase().includes(query) ||
        (a.excerpt || '').toLowerCase().includes(query)
      );
    }

    // Pagination: return 12 articles starting at offset
    const paginatedArticles = articles.slice(offset, offset + 12);

    // Map to response format
    const result = paginatedArticles.map(article => ({
      slug: article.slug,
      title: article.title,
      excerpt: stripMarkdown(article.excerpt || article.meta_description || ''),
    }));

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
