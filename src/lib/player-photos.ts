import { supabase } from './supabase';

// Mapping: VS article slug → [player1_slug, player2_slug]
export const vsPlayerSlugs: Record<string, [string, string]> = {
  // Current Era
  'alcaraz-vs-sinner': ['carlos-alcaraz', 'jannik-sinner'],
  'djokovic-vs-alcaraz': ['novak-djokovic', 'carlos-alcaraz'],
  'swiatek-vs-sabalenka': ['iga-swiatek', 'aryna-sabalenka'],
  'medvedev-vs-sinner': ['daniil-medvedev', 'jannik-sinner'],
  'zverev-vs-alcaraz': ['alexander-zverev', 'carlos-alcaraz'],
  'gauff-vs-swiatek': ['coco-gauff', 'iga-swiatek'],
  'kyrgios-vs-djokovic': ['nick-kyrgios', 'novak-djokovic'],
  // Big Three Era
  'djokovic-vs-nadal': ['novak-djokovic', 'rafael-nadal'],
  'federer-vs-nadal': ['roger-federer', 'rafael-nadal'],
  'djokovic-vs-federer': ['novak-djokovic', 'roger-federer'],
  'djokovic-vs-murray': ['novak-djokovic', 'andy-murray'],
  'nadal-vs-federer-clay': ['rafael-nadal', 'roger-federer'],
  'federer-vs-djokovic-wimbledon': ['roger-federer', 'novak-djokovic'],
  'nadal-vs-djokovic-french-open': ['rafael-nadal', 'novak-djokovic'],
  'big-three-comparison': ['novak-djokovic', 'rafael-nadal'],
  'federer-vs-murray': ['roger-federer', 'andy-murray'],
  'tsitsipas-vs-medvedev': ['stefanos-tsitsipas', 'daniil-medvedev'],
  // Women's Tennis
  'evert-vs-navratilova': ['chris-evert', 'martina-navratilova'],
  'williams-vs-williams': ['serena-williams', 'venus-williams'],
  'graf-vs-seles': ['steffi-graf', 'monica-seles'],
  'sharapova-vs-williams': ['maria-sharapova', 'serena-williams'],
  'henin-vs-clijsters': ['justine-henin', 'kim-clijsters'],
  // Classic Era
  'sampras-vs-agassi': ['pete-sampras', 'andre-agassi'],
  'borg-vs-mcenroe': ['bjorn-borg', 'john-mcenroe'],
  'connors-vs-lendl': ['jimmy-connors', 'ivan-lendl'],
};

// Cache for player photos (grows across build — never evicted)
const photoCache = new Map<string, string | null>();

// Batch fetch player photos from Supabase
export async function getPlayerPhotosBatch(slugs: string[]): Promise<Map<string, string | null>> {
  // Find slugs not yet in cache
  const needed = [...new Set(slugs)].filter(s => !photoCache.has(s));

  if (needed.length > 0) {
    const { data, error } = await supabase
      .from('players')
      .select('slug, image_url')
      .in('slug', needed);

    if (error) {
      console.error('getPlayerPhotosBatch error:', error.message);
    } else {
      for (const p of data || []) {
        photoCache.set(p.slug, p.image_url);
      }
      // Mark slugs not found in DB as null
      for (const s of needed) {
        if (!photoCache.has(s)) photoCache.set(s, null);
      }
    }
  }

  return photoCache;
}

// Get photo for a single player
export async function getPlayerPhoto(slug: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('players')
    .select('image_url')
    .eq('slug', slug)
    .single();

  if (error) return null;
  return data?.image_url || null;
}

// Get photos for a VS article (returns [photo1, photo2])
export async function getVsPhotos(articleSlug: string): Promise<[string | null, string | null]> {
  const pair = vsPlayerSlugs[articleSlug];
  if (!pair) return [null, null];

  const photos = await getPlayerPhotosBatch(pair);
  return [photos.get(pair[0]) || null, photos.get(pair[1]) || null];
}

// Get all VS player slugs for batch fetching
export function getAllVsPlayerSlugs(): string[] {
  const allSlugs = new Set<string>();
  for (const pair of Object.values(vsPlayerSlugs)) {
    allSlugs.add(pair[0]);
    allSlugs.add(pair[1]);
  }
  return [...allSlugs];
}

// Get player display name from slug
export function slugToName(slug: string): string {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ===== ARTICLE PHOTO MAPPINGS =====
// Each article maps to either a local image path or a player slug (for Wikimedia photos)

interface ArticlePhoto {
  type: 'local' | 'player';
  value: string; // path for 'local', player slug for 'player'
}

// Gear articles → photos (use equipment images, not player portraits)
export const gearArticlePhotos: Record<string, ArticlePhoto> = {
  'best-tennis-rackets-2026': { type: 'local', value: '/images/gear/tennis-rackets.jpg' },
  'best-tennis-strings-guide': { type: 'local', value: '/images/gear/tennis-strings.jpg' },
  'best-tennis-shoes-2026': { type: 'local', value: '/images/gear/tennis-shoes.jpg' },
  'tennis-bag-guide': { type: 'local', value: '/images/gear/tennis-accessories.jpg' },
  'tennis-overgrip-guide': { type: 'local', value: '/images/gear/tennis-overgrip.jpg' },
  'head-vs-wilson-vs-babolat': { type: 'local', value: '/images/gear/tennis-racket-brands.jpg' },
  'best-tennis-balls-2026': { type: 'local', value: '/images/gear/tennis-balls.jpg' },
  'tennis-accessories-essentials': { type: 'local', value: '/images/gear/tennis-net.jpg' },
  'junior-tennis-racket-guide': { type: 'local', value: '/images/gear/tennis-rackets.jpg' },
  'best-clay-court-shoes': { type: 'local', value: '/images/gear/tennis-clay-shoes.jpg' },
  'tennis-racket-weight-guide': { type: 'local', value: '/images/gear/tennis-rackets.jpg' },
  'tennis-sunglasses-guide': { type: 'local', value: '/images/gear/tennis-accessories.jpg' },
  'tennis-string-tension-guide': { type: 'local', value: '/images/gear/tennis-strings.jpg' },
  'best-tennis-dampeners': { type: 'local', value: '/images/gear/tennis-dampener.jpg' },
  'tennis-elbow-prevention-gear': { type: 'local', value: '/images/gear/tennis-accessories.jpg' },
  'used-tennis-rackets-buying-guide': { type: 'local', value: '/images/gear/tennis-racket-vintage.jpg' },
  'best-tennis-rackets-beginners': { type: 'local', value: '/images/gear/tennis-rackets.jpg' },
  'tennis-grip-guide': { type: 'local', value: '/images/gear/tennis-overgrip.jpg' },
  'tennis-racket-string-tension-guide': { type: 'local', value: '/images/gear/tennis-strings.jpg' },
  'best-tennis-ball-machines-2026': { type: 'local', value: '/images/gear/tennis-ball-machine.jpg' },
  'tennis-grip-tape-guide': { type: 'local', value: '/images/gear/tennis-overgrip.jpg' },
  'best-tennis-watches-fitness-trackers': { type: 'local', value: '/images/gear/tennis-watch.jpg' },
  'tennis-court-equipment-setup': { type: 'local', value: '/images/records/tennis-court-aerial.jpg' },
};

// Lifestyle articles → photos
export const lifestyleArticlePhotos: Record<string, ArticlePhoto> = {
  'richest-tennis-players-2026': { type: 'player', value: 'novak-djokovic' },
  'tennis-fashion-on-court': { type: 'local', value: '/images/lifestyle/tennis-fashion.jpg' },
  'tennis-diet-nutrition': { type: 'local', value: '/images/lifestyle/tennis-nutrition.jpg' },
  'tennis-fitness-training': { type: 'local', value: '/images/lifestyle/tennis-training.jpg' },
  'tennis-retirement-second-careers': { type: 'player', value: 'roger-federer' },
  'best-tennis-movies-documentaries': { type: 'local', value: '/images/lifestyle/cinema-popcorn.jpg' },
  'tennis-travel-bucket-list': { type: 'local', value: '/images/lifestyle/airplane-travel.jpg' },
  'tennis-mental-health': { type: 'player', value: 'naomi-osaka' },
  'how-to-start-playing-tennis': { type: 'local', value: '/images/lifestyle/tennis-training.jpg' },
  'tennis-betting-guide': { type: 'local', value: '/images/records/tennis-court-aerial.jpg' },
  'tennis-rules-explained': { type: 'local', value: '/images/records/tennis-court-aerial.jpg' },
  'tennis-vs-padel': { type: 'local', value: '/images/lifestyle/padel-court.jpg' },
  'how-to-watch-tennis': { type: 'local', value: '/images/tournaments/us-open.jpg' },
  'tennis-coaching-legends': { type: 'player', value: 'novak-djokovic' },
  'tennis-wags-power-couples': { type: 'player', value: 'stefanos-tsitsipas' },
  'tennis-superstitions-rituals': { type: 'player', value: 'rafael-nadal' },
  'tennis-injuries-common': { type: 'local', value: '/images/lifestyle/tennis-physio.jpg' },
  'tennis-trophies-prizes': { type: 'local', value: '/images/lifestyle/tennis-trophy.jpg' },
};

// Records articles → photos (diversified — avoid showing same player for every record)
export const recordsArticlePhotos: Record<string, ArticlePhoto> = {
  'most-grand-slam-titles': { type: 'player', value: 'novak-djokovic' },
  'fastest-serve-tennis': { type: 'player', value: 'john-isner' },
  'longest-match-tennis': { type: 'local', value: '/images/tournaments/wimbledon.jpg' },
  'most-weeks-number-one': { type: 'local', value: '/images/records/tennis-trophy-gold.jpg' },
  'most-career-titles-tennis': { type: 'player', value: 'roger-federer' },
  'longest-winning-streaks-tennis': { type: 'player', value: 'rafael-nadal' },
  'biggest-upsets-tennis': { type: 'local', value: '/images/tournaments/us-open.jpg' },
  'golden-slam-calendar-slam': { type: 'player', value: 'steffi-graf' },
  'youngest-oldest-tennis-records': { type: 'player', value: 'carlos-alcaraz' },
  'most-aces-tennis-records': { type: 'player', value: 'john-isner' },
  'tennis-prize-money-history': { type: 'local', value: '/images/lifestyle/tennis-trophy.jpg' },
  'most-masters-1000-titles': { type: 'player', value: 'novak-djokovic' },
  'tennis-surface-records': { type: 'player', value: 'rafael-nadal' },
  'grand-slam-hat-tricks': { type: 'player', value: 'roger-federer' },
  'doubles-records-tennis': { type: 'local', value: '/images/records/tennis-court-aerial.jpg' },
  'tennis-goat-debate': { type: 'local', value: '/images/tournaments/melbourne-park.jpg' },
  'best-tennis-matches-ever': { type: 'local', value: '/images/tournaments/wimbledon.jpg' },
  'tennis-earnings-all-time': { type: 'local', value: '/images/lifestyle/tennis-trophy.jpg' },
  'tennis-comebacks-greatest': { type: 'player', value: 'andy-murray' },
  'tennis-first-time-records': { type: 'player', value: 'carlos-alcaraz' },
  'tennis-streaks-records': { type: 'player', value: 'rafael-nadal' },
  'tennis-olympic-records': { type: 'local', value: '/images/tournaments/roland-garros.jpg' },
  'tennis-tiebreak-records': { type: 'local', value: '/images/records/tennis-trophy-gold.jpg' },
};

// Tournament articles → venue photos (all use local venue images, not player portraits)
export const tournamentArticlePhotos: Record<string, ArticlePhoto> = {
  'australian-open-guide': { type: 'local', value: '/images/tournaments/melbourne-park.jpg' },
  'roland-garros-guide': { type: 'local', value: '/images/tournaments/roland-garros.jpg' },
  'wimbledon-guide': { type: 'local', value: '/images/tournaments/wimbledon.jpg' },
  'us-open-guide': { type: 'local', value: '/images/tournaments/us-open.jpg' },
  'indian-wells-guide': { type: 'local', value: '/images/tournaments/indian-wells.jpg' },
  'miami-open-guide': { type: 'local', value: '/images/tournaments/miami.jpg' },
  'atp-finals-guide': { type: 'local', value: '/images/tournaments/atp-finals.jpg' },
  'wta-finals-guide': { type: 'local', value: '/images/tournaments/wta-finals.jpg' },
  'davis-cup-guide': { type: 'local', value: '/images/tournaments/davis-cup.jpg' },
  'monte-carlo-masters-guide': { type: 'local', value: '/images/tournaments/monte-carlo.jpg' },
  'shanghai-masters-guide': { type: 'local', value: '/images/tournaments/shanghai.jpg' },
  'laver-cup-guide': { type: 'local', value: '/images/tournaments/laver-cup.jpg' },
};

// Get article photo URL (resolves player slugs to Wikimedia URLs)
export async function getArticlePhotoUrl(
  slug: string,
  category: string
): Promise<string | null> {
  const mappings: Record<string, Record<string, ArticlePhoto>> = {
    gear: gearArticlePhotos,
    lifestyle: lifestyleArticlePhotos,
    records: recordsArticlePhotos,
    tournaments: tournamentArticlePhotos,
  };

  const mapping = mappings[category]?.[slug];
  if (!mapping) return null;

  if (mapping.type === 'local') {
    return mapping.value;
  }

  // Fetch player photo from Supabase
  return getPlayerPhoto(mapping.value);
}

// Get all article photos for a category (batch, for index pages)
export async function getArticlePhotosForCategory(
  articles: { slug: string }[],
  category: string
): Promise<Map<string, string | null>> {
  const mappings: Record<string, Record<string, ArticlePhoto>> = {
    gear: gearArticlePhotos,
    lifestyle: lifestyleArticlePhotos,
    records: recordsArticlePhotos,
    tournaments: tournamentArticlePhotos,
  };

  const catMap = mappings[category] || {};
  const result = new Map<string, string | null>();

  // Collect all player slugs we need
  const playerSlugs = new Set<string>();
  for (const art of articles) {
    const mapping = catMap[art.slug];
    if (mapping?.type === 'player') {
      playerSlugs.add(mapping.value);
    }
  }

  // Batch fetch player photos
  const playerPhotos = playerSlugs.size > 0
    ? await getPlayerPhotosBatch([...playerSlugs])
    : new Map<string, string | null>();

  // Resolve all
  for (const art of articles) {
    const mapping = catMap[art.slug];
    if (!mapping) {
      result.set(art.slug, null);
    } else if (mapping.type === 'local') {
      result.set(art.slug, mapping.value);
    } else {
      result.set(art.slug, playerPhotos.get(mapping.value) || null);
    }
  }

  return result;
}
