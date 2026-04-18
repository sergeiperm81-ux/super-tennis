/**
 * Markdown for Agents — content negotiation on Cloudflare Pages.
 *
 * When a client sends `Accept: text/markdown` (or `?format=md` query),
 * we serve the same page as Markdown instead of HTML. Humans / browsers
 * sending the usual `Accept: text/html, …` path is untouched — Astro's
 * static HTML files are served as-is via env.ASSETS.
 *
 * This is an agent-visibility improvement: AI crawlers, OpenAI Atlas,
 * Claude, Perplexity and similar agents get clean structured content
 * without ad wrappers / nav chrome / scripts → more accurate citations.
 *
 * Implementation notes:
 *  - Catch-all path `[[path]]` matches every route.
 *  - We call env.ASSETS.fetch() to get the static HTML from Pages.
 *  - The HTML → Markdown conversion is a focused regex pipeline (no
 *    npm deps, no DOM parser — Workers runtime is constrained).
 *  - We only attempt conversion when the response is text/html AND
 *    the status is 2xx. Anything else is passed through unchanged.
 *  - `Vary: Accept` ensures Cloudflare's CDN caches MD and HTML as
 *    separate entries.
 *
 * Precedent: Cloudflare's own "Markdown for Agents" feature in Pages
 * (beta). We roll our own so we control the conversion rules and don't
 * wait for account-level enablement.
 */

// Minimal type shims — Cloudflare's @cloudflare/workers-types is not
// installed (unnecessary dep for a single function) and Astro's build
// shouldn't type-check this file either way. Runtime types come from
// the Workers platform itself.
interface PagesContext {
  request: Request;
  next: () => Promise<Response>;
  env: { ASSETS: { fetch: (req: Request) => Promise<Response> } };
}

export const onRequest = async (context: PagesContext): Promise<Response> => {
  const { request, next } = context;
  const url = new URL(request.url);

  const accept = (request.headers.get('Accept') || '').toLowerCase();
  const queryFormat = (url.searchParams.get('format') || '').toLowerCase();
  const wantsMarkdown =
    queryFormat === 'md' ||
    queryFormat === 'markdown' ||
    accept.includes('text/markdown') ||
    accept.includes('text/x-markdown');

  // Default: let Pages serve the static HTML (or other asset) unchanged.
  if (!wantsMarkdown) {
    return next();
  }

  // Fetch the same URL from the static-asset origin. `next()` returns
  // the same thing but also triggers middleware — we don't need that.
  const res = await context.env.ASSETS.fetch(request);
  if (!res.ok) return res;

  const ctype = (res.headers.get('Content-Type') || '').toLowerCase();
  // Only convert HTML; images, JSON, XML, etc. pass through.
  if (!ctype.includes('text/html')) return res;

  const html = await res.text();
  const md = htmlToMarkdown(html, url);

  return new Response(md, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
      'Vary': 'Accept',
      'X-Content-Type-Options': 'nosniff',
      'Access-Control-Allow-Origin': '*',
    },
  });
};

// ============================================================
// HTML → Markdown converter (regex-based, no DOM)
// ============================================================

function htmlToMarkdown(html: string, url: URL): string {
  // 1. Meta extraction before we destroy <head>.
  const title = firstMatch(html, /<title[^>]*>([^<]+)<\/title>/i);
  const desc = firstMatch(
    html,
    /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i
  );
  const ogType = firstMatch(
    html,
    /<meta\s+property=["']og:type["']\s+content=["']([^"']+)["']/i
  );
  const ogPubDate = firstMatch(
    html,
    /<meta\s+property=["']article:published_time["']\s+content=["']([^"']+)["']/i
  );

  // 2. Isolate the content region. Prefer <main>, then <article>, then <body>.
  const region =
    firstMatch(html, /<main[^>]*>([\s\S]*?)<\/main>/i) ??
    firstMatch(html, /<article[^>]*>([\s\S]*?)<\/article>/i) ??
    firstMatch(html, /<body[^>]*>([\s\S]*?)<\/body>/i) ??
    html;

  // 3. Remove noise that pollutes agent output.
  const cleaned = stripNoise(region);

  // 4. Run the converter.
  const body = convert(cleaned);

  // 5. Assemble frontmatter-style header + body.
  const header: string[] = [];
  if (title) header.push(`# ${decode(title.trim())}`);
  if (desc) header.push(`> ${decode(desc.trim())}`);
  const metaLine: string[] = [`**Source:** ${url.href}`];
  if (ogType) metaLine.push(`**Type:** ${ogType}`);
  if (ogPubDate) metaLine.push(`**Published:** ${ogPubDate}`);
  header.push(metaLine.join('  ·  '));

  return header.filter(Boolean).join('\n\n') + '\n\n' + body.trim() + '\n';
}

function firstMatch(src: string, re: RegExp): string | null {
  const m = src.match(re);
  return m ? m[1] : null;
}

/** Remove tags that never add agent value. */
function stripNoise(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, '')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside\b[^>]*>[\s\S]*?<\/aside>/gi, '')
    .replace(/<form\b[^>]*>[\s\S]*?<\/form>/gi, '');
}

/** Regex-pipeline HTML → Markdown. Good enough for content pages. */
function convert(html: string): string {
  return (
    html
      // Headings (close first so H2 doesn't leak into following H3 content)
      .replace(/<h([1-6])[^>]*>\s*([\s\S]*?)\s*<\/h\1>/gi, (_, level, inner) => {
        const text = stripInline(inner).trim();
        if (!text) return '';
        return `\n\n${'#'.repeat(+level)} ${text}\n\n`;
      })
      // Horizontal rule
      .replace(/<hr\b[^>]*>/gi, '\n\n---\n\n')
      // Line breaks
      .replace(/<br\s*\/?>/gi, '  \n')
      // Blockquotes
      .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, inner) =>
        '\n\n' +
        stripInline(inner)
          .split('\n')
          .map((line) => '> ' + line.trim())
          .join('\n') +
        '\n\n'
      )
      // Pre+code blocks
      .replace(/<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi, (_, code) =>
        '\n\n```\n' + decode(code).trimEnd() + '\n```\n\n'
      )
      // Lists (simple flat)
      .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, inner) =>
        '\n\n' +
        inner
          .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m: string, li: string) => `- ${stripInline(li).trim()}\n`)
          .trim() +
        '\n\n'
      )
      .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, inner) => {
        let i = 1;
        return (
          '\n\n' +
          inner
            .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m: string, li: string) => `${i++}. ${stripInline(li).trim()}\n`)
            .trim() +
          '\n\n'
        );
      })
      // Paragraphs
      .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, inner) => {
        const text = stripInline(inner).trim();
        return text ? `\n\n${text}\n\n` : '';
      })
      // Images (alt before src)
      .replace(/<img[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']+)["'][^>]*>/gi, '![$1]($2)')
      .replace(/<img[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*>/gi, '![$2]($1)')
      .replace(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi, '![]($1)')
      // Anything else: strip the remaining tags then run inline normalisation
      .replace(/<(div|section|article|header|main|span|figure|figcaption)[^>]*>/gi, '')
      .replace(/<\/(div|section|article|header|main|span|figure|figcaption)>/gi, '')
      // Inline formatting — keep it simple
      .replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**')
      .replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*')
      .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`')
      // Links
      .replace(
        /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
        (_, href, text) => {
          const clean = stripInline(text).trim();
          return clean ? `[${clean}](${href})` : '';
        }
      )
      // Drop any leftover tags
      .replace(/<[^>]+>/g, '')
      // Decode entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–')
      .replace(/&rsquo;/g, '\u2019')
      .replace(/&lsquo;/g, '\u2018')
      // Whitespace cleanup
      .replace(/[ \t]+/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
  );
}

/** Strip tags but keep text — used inside heading/link/list content. */
function stripInline(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ');
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}
