import type { APIRoute } from 'astro';

const SITE_URL = 'https://super.tennis';
const FEED_TITLE = 'Super Tennis — Tennis News & Entertainment';
const FEED_DESCRIPTION = 'Daily tennis news, player stories, drama, fashion, and lifestyle from the world of professional tennis.';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

export const GET: APIRoute = async () => {
  let items: any[] = [];

  try {
    const res = await fetch('https://supertennis-cron.sfedoroff.workers.dev/api/news');
    if (res.ok) {
      const data = await res.json();
      items = (Array.isArray(data) ? data : [])
        .filter((n: any) => n.body && n.body.length > 50)
        .slice(0, 30);
    }
  } catch {
    // Fallback: empty feed
  }

  const rssItems = items.map((item: any) => {
    const title = escapeXml(stripHtml(item.title || ''));
    const link = `${SITE_URL}/news/${item.slug}/`;
    const description = escapeXml(stripHtml(item.summary || item.body?.substring(0, 200) || ''));
    const pubDate = new Date(item.published_at || Date.now()).toUTCString();
    const category = escapeXml(item.category || 'news');

    return `    <item>
      <title>${title}</title>
      <link>${link}</link>
      <description>${description}</description>
      <pubDate>${pubDate}</pubDate>
      <category>${category}</category>
      <guid isPermaLink="true">${link}</guid>
    </item>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(FEED_TITLE)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(FEED_DESCRIPTION)}</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${SITE_URL}/favicon.svg</url>
      <title>${escapeXml(FEED_TITLE)}</title>
      <link>${SITE_URL}</link>
    </image>
${rssItems}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
