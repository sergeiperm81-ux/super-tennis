import { getArticles } from '../../lib/supabase';
import { stripMarkdown } from '../../lib/fallback-data';
import { getArticlePhotosForCategory } from '../../lib/player-photos';

export async function GET({ request }: { request: Request }) {
  const url = new URL(request.url);
  const filterType = url.searchParams.get('type') || 'all';
  const searchQuery = url.searchParams.get('q') || '';

  try {
    // Fetch all gear articles
    let articles = await getArticles({ category: 'gear', limit: 100 });

    // Filter by subcategory (type)
    if (filterType !== 'all') {
      articles = articles.filter(a => (a.subcategory || 'guides') === filterType);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      articles = articles.filter(a =>
        a.title.toLowerCase().includes(query) ||
        (a.excerpt || '').toLowerCase().includes(query)
      );
    }

    // Get photos for all articles
    const articlePhotos = await getArticlePhotosForCategory(articles, 'gear');

    // Map to response format
    const result = articles.map(article => ({
      slug: article.slug,
      title: article.title,
      excerpt: stripMarkdown(article.excerpt || article.meta_description || ''),
      photo: articlePhotos.get(article.slug) || null,
      subcategory: article.subcategory || 'guides'
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
