#!/usr/bin/env node
/**
 * SUPER.TENNIS — AI Content Generator
 *
 * Generates full articles for different content types using OpenAI gpt-4o-mini.
 * Articles are stored in the Supabase `articles` table with status 'draft'.
 *
 * Usage: node scripts/generate-content.mjs <type> [options]
 *
 * Types:
 *   player-profile    Extended player profiles (800-1200 words)
 *   player-networth   Net worth articles for top players
 *   player-racket     Equipment/racket setup articles
 *   record            Tennis record articles
 *   gear              Equipment review/guide articles
 *   lifestyle         Tennis lifestyle articles
 *
 * Options:
 *   --limit N         Number of articles to generate (default: 5)
 *   --tour atp|wta    Filter by tour (player types only)
 *   --dry-run         Show what would be generated without API calls
 *   --force           Regenerate even if article exists
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}
if (!OPENAI_KEY || OPENAI_KEY === 'sk-your-key') {
  console.error('❌ Missing or placeholder OPENAI_API_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Parse CLI args
const args = process.argv.slice(2);
const TYPE = args.find(a => !a.startsWith('--')) || 'player-profile';
function getArg(name, defaultVal) {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return defaultVal;
  return args[idx + 1] || defaultVal;
}
const LIMIT = parseInt(getArg('limit', '5'));
const TOUR_FILTER = getArg('tour', null);
const FORCE = args.includes('--force');
const DRY_RUN = args.includes('--dry-run');

// Country names
const COUNTRIES = {
  USA: 'United States', GBR: 'Great Britain', FRA: 'France', GER: 'Germany',
  ESP: 'Spain', ITA: 'Italy', SRB: 'Serbia', SUI: 'Switzerland', AUS: 'Australia',
  ARG: 'Argentina', CAN: 'Canada', RUS: 'Russia', JPN: 'Japan', CHN: 'China',
  CZE: 'Czech Republic', POL: 'Poland', BLR: 'Belarus', KAZ: 'Kazakhstan',
  NOR: 'Norway', GRE: 'Greece', CRO: 'Croatia', BUL: 'Bulgaria', ROU: 'Romania',
  BRA: 'Brazil', DEN: 'Denmark', RSA: 'South Africa', IND: 'India', KOR: 'South Korea',
  NED: 'Netherlands', BEL: 'Belgium', AUT: 'Austria', SWE: 'Sweden', UKR: 'Ukraine',
  COL: 'Colombia', CHI: 'Chile', GEO: 'Georgia', TUN: 'Tunisia', LAT: 'Latvia',
  HUN: 'Hungary', POR: 'Portugal', FIN: 'Finland', SVK: 'Slovakia', SLO: 'Slovenia',
};

function getCountryName(code) {
  return COUNTRIES[code] || code || 'Unknown';
}

function getAge(birthDate) {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function formatPrize(amount) {
  if (!amount) return 'N/A';
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

// ============================================================
// PROMPT TEMPLATES
// ============================================================

const PROMPT_TEMPLATES = {
  'player-profile': (player) => {
    const age = getAge(player.birth_date);
    const country = getCountryName(player.country_code);
    const tour = player.tour === 'atp' ? 'ATP' : 'WTA';
    const hand = player.hand === 'L' ? 'left-handed' : player.hand === 'R' ? 'right-handed' : '';

    return {
      system: 'You are a professional sports journalist writing for super.tennis, a tennis website for casual fans. Write engaging, accessible content. Use markdown formatting (## for sections, **bold** for emphasis). Do NOT invent specific tournament results or achievements not provided in the data.',
      prompt: `Write a comprehensive player profile article (600-900 words) for ${player.first_name} ${player.last_name}.

## Player Data
- Full Name: ${player.first_name} ${player.last_name}
- Country: ${country}
- Tour: ${tour}
${age ? `- Age: ${age}` : ''}
${player.height_cm ? `- Height: ${player.height_cm}cm` : ''}
${hand ? `- Plays: ${hand}` : ''}
- Career Titles: ${player.career_titles}
${player.grand_slam_titles > 0 ? `- Grand Slam Titles: ${player.grand_slam_titles}` : ''}
- Career Win-Loss: ${player.career_win}-${player.career_loss}
- Career Prize Money: ${formatPrize(player.career_prize_usd)}

## Article Structure (use these exact section headers):
## Early Life & Background
(2-3 sentences about their country, when they started tennis)

## Playing Style
(3-4 sentences about their style, strengths — based on tour, hand, height, results)

## Career Highlights
(4-5 sentences about their biggest achievements using the stats above. Be factual.)

## Legacy & Impact
(2-3 sentences about their place in tennis history)

## Quick Facts
(Bullet list of 5-6 key facts from the data)

Guidelines:
- Write in third person
- Use present tense for active players, past tense for retired
- Be factual — only reference statistics provided above
- Make it engaging for people who may not follow tennis closely
- NO quotes or citations
- Include their career titles and win-loss record naturally in the text`,
      maxTokens: 1200,
    };
  },

  'player-networth': (player) => {
    const country = getCountryName(player.country_code);
    const tour = player.tour === 'atp' ? 'ATP' : 'WTA';

    return {
      system: 'You are a sports finance journalist writing for super.tennis. Write about tennis players\' earnings and net worth in an informative, factual style. Use markdown formatting. Only state facts you can derive from the provided data — for net worth estimates, clearly label them as estimates.',
      prompt: `Write a net worth article (500-700 words) for ${player.first_name} ${player.last_name}.

## Player Data
- Full Name: ${player.first_name} ${player.last_name}
- Country: ${country}
- Tour: ${tour}
- Career Prize Money: ${formatPrize(player.career_prize_usd)} (official on-court earnings)
- Career Titles: ${player.career_titles}
${player.grand_slam_titles > 0 ? `- Grand Slam Titles: ${player.grand_slam_titles}` : ''}

## Article Structure:
## ${player.first_name} ${player.last_name} Net Worth in 2026
(1-2 sentences with estimated net worth. Note: typically 2-5x prize money for top players due to endorsements)

## Career Prize Money Breakdown
(Discuss their ${formatPrize(player.career_prize_usd)} in official earnings, how it compares to peers)

## Endorsement Deals & Business Ventures
(General discussion of likely endorsement profile based on their ranking/titles/country. Be general, not specific unless obvious — e.g. top-10 players typically have major shoe/racket deals)

## How ${player.first_name} ${player.last_name}'s Earnings Compare
(Brief comparison to other players on the ${tour} tour)

## Key Financial Facts
(Bullet list of 4-5 facts about their earnings)

Guidelines:
- Net worth estimates should be clearly labeled as estimates
- Base estimates on prize money × 2-5 multiplier (higher for Grand Slam champions)
- Do NOT invent specific endorsement deal values
- Be factual and transparent about what is estimated vs. confirmed`,
      maxTokens: 900,
    };
  },

  'player-racket': (player) => {
    const tour = player.tour === 'atp' ? 'ATP' : 'WTA';
    const hand = player.hand === 'L' ? 'left-handed' : player.hand === 'R' ? 'right-handed' : '';

    return {
      system: 'You are a tennis equipment expert writing for super.tennis. Write about player equipment setups in a detailed but accessible way. Use markdown formatting. Be honest about what you know vs. what is speculative.',
      prompt: `Write an equipment article (400-600 words) about ${player.first_name} ${player.last_name}'s racket and gear.

## Player Data
- Full Name: ${player.first_name} ${player.last_name}
- Tour: ${tour}
${hand ? `- Plays: ${hand}` : ''}
${player.height_cm ? `- Height: ${player.height_cm}cm` : ''}
- Career Titles: ${player.career_titles}

## Article Structure:
## What Racket Does ${player.first_name} ${player.last_name} Use?
(General discussion of their likely equipment setup based on tour and playing level. Note: pro players often use custom-spec rackets painted to look like retail models.)

## Racket Specifications
(General spec discussion: head size, weight, balance — typical for ${tour} pros)

## String Setup
(General discussion of string preferences for players at this level)

## Playing Style & Equipment Connection
(How their equipment choices relate to their playing style and results)

## Similar Setups
(Suggest similar retail rackets for recreational players inspired by this setup)

Guidelines:
- Be transparent that exact pro specifications are often different from retail
- Discuss equipment in the context of their playing style
- Make it useful for amateur players who want to learn
- Do NOT invent specific brand partnerships unless the player is famously associated with one`,
      maxTokens: 800,
    };
  },
};

// ============================================================
// RECORD ARTICLE TEMPLATES
// ============================================================

const RECORD_ARTICLES = [
  {
    slug: 'most-grand-slam-titles',
    title: 'Most Grand Slam Titles in Tennis History',
    category: 'records',
    prompt: `Write an article (600-800 words) about the all-time Grand Slam title leaders in tennis.

Structure:
## Most Grand Slam Titles in Tennis History
## Men's Grand Slam Record Holders
## Women's Grand Slam Record Holders
## The Race for the All-Time Record
## Grand Slam Records by Tournament

Use these facts:
- Men's record: Novak Djokovic (24), Rafael Nadal (22), Roger Federer (20)
- Women's record (Open Era): Serena Williams (23)
- Most at Australian Open: Djokovic (10)
- Most at Roland Garros: Nadal (14)
- Most at Wimbledon: Federer (8)
- Most at US Open: Federer, Connors, Sampras (5 each)`,
  },
  {
    slug: 'fastest-serve-tennis',
    title: 'Fastest Serve in Tennis History',
    category: 'records',
    prompt: `Write an article (500-700 words) about serve speed records in tennis.

Structure:
## Fastest Serve in Tennis History
## The Official Record
## Fastest Serves in Grand Slams
## Biggest Servers in ATP History
## How Serve Speed is Measured

Use these facts:
- Fastest ever: Sam Groth 263.4 km/h (2012, Challenger event, not ATP-recognized)
- ATP recognized: John Isner 253 km/h (2016 Davis Cup)
- Notable big servers: John Isner, Ivo Karlovic, Nick Kyrgios, Milos Raonic
- Technology: Hawk-Eye and radar gun measurements`,
  },
  {
    slug: 'longest-match-tennis',
    title: 'The Longest Tennis Match in History',
    category: 'records',
    prompt: `Write an article (500-700 words) about the longest matches in tennis history.

Structure:
## The Longest Match in Tennis History
## Isner vs. Mahut: 11 Hours, 5 Minutes
## Other Historically Long Matches
## How This Changed Tennis Rules
## Final Set Tiebreak Rules Today

Use these facts:
- Isner vs Mahut at 2010 Wimbledon: 11 hours 5 minutes over 3 days
- Final score: 6-4, 3-6, 6-7(7), 7-6(3), 70-68
- Led to rule changes: final set tiebreak at 12-12 in Grand Slams
- Wimbledon now uses a tiebreak at 12-12 (introduced 2019)`,
  },
  {
    slug: 'most-weeks-number-one',
    title: 'Most Weeks at World No. 1 in Tennis',
    category: 'records',
    prompt: `Write an article (500-700 words) about the world No. 1 ranking records.

Structure:
## Most Weeks at World No. 1
## Men's No. 1 Record: Novak Djokovic
## Women's No. 1 Record: Steffi Graf
## Youngest Players to Reach No. 1
## Year-End No. 1 Records

Use these facts:
- Men's record: Djokovic 428 weeks, Federer 310, Sampras 286, Nadal 209
- Women's record: Steffi Graf 377 weeks, Martina Navratilova 332, Serena Williams 319
- Youngest men's No. 1: Carlos Alcaraz at 19 years, 4 months
- Youngest women's No. 1: Martina Hingis at 16 years, 6 months
- Most year-end No. 1 (men): Djokovic 8 times`,
  },
  {
    slug: 'most-career-titles-tennis',
    title: 'Most Career Titles in Tennis History',
    category: 'records',
    prompt: `Write an article (600-800 words) about the all-time career title leaders in tennis.

Structure:
## Most Career Titles in Tennis History
## Men's Open Era Career Title Leaders
## Women's Open Era Career Title Leaders
## Active Players Climbing the Rankings
## What It Takes to Win 50+ Titles

Use these facts:
- Men's all-time (Open Era): Jimmy Connors (109), Roger Federer (103), Ivan Lendl (94), Novak Djokovic (99), Rafael Nadal (92)
- Women's all-time (Open Era): Martina Navratilova (167 incl doubles), Chris Evert (157), Steffi Graf (107)
- Active players: Djokovic (99), approaching Connors' record
- Title rate: Federer won 103 from ~1500 matches, Djokovic 99 from ~1300 matches`,
  },
  {
    slug: 'longest-winning-streaks-tennis',
    title: 'Longest Winning Streaks in Tennis History',
    category: 'records',
    prompt: `Write an article (500-700 words) about the longest winning streaks in tennis.

Structure:
## Longest Winning Streaks in Tennis History
## Men's Record: Guillermo Vilas — 46 Matches
## Women's Record: Martina Navratilova — 74 Matches
## Modern Era Winning Streaks
## Surface-Specific Streaks

Use these facts:
- Men's Open Era record: Guillermo Vilas 46 consecutive wins (1977)
- Women's record: Martina Navratilova 74 consecutive wins (1984)
- Novak Djokovic: 43 consecutive wins in 2011
- Roger Federer: 41 consecutive wins spanning 2006-07
- Rafael Nadal: 81 consecutive wins on clay (2005-07)
- Roger Federer: 65 consecutive wins on grass (2003-08)`,
  },
  {
    slug: 'biggest-upsets-tennis',
    title: 'The Biggest Upsets in Tennis History',
    category: 'records',
    prompt: `Write an article (600-800 words) about the most shocking upsets in tennis history.

Structure:
## The Biggest Upsets in Tennis History
## Grand Slam Shock Results
## Ranking Upsets: When Underdogs Triumphed
## What Makes an Upset in Tennis?
## Notable First-Round Exits

Use these facts:
- Robin Soderling beat Rafael Nadal at 2009 Roland Garros (ended Nadal's 31-match RG streak)
- Lukas Rosol beat Rafael Nadal at 2012 Wimbledon (2nd round)
- Roberta Vinci beat Serena Williams at 2015 US Open semifinal (stopped Calendar Slam)
- Novak Djokovic lost to #178 Daniel Elahi Galan at 2023 Davis Cup
- Boris Becker won Wimbledon at 17 as unseeded (1985)
- Emma Raducanu won 2021 US Open as qualifier (ranked #150)`,
  },
  {
    slug: 'golden-slam-calendar-slam',
    title: 'Golden Slam & Calendar Slam — Tennis\'s Rarest Achievement',
    category: 'records',
    prompt: `Write an article (500-700 words) about the Golden Slam and Calendar Slam in tennis.

Structure:
## What Is a Golden Slam?
## Calendar Slam Holders
## Golden Slam Holders
## Near Misses: Who Almost Made It?
## Why It's So Hard

Use these facts:
- Calendar Slam (all 4 Slams in one year): Rod Laver (1962, 1969), Maureen Connolly (1953), Margaret Court (1970), Steffi Graf (1988)
- Golden Slam (all 4 Slams + Olympic Gold): Only Steffi Graf (1988)
- Novak Djokovic came close in 2021 (won 3 Slams, lost US Open final)
- Serena Williams came close in 2015 (won 3 Slams, lost US Open SF)
- Last Calendar Slam attempt was Djokovic in 2021`,
  },
  {
    slug: 'youngest-oldest-tennis-records',
    title: 'Youngest & Oldest Records in Tennis History',
    category: 'records',
    prompt: `Write an article (500-700 words) about age-related records in tennis.

Structure:
## Age Records in Tennis
## Youngest Grand Slam Champions
## Oldest Grand Slam Champions
## Youngest World No. 1 Players
## Longest Careers in Tennis

Use these facts:
- Youngest men's Slam champion: Michael Chang (17y 3m, 1989 Roland Garros)
- Youngest women's Slam champion: Martina Hingis (16y 3m, 1997 Australian Open)
- Oldest men's Slam champion: Ken Rosewall (37y 2m, 1972 Australian Open), in Open Era: Federer (36, 2018 AO)
- Oldest women's Slam champion: Serena Williams (35, 2017 Australian Open)
- Youngest men's No. 1: Carlos Alcaraz (19y 4m)
- Youngest women's No. 1: Martina Hingis (16y 6m)
- Longest career: Martina Navratilova played pro tennis for 32 years
- Roger Federer retired at 41, Serena Williams at 41`,
  },
  {
    slug: 'most-aces-tennis-records',
    title: 'Most Aces in Tennis History — All-Time Records',
    category: 'records',
    prompt: `Write an article (500-700 words) about ace records in professional tennis.

Structure:
## Most Aces in Tennis History
## All-Time Career Ace Leaders
## Most Aces in a Single Match
## Most Aces at Grand Slams
## The Science of the Big Serve

Use these facts:
- All-time career aces leader: Ivo Karlovic (~13,728 career aces)
- Second: John Isner (~12,000+)
- Most aces in a single match: John Isner (113 aces vs Mahut, 2010 Wimbledon)
- Karlovic hit 78 aces in a single Davis Cup match (2009)
- Average ace speed on ATP Tour: ~195-210 km/h for top servers
- Isner vs Mahut featured combined 216 aces in one match`,
  },
];

// ============================================================
// GEAR ARTICLE TEMPLATES
// ============================================================

const GEAR_ARTICLES = [
  {
    slug: 'best-tennis-rackets-2026',
    title: 'Best Tennis Rackets in 2026 — Complete Buyer\'s Guide',
    prompt: `Write a comprehensive gear guide (700-900 words) about the best tennis rackets in 2026.

Structure:
## Best Tennis Rackets in 2026
## Best Overall: Wilson Clash 100 v2
## Best for Power: Babolat Pure Drive 2024
## Best for Control: HEAD Gravity Pro
## Best for Beginners: Wilson Burn 100
## Best for Advanced Players: Yonex VCORE 98
## How to Choose the Right Racket

Cover: head size, weight, balance, string pattern basics. Make it useful for recreational players.`,
  },
  {
    slug: 'best-tennis-strings-guide',
    title: 'Best Tennis Strings in 2026 — Types, Tension & Setup Guide',
    prompt: `Write a gear guide (600-800 words) about tennis strings.

Structure:
## Tennis String Guide
## Types of Tennis Strings (Natural Gut, Polyester, Synthetic, Multifilament)
## How String Tension Affects Play
## Best Strings for Power
## Best Strings for Spin
## How Often to Restring
## Pro Player String Choices`,
  },
  {
    slug: 'best-tennis-shoes-2026',
    title: 'Best Tennis Shoes in 2026 — Court-Tested Reviews',
    prompt: `Write a gear guide (600-800 words) about the best tennis shoes.

Structure:
## Best Tennis Shoes in 2026
## Best Overall: Nike Vapor Pro 2
## Best for Clay: Asics Gel-Resolution 9
## Best for Hard Court: adidas Barricade 2026
## Best Budget Option: New Balance Fresh Foam Lav v2
## How to Choose Tennis Shoes (Surface, Fit, Durability)`,
  },
  {
    slug: 'tennis-bag-guide',
    title: 'Best Tennis Bags in 2026 — From Backpacks to 12-Pack',
    prompt: `Write a gear guide (500-700 words) about tennis bags.

Structure:
## Best Tennis Bags in 2026
## Types of Tennis Bags
## Best Tournament Bag: Wilson Super Tour
## Best Backpack: HEAD Tour Team Backpack
## Best Budget Bag
## What to Look for in a Tennis Bag`,
  },
  {
    slug: 'tennis-overgrip-guide',
    title: 'Best Tennis Overgrips — Tourna, Wilson, Yonex Compared',
    prompt: `Write a gear guide (400-600 words) about tennis overgrips.

Structure:
## Best Tennis Overgrips
## Why Overgrips Matter
## Best Dry Grip: Tourna Grip Original
## Best Tacky Grip: Wilson Pro Overgrip
## Best Absorbent: Yonex Super Grap
## How Often to Change Your Overgrip`,
  },
  {
    slug: 'head-vs-wilson-vs-babolat',
    title: 'HEAD vs Wilson vs Babolat — Which Brand Is Best?',
    prompt: `Write a comparison article (600-800 words) comparing the three biggest tennis racket brands.

Structure:
## HEAD vs Wilson vs Babolat
## Brand History & Heritage
## HEAD: The Power Specialist
## Wilson: The All-Rounder
## Babolat: The Spin King
## Pro Player Brand Allegiances
## Which Brand Is Right for You?`,
  },
  {
    slug: 'best-tennis-balls-2026',
    title: 'Best Tennis Balls in 2026 — Wilson, Penn, Dunlop Compared',
    prompt: `Write a gear guide (500-600 words) about tennis balls.

Structure:
## Best Tennis Balls
## Types of Tennis Balls (Pressurized vs Pressureless)
## Best Overall: Wilson US Open
## Best for Practice: Penn Championship
## Best Premium: Dunlop Fort All Court
## How Long Do Tennis Balls Last?`,
  },
  {
    slug: 'tennis-accessories-essentials',
    title: 'Essential Tennis Accessories Every Player Needs',
    prompt: `Write a gear guide (500-700 words) about must-have tennis accessories.

Structure:
## Essential Tennis Accessories
## Vibration Dampeners: Do They Work?
## Best Tennis Wristbands & Headbands
## Tennis Elbow Prevention Gear
## Court Essentials: Water, Towels, Sunscreen
## Training Aids Worth Buying`,
  },
  {
    slug: 'junior-tennis-racket-guide',
    title: 'Best Junior Tennis Rackets — Guide by Age & Size',
    prompt: `Write a gear guide (500-700 words) about tennis rackets for kids and juniors.

Structure:
## Best Junior Tennis Rackets
## Racket Size by Age (19", 21", 23", 25", 26")
## Best for Ages 4-6
## Best for Ages 7-9
## Best for Ages 10-12
## When to Switch to Adult Rackets`,
  },
  {
    slug: 'best-clay-court-shoes',
    title: 'Best Tennis Shoes for Clay Courts in 2026',
    prompt: `Write a focused gear guide (500-600 words) about clay court tennis shoes.

Structure:
## Best Clay Court Tennis Shoes
## Why Clay Needs Special Shoes
## Best Overall: Asics Gel-Resolution 9 Clay
## Best for Sliding: Nike Zoom Vapor Pro 2 Clay
## Best Durability: adidas Adizero Ubersonic 4 Clay
## Herringbone Sole Pattern Explained`,
  },
  {
    slug: 'tennis-racket-weight-guide',
    title: 'Tennis Racket Weight Guide — Light vs Heavy, Which Is Better?',
    prompt: `Write a technical guide (500-700 words) about tennis racket weight and how it affects play.

Structure:
## Tennis Racket Weight Guide
## Weight Categories (Light <285g, Medium 285-310g, Heavy 310g+)
## Benefits of Lighter Rackets
## Benefits of Heavier Rackets
## How Pros Customize Weight (Lead Tape, Silicone)
## Finding Your Ideal Weight`,
  },
  {
    slug: 'tennis-sunglasses-guide',
    title: 'Best Sunglasses for Tennis — UV Protection on Court',
    prompt: `Write a gear guide (400-500 words) about sunglasses for tennis.

Structure:
## Best Sunglasses for Tennis
## Why Tennis Players Need Sunglasses
## Best Overall: Oakley Radar EV
## Best Budget: Under Armour Blitzing
## Lens Color Guide for Tennis
## Prescription Options`,
  },
  {
    slug: 'best-tennis-dampeners',
    title: 'Best Tennis Vibration Dampeners — Do They Actually Work?',
    prompt: `Write a gear article (400-600 words) about vibration dampeners.

Structure:
## Tennis Vibration Dampeners
## What Dampeners Actually Do (and Don't Do)
## Best Dampener: Wilson Pro Feel
## Do Pro Players Use Dampeners?
## Types: Button vs Worm
## DIY Alternatives`,
  },
  {
    slug: 'tennis-elbow-prevention-gear',
    title: 'Tennis Elbow Prevention — Best Gear & Equipment Tips',
    prompt: `Write a helpful guide (500-700 words) about preventing tennis elbow through equipment choices.

Structure:
## Tennis Elbow Prevention Through Equipment
## How Racket Choice Affects Tennis Elbow
## Best Rackets for Arm-Friendly Play
## String Choice: Softer Is Better
## Grip Size Matters
## Compression Sleeves & Braces That Help`,
  },
  {
    slug: 'used-tennis-rackets-buying-guide',
    title: 'Buying Used Tennis Rackets — Complete Guide',
    prompt: `Write a practical guide (500-600 words) about buying used/second-hand tennis rackets.

Structure:
## Buying Used Tennis Rackets
## Where to Buy Used Rackets
## What to Check Before Buying
## How to Spot a Good Deal
## Rackets That Hold Value
## When to Buy New Instead`,
  },
  // ── New gear articles (batch 2) ──
  {
    slug: 'tennis-racket-string-tension-guide',
    title: 'Tennis String Tension Guide — How Tight Should You String?',
    prompt: `Write a gear guide (500-700 words) about tennis racket string tension.

Structure:
## Tennis String Tension Explained
## What Does Tension Affect? (Power, Control, Spin, Feel)
## Recommended Tension Ranges by Racket Type
## High Tension vs Low Tension: Pros and Cons
## How Temperature Affects String Tension
## Pro Player Tension Preferences
## Finding Your Ideal Tension

Be practical and help recreational players understand tension choices.`,
  },
  {
    slug: 'best-tennis-ball-machines-2026',
    title: 'Best Tennis Ball Machines 2026 — Practice Like a Pro',
    prompt: `Write a gear guide (500-700 words) about the best tennis ball machines.

Structure:
## Best Tennis Ball Machines 2026
## Why Ball Machines Are Worth the Investment
## Top Picks: Lobster, Spinfire, Slinger Bag
## Budget Options Under $500
## Premium Machines With Programming
## Portable vs Stationary
## Key Features to Consider

Include price ranges and key features for each category.`,
  },
  {
    slug: 'tennis-grip-tape-guide',
    title: 'Tennis Grip Tape & Overgrip Guide — Everything You Need to Know',
    prompt: `Write a gear guide (500-600 words) about tennis grip tape and overgrips.

Structure:
## Tennis Grip & Overgrip Guide
## Replacement Grips vs Overgrips
## Best Overgrips: Tourna, Wilson Pro, Yonex Super Grap
## Tacky vs Dry Overgrips
## How Often to Change Your Overgrip
## Grip Size and Customization
## Pro Player Grip Preferences

Be practical with specific product recommendations.`,
  },
  {
    slug: 'best-tennis-watches-fitness-trackers',
    title: 'Best Watches & Fitness Trackers for Tennis Players 2026',
    prompt: `Write a gear guide (500-700 words) about the best smartwatches and fitness trackers for tennis.

Structure:
## Best Watches for Tennis 2026
## Apple Watch Ultra 2 for Tennis
## Garmin Venu 3 — Tennis-Specific Tracking
## WHOOP 4.0 for Recovery Tracking
## Samsung Galaxy Watch for Android Users
## What Metrics Matter for Tennis Players
## Are Tennis-Specific Tracking Apps Worth It?

Focus on features useful for tennis: heart rate zones, shot tracking, recovery.`,
  },
  {
    slug: 'tennis-court-equipment-setup',
    title: 'Tennis Court Equipment — Nets, Posts, Lines & Accessories',
    prompt: `Write a gear guide (500-600 words) about tennis court equipment for home or club setup.

Structure:
## Tennis Court Equipment Guide
## Tennis Nets: Portable vs Permanent
## Court Surfaces: What to Know
## Training Aids: Rebounders, Targets, Cones
## Court Maintenance Equipment
## Mini Tennis & Backyard Court Options
## Budget Setup for Home Practice

Practical guide for people setting up courts or practice areas.`,
  },
];

// ============================================================
// LIFESTYLE ARTICLE TEMPLATES
// ============================================================

const LIFESTYLE_ARTICLES = [
  {
    slug: 'richest-tennis-players-2026',
    title: 'Richest Tennis Players in the World — 2026 Rankings',
    prompt: `Write a lifestyle article (700-900 words) about the wealthiest tennis players.

Structure:
## Richest Tennis Players in 2026
## 1. Roger Federer — Estimated $550 Million
## 2. Novak Djokovic — Estimated $250 Million
## 3. Rafael Nadal — Estimated $220 Million
## 4. Serena Williams — Estimated $300 Million
## 5. Maria Sharapova — Estimated $200 Million
## How Tennis Players Build Wealth Beyond Prize Money
## The Endorsement Economy in Tennis`,
  },
  {
    slug: 'tennis-fashion-on-court',
    title: 'Tennis Fashion — The Most Iconic Outfits in History',
    prompt: `Write a lifestyle article (600-800 words) about fashion in tennis.

Structure:
## Tennis Fashion Through the Decades
## The All-White Tradition at Wimbledon
## Most Iconic Tennis Outfits Ever
## Nike vs adidas: The Fashion Battle
## How Players Express Themselves Through Style
## Tennis Fashion Trends in 2026`,
  },
  {
    slug: 'tennis-diet-nutrition',
    title: 'What Do Tennis Players Eat? Diet & Nutrition Guide',
    prompt: `Write a lifestyle/health article (600-700 words) about tennis player nutrition.

Structure:
## Tennis Player Diet & Nutrition
## Novak Djokovic's Gluten-Free Diet
## Match Day Nutrition
## Hydration During Matches
## What to Eat Before, During, and After Tennis
## Supplements Tennis Players Use`,
  },
  {
    slug: 'tennis-fitness-training',
    title: 'How Tennis Players Train — Fitness, Strength & Conditioning',
    prompt: `Write a lifestyle/fitness article (600-700 words) about how pro tennis players train.

Structure:
## Tennis Training: Beyond the Court
## Physical Demands of Professional Tennis
## Strength Training for Tennis
## Cardio & Endurance Work
## Flexibility & Recovery
## A Typical Training Week for a Top-100 Player`,
  },
  {
    slug: 'tennis-retirement-second-careers',
    title: 'Life After Tennis — What Retired Players Do Next',
    prompt: `Write a lifestyle article (600-700 words) about what tennis players do after retirement.

Structure:
## Life After Professional Tennis
## Coaching: The Most Common Path
## Business Ventures (Federer's On, Sharapova's Sugarpova)
## Broadcasting & Commentary
## Tennis Academy Founders
## Philanthropy & Giving Back`,
  },
  {
    slug: 'best-tennis-movies-documentaries',
    title: 'Best Tennis Movies & Documentaries to Watch',
    prompt: `Write a lifestyle article (500-700 words) about tennis in film and TV.

Structure:
## Best Tennis Movies & Documentaries
## Top Documentaries: Break Point, Strokes of Genius, Untold
## Classic Tennis Movies
## Best Fictional Tennis Films
## Where to Stream Tennis Content
## Tennis YouTube Channels Worth Following`,
  },
  {
    slug: 'tennis-travel-bucket-list',
    title: 'Tennis Travel Bucket List — 10 Tournaments Every Fan Should Attend',
    prompt: `Write a travel/lifestyle article (600-800 words) about must-visit tennis tournaments.

Structure:
## Tennis Travel Bucket List
## 1. Wimbledon — The Queue Experience
## 2. Roland Garros — Paris in May
## 3. Australian Open — Melbourne Magic
## 4. US Open — New York's Grand Slam
## 5. Indian Wells — The Fifth Slam
## Tips for Attending a Grand Slam on a Budget`,
  },
  {
    slug: 'tennis-mental-health',
    title: 'Mental Health in Tennis — How Players Cope with Pressure',
    prompt: `Write a thoughtful article (600-700 words) about mental health in professional tennis.

Structure:
## Mental Health in Professional Tennis
## The Loneliness of Individual Sport
## Naomi Osaka's Impact on the Conversation
## Pressure at Grand Slams
## Sports Psychology in Tennis
## How Fans Can Support Player Mental Health`,
  },
  {
    slug: 'how-to-start-playing-tennis',
    title: 'How to Start Playing Tennis — Beginner\'s Complete Guide',
    prompt: `Write a helpful beginner guide (600-800 words) about starting tennis.

Structure:
## How to Start Playing Tennis
## What Equipment You Need (Budget: $100-200)
## Finding Courts Near You
## Basic Rules You Need to Know
## Your First Lesson: What to Expect
## Tennis Terminology for Beginners
## Apps and Resources for New Players`,
  },
  {
    slug: 'tennis-betting-guide',
    title: 'Understanding Tennis Odds & Statistics — A Fan\'s Guide',
    prompt: `Write an informational article (500-600 words) about tennis statistics and how they're used.

Structure:
## Understanding Tennis Statistics
## Key Stats That Predict Match Outcomes
## Surface Statistics: Why They Matter
## Head-to-Head Records
## How Rankings Work (ATP vs WTA Points System)
## Advanced Stats: Return Points Won, Break Point Conversion`,
  },
  // ── New lifestyle articles (batch 2) ──
  {
    slug: 'tennis-coaching-legends',
    title: 'The Greatest Tennis Coaches of All Time',
    prompt: `Write a lifestyle article (700-900 words) about legendary tennis coaches.

Structure:
## The Coaches Behind the Champions
## Toni Nadal — Building a Legend
## Nick Bollettieri — The Academy Pioneer
## Brad Gilbert — The Strategic Mind
## Patrick Mouratoglou — The Modern Coach
## Darren Cahill — The Players' Coach
## Juan Carlos Ferrero — Coaching the Next Gen (Alcaraz)
## What Makes a Great Tennis Coach?

Focus on their coaching philosophies and famous students.`,
  },
  {
    slug: 'tennis-wags-power-couples',
    title: 'Tennis Power Couples — Love On & Off the Court',
    prompt: `Write a lifestyle article (600-800 words) about famous tennis relationships and couples.

Structure:
## Tennis Power Couples
## On-Court Romances: Sinner & Kalinskaya, Auger-Aliassime & Berrettini's sister
## All-Time Famous Couples: Agassi & Graf, Connors & Evert
## The Challenge of Touring as a Couple
## Tennis Player Families: Djokovic, Federer, Serena
## Behind Every Champion: The Support System

Keep it respectful and focus on public knowledge.`,
  },
  {
    slug: 'tennis-superstitions-rituals',
    title: 'Tennis Superstitions & Pre-Match Rituals — From Nadal to Djokovic',
    prompt: `Write a lifestyle article (600-800 words) about tennis superstitions and rituals.

Structure:
## Tennis Superstitions & Rituals
## Nadal's Famous Routines (water bottles, towels, touching face)
## Djokovic's Bouncing Ball Routine & Diet Beliefs
## Serena's Lucky Socks & Rituals
## Sharapova's Turn-Away Between Points
## Bizarre Superstitions Through History
## Do Rituals Actually Help? Sports Psychology Perspective

Keep tone fun and engaging.`,
  },
  {
    slug: 'tennis-injuries-common',
    title: 'Most Common Tennis Injuries — Prevention & Recovery',
    prompt: `Write a lifestyle/health article (600-800 words) about common tennis injuries.

Structure:
## Common Tennis Injuries
## Tennis Elbow (Lateral Epicondylitis)
## Shoulder Injuries in Tennis
## Knee and Ankle Problems
## Back Pain on the Court
## Famous Injury Comebacks: Nadal, Murray, Del Potro
## Prevention Tips for Recreational Players

Be informative but not medical advice. Reference how pros deal with these injuries.`,
  },
  {
    slug: 'tennis-trophies-prizes',
    title: 'Iconic Tennis Trophies — From the Renshaw Cup to the Daphne Akhurst',
    prompt: `Write a lifestyle article (500-700 words) about the most iconic tennis trophies.

Structure:
## The Most Iconic Tennis Trophies
## The Wimbledon Challenge Cup & Venus Rosewater Dish
## The Coupe des Mousquetaires (French Open)
## The Norman Brookes Cup & Daphne Akhurst (Australian Open)
## The US Open Trophies
## The Davis Cup — The Largest Trophy in Tennis
## Year-End Championship Trophies
## Trophy Traditions and Customs

Include fun facts about trophy weight, history, and traditions.`,
  },
  // ── New lifestyle articles (batch 3) ──
  {
    slug: 'tennis-diet-nutrition-guide',
    title: 'What Tennis Players Eat — Diet & Nutrition Guide',
    prompt: `Write a lifestyle article (600-800 words) about tennis player nutrition.

Structure:
## What Do Tennis Players Eat?
## Pre-Match Nutrition
## During-Match Fueling
## Post-Match Recovery Foods
## Djokovic's Gluten-Free Diet
## Nadal's Mediterranean Diet
## Nutrition Tips for Recreational Players

Include practical advice for recreational players.`,
  },
  {
    slug: 'tennis-fitness-training',
    title: 'Tennis Fitness — How Pros Train Off the Court',
    prompt: `Write a lifestyle article (600-800 words) about tennis fitness training.

Structure:
## How Tennis Players Train Off the Court
## Cardio & Endurance Training
## Strength Training for Tennis
## Flexibility & Injury Prevention
## Recovery: Ice Baths, Sleep & More
## Home Workout for Tennis Players
## How Much Should You Train vs Play?

Make it practical for club-level players.`,
  },
  {
    slug: 'tennis-injuries-prevention',
    title: 'Common Tennis Injuries & How to Prevent Them',
    prompt: `Write a lifestyle article (600-800 words) about tennis injuries.

Structure:
## Most Common Tennis Injuries
## Tennis Elbow: Causes & Prevention
## Shoulder Injuries in Tennis
## Knee & Ankle Problems
## Wrist & Hand Issues
## Warm-Up Routine to Prevent Injuries
## When to See a Doctor

Be informative but not medical advice.`,
  },
  {
    slug: 'best-tennis-movies-documentaries',
    title: 'Best Tennis Movies & Documentaries to Watch',
    prompt: `Write a lifestyle article (600-700 words) about the best tennis movies and documentaries.

Structure:
## Best Tennis Movies & Documentaries
## Challengers (2024) — Zendaya's Tennis Drama
## King Richard (2021) — The Williams Sisters Story
## Battle of the Sexes (2017)
## Borg vs McEnroe (2017)
## Best Tennis Documentaries on Netflix & Prime
## Honorable Mentions

Include streaming availability where known.`,
  },
  {
    slug: 'tennis-betting-guide',
    title: 'Tennis Betting Guide — How Odds Work & What to Watch',
    prompt: `Write a lifestyle article (600-800 words) about tennis betting for beginners.

Structure:
## Tennis Betting Explained
## How Tennis Odds Work
## Types of Tennis Bets (Match Winner, Set Betting, Over/Under)
## Key Stats That Matter for Betting
## Surface & Form Analysis
## Common Mistakes to Avoid
## Responsible Gambling

Informative, not promotional. Emphasize responsible gambling.`,
  },
  {
    slug: 'tennis-coaching-tips-beginners',
    title: 'Tennis Coaching Tips — How to Start Playing Tennis',
    prompt: `Write a lifestyle article (600-800 words) about getting started with tennis.

Structure:
## How to Start Playing Tennis
## Finding a Coach vs Self-Learning
## Essential Gear for Beginners (Budget Guide)
## The Basic Strokes Explained
## Court Etiquette You Should Know
## How to Find People to Play With
## Apps & Resources for Tennis Beginners

Practical, encouraging, and beginner-friendly.`,
  },
  {
    slug: 'tennis-scoring-explained',
    title: 'Tennis Scoring System Explained — Love, Deuce & Tiebreaks',
    prompt: `Write a lifestyle article (600-800 words) explaining tennis scoring.

Structure:
## Tennis Scoring Made Simple
## Points: Love, 15, 30, 40
## Games and Sets
## What is Deuce? (and Ad-In, Ad-Out)
## Tiebreak Rules
## Super Tiebreak (Match Tiebreak)
## Why Does Tennis Use This Weird Scoring?

Make it fun and easy to understand for complete beginners.`,
  },
  {
    slug: 'tennis-court-types-explained',
    title: 'Tennis Court Surfaces Explained — Clay, Grass, Hard Court',
    prompt: `Write a lifestyle article (600-800 words) about tennis court surfaces.

Structure:
## Tennis Court Surfaces Explained
## Hard Courts (US Open, Australian Open)
## Clay Courts (Roland Garros)
## Grass Courts (Wimbledon)
## Carpet & Indoor Courts
## How Surface Affects Playing Style
## Which Surface Suits Your Game?

Include speed ratings and bounce characteristics.`,
  },
  {
    slug: 'tennis-etiquette-unwritten-rules',
    title: 'Tennis Etiquette — The Unwritten Rules Every Player Should Know',
    prompt: `Write a lifestyle article (500-700 words) about tennis etiquette.

Structure:
## Tennis Etiquette Guide
## Before the Match (Warm-Up Rules)
## During Play (Line Calls, Ball Management)
## Silence During Points
## Changeover Etiquette
## After the Match (Handshake & Thanks)
## Spectator Etiquette at Tournaments

Fun and informative — include real examples from pro tennis.`,
  },
  {
    slug: 'best-tennis-video-games',
    title: 'Best Tennis Video Games — From TopSpin to AO Tennis',
    prompt: `Write a lifestyle article (500-700 words) about tennis video games.

Structure:
## Best Tennis Video Games
## TopSpin 2K25 — The Return of a Legend
## AO International Tennis 2
## Tennis World Tour 2
## Mario Tennis Aces
## Classic Tennis Games Worth Playing
## What Makes a Great Tennis Video Game?

Include platforms and general quality assessment.`,
  },
  {
    slug: 'tennis-for-kids-parents-guide',
    title: "Tennis for Kids — A Parent's Complete Guide",
    prompt: `Write a lifestyle article (600-800 words) about getting kids into tennis.

Structure:
## Getting Your Child Started in Tennis
## What Age Should Kids Start Tennis?
## Finding the Right Coach & Program
## Equipment Basics (Smaller Rackets, Slower Balls)
## Red, Orange, Green Ball Progression
## How to Keep Kids Motivated
## Cost of Youth Tennis Programs

Practical advice for parents considering tennis for their children.`,
  },
  {
    slug: 'tennis-travel-guide-grand-slams',
    title: 'Tennis Travel Guide — Attending the Grand Slams',
    prompt: `Write a lifestyle article (700-900 words) about attending Grand Slam tournaments.

Structure:
## Grand Slam Tennis Travel Guide
## Australian Open — Melbourne in January
## Roland Garros — Paris in May/June
## Wimbledon — London in July
## US Open — New York in August/September
## Ticket Buying Tips & Best Seats
## Budget vs Luxury Tennis Travel
## Tips for First-Time Grand Slam Visitors

Include practical tips: when to buy tickets, where to sit, what to bring.`,
  },
  {
    slug: 'pickleball-vs-tennis',
    title: 'Pickleball vs Tennis — Differences, Similarities & Which to Play',
    prompt: `Write a lifestyle article (600-800 words) comparing pickleball and tennis.

Structure:
## Pickleball vs Tennis: The Complete Comparison
## Key Differences (Court Size, Equipment, Scoring)
## Physical Demands: Which Is Harder?
## Which Is Easier to Learn?
## Cost Comparison
## Social Aspects
## Can You Play Both?
## The Pickleball-Tennis Debate in 2026

Be balanced and fair to both sports.`,
  },
  {
    slug: 'padel-tennis-explained',
    title: "Padel Tennis Explained — Rules, Equipment & Why It's Booming",
    prompt: `Write a lifestyle article (600-700 words) about padel tennis.

Structure:
## What Is Padel Tennis?
## How Padel Differs from Tennis
## Padel Rules Explained
## Equipment You Need
## Why Padel Is Growing So Fast
## Padel vs Tennis: Physical Demands
## Where to Play Padel

Fun, informative introduction to padel for tennis fans.`,
  },
  {
    slug: 'tennis-mental-game-tips',
    title: 'The Mental Game of Tennis — How to Stay Focused Under Pressure',
    prompt: `Write a lifestyle article (600-800 words) about tennis mental toughness.

Structure:
## The Mental Game of Tennis
## Why Tennis Is the Loneliest Sport
## Pre-Match Mental Preparation
## Dealing with Momentum Shifts
## How Djokovic Masters the Mental Game
## Breathing & Mindfulness Techniques
## The Reset Ritual Between Points
## Books & Resources for Tennis Mental Training

Include practical techniques players can use immediately.`,
  },
  {
    slug: 'tennis-doubles-strategy',
    title: 'Tennis Doubles Strategy — Formations, Poaching & Communication',
    prompt: `Write a lifestyle article (600-700 words) about doubles tennis strategy.

Structure:
## Tennis Doubles Strategy Guide
## Basic Doubles Formations
## The I-Formation Explained
## Poaching: When & How
## Communication with Your Partner
## Serving Strategy in Doubles
## Return Strategy in Doubles
## Most Successful Doubles Teams in History

Practical advice for recreational doubles players.`,
  },
  // ── "Second Serve" — Tennis & Active Life 50+ (batch 4) ──
  {
    slug: 'tennis-adds-10-years-life',
    title: 'Tennis Adds 9.7 Years to Your Life — The Science Behind It',
    prompt: `Write a lifestyle article (700-900 words) about the Copenhagen Heart Study finding that tennis adds 9.7 years of life expectancy.

Structure:
## Tennis: The Sport That Adds Nearly 10 Years to Your Life
## The Copenhagen City Heart Study
## Why Tennis Beats Running, Swimming & Cycling for Longevity
## The Social Connection Factor
## Physical Benefits: Heart, Bones, Brain
## It's Never Too Late to Start
## How Much Tennis Do You Need?

Reference the Copenhagen study (9,000 adults, 25 years). Tennis #1 sport for longevity, ahead of badminton (6.2 years), soccer (4.7), cycling (3.7), swimming (3.4), jogging (3.2). The social/interactive nature of tennis is key.`,
  },
  {
    slug: 'starting-tennis-after-50',
    title: 'Starting Tennis After 50 — A Complete Beginner Guide',
    prompt: `Write a lifestyle article (700-900 words) for people who want to start playing tennis after age 50.

Structure:
## Starting Tennis After 50: Yes, You Can
## Why Tennis is Perfect for the 50+ Crowd
## Finding the Right Coach & Group Lessons
## Equipment for Beginners Over 50 (Lighter Rackets, Arm-Friendly)
## Your First Month: What to Expect
## Avoiding Injury: Smart Training Tips
## Social Tennis vs Competitive Tennis
## Success Stories: People Who Started Late

Encouraging, practical tone. 40% of tennis players are over 40. Address common fears (too old, too unfit, too late).`,
  },
  {
    slug: 'tennis-against-loneliness',
    title: 'Tennis Against Loneliness — How a Racket Sport Builds Community',
    prompt: `Write a lifestyle article (600-800 words) about tennis as a cure for loneliness, especially for people 45+.

Structure:
## Tennis: The Antidote to Loneliness
## The Loneliness Epidemic (4 in 10 adults 45+ are lonely — AARP)
## Why Tennis Builds Deeper Social Bonds Than the Gym
## Club Culture: Finding Your Tennis Community
## Doubles: The Ultimate Social Sport
## Social Tennis Programs & Leagues
## Real Stories: How Tennis Changed Lives

Reference AARP data (40% of 45+ are lonely). Tennis forces interaction — you can't play alone. Club culture, post-match drinks, tournaments = community.`,
  },
  {
    slug: 'tennis-brain-health-dementia',
    title: 'Tennis & Brain Health — How Racket Sports Fight Cognitive Decline',
    prompt: `Write a lifestyle article (600-800 words) about how tennis benefits brain health and may help prevent dementia.

Structure:
## Tennis and Your Brain
## The Cognitive Demands of Tennis (Strategy, Anticipation, Split-Second Decisions)
## Research: Racket Sports and Reduced Dementia Risk
## Hand-Eye Coordination and Neural Pathways
## The Social Brain: Why Playing With Others Matters
## Tennis vs Other Exercise for Brain Health
## Practical Tips: How Much and How Often

Reference Harvard research on racket sports and cognitive benefits. Tennis combines physical exercise + social interaction + strategic thinking = triple brain workout.`,
  },
  {
    slug: 'tennis-after-knee-replacement',
    title: 'Playing Tennis After Knee or Hip Replacement — Is It Possible?',
    prompt: `Write a lifestyle article (600-800 words) about returning to tennis after joint replacement surgery.

Structure:
## Tennis After Joint Replacement: The Honest Guide
## When Can You Return to Court?
## What the Research Says
## Modified Play: Doubles Over Singles
## Equipment Adjustments (Shoes, Surface, Racket)
## Exercises to Prepare for Return
## What to Discuss With Your Doctor
## Real Players Who Came Back

Medical disclaimer. Generally positive — many players return to doubles within 6-12 months. Emphasize consulting with surgeon.`,
  },
  {
    slug: 'tennis-retirement-communities',
    title: 'Best Tennis Retirement Communities — Where Tennis Never Stops',
    prompt: `Write a lifestyle article (600-800 words) about retirement communities with great tennis programs.

Structure:
## Retirement Communities Where Tennis Is King
## Why Tennis Communities Are Booming
## What to Look for in a Tennis Community
## Top Tennis-Focused Communities in the US
## International Tennis Retirement Destinations (Spain, Portugal, Thailand)
## Cost Range: Budget to Luxury
## Day Passes and Try-Before-You-Buy

Focus on the lifestyle aspect, not just real estate. Social tennis programs, coaching, leagues.`,
  },
  {
    slug: 'tennis-fitness-over-50',
    title: 'Tennis Fitness After 50 — Training Smart, Not Hard',
    prompt: `Write a lifestyle article (600-800 words) about fitness training for tennis players over 50.

Structure:
## Tennis Fitness After 50
## Why Recovery Matters More Than Ever
## Warm-Up: The Non-Negotiable 15 Minutes
## Strength Training for Tennis (Legs, Core, Shoulders)
## Flexibility: Every Decade Needs More Stretching
## Play Every Other Day, Not Every Day
## Nutrition for the Senior Tennis Player
## Signs You're Overdoing It

Practical, age-appropriate advice. Reference: after 30, we lose 5% muscle mass per decade.`,
  },
  {
    slug: 'tennis-weight-loss-over-50',
    title: 'Tennis for Weight Loss After 50 — Burn 400-600 Calories Per Hour',
    prompt: `Write a lifestyle article (600-700 words) about using tennis for weight management after 50.

Structure:
## Tennis for Weight Loss After 50
## How Many Calories Does Tennis Burn?
## Singles vs Doubles: Calorie Comparison
## Why Tennis Burns More Than Walking or Cycling
## Interval Nature of Tennis = Natural HIIT
## Nutrition Tips for Tennis Players Watching Weight
## Realistic Expectations and Timeline

Practical, not preachy. Tennis burns 400-600 cal/hour (singles), 300-400 (doubles). The fun factor means people stick with it.`,
  },
  {
    slug: 'tennis-osteoporosis-bone-health',
    title: 'Tennis & Bone Health — Why Weight-Bearing Sport Fights Osteoporosis',
    prompt: `Write a lifestyle article (600-700 words) about tennis and bone health.

Structure:
## Tennis and Bone Health
## The Osteoporosis Challenge After 50
## Why Tennis Builds Stronger Bones
## Weight-Bearing Impact: Tennis vs Swimming vs Cycling
## Research on Tennis and Bone Density
## How Often Should You Play?
## Other Bone-Healthy Habits for Tennis Players

Reference: tennis is weight-bearing → stimulates bone tissue production. Important for post-menopausal women especially.`,
  },
  {
    slug: 'tennis-stress-relief-mindfulness',
    title: 'Tennis as Meditation — How the Court Becomes Your Zen Zone',
    prompt: `Write a lifestyle article (600-800 words) about tennis as stress relief and mindfulness practice.

Structure:
## Tennis: Moving Meditation
## Why Tennis Forces You Into the Present Moment
## The Flow State on Court
## Cortisol and Adrenaline: What Happens During Play
## Post-Match Calm: The Tennis Afterglow
## Rituals Between Points as Mindfulness Practice
## Tennis vs Yoga, Running, Meditation for Stress Relief

Thoughtful, not clinical. The point-by-point nature of tennis naturally creates a mindfulness structure. Between points = breathing reset.`,
  },
  {
    slug: 'finding-tennis-partners-over-50',
    title: 'Finding Tennis Partners After 50 — Apps, Clubs & Social Tennis',
    prompt: `Write a lifestyle article (500-700 words) about finding people to play tennis with, especially for people 50+.

Structure:
## How to Find Tennis Partners After 50
## Tennis Club Memberships: Worth the Investment?
## Apps: Playfinder, Tennis Buddy, Meetup
## USTA Adult Leagues
## Social Tennis Events & Round Robins
## Doubles Groups: The Easiest Entry Point
## Online Tennis Communities

Practical, actionable. Address the "I don't know anyone who plays" problem.`,
  },
  {
    slug: 'tennis-heart-health',
    title: 'Tennis & Heart Health — How 3 Hours a Week Cuts Heart Disease Risk by 50%',
    prompt: `Write a lifestyle article (600-700 words) about tennis and cardiovascular health.

Structure:
## Tennis and Your Heart
## The Research: 50% Lower Heart Disease Risk
## How Tennis Trains Your Heart (Interval Training Effect)
## Blood Pressure Benefits
## Cholesterol Impact: Raising HDL, Lowering LDL
## How Much Tennis for Heart Health?
## Warning Signs: When to Stop and See a Doctor

Reference PMC research: 3+ hours of moderately vigorous sport weekly = 50% reduction in coronary heart disease death risk.`,
  },
  {
    slug: 'tennis-empty-nest-new-chapter',
    title: 'The Empty Nest Tennis Player — Starting a New Chapter on Court',
    prompt: `Write a lifestyle article (600-800 words) for parents whose children have left home and are looking for meaning and activity.

Structure:
## When the Kids Leave: Tennis as Your New Chapter
## The Empty Nest Moment — Now What?
## Why Tennis Fills the Void (Purpose, Schedule, Community)
## From Soccer Mom/Dad to Tennis Player
## Couples Tennis: Reconnecting With Your Partner
## Building a New Social Circle Through Tennis
## The Unexpected Joy of Learning Something New at 50+

Empathetic, uplifting. Address the emotional void that empty nesters feel. Tennis provides structure, community, physical challenge, and fun.`,
  },
  {
    slug: 'tennis-couples-relationship',
    title: 'Tennis for Couples — How Playing Together Strengthens Your Relationship',
    prompt: `Write a lifestyle article (500-700 words) about couples playing tennis together.

Structure:
## Tennis for Couples
## Mixed Doubles: The Ultimate Team Sport
## How Tennis Improves Communication
## Dealing with Competitive Partners
## Date Night on the Court
## Famous Tennis Couples
## Tips for Playing With Your Spouse Without Fighting

Fun, light-hearted. Include tips for managing competitive dynamics between partners.`,
  },
  {
    slug: 'tennis-grandparents-grandkids',
    title: 'Tennis With Grandkids — The Sport That Bridges Generations',
    prompt: `Write a lifestyle article (500-700 words) about grandparents playing tennis with grandchildren.

Structure:
## Tennis: The Multigenerational Sport
## Why Tennis Works Across Ages (Adjustable Pace, Modified Rules)
## Mini Tennis & Red Ball for Young Kids
## Equipment Tips for Playing Together
## Making It Fun, Not Competitive
## Creating Tennis Family Traditions
## Local Programs for Multigenerational Tennis

Heartwarming, practical. Tennis is one of few sports where a 65-year-old can genuinely play with a 10-year-old.`,
  },
  {
    slug: 'reinventing-yourself-through-tennis',
    title: 'Reinventing Yourself Through Tennis — Stories of Late Bloomers',
    prompt: `Write an inspirational lifestyle article (600-800 words) about people who found tennis later in life and it transformed them.

Structure:
## Late Bloomers: Finding Tennis After 40, 50, 60
## The Retiree Who Became a Tournament Player
## From Couch to Court: Weight Loss Through Tennis
## The Introvert Who Found Community
## Tennis as Identity: More Than Just Exercise
## Why "Too Old" Is Never True in Tennis
## How to Write Your Own Tennis Story

Inspirational but not cheesy. Use general archetypes (not specific named people unless public figures). The message: it's never too late.`,
  },
  {
    slug: 'tennis-vs-golf-retirement-sport',
    title: 'Tennis vs Golf — Which Is the Better Retirement Sport?',
    prompt: `Write a lifestyle comparison article (600-800 words) comparing tennis and golf as sports for retirees.

Structure:
## Tennis vs Golf: The Retirement Sport Showdown
## Physical Benefits Comparison
## Social Aspects: Club Culture vs Court Culture
## Cost Comparison (Equipment, Membership, Ongoing)
## Time Commitment
## Learning Curve After 50
## Health Research: Which Sport Adds More Years?
## Why Not Both?

Balanced comparison. Tennis wins on fitness/longevity (+9.7 years vs golf's minimal impact), golf wins on low-impact accessibility. Both excellent socially.`,
  },
  {
    slug: 'walking-tennis-gentle-start',
    title: 'Walking Tennis — The Gentle Way Into the Sport for Seniors',
    prompt: `Write a lifestyle article (500-700 words) about walking tennis, a modified version of tennis for older adults.

Structure:
## What Is Walking Tennis?
## Rules: How Walking Tennis Differs
## Who Is It For?
## Health Benefits of Walking Tennis
## Where to Find Walking Tennis Programs
## From Walking Tennis to Regular Tennis
## Equipment Recommendations

Walking tennis is growing fast in UK and Europe — two bounces allowed, no running required. Perfect entry point for 60+.`,
  },
];

// ============================================================
// TOURNAMENT ARTICLE TEMPLATES
// ============================================================

const TOURNAMENT_ARTICLES = [
  {
    slug: 'australian-open-guide',
    title: 'Australian Open — Complete Tournament Guide',
    prompt: `Write a tournament guide (600-800 words) about the Australian Open.

Structure:
## Australian Open — The Grand Slam Down Under
## History & Key Facts
## The Venue: Melbourne Park
## Surface: GreenSet (Hard Court)
## All-Time Records at the Australian Open
## Ticket & Travel Guide
## Notable Moments in AO History`,
  },
  {
    slug: 'roland-garros-guide',
    title: 'Roland Garros (French Open) — Complete Tournament Guide',
    prompt: `Write a tournament guide (600-800 words) about Roland Garros.

Structure:
## Roland Garros — The Clay Court Grand Slam
## History & Key Facts
## The Venue: Stade Roland Garros, Paris
## Surface: Red Clay
## Rafael Nadal's Dominance (14 titles)
## All-Time Records at Roland Garros
## Attending Roland Garros: Tips & Tickets`,
  },
  {
    slug: 'wimbledon-guide',
    title: 'Wimbledon — The Ultimate Guide to Tennis\'s Most Prestigious Tournament',
    prompt: `Write a tournament guide (700-900 words) about Wimbledon.

Structure:
## Wimbledon — The Championships
## History: From 1877 to Today
## The All England Club
## Surface: Grass
## The Queue — Wimbledon's Unique Tradition
## All-White Dress Code
## All-Time Wimbledon Records
## Strawberries & Cream: The Wimbledon Experience`,
  },
  {
    slug: 'us-open-guide',
    title: 'US Open — Complete Tournament Guide',
    prompt: `Write a tournament guide (600-800 words) about the US Open.

Structure:
## US Open — New York's Grand Slam
## History & Key Facts
## The Venue: USTA Billie Jean King National Tennis Center
## Arthur Ashe Stadium — The Biggest Tennis Arena
## Night Sessions Under the Lights
## All-Time Records at the US Open
## Tips for Attending the US Open`,
  },
  {
    slug: 'indian-wells-guide',
    title: 'Indian Wells (BNP Paribas Open) — The Fifth Grand Slam',
    prompt: `Write a tournament guide (500-600 words) about Indian Wells.

Structure:
## Indian Wells — The Fifth Grand Slam
## Why It's Called the Fifth Slam
## The Desert Setting
## Stadium 1: Second Largest Tennis Venue
## Notable Moments
## How to Attend`,
  },
  {
    slug: 'miami-open-guide',
    title: 'Miami Open — Complete Tournament Guide',
    prompt: `Write a tournament guide (500-600 words) about the Miami Open.

Structure:
## Miami Open
## History: From Key Biscayne to Hard Rock Stadium
## The Sunshine Double (Indian Wells + Miami)
## All-Time Winners
## Miami's Unique Atmosphere
## Fan Guide`,
  },
  {
    slug: 'atp-finals-guide',
    title: 'ATP Finals — The Season-Ending Championship Explained',
    prompt: `Write a tournament guide (500-700 words) about the ATP Finals.

Structure:
## ATP Finals — The Year-End Showdown
## How Qualification Works (Top 8 Players)
## Round-Robin Format Explained
## History: From Masters Cup to Nitto ATP Finals
## Host Cities Through the Years
## All-Time Records (Federer: 6 titles, Djokovic: 7)`,
  },
  {
    slug: 'wta-finals-guide',
    title: 'WTA Finals — The Season-Ending Championship',
    prompt: `Write a tournament guide (500-600 words) about the WTA Finals.

Structure:
## WTA Finals
## How Qualification Works
## Format & Structure
## History & Notable Champions
## Records & Statistics
## Where It's Held`,
  },
  {
    slug: 'davis-cup-guide',
    title: 'Davis Cup — The World Cup of Tennis',
    prompt: `Write a tournament guide (600-700 words) about the Davis Cup.

Structure:
## Davis Cup — Tennis's Team Competition
## History: The Oldest International Team Event
## New Format Since 2019
## Most Successful Nations
## Famous Davis Cup Moments
## How It Compares to the Billie Jean King Cup`,
  },
  {
    slug: 'monte-carlo-masters-guide',
    title: 'Monte-Carlo Masters — The Crown Jewel of Clay',
    prompt: `Write a tournament guide (500-600 words) about the Monte-Carlo Masters.

Structure:
## Monte-Carlo Masters
## The Stunning Venue: Monte-Carlo Country Club
## Clay Court Season Opener
## Nadal's Record: 11 Titles
## History & Notable Moments
## Attending the Tournament`,
  },
  {
    slug: 'shanghai-masters-guide',
    title: 'Shanghai Masters — Tennis in China',
    prompt: `Write a tournament guide (400-500 words) about the Shanghai Masters.

Structure:
## Shanghai Masters
## History & Growth of Tennis in China
## The Venue: Qizhong Forest Sports City Arena
## Notable Champions
## Tennis's Expansion in Asia`,
  },
  {
    slug: 'laver-cup-guide',
    title: 'Laver Cup — Tennis\'s Ryder Cup',
    prompt: `Write a tournament guide (500-600 words) about the Laver Cup.

Structure:
## Laver Cup — Team Europe vs Team World
## Named After Rod Laver
## Unique Format & Scoring
## Federer's Farewell (2022)
## Most Memorable Moments
## Future of the Laver Cup`,
  },
];

// ============================================================
// ADDITIONAL RECORD ARTICLES
// ============================================================

const EXTRA_RECORD_ARTICLES = [
  {
    slug: 'most-masters-1000-titles',
    title: 'Most Masters 1000 Titles in Tennis History',
    category: 'records',
    prompt: `Write an article (500-700 words) about Masters 1000 title records.

Structure:
## Most Masters 1000 Titles
## All-Time Leaders: Djokovic, Nadal, Federer
## Masters 1000 by Tournament
## The Difficulty of Winning Masters Events
## Active Players Climbing the List

Use these facts:
- Djokovic: 40 Masters titles (all-time record)
- Nadal: 36 Masters titles
- Federer: 28 Masters titles
- 9 Masters 1000 events per year
- Djokovic has won all 9 different Masters (Career Golden Masters)`,
  },
  {
    slug: 'tennis-prize-money-history',
    title: 'Tennis Prize Money Through History — From $0 to $65 Million',
    category: 'records',
    prompt: `Write an article (600-700 words) about the evolution of prize money in tennis.

Structure:
## Tennis Prize Money History
## The Open Era Begins (1968)
## Equal Prize Money Fight
## Prize Money Growth Decade by Decade
## Current Grand Slam Prize Money (2024-2026)
## Highest Career Earnings: Djokovic $185M+

Use these facts:
- 1968: First Open Era prize money
- Billie Jean King fought for equal prize money
- US Open: first Slam with equal pay (1973)
- Wimbledon: equal pay since 2007
- 2024 Wimbledon total prize money: £50M+
- 2024 US Open winner: $3.6M`,
  },
  {
    slug: 'tennis-surface-records',
    title: 'Tennis Surface Records — Clay, Grass & Hard Court Kings',
    category: 'records',
    prompt: `Write an article (600-800 words) about surface-specific records in tennis.

Structure:
## Surface Records in Tennis
## Clay Court Records (Nadal's Dominance)
## Grass Court Records (Federer & Navratilova)
## Hard Court Records
## Most Titles by Surface
## Surface Specialists vs All-Court Players

Use these facts:
- Nadal: 81 consecutive clay wins (2005-07), 14 French Open titles, 63 clay titles
- Federer: 65 consecutive grass wins, 8 Wimbledon titles, 19 grass titles
- Djokovic: Most Australian Open titles (10), most hard court Slam titles
- Navratilova: 12 consecutive Wimbledon finals`,
  },
  {
    slug: 'grand-slam-hat-tricks',
    title: 'Grand Slam Hat-Tricks — Players Who Won 3+ Slams in a Year',
    category: 'records',
    prompt: `Write an article (500-600 words) about players who won 3 or more Grand Slams in a single year.

Structure:
## Three Grand Slams in One Year
## Players Who Achieved This Feat
## Rod Laver's Calendar Slams
## Djokovic 2021: So Close to History
## Federer 2004, 2006, 2007: Three Slams in a Year
## The Challenge of Maintaining Form Across Surfaces`,
  },
  {
    slug: 'doubles-records-tennis',
    title: 'Greatest Doubles Teams & Records in Tennis History',
    category: 'records',
    prompt: `Write an article (500-700 words) about doubles records in tennis.

Structure:
## Doubles Records in Tennis
## Greatest Men's Doubles Teams (Bryan Brothers, Woodbridge/Woodforde)
## Greatest Women's Doubles Teams (Williams Sisters, Hingis Partners)
## Most Doubles Grand Slam Titles
## Mixed Doubles Records
## The Decline and Revival of Doubles`,
  },
  // ── New records articles (batch 3) ──
  {
    slug: 'tennis-comebacks-greatest',
    title: 'Greatest Comebacks in Tennis History',
    category: 'records',
    prompt: `Write an article (600-800 words) about the greatest comebacks in tennis history.

Structure:
## Greatest Comebacks in Tennis
## Match Point Saves: Federer at 2009 Wimbledon, Djokovic at 2011 US Open SF
## Injury Comebacks: Nadal, Federer, Del Potro, Seles
## Career Revivals: Wawrinka's Late Peak, Connors at 39
## Women's Comebacks: Clijsters, Capriati, Serena
## Against All Odds: The Mental Strength Required`,
  },
  {
    slug: 'tennis-first-time-records',
    title: 'Tennis Firsts — Historic Milestones in the Sport',
    category: 'records',
    prompt: `Write an article (600-800 words) about historic firsts in tennis.

Structure:
## Historic Firsts in Tennis
## First Open Era Champions (1968)
## First $1 Million Prize Money
## First to 100 Titles, 200 Weeks at No.1
## Technology Firsts: Hawkeye, Shot Clock, Electronic Line Calling
## First Slam Titles for Different Countries
## Women's Tennis Firsts: Equal Pay, Professional Tour

Include facts about first Grand Slam winners in Open Era, first electronic line calling, first use of Hawkeye.`,
  },
  {
    slug: 'tennis-streaks-records',
    title: 'Incredible Streaks & Runs in Tennis History',
    category: 'records',
    prompt: `Write an article (600-800 words) about amazing streaks in tennis.

Structure:
## Incredible Streaks in Tennis
## Consecutive Match Wins: Navratilova 74, Federer 65 on Grass, Nadal 81 on Clay
## Consecutive Sets Won Records
## Consecutive Grand Slam Titles: Djokovic 4 in a Row
## Consecutive Weeks at No. 1: Djokovic 373
## Longest Active Streak Records
## Streaks That May Never Be Broken

Focus on factual data. Martina Navratilova's 74-match winning streak in 1984.`,
  },
  {
    slug: 'tennis-olympic-records',
    title: 'Tennis at the Olympics — Records, Medals & Historic Moments',
    category: 'records',
    prompt: `Write an article (600-800 words) about tennis at the Olympics.

Structure:
## Tennis at the Olympics
## History: Dropped 1924, Returned 1988
## Most Olympic Medals in Tennis
## Career Golden Slam Achievers: Agassi, Nadal, Graf, Serena
## Paris 2024 Results
## LA 2028 Preview
## The Unique Challenge of Olympic Tennis

Include: Agassi (1996 gold), Nadal (2008 gold), Murray (2012 & 2016 gold), Graf (1988 gold), Serena 4 golds.`,
  },
  {
    slug: 'tennis-tiebreak-records',
    title: 'Greatest Tiebreaks & Tiebreak Records in Tennis',
    category: 'records',
    prompt: `Write an article (500-700 words) about tiebreak records in tennis.

Structure:
## Tiebreak Records in Tennis
## Longest Tiebreaks in History
## Most Tiebreaks Won in a Career
## The Isner-Mahut Marathon and Rule Changes
## Fifth-Set Tiebreak Rules Across Grand Slams
## Players Who Thrive in Tiebreaks

Include: Isner-Mahut 70-68 fifth set (2010), new final-set tiebreak rules at all Slams.`,
  },
];

// ============================================================
// OPENAI API CALL
// ============================================================

async function callOpenAI(system, prompt, maxTokens = 1000) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

// ============================================================
// GENERATE PLAYER ARTICLES
// ============================================================

async function generatePlayerArticles(type) {
  const subcategory = type.replace('player-', '');
  const template = PROMPT_TEMPLATES[type];

  // Get players that need articles — fetch more than LIMIT to account for existing articles
  const fetchLimit = LIMIT + 50; // Extra buffer for already-processed players
  let query = supabase
    .from('players')
    .select('*')
    .gt('career_titles', type === 'player-networth' ? 5 : 3) // Higher bar for net worth
    .order('career_titles', { ascending: false })
    .limit(fetchLimit);

  if (TOUR_FILTER) query = query.eq('tour', TOUR_FILTER);

  const { data: players, error } = await query;
  if (error) {
    console.error('❌ Supabase error:', error.message);
    return { generated: 0, errors: 0 };
  }

  if (!players || players.length === 0) {
    console.log('✅ No players to process');
    return { generated: 0, errors: 0 };
  }

  // Filter out players that already have this article type
  let playersToProcess = players;
  if (!FORCE) {
    const { data: existing } = await supabase
      .from('articles')
      .select('player_id')
      .eq('subcategory', subcategory)
      .in('player_id', players.map(p => p.player_id));

    const existingIds = new Set((existing || []).map(a => a.player_id));
    playersToProcess = players.filter(p => !existingIds.has(p.player_id));
  }

  // Limit to the requested number of articles
  playersToProcess = playersToProcess.slice(0, LIMIT);

  console.log(`📋 ${playersToProcess.length} players need ${type} articles\n`);

  let generated = 0;
  let errors = 0;

  for (const player of playersToProcess) {
    const name = `${player.first_name} ${player.last_name}`;
    process.stdout.write(`  🤖 ${name}... `);

    if (DRY_RUN) {
      console.log('SKIP (dry run)');
      generated++;
      continue;
    }

    try {
      const { system, prompt, maxTokens } = template(player);
      const body = await callOpenAI(system, prompt, maxTokens);

      // Build slug
      const articleSlug = subcategory === 'profile'
        ? player.slug
        : `${player.slug}-${subcategory === 'networth' ? 'net-worth' : subcategory}`;

      // Build title
      const titles = {
        profile: `${name} — Tennis Profile, Stats & Bio`,
        networth: `${name} Net Worth in 2026 — Earnings & Salary`,
        racket: `What Racket Does ${name} Use? Equipment & Specs`,
      };

      // Build meta description
      const metas = {
        profile: `${name} tennis profile. Career stats, ${player.career_titles} titles${player.grand_slam_titles > 0 ? `, ${player.grand_slam_titles} Grand Slams` : ''}, biography and more.`,
        networth: `${name} net worth, prize money (${formatPrize(player.career_prize_usd)}), endorsement deals, and career earnings breakdown.`,
        racket: `What racket does ${name} use? Complete equipment setup, racket specs, strings, and gear guide.`,
      };

      // Upsert into articles
      const { error: upsertError } = await supabase
        .from('articles')
        .upsert({
          slug: articleSlug,
          title: titles[subcategory] || `${name} — ${subcategory}`,
          category: 'players',
          subcategory,
          excerpt: body.substring(0, 200).replace(/\n/g, ' ').trim() + '...',
          body,
          player_id: player.player_id,
          meta_title: titles[subcategory],
          meta_description: metas[subcategory],
          status: 'draft',
          image_url: player.image_url,
        }, { onConflict: 'slug' });

      if (upsertError) {
        console.log(`❌ DB error: ${upsertError.message}`);
        errors++;
      } else {
        console.log(`✅ (${body.length} chars)`);
        generated++;
      }

      // Rate limit
      await new Promise(r => setTimeout(r, 800));

    } catch (e) {
      console.log(`❌ ${e.message}`);
      errors++;
      if (e.message.includes('429')) {
        console.log('    ⏳ Rate limited, waiting 30s...');
        await new Promise(r => setTimeout(r, 30000));
      }
    }
  }

  return { generated, errors };
}

// ============================================================
// GENERATE RECORD ARTICLES
// ============================================================

async function generateStaticArticles(category, allArticles, systemPrompt) {
  let articles = allArticles;

  if (!FORCE) {
    const { data: existing } = await supabase
      .from('articles')
      .select('slug')
      .eq('category', category)
      .in('slug', articles.map(a => a.slug));

    const existingSlugs = new Set((existing || []).map(a => a.slug));
    articles = articles.filter(a => !existingSlugs.has(a.slug));
  }

  if (LIMIT < articles.length) articles = articles.slice(0, LIMIT);

  console.log(`📋 ${articles.length} ${category} articles to generate\n`);

  let generated = 0;
  let errors = 0;

  for (const article of articles) {
    process.stdout.write(`  🤖 ${article.title}... `);

    if (DRY_RUN) {
      console.log('SKIP (dry run)');
      generated++;
      continue;
    }

    try {
      const body = await callOpenAI(systemPrompt, article.prompt, 1200);

      const cat = article.category || category;
      const { error: upsertError } = await supabase
        .from('articles')
        .upsert({
          slug: article.slug,
          title: article.title,
          category: cat,
          subcategory: cat,
          excerpt: body.substring(0, 200).replace(/\n/g, ' ').trim() + '...',
          body,
          meta_title: `${article.title} — SUPER.TENNIS`,
          meta_description: body.substring(0, 155).replace(/\n/g, ' ').trim(),
          status: 'draft',
        }, { onConflict: 'slug' });

      if (upsertError) {
        console.log(`❌ DB error: ${upsertError.message}`);
        errors++;
      } else {
        console.log(`✅ (${body.length} chars)`);
        generated++;
      }

      await new Promise(r => setTimeout(r, 800));
    } catch (e) {
      console.log(`❌ ${e.message}`);
      errors++;
      if (e.message.includes('429')) {
        console.log('    ⏳ Rate limited, waiting 30s...');
        await new Promise(r => setTimeout(r, 30000));
      }
    }
  }

  return { generated, errors };
}

async function generateRecordArticles() {
  const all = [...RECORD_ARTICLES, ...EXTRA_RECORD_ARTICLES];
  return generateStaticArticles(
    'records',
    all,
    'You are a professional tennis journalist writing for super.tennis. Write factual, engaging articles about tennis records and history. Use markdown formatting with ## headers. Target a general audience.'
  );
}

async function generateGearArticles() {
  return generateStaticArticles(
    'gear',
    GEAR_ARTICLES,
    'You are a tennis equipment expert writing for super.tennis. Write detailed but accessible gear guides and reviews. Use markdown formatting with ## headers. Be practical and helpful for recreational players.'
  );
}

async function generateLifestyleArticles() {
  return generateStaticArticles(
    'lifestyle',
    LIFESTYLE_ARTICLES,
    'You are a tennis lifestyle writer for super.tennis. Write engaging, informative articles about tennis culture, player lifestyles, and the tennis world beyond the court. Use markdown formatting with ## headers.'
  );
}

async function generateTournamentArticles() {
  return generateStaticArticles(
    'tournaments',
    TOURNAMENT_ARTICLES,
    'You are a tennis travel and tournament expert writing for super.tennis. Write informative tournament guides that help fans plan visits and understand tournament history. Use markdown formatting with ## headers.'
  );
}

// ============================================================
// H2H COMPARISON ARTICLES
// ============================================================

const H2H_ARTICLES = [
  {
    slug: 'djokovic-vs-nadal',
    title: 'Djokovic vs Nadal — Head to Head Record & Rivalry History',
    prompt: `Write a head-to-head rivalry article (800-1000 words) about Novak Djokovic vs Rafael Nadal.

Structure:
## Djokovic vs Nadal — The Greatest Rivalry in Tennis
- Overall H2H record (Djokovic leads 31-29)
## Grand Slam Meetings
- Key Grand Slam matches between them (Australian Open 2012 final, French Open battles)
## Surface Breakdown
- Clay (Nadal dominance), Hard court (Djokovic edge), Grass
## Key Matches
- Most iconic encounters (2012 AO Final, 2013 RG SF, 2021 RG SF)
## Legacy
- How this rivalry shaped modern tennis`
  },
  {
    slug: 'federer-vs-nadal',
    title: 'Federer vs Nadal — The Rivalry That Defined Tennis',
    prompt: `Write a head-to-head rivalry article (800-1000 words) about Roger Federer vs Rafael Nadal.

Structure:
## Federer vs Nadal — Tennis's Most Beautiful Rivalry
- Overall H2H record (Nadal leads 24-16)
## Grand Slam Classics
- Wimbledon 2008 Final, AO 2017 Final, French Open dominance
## Playing Style Contrast
- Federer's elegance vs Nadal's intensity
## Key Matches
- Top 5 most memorable encounters
## Impact on Tennis
- How they elevated the sport together`
  },
  {
    slug: 'djokovic-vs-federer',
    title: 'Djokovic vs Federer — Head to Head Record & Greatest Matches',
    prompt: `Write a head-to-head rivalry article (800-1000 words) about Novak Djokovic vs Roger Federer.

Structure:
## Djokovic vs Federer — A Clash of Champions
- Overall H2H record (Djokovic leads 27-23)
## Grand Slam Battles
- Wimbledon 2019 Final, US Open meetings
## Evolution of the Rivalry
- Early years vs peak years
## Key Matches
- Most dramatic encounters
## Statistical Comparison
- Titles, rankings, records head-to-head`
  },
  {
    slug: 'alcaraz-vs-sinner',
    title: 'Alcaraz vs Sinner — The Next Great Tennis Rivalry',
    prompt: `Write a head-to-head rivalry article (800-1000 words) about Carlos Alcaraz vs Jannik Sinner.

Structure:
## Alcaraz vs Sinner — Tennis's Future Is Here
- Current H2H record and trajectory
## Grand Slam Encounters
- Their meetings at major tournaments
## Playing Style Comparison
- Alcaraz's explosive athleticism vs Sinner's clinical precision
## Key Matches
- Best matches so far
## The Rivalry Ahead
- What makes this the next defining rivalry`
  },
  {
    slug: 'djokovic-vs-alcaraz',
    title: 'Djokovic vs Alcaraz — Old Guard Meets New Generation',
    prompt: `Write a head-to-head rivalry article (800-1000 words) about Novak Djokovic vs Carlos Alcaraz.

Structure:
## Djokovic vs Alcaraz — The Torch-Passing Rivalry
- H2H record and context
## Wimbledon 2023 & 2024 Finals
- Their Grand Slam battles
## Generational Clash
- Experience vs youth and energy
## Key Matches
- Most significant encounters
## What It Means for Tennis
- The symbolic passing of the guard`
  },
  {
    slug: 'evert-vs-navratilova',
    title: 'Evert vs Navratilova — The Greatest Women\'s Rivalry',
    prompt: `Write a head-to-head rivalry article (800-1000 words) about Chris Evert vs Martina Navratilova.

Structure:
## Evert vs Navratilova — 80 Matches of Brilliance
- Overall H2H record (Navratilova leads 43-37 across 80 matches!)
## Grand Slam Meetings
- Their battles across all four Slams
## Contrasting Styles & Personalities
- Baseline queen vs serve-and-volley master
## Key Matches
- Most iconic encounters
## Legacy
- How they elevated women's tennis`
  },
  {
    slug: 'williams-vs-williams',
    title: 'Serena vs Venus — The Williams Sisters Head to Head',
    prompt: `Write a head-to-head rivalry article (800-1000 words) about Serena Williams vs Venus Williams.

Structure:
## Serena vs Venus — Sisters, Rivals, Champions
- Overall H2H record (Serena leads 19-12)
## Grand Slam Finals
- Their Grand Slam meetings (9 Slam encounters)
## A Unique Rivalry
- Family dynamics in professional competition
## Key Matches
- Most memorable sister battles
## Impact
- How they transformed tennis together`
  },
  {
    slug: 'djokovic-vs-murray',
    title: 'Djokovic vs Murray — Head to Head & Rivalry History',
    prompt: `Write a head-to-head rivalry article (800-1000 words) about Novak Djokovic vs Andy Murray.

Structure:
## Djokovic vs Murray — Born Days Apart, Rivals for Life
- Overall H2H record (Djokovic leads 25-11)
## Grand Slam Battles
- Australian Open finals, Wimbledon meetings
## Junior Rivals to Grand Slam Champions
- Their parallel careers from junior tennis
## Key Matches
- Most dramatic encounters
## Murray's Victories
- When Murray found the winning formula`
  },
  {
    slug: 'nadal-vs-federer-clay',
    title: 'Nadal vs Federer on Clay — The King vs The Maestro',
    prompt: `Write a head-to-head rivalry article (800-1000 words) about Nadal vs Federer specifically on clay courts.

Structure:
## Nadal vs Federer on Clay — Dominance Personified
- Clay-specific H2H (Nadal leads 14-2 on clay)
## Roland Garros Battles
- Their French Open meetings (2005-2011)
## Rome & Monte Carlo
- Masters 1000 clay encounters
## The 2006-2007 Peak
- When Nadal ended Federer's dreams repeatedly
## Federer's Hamburg 2007 & Madrid 2009
- The rare clay victories`
  },
  {
    slug: 'swiatek-vs-sabalenka',
    title: 'Swiatek vs Sabalenka — WTA\'s Premier Rivalry',
    prompt: `Write a head-to-head rivalry article (800-1000 words) about Iga Swiatek vs Aryna Sabalenka.

Structure:
## Swiatek vs Sabalenka — The WTA's Defining Rivalry
- Current H2H record
## Grand Slam Encounters
- Their meetings at majors
## Playing Style Contrast
- Swiatek's spin and tactics vs Sabalenka's power
## Key Matches
- Most memorable encounters
## The Battle for No. 1
- Their race for the top ranking`
  },
  {
    slug: 'sampras-vs-agassi',
    title: 'Sampras vs Agassi — The 90s Rivalry That Captivated Tennis',
    prompt: `Write a head-to-head rivalry article (800-1000 words) about Pete Sampras vs Andre Agassi.

Structure:
## Sampras vs Agassi — Contrasts in Every Way
- Overall H2H record (Sampras leads 20-14)
## Grand Slam Meetings
- US Open finals, Australian Open encounters
## Style & Personality
- Serve-and-volley vs return game, reserved vs flamboyant
## Key Matches
- US Open 2001 QF, 2002 Final
## American Tennis Icons
- How they defined an era`
  },
  {
    slug: 'borg-vs-mcenroe',
    title: 'Borg vs McEnroe — Fire & Ice on the Tennis Court',
    prompt: `Write a head-to-head rivalry article (800-1000 words) about Bjorn Borg vs John McEnroe.

Structure:
## Borg vs McEnroe — The Rivalry That Made Tennis Cool
- Overall H2H record (Borg leads 7-7)
## Wimbledon 1980 Final
- The greatest match ever played (18-16 tiebreak)
## Contrasting Personas
- Borg's icy calm vs McEnroe's fiery temperament
## US Open Battles
- Their meetings in New York
## Cultural Impact
- How they brought tennis into mainstream pop culture`
  },
  {
    slug: 'graf-vs-seles',
    title: 'Graf vs Seles — A Rivalry Cut Short',
    prompt: `Write a head-to-head rivalry article (800-1000 words) about Steffi Graf vs Monica Seles.

Structure:
## Graf vs Seles — What Could Have Been
- Overall H2H record (Seles leads 10-5 before stabbing incident)
## The Early Dominance
- Seles's meteoric rise and challenge to Graf's supremacy
## The 1993 Tragedy
- The Hamburg stabbing and its impact
## Grand Slam Meetings
- Their major encounters
## Legacy
- Two all-time greats with an unfinished story`
  },
  {
    slug: 'federer-vs-djokovic-wimbledon',
    title: 'Federer vs Djokovic at Wimbledon — Grass Court Battles',
    prompt: `Write a head-to-head rivalry article (800-1000 words) about Federer vs Djokovic specifically at Wimbledon.

Structure:
## Federer vs Djokovic at Wimbledon — Centre Court Drama
- Wimbledon-specific H2H record
## The 2019 Final
- The longest Wimbledon final, championship point saves, first 5th-set tiebreak
## The 2014 Final & 2015 Final
- Back-to-back finals
## Semifinal Meetings
- Their other Wimbledon encounters
## Federer's Kingdom Under Siege
- How Djokovic conquered Federer's best surface`
  },
  {
    slug: 'nadal-vs-djokovic-french-open',
    title: 'Nadal vs Djokovic at Roland Garros — Clay Court Epic',
    prompt: `Write a head-to-head rivalry article (800-1000 words) about Nadal vs Djokovic at the French Open.

Structure:
## Nadal vs Djokovic at Roland Garros — Unstoppable vs Immovable
- Roland Garros H2H record
## The 2021 Semifinal
- One of the greatest matches in history
## Nadal's Clay Kingdom
- Why Roland Garros matters so much to Nadal
## Djokovic's 2021 Title
- Breaking through on Nadal's turf
## Statistical Breakdown
- Sets, games, and match stats on the Parisian clay`
  },
  {
    slug: 'big-three-comparison',
    title: 'Federer vs Nadal vs Djokovic — The Big Three Compared',
    prompt: `Write a comparison article (800-1000 words) about the Big Three of tennis.

Structure:
## The Big Three — Greatest Era in Tennis History
- Why Federer, Nadal, Djokovic dominate the GOAT debate
## Grand Slam Records
- Title comparison across all four Slams
## Head-to-Head Records
- How they fare against each other (triangular H2H)
## Surface Mastery
- Each player's best surface and dominance
## Records & Milestones
- Weeks at No. 1, consecutive Slam titles, year-end finishes
## The Verdict
- Is there a greatest? Or is each the GOAT of their surface?`
  },
  {
    slug: 'medvedev-vs-sinner',
    title: 'Medvedev vs Sinner — The New Rivalry in Men\'s Tennis',
    prompt: `Write a head-to-head rivalry article (700-900 words) about Daniil Medvedev vs Jannik Sinner.

Structure:
## Medvedev vs Sinner — Cold Precision vs Italian Fire
- Current H2H record
## Australian Open 2024 Final
- The breakout match of this rivalry
## Playing Style Contrast
- Medvedev's unorthodox game vs Sinner's clean ball-striking
## Key Matches
- Their most significant meetings
## Rivalry Trajectory
- Where this rivalry is heading`
  },
  {
    slug: 'zverev-vs-alcaraz',
    title: 'Zverev vs Alcaraz — European Clash at the Top',
    prompt: `Write a head-to-head rivalry article (700-900 words) about Alexander Zverev vs Carlos Alcaraz.

Structure:
## Zverev vs Alcaraz — The Next Chapter
- Current H2H record
## Roland Garros 2024 Final
- Their biggest match
## Physical Matchup
- Height, power, and playing styles compared
## Key Encounters
- Most notable matches
## Future Outlook
- How this rivalry could define the next decade`
  },
  {
    slug: 'gauff-vs-swiatek',
    title: 'Gauff vs Swiatek — Young Champions Face Off',
    prompt: `Write a head-to-head rivalry article (700-900 words) about Coco Gauff vs Iga Swiatek.

Structure:
## Gauff vs Swiatek — The WTA's Future
- Current H2H record (Swiatek dominates early)
## Roland Garros Meetings
- Their clay court battles
## American Power vs Polish Precision
- Style comparison
## Key Matches
- Most significant meetings so far
## The Gap Closing
- How Gauff is improving and closing the gap`
  },
  {
    slug: 'connors-vs-lendl',
    title: 'Connors vs Lendl — 35 Matches of Pure Rivalry',
    prompt: `Write a head-to-head rivalry article (700-900 words) about Jimmy Connors vs Ivan Lendl.

Structure:
## Connors vs Lendl — The 80s Powerhouses
- Overall H2H record (Lendl leads 22-13)
## Grand Slam Encounters
- US Open battles, French Open meetings
## Generational Overlap
- The old guard vs the new baseline power
## Key Matches
- Most dramatic encounters
## Legacy
- How they shaped power tennis`
  },
  {
    slug: 'henin-vs-clijsters',
    title: 'Henin vs Clijsters — Belgium\'s Tennis Queens',
    prompt: `Write a head-to-head rivalry article (700-900 words) about Justine Henin vs Kim Clijsters.

Structure:
## Henin vs Clijsters — From Friends to Rivals
- Overall H2H record (Henin leads 13-12)
## Belgian Tennis Boom
- Two champions from one small country
## Contrasting Personalities
- Henin's perfectionism vs Clijsters's joy
## Grand Slam Encounters
- Their major meetings
## The Friendship Factor
- How personal dynamics shaped this rivalry`
  },
  {
    slug: 'sharapova-vs-williams',
    title: 'Sharapova vs Serena — Tennis\'s Most Lopsided Rivalry',
    prompt: `Write a head-to-head rivalry article (700-900 words) about Maria Sharapova vs Serena Williams.

Structure:
## Sharapova vs Serena — The Numbers Don't Tell the Whole Story
- Overall H2H record (Serena leads 20-2!)
## Wimbledon 2004
- The upset that started it all (Sharapova won)
## Grand Slam Meetings
- Their meetings at majors
## Off-Court Rivalry
- The tension, the book, the public dynamics
## Why It Matters
- Despite the lopsided record, why this is still compelling`
  },
  {
    slug: 'federer-vs-murray',
    title: 'Federer vs Murray — The Mentor and the Challenger',
    prompt: `Write a head-to-head rivalry article (700-900 words) about Roger Federer vs Andy Murray.

Structure:
## Federer vs Murray — Elegance vs Grit
- Overall H2H record (Federer leads 14-11)
## Grand Slam Encounters
- Wimbledon 2012 Final (Murray's breakthrough), Australian Open battles
## Olympic Drama
- London 2012 gold medal match
## Murray's Victories
- Key wins that defined Murray's career
## The Respect Factor
- A rivalry built on mutual admiration`
  },
  {
    slug: 'tsitsipas-vs-medvedev',
    title: 'Tsitsipas vs Medvedev — The Mediterranean vs The Moscow Tactician',
    prompt: `Write a head-to-head rivalry article (700-900 words) about Stefanos Tsitsipas vs Daniil Medvedev.

Structure:
## Tsitsipas vs Medvedev — Fire vs Ice
- Overall H2H record
## Australian Open 2022 Semifinal
- The epic comeback match
## Playing Style Clash
- Tsitsipas's all-court game vs Medvedev's defensive wizardry
## Off-Court Tension
- Their famous verbal exchanges
## Key Matches
- Most dramatic encounters`
  },
  {
    slug: 'kyrgios-vs-djokovic',
    title: 'Kyrgios vs Djokovic — Tennis\'s Oddest Friendship & Rivalry',
    prompt: `Write a head-to-head rivalry article (700-900 words) about Nick Kyrgios vs Novak Djokovic.

Structure:
## Kyrgios vs Djokovic — From Enemies to Friends
- H2H record (Kyrgios leads the regular season, Djokovic leads at Slams)
## Wimbledon 2022 Final
- Their biggest match
## The Feud Years
- Years of public criticism and social media battles
## The Friendship Turn
- How they became unlikely friends
## Entertainment Value
- Why this matchup always delivers drama`
  },
];

async function generateH2HArticles() {
  return generateStaticArticles(
    'vs',
    H2H_ARTICLES,
    'You are a tennis historian and analyst writing for super.tennis. Write engaging head-to-head rivalry articles that combine statistical analysis with storytelling. Include specific match scores and dates where relevant. Use markdown formatting with ## headers.'
  );
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  SUPER.TENNIS — AI Content Generator');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Type: ${TYPE}`);
  console.log(`  Model: gpt-4o-mini`);
  console.log(`  Limit: ${LIMIT}`);
  console.log(`  Tour: ${TOUR_FILTER || 'both'}`);
  console.log(`  Force: ${FORCE}`);
  console.log(`  Dry run: ${DRY_RUN}`);
  console.log('');

  // Ensure articles table exists
  const { error: tableError } = await supabase.from('articles').select('id').limit(1);
  if (tableError && tableError.message.includes('does not exist')) {
    console.error('❌ The `articles` table does not exist in Supabase.');
    console.error('   Run the schema creation script first.');
    process.exit(1);
  }

  let result;

  switch (TYPE) {
    case 'player-profile':
    case 'player-networth':
    case 'player-racket':
      result = await generatePlayerArticles(TYPE);
      break;
    case 'record':
      result = await generateRecordArticles();
      break;
    case 'gear':
      result = await generateGearArticles();
      break;
    case 'lifestyle':
      result = await generateLifestyleArticles();
      break;
    case 'tournament':
      result = await generateTournamentArticles();
      break;
    case 'h2h':
      result = await generateH2HArticles();
      break;
    default:
      console.error(`❌ Unknown type: ${TYPE}`);
      console.error('   Available: player-profile, player-networth, player-racket, record, gear, lifestyle, tournament, h2h');
      process.exit(1);
  }

  const estCost = result.generated * 0.001; // ~$0.001 per article for gpt-4o-mini

  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log(`  ✅ Generated: ${result.generated} articles`);
  console.log(`  ❌ Errors: ${result.errors}`);
  console.log(`  💰 Estimated cost: ~$${estCost.toFixed(3)}`);
  console.log('═══════════════════════════════════════════════');
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
