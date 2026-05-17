/**
 * HowTo Schema generator — Codex SEO audit 2026-05-17.
 *
 * Given a parsed HTML body of an article whose slug starts with "how-to-",
 * extracts the H2 sections as HowToStep entries and returns a Schema.org
 * HowTo JSON-LD object.
 *
 * Returns null if the slug is not a how-to OR if no usable H2 sections found.
 *
 * Step extraction:
 *   - Each <h2> in the body becomes a HowToStep.name
 *   - The text content between that <h2> and the next <h2> (capped at 400 chars)
 *     becomes the HowToStep.text
 *   - Stripped HTML, trimmed whitespace, no markdown leftovers
 *
 * Compatibility: the HowTo type stacks with the Article type for the same
 * page — Google docs explicitly support multiple structured-data types per
 * URL, so we don't need to remove the Article schema.
 */

interface HowToStep {
  '@type': 'HowToStep';
  position: number;
  name: string;
  text: string;
  url?: string;
}

interface HowToSchema {
  '@context': 'https://schema.org';
  '@type': 'HowTo';
  name: string;
  description: string;
  totalTime?: string;
  estimatedCost?: { '@type': 'MonetaryAmount'; currency: string; value: string };
  step: HowToStep[];
}

/**
 * Strip HTML tags and decode common entities. Returns clean text.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strip common markdown syntax from text. Used for descriptions that may
 * have been pulled from a markdown excerpt rather than rendered HTML.
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')         // headings
    .replace(/\*\*([^*]+)\*\*/g, '$1')   // bold
    .replace(/\*([^*]+)\*/g, '$1')       // italic
    .replace(/`([^`]+)`/g, '$1')         // inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')    // images
    .replace(/^\s*[-*+]\s+/gm, '')       // list items
    .replace(/^\s*\d+\.\s+/gm, '')       // ordered list items
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detect if this slug is a how-to candidate.
 * Currently: starts with "how-to-" (covers lifestyle how-to articles).
 */
export function isHowToSlug(slug: string): boolean {
  return typeof slug === 'string' && slug.toLowerCase().startsWith('how-to-');
}

/**
 * Extract H2 sections from rendered HTML body and return them as steps.
 * Skips sections that look like navigation/related-articles boilerplate.
 */
function extractStepsFromHtml(bodyHtml: string): { name: string; text: string }[] {
  if (!bodyHtml) return [];

  // Match H2 tags with their content + everything until the next H2 (or end).
  // Use [\s\S] for cross-line matching since headers can span lines.
  const h2Regex = /<h2[^>]*>([\s\S]*?)<\/h2>([\s\S]*?)(?=<h2[^>]*>|$)/gi;
  const steps: { name: string; text: string }[] = [];

  let match: RegExpExecArray | null;
  while ((match = h2Regex.exec(bodyHtml)) !== null) {
    const rawHeadingHtml = match[1] || '';
    const rawBodyHtml = match[2] || '';

    const name = stripHtml(rawHeadingHtml);
    if (!name) continue;

    // Skip boilerplate sections that aren't actually steps.
    const lowerName = name.toLowerCase();
    if (
      lowerName === 'contents' ||
      lowerName.startsWith('you might also like') ||
      lowerName.startsWith('related ') ||
      lowerName.startsWith('frequently asked') ||
      lowerName === 'faq' ||
      lowerName.startsWith('ready to') // CTA sections like "Ready to Get Tennis-Fit?"
    ) {
      continue;
    }

    const text = stripHtml(rawBodyHtml).slice(0, 400).trim();
    if (text.length < 30) continue; // Skip empty/stub sections

    steps.push({ name, text });
  }

  return steps;
}

/**
 * Build a Schema.org HowTo JSON-LD object for a how-to article.
 * Returns null if the article isn't a how-to OR has no usable steps.
 *
 * @param slug      article slug (used for the URL field)
 * @param title     article H1 title
 * @param description meta description / excerpt
 * @param bodyHtml  rendered HTML body
 * @param category  'lifestyle' | 'gear' | 'records' etc — used to build canonical URL
 */
export function buildHowToSchema(
  slug: string,
  title: string,
  description: string,
  bodyHtml: string,
  category: string,
): HowToSchema | null {
  if (!isHowToSlug(slug)) return null;

  const rawSteps = extractStepsFromHtml(bodyHtml);
  if (rawSteps.length < 2) return null; // Need at least 2 steps to be a meaningful HowTo

  const articleUrl = `https://super.tennis/${category}/${slug}/`;
  const step: HowToStep[] = rawSteps.map((s, i) => ({
    '@type': 'HowToStep',
    position: i + 1,
    name: s.name,
    text: s.text,
    url: `${articleUrl}#step-${i + 1}`,
  }));

  // Clean description: strip markdown leftovers (in case excerpt was used as fallback)
  // and cap to 200 chars to stay within Google's recommended length.
  const cleanDescription = stripMarkdown(description || title).slice(0, 200).trim();

  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: title,
    description: cleanDescription || title,
    step,
  };
}
