// =============================================================================
// YouTube channels and video data for the /video/ section and homepage
// Video pool: ~180 real video IDs for rotation. Updated manually or via script.
// =============================================================================

export interface YouTubeVideo {
  id: string;
  title: string;
  channelName: string;
  description?: string;
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
    // Monte Carlo 2026
    { id: 'dQUKOY8D3IE', title: 'Carlos Alcaraz vs Jannik Sinner FIRST Final of 2026 | Monte-Carlo Highlights', channelName: 'Tennis TV', description: 'Sinner defeats Alcaraz in their first final of 2026 to claim the Rolex Monte-Carlo Masters title on clay.' },
    { id: 'IhwyJr8DGj0', title: 'Court-Level For Alcaraz vs Sinner Final | Monte-Carlo 2026 Highlights', channelName: 'Tennis TV', description: 'Breathtaking court-level footage of the Alcaraz vs Sinner Monte-Carlo 2026 final — the clay season\'s opening blockbuster.' },
    { id: 'LlPnS5VBUiU', title: 'Alcaraz & Sinner Kick Off Clay Season | Monte Carlo 2026 Highlights', channelName: 'Tennis TV', description: 'Alcaraz and Sinner launch the clay season in style at Monte Carlo 2026, setting up a thrilling title run.' },
    { id: 'G4wnT48PWFc', title: 'Behind-The-Scenes With Sinner After 2026 Monte-Carlo Triumph', channelName: 'Tennis TV', description: 'Exclusive behind-the-scenes access with Jannik Sinner as he celebrates his Rolex Monte-Carlo Masters 2026 victory.' },
    { id: 'jXGPfh79Zr8', title: 'Tomas Machac Faces Jannik Sinner In Last 16 | Monte-Carlo 2026 Highlights', channelName: 'Tennis TV', description: 'Tomas Machac pushes world number one Jannik Sinner in a competitive Monte-Carlo 2026 round of 16 encounter.' },
    // Madrid 2026
    { id: 'QZQzjHxGUi8', title: 'Sinner, Ruud, Medvedev, Zverev & More Seek QF Spots | Madrid 2026 Highlights', channelName: 'Tennis TV', description: 'Extended Madrid 2026 highlights as Sinner, Ruud, Medvedev, and Zverev battle for quarterfinal places at La Caja Mágica.' },
    { id: 'HKhR3ces3bE', title: 'Jannik Sinner vs Rafael Jodar | Madrid 2026 QF Highlights', channelName: 'Tennis TV', description: 'Jannik Sinner defeats local wildcard Rafael Jodar in front of a partisan Madrid crowd to reach the 2026 semifinals.' },
    { id: 'U_Ua0FP1lsk', title: 'Ben Shelton vs Dino Prizmic 3-Hour Thriller! | Madrid 2026 Highlights', channelName: 'Tennis TV', description: 'Ben Shelton and Dino Prizmic produce an extraordinary three-hour battle at the 2026 Madrid Open.' },
    { id: 'TQxOe4PiB3c', title: 'Daniil Medvedev Battles Flavio Cobolli | Madrid 2026 Highlights', channelName: 'Tennis TV', description: 'Daniil Medvedev faces Flavio Cobolli in a high-intensity clay court encounter at the 2026 Madrid Open.' },
    { id: 'dF6J0-Jr8ig', title: 'Alexander Zverev Takes on Terence Atmane | Madrid 2026 Highlights', channelName: 'Tennis TV', description: 'Alexander Zverev faces French youngster Terence Atmane at the 2026 Madrid Open in a clay court clash.' },
    { id: '66BYGufN7SU', title: 'Tsitsipas, Monfils, Dimitrov & More in Action | Madrid 2026 Day 2', channelName: 'Tennis TV', description: 'Day 2 action from Madrid 2026 featuring Tsitsipas, Monfils, and Dimitrov all in action at La Caja Mágica.' },
    // Indian Wells 2026 — selected
    { id: 'jVM-23iyFvg', title: 'Alcaraz, Djokovic, Draper & Bublik | Indian Wells 2026 Highlights', channelName: 'Tennis TV', description: 'Extended highlights package featuring Alcaraz, Djokovic, Draper, and Bublik from the 2026 Indian Wells BNP Paribas Open.' },
    { id: 'SOZF-mdDIBg', title: 'Carlos Alcaraz vs Grigor Dimitrov | Indian Wells 2026', channelName: 'Tennis TV', description: 'Carlos Alcaraz faces Grigor Dimitrov in a high-quality quarterfinal encounter at the 2026 Indian Wells Masters.' },
    { id: '0y7UGYdg7lw', title: 'The Greatest Showman', channelName: 'Tennis TV', description: 'A tribute to Gael Monfils, the ultimate showman of tennis, featuring his most jaw-dropping ATP moments.' },
    { id: 'uumPWNvZqiY', title: 'Joao Fonseca Practices Live In Indian Wells', channelName: 'Tennis TV', description: 'Brazilian teenager Joao Fonseca shows off his exceptional skills and potential during live practice at Indian Wells 2026.' },
    { id: '1uNAtduuoA8', title: 'There\'s A Real Buzz About Carlos Alcaraz', channelName: 'Tennis TV', description: 'Players and fans react to Carlos Alcaraz\'s electrifying form and personality that has the tennis world talking.' },
    // Timeless classics
    { id: 'OXaEUUUJJ7s', title: '25 Tennis Shots SO GOOD the Opponent Had to Applaud', channelName: 'Tennis TV', description: 'A compilation of 25 incredible ATP shots so brilliant that even the opponents couldn\'t help but clap.' },
    { id: 'W2N0eGIZV-8', title: 'Top 100 Roger Federer Career ATP Points!', channelName: 'Tennis TV', description: 'A celebration of Roger Federer\'s 100 greatest points across his legendary ATP career.' },
    { id: 'T-GSp2Nuvrk', title: 'Rafael Nadal: Top 100 ATP Shots!', channelName: 'Tennis TV', description: 'The 100 most breathtaking shots from Rafael Nadal\'s remarkable career on the ATP Tour.' },
    { id: '2n70tHqPWDQ', title: 'Sinner vs Alcaraz For The Title | ATP Finals 2025', channelName: 'Tennis TV', description: 'Jannik Sinner and Carlos Alcaraz battle for the ATP Finals 2025 title in an epic season-ending clash.' },
    { id: 'ne6hTv4SrvI', title: 'TOP 50 ATP SHOTS & RALLIES OF 2010s DECADE!', channelName: 'Tennis TV', description: 'The 50 most unforgettable ATP shots and rallies from an iconic decade of men\'s professional tennis.' },
  ],
};

const wta: YouTubeChannel = {
  channelId: 'UCaBIVVpHjq6j3tSyxwTE-8Q',
  name: 'WTA',
  description: 'Official Women\'s Tennis Association channel. Match highlights, interviews, and player features from across the WTA Tour.',
  subscriberCount: '2.4M',
  videos: [
    // Madrid 2026
    { id: 'lkgQ2qc9kJs', title: 'Aryna Sabalenka vs Naomi Osaka | 2026 Madrid R16 Highlights', channelName: 'WTA', description: 'Aryna Sabalenka faces Naomi Osaka in a high-profile round of 16 clash at the 2026 WTA Madrid Open.' },
    { id: '5dJSS-Vb-Ts', title: 'Aryna Sabalenka vs Hailey Baptiste | 2026 Madrid QF Highlights', channelName: 'WTA', description: 'Aryna Sabalenka battles Hailey Baptiste in the 2026 Madrid Open quarterfinals at La Caja Mágica.' },
    { id: '2bgJVeZaACc', title: 'Leylah Fernandez vs Mirra Andreeva | 2026 Madrid QF Highlights', channelName: 'WTA', description: 'Leylah Fernandez takes on Mirra Andreeva in an exciting quarterfinal at the 2026 WTA Madrid Open.' },
    { id: 'ukrX1TdCuoQ', title: 'Marta Kostyuk vs Linda Noskova | 2026 Madrid QF Highlights', channelName: 'WTA', description: 'Marta Kostyuk and Linda Noskova contest a quarterfinal place at the 2026 WTA Madrid Open.' },
    { id: '864f1Y_cLX0', title: 'Anastasia Potapova vs Elena Rybakina | 2026 Madrid R16 Highlights', channelName: 'WTA', description: 'Anastasia Potapova upsets clay favourite Elena Rybakina in the round of 16 at the 2026 Madrid Open.' },
    { id: 'VauZH5s3cRo', title: 'Karolina Pliskova vs Anastasia Potapova | 2026 Madrid QF Highlights', channelName: 'WTA', description: 'Karolina Pliskova and Anastasia Potapova battle for a semifinal spot at the 2026 WTA Madrid Open.' },
    { id: 'RqWjakZ-lEk', title: 'Anastasia Potapova vs Jelena Ostapenko | 2026 Madrid R3 Highlights', channelName: 'WTA', description: 'Anastasia Potapova and Jelena Ostapenko deliver explosive clay court tennis in the 2026 Madrid Open third round.' },
    // Indian Wells 2026 — selected
    { id: 'wEzxRO4QCJg', title: 'Pegula, Swiatek, Rybakina and More | Indian Wells Day 6 Highlights', channelName: 'WTA', description: 'Day 6 highlights from Indian Wells 2026 featuring Jessica Pegula, Iga Swiatek, and Elena Rybakina.' },
    { id: '8GJF9OlAhdc', title: 'Sakkari vs Swiatek | Indian Wells 2026 R3 Highlights', channelName: 'WTA', description: 'Maria Sakkari challenges world number one Iga Swiatek in a gripping Indian Wells 2026 third round.' },
    { id: 'lghcKCU4jxM', title: 'Muchova vs Ruzic | Indian Wells 2026 R3 Highlights', channelName: 'WTA', description: 'Karolina Muchova defeats Lucija Ruzic in a skilled third-round display at Indian Wells 2026.' },
    { id: 'DipG_08f-_Y', title: 'Golden Hour Win for Elina Svitolina', channelName: 'WTA', description: 'Elina Svitolina earns a meaningful victory in a beautiful evening match at Indian Wells 2026.' },
    { id: '1GrjCqXPVZs', title: 'Elena Rybakina in Full Flow', channelName: 'WTA', description: 'Elena Rybakina showcases her commanding baseline power and serve in peak playing condition at Indian Wells.' },
    { id: 'khQ0PnaElbk', title: 'Reflexes Too Good from Karolina Muchova', channelName: 'WTA', description: 'Karolina Muchova demonstrates extraordinary reflexes and touch at the net in this WTA highlight.' },
    { id: 'LP6uTUC0rkY', title: 'Just Karolina Muchova Things', channelName: 'WTA', description: 'A compilation of Karolina Muchova\'s most creative and unpredictable shots that define her unique style.' },
    // Classics / other tournaments
    { id: '_O-4_IJFIjQ', title: 'When Sabalenka and Coco Met in Madrid | 2025 Final', channelName: 'WTA', description: 'Aryna Sabalenka and Coco Gauff clash in a thrilling WTA Madrid Open 2025 final on clay.' },
    { id: 'maG9TzsuVeM', title: 'Alexandra Eala vs Iga Swiatek | 2025 Miami QF', channelName: 'WTA', description: 'Filipino sensation Alexandra Eala shocks the tennis world against world number one Iga Swiatek at Miami 2025.' },
    { id: '6eundltyRfk', title: 'Aryna Sabalenka vs Elena Rybakina | 2025 WTA Final', channelName: 'WTA', description: 'Aryna Sabalenka and Elena Rybakina contest the WTA Finals 2025 title in a marquee end-of-season clash.' },
    { id: 'GxRhiRvlgzM', title: 'Sabalenka vs Andreeva | 2025 Indian Wells Final', channelName: 'WTA', description: 'Aryna Sabalenka defeats young Russian star Mirra Andreeva to claim the 2025 Indian Wells WTA title.' },
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
    { id: 'XOjJzo4A8DI', title: 'The Beginning of Coco Gauff\'s Roland-Garros Story', channelName: 'Roland-Garros', description: 'Coco Gauff\'s early clay court breakthrough at Roland-Garros, the start of her grand slam journey in Paris.' },
    { id: 'V6qc3RR3MJI', title: 'A Masterclass by Djokovic Against Alcaraz', channelName: 'Roland-Garros', description: 'Novak Djokovic delivers a tactical masterclass against Carlos Alcaraz in a memorable Roland-Garros semifinal.' },
    { id: 'H9TUZp5Tt5I', title: 'Sabalenka Just Cooked', channelName: 'Roland-Garros', description: 'Aryna Sabalenka puts on a dominant clay court display, showing why she\'s among the best in the world.' },
    { id: 'hHo0qdW-lws', title: 'That Alcaraz Point', channelName: 'Roland-Garros', description: 'Carlos Alcaraz produces one of the most stunning points in Roland-Garros history with a breathtaking winner.' },
    { id: 'WStlWRrnEIY', title: 'Warm-up Before the 2024 Final: Swiatek vs Paolini', channelName: 'Roland-Garros', description: 'Behind-the-scenes footage of Iga Swiatek and Jasmine Paolini preparing for the 2024 Roland-Garros women\'s final.' },
    { id: 'OH1oJz3wIl4', title: 'Federer vs Djokovic', channelName: 'Roland-Garros', description: 'Roger Federer and Novak Djokovic engage in a classic Roland-Garros battle on the Parisian red clay.' },
    { id: 'b_RmFyFQTmU', title: 'Nadal\'s Last Winning Point at Roland-Garros', channelName: 'Roland-Garros', description: 'The emotional final winning moment for Rafael Nadal at Roland-Garros, the tournament he dominated for two decades.' },
    { id: '3_XpaWkS060', title: 'Brilliant Defense Turn Into Offense by Paula Badosa', channelName: 'Roland-Garros', description: 'Paula Badosa showcases her exceptional defensive skills turning defence into offense in a stunning clay court rally.' },
    { id: 'mICUGlQ86LQ', title: 'Best Moments of 2022 Final: Swiatek vs Gauff', channelName: 'Roland-Garros', description: 'The defining moments from the 2022 Roland-Garros women\'s final between dominant champion Iga Swiatek and Coco Gauff.' },
    { id: 'XqXCDd_QRqQ', title: 'The Masterclass from Iga Swiatek | Roland-Garros 2022', channelName: 'Roland-Garros', description: 'Iga Swiatek\'s dominant Roland-Garros 2022 campaign highlighted in this masterclass compilation.' },
    { id: 'EGAHAN7HKA8', title: 'Wawrinka vs Djokovic: Legendary Final Performance', channelName: 'Roland-Garros', description: 'Stan Wawrinka\'s stunning 2015 Roland-Garros final upset of Novak Djokovic, one of tennis history\'s great performances.' },
    { id: 'V5T3sF-RdCs', title: '2015 — Stan Wawrinka Was Special', channelName: 'Roland-Garros', description: 'Reliving Stan Wawrinka\'s incredible 2015 Roland-Garros title run that stunned the entire tennis world.' },
    { id: '-TUxF_hRyj8', title: 'Art in Motion', channelName: 'Roland-Garros', description: 'A cinematic tribute to the beauty and artistry of tennis played on the clay courts of Roland-Garros.' },
    { id: '1FHhpMn1LCA', title: 'Roland-Garros eSeries by Renault', channelName: 'Roland-Garros', description: 'Behind-the-scenes from the Roland-Garros eSeries gaming competition powered by Renault.' },
    { id: 'X14ZbZc3zS0', title: 'Roland-Garros Junior Series in Brazil', channelName: 'Roland-Garros', description: 'The Roland-Garros Junior Series visits Brazil, nurturing the next generation of clay court champions.' },
    { id: 'gkIsvlZDG-Y', title: 'Rafael Nadal vs Novak Djokovic — Final Highlights | RG 2020', channelName: 'Roland-Garros', description: 'Full highlights from Rafael Nadal\'s dominant 2020 Roland-Garros final victory over Novak Djokovic.' },
    { id: 'aERKJuBtIGw', title: 'Sinner vs Alcaraz — Final Highlights | Roland-Garros 2025', channelName: 'Roland-Garros', description: 'Match highlights from the epic 2025 Roland-Garros men\'s final between Jannik Sinner and Carlos Alcaraz.' },
    { id: 'bjjJnuPReVY', title: 'Rafael Nadal vs Dominic Thiem — Final Highlights | RG 2019', channelName: 'Roland-Garros', description: 'Highlights from Rafael Nadal\'s 2019 Roland-Garros final win over hard-hitting Dominic Thiem.' },
    { id: 'LjDONWrr46I', title: 'Rafael Nadal Tribute Ceremony | Roland-Garros 2025', channelName: 'Roland-Garros', description: 'An emotional tribute ceremony at Roland-Garros 2025 honoring Rafael Nadal and his unparalleled legacy at the tournament.' },
    { id: 'c7O8a68d_xM', title: 'Djokovic vs Tsitsipas — Final Highlights | RG 2021', channelName: 'Roland-Garros', description: 'Novak Djokovic\'s remarkable comeback from two sets down to win the 2021 Roland-Garros final against Stefanos Tsitsipas.' },
  ],
};

const wimbledon: YouTubeChannel = {
  channelId: 'UCNa8NxMgSm7m4Ii9d4QGk1Q',
  name: 'Wimbledon',
  description: 'The official Wimbledon channel. Full match replays, classic moments, and behind-the-scenes at the All England Club.',
  subscriberCount: '2.1M',
  videos: [
    { id: 'r93mofOZuI4', title: 'Amazing First Set! Alcaraz vs Rublev Full First Set', channelName: 'Wimbledon', description: 'Carlos Alcaraz and Andrey Rublev deliver an enthralling first set at Wimbledon, setting the stage for a thriller.' },
    { id: 'sLNj20CmTCM', title: 'The Story of Wimbledon 2025 | Official Film', channelName: 'Wimbledon', description: 'The official film documenting the full story of The Championships, Wimbledon 2025, from first round to final.' },
    { id: 'V2loalR7gC0', title: 'Best Points from Wimbledon 2025 | Ladies\' Singles', channelName: 'Wimbledon', description: 'A collection of the most spectacular points from the Wimbledon 2025 Ladies\' Singles tournament.' },
    { id: 'wBbA9MrKL8Y', title: 'The VERY Best Points from Wimbledon 2025 | Gentlemen\'s Singles', channelName: 'Wimbledon', description: 'The finest points from the 2025 Wimbledon Gentlemen\'s Singles, showcasing the best grass court tennis.' },
    { id: 'WwYUgljhpDA', title: 'Semi-final Scenes! Sabalenka vs Anisimova Full Final Set', channelName: 'Wimbledon', description: 'The gripping deciding set of Aryna Sabalenka\'s Wimbledon 2025 semifinal against Amanda Anisimova.' },
    { id: 'zvMdDXxyxpQ', title: 'BEST Grand Slam Doubles Points of 2025', channelName: 'Wimbledon', description: 'The best doubles points from all four Grand Slam tournaments in 2025, featuring top doubles partnerships.' },
    { id: 'CAL7pHXI-3o', title: 'A TENSE Set! Sinner vs Alcaraz Final Set Replay', channelName: 'Wimbledon', description: 'The riveting final set replay of the Wimbledon 2025 men\'s final between Jannik Sinner and Carlos Alcaraz.' },
    { id: 'w8L93jPG9Fo', title: 'Best Match of 2025? Sabalenka vs Raducanu Final Set', channelName: 'Wimbledon', description: 'The extraordinary final set of the Wimbledon 2025 match between Aryna Sabalenka and Emma Raducanu.' },
    { id: 'fqnGopomoHA', title: 'Sinner vs Djokovic 2025 Semi-Final Full Deciding Set', channelName: 'Wimbledon', description: 'The full deciding set of the Wimbledon 2025 semifinal, with Jannik Sinner and Novak Djokovic giving everything.' },
    { id: 'gQOgd-G3Caw', title: 'Try Not to LAUGH! Funniest Moments of Wimbledon 2025', channelName: 'Wimbledon', description: 'A hilarious compilation of the funniest on-court and off-court moments from Wimbledon 2025.' },
    { id: 'O0MKEhWTeWk', title: 'Gael Monfils Makes It Look Easy', channelName: 'Wimbledon', description: 'Gael Monfils dazzles on the Wimbledon grass with his extraordinary athleticism and entertainment value.' },
    { id: 'uOFxJwXtt_0', title: 'Superman Djokovic', channelName: 'Wimbledon', description: 'Novak Djokovic produces a superhero diving save at Wimbledon that left fans and commentators stunned.' },
    { id: 'psTGGyhXrJ8', title: 'Ons Jabeur Moments to Make You Smile', channelName: 'Wimbledon', description: 'A heartwarming collection of Ons Jabeur\'s most charming and crowd-pleasing moments at Wimbledon.' },
    { id: 'y3SiQlIVrdw', title: 'Wimbledon Nature Trivia Questions', channelName: 'Wimbledon', description: 'A fun Wimbledon trivia segment exploring the natural wildlife and garden history of the All England Club.' },
    { id: 'vn39b6Ns0O8', title: 'Wimbledon 2025 eChamps — Day 2', channelName: 'Wimbledon', description: 'Day 2 highlights from the Wimbledon 2025 eChampionships, the virtual tennis tournament alongside The Championships.' },
    { id: 'wZnCcqm_g-E', title: 'Roger Federer vs Rafael Nadal | Wimbledon 2019 Full Match', channelName: 'Wimbledon', description: 'Full match replay of the 2019 Wimbledon clash between all-time greats Roger Federer and Rafael Nadal.' },
    { id: 'TUikJi0Qhhw', title: 'Novak Djokovic vs Roger Federer | Wimbledon 2019 Full Match', channelName: 'Wimbledon', description: 'Full replay of the epic 2019 Wimbledon final, where Novak Djokovic defeated Roger Federer in five unforgettable sets.' },
    { id: 'mSywWtS9YfQ', title: 'Greatest Tiebreak? Epic Djokovic vs Federer | 2015 Final', channelName: 'Wimbledon', description: 'The legendary Wimbledon 2015 final tiebreak between Novak Djokovic and Roger Federer, widely considered one of the greatest ever.' },
    { id: '5NmIav-DttI', title: 'Wimbledon\'s Funniest Moments', channelName: 'Wimbledon', description: 'A classic compilation of Wimbledon\'s most hilarious on-court mishaps, crowd reactions, and player antics.' },
    { id: '7nVOQyf-k3Y', title: 'Djokovic Relentless Against Rune | Wimbledon 2024', channelName: 'Wimbledon', description: 'Novak Djokovic shows relentless determination against Holger Rune in an intense Wimbledon 2024 encounter.' },
  ],
};

const usOpen: YouTubeChannel = {
  channelId: 'UC7joGi4V3-r9i5tmmw7dM6g',
  name: 'US Open Tennis',
  description: 'Official US Open Tennis Championships channel. Highlights, full matches, and iconic moments from Flushing Meadows.',
  subscriberCount: '1.5M',
  videos: [
    { id: 'gz1i_VLkxSg', title: 'Half-Volley Delight!', channelName: 'US Open Tennis', description: 'A superb half-volley winner at the US Open showcasing the incredible skill and instincts required at Flushing Meadows.' },
    { id: 'gJvNrHsuuCE', title: 'Coco Gauff vs Madison Keys | 2022 US Open R3 Full Match', channelName: 'US Open Tennis', description: 'Full match replay of the exciting 2022 US Open third round clash between American stars Coco Gauff and Madison Keys.' },
    { id: 'BbfsZ9aJ8EM', title: 'KILLER Winner from Korda!', channelName: 'US Open Tennis', description: 'Sebastian Korda unleashes an unstoppable winner that stuns his opponent at the US Open.' },
    { id: 'Mey-VI4EeWc', title: 'FANTASTIC Lob from Fritz!', channelName: 'US Open Tennis', description: 'Taylor Fritz executes a perfectly timed lob at the US Open, leaving his opponent stranded at the net.' },
    { id: 'YcHveerMKxQ', title: 'Gauff Was SERIOUSLY Pumped Up!', channelName: 'US Open Tennis', description: 'Coco Gauff\'s intense celebrations at the US Open show the passionate energy she brings to every point.' },
    { id: 'S63gJTsLiXc', title: 'Daniil Medvedev vs Rafael Nadal | US Open 2019 Final Highlights', channelName: 'US Open Tennis', description: 'Highlights from the thrilling 2019 US Open final where Daniil Medvedev pushed Rafael Nadal to the limit in five sets.' },
    { id: 'va-7PmXTKwk', title: '1 in 1 Million Moments | US Open', channelName: 'US Open Tennis', description: 'A collection of once-in-a-lifetime shots and moments that could only happen at the US Open in New York.' },
    { id: 'SEFnfcfvLkw', title: 'Carlos Alcaraz vs Casper Ruud | 2022 US Open Final', channelName: 'US Open Tennis', description: 'Highlights from the 2022 US Open final where teenager Carlos Alcaraz defeated Casper Ruud to claim his first Grand Slam.' },
    { id: 'MEFpXBwnyQA', title: 'Daniil Medvedev vs Novak Djokovic | 2021 US Open Final', channelName: 'US Open Tennis', description: 'Highlights from the 2021 US Open final — Daniil Medvedev\'s dominant three-set win over Novak Djokovic.' },
    { id: 'SJfDyNw9AUk', title: 'Jannik Sinner vs Carlos Alcaraz | 2025 US Open Final', channelName: 'US Open Tennis', description: 'Match highlights from the 2025 US Open final between the two best players in the world, Sinner and Alcaraz.' },
    { id: '-SzPNvA8n4I', title: 'Greatest Trick Shots in History! | US Open', channelName: 'US Open Tennis', description: 'The most audacious and creative trick shots ever witnessed at the US Open throughout the tournament\'s history.' },
    { id: 'lGjvN4y5XFE', title: 'Daniil Medvedev vs Novak Djokovic | 2023 US Open Final', channelName: 'US Open Tennis', description: 'Highlights from the 2023 US Open final where Novak Djokovic overcame Daniil Medvedev to claim his 24th Grand Slam.' },
    { id: '9fScMWmYO1Y', title: 'Novak Djokovic vs Carlos Alcaraz | 2025 US Open Semifinal', channelName: 'US Open Tennis', description: 'The 2025 US Open semifinal between Novak Djokovic and Carlos Alcaraz in another chapter of their fierce rivalry.' },
    { id: 'TDdEVBgDqK4', title: 'Jannik Sinner vs Carlos Alcaraz Full Match | 2025 US Open Final', channelName: 'US Open Tennis', description: 'Full match replay of the 2025 US Open final — Jannik Sinner vs Carlos Alcaraz in an unmissable Grand Slam final.' },
    { id: 'qwg_pIJlNtI', title: 'Ben Shelton vs Frances Tiafoe | 2023 US Open Quarterfinal', channelName: 'US Open Tennis', description: 'Two American fan favourites Ben Shelton and Frances Tiafoe provide an electric 2023 US Open quarterfinal.' },
  ],
};

const australianOpen: YouTubeChannel = {
  channelId: 'UCeTKJSW1NTAkf27nNmjWt5A',
  name: 'Australian Open',
  description: 'Official Australian Open channel. Full matches, highlights, player interviews, and the best of the Happy Slam.',
  subscriberCount: '1.3M',
  videos: [
    { id: 'U6WhLVQQpPc', title: 'Bublik vs Etcheverry Full Match | AO 2026 Third Round', channelName: 'Australian Open', description: 'Full match replay of Alexander Bublik versus Tomas Martin Etcheverry in the Australian Open 2026 third round.' },
    { id: 'qQ_AlxOB7Z0', title: 'Learner Tien: "It Landed In a Soft Place In My Heart"', channelName: 'Australian Open', description: 'American prospect Learner Tien reflects on an emotional Australian Open 2026 experience that changed his perspective.' },
    { id: 'jTg5ehIXDJI', title: 'Noskova vs Wang Full Match | AO 2026 Third Round', channelName: 'Australian Open', description: 'Full match replay of Linda Noskova versus Xinyu Wang at the 2026 Australian Open third round.' },
    { id: 'CFBTtTL2qCs', title: 'Mensik vs Quinn Full Match | AO 2026 Third Round', channelName: 'Australian Open', description: 'Jakub Mensik battles John Quinn in a full third-round match replay from the 2026 Australian Open.' },
    { id: 'FfyI1wYYiIA', title: 'Kalinskaya vs Swiatek Full Match | AO 2026 Third Round', channelName: 'Australian Open', description: 'Full match replay of Anna Kalinskaya\'s surprise win over world number one Iga Swiatek at the 2026 Australian Open.' },
    { id: 'P-NHvA-LooM', title: 'Van de Zandschulp vs Djokovic Full Match | AO 2026', channelName: 'Australian Open', description: 'Full match replay as Botic van de Zandschulp takes on Novak Djokovic at the 2026 Australian Open.' },
    { id: '2cRHHvfhZNk', title: 'What is Tommy Haas\' Ideal On-Screen Role? | Pod Laver Arena', channelName: 'Australian Open', description: 'Tennis legend Tommy Haas discusses his life beyond tennis and ideal on-screen aspirations in this Pod Laver Arena interview.' },
    { id: 'uAixIC408JA', title: 'Rybakina vs Valentova Full Match | AO 2026 Third Round', channelName: 'Australian Open', description: 'Elena Rybakina faces Sara Valentova in a full third-round match at the 2026 Australian Open.' },
    { id: 'qe2WOgcHzcY', title: 'Cilic vs Ruud Full Match | AO 2026 Third Round', channelName: 'Australian Open', description: 'Marin Cilic and Casper Ruud clash in a full third-round match at the 2026 Australian Open.' },
    { id: 'YugcSSunU4E', title: 'Sabalenka vs Mboko Full Match | AO 2026 Fourth Round', channelName: 'Australian Open', description: 'Defending champion Aryna Sabalenka takes on Oceane Dodin/Mboko in the full fourth-round match at AO 2026.' },
    { id: 'Et1ISRc1hT4', title: 'Barty with a BRILLIANT Smash!', channelName: 'Australian Open', description: 'Former world number one Ash Barty executes a devastating overhead smash to delight the Australian Open crowd.' },
    { id: 'I1cuhjGHoT8', title: 'CRAZY Defensive Winner!', channelName: 'Australian Open', description: 'An incredible defensive retrieval turns into a clean winner in one of the Australian Open\'s most improbable points.' },
    { id: 'BKP5aQmxJhc', title: 'EXCELLENT Volley from Eala!', channelName: 'Australian Open', description: 'Alexandra Eala demonstrates her exceptional net skills with an excellent volley winner at the Australian Open.' },
    { id: 'pN7f5BWDODQ', title: 'CLINICAL at the Net from Shelton!', channelName: 'Australian Open', description: 'Ben Shelton shows clinical net play and precision at the Australian Open with a crisp finishing volley.' },
    { id: 'zeKNNE4JlX4', title: 'Clinical Volley Winner!', channelName: 'Australian Open', description: 'A perfectly executed volley winner at the Australian Open showcasing world-class net technique.' },
    { id: 'KTCDxjJvs2U', title: 'Federer vs Nadal Full Match | Australian Open 2017 Final', channelName: 'Australian Open', description: 'Full match replay of the legendary 2017 Australian Open final — Roger Federer\'s magical comeback victory over Rafael Nadal.' },
    { id: 'v27M_RgrLzU', title: 'Nadal vs Medvedev Extended Highlights | AO 2022 Final', channelName: 'Australian Open', description: 'Extended highlights of Rafael Nadal\'s extraordinary comeback from two sets down to win the 2022 Australian Open final.' },
    { id: '4Nk_whncZ20', title: 'Djokovic vs Nadal Extended Highlights | AO 2012 Final', channelName: 'Australian Open', description: 'Extended highlights from the 2012 Australian Open final, the longest Grand Slam final in history — Djokovic vs Nadal.' },
    { id: 'zDn5WfnV5g0', title: 'Djokovic vs Sinner Extended Highlights | AO 2026 Semifinal', channelName: 'Australian Open', description: 'Extended highlights from Novak Djokovic and Jannik Sinner\'s thrilling semifinal clash at the 2026 Australian Open.' },
    { id: 'fBAd_Fu5Sps', title: 'Top 10 Ballkid Moments Ever! | Australian Open', channelName: 'Australian Open', description: 'The ten best and most memorable ballkid moments ever captured at the Australian Open.' },
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
    { id: 'T3WIl2lgwDk', title: 'Alex Michelsen on Taylor Fritz Upset | Indian Wells 2026', channelName: 'Tennis Channel', description: 'Alex Michelsen speaks to Tennis Channel after his stunning upset of compatriot Taylor Fritz at Indian Wells 2026.' },
    { id: 'KGA7Ydk3a_s', title: 'Casper Ruud Shares Connection with Newborn Daughter', channelName: 'Tennis Channel', description: 'Casper Ruud opens up about fatherhood and the special bond with his newborn daughter in a heartfelt interview.' },
    { id: 'RH0EKI070Cg', title: 'Jack Draper Can\'t Wait to Play Djokovic | Indian Wells 2026', channelName: 'Tennis Channel', description: 'Britain\'s Jack Draper expresses his excitement about a potential match-up with Novak Djokovic at Indian Wells 2026.' },
    { id: 'q8XSR_WKXIw', title: 'Siniakova on Emotional Win vs Andreeva | Indian Wells 2026', channelName: 'Tennis Channel', description: 'Katerina Siniakova reflects on her emotional singles win over Mirra Andreeva at Indian Wells 2026.' },
    { id: 'gQDtyJnF3fg', title: 'Pegula\'s Publix Snack Haul with Player\'s Box Pod', channelName: 'Tennis Channel', description: 'Jessica Pegula gives a fun tour of her favourite Publix snacks with her player\'s box at Indian Wells 2026.' },
    { id: 'CDrxVOKXdl8', title: 'Djokovic Played Golf with Alcaraz & Zverev | Indian Wells', channelName: 'Tennis Channel', description: 'Novak Djokovic reveals he hit the golf course with Carlos Alcaraz and Alexander Zverev during their Indian Wells downtime.' },
    { id: '4B0Gp2SfBnc', title: 'Alex Eala on WTA Friendships | Indian Wells 2026', channelName: 'Tennis Channel', description: 'Rising star Alexandra Eala talks about the friendships she\'s formed on the WTA Tour at Indian Wells 2026.' },
    { id: '3a4E4W4lS0k', title: 'Hannah Berner, Eubanks & Vandeweghe Test Serve Speeds', channelName: 'Tennis Channel', description: 'Comedian Hannah Berner, Chris Eubanks, and CoCo Vandeweghe compete to see who can hit the fastest serve.' },
    { id: 'SlFn8Opmzjg', title: 'Learner Tien Cramps After Defeating Ben Shelton | TC Live', channelName: 'Tennis Channel', description: 'Learner Tien battles through painful cramping after defeating Ben Shelton in a dramatic match at Indian Wells 2026.' },
    { id: 'hovglpTK838', title: 'Coco Gauff Forced to Retire Against Alex Eala', channelName: 'Tennis Channel', description: 'Coco Gauff is forced to retire through injury against Alexandra Eala in a shocking moment at Indian Wells 2026.' },
    { id: 'dg_6RRvYhzY', title: 'Arthur Fils Enjoyed Life Outside Tennis | Indian Wells 2026', channelName: 'Tennis Channel', description: 'French star Arthur Fils reveals how he enjoys his time away from the court during the Indian Wells 2026 tournament.' },
    { id: '282A5zliRsY', title: 'Nole Back at the Desk', channelName: 'Tennis Channel', description: 'Novak Djokovic returns to the Tennis Channel commentary desk for a classic segment of analysis and humour.' },
    { id: 'RXsAQ_0ujhs', title: 'Girlhood: Alex Eala', channelName: 'Tennis Channel', description: 'A documentary portrait of Alexandra Eala\'s journey through tennis and growing up as a young woman on the WTA Tour.' },
    { id: 'OhVjvUuEHqc', title: 'This Doubles Duo: Sinner & Opelka', channelName: 'Tennis Channel', description: 'The unlikely doubles pairing of Jannik Sinner and Reilly Opelka gets the Tennis Channel treatment at Indian Wells 2026.' },
    { id: 'jXRRpWBLXTw', title: 'We\'re Obsessed', channelName: 'Tennis Channel', description: 'Tennis Channel showcases the moment they became completely obsessed with a current trend in professional tennis.' },
  ],
};

const tennisPodcast: YouTubeChannel = {
  channelId: 'UC9ZPFOiLoEeOBJseKICaFFQ',
  name: 'The Tennis Podcast',
  description: 'Award-winning tennis podcast. Deep dives into the stories, drama, and characters that shape the sport.',
  subscriberCount: '95K',
  videos: [
    { id: 'PDyHzvhNv4s', title: 'Indian Wells — The Story So Far', channelName: 'The Tennis Podcast', description: 'The Tennis Podcast team reviews all the key storylines and surprises from the first week of Indian Wells 2026.' },
    { id: 'ghB-qw3D-a8', title: 'Tennis Rocked by World Events. What Now?', channelName: 'The Tennis Podcast', description: 'A thoughtful discussion on how major world events are impacting the professional tennis tour and its players.' },
    { id: 'XVbtUKpHauA', title: 'Alcaraz Wins 12 in a Row & Fils-Ivanisevic Inside Story', channelName: 'The Tennis Podcast', description: 'The Tennis Podcast covers Carlos Alcaraz\'s 12-match winning streak and the inside story of the Fils-Ivanisevic split.' },
    { id: '4qZoHlAQpnA', title: 'Muchova\'s Moment — The First of Many?', channelName: 'The Tennis Podcast', description: 'Analysis of Karolina Muchova\'s breakthrough moment and whether it\'s the start of consistent Grand Slam contention.' },
    { id: 'O94tL_8EogY', title: 'What\'s Happened Since the Australian Open?', channelName: 'The Tennis Podcast', description: 'The Tennis Podcast catches up on all the major news, results, and talking points since the Australian Open concluded.' },
    { id: '8tFu3vV_peo', title: 'Carlos Alcaraz: History Boy | Aus Open Day 15', channelName: 'The Tennis Podcast', description: 'Post-match analysis of Carlos Alcaraz\'s Australian Open performance and his growing place in tennis history.' },
    { id: '3JukaROMr4M', title: 'Rybakina\'s Extraordinary Power of Calm at the AO', channelName: 'The Tennis Podcast', description: 'An analysis of Elena Rybakina\'s remarkable mental composure and how her calmness translates to Australian Open success.' },
    { id: 'YQSLRF1KW0M', title: 'Is Fonseca Playing with a Point to Prove?', channelName: 'The Tennis Podcast', description: 'Discussion on whether Brazilian teenager Joao Fonseca\'s motivated performances stem from something to prove on tour.' },
    { id: 'mxXj7aqn7I0', title: 'Are We About to Witness an All-Time Great Season from Alcaraz?', channelName: 'The Tennis Podcast', description: 'The Tennis Podcast debates whether Carlos Alcaraz is on the verge of an all-time legendary season of tennis.' },
    { id: 'BMym-58k_yM', title: 'Matt Has the Tea on the Big Dutch Drama', channelName: 'The Tennis Podcast', description: 'The Tennis Podcast\'s Matt uncovers the inside story behind the dramatic Dutch tennis controversy making headlines.' },
    { id: '-btmZP5s_mY', title: 'Why Is Emma Raducanu a Lightning Rod for Hate?', channelName: 'The Tennis Podcast', description: 'A nuanced discussion exploring why Emma Raducanu receives disproportionate criticism and how she handles public attention.' },
    { id: 'lPoESXmQL3s', title: 'Coming Close to Glory Could Fuel Djokovic\'s Determination', channelName: 'The Tennis Podcast', description: 'Analysis of how Novak Djokovic\'s near-misses are likely to intensify his determination to add to his Grand Slam record.' },
    { id: '4EjasCTlExM', title: 'Freaky Friday Role Reversal Secures History for Alcaraz', channelName: 'The Tennis Podcast', description: 'The Tennis Podcast breaks down the tactical role reversal that helped Carlos Alcaraz secure a historic Grand Slam win.' },
    { id: '4xl0e-tCEdo', title: 'AO Final Could Be Djokovic\'s Last Best Chance for 25', channelName: 'The Tennis Podcast', description: 'Discussion on whether the upcoming Australian Open final represents Novak Djokovic\'s best remaining shot at a 25th Grand Slam.' },
    { id: 'xPprCNPqlrg', title: 'Why Did the Dubai Doubles Final Go Ahead on Saturday?', channelName: 'The Tennis Podcast', description: 'The Tennis Podcast investigates the scheduling controversy around the Dubai doubles final being held on a Saturday.' },
  ],
};

const intuitiveTennis: YouTubeChannel = {
  channelId: 'UCtak3C1t8k3u8CVzVGYvemA',
  name: 'Intuitive Tennis',
  description: 'Tennis analysis, technique breakdowns, and tournament commentary. Tips, drills, and match reviews from a coaching perspective.',
  subscriberCount: '180K',
  videos: [
    { id: 'PZpUtWivExk', title: 'Eala Advances as Gauff Retires; Fonseca Blows Paul Off Court', channelName: 'Intuitive Tennis', description: 'Recap of a dramatic day featuring Eala\'s win over a retiring Gauff and Fonseca\'s stunning performance against Tommy Paul.' },
    { id: 'N2hoEVPjx8s', title: 'Djokovic Overcomes Poor Start; Alcaraz Too Good for Dimitrov', channelName: 'Intuitive Tennis', description: 'Match analysis of Djokovic grinding past a difficult start and Alcaraz\'s dominant display against Grigor Dimitrov.' },
    { id: 'KaVcaEek_UM', title: 'Why the Wrist Does NOT Generate Forehand Topspin', channelName: 'Intuitive Tennis', description: 'A technical breakdown debunking the common myth that the wrist is the primary source of topspin on the forehand.' },
    { id: 'oKldeqNkrA4', title: 'Do NOT Snap or Roll Your Wrist for Forehand Topspin', channelName: 'Intuitive Tennis', description: 'Intuitive Tennis explains why snapping or rolling the wrist on the forehand can harm your technique and power.' },
    { id: 'bDjyaKgNueI', title: 'Topspin Forehand Wrist & Forearm Biomechanics', channelName: 'Intuitive Tennis', description: 'A detailed analysis of the correct wrist and forearm biomechanics behind generating heavy topspin on the forehand.' },
    { id: '68NBR0pI5iA', title: '2026 Indian Wells ATP 1000 Preview', channelName: 'Intuitive Tennis', description: 'Intuitive Tennis previews the 2026 Indian Wells Masters with predictions and key match-ups to watch.' },
    { id: 'vSn3g6ktqxA', title: '1-H vs 2-H | Which Backhand Has More Power Potential?', channelName: 'Intuitive Tennis', description: 'A biomechanical comparison of the one-handed versus two-handed backhand to determine which generates more power.' },
    { id: 'Yqf3pPEDNzw', title: 'Did Babolat Ruin the NEW Pure Aero 98?', channelName: 'Intuitive Tennis', description: 'An honest review and verdict on whether the latest iteration of the Babolat Pure Aero 98 lives up to its predecessor.' },
    { id: '-STUOXWfOdk', title: 'Medvedev & Cobolli Take ATP 500 Titles in Dubai & Acapulco', channelName: 'Intuitive Tennis', description: 'Recap of Daniil Medvedev and Flavio Cobolli claiming ATP 500 titles in Dubai and Acapulco respectively.' },
    { id: '69nrFPJ3e5E', title: 'Finish with Dominant Hand ABOVE Dominant Shoulder', channelName: 'Intuitive Tennis', description: 'A key coaching tip from Intuitive Tennis on the correct follow-through position for a more consistent forehand.' },
    { id: 'u2fp8i6ZKk8', title: 'Can AI Coaching Be a Substitute for REAL Tennis Coaching?', channelName: 'Intuitive Tennis', description: 'Exploring whether artificial intelligence tools can genuinely replace the value of a human tennis coach.' },
    { id: '7l7GzqT3Bwo', title: 'Role of the Hips on Forehand, Backhands and Serve', channelName: 'Intuitive Tennis', description: 'A technical breakdown of how hip rotation contributes to power and consistency across all major tennis strokes.' },
    { id: '3BAxgOJrqPI', title: 'Forehand Preparation Should be Early & Continuous', channelName: 'Intuitive Tennis', description: 'Intuitive Tennis demonstrates why early and continuous racket preparation is the foundation of a reliable forehand.' },
    { id: 'pODBeYVExZA', title: 'I Taught Karla How to Teach Me to Serve Lefty', channelName: 'Intuitive Tennis', description: 'A fun coaching experiment where Intuitive Tennis teaches their student Karla how to coach a left-handed serve.' },
    { id: 'YBhCA8DR1_E', title: 'Eala Outlasts Yastremska; Sinner Destroys Svrcina', channelName: 'Intuitive Tennis', description: 'Match analysis covering Alexandra Eala\'s hard-fought win over Yastremska and Sinner\'s dominant victory over Svrcina.' },
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
    { id: 'ldWej3eMPGk', title: 'You\'re TWO Tennis Players (Only One Is Good)', channelName: 'Essential Tennis', description: 'Ian Westermann explains the two mental states every player switches between and how to stay in your peak performance mode.' },
    { id: '1MZOheLz7zc', title: 'Why Your Flat Serve Is Weak', channelName: 'Essential Tennis', description: 'Essential Tennis breaks down the technical reasons why your flat serve lacks pace and how to fix it immediately.' },
    { id: '7ZtFK-KdOg0', title: 'How to Train FLAT and SLICE Serve Delivery', channelName: 'Essential Tennis', description: 'A practical training guide from Ian Westermann on developing both flat and slice serve deliveries.' },
    { id: 'wqFfygqEcr0', title: 'Why Your "Flat Serve" Has No Pace', channelName: 'Essential Tennis', description: 'The counterintuitive truth behind why attempting to hit a flat serve often produces less pace than expected.' },
    { id: 'pleVIcffQRU', title: 'How to Add 15mph to Your Serve', channelName: 'Essential Tennis', description: 'Essential Tennis\'s most popular technique guide for adding significant speed to your tennis serve.' },
    { id: 'nz9dVqHVjfQ', title: 'Add 15 MPH to Your Serve in 10 Minutes', channelName: 'Essential Tennis', description: 'A rapid 10-minute drill session that helps players immediately add 15 mph of extra pace to their service games.' },
    { id: 'o0o0EJ1EU04', title: 'How to FIX Your Forehand Spacing', channelName: 'Essential Tennis', description: 'Ian Westermann reveals why forehand spacing is the most overlooked element of a consistent groundstroke.' },
    { id: 'TCxBrdhJRk8', title: 'Why You\'re NOT Getting Better at Tennis', channelName: 'Essential Tennis', description: 'An honest assessment of the real reasons most recreational players plateau and stop improving in tennis.' },
    { id: 'Stgj0R7NOcQ', title: 'Tension is WRECKING Your Forehand (But You Can Fix It)', channelName: 'Essential Tennis', description: 'How muscular tension in the arm and hand is destroying your forehand and the simple methods to release it.' },
    { id: 'mFL7JylHJcM', title: 'How to Control the DEPTH of Your Volleys', channelName: 'Essential Tennis', description: 'Essential Tennis teaches the technique for controlling volley depth consistently from any position at the net.' },
    { id: '3R-n7IU48ms', title: 'Hit Perfect Volleys at ANY Height', channelName: 'Essential Tennis', description: 'How to adjust your volley technique to produce clean, controlled winners from low, medium, and high balls.' },
    { id: 'xTrBNOXzUOY', title: 'Top 3 Most Common Volley Mistakes', channelName: 'Essential Tennis', description: 'Ian Westermann identifies the three most common volley errors and provides targeted fixes for each one.' },
    { id: 'aML065nQnUQ', title: 'How to FIX Your Volley Accuracy and Consistency', channelName: 'Essential Tennis', description: 'A systematic approach from Essential Tennis to improving volley placement and reliability at all levels.' },
    { id: 'rr7rR-66fok', title: 'How to TRANSFORM Your Volleys', channelName: 'Essential Tennis', description: 'A comprehensive volley transformation program from Essential Tennis to take your net game to the next level.' },
    { id: 'YLy1tX0zvBU', title: 'You\'ve Been Hitting Volleys WRONG', channelName: 'Essential Tennis', description: 'Essential Tennis reveals the misconceptions about volley technique that are preventing players from mastering the net.' },
  ],
};

const topTennisTraining: YouTubeChannel = {
  channelId: 'UCT4PpIx1TWzgzi4gZKaZamA',
  name: 'Top Tennis Training',
  description: 'Pro footage in super slow motion. Analyze the technique of Federer, Nadal, Djokovic, and more. Perfect your strokes.',
  subscriberCount: '320K',
  videos: [
    { id: 'v2B1ZGMjX-0', title: 'Novak Djokovic High Finish On Forehand', channelName: 'Top Tennis Training', description: 'Super slow-motion analysis of Novak Djokovic\'s distinctive high forehand finish and what makes it so effective.' },
    { id: 'BqO30nZbvgo', title: 'Ferrero Sliding Forehand', channelName: 'Top Tennis Training', description: 'Juan Carlos Ferrero\'s sliding clay court forehand captured in ultra slow motion for technique study.' },
    { id: 'fVdHbwzsrk4', title: 'Ferrero Backhand Slow Motion', channelName: 'Top Tennis Training', description: 'Former world number one Juan Carlos Ferrero demonstrates his elegant one-handed backhand in slow motion.' },
    { id: 'ZrQ0FJ-Kn3M', title: 'Agassi Forehands from Different Angles', channelName: 'Top Tennis Training', description: 'Andre Agassi\'s legendary return forehand analyzed from multiple camera angles in detailed slow motion.' },
    { id: 'YIaE5DzwOdQ', title: 'Juan Carlos Ferrero Forehands Slow Motion', channelName: 'Top Tennis Training', description: 'A detailed slow motion study of Juan Carlos Ferrero\'s powerful clay court forehand technique.' },
    { id: 'v1eq9X3lOho', title: 'Roger Federer Sliding Forehand Slow Motion', channelName: 'Top Tennis Training', description: 'Roger Federer\'s ability to slide on hard courts showcased in slow motion — a rare and beautiful technique.' },
    { id: 'yWBuuG4Gzzc', title: 'Gustavo Kuerten Guga Forehand Slow Motion', channelName: 'Top Tennis Training', description: 'Brazilian clay court legend Gustavo Kuerten\'s signature forehand captured in detailed slow motion.' },
    { id: 'Rpy0b91g8rw', title: 'Roger Federer Serve Slow Motion Side View', channelName: 'Top Tennis Training', description: 'Roger Federer\'s technically perfect serve analyzed in slow motion from the side view.' },
    { id: 'yz2lwGJwiEQ', title: 'Juan Carlos Ferrero Serve Slow Motion', channelName: 'Top Tennis Training', description: 'The fluid and efficient serve mechanics of former world number one Juan Carlos Ferrero in slow motion.' },
    { id: '0FnZBt6hiNE', title: 'Andre Agassi Running Forehand Slow Motion', channelName: 'Top Tennis Training', description: 'Andre Agassi\'s ability to generate power on the run showcased by his running forehand in super slow motion.' },
    { id: 'cnnKt_SeJ6s', title: 'Andre Agassi Forehand Slow Motion Side View', channelName: 'Top Tennis Training', description: 'A detailed side-view slow motion analysis of Andre Agassi\'s compact and devastating baseline forehand.' },
    { id: 'Ro_fQ2te5Yw', title: 'Novak Djokovic Fitness Training', channelName: 'Top Tennis Training', description: 'Behind-the-scenes footage of Novak Djokovic\'s intense off-court fitness and conditioning training sessions.' },
    { id: 'PrDjDAja1cw', title: 'Tomas Berdych Split-Step on Return Slow Motion', channelName: 'Top Tennis Training', description: 'Tomas Berdych\'s precise split-step timing on service return captured in detailed slow motion.' },
    { id: '17JXZtFyslw', title: 'Tomas Berdych Split-Step on Return', channelName: 'Top Tennis Training', description: 'Analysis of Tomas Berdych\'s return preparation and split-step footwork at regular and slow-motion speeds.' },
    { id: 'rLX0Y2H1m9o', title: 'Andre Agassi Forehand Return Slow Motion', channelName: 'Top Tennis Training', description: 'Andre Agassi\'s legendary forehand return — arguably the best in tennis history — broken down in slow motion.' },
  ],
};

const functionalTennis: YouTubeChannel = {
  channelId: 'UC5LvAVo8fSKuEMsBN7s7ZhA',
  name: 'Functional Tennis',
  description: 'Innovative tennis coaching tools, pro player warm-ups, and match analysis. Home of the Saber training racket.',
  subscriberCount: '210K',
  videos: [
    { id: 'gKULRde2SBU', title: 'Reaction Ball Warmup Exercises', channelName: 'Functional Tennis', description: 'Dynamic warm-up drills using reaction balls to improve hand-eye coordination and tennis-specific reflexes.' },
    { id: 'BYxU_0y8DY8', title: 'Dimitrov Clay Court Warmup — Full On-Court Warmup', channelName: 'Functional Tennis', description: 'Full warm-up routine of Grigor Dimitrov ahead of a clay court match, showcasing a pro\'s pre-match preparation.' },
    { id: 'AUT06D6ZOAI', title: 'The Story Behind the World\'s Most Famous Tennis Toilet', channelName: 'Functional Tennis', description: 'The fascinating and unexpected story behind the toilet that became a viral sensation in the tennis world.' },
    { id: 'pHf2SoYWbFE', title: 'Jannik Sinner Full On-Court Warm Up in Monte Carlo 2024', channelName: 'Functional Tennis', description: 'The complete pre-match warm-up routine of world number one Jannik Sinner at the Monte Carlo Masters 2024.' },
    { id: 'jD1Z8cfvuk8', title: 'Long Live the One-Handed Backhand', channelName: 'Functional Tennis', description: 'A passionate celebration of the one-handed backhand and the players keeping this elegant stroke alive on tour.' },
    { id: '7zzqlLGeb-4', title: 'The Best Movers Are the Best Players', channelName: 'Functional Tennis', description: 'An exploration of how elite court movement and footwork directly correlates with success at the professional level.' },
    { id: 'iIxcGs_jd0A', title: '5-Minute Match Point at Under 14 Tennis Europe Masters', channelName: 'Functional Tennis', description: 'An extraordinary five-minute match point at Under 14 level that showcases remarkable junior tennis determination.' },
    { id: 'fMI5tOqmb58', title: 'French Open Prize Money 2025', channelName: 'Functional Tennis', description: 'A breakdown of the 2025 Roland-Garros French Open prize money structure across all rounds and categories.' },
    { id: 'ErsWwcpEpf0', title: '12-Year-Old Liam Dent', channelName: 'Functional Tennis', description: 'A spotlight on 12-year-old British prodigy Liam Dent, one of the most exciting young tennis talents in the country.' },
    { id: 'iYc_QDTqCN0', title: 'One-Handed Backhand Winner with the Saber Racket', channelName: 'Functional Tennis', description: 'A demonstration of the Functional Tennis Saber training racket used to hit a clean one-handed backhand winner.' },
    { id: 'tXMDFpUsrDs', title: 'How Manufacturers Grip Tennis Rackets in Bulk', channelName: 'Functional Tennis', description: 'An inside look at the factory process of how tennis racket manufacturers apply grips to rackets at scale.' },
    { id: 'dW4JkI7mOYI', title: 'How to String the Functional Tennis Saber', channelName: 'Functional Tennis', description: 'A step-by-step guide to stringing the Functional Tennis Saber training racket correctly.' },
    { id: '_ce0ZBZahTU', title: '7-Year-Old Striking with the Saber Junior', channelName: 'Functional Tennis', description: 'A 7-year-old demonstrates the Saber Junior training racket, showing how the tool helps young players develop strokes.' },
    { id: 'BllkvN0J3U8', title: 'Saber vs Saber', channelName: 'Functional Tennis', description: 'Two players face off using the Functional Tennis Saber training racket in an entertaining exhibition rally.' },
    { id: 'lMfZirEDEd4', title: 'Saber vs Saber | CRUSHING the Forehand', channelName: 'Functional Tennis', description: 'Players compete with the Saber training racket focusing on generating maximum forehand power and spin.' },
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
    { id: 'SbBWDkcKnC4', title: 'Same Team, One Goal', channelName: 'Ben Shelton', description: 'Ben Shelton reflects on the unity and shared purpose within his team as they work towards his next breakthrough.' },
    { id: '1CCL85tdo1U', title: 'My Australian Open Run. Failure Only Fuels Me', channelName: 'Ben Shelton', description: 'Ben Shelton shares his honest reflection on his Australian Open campaign and how setbacks drive his motivation.' },
    { id: 'M95GqTYmM2A', title: '1992', channelName: 'Ben Shelton', description: 'A behind-the-scenes vlog episode from Ben Shelton\'s The Long Game series, referencing a pivotal moment in tennis history.' },
    { id: 'BSzneTQ1BUY', title: 'Small Tweaks', channelName: 'Ben Shelton', description: 'Ben Shelton documents the small but significant technique adjustments he\'s making to elevate his game on tour.' },
    { id: 'ncL9UFJPkTI', title: 'Meet Koda', channelName: 'Ben Shelton', description: 'Ben Shelton introduces his dog Koda in a fun personal episode from The Long Game docuseries.' },
    { id: 'qKqrxBQgaF8', title: 'Offseason and Australia Preparation | The Long Game', channelName: 'Ben Shelton', description: 'The Long Game follows Ben Shelton through his offseason training and preparations for the Australian swing.' },
    { id: '11EPkI0KdAY', title: 'Who Gave Trinity the Mic? The Long Game Episode 1 Out Now', channelName: 'Ben Shelton', description: 'The first episode of Ben Shelton\'s The Long Game docuseries, introducing his team including Trinity with a mic.' },
    { id: '4gDkwHWrWmY', title: 'The Long Game | 2025 US Open & ATP Championships', channelName: 'Ben Shelton', description: 'Ben Shelton documents his experience at the 2025 US Open and ATP Finals in this Long Game episode.' },
    { id: 'n9rdisapxSc', title: 'I\'m Ben Shelton. Welcome to My Channel.', channelName: 'Ben Shelton', description: 'Ben Shelton introduces his YouTube channel and The Long Game docuseries concept to new viewers.' },
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
          { id: 'gQOgd-G3Caw', title: 'Try Not to LAUGH! Funniest Moments of Wimbledon 2025', channelName: 'Wimbledon', description: 'A hilarious compilation of the funniest on-court and off-court moments from Wimbledon 2025.' },
          { id: '5NmIav-DttI', title: 'Wimbledon\'s Funniest Moments', channelName: 'Wimbledon', description: 'A classic compilation of Wimbledon\'s most hilarious on-court mishaps, crowd reactions, and player antics.' },
          { id: 'O0MKEhWTeWk', title: 'Gael Monfils Makes It Look Easy', channelName: 'Wimbledon', description: 'Gael Monfils dazzles on the Wimbledon grass with his extraordinary athleticism and entertainment value.' },
          { id: 'uOFxJwXtt_0', title: 'Superman Djokovic', channelName: 'Wimbledon', description: 'Novak Djokovic produces a superhero diving save at Wimbledon that left fans and commentators stunned.' },
          { id: 'psTGGyhXrJ8', title: 'Ons Jabeur Moments to Make You Smile', channelName: 'Wimbledon', description: 'A heartwarming collection of Ons Jabeur\'s most charming and crowd-pleasing moments at Wimbledon.' },
          { id: 'y3SiQlIVrdw', title: 'Wimbledon Nature Trivia Questions', channelName: 'Wimbledon', description: 'A fun Wimbledon trivia segment exploring the natural wildlife and garden history of the All England Club.' },
          { id: 'wDSk5zYeys4', title: 'Incredible 13-Minute Game | Raducanu vs Sabalenka', channelName: 'Wimbledon', description: 'An extraordinary 13-minute game between Emma Raducanu and Aryna Sabalenka that had Wimbledon fans on the edge of their seats.' },
        ],
      },
      {
        channelId: 'UCbcxFkd6B9xUU54InHv4Tig',
        name: 'Tennis TV',
        description: 'The lighter side of ATP — funny moments, fails, and personality clips.',
        subscriberCount: '3.2M',
        videos: [
          { id: '0y7UGYdg7lw', title: 'The Greatest Showman', channelName: 'Tennis TV', description: 'A tribute to Gael Monfils, the ultimate showman of tennis, featuring his most jaw-dropping ATP moments.' },
          { id: '1uNAtduuoA8', title: 'There\'s A Real Buzz About Carlos Alcaraz', channelName: 'Tennis TV', description: 'Players and fans react to Carlos Alcaraz\'s electrifying form and personality that has the tennis world talking.' },
          { id: 'RYkGC4ojefM', title: 'Djokovic & Tsitsipas Team Up For Doubles', channelName: 'Tennis TV', description: 'Novak Djokovic and Stefanos Tsitsipas unite as a doubles pairing at Indian Wells 2026 in a fan-favourite match.' },
          { id: 'OXaEUUUJJ7s', title: '25 Tennis Shots SO GOOD the Opponent Had to Applaud', channelName: 'Tennis TV', description: 'A compilation of 25 incredible ATP shots so brilliant that even the opponents couldn\'t help but clap.' },
          { id: '-rL_bBpTcps', title: 'Top 10 Funny ATP Tennis Moments', channelName: 'Tennis TV', description: 'A countdown of the ten funniest moments in ATP Tour history featuring players, ball kids, and unforgettable incidents.' },
          { id: '_HHcRJ-rPCo', title: '27 Unique Nick Kyrgios ATP Tennis Moments!', channelName: 'Tennis TV', description: '27 of Nick Kyrgios\'s most unique, controversial, and entertaining moments on the ATP Tour.' },
          { id: 'VW-4A-QUDWY', title: 'Top 10 Tennis Crowd Interaction Moments', channelName: 'Tennis TV', description: 'The ten best moments when ATP players broke the fourth wall and interacted hilariously with the crowd.' },
          { id: 'j7mP-99u3Hw', title: 'FUNNIEST Moments From The 2024 ATP Season', channelName: 'Tennis TV', description: 'The best and funniest moments from the 2024 ATP season including player pranks, fails, and crowd interactions.' },
          { id: 'rWMQJEf3pL8', title: 'TOP 50 EPIC GAEL MONFILS ATP SHOTS!', channelName: 'Tennis TV', description: 'A compilation of Gael Monfils\'s 50 most spectacular, athletic, and crowd-pleasing ATP shots.' },
        ],
      },
      {
        channelId: 'UC5LvAVo8fSKuEMsBN7s7ZhA',
        name: 'Functional Tennis',
        description: 'Creative tennis challenges, reaction drills, and fun content.',
        subscriberCount: '210K',
        videos: [
          { id: 'AUT06D6ZOAI', title: 'The Story Behind the World\'s Most Famous Tennis Toilet', channelName: 'Functional Tennis', description: 'The fascinating and unexpected story behind the toilet that became a viral sensation in the tennis world.' },
          { id: 'iIxcGs_jd0A', title: '5-Minute Match Point at Under 14 Tennis Europe Masters', channelName: 'Functional Tennis', description: 'An extraordinary five-minute match point at Under 14 level that showcases remarkable junior tennis determination.' },
          { id: 'BllkvN0J3U8', title: 'Saber vs Saber', channelName: 'Functional Tennis', description: 'Two players face off using the Functional Tennis Saber training racket in an entertaining exhibition rally.' },
          { id: 'lMfZirEDEd4', title: 'Saber vs Saber | CRUSHING the Forehand', channelName: 'Functional Tennis', description: 'Players compete with the Saber training racket focusing on generating maximum forehand power and spin.' },
        ],
      },
      {
        channelId: 'UC7joGi4V3-r9i5tmmw7dM6g',
        name: 'US Open Tennis',
        description: 'Classic Grand Slam finals, trick shots, and unforgettable moments from Flushing Meadows.',
        subscriberCount: '1.5M',
        videos: [
          { id: 'va-7PmXTKwk', title: '1 in 1 Million Moments | US Open', channelName: 'US Open Tennis', description: 'A collection of once-in-a-lifetime shots and moments that could only happen at the US Open in New York.' },
          { id: '-SzPNvA8n4I', title: 'Greatest Trick Shots in History! | US Open', channelName: 'US Open Tennis', description: 'The most audacious and creative trick shots ever witnessed at the US Open throughout the tournament\'s history.' },
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
  'indian-wells-complete-guide': [
    { id: 'jVM-23iyFvg', title: 'Alcaraz, Djokovic, Draper & Bublik | Indian Wells 2026', channelName: 'Tennis TV' },
    { id: 'SOZF-mdDIBg', title: 'Alcaraz vs Dimitrov | Indian Wells 2026', channelName: 'Tennis TV' },
    { id: 'D3Ezm-6gr8Q', title: 'Alcaraz vs Medvedev For The Title | Indian Wells 2023 Final', channelName: 'Tennis TV' },
    { id: 'r_u4fVOD9Ng', title: 'Rune vs Draper For The Title | Indian Wells 2025 Final', channelName: 'Tennis TV' },
  ],
  'atp-finals-complete-guide': [
    { id: '2n70tHqPWDQ', title: 'Sinner vs Alcaraz For The Title | ATP Finals 2025', channelName: 'Tennis TV' },
    { id: 'lWpvAhyK2go', title: 'EPIC Djokovic vs Sinner | ATP Finals 2023', channelName: 'Tennis TV' },
    { id: 'BO9S2WB8I64', title: 'Djokovic vs Sinner For The Title! | ATP Finals 2023 Final', channelName: 'Tennis TV' },
    { id: 'dvSN1tmNJnQ', title: 'Sinner vs Ben Shelton | ATP Finals 2025', channelName: 'Tennis TV' },
  ],
  'miami-open-complete-guide': [
    { id: 'X00UI4vOKLU', title: 'Sinner & Alcaraz EPIC Match | Miami 2023', channelName: 'Tennis TV' },
    { id: 'thEt28eCkJc', title: 'Alcaraz vs Ruud For The Title | Miami 2022 Final', channelName: 'Tennis TV' },
    { id: 'W_lTYpPp3Ig', title: 'Sinner vs Dimitrov For The Title | Miami 2024 Final', channelName: 'Tennis TV' },
    { id: 'NfPR1FdjtcM', title: 'Djokovic vs Mensik For The Title | Miami 2025 Final', channelName: 'Tennis TV' },
  ],
  'monte-carlo-masters-complete-guide': [
    { id: 'dQUKOY8D3IE', title: 'Carlos Alcaraz vs Jannik Sinner Final | Monte-Carlo 2026 Highlights', channelName: 'Tennis TV' },
    { id: 'IhwyJr8DGj0', title: 'Court-Level For Alcaraz vs Sinner Final | Monte-Carlo 2026 Highlights', channelName: 'Tennis TV' },
    { id: 'G4wnT48PWFc', title: 'Behind-The-Scenes With Sinner After 2026 Monte-Carlo Triumph', channelName: 'Tennis TV' },
    { id: 'pHf2SoYWbFE', title: 'Jannik Sinner Full On-Court Warm Up in Monte Carlo 2024', channelName: 'Functional Tennis' },
  ],
  'madrid-open-guide': [
    { id: 'QZQzjHxGUi8', title: 'Sinner, Ruud, Medvedev, Zverev Seek QF Spots | Madrid 2026 Highlights', channelName: 'Tennis TV' },
    { id: 'HKhR3ces3bE', title: 'Jannik Sinner vs Rafael Jodar | Madrid 2026 QF Highlights', channelName: 'Tennis TV' },
    { id: 'lkgQ2qc9kJs', title: 'Aryna Sabalenka vs Naomi Osaka | 2026 Madrid R16 Highlights', channelName: 'WTA' },
    { id: '2bgJVeZaACc', title: 'Leylah Fernandez vs Mirra Andreeva | 2026 Madrid QF Highlights', channelName: 'WTA' },
  ],
};
