/**
 * Auto-interlinking utility for article HTML content.
 * Replaces player names, tournament names, and other entities
 * with internal links at build time.
 */
import { supabase } from './supabase';

interface EntityLink {
  name: string;
  url: string;
  pattern: RegExp;
}

// Cache to avoid re-fetching during the same build
let _playerLinks: EntityLink[] | null = null;
let _articleLinks: EntityLink[] | null = null;

/**
 * Fetch top players and build name→URL mappings.
 * Only fetches once per build (cached).
 */
async function getPlayerLinks(): Promise<EntityLink[]> {
  if (_playerLinks) return _playerLinks;

  try {
    const { data } = await supabase
      .from('players')
      .select('first_name, last_name, slug')
      .gt('career_titles', 0)
      .order('career_titles', { ascending: false })
      .limit(200);

    if (!data) {
      _playerLinks = [];
      return _playerLinks;
    }

    _playerLinks = data
      .filter(p => p.first_name && p.last_name && p.slug)
      .map(p => {
        const fullName = `${p.first_name} ${p.last_name}`;
        return {
          name: fullName,
          url: `/players/${p.slug}/`,
          // Match full name not inside an existing tag or link
          pattern: new RegExp(`\\b${escapeRegex(fullName)}\\b`, 'g'),
        };
      });

    // Sort by name length descending so longer names match first
    // (e.g., "Juan Martin del Potro" before "Martin")
    _playerLinks.sort((a, b) => b.name.length - a.name.length);

    return _playerLinks;
  } catch {
    _playerLinks = [];
    return _playerLinks;
  }
}

/**
 * Fetch articles and build title→URL mappings for cross-linking.
 */
async function getArticleLinks(): Promise<EntityLink[]> {
  if (_articleLinks) return _articleLinks;

  // Static tournament links
  const staticLinks: EntityLink[] = [
    // Grand Slams
    { name: 'Australian Open', url: '/tournaments/australian-open-guide/', pattern: /\bAustralian Open\b/g },
    { name: 'Roland Garros', url: '/tournaments/roland-garros-french-open-guide/', pattern: /\bRoland Garros\b/g },
    { name: 'French Open', url: '/tournaments/roland-garros-french-open-guide/', pattern: /\bFrench Open\b/g },
    { name: 'Wimbledon', url: '/tournaments/wimbledon-guide/', pattern: /\bWimbledon\b/g },
    { name: 'US Open', url: '/tournaments/us-open-guide/', pattern: /\bUS Open\b/g },
    // Masters & year-end
    { name: 'ATP Finals', url: '/tournaments/atp-finals-guide/', pattern: /\bATP Finals\b/g },
    { name: 'WTA Finals', url: '/tournaments/wta-finals-guide/', pattern: /\bWTA Finals\b/g },
    { name: 'Indian Wells', url: '/tournaments/indian-wells-guide/', pattern: /\bIndian Wells\b/g },
    { name: 'Miami Open', url: '/tournaments/miami-open-guide/', pattern: /\bMiami Open\b/g },
    { name: 'Monte Carlo', url: '/tournaments/monte-carlo-masters-guide/', pattern: /\bMonte[- ]Carlo\b/g },
    { name: 'Shanghai Masters', url: '/tournaments/shanghai-masters-guide/', pattern: /\bShanghai (?:Masters|Open)\b/g },
    // Team events
    { name: 'Davis Cup', url: '/tournaments/davis-cup-guide/', pattern: /\bDavis Cup\b/g },
    { name: 'Laver Cup', url: '/tournaments/laver-cup-guide/', pattern: /\bLaver Cup\b/g },
    // Section hub links
    { name: 'ATP rankings', url: '/rankings/', pattern: /\bATP rankings\b/g },
    { name: 'WTA rankings', url: '/rankings/', pattern: /\bWTA rankings\b/g },
    { name: 'tennis gear', url: '/gear/', pattern: /\btennis gear\b/gi },
    { name: 'tennis racket', url: '/gear/best-tennis-rackets-2026/', pattern: /\btennis racket\b/gi },
    { name: 'tennis rackets', url: '/gear/best-tennis-rackets-2026/', pattern: /\btennis rackets\b/gi },
    { name: 'tennis shoes', url: '/gear/best-tennis-shoes-2026/', pattern: /\btennis shoes\b/gi },
    { name: 'tennis strings', url: '/gear/best-tennis-strings-guide/', pattern: /\btennis strings?\b/gi },
    { name: 'tennis bags', url: '/gear/best-tennis-bags-guide/', pattern: /\btennis bags?\b/gi },
    { name: 'tennis balls', url: '/gear/best-tennis-balls-2026/', pattern: /\btennis balls?\b/gi },
    // Records section cross-links
    { name: 'Grand Slam records', url: '/records/most-grand-slam-titles/', pattern: /\bGrand Slam records?\b/gi },
    { name: 'most Grand Slam titles', url: '/records/most-grand-slam-titles/', pattern: /\bmost Grand Slam titles\b/gi },
    { name: 'fastest serve', url: '/records/fastest-serve-tennis/', pattern: /\bfastest serve\b/gi },
    { name: 'world No. 1', url: '/records/most-weeks-number-one/', pattern: /\bworld No\.?\s*1\b/gi },
    { name: 'GOAT debate', url: '/records/tennis-goat-debate/', pattern: /\bGOAT debate\b/gi },
    { name: 'career titles', url: '/records/most-career-titles-tennis/', pattern: /\bmost career titles\b/gi },
    // Lifestyle hub
    { name: 'tennis fitness', url: '/lifestyle/', pattern: /\btennis fitness\b/gi },
  ];

  // Top H2H rivalry links from vs/ section
  const vsLinks: EntityLink[] = [
    // Big Three rivalries
    { name: 'Federer vs Nadal', url: '/vs/federer-vs-nadal/', pattern: /\bFederer vs\.? Nadal\b/gi },
    { name: 'Djokovic vs Nadal', url: '/vs/djokovic-vs-nadal/', pattern: /\bDjokovic vs\.? Nadal\b/gi },
    { name: 'Djokovic vs Federer', url: '/vs/djokovic-vs-federer/', pattern: /\bDjokovic vs\.? Federer\b/gi },
    // Next gen
    { name: 'Sinner vs Alcaraz', url: '/vs/sinner-vs-alcaraz/', pattern: /\bSinner vs\.? Alcaraz\b/gi },
    { name: 'Alcaraz vs Sinner', url: '/vs/sinner-vs-alcaraz/', pattern: /\bAlcaraz vs\.? Sinner\b/gi },
    { name: 'Djokovic vs Alcaraz', url: '/vs/djokovic-vs-alcaraz/', pattern: /\bDjokovic vs\.? Alcaraz\b/gi },
    { name: 'Djokovic vs Sinner', url: '/vs/djokovic-vs-sinner/', pattern: /\bDjokovic vs\.? Sinner\b/gi },
    { name: 'Sinner vs Medvedev', url: '/vs/sinner-vs-medvedev/', pattern: /\bSinner vs\.? Medvedev\b/gi },
    { name: 'Medvedev vs Sinner', url: '/vs/sinner-vs-medvedev/', pattern: /\bMedvedev vs\.? Sinner\b/gi },
    { name: 'Zverev vs Alcaraz', url: '/vs/zverev-vs-alcaraz/', pattern: /\bZverev vs\.? Alcaraz\b/gi },
    // WTA rivalries
    { name: 'Swiatek vs Sabalenka', url: '/vs/swiatek-vs-sabalenka/', pattern: /\bSwi[aą]tek vs\.? Sabalenka\b/gi },
    { name: 'Sabalenka vs Swiatek', url: '/vs/swiatek-vs-sabalenka/', pattern: /\bSabalenka vs\.? Swi[aą]tek\b/gi },
    { name: 'Gauff vs Swiatek', url: '/vs/gauff-vs-swiatek/', pattern: /\bGauff vs\.? Swi[aą]tek\b/gi },
    { name: 'Sabalenka vs Rybakina', url: '/vs/sabalenka-vs-rybakina/', pattern: /\bSabalenka vs\.? Rybakina\b/gi },
    { name: 'Rybakina vs Sabalenka', url: '/vs/sabalenka-vs-rybakina/', pattern: /\bRybakina vs\.? Sabalenka\b/gi },
    // Legends
    { name: 'Sampras vs Agassi', url: '/vs/sampras-vs-agassi/', pattern: /\bSampras vs\.? Agassi\b/gi },
    { name: 'Agassi vs Sampras', url: '/vs/sampras-vs-agassi/', pattern: /\bAgassi vs\.? Sampras\b/gi },
    { name: 'Evert vs Navratilova', url: '/vs/evert-vs-navratilova/', pattern: /\bEvert vs\.? Navratilova\b/gi },
    { name: 'Borg vs McEnroe', url: '/vs/borg-vs-mcenroe/', pattern: /\bBorg vs\.? McEnroe\b/gi },
    { name: 'Graf vs Navratilova', url: '/vs/graf-vs-navratilova/', pattern: /\bGraf vs\.? Navratilova\b/gi },
    { name: 'Nadal vs Federer', url: '/vs/federer-vs-nadal/', pattern: /\bNadal vs\.? Federer\b/gi },
    { name: 'Williams vs Williams', url: '/vs/williams-vs-williams/', pattern: /\bWilliams vs\.? Williams\b/gi },
  ];

  _articleLinks = [...staticLinks, ...vsLinks];
  return _articleLinks;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Add internal links to article HTML content.
 * - Links player names to their profile pages
 * - Links tournament names to tournament guides
 * - Only links the first occurrence of each entity
 * - Avoids linking inside existing <a> tags, headings, or code blocks
 *
 * @param html - The rendered HTML string
 * @param currentUrl - The current page URL to avoid self-links
 * @param maxLinks - Maximum number of links to add (default: 20)
 */
export async function addInterlinks(
  html: string,
  currentUrl: string = '',
  maxLinks: number = 20
): Promise<string> {
  const [playerLinks, articleLinks] = await Promise.all([
    getPlayerLinks(),
    getArticleLinks(),
  ]);

  const allLinks = [...articleLinks, ...playerLinks];
  let linksAdded = 0;
  const linked = new Set<string>(); // Track which entities we've already linked

  for (const entity of allLinks) {
    if (linksAdded >= maxLinks) break;
    if (linked.has(entity.name)) continue;
    if (entity.url === currentUrl) continue; // Don't self-link

    // Find the first occurrence in text content (not inside tags)
    const result = linkFirstOccurrence(html, entity.name, entity.url, entity.pattern);
    if (result !== html) {
      html = result;
      linked.add(entity.name);
      linksAdded++;
    }
  }

  return html;
}

/**
 * Replace only the first text occurrence of a pattern with a link,
 * avoiding existing tags, links, headings, and code blocks.
 */
function linkFirstOccurrence(
  html: string,
  name: string,
  url: string,
  pattern: RegExp
): string {
  // Split HTML into tags and text segments
  // We only want to replace in text segments, not inside tags or already-linked content
  const tagRegex = /<[^>]+>/g;
  const parts: { text: string; isTag: boolean }[] = [];
  let lastIndex = 0;
  let match;

  while ((match = tagRegex.exec(html)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: html.slice(lastIndex, match.index), isTag: false });
    }
    parts.push({ text: match[0], isTag: true });
    lastIndex = tagRegex.lastIndex;
  }
  if (lastIndex < html.length) {
    parts.push({ text: html.slice(lastIndex), isTag: false });
  }

  // Track depth of elements we should skip (a, h1-h6, code, pre)
  let skipDepth = 0;
  let replaced = false;

  const result = parts.map(part => {
    if (part.isTag) {
      const tag = part.text.toLowerCase();
      if (/<(a|h[1-6]|code|pre|script|style)\b/.test(tag) && !tag.startsWith('</')) {
        skipDepth++;
      } else if (/<\/(a|h[1-6]|code|pre|script|style)>/.test(tag)) {
        skipDepth = Math.max(0, skipDepth - 1);
      }
      return part.text;
    }

    // Text node - only replace if not inside a skip element
    if (replaced || skipDepth > 0) return part.text;

    // Reset pattern lastIndex
    pattern.lastIndex = 0;
    const m = pattern.exec(part.text);
    if (m) {
      replaced = true;
      const before = part.text.slice(0, m.index);
      const after = part.text.slice(m.index + m[0].length);
      return `${before}<a href="${url}">${m[0]}</a>${after}`;
    }
    return part.text;
  });

  return result.join('');
}
