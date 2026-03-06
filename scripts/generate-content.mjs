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

  // Get players that need articles
  let query = supabase
    .from('players')
    .select('*')
    .gt('career_titles', type === 'player-networth' ? 5 : 3) // Higher bar for net worth
    .order('career_titles', { ascending: false })
    .limit(LIMIT);

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

async function generateRecordArticles() {
  let articles = RECORD_ARTICLES;

  if (!FORCE) {
    const { data: existing } = await supabase
      .from('articles')
      .select('slug')
      .eq('category', 'records')
      .in('slug', articles.map(a => a.slug));

    const existingSlugs = new Set((existing || []).map(a => a.slug));
    articles = articles.filter(a => !existingSlugs.has(a.slug));
  }

  if (LIMIT < articles.length) articles = articles.slice(0, LIMIT);

  console.log(`📋 ${articles.length} record articles to generate\n`);

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
      const body = await callOpenAI(
        'You are a professional tennis journalist writing for super.tennis. Write factual, engaging articles about tennis records and history. Use markdown formatting with ## headers. Target a general audience.',
        article.prompt,
        1000
      );

      const { error: upsertError } = await supabase
        .from('articles')
        .upsert({
          slug: article.slug,
          title: article.title,
          category: 'records',
          subcategory: 'record',
          excerpt: body.substring(0, 200).replace(/\n/g, ' ').trim() + '...',
          body,
          meta_title: `${article.title} — Tennis Records`,
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
    default:
      console.error(`❌ Unknown type: ${TYPE}`);
      console.error('   Available types: player-profile, player-networth, player-racket, record');
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
