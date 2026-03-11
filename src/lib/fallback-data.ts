// Fallback player data used until Supabase is connected
export const fallbackPlayers: Record<string, any> = {
  'jannik-sinner': {
    first_name: 'Jannik', last_name: 'Sinner', slug: 'jannik-sinner',
    country_code: 'ITA', tour: 'atp', hand: 'R',
    birth_date: '2001-08-16', height_cm: 188,
    career_titles: 16, grand_slam_titles: 2, career_win: 228, career_loss: 62,
    career_prize_usd: 23514672,
    bio_short: 'Jannik Sinner is an Italian professional tennis player who became the world No. 1 in 2024. Known for his powerful baseline game, relentless consistency, and ice-cold composure under pressure. Sinner won his first two Grand Slam titles at the 2024 Australian Open and 2024 US Open, establishing himself as the dominant force in men\'s tennis.',
    image_url: 'https://images.unsplash.com/photo-1542144582-1ba00456b5e3?w=800&h=800&fit=crop',
  },
  'carlos-alcaraz': {
    first_name: 'Carlos', last_name: 'Alcaraz', slug: 'carlos-alcaraz',
    country_code: 'ESP', tour: 'atp', hand: 'R',
    birth_date: '2003-05-05', height_cm: 183,
    career_titles: 16, grand_slam_titles: 4, career_win: 205, career_loss: 45,
    career_prize_usd: 29823456,
    bio_short: 'Carlos Alcaraz is a Spanish professional tennis player widely regarded as one of the most talented players of his generation. He became the youngest world No. 1 in ATP history at age 19. Alcaraz has won four Grand Slam titles including the 2023 and 2024 Wimbledon, 2022 US Open, and 2024 Roland Garros, showcasing his versatility across all surfaces.',
    image_url: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=800&h=800&fit=crop',
  },
  'novak-djokovic': {
    first_name: 'Novak', last_name: 'Djokovic', slug: 'novak-djokovic',
    country_code: 'SRB', tour: 'atp', hand: 'R',
    birth_date: '1987-05-22', height_cm: 188,
    career_titles: 99, grand_slam_titles: 24, career_win: 1113, career_loss: 212,
    career_prize_usd: 185068596,
    bio_short: 'Novak Djokovic is a Serbian professional tennis player widely considered one of the greatest tennis players of all time. He holds the all-time record for most Grand Slam titles (24), most weeks at world No. 1 (428), and most year-end No. 1 finishes (8). His extraordinary flexibility, mental resilience, and all-court game have defined an era.',
    image_url: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=800&h=800&fit=crop',
  },
  'alexander-zverev': {
    first_name: 'Alexander', last_name: 'Zverev', slug: 'alexander-zverev',
    country_code: 'GER', tour: 'atp', hand: 'R',
    birth_date: '1997-04-20', height_cm: 198,
    career_titles: 23, grand_slam_titles: 0, career_win: 378, career_loss: 168,
    career_prize_usd: 43256789,
    bio_short: 'Alexander Zverev is a German professional tennis player known for his powerful serve and athletic ability. A consistent top-5 player, Zverev won the Olympic gold medal at the 2020 Tokyo Games and has reached multiple Grand Slam finals. Standing at 198cm, he possesses one of the most formidable serves on tour.',
    image_url: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&h=800&fit=crop',
  },
  'daniil-medvedev': {
    first_name: 'Daniil', last_name: 'Medvedev', slug: 'daniil-medvedev',
    country_code: 'RUS', tour: 'atp', hand: 'R',
    birth_date: '1996-02-11', height_cm: 198,
    career_titles: 20, grand_slam_titles: 1, career_win: 322, career_loss: 131,
    career_prize_usd: 38945123,
    bio_short: 'Daniil Medvedev is a Russian professional tennis player known for his unconventional playing style, sharp tactical mind, and exceptional return game. He won the 2021 US Open and has been a consistent presence in the top 5. His flat groundstrokes and ability to absorb pace make him a nightmare for aggressive baseliners.',
    image_url: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=800&fit=crop',
  },
  'taylor-fritz': {
    first_name: 'Taylor', last_name: 'Fritz', slug: 'taylor-fritz',
    country_code: 'USA', tour: 'atp', hand: 'R',
    birth_date: '1997-10-28', height_cm: 193,
    career_titles: 10, grand_slam_titles: 0, career_win: 248, career_loss: 143,
    career_prize_usd: 15234567,
    bio_short: 'Taylor Fritz is an American professional tennis player known for his powerful serve and forehand. The highest-ranked American man in recent years, Fritz has established himself as a top-10 mainstay with consistent performances at major tournaments. His aggressive baseline game makes him a fan favorite on the ATP Tour.',
    image_url: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=800&h=800&fit=crop',
  },
  'casper-ruud': {
    first_name: 'Casper', last_name: 'Ruud', slug: 'casper-ruud',
    country_code: 'NOR', tour: 'atp', hand: 'R',
    birth_date: '1998-12-22', height_cm: 183,
    career_titles: 11, grand_slam_titles: 0, career_win: 228, career_loss: 115,
    career_prize_usd: 17345678,
    bio_short: 'Casper Ruud is a Norwegian professional tennis player known for his exceptional clay-court game. The first Norwegian to reach a Grand Slam final, Ruud has been a consistent top-10 player and has won multiple titles, particularly on clay. He combines a strong forehand with tactical intelligence.',
    image_url: 'https://images.unsplash.com/photo-1560012057-4372e14c5085?w=800&h=800&fit=crop',
  },
  'alex-de-minaur': {
    first_name: 'Alex', last_name: 'de Minaur', slug: 'alex-de-minaur',
    country_code: 'AUS', tour: 'atp', hand: 'R',
    birth_date: '1999-02-02', height_cm: 183,
    career_titles: 8, grand_slam_titles: 0, career_win: 208, career_loss: 108,
    career_prize_usd: 11234567,
    bio_short: 'Alex de Minaur is an Australian professional tennis player known for his incredible speed, court coverage, and fighting spirit. The Australian No. 1 has steadily climbed the rankings with his relentless retrieval game and improving offensive weapons.',
    image_url: 'https://images.unsplash.com/photo-1599586120429-48281b6f0ece?w=800&h=800&fit=crop',
  },
  'iga-swiatek': {
    first_name: 'Iga', last_name: 'Swiatek', slug: 'iga-swiatek',
    country_code: 'POL', tour: 'wta', hand: 'R',
    birth_date: '2001-05-31', height_cm: 176,
    career_titles: 22, grand_slam_titles: 5, career_win: 286, career_loss: 68,
    career_prize_usd: 28234567,
    bio_short: 'Iga Swiatek is a Polish professional tennis player and dominant force in women\'s tennis. She has won five Grand Slam titles, including four Roland Garros championships, establishing herself as the queen of clay. Swiatek held the world No. 1 ranking for 125 consecutive weeks and is known for her intense focus and mental toughness.',
    image_url: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=800&fit=crop',
  },
  'aryna-sabalenka': {
    first_name: 'Aryna', last_name: 'Sabalenka', slug: 'aryna-sabalenka',
    country_code: 'BLR', tour: 'wta', hand: 'R',
    birth_date: '1998-05-05', height_cm: 182,
    career_titles: 18, grand_slam_titles: 3, career_win: 312, career_loss: 145,
    career_prize_usd: 25678901,
    bio_short: 'Aryna Sabalenka is a Belarusian professional tennis player known for her explosive power and aggressive style of play. She won back-to-back Australian Open titles (2024, 2025) and the 2024 US Open, cementing her status as a Grand Slam champion. Her ferocious groundstrokes and improved serve make her one of the most dangerous players on tour.',
    image_url: 'https://images.unsplash.com/photo-1542144582-1ba00456b5e3?w=800&h=800&fit=crop',
  },
  'coco-gauff': {
    first_name: 'Coco', last_name: 'Gauff', slug: 'coco-gauff',
    country_code: 'USA', tour: 'wta', hand: 'R',
    birth_date: '2004-03-13', height_cm: 175,
    career_titles: 10, grand_slam_titles: 1, career_win: 178, career_loss: 72,
    career_prize_usd: 14567890,
    bio_short: 'Coco Gauff is an American professional tennis player who burst onto the scene as a teenager at Wimbledon 2019. She won her first Grand Slam title at the 2023 US Open at just 19 years old. Gauff combines athleticism, court coverage, and an increasingly powerful game to compete with the best in the world.',
    image_url: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=800&h=800&fit=crop',
  },
  'elena-rybakina': {
    first_name: 'Elena', last_name: 'Rybakina', slug: 'elena-rybakina',
    country_code: 'KAZ', tour: 'wta', hand: 'R',
    birth_date: '1999-06-17', height_cm: 184,
    career_titles: 8, grand_slam_titles: 1, career_win: 196, career_loss: 89,
    career_prize_usd: 12345678,
    bio_short: 'Elena Rybakina is a Kazakhstani professional tennis player known for her powerful serve and aggressive baseline game. She won her first Grand Slam title at Wimbledon 2022, becoming the first player from Kazakhstan to win a major. Her combination of power and improving court craft makes her a constant threat on all surfaces.',
    image_url: 'https://images.unsplash.com/photo-1560012057-4372e14c5085?w=800&h=800&fit=crop',
  },
};

// IOC code → ISO 3166-1 alpha-2 (for flag CDN)
export const iocToIso2: Record<string, string> = {
  ITA: 'it', ESP: 'es', SRB: 'rs', GER: 'de', RUS: 'ru',
  USA: 'us', NOR: 'no', AUS: 'au', POL: 'pl', BLR: 'by', KAZ: 'kz',
  FRA: 'fr', GBR: 'gb', ARG: 'ar', CAN: 'ca', GRE: 'gr',
  SUI: 'ch', JPN: 'jp', CHN: 'cn', CZE: 'cz', ROU: 'ro',
  BRA: 'br', CRO: 'hr', BUL: 'bg', DEN: 'dk', RSA: 'za',
  CHI: 'cl', COL: 'co', TUN: 'tn', IND: 'in', KOR: 'kr',
  BEL: 'be', UKR: 'ua', NED: 'nl', SWE: 'se', AUT: 'at',
  GEO: 'ge', ISR: 'il', HAI: 'ht', TPE: 'tw', THA: 'th',
  LAT: 'lv', EST: 'ee', LTU: 'lt', PUR: 'pr', ECU: 'ec',
  PER: 'pe', URU: 'uy', MEX: 'mx', PAR: 'py', VEN: 've',
  DOM: 'do', BOL: 'bo', POR: 'pt', IRL: 'ie', FIN: 'fi',
  HUN: 'hu', SVK: 'sk', SLO: 'si', MNE: 'me', BIH: 'ba',
  MKD: 'mk', ALB: 'al', CYP: 'cy', LUX: 'lu', MON: 'mc',
  UZB: 'uz', PHI: 'ph', INA: 'id', MAS: 'my', VIE: 'vn',
  NZL: 'nz', RSA: 'za', NGR: 'ng', EGY: 'eg', MAR: 'ma',
  ZIM: 'zw', BOT: 'bw', KEN: 'ke', ARM: 'am', TUR: 'tr',
};

// Country flag as <img> tag URL helper
export function getFlagUrl(ioc: string, width = 24): string {
  const iso = iocToIso2[ioc];
  if (!iso) return '';
  return `https://flagcdn.com/w${width}/${iso}.png`;
}

// Country flags emoji mapping (fallback for systems that support it)
export const countryFlags: Record<string, string> = {
  ITA: '🇮🇹', ESP: '🇪🇸', SRB: '🇷🇸', GER: '🇩🇪', RUS: '🇷🇺',
  USA: '🇺🇸', NOR: '🇳🇴', AUS: '🇦🇺', POL: '🇵🇱', BLR: '🇧🇾', KAZ: '🇰🇿',
  FRA: '🇫🇷', GBR: '🇬🇧', ARG: '🇦🇷', CAN: '🇨🇦', GRE: '🇬🇷',
  SUI: '🇨🇭', JPN: '🇯🇵', CHN: '🇨🇳', CZE: '🇨🇿', ROU: '🇷🇴',
  BRA: '🇧🇷', CRO: '🇭🇷', BUL: '🇧🇬', DEN: '🇩🇰', RSA: '🇿🇦',
  CHI: '🇨🇱', COL: '🇨🇴', TUN: '🇹🇳', IND: '🇮🇳', KOR: '🇰🇷',
  BEL: '🇧🇪', UKR: '🇺🇦', NED: '🇳🇱', SWE: '🇸🇪', AUT: '🇦🇹',
  GEO: '🇬🇪', ISR: '🇮🇱', THA: '🇹🇭', LAT: '🇱🇻', EST: '🇪🇪',
  LTU: '🇱🇹', POR: '🇵🇹', IRL: '🇮🇪', FIN: '🇫🇮', HUN: '🇭🇺',
  SVK: '🇸🇰', SLO: '🇸🇮', MNE: '🇲🇪', BIH: '🇧🇦', MKD: '🇲🇰',
  ALB: '🇦🇱', CYP: '🇨🇾', LUX: '🇱🇺', MON: '🇲🇨', UZB: '🇺🇿',
  PHI: '🇵🇭', INA: '🇮🇩', MAS: '🇲🇾', VIE: '🇻🇳', NZL: '🇳🇿',
  NGR: '🇳🇬', EGY: '🇪🇬', MAR: '🇲🇦', ZIM: '🇿🇼', KEN: '🇰🇪',
  MEX: '🇲🇽', PER: '🇵🇪', ECU: '🇪🇨', DOM: '🇩🇴', PUR: '🇵🇷',
  TPE: '🇹🇼', HAI: '🇭🇹', URU: '🇺🇾', PAR: '🇵🇾', VEN: '🇻🇪',
  BOL: '🇧🇴', BOT: '🇧🇼', ARM: '🇦🇲', TUR: '🇹🇷',
};

// Country names mapping
export const countryNames: Record<string, string> = {
  ITA: 'Italy', ESP: 'Spain', SRB: 'Serbia', GER: 'Germany', RUS: 'Russia',
  USA: 'United States', NOR: 'Norway', AUS: 'Australia', POL: 'Poland',
  BLR: 'Belarus', KAZ: 'Kazakhstan', FRA: 'France', GBR: 'Great Britain',
  ARG: 'Argentina', CAN: 'Canada', GRE: 'Greece', SUI: 'Switzerland',
  JPN: 'Japan', CHN: 'China', CZE: 'Czech Republic', ROU: 'Romania',
  BRA: 'Brazil', CRO: 'Croatia', BUL: 'Bulgaria', DEN: 'Denmark',
  RSA: 'South Africa', CHI: 'Chile', COL: 'Colombia', TUN: 'Tunisia',
  IND: 'India', KOR: 'South Korea', BEL: 'Belgium', UKR: 'Ukraine',
  NED: 'Netherlands', SWE: 'Sweden', AUT: 'Austria', GEO: 'Georgia',
  ISR: 'Israel', THA: 'Thailand', LAT: 'Latvia', EST: 'Estonia',
  LTU: 'Lithuania', POR: 'Portugal', IRL: 'Ireland', FIN: 'Finland',
  HUN: 'Hungary', SVK: 'Slovakia', SLO: 'Slovenia', MNE: 'Montenegro',
  BIH: 'Bosnia & Herzegovina', NZL: 'New Zealand', MEX: 'Mexico',
  EGY: 'Egypt', TUR: 'Turkey', ARM: 'Armenia', MAR: 'Morocco',
};

// Hand labels
export const handLabels: Record<string, string> = {
  R: 'Right-Handed',
  L: 'Left-Handed',
  U: 'Unknown',
  A: 'Ambidextrous',
};

// Strip markdown syntax from text (for excerpts/descriptions)
export function stripMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/#{1,6}\s+/g, '')           // Remove heading markers (anywhere in text)
    .replace(/\*\*(.+?)\*\*/g, '$1')    // Remove bold
    .replace(/\*(.+?)\*/g, '$1')        // Remove italic
    .replace(/__(.+?)__/g, '$1')        // Remove bold (alt)
    .replace(/_(.+?)_/g, '$1')          // Remove italic (alt)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // Remove images
    .replace(/`{1,3}[^`]*`{1,3}/g, '')  // Remove code
    .replace(/^[-*+]\s+/gm, '')          // Remove list markers
    .replace(/^\d+\.\s+/gm, '')          // Remove numbered list markers
    .replace(/^>\s+/gm, '')              // Remove blockquote markers
    .replace(/---+/g, '')                // Remove horizontal rules
    .replace(/\n{3,}/g, '\n\n')          // Collapse excessive newlines
    .replace(/\s{2,}/g, ' ')            // Collapse multiple spaces
    .trim();
}
