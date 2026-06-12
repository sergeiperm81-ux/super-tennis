/**
 * Player racket gear data for vs/ pages affiliate monetization.
 * Amazon Associates tag: supertennis0b-20
 */

export interface PlayerGear {
  racket: string;
  brand: string;
  amazonUrl: string;
  gearPageUrl?: string;
}

const AMAZON_TAG = 'supertennis0b-20';
const amz = (query: string) =>
  `https://www.amazon.com/s?k=${encodeURIComponent(query)}&tag=${AMAZON_TAG}`;

export const playerGearMap: Record<string, PlayerGear> = {
  // ATP — Top 20
  'novak-djokovic': {
    racket: 'Head Speed Pro',
    brand: 'Head',
    amazonUrl: amz('Head Speed Pro tennis racket'),
    gearPageUrl: '/gear/best-tennis-rackets-2026/',
  },
  'rafael-nadal': {
    racket: 'Babolat Pure Aero',
    brand: 'Babolat',
    amazonUrl: amz('Babolat Pure Aero tennis racket'),
    gearPageUrl: '/gear/best-tennis-rackets-2026/',
  },
  'roger-federer': {
    racket: 'Wilson Pro Staff RF97',
    brand: 'Wilson',
    amazonUrl: amz('Wilson Pro Staff RF97 tennis racket'),
    gearPageUrl: '/gear/best-tennis-rackets-2026/',
  },
  'carlos-alcaraz': {
    racket: 'Babolat Pure Aero',
    brand: 'Babolat',
    amazonUrl: amz('Babolat Pure Aero tennis racket'),
    gearPageUrl: '/gear/best-tennis-rackets-2026/',
  },
  'jannik-sinner': {
    racket: 'Head Speed MP',
    brand: 'Head',
    amazonUrl: amz('Head Speed MP tennis racket'),
    gearPageUrl: '/gear/best-tennis-rackets-2026/',
  },
  'daniil-medvedev': {
    racket: 'Tecnifibre T-Fight 305',
    brand: 'Tecnifibre',
    amazonUrl: amz('Tecnifibre T-Fight 305 tennis racket'),
    gearPageUrl: '/gear/best-tennis-rackets-2026/',
  },
  'alexander-zverev': {
    racket: 'Head Extreme Tour',
    brand: 'Head',
    amazonUrl: amz('Head Extreme Tour tennis racket'),
    gearPageUrl: '/gear/best-tennis-rackets-2026/',
  },
  'stefanos-tsitsipas': {
    racket: 'Wilson Blade 98',
    brand: 'Wilson',
    amazonUrl: amz('Wilson Blade 98 tennis racket'),
    gearPageUrl: '/gear/best-tennis-rackets-2026/',
  },
  'andrey-rublev': {
    racket: 'Head Extreme MP',
    brand: 'Head',
    amazonUrl: amz('Head Extreme MP tennis racket'),
  },
  'casper-ruud': {
    racket: 'Babolat Pure Drive',
    brand: 'Babolat',
    amazonUrl: amz('Babolat Pure Drive tennis racket'),
  },
  'hubert-hurkacz': {
    racket: 'Wilson Blade 98',
    brand: 'Wilson',
    amazonUrl: amz('Wilson Blade 98 tennis racket'),
  },
  'taylor-fritz': {
    racket: 'Wilson Blade 98',
    brand: 'Wilson',
    amazonUrl: amz('Wilson Blade 98 tennis racket'),
  },
  'tommy-paul': {
    racket: 'Wilson Clash 100',
    brand: 'Wilson',
    amazonUrl: amz('Wilson Clash 100 tennis racket'),
  },
  'ben-shelton': {
    racket: 'Yonex VCORE 98',
    brand: 'Yonex',
    amazonUrl: amz('Yonex VCORE 98 tennis racket'),
  },
  'nick-kyrgios': {
    racket: 'Yonex VCORE 98',
    brand: 'Yonex',
    amazonUrl: amz('Yonex VCORE 98 tennis racket'),
  },
  'andy-murray': {
    racket: 'Head Radical Pro',
    brand: 'Head',
    amazonUrl: amz('Head Radical Pro tennis racket'),
  },
  'stan-wawrinka': {
    racket: 'Wilson Pro Staff',
    brand: 'Wilson',
    amazonUrl: amz('Wilson Pro Staff tennis racket'),
  },
  'marin-cilic': {
    racket: 'Wilson Blade 98',
    brand: 'Wilson',
    amazonUrl: amz('Wilson Blade 98 tennis racket'),
  },
  'grigor-dimitrov': {
    racket: 'Head Gravity Pro',
    brand: 'Head',
    amazonUrl: amz('Head Gravity Pro tennis racket'),
  },
  'pete-sampras': {
    racket: 'Wilson Pro Staff 85',
    brand: 'Wilson',
    amazonUrl: amz('Wilson Pro Staff 85 tennis racket'),
  },
  'andre-agassi': {
    racket: 'Head Radical Pro',
    brand: 'Head',
    amazonUrl: amz('Head Radical Pro tennis racket'),
  },
  'bjorn-borg': {
    racket: 'Donnay Pro One',
    brand: 'Donnay',
    amazonUrl: amz('Donnay Pro One tennis racket'),
  },
  'john-mcenroe': {
    racket: 'Dunlop Max 200G',
    brand: 'Dunlop',
    amazonUrl: amz('Dunlop Max 200G tennis racket'),
  },
  'jimmy-connors': {
    racket: 'Wilson T2000',
    brand: 'Wilson',
    amazonUrl: amz('Wilson T2000 tennis racket'),
  },
  'ivan-lendl': {
    racket: 'Adidas GTX Pro',
    brand: 'Adidas',
    amazonUrl: amz('Head Pro tennis racket'),
  },

  // WTA — Top 20
  'iga-swiatek': {
    racket: 'Wilson Blade SW104',
    brand: 'Wilson',
    amazonUrl: amz('Wilson Blade SW104 tennis racket'),
    gearPageUrl: '/gear/best-tennis-rackets-women-2026/',
  },
  'aryna-sabalenka': {
    racket: 'Wilson Blade 104',
    brand: 'Wilson',
    amazonUrl: amz('Wilson Blade 104 tennis racket'),
    gearPageUrl: '/gear/best-tennis-rackets-women-2026/',
  },
  'coco-gauff': {
    racket: 'Head Speed MP',
    brand: 'Head',
    amazonUrl: amz('Head Speed MP tennis racket'),
    gearPageUrl: '/gear/best-tennis-rackets-women-2026/',
  },
  'elena-rybakina': {
    racket: 'Head Speed MP',
    brand: 'Head',
    amazonUrl: amz('Head Speed MP tennis racket'),
    gearPageUrl: '/gear/best-tennis-rackets-women-2026/',
  },
  'jessica-pegula': {
    racket: 'Head Gravity MP',
    brand: 'Head',
    amazonUrl: amz('Head Gravity MP tennis racket'),
  },
  'qinwen-zheng': {
    racket: 'Head Speed Pro',
    brand: 'Head',
    amazonUrl: amz('Head Speed Pro tennis racket'),
  },
  'karolina-muchova': {
    racket: 'Wilson Clash 100',
    brand: 'Wilson',
    amazonUrl: amz('Wilson Clash 100 tennis racket'),
  },
  'mirra-andreeva': {
    racket: 'Babolat Pure Drive',
    brand: 'Babolat',
    amazonUrl: amz('Babolat Pure Drive tennis racket'),
  },
  'victoria-azarenka': {
    racket: 'Yonex VCORE Pro 97',
    brand: 'Yonex',
    amazonUrl: amz('Yonex VCORE Pro 97 tennis racket'),
  },
  'serena-williams': {
    racket: 'Wilson Blade SW 104',
    brand: 'Wilson',
    amazonUrl: amz('Wilson Blade SW 104 tennis racket'),
    gearPageUrl: '/gear/best-tennis-rackets-women-2026/',
  },
  'venus-williams': {
    racket: 'Wilson Blade 104',
    brand: 'Wilson',
    amazonUrl: amz('Wilson Blade 104 tennis racket'),
  },
  'martina-navratilova': {
    racket: 'Yonex VCORE Pro',
    brand: 'Yonex',
    amazonUrl: amz('Yonex VCORE Pro tennis racket'),
  },
  'steffi-graf': {
    racket: 'Head Radical Pro',
    brand: 'Head',
    amazonUrl: amz('Head Radical Pro tennis racket'),
  },
  'chris-evert': {
    racket: 'Wilson Blade 98',
    brand: 'Wilson',
    amazonUrl: amz('Wilson Blade 98 tennis racket'),
  },
  'monica-seles': {
    racket: 'Yonex VCORE 98',
    brand: 'Yonex',
    amazonUrl: amz('Yonex VCORE 98 tennis racket'),
  },
  'maria-sharapova': {
    racket: 'Head Instinct MP',
    brand: 'Head',
    amazonUrl: amz('Head Instinct MP tennis racket'),
  },
  'kim-clijsters': {
    racket: 'Babolat Pure Drive',
    brand: 'Babolat',
    amazonUrl: amz('Babolat Pure Drive tennis racket'),
  },
  'justine-henin': {
    racket: 'Wilson Pro Staff',
    brand: 'Wilson',
    amazonUrl: amz('Wilson Pro Staff tennis racket'),
  },

  // ── Added 2026-06-12 (monetization audit): current hot names from GA4
  // top pages + RG 2026 coverage. Only players with publicly documented
  // racket sponsorships — uncertain ones (Mensik, Shnaider, Draper,
  // de Minaur) deliberately left out rather than guessed.
  'holger-rune': {
    racket: 'Babolat Pure Aero',
    brand: 'Babolat',
    amazonUrl: amz('Babolat Pure Aero tennis racket'),
    gearPageUrl: '/gear/best-tennis-rackets-2026/',
  },
  'joao-fonseca': {
    racket: 'Yonex Ezone 98',
    brand: 'Yonex',
    amazonUrl: amz('Yonex Ezone 98 tennis racket'),
    gearPageUrl: '/gear/best-tennis-rackets-2026/',
  },
  'lorenzo-musetti': {
    racket: 'Head Extreme Tour',
    brand: 'Head',
    amazonUrl: amz('Head Extreme Tour tennis racket'),
    gearPageUrl: '/gear/best-tennis-rackets-2026/',
  },
  'frances-tiafoe': {
    racket: 'Yonex Ezone 98',
    brand: 'Yonex',
    amazonUrl: amz('Yonex Ezone 98 tennis racket'),
    gearPageUrl: '/gear/best-tennis-rackets-2026/',
  },
  'naomi-osaka': {
    racket: 'Yonex Ezone 98',
    brand: 'Yonex',
    amazonUrl: amz('Yonex Ezone 98 tennis racket'),
    gearPageUrl: '/gear/best-tennis-rackets-2026/',
  },
  'emma-raducanu': {
    racket: 'Wilson Blade 98',
    brand: 'Wilson',
    amazonUrl: amz('Wilson Blade 98 tennis racket'),
    gearPageUrl: '/gear/best-tennis-rackets-2026/',
  },
  'madison-keys': {
    racket: 'Yonex Ezone 100',
    brand: 'Yonex',
    amazonUrl: amz('Yonex Ezone 100 tennis racket'),
    gearPageUrl: '/gear/best-tennis-rackets-2026/',
  },
  'marta-kostyuk': {
    racket: 'Wilson Blade 98',
    brand: 'Wilson',
    amazonUrl: amz('Wilson Blade 98 tennis racket'),
    gearPageUrl: '/gear/best-tennis-rackets-2026/',
  },
  'jasmine-paolini': {
    racket: 'Wilson Blade 98',
    brand: 'Wilson',
    amazonUrl: amz('Wilson Blade 98 tennis racket'),
    gearPageUrl: '/gear/best-tennis-rackets-2026/',
  },
};

/**
 * Get gear for both players in a vs/ slug.
 * Returns [player1Gear, player2Gear] — either may be null if not in map.
 */
export function getVsGear(p1Slug: string, p2Slug: string): [PlayerGear | null, PlayerGear | null] {
  return [
    playerGearMap[p1Slug] || null,
    playerGearMap[p2Slug] || null,
  ];
}

/**
 * Find gear for the most prominent mapped player mentioned in a text
 * (typically an article title). Matches last names with word boundaries;
 * when several players appear ("Sinner beats Djokovic"), the EARLIEST
 * mention wins — headline subject first.
 *
 * Used by the lifestyle "Gear from this story" block (2026-06-12
 * monetization audit: 101 of 109 lifestyle articles had zero affiliate
 * links while being the site's main content pipeline).
 */
export function findGearForText(
  text: string,
): { slug: string; name: string; gear: PlayerGear } | null {
  if (!text) return null;
  let best: { idx: number; slug: string; name: string; gear: PlayerGear } | null = null;

  for (const [slug, gear] of Object.entries(playerGearMap)) {
    const parts = slug.split('-');
    const lastName = parts[parts.length - 1];
    // Skip too-short surnames to avoid false positives inside other words
    if (lastName.length < 4) continue;

    // NB: string-concat, not a template literal — '\b' inside a template
    // literal is the backspace char, which silently breaks the regex.
    const re = new RegExp('\\b' + lastName + '\\b', 'i');
    const m = re.exec(text);
    if (m && (best === null || m.index < best.idx)) {
      const name = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
      best = { idx: m.index, slug, name, gear };
    }
  }

  return best ? { slug: best.slug, name: best.name, gear: best.gear } : null;
}

/**
 * Two-tier player detection for article monetization:
 *   1. TITLE match (via findGearForText) — headline subject, strongest
 *      relevance signal.
 *   2. BODY match — the player most mentioned in the text, requiring at
 *      least 2 word-boundary mentions so a passing name-drop doesn't
 *      trigger a gear card. Ties break toward the earliest first mention.
 *
 * Returns null when no mapped player clears either tier — callers should
 * then show a generic /gear/ CTA instead of forcing an irrelevant
 * product link (relevance discipline > raw link count).
 */
export function findGearForArticle(
  title: string,
  body: string,
): { slug: string; name: string; gear: PlayerGear; matchedIn: 'title' | 'body' } | null {
  const titleHit = findGearForText(title || '');
  if (titleHit) return { ...titleHit, matchedIn: 'title' };

  if (!body) return null;
  let best: { count: number; firstIdx: number; slug: string; name: string; gear: PlayerGear } | null = null;

  for (const [slug, gear] of Object.entries(playerGearMap)) {
    const parts = slug.split('-');
    const lastName = parts[parts.length - 1];
    if (lastName.length < 4) continue;

    // Count all word-boundary mentions (see backspace warning above).
    const re = new RegExp('\\b' + lastName + '\\b', 'gi');
    const matches = body.match(re);
    if (!matches || matches.length < 2) continue;

    const firstIdx = body.search(new RegExp('\\b' + lastName + '\\b', 'i'));
    if (
      best === null ||
      matches.length > best.count ||
      (matches.length === best.count && firstIdx < best.firstIdx)
    ) {
      const name = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
      best = { count: matches.length, firstIdx, slug, name, gear };
    }
  }

  return best
    ? { slug: best.slug, name: best.name, gear: best.gear, matchedIn: 'body' }
    : null;
}
