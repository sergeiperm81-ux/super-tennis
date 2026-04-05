import { supabase } from './supabase';

// Mapping: VS article slug → [player1_slug, player2_slug]
export const vsPlayerSlugs: Record<string, [string, string]> = {
  // Current Era — primary
  'alcaraz-vs-sinner': ['carlos-alcaraz', 'jannik-sinner'],
  'djokovic-vs-alcaraz': ['novak-djokovic', 'carlos-alcaraz'],
  'swiatek-vs-sabalenka': ['iga-swiatek', 'aryna-sabalenka'],
  'medvedev-vs-sinner': ['daniil-medvedev', 'jannik-sinner'],
  'zverev-vs-alcaraz': ['alexander-zverev', 'carlos-alcaraz'],
  'gauff-vs-swiatek': ['coco-gauff', 'iga-swiatek'],
  'kyrgios-vs-djokovic': ['nick-kyrgios', 'novak-djokovic'],
  // Current Era — variant slugs (same pair, different article angles)
  'sinner-vs-alcaraz-grand-slams': ['jannik-sinner', 'carlos-alcaraz'],
  'sinner-vs-alcaraz-2026-new-era': ['jannik-sinner', 'carlos-alcaraz'],
  'sinner-vs-medvedev': ['jannik-sinner', 'daniil-medvedev'],
  'djokovic-vs-sinner': ['novak-djokovic', 'jannik-sinner'],
  'djokovic-vs-sinner-2026-passing-torch': ['novak-djokovic', 'jannik-sinner'],
  'alcaraz-vs-medvedev': ['carlos-alcaraz', 'daniil-medvedev'],
  'djokovic-vs-zverev': ['novak-djokovic', 'alexander-zverev'],
  'sinner-vs-zverev': ['jannik-sinner', 'alexander-zverev'],
  'draper-vs-sinner': ['jack-draper', 'jannik-sinner'],
  'alcaraz-vs-djokovic-wimbledon': ['carlos-alcaraz', 'novak-djokovic'],
  'ruud-vs-alcaraz': ['casper-ruud', 'carlos-alcaraz'],
  'nadal-vs-alcaraz': ['rafael-nadal', 'carlos-alcaraz'],
  'zverev-vs-alcaraz-masters-rivalry': ['alexander-zverev', 'carlos-alcaraz'],
  'shelton-vs-draper-next-gen': ['ben-shelton', 'jack-draper'],
  'fritz-vs-tiafoe-american-revival': ['taylor-fritz', 'frances-tiafoe'],
  'rune-vs-sinner-european-young-guns': ['holger-rune', 'jannik-sinner'],
  // Big Three Era
  'djokovic-vs-nadal': ['novak-djokovic', 'rafael-nadal'],
  'djokovic-vs-nadal-australian-open': ['novak-djokovic', 'rafael-nadal'],
  'federer-vs-nadal': ['roger-federer', 'rafael-nadal'],
  'djokovic-vs-federer': ['novak-djokovic', 'roger-federer'],
  'djokovic-vs-murray': ['novak-djokovic', 'andy-murray'],
  'nadal-vs-federer-clay': ['rafael-nadal', 'roger-federer'],
  'nadal-vs-murray': ['rafael-nadal', 'andy-murray'],
  'federer-vs-djokovic-wimbledon': ['roger-federer', 'novak-djokovic'],
  'nadal-vs-djokovic-french-open': ['rafael-nadal', 'novak-djokovic'],
  'big-three-comparison': ['novak-djokovic', 'rafael-nadal'],
  'federer-vs-murray': ['roger-federer', 'andy-murray'],
  'federer-vs-wawrinka': ['roger-federer', 'stan-wawrinka'],
  'tsitsipas-vs-medvedev': ['stefanos-tsitsipas', 'daniil-medvedev'],
  'agassi-vs-federer': ['andre-agassi', 'roger-federer'],
  // Women's Tennis
  'evert-vs-navratilova': ['chris-evert', 'martina-navratilova'],
  'williams-vs-williams': ['serena-williams', 'venus-williams'],
  'graf-vs-seles': ['steffi-graf', 'monica-seles'],
  'graf-vs-navratilova': ['steffi-graf', 'martina-navratilova'],
  'sharapova-vs-williams': ['maria-sharapova', 'serena-williams'],
  'henin-vs-clijsters': ['justine-henin', 'kim-clijsters'],
  'hingis-vs-williams': ['martina-hingis', 'serena-williams'],
  'osaka-vs-barty': ['naomi-osaka', 'ashleigh-barty'],
  'sabalenka-vs-rybakina': ['aryna-sabalenka', 'elena-rybakina'],
  'rybakina-vs-sabalenka-power-vs-power': ['elena-rybakina', 'aryna-sabalenka'],
  'swiatek-vs-rybakina': ['iga-swiatek', 'elena-rybakina'],
  'sabalenka-vs-gauff': ['aryna-sabalenka', 'coco-gauff'],
  'gauff-vs-sabalenka-us-open': ['coco-gauff', 'aryna-sabalenka'],
  'sabalenka-vs-swiatek-wta-rivalry': ['aryna-sabalenka', 'iga-swiatek'],
  'gauff-vs-pegula': ['coco-gauff', 'jessica-pegula'],
  'pegula-vs-sabalenka-hard-court': ['jessica-pegula', 'aryna-sabalenka'],
  'gauff-vs-rybakina-rising-stars': ['coco-gauff', 'elena-rybakina'],
  // Classic Era
  'sampras-vs-agassi': ['pete-sampras', 'andre-agassi'],
  'agassi-vs-sampras-us-open': ['andre-agassi', 'pete-sampras'],
  'borg-vs-mcenroe': ['bjorn-borg', 'john-mcenroe'],
  'connors-vs-lendl': ['jimmy-connors', 'ivan-lendl'],
  'lendl-vs-mcenroe': ['ivan-lendl', 'john-mcenroe'],
  'edberg-vs-becker': ['stefan-edberg', 'boris-becker'],
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

// Gear articles → photos (ALL 60 articles, unique Unsplash photos)
export const gearArticlePhotos: Record<string, ArticlePhoto> = {
  // Rackets
  'best-tennis-rackets-2026': { type: 'local', value: '/images/gear/tennis-rackets.jpg' },
  'best-tennis-rackets-beginners': { type: 'local', value: '/images/gear/tennis-beginner.jpg' },
  'best-tennis-rackets-women-2026': { type: 'local', value: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=800&q=80' },
  'best-budget-tennis-rackets': { type: 'local', value: 'https://images.unsplash.com/photo-1560012057-4372e14c5085?w=800&q=80' },
  'best-pre-strung-tennis-rackets': { type: 'local', value: 'https://images.unsplash.com/photo-1529926706528-db9e5010cd3e?w=800&q=80' },
  'head-vs-wilson-vs-babolat': { type: 'local', value: '/images/gear/tennis-racket-brands.jpg' },
  'head-speed-vs-babolat-pure-aero': { type: 'local', value: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=800&q=80' },
  'wilson-pro-staff-vs-blade-comparison': { type: 'local', value: 'https://images.unsplash.com/photo-1617083934551-ac1f1c58d04b?w=800&q=80' },
  'tennis-racket-weight-guide': { type: 'local', value: '/images/gear/tennis-racket-detail.jpg' },
  'tennis-racket-brands-ranked': { type: 'local', value: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80' },
  'tennis-racket-technology-evolution': { type: 'local', value: 'https://images.unsplash.com/photo-1542144582-1ba00456b5e3?w=800&q=80' },
  'junior-tennis-racket-guide': { type: 'local', value: '/images/gear/tennis-junior.jpg' },
  'tennis-elbow-arm-friendly-rackets': { type: 'local', value: '/images/gear/tennis-elbow.jpg' },
  'used-tennis-rackets-buying-guide': { type: 'local', value: '/images/gear/tennis-racket-vintage.jpg' },
  // Shoes
  'best-tennis-shoes-2026': { type: 'local', value: '/images/gear/tennis-shoes.jpg' },
  'best-clay-court-shoes': { type: 'local', value: '/images/gear/tennis-clay-shoes.jpg' },
  'best-tennis-shoes-clay-courts-2026': { type: 'local', value: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800&q=80' },
  'best-tennis-shoes-flat-feet': { type: 'local', value: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80' },
  'best-tennis-court-shoes-2026': { type: 'local', value: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=800&q=80' },
  'tennis-shoe-technology-guide': { type: 'local', value: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&q=80' },
  // Strings
  'best-tennis-strings-guide': { type: 'local', value: '/images/gear/tennis-strings.jpg' },
  'best-tennis-strings-spin': { type: 'local', value: 'https://images.unsplash.com/photo-1554246969-773cdf4ed1ed?w=800&q=80' },
  'tennis-string-tension-guide': { type: 'local', value: '/images/gear/tennis-string-detail.jpg' },
  'tennis-racket-string-tension-guide': { type: 'local', value: '/images/gear/tennis-stringing.jpg' },
  'tennis-stringing-machine-guide': { type: 'local', value: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80' },
  // Grips
  'tennis-grip-guide': { type: 'local', value: '/images/gear/tennis-grip.jpg' },
  'tennis-grip-choosing-guide': { type: 'local', value: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=800&q=80' },
  'tennis-grip-size-measure-guide': { type: 'local', value: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800&q=80' },
  'tennis-grip-tape-guide': { type: 'local', value: '/images/gear/tennis-tape.jpg' },
  'tennis-overgrip-guide': { type: 'local', value: '/images/gear/tennis-overgrip.jpg' },
  'tennis-overgrip-comparison': { type: 'local', value: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=800&q=80' },
  // Bags
  'tennis-bag-guide': { type: 'local', value: '/images/gear/tennis-accessories.jpg' },
  'best-tennis-bags-guide': { type: 'local', value: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80' },
  'best-tennis-bags-under-50': { type: 'local', value: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80' },
  'tennis-bag-what-pros-carry': { type: 'local', value: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&q=80' },
  // Balls & Machines
  'best-tennis-balls-2026': { type: 'local', value: '/images/gear/tennis-balls.jpg' },
  'best-tennis-balls-comparison': { type: 'local', value: 'https://images.unsplash.com/photo-1519861531473-9200262188bf?w=800&q=80' },
  'best-tennis-ball-machines': { type: 'local', value: '/images/gear/tennis-ball-machine.jpg' },
  'best-tennis-ball-machines-2026': { type: 'local', value: 'https://images.unsplash.com/photo-1485727749690-d091e8284ef3?w=800&q=80' },
  // Dampeners
  'best-tennis-dampeners': { type: 'local', value: '/images/gear/tennis-dampener.jpg' },
  'best-tennis-dampeners-guide': { type: 'local', value: 'https://images.unsplash.com/photo-1461896836934-bd45ba8fcf9b?w=800&q=80' },
  'tennis-vibration-dampener-types': { type: 'local', value: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&q=80' },
  // Accessories & Apparel
  'tennis-accessories-essentials': { type: 'local', value: '/images/gear/tennis-net.jpg' },
  'best-tennis-headbands-wristbands': { type: 'local', value: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&q=80' },
  'best-tennis-socks-2026': { type: 'local', value: 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=800&q=80' },
  'best-tennis-skirts-dresses-2026': { type: 'local', value: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80' },
  'best-tennis-sunglasses': { type: 'local', value: '/images/gear/tennis-sunglasses.jpg' },
  'tennis-sunglasses-guide': { type: 'local', value: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&q=80' },
  // Tech & Watches
  'best-tennis-watches-fitness-trackers': { type: 'local', value: '/images/gear/tennis-watch.jpg' },
  'best-tennis-watches-smartwatches': { type: 'local', value: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&q=80' },
  'best-tennis-apps-2026': { type: 'local', value: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80' },
  // Training & Practice
  'best-tennis-training-aids': { type: 'local', value: 'https://images.unsplash.com/photo-1526485856375-9110cfbbf286?w=800&q=80' },
  'best-tennis-rebounders-practice-walls': { type: 'local', value: 'https://images.unsplash.com/photo-1544919982-b61976f0ba43?w=800&q=80' },
  // Gifts & Misc
  'best-tennis-gifts-2026': { type: 'local', value: 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=800&q=80' },
  'tennis-equipment-maintenance-guide': { type: 'local', value: 'https://images.unsplash.com/photo-1581092160607-ee67df30b5ea?w=800&q=80' },
  // Courts & Elbow
  'tennis-court-equipment-setup': { type: 'local', value: '/images/records/tennis-court-aerial.jpg' },
  'tennis-court-surfaces-explained': { type: 'local', value: 'https://images.unsplash.com/photo-1554050857-c84a8abdb5e2?w=800&q=80' },
  'tennis-elbow-prevention-gear': { type: 'local', value: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80' },
  'tennis-equipment-buying-guide-for-club-players': { type: 'local', value: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=800&q=80' },
  'best-tennis-gear-beginners': { type: 'local', value: 'https://images.unsplash.com/photo-1518614368389-5160c0b0de72?w=800&q=80' },
};

// Lifestyle articles → photos (ALL 100 articles, unique diverse photos)
export const lifestyleArticlePhotos: Record<string, ArticlePhoto> = {
  // Money & Business
  'richest-tennis-players-2026': { type: 'local', value: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&q=80' },
  'richest-tennis-players-homes': { type: 'local', value: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80' },
  'tennis-trophies-prizes': { type: 'local', value: '/images/lifestyle/tennis-trophy.jpg' },
  'tennis-prize-money-explained': { type: 'local', value: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&q=80' },
  'tennis-betting-guide': { type: 'local', value: 'https://images.unsplash.com/photo-1596838132731-3301c3fd4317?w=800&q=80' },
  'tennis-player-business-ventures': { type: 'local', value: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80' },
  'tennis-most-expensive-things-players-own': { type: 'local', value: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80' },
  'tennis-richest-coaches-salaries': { type: 'local', value: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80' },
  'tennis-how-much-costs-go-pro': { type: 'local', value: 'https://images.unsplash.com/photo-1554768804-50c1e2b50a6e?w=800&q=80' },
  'tennis-player-cars-collection': { type: 'local', value: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&q=80' },
  // Culture & Entertainment
  'best-tennis-movies-documentaries': { type: 'local', value: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80' },
  'best-tennis-video-games': { type: 'local', value: 'https://images.unsplash.com/photo-1592840496694-26d035b52b48?w=800&q=80' },
  'best-tennis-video-games-ever': { type: 'local', value: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=800&q=80' },
  'best-tennis-books-all-time': { type: 'local', value: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=800&q=80' },
  'best-tennis-podcasts-2026': { type: 'local', value: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800&q=80' },
  'best-tennis-instagram-accounts': { type: 'local', value: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80' },
  'tennis-in-movies-tv-shows': { type: 'local', value: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=800&q=80' },
  'tennis-and-music-players-dj-sing': { type: 'local', value: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800&q=80' },
  'famous-people-who-played-tennis': { type: 'local', value: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=800&q=80' },
  'tennis-funniest-moments-bloopers': { type: 'local', value: 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=800&q=80' },
  'tennis-conspiracy-theories-myths': { type: 'local', value: 'https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?w=800&q=80' },
  // Fashion & Style
  'tennis-fashion-on-court': { type: 'local', value: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80' },
  'tennis-fashion-through-decades': { type: 'local', value: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=800&q=80' },
  'tennis-player-fashion-brands-endorsements': { type: 'local', value: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&q=80' },
  'tennis-player-tattoos-stories': { type: 'local', value: 'https://images.unsplash.com/photo-1611605698335-8b1569810432?w=800&q=80' },
  // Health & Wellness
  'tennis-mental-health': { type: 'local', value: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80' },
  'tennis-mental-game-tips': { type: 'local', value: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=800&q=80' },
  'tennis-best-sport-mental-health': { type: 'local', value: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&q=80' },
  'tennis-stress-relief-mindfulness': { type: 'local', value: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80' },
  'tennis-anxiety-how-to-overcome': { type: 'local', value: 'https://images.unsplash.com/photo-1474418397713-7ede21d49118?w=800&q=80' },
  'tennis-players-deal-with-pressure': { type: 'local', value: 'https://images.unsplash.com/photo-1508672019048-805c876b67e2?w=800&q=80' },
  'tennis-injuries-common': { type: 'local', value: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80' },
  'tennis-injuries-prevention': { type: 'local', value: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80' },
  'tennis-player-injuries-recovery': { type: 'local', value: 'https://images.unsplash.com/photo-1597764690523-15bea4c581c9?w=800&q=80' },
  'tennis-worst-injuries-comeback-stories': { type: 'local', value: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=800&q=80' },
  'tennis-heart-health': { type: 'local', value: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800&q=80' },
  'tennis-brain-health-dementia': { type: 'local', value: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&q=80' },
  'tennis-osteoporosis-bone-health': { type: 'local', value: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80' },
  'tennis-adds-10-years-life': { type: 'local', value: 'https://images.unsplash.com/photo-1447452001602-7090c7ab2db3?w=800&q=80' },
  'tennis-after-knee-replacement': { type: 'local', value: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80' },
  // Fitness & Diet
  'tennis-fitness-training': { type: 'local', value: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80' },
  'tennis-player-workout-gym-routine': { type: 'local', value: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80' },
  'tennis-player-morning-routines': { type: 'local', value: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=800&q=80' },
  'tennis-player-sleep-recovery-habits': { type: 'local', value: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800&q=80' },
  'tennis-diet-nutrition': { type: 'local', value: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80' },
  'tennis-diet-nutrition-guide': { type: 'local', value: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80' },
  'tennis-player-diet-what-pros-eat': { type: 'local', value: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&q=80' },
  // Relationships & Social
  'tennis-couples-love-stories': { type: 'local', value: 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=800&q=80' },
  'tennis-couples-relationship': { type: 'local', value: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=800&q=80' },
  'tennis-wags-partners-biggest-stars': { type: 'local', value: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80' },
  'tennis-wags-power-couples': { type: 'player', value: 'stefanos-tsitsipas' },
  'tennis-dating-apps-players': { type: 'local', value: 'https://images.unsplash.com/photo-1516589091380-5d8e87df6999?w=800&q=80' },
  'tennis-player-pets-dogs-cats': { type: 'local', value: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&q=80' },
  'the-social-side-of-tennis-a-culture-of-community': { type: 'local', value: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80' },
  'tennis-social-media-player-brands': { type: 'local', value: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=800&q=80' },
  'tennis-player-social-media-controversies': { type: 'local', value: 'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=800&q=80' },
  // Family & Kids
  'tennis-for-kids-parents-guide': { type: 'local', value: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&q=80' },
  'tennis-grandparents-grandkids': { type: 'local', value: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=800&q=80' },
  'tennis-parent-guide-supporting-junior': { type: 'local', value: 'https://images.unsplash.com/photo-1476234251651-f353703a034d?w=800&q=80' },
  'tennis-age-not-barrier-late-starters': { type: 'local', value: 'https://images.unsplash.com/photo-1581803118522-7b72a50f7e9f?w=800&q=80' },
  // Travel & Experience
  'tennis-travel-bucket-list': { type: 'local', value: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80' },
  'tennis-travel-guide-grand-slams': { type: 'local', value: 'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=800&q=80' },
  'tennis-travel-best-cities-live-tennis': { type: 'local', value: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&q=80' },
  'most-beautiful-tennis-courts-world': { type: 'local', value: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=800&q=80' },
  'tennis-watch-parties-how-to-host': { type: 'local', value: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800&q=80' },
  'tennis-fan-culture-loudest-crowds': { type: 'local', value: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&q=80' },
  // Learning & Getting Started
  'tennis-rules-explained': { type: 'local', value: 'https://images.unsplash.com/photo-1456406644174-8ddd4cd52a06?w=800&q=80' },
  'tennis-scoring-explained': { type: 'local', value: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800&q=80' },
  'tennis-scoring-love-deuce-explained': { type: 'local', value: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80' },
  'how-to-start-playing-tennis': { type: 'local', value: 'https://images.unsplash.com/photo-1542144582-1ba00456b5e3?w=800&q=80' },
  'how-to-watch-tennis': { type: 'local', value: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=800&q=80' },
  'how-to-watch-tennis-beginners-guide': { type: 'local', value: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=800&q=80' },
  'tennis-coaching-tips-beginners': { type: 'local', value: 'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=800&q=80' },
  'tennis-coaching-legends': { type: 'player', value: 'andy-murray' },
  'tennis-coaching-what-it-takes': { type: 'local', value: 'https://images.unsplash.com/photo-1526232761682-d26e03ac148e?w=800&q=80' },
  'how-to-become-professional-tennis-player': { type: 'local', value: 'https://images.unsplash.com/photo-1560012057-4372e14c5085?w=800&q=80' },
  'tennis-etiquette-rules-fans': { type: 'local', value: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=800&q=80' },
  'tennis-etiquette-unwritten-rules': { type: 'local', value: 'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=800&q=80' },
  'tennis-doubles-strategy': { type: 'local', value: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&q=80' },
  'best-tennis-academies-world': { type: 'local', value: 'https://images.unsplash.com/photo-1541178735493-479c1a27ed24?w=800&q=80' },
  'tennis-player-education-degrees': { type: 'local', value: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80' },
  // Sports Comparison
  'tennis-vs-padel': { type: 'local', value: '/images/lifestyle/padel-court.jpg' },
  'tennis-vs-padel-differences': { type: 'local', value: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&q=80' },
  'pickleball-vs-tennis': { type: 'local', value: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=800&q=80' },
  'padel-tennis-explained': { type: 'local', value: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80' },
  'tennis-vs-golf-retirement-sport': { type: 'local', value: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&q=80' },
  'tennis-court-types-explained': { type: 'local', value: '/images/tournaments/roland-garros.jpg' },
  // Players & Careers
  'tennis-superstitions-rituals': { type: 'player', value: 'rafael-nadal' },
  'tennis-player-pre-match-rituals': { type: 'player', value: 'novak-djokovic' },
  'tennis-player-nicknames-history': { type: 'local', value: 'https://images.unsplash.com/photo-1531315396756-905d68d21b56?w=800&q=80' },
  'tennis-player-heights-does-size-matter': { type: 'local', value: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=800&q=80' },
  'tennis-retirement-life-after-tour': { type: 'local', value: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80' },
  'tennis-retirement-second-careers': { type: 'player', value: 'roger-federer' },
  'tennis-most-dramatic-retirements': { type: 'local', value: 'https://images.unsplash.com/photo-1474631245212-32dc3c8310c6?w=800&q=80' },
  'tennis-player-charity-foundations': { type: 'local', value: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=800&q=80' },
  'tennis-wildest-arguments-umpires': { type: 'local', value: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80' },
  'tennis-best-rivalries-all-time': { type: 'player', value: 'novak-djokovic' },
  'tennis-what-happens-after-match': { type: 'local', value: 'https://images.unsplash.com/photo-1471295253337-3ceaaedca402?w=800&q=80' },
  'reinventing-yourself-through-tennis': { type: 'local', value: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80' },
  'aryna-sabalenka-rise-world-number-one': { type: 'local', value: '/images/lifestyle/sabalenka-action.webp' },
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
  'tennis-prize-money-history': { type: 'local', value: '/images/records/tennis-court-aerial.jpg' },
  'most-masters-1000-titles': { type: 'player', value: 'novak-djokovic' },
  'tennis-surface-records': { type: 'player', value: 'rafael-nadal' },
  'grand-slam-hat-tricks': { type: 'player', value: 'roger-federer' },
  'doubles-records-tennis': { type: 'local', value: '/images/records/tennis-court-aerial.jpg' },
  'tennis-goat-debate': { type: 'local', value: '/images/tournaments/melbourne-park.jpg' },
  'best-tennis-matches-ever': { type: 'local', value: '/images/tournaments/wimbledon.jpg' },
  'tennis-earnings-all-time': { type: 'local', value: '/images/tournaments/us-open.jpg' },
  'tennis-comebacks-greatest': { type: 'player', value: 'andy-murray' },
  'tennis-first-time-records': { type: 'player', value: 'carlos-alcaraz' },
  'tennis-streaks-records': { type: 'player', value: 'rafael-nadal' },
  'tennis-olympic-records': { type: 'local', value: '/images/tournaments/roland-garros.jpg' },
  'tennis-tiebreak-records': { type: 'local', value: '/images/tournaments/melbourne-park.jpg' },
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
  articles: { slug: string; image_url?: string | null }[],
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
      // Fallback to article's own image_url from database
      result.set(art.slug, (art as any).image_url || null);
    } else if (mapping.type === 'local') {
      result.set(art.slug, mapping.value);
    } else {
      result.set(art.slug, playerPhotos.get(mapping.value) || null);
    }
  }

  return result;
}
