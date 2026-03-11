// =============================================================================
// YouTube channels and video data for the /video/ section and homepage
// Video pool: ~180 real video IDs for rotation. Updated manually or via script.
// =============================================================================

export interface YouTubeVideo {
  id: string;
  title: string;
  channelName: string;
}

export interface YouTubeChannel {
  channelId: string;
  name: string;
  description: string;
  subscriberCount: string;
  videos: YouTubeVideo[];
}

export interface VideoCategory {
  id: string;
  label: string;
  description: string;
  accentColor: string;
  channels: YouTubeChannel[];
}

// ---------------------------------------------------------------------------
// Seeded random selection (deterministic per day/period)
// ---------------------------------------------------------------------------

function seededPick<T>(arr: T[], seed: number, count: number): T[] {
  if (arr.length === 0) return [];
  const shuffled = [...arr];
  let s = seed;
  for (let i = shuffled.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/** Homepage: 1 video per category, changes daily */
export function getHomepageVideos(): { video: YouTubeVideo; category: VideoCategory }[] {
  const daySeed = Math.floor(Date.now() / 86400000);
  return videoCategories.map((cat, i) => {
    const allVideos = cat.channels.flatMap(ch => ch.videos);
    const picked = seededPick(allVideos, daySeed + i * 7, 1);
    return { video: picked[0], category: cat };
  }).filter(x => x.video);
}

/** /video/ page: 2-3 featured videos per channel, changes every 3 days */
export function getChannelFeaturedVideos(videos: YouTubeVideo[]): YouTubeVideo[] {
  const threeDaySeed = Math.floor(Date.now() / (86400000 * 3));
  return seededPick(videos, threeDaySeed, Math.min(3, videos.length));
}

// ---------------------------------------------------------------------------
// CATEGORY 1: Tour Highlights
// ---------------------------------------------------------------------------

const tennisTv: YouTubeChannel = {
  channelId: 'UCbcxFkd6B9xUU54InHv4Tig',
  name: 'Tennis TV',
  description: 'Official ATP streaming service. Match highlights, hot shots, and behind-the-scenes access to the biggest stars in tennis.',
  subscriberCount: '3.2M',
  videos: [
    { id: 'u7Dn6GIoIu4', title: 'Alcaraz Didn\'t Lose A Point On Serve In The Deciding Set', channelName: 'Tennis TV' },
    { id: 'jVM-23iyFvg', title: 'Alcaraz, Djokovic, Draper & Bublik | Indian Wells 2026 Highlights', channelName: 'Tennis TV' },
    { id: 'RYkGC4ojefM', title: 'Djokovic and Tsitsipas Team Up For Indian Wells Doubles', channelName: 'Tennis TV' },
    { id: 'Ki-BF0votGs', title: 'Alcaraz Battles Rinderknech In Third Round | Indian Wells 2026', channelName: 'Tennis TV' },
    { id: '1uNAtduuoA8', title: 'There\'s A Real Buzz About Carlos Alcaraz', channelName: 'Tennis TV' },
    { id: 's9XCjQtvbMI', title: 'Casper Ruud vs Vacherot Highlights | Indian Wells 2026', channelName: 'Tennis TV' },
    { id: 'AAo9zzOFG7k', title: 'Taylor Fritz vs Alex Michelsen Highlights | Indian Wells 2026', channelName: 'Tennis TV' },
    { id: 'qmz4rD9FbaU', title: 'Bublik vs Hijikata Match Highlights | Indian Wells 2026', channelName: 'Tennis TV' },
    { id: '0y7UGYdg7lw', title: 'The Greatest Showman', channelName: 'Tennis TV' },
    { id: 'hGFcGENjdEw', title: 'Draper vs Cerundolo Highlights | Indian Wells 2026', channelName: 'Tennis TV' },
    { id: 'zOLNuW-D6og', title: 'Sinner & Opelka Battle in Tennis Paradise | Indian Wells 2026', channelName: 'Tennis TV' },
    { id: 'v2diCvtL3ug', title: 'Djokovic vs Kovacevic Round 3 | Indian Wells 2026 Highlights', channelName: 'Tennis TV' },
    { id: 'ZRuwkGdqUIU', title: 'De Minaur vs Norrie Highlights | Indian Wells 2026', channelName: 'Tennis TV' },
    { id: 'ukVb62Lzjpc', title: '2021 Champ Norrie Keeps Rolling in Tennis Paradise', channelName: 'Tennis TV' },
    { id: 'uumPWNvZqiY', title: 'Joao Fonseca Practices Live In Indian Wells', channelName: 'Tennis TV' },
    { id: 'OXaEUUUJJ7s', title: '25 Tennis Shots SO GOOD the Opponent Had to Applaud', channelName: 'Tennis TV' },
    { id: 'W2N0eGIZV-8', title: 'Top 100 Roger Federer Career ATP Points!', channelName: 'Tennis TV' },
    { id: 'T-GSp2Nuvrk', title: 'Rafael Nadal: Top 100 ATP Shots!', channelName: 'Tennis TV' },
    { id: '2n70tHqPWDQ', title: 'Sinner vs Alcaraz For The Title | ATP Finals 2025', channelName: 'Tennis TV' },
    { id: 'ne6hTv4SrvI', title: 'TOP 50 ATP SHOTS & RALLIES OF 2010s DECADE!', channelName: 'Tennis TV' },
    { id: 'SOZF-mdDIBg', title: 'Carlos Alcaraz vs Grigor Dimitrov | Indian Wells 2026', channelName: 'Tennis TV' },
  ],
};

const wta: YouTubeChannel = {
  channelId: 'UCaBIVVpHjq6j3tSyxwTE-8Q',
  name: 'WTA',
  description: 'Official Women\'s Tennis Association channel. Match highlights, interviews, and player features from across the WTA Tour.',
  subscriberCount: '2.4M',
  videos: [
    { id: 'wEzxRO4QCJg', title: 'Pegula, Swiatek, Rybakina and More | Indian Wells Day 6 Highlights', channelName: 'WTA' },
    { id: '06VCqNeOK3Y', title: 'Kostyuk vs Rybakina | Indian Wells 2026 R3 Highlights', channelName: 'WTA' },
    { id: 'z8Sffkz5m8s', title: 'Madison Keys vs Kartal | Indian Wells 2026 R3 Highlights', channelName: 'WTA' },
    { id: '8GJF9OlAhdc', title: 'Sakkari vs Swiatek | Indian Wells 2026 R3 Highlights', channelName: 'WTA' },
    { id: 'L6tmpB_k8sY', title: 'Krueger vs Svitolina | Indian Wells 2026 R3 Highlights', channelName: 'WTA' },
    { id: 'HjJU_asNptQ', title: 'Andreeva vs Siniakova | Indian Wells 2026 R3 Highlights', channelName: 'WTA' },
    { id: 'XrM38bRHIU0', title: 'Mertens vs Bencic | Indian Wells 2026 R3 Highlights', channelName: 'WTA' },
    { id: 'vqz2Ql13RXU', title: 'Pegula vs Ostapenko | Indian Wells 2026 R3 Highlights', channelName: 'WTA' },
    { id: 'lghcKCU4jxM', title: 'Muchova vs Ruzic | Indian Wells 2026 R3 Highlights', channelName: 'WTA' },
    { id: '1GrjCqXPVZs', title: 'Elena Rybakina in Full Flow', channelName: 'WTA' },
    { id: 't1qaXXVUXds', title: 'Iga Swiatek Gets the Win Over Sakkari', channelName: 'WTA' },
    { id: 'DipG_08f-_Y', title: 'Golden Hour Win for Elina Svitolina', channelName: 'WTA' },
    { id: '2UkEYcF1Aic', title: 'Big Win for Katerina Siniakova', channelName: 'WTA' },
    { id: 'khQ0PnaElbk', title: 'Reflexes Too Good from Karolina Muchova', channelName: 'WTA' },
    { id: 'LP6uTUC0rkY', title: 'Just Karolina Muchova Things', channelName: 'WTA' },
    { id: '_O-4_IJFIjQ', title: 'When Sabalenka and Coco Met in Madrid | 2025 Final', channelName: 'WTA' },
    { id: 'maG9TzsuVeM', title: 'Alexandra Eala vs Iga Swiatek | 2025 Miami QF', channelName: 'WTA' },
    { id: '6eundltyRfk', title: 'Aryna Sabalenka vs Elena Rybakina | 2025 WTA Final', channelName: 'WTA' },
    { id: 'GxRhiRvlgzM', title: 'Sabalenka vs Andreeva | 2025 Indian Wells Final', channelName: 'WTA' },
  ],
};

// ---------------------------------------------------------------------------
// CATEGORY 2: Grand Slams
// ---------------------------------------------------------------------------

const rolandGarros: YouTubeChannel = {
  channelId: 'UCF3K1Jf8hjFW8qliei8fQ3A',
  name: 'Roland-Garros',
  description: 'Official channel of the French Open. Highlights, historic matches, and behind-the-scenes from the clay courts of Paris.',
  subscriberCount: '1.8M',
  videos: [
    { id: 'XOjJzo4A8DI', title: 'The Beginning of Coco Gauff\'s Roland-Garros Story', channelName: 'Roland-Garros' },
    { id: 'V6qc3RR3MJI', title: 'A Masterclass by Djokovic Against Alcaraz', channelName: 'Roland-Garros' },
    { id: 'H9TUZp5Tt5I', title: 'Sabalenka Just Cooked', channelName: 'Roland-Garros' },
    { id: 'hHo0qdW-lws', title: 'That Alcaraz Point', channelName: 'Roland-Garros' },
    { id: 'WStlWRrnEIY', title: 'Warm-up Before the 2024 Final: Swiatek vs Paolini', channelName: 'Roland-Garros' },
    { id: 'OH1oJz3wIl4', title: 'Federer vs Djokovic', channelName: 'Roland-Garros' },
    { id: 'b_RmFyFQTmU', title: 'Nadal\'s Last Winning Point at Roland-Garros', channelName: 'Roland-Garros' },
    { id: '3_XpaWkS060', title: 'Brilliant Defense Turn Into Offense by Paula Badosa', channelName: 'Roland-Garros' },
    { id: 'mICUGlQ86LQ', title: 'Best Moments of 2022 Final: Swiatek vs Gauff', channelName: 'Roland-Garros' },
    { id: 'XqXCDd_QRqQ', title: 'The Masterclass from Iga Swiatek | Roland-Garros 2022', channelName: 'Roland-Garros' },
    { id: 'EGAHAN7HKA8', title: 'Wawrinka vs Djokovic: Legendary Final Performance', channelName: 'Roland-Garros' },
    { id: 'V5T3sF-RdCs', title: '2015 — Stan Wawrinka Was Special', channelName: 'Roland-Garros' },
    { id: '-TUxF_hRyj8', title: 'Art in Motion', channelName: 'Roland-Garros' },
    { id: '1FHhpMn1LCA', title: 'Roland-Garros eSeries by Renault', channelName: 'Roland-Garros' },
    { id: 'X14ZbZc3zS0', title: 'Roland-Garros Junior Series in Brazil', channelName: 'Roland-Garros' },
    { id: 'gkIsvlZDG-Y', title: 'Rafael Nadal vs Novak Djokovic — Final Highlights | RG 2020', channelName: 'Roland-Garros' },
    { id: 'aERKJuBtIGw', title: 'Sinner vs Alcaraz — Final Highlights | Roland-Garros 2025', channelName: 'Roland-Garros' },
    { id: 'bjjJnuPReVY', title: 'Rafael Nadal vs Dominic Thiem — Final Highlights | RG 2019', channelName: 'Roland-Garros' },
    { id: 'LjDONWrr46I', title: 'Rafael Nadal Tribute Ceremony | Roland-Garros 2025', channelName: 'Roland-Garros' },
    { id: 'c7O8a68d_xM', title: 'Djokovic vs Tsitsipas — Final Highlights | RG 2021', channelName: 'Roland-Garros' },
  ],
};

const wimbledon: YouTubeChannel = {
  channelId: 'UCNa8NxMgSm7m4Ii9d4QGk1Q',
  name: 'Wimbledon',
  description: 'The official Wimbledon channel. Full match replays, classic moments, and behind-the-scenes at the All England Club.',
  subscriberCount: '2.1M',
  videos: [
    { id: 'r93mofOZuI4', title: 'Amazing First Set! Alcaraz vs Rublev Full First Set', channelName: 'Wimbledon' },
    { id: 'sLNj20CmTCM', title: 'The Story of Wimbledon 2025 | Official Film', channelName: 'Wimbledon' },
    { id: 'V2loalR7gC0', title: 'Best Points from Wimbledon 2025 | Ladies\' Singles', channelName: 'Wimbledon' },
    { id: 'wBbA9MrKL8Y', title: 'The VERY Best Points from Wimbledon 2025 | Gentlemen\'s Singles', channelName: 'Wimbledon' },
    { id: 'WwYUgljhpDA', title: 'Semi-final Scenes! Sabalenka vs Anisimova Full Final Set', channelName: 'Wimbledon' },
    { id: 'zvMdDXxyxpQ', title: 'BEST Grand Slam Doubles Points of 2025', channelName: 'Wimbledon' },
    { id: 'CAL7pHXI-3o', title: 'A TENSE Set! Sinner vs Alcaraz Final Set Replay', channelName: 'Wimbledon' },
    { id: 'w8L93jPG9Fo', title: 'Best Match of 2025? Sabalenka vs Raducanu Final Set', channelName: 'Wimbledon' },
    { id: 'fqnGopomoHA', title: 'Sinner vs Djokovic 2025 Semi-Final Full Deciding Set', channelName: 'Wimbledon' },
    { id: 'gQOgd-G3Caw', title: 'Try Not to LAUGH! Funniest Moments of Wimbledon 2025', channelName: 'Wimbledon' },
    { id: 'O0MKEhWTeWk', title: 'Gael Monfils Makes It Look Easy', channelName: 'Wimbledon' },
    { id: 'uOFxJwXtt_0', title: 'Superman Djokovic', channelName: 'Wimbledon' },
    { id: 'psTGGyhXrJ8', title: 'Ons Jabeur Moments to Make You Smile', channelName: 'Wimbledon' },
    { id: 'y3SiQlIVrdw', title: 'Wimbledon Nature Trivia Questions', channelName: 'Wimbledon' },
    { id: 'vn39b6Ns0O8', title: 'Wimbledon 2025 eChamps — Day 2', channelName: 'Wimbledon' },
    { id: 'wZnCcqm_g-E', title: 'Roger Federer vs Rafael Nadal | Wimbledon 2019 Full Match', channelName: 'Wimbledon' },
    { id: 'TUikJi0Qhhw', title: 'Novak Djokovic vs Roger Federer | Wimbledon 2019 Full Match', channelName: 'Wimbledon' },
    { id: 'mSywWtS9YfQ', title: 'Greatest Tiebreak? Epic Djokovic vs Federer | 2015 Final', channelName: 'Wimbledon' },
    { id: '5NmIav-DttI', title: 'Wimbledon\'s Funniest Moments', channelName: 'Wimbledon' },
    { id: '7nVOQyf-k3Y', title: 'Djokovic Relentless Against Rune | Wimbledon 2024', channelName: 'Wimbledon' },
  ],
};

const usOpen: YouTubeChannel = {
  channelId: 'UC7joGi4V3-r9i5tmmw7dM6g',
  name: 'US Open Tennis',
  description: 'Official US Open Tennis Championships channel. Highlights, full matches, and iconic moments from Flushing Meadows.',
  subscriberCount: '1.5M',
  videos: [
    { id: 'gz1i_VLkxSg', title: 'Half-Volley Delight!', channelName: 'US Open Tennis' },
    { id: 'gJvNrHsuuCE', title: 'Coco Gauff vs Madison Keys | 2022 US Open R3 Full Match', channelName: 'US Open Tennis' },
    { id: 'BbfsZ9aJ8EM', title: 'KILLER Winner from Korda!', channelName: 'US Open Tennis' },
    { id: 'Mey-VI4EeWc', title: 'FANTASTIC Lob from Fritz!', channelName: 'US Open Tennis' },
    { id: 'YcHveerMKxQ', title: 'Gauff Was SERIOUSLY Pumped Up!', channelName: 'US Open Tennis' },
    { id: 'S63gJTsLiXc', title: 'Daniil Medvedev vs Rafael Nadal | US Open 2019 Final Highlights', channelName: 'US Open Tennis' },
    { id: 'va-7PmXTKwk', title: '1 in 1 Million Moments | US Open', channelName: 'US Open Tennis' },
    { id: 'SEFnfcfvLkw', title: 'Carlos Alcaraz vs Casper Ruud | 2022 US Open Final', channelName: 'US Open Tennis' },
    { id: 'MEFpXBwnyQA', title: 'Daniil Medvedev vs Novak Djokovic | 2021 US Open Final', channelName: 'US Open Tennis' },
    { id: 'SJfDyNw9AUk', title: 'Jannik Sinner vs Carlos Alcaraz | 2025 US Open Final', channelName: 'US Open Tennis' },
    { id: '-SzPNvA8n4I', title: 'Greatest Trick Shots in History! | US Open', channelName: 'US Open Tennis' },
    { id: 'lGjvN4y5XFE', title: 'Daniil Medvedev vs Novak Djokovic | 2023 US Open Final', channelName: 'US Open Tennis' },
    { id: '9fScMWmYO1Y', title: 'Novak Djokovic vs Carlos Alcaraz | 2025 US Open Semifinal', channelName: 'US Open Tennis' },
    { id: 'TDdEVBgDqK4', title: 'Jannik Sinner vs Carlos Alcaraz Full Match | 2025 US Open Final', channelName: 'US Open Tennis' },
    { id: 'qwg_pIJlNtI', title: 'Ben Shelton vs Frances Tiafoe | 2023 US Open Quarterfinal', channelName: 'US Open Tennis' },
  ],
};

const australianOpen: YouTubeChannel = {
  channelId: 'UCeTKJSW1NTAkf27nNmjWt5A',
  name: 'Australian Open',
  description: 'Official Australian Open channel. Full matches, highlights, player interviews, and the best of the Happy Slam.',
  subscriberCount: '1.3M',
  videos: [
    { id: 'U6WhLVQQpPc', title: 'Bublik vs Etcheverry Full Match | AO 2026 Third Round', channelName: 'Australian Open' },
    { id: 'qQ_AlxOB7Z0', title: 'Learner Tien: "It Landed In a Soft Place In My Heart"', channelName: 'Australian Open' },
    { id: 'jTg5ehIXDJI', title: 'Noskova vs Wang Full Match | AO 2026 Third Round', channelName: 'Australian Open' },
    { id: 'CFBTtTL2qCs', title: 'Mensik vs Quinn Full Match | AO 2026 Third Round', channelName: 'Australian Open' },
    { id: 'FfyI1wYYiIA', title: 'Kalinskaya vs Swiatek Full Match | AO 2026 Third Round', channelName: 'Australian Open' },
    { id: 'P-NHvA-LooM', title: 'Van de Zandschulp vs Djokovic Full Match | AO 2026', channelName: 'Australian Open' },
    { id: '2cRHHvfhZNk', title: 'What is Tommy Haas\' Ideal On-Screen Role? | Pod Laver Arena', channelName: 'Australian Open' },
    { id: 'uAixIC408JA', title: 'Rybakina vs Valentova Full Match | AO 2026 Third Round', channelName: 'Australian Open' },
    { id: 'qe2WOgcHzcY', title: 'Cilic vs Ruud Full Match | AO 2026 Third Round', channelName: 'Australian Open' },
    { id: 'YugcSSunU4E', title: 'Sabalenka vs Mboko Full Match | AO 2026 Fourth Round', channelName: 'Australian Open' },
    { id: 'Et1ISRc1hT4', title: 'Barty with a BRILLIANT Smash!', channelName: 'Australian Open' },
    { id: 'I1cuhjGHoT8', title: 'CRAZY Defensive Winner!', channelName: 'Australian Open' },
    { id: 'BKP5aQmxJhc', title: 'EXCELLENT Volley from Eala!', channelName: 'Australian Open' },
    { id: 'pN7f5BWDODQ', title: 'CLINICAL at the Net from Shelton!', channelName: 'Australian Open' },
    { id: 'zeKNNE4JlX4', title: 'Clinical Volley Winner!', channelName: 'Australian Open' },
    { id: 'KTCDxjJvs2U', title: 'Federer vs Nadal Full Match | Australian Open 2017 Final', channelName: 'Australian Open' },
    { id: 'v27M_RgrLzU', title: 'Nadal vs Medvedev Extended Highlights | AO 2022 Final', channelName: 'Australian Open' },
    { id: '4Nk_whncZ20', title: 'Djokovic vs Nadal Extended Highlights | AO 2012 Final', channelName: 'Australian Open' },
    { id: 'zDn5WfnV5g0', title: 'Djokovic vs Sinner Extended Highlights | AO 2026 Semifinal', channelName: 'Australian Open' },
    { id: 'fBAd_Fu5Sps', title: 'Top 10 Ballkid Moments Ever! | Australian Open', channelName: 'Australian Open' },
  ],
};

// ---------------------------------------------------------------------------
// CATEGORY 3: News & Analysis
// ---------------------------------------------------------------------------

const tennisChannel: YouTubeChannel = {
  channelId: 'UCDitdIjOjS9Myza9I21IqzQ',
  name: 'Tennis Channel',
  description: 'The only 24-hour TV network dedicated to tennis. News, analysis, interviews, and live coverage of ATP and WTA events.',
  subscriberCount: '820K',
  videos: [
    { id: 'T3WIl2lgwDk', title: 'Alex Michelsen on Taylor Fritz Upset | Indian Wells 2026', channelName: 'Tennis Channel' },
    { id: 'KGA7Ydk3a_s', title: 'Casper Ruud Shares Connection with Newborn Daughter', channelName: 'Tennis Channel' },
    { id: 'RH0EKI070Cg', title: 'Jack Draper Can\'t Wait to Play Djokovic | Indian Wells 2026', channelName: 'Tennis Channel' },
    { id: 'q8XSR_WKXIw', title: 'Siniakova on Emotional Win vs Andreeva | Indian Wells 2026', channelName: 'Tennis Channel' },
    { id: 'gQDtyJnF3fg', title: 'Pegula\'s Publix Snack Haul with Player\'s Box Pod', channelName: 'Tennis Channel' },
    { id: 'CDrxVOKXdl8', title: 'Djokovic Played Golf with Alcaraz & Zverev | Indian Wells', channelName: 'Tennis Channel' },
    { id: '4B0Gp2SfBnc', title: 'Alex Eala on WTA Friendships | Indian Wells 2026', channelName: 'Tennis Channel' },
    { id: '3a4E4W4lS0k', title: 'Hannah Berner, Eubanks & Vandeweghe Test Serve Speeds', channelName: 'Tennis Channel' },
    { id: 'SlFn8Opmzjg', title: 'Learner Tien Cramps After Defeating Ben Shelton | TC Live', channelName: 'Tennis Channel' },
    { id: 'hovglpTK838', title: 'Coco Gauff Forced to Retire Against Alex Eala', channelName: 'Tennis Channel' },
    { id: 'dg_6RRvYhzY', title: 'Arthur Fils Enjoyed Life Outside Tennis | Indian Wells 2026', channelName: 'Tennis Channel' },
    { id: '282A5zliRsY', title: 'Nole Back at the Desk', channelName: 'Tennis Channel' },
    { id: 'RXsAQ_0ujhs', title: 'Girlhood: Alex Eala', channelName: 'Tennis Channel' },
    { id: 'OhVjvUuEHqc', title: 'This Doubles Duo: Sinner & Opelka', channelName: 'Tennis Channel' },
    { id: 'jXRRpWBLXTw', title: 'We\'re Obsessed', channelName: 'Tennis Channel' },
  ],
};

const tennisPodcast: YouTubeChannel = {
  channelId: 'UC9ZPFOiLoEeOBJseKICaFFQ',
  name: 'The Tennis Podcast',
  description: 'Award-winning tennis podcast. Deep dives into the stories, drama, and characters that shape the sport.',
  subscriberCount: '95K',
  videos: [
    { id: 'PDyHzvhNv4s', title: 'Indian Wells — The Story So Far', channelName: 'The Tennis Podcast' },
    { id: 'ghB-qw3D-a8', title: 'Tennis Rocked by World Events. What Now?', channelName: 'The Tennis Podcast' },
    { id: 'XVbtUKpHauA', title: 'Alcaraz Wins 12 in a Row & Fils-Ivanisevic Inside Story', channelName: 'The Tennis Podcast' },
    { id: '4qZoHlAQpnA', title: 'Muchova\'s Moment — The First of Many?', channelName: 'The Tennis Podcast' },
    { id: 'O94tL_8EogY', title: 'What\'s Happened Since the Australian Open?', channelName: 'The Tennis Podcast' },
    { id: '8tFu3vV_peo', title: 'Carlos Alcaraz: History Boy | Aus Open Day 15', channelName: 'The Tennis Podcast' },
    { id: '3JukaROMr4M', title: 'Rybakina\'s Extraordinary Power of Calm at the AO', channelName: 'The Tennis Podcast' },
    { id: 'YQSLRF1KW0M', title: 'Is Fonseca Playing with a Point to Prove?', channelName: 'The Tennis Podcast' },
    { id: 'mxXj7aqn7I0', title: 'Are We About to Witness an All-Time Great Season from Alcaraz?', channelName: 'The Tennis Podcast' },
    { id: 'BMym-58k_yM', title: 'Matt Has the Tea on the Big Dutch Drama', channelName: 'The Tennis Podcast' },
    { id: '-btmZP5s_mY', title: 'Why Is Emma Raducanu a Lightning Rod for Hate?', channelName: 'The Tennis Podcast' },
    { id: 'lPoESXmQL3s', title: 'Coming Close to Glory Could Fuel Djokovic\'s Determination', channelName: 'The Tennis Podcast' },
    { id: '4EjasCTlExM', title: 'Freaky Friday Role Reversal Secures History for Alcaraz', channelName: 'The Tennis Podcast' },
    { id: '4xl0e-tCEdo', title: 'AO Final Could Be Djokovic\'s Last Best Chance for 25', channelName: 'The Tennis Podcast' },
    { id: 'xPprCNPqlrg', title: 'Why Did the Dubai Doubles Final Go Ahead on Saturday?', channelName: 'The Tennis Podcast' },
  ],
};

const intuitiveTennis: YouTubeChannel = {
  channelId: 'UCtak3C1t8k3u8CVzVGYvemA',
  name: 'Intuitive Tennis',
  description: 'Tennis analysis, technique breakdowns, and tournament commentary. Tips, drills, and match reviews from a coaching perspective.',
  subscriberCount: '180K',
  videos: [
    { id: 'PZpUtWivExk', title: 'Eala Advances as Gauff Retires; Fonseca Blows Paul Off Court', channelName: 'Intuitive Tennis' },
    { id: 'N2hoEVPjx8s', title: 'Djokovic Overcomes Poor Start; Alcaraz Too Good for Dimitrov', channelName: 'Intuitive Tennis' },
    { id: 'KaVcaEek_UM', title: 'Why the Wrist Does NOT Generate Forehand Topspin', channelName: 'Intuitive Tennis' },
    { id: 'oKldeqNkrA4', title: 'Do NOT Snap or Roll Your Wrist for Forehand Topspin', channelName: 'Intuitive Tennis' },
    { id: 'bDjyaKgNueI', title: 'Topspin Forehand Wrist & Forearm Biomechanics', channelName: 'Intuitive Tennis' },
    { id: '68NBR0pI5iA', title: '2026 Indian Wells ATP 1000 Preview', channelName: 'Intuitive Tennis' },
    { id: 'vSn3g6ktqxA', title: '1-H vs 2-H | Which Backhand Has More Power Potential?', channelName: 'Intuitive Tennis' },
    { id: 'Yqf3pPEDNzw', title: 'Did Babolat Ruin the NEW Pure Aero 98?', channelName: 'Intuitive Tennis' },
    { id: '-STUOXWfOdk', title: 'Medvedev & Cobolli Take ATP 500 Titles in Dubai & Acapulco', channelName: 'Intuitive Tennis' },
    { id: '69nrFPJ3e5E', title: 'Finish with Dominant Hand ABOVE Dominant Shoulder', channelName: 'Intuitive Tennis' },
    { id: 'u2fp8i6ZKk8', title: 'Can AI Coaching Be a Substitute for REAL Tennis Coaching?', channelName: 'Intuitive Tennis' },
    { id: '7l7GzqT3Bwo', title: 'Role of the Hips on Forehand, Backhands and Serve', channelName: 'Intuitive Tennis' },
    { id: '3BAxgOJrqPI', title: 'Forehand Preparation Should be Early & Continuous', channelName: 'Intuitive Tennis' },
    { id: 'pODBeYVExZA', title: 'I Taught Karla How to Teach Me to Serve Lefty', channelName: 'Intuitive Tennis' },
    { id: 'YBhCA8DR1_E', title: 'Eala Outlasts Yastremska; Sinner Destroys Svrcina', channelName: 'Intuitive Tennis' },
  ],
};

// ---------------------------------------------------------------------------
// CATEGORY 4: Training & Coaching
// ---------------------------------------------------------------------------

const essentialTennis: YouTubeChannel = {
  channelId: 'UCeCmnibUIaXUI1WEbUO7lVw',
  name: 'Essential Tennis',
  description: 'World-class tennis instruction by Ian Westermann. Serve tips, forehand fixes, match analysis, and drills for all levels.',
  subscriberCount: '550K',
  videos: [
    { id: 'ldWej3eMPGk', title: 'You\'re TWO Tennis Players (Only One Is Good)', channelName: 'Essential Tennis' },
    { id: '1MZOheLz7zc', title: 'Why Your Flat Serve Is Weak', channelName: 'Essential Tennis' },
    { id: '7ZtFK-KdOg0', title: 'How to Train FLAT and SLICE Serve Delivery', channelName: 'Essential Tennis' },
    { id: 'wqFfygqEcr0', title: 'Why Your "Flat Serve" Has No Pace', channelName: 'Essential Tennis' },
    { id: 'pleVIcffQRU', title: 'How to Add 15mph to Your Serve', channelName: 'Essential Tennis' },
    { id: 'nz9dVqHVjfQ', title: 'Add 15 MPH to Your Serve in 10 Minutes', channelName: 'Essential Tennis' },
    { id: 'o0o0EJ1EU04', title: 'How to FIX Your Forehand Spacing', channelName: 'Essential Tennis' },
    { id: 'TCxBrdhJRk8', title: 'Why You\'re NOT Getting Better at Tennis', channelName: 'Essential Tennis' },
    { id: 'Stgj0R7NOcQ', title: 'Tension is WRECKING Your Forehand (But You Can Fix It)', channelName: 'Essential Tennis' },
    { id: 'mFL7JylHJcM', title: 'How to Control the DEPTH of Your Volleys', channelName: 'Essential Tennis' },
    { id: '3R-n7IU48ms', title: 'Hit Perfect Volleys at ANY Height', channelName: 'Essential Tennis' },
    { id: 'xTrBNOXzUOY', title: 'Top 3 Most Common Volley Mistakes', channelName: 'Essential Tennis' },
    { id: 'aML065nQnUQ', title: 'How to FIX Your Volley Accuracy and Consistency', channelName: 'Essential Tennis' },
    { id: 'rr7rR-66fok', title: 'How to TRANSFORM Your Volleys', channelName: 'Essential Tennis' },
    { id: 'YLy1tX0zvBU', title: 'You\'ve Been Hitting Volleys WRONG', channelName: 'Essential Tennis' },
  ],
};

const topTennisTraining: YouTubeChannel = {
  channelId: 'UCT4PpIx1TWzgzi4gZKaZamA',
  name: 'Top Tennis Training',
  description: 'Pro footage in super slow motion. Analyze the technique of Federer, Nadal, Djokovic, and more. Perfect your strokes.',
  subscriberCount: '320K',
  videos: [
    { id: 'v2B1ZGMjX-0', title: 'Novak Djokovic High Finish On Forehand', channelName: 'Top Tennis Training' },
    { id: 'BqO30nZbvgo', title: 'Ferrero Sliding Forehand', channelName: 'Top Tennis Training' },
    { id: 'fVdHbwzsrk4', title: 'Ferrero Backhand Slow Motion', channelName: 'Top Tennis Training' },
    { id: 'ZrQ0FJ-Kn3M', title: 'Agassi Forehands from Different Angles', channelName: 'Top Tennis Training' },
    { id: 'YIaE5DzwOdQ', title: 'Juan Carlos Ferrero Forehands Slow Motion', channelName: 'Top Tennis Training' },
    { id: 'v1eq9X3lOho', title: 'Roger Federer Sliding Forehand Slow Motion', channelName: 'Top Tennis Training' },
    { id: 'yWBuuG4Gzzc', title: 'Gustavo Kuerten Guga Forehand Slow Motion', channelName: 'Top Tennis Training' },
    { id: 'Rpy0b91g8rw', title: 'Roger Federer Serve Slow Motion Side View', channelName: 'Top Tennis Training' },
    { id: 'yz2lwGJwiEQ', title: 'Juan Carlos Ferrero Serve Slow Motion', channelName: 'Top Tennis Training' },
    { id: '0FnZBt6hiNE', title: 'Andre Agassi Running Forehand Slow Motion', channelName: 'Top Tennis Training' },
    { id: 'cnnKt_SeJ6s', title: 'Andre Agassi Forehand Slow Motion Side View', channelName: 'Top Tennis Training' },
    { id: 'Ro_fQ2te5Yw', title: 'Novak Djokovic Fitness Training', channelName: 'Top Tennis Training' },
    { id: 'PrDjDAja1cw', title: 'Tomas Berdych Split-Step on Return Slow Motion', channelName: 'Top Tennis Training' },
    { id: '17JXZtFyslw', title: 'Tomas Berdych Split-Step on Return', channelName: 'Top Tennis Training' },
    { id: 'rLX0Y2H1m9o', title: 'Andre Agassi Forehand Return Slow Motion', channelName: 'Top Tennis Training' },
  ],
};

const functionalTennis: YouTubeChannel = {
  channelId: 'UC5LvAVo8fSKuEMsBN7s7ZhA',
  name: 'Functional Tennis',
  description: 'Innovative tennis coaching tools, pro player warm-ups, and match analysis. Home of the Saber training racket.',
  subscriberCount: '210K',
  videos: [
    { id: 'gKULRde2SBU', title: 'Reaction Ball Warmup Exercises', channelName: 'Functional Tennis' },
    { id: 'BYxU_0y8DY8', title: 'Dimitrov Clay Court Warmup — Full On-Court Warmup', channelName: 'Functional Tennis' },
    { id: 'AUT06D6ZOAI', title: 'The Story Behind the World\'s Most Famous Tennis Toilet', channelName: 'Functional Tennis' },
    { id: 'pHf2SoYWbFE', title: 'Jannik Sinner Full On-Court Warm Up in Monte Carlo 2024', channelName: 'Functional Tennis' },
    { id: 'jD1Z8cfvuk8', title: 'Long Live the One-Handed Backhand', channelName: 'Functional Tennis' },
    { id: '7zzqlLGeb-4', title: 'The Best Movers Are the Best Players', channelName: 'Functional Tennis' },
    { id: 'iIxcGs_jd0A', title: '5-Minute Match Point at Under 14 Tennis Europe Masters', channelName: 'Functional Tennis' },
    { id: 'fMI5tOqmb58', title: 'French Open Prize Money 2025', channelName: 'Functional Tennis' },
    { id: 'ErsWwcpEpf0', title: '12-Year-Old Liam Dent', channelName: 'Functional Tennis' },
    { id: 'iYc_QDTqCN0', title: 'One-Handed Backhand Winner with the Saber Racket', channelName: 'Functional Tennis' },
    { id: 'tXMDFpUsrDs', title: 'How Manufacturers Grip Tennis Rackets in Bulk', channelName: 'Functional Tennis' },
    { id: 'dW4JkI7mOYI', title: 'How to String the Functional Tennis Saber', channelName: 'Functional Tennis' },
    { id: '_ce0ZBZahTU', title: '7-Year-Old Striking with the Saber Junior', channelName: 'Functional Tennis' },
    { id: 'BllkvN0J3U8', title: 'Saber vs Saber', channelName: 'Functional Tennis' },
    { id: 'lMfZirEDEd4', title: 'Saber vs Saber | CRUSHING the Forehand', channelName: 'Functional Tennis' },
  ],
};

// ---------------------------------------------------------------------------
// CATEGORY 5: Player Vlogs
// ---------------------------------------------------------------------------

const benShelton: YouTubeChannel = {
  channelId: 'UCNes26KJrwooRadnxzJfcPA',
  name: 'Ben Shelton',
  description: 'The Long Game docuseries. Behind-the-scenes with ATP star Ben Shelton: training, travel, and life on tour.',
  subscriberCount: '85K',
  videos: [
    { id: 'SbBWDkcKnC4', title: 'Same Team, One Goal', channelName: 'Ben Shelton' },
    { id: '1CCL85tdo1U', title: 'My Australian Open Run. Failure Only Fuels Me', channelName: 'Ben Shelton' },
    { id: 'M95GqTYmM2A', title: '1992', channelName: 'Ben Shelton' },
    { id: 'BSzneTQ1BUY', title: 'Small Tweaks', channelName: 'Ben Shelton' },
    { id: 'ncL9UFJPkTI', title: 'Meet Koda', channelName: 'Ben Shelton' },
    { id: 'qKqrxBQgaF8', title: 'Offseason and Australia Preparation | The Long Game', channelName: 'Ben Shelton' },
    { id: '11EPkI0KdAY', title: 'Who Gave Trinity the Mic? The Long Game Episode 1 Out Now', channelName: 'Ben Shelton' },
    { id: '4gDkwHWrWmY', title: 'The Long Game | 2025 US Open & ATP Championships', channelName: 'Ben Shelton' },
    { id: 'n9rdisapxSc', title: 'I\'m Ben Shelton. Welcome to My Channel.', channelName: 'Ben Shelton' },
  ],
};

// ---------------------------------------------------------------------------
// CATEGORY 6: Fun & Entertainment
// ---------------------------------------------------------------------------
// (uses Wimbledon funny videos, Functional Tennis fun, Tennis Channel clips)
// We gather them from existing channels to form an entertainment section

// ---------------------------------------------------------------------------
// CATEGORIES
// ---------------------------------------------------------------------------

export const videoCategories: VideoCategory[] = [
  {
    id: 'highlights',
    label: 'Tour Highlights',
    description: 'Official ATP and WTA match highlights, hot shots, and the best moments from the tour',
    accentColor: '#2563eb',
    channels: [tennisTv, wta],
  },
  {
    id: 'grand-slams',
    label: 'Grand Slams',
    description: 'Official channels of the four Grand Slam tournaments — Australian Open, Roland-Garros, Wimbledon, and the US Open',
    accentColor: '#059669',
    channels: [australianOpen, rolandGarros, wimbledon, usOpen],
  },
  {
    id: 'analysis',
    label: 'News & Analysis',
    description: 'In-depth tennis analysis, commentary, interviews, and the stories behind the results',
    accentColor: '#7c3aed',
    channels: [tennisChannel, tennisPodcast, intuitiveTennis],
  },
  {
    id: 'coaching',
    label: 'Training & Coaching',
    description: 'Improve your game with tips, drills, slow-motion technique analysis, and coaching advice',
    accentColor: '#0891b2',
    channels: [essentialTennis, topTennisTraining, functionalTennis],
  },
  {
    id: 'vlogs',
    label: 'Player Vlogs',
    description: 'Behind the scenes with today\'s top players — travel, training, and life on the ATP and WTA tour',
    accentColor: '#dc2626',
    channels: [benShelton],
  },
  {
    id: 'entertainment',
    label: 'Fun & Entertainment',
    description: 'The lighter side of tennis — funny moments, viral clips, and entertaining compilations',
    accentColor: '#d97706',
    channels: [
      {
        channelId: 'UCNa8NxMgSm7m4Ii9d4QGk1Q',
        name: 'Wimbledon',
        description: 'Funniest moments and viral clips from The Championships.',
        subscriberCount: '2.1M',
        videos: [
          { id: 'gQOgd-G3Caw', title: 'Try Not to LAUGH! Funniest Moments of Wimbledon 2025', channelName: 'Wimbledon' },
          { id: '5NmIav-DttI', title: 'Wimbledon\'s Funniest Moments', channelName: 'Wimbledon' },
          { id: 'O0MKEhWTeWk', title: 'Gael Monfils Makes It Look Easy', channelName: 'Wimbledon' },
          { id: 'uOFxJwXtt_0', title: 'Superman Djokovic', channelName: 'Wimbledon' },
          { id: 'psTGGyhXrJ8', title: 'Ons Jabeur Moments to Make You Smile', channelName: 'Wimbledon' },
          { id: 'y3SiQlIVrdw', title: 'Wimbledon Nature Trivia Questions', channelName: 'Wimbledon' },
          { id: 'wDSk5zYeys4', title: 'Incredible 13-Minute Game | Raducanu vs Sabalenka', channelName: 'Wimbledon' },
        ],
      },
      {
        channelId: 'UCbcxFkd6B9xUU54InHv4Tig',
        name: 'Tennis TV',
        description: 'The lighter side of ATP — funny moments, fails, and personality clips.',
        subscriberCount: '3.2M',
        videos: [
          { id: '0y7UGYdg7lw', title: 'The Greatest Showman', channelName: 'Tennis TV' },
          { id: '1uNAtduuoA8', title: 'There\'s A Real Buzz About Carlos Alcaraz', channelName: 'Tennis TV' },
          { id: 'RYkGC4ojefM', title: 'Djokovic & Tsitsipas Team Up For Doubles', channelName: 'Tennis TV' },
          { id: 'OXaEUUUJJ7s', title: '25 Tennis Shots SO GOOD the Opponent Had to Applaud', channelName: 'Tennis TV' },
          { id: '-rL_bBpTcps', title: 'Top 10 Funny ATP Tennis Moments', channelName: 'Tennis TV' },
          { id: '_HHcRJ-rPCo', title: '27 Unique Nick Kyrgios ATP Tennis Moments!', channelName: 'Tennis TV' },
          { id: 'VW-4A-QUDWY', title: 'Top 10 Tennis Crowd Interaction Moments', channelName: 'Tennis TV' },
          { id: 'j7mP-99u3Hw', title: 'FUNNIEST Moments From The 2024 ATP Season', channelName: 'Tennis TV' },
          { id: 'rWMQJEf3pL8', title: 'TOP 50 EPIC GAEL MONFILS ATP SHOTS!', channelName: 'Tennis TV' },
        ],
      },
      {
        channelId: 'UC5LvAVo8fSKuEMsBN7s7ZhA',
        name: 'Functional Tennis',
        description: 'Creative tennis challenges, reaction drills, and fun content.',
        subscriberCount: '210K',
        videos: [
          { id: 'AUT06D6ZOAI', title: 'The Story Behind the World\'s Most Famous Tennis Toilet', channelName: 'Functional Tennis' },
          { id: 'iIxcGs_jd0A', title: '5-Minute Match Point at Under 14 Tennis Europe Masters', channelName: 'Functional Tennis' },
          { id: 'BllkvN0J3U8', title: 'Saber vs Saber', channelName: 'Functional Tennis' },
          { id: 'lMfZirEDEd4', title: 'Saber vs Saber | CRUSHING the Forehand', channelName: 'Functional Tennis' },
        ],
      },
      {
        channelId: 'UC7joGi4V3-r9i5tmmw7dM6g',
        name: 'US Open Tennis',
        description: 'Classic Grand Slam finals, trick shots, and unforgettable moments from Flushing Meadows.',
        subscriberCount: '1.5M',
        videos: [
          { id: 'va-7PmXTKwk', title: '1 in 1 Million Moments | US Open', channelName: 'US Open Tennis' },
          { id: '-SzPNvA8n4I', title: 'Greatest Trick Shots in History! | US Open', channelName: 'US Open Tennis' },
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// TOURNAMENT-SPECIFIC VIDEOS
// ---------------------------------------------------------------------------

export const tournamentVideos: Record<string, YouTubeVideo[]> = {
  'australian-open-guide': [
    { id: 'U6WhLVQQpPc', title: 'Bublik vs Etcheverry Full Match | AO 2026', channelName: 'Australian Open' },
    { id: 'FfyI1wYYiIA', title: 'Kalinskaya vs Swiatek Full Match | AO 2026', channelName: 'Australian Open' },
    { id: 'P-NHvA-LooM', title: 'Van de Zandschulp vs Djokovic Full Match | AO 2026', channelName: 'Australian Open' },
    { id: 'YugcSSunU4E', title: 'Sabalenka vs Mboko Full Match | AO 2026', channelName: 'Australian Open' },
  ],
  'roland-garros-guide': [
    { id: 'XOjJzo4A8DI', title: 'The Beginning of Coco Gauff\'s Roland-Garros Story', channelName: 'Roland-Garros' },
    { id: 'V6qc3RR3MJI', title: 'A Masterclass by Djokovic Against Alcaraz', channelName: 'Roland-Garros' },
    { id: 'XqXCDd_QRqQ', title: 'The Masterclass from Iga Swiatek | RG 2022', channelName: 'Roland-Garros' },
    { id: 'b_RmFyFQTmU', title: 'Nadal\'s Last Winning Point at Roland-Garros', channelName: 'Roland-Garros' },
  ],
  'wimbledon-guide': [
    { id: 'sLNj20CmTCM', title: 'The Story of Wimbledon 2025 | Official Film', channelName: 'Wimbledon' },
    { id: 'wBbA9MrKL8Y', title: 'The VERY Best Points from Wimbledon 2025', channelName: 'Wimbledon' },
    { id: 'CAL7pHXI-3o', title: 'Sinner vs Alcaraz Final Set Replay', channelName: 'Wimbledon' },
    { id: 'fqnGopomoHA', title: 'Sinner vs Djokovic 2025 Semi-Final Full Deciding Set', channelName: 'Wimbledon' },
  ],
  'us-open-guide': [
    { id: 'SJfDyNw9AUk', title: 'Sinner vs Alcaraz | 2025 US Open Final', channelName: 'US Open Tennis' },
    { id: 'S63gJTsLiXc', title: 'Medvedev vs Nadal | 2019 US Open Final Highlights', channelName: 'US Open Tennis' },
    { id: 'SEFnfcfvLkw', title: 'Alcaraz vs Ruud | 2022 US Open Final', channelName: 'US Open Tennis' },
    { id: 'MEFpXBwnyQA', title: 'Medvedev vs Djokovic | 2021 US Open Final', channelName: 'US Open Tennis' },
  ],
  'indian-wells-guide': [
    { id: 'jVM-23iyFvg', title: 'Alcaraz, Djokovic, Draper & Bublik | Indian Wells 2026', channelName: 'Tennis TV' },
    { id: 'SOZF-mdDIBg', title: 'Alcaraz vs Dimitrov | Indian Wells 2026', channelName: 'Tennis TV' },
    { id: 'D3Ezm-6gr8Q', title: 'Alcaraz vs Medvedev For The Title | Indian Wells 2023 Final', channelName: 'Tennis TV' },
    { id: 'r_u4fVOD9Ng', title: 'Rune vs Draper For The Title | Indian Wells 2025 Final', channelName: 'Tennis TV' },
  ],
  'atp-finals-guide': [
    { id: '2n70tHqPWDQ', title: 'Sinner vs Alcaraz For The Title | ATP Finals 2025', channelName: 'Tennis TV' },
    { id: 'lWpvAhyK2go', title: 'EPIC Djokovic vs Sinner | ATP Finals 2023', channelName: 'Tennis TV' },
    { id: 'BO9S2WB8I64', title: 'Djokovic vs Sinner For The Title! | ATP Finals 2023 Final', channelName: 'Tennis TV' },
    { id: 'dvSN1tmNJnQ', title: 'Sinner vs Ben Shelton | ATP Finals 2025', channelName: 'Tennis TV' },
  ],
  'miami-open-guide': [
    { id: 'X00UI4vOKLU', title: 'Sinner & Alcaraz EPIC Match | Miami 2023', channelName: 'Tennis TV' },
    { id: 'thEt28eCkJc', title: 'Alcaraz vs Ruud For The Title | Miami 2022 Final', channelName: 'Tennis TV' },
    { id: 'W_lTYpPp3Ig', title: 'Sinner vs Dimitrov For The Title | Miami 2024 Final', channelName: 'Tennis TV' },
    { id: 'NfPR1FdjtcM', title: 'Djokovic vs Mensik For The Title | Miami 2025 Final', channelName: 'Tennis TV' },
  ],
  'monte-carlo-masters-guide': [
    { id: 'pHf2SoYWbFE', title: 'Jannik Sinner Full On-Court Warm Up in Monte Carlo 2024', channelName: 'Functional Tennis' },
  ],
};
