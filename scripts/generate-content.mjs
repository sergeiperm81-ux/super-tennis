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
    default:
      console.error(`❌ Unknown type: ${TYPE}`);
      console.error('   Available: player-profile, player-networth, player-racket, record, gear, lifestyle, tournament');
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
