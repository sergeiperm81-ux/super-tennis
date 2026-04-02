#!/usr/bin/env node
/**
 * Generate new tennis articles and insert into Supabase.
 * Targets: gear, lifestyle, records, tournaments categories.
 * Skips articles whose slug already exists.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !OPENAI_KEY) {
  console.error('Missing env vars. Need SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Article definitions ──────────────────────────────────────────────

const ARTICLES = [
  // GEAR (17)
  { category: 'gear', slug: 'best-tennis-shoes-clay-courts-2026', title: 'Best Tennis Shoes for Clay Courts 2026', topic: 'Best tennis shoes specifically designed for clay court play in 2026, including herringbone outsole patterns, slide support, and top picks from Nike, Asics, and Adidas' },
  { category: 'gear', slug: 'best-tennis-bags-guide', title: 'Best Tennis Bags — Top Picks for Players', topic: 'Comprehensive guide to the best tennis bags in 2026, covering backpacks, 3-pack, 6-pack, 9-pack and 12-pack bags from Wilson, Babolat, Head, and Yonex' },
  { category: 'gear', slug: 'tennis-grip-choosing-guide', title: 'Tennis Grip Guide — How to Choose the Right Grip', topic: 'How to choose the right tennis grip size, replacement grips vs overgrips, grip materials, and how grip affects control and comfort' },
  { category: 'gear', slug: 'best-tennis-strings-spin', title: 'Best Tennis Strings for Spin', topic: 'Best tennis strings for generating maximum spin, including shaped polyester strings, co-poly options, and string setups used by spin-heavy pros' },
  { category: 'gear', slug: 'best-tennis-balls-comparison', title: 'Tennis Ball Comparison — Which Balls Are Best?', topic: 'Comparison of popular tennis balls including Wilson US Open, Dunlop Fort, Penn Championship, and pressureless vs pressurized balls for different court types' },
  { category: 'gear', slug: 'best-tennis-sunglasses', title: 'Best Tennis Sunglasses for Players', topic: 'Best sunglasses for tennis players with features like anti-slip frames, UV protection, polarized vs non-polarized lenses, and top picks from Oakley, Nike, and Bollé' },
  { category: 'gear', slug: 'tennis-overgrip-comparison', title: 'Tennis Overgrip Guide — Tourna vs Wilson vs Yonex', topic: 'Head-to-head comparison of top tennis overgrips: Tourna Original, Wilson Pro Overgrip, and Yonex Super Grap — tackiness, durability, absorbency, and value' },
  { category: 'gear', slug: 'best-tennis-dampeners-guide', title: 'Best Tennis Dampeners — Do They Really Work?', topic: 'Do tennis vibration dampeners actually work? Science behind dampeners, top picks, how to install them, and whether pros use them' },
  { category: 'gear', slug: 'tennis-elbow-arm-friendly-rackets', title: 'Tennis Elbow Prevention — Best Arm-Friendly Rackets', topic: 'Best arm-friendly tennis rackets for preventing tennis elbow, including flexible frames, heavier rackets, and string setups that reduce vibration' },
  { category: 'gear', slug: 'best-tennis-skirts-dresses-2026', title: 'Best Tennis Skirts & Dresses 2026', topic: 'Best tennis skirts and dresses for women in 2026, covering Nike, Adidas, Lululemon, and performance features like built-in shorts and moisture wicking' },
  { category: 'gear', slug: 'best-tennis-watches-smartwatches', title: 'Tennis Watch Guide — Best Smartwatches for Tennis', topic: 'Best smartwatches and fitness trackers for tennis players in 2026, including Apple Watch Ultra, Garmin Venu, and dedicated tennis tracking features' },
  { category: 'gear', slug: 'best-tennis-ball-machines', title: 'Best Tennis Machines — Ball Machine Buying Guide', topic: 'Complete buying guide for tennis ball machines in 2026, covering Lobster, Spinfire, Slinger Bag, features like oscillation, spin control, and portable options' },
  { category: 'gear', slug: 'tennis-court-surfaces-explained', title: 'Tennis Court Surfaces Explained — Hard, Clay, Grass', topic: 'Detailed explanation of all tennis court surfaces: hard court, clay court, grass court, and carpet — how they affect ball bounce, speed, player movement, and injury risk' },
  { category: 'gear', slug: 'best-budget-tennis-rackets', title: 'Best Budget Tennis Rackets Under $100', topic: 'Best affordable tennis rackets under $100 for beginners and recreational players, including options from Head, Wilson, and Babolat that offer great value' },
  { category: 'gear', slug: 'best-tennis-headbands-wristbands', title: 'Best Tennis Headbands & Wristbands', topic: 'Best tennis headbands and wristbands for sweat management, featuring Nike, Under Armour, and Uniqlo options plus style tips from the pros' },
  { category: 'gear', slug: 'tennis-shoe-technology-guide', title: 'Tennis Shoe Technology — What Makes a Great Tennis Shoe', topic: 'Deep dive into tennis shoe technology: lateral support, outsole durability, cushioning systems, court-specific designs, and innovations from Nike, Asics, and New Balance' },
  { category: 'gear', slug: 'best-tennis-gear-beginners', title: 'Best Tennis Gear for Beginners — Complete Starter Kit', topic: 'Complete starter kit guide for tennis beginners covering rackets, shoes, balls, bags, grips, and accessories — everything needed to start playing' },

  // LIFESTYLE (20)
  { category: 'lifestyle', slug: 'tennis-players-deal-with-pressure', title: 'How Tennis Players Deal With Pressure', topic: 'How professional tennis players handle pressure during matches and tournaments, including mental techniques, breathing exercises, and sports psychology approaches used by top pros' },
  { category: 'lifestyle', slug: 'tennis-player-morning-routines', title: 'Tennis Player Morning Routines', topic: 'Morning routines of top tennis players including Djokovic, Nadal, Swiatek — covering meditation, nutrition, warm-up, and pre-practice habits' },
  { category: 'lifestyle', slug: 'best-tennis-podcasts-2026', title: 'Best Tennis Podcasts to Follow in 2026', topic: 'Best tennis podcasts in 2026 including The Tennis Podcast, Gill & Cain, Racquet Magazine, and other must-listen shows for tennis fans' },
  { category: 'lifestyle', slug: 'tennis-player-diet-what-pros-eat', title: 'Tennis Player Diet — What the Pros Eat', topic: 'What professional tennis players eat before, during, and after matches — covering Djokovic gluten-free diet, Nadal match day meals, and sports nutrition science' },
  { category: 'lifestyle', slug: 'how-to-watch-tennis-beginners-guide', title: 'How to Watch Tennis — A Beginner\'s Guide to Understanding the Game', topic: 'Beginner-friendly guide to watching and understanding tennis, covering scoring, shot types, tactics, what to look for during rallies, and how to appreciate strategy' },
  { category: 'lifestyle', slug: 'tennis-etiquette-rules-fans', title: 'Tennis Etiquette — Unwritten Rules Every Fan Should Know', topic: 'Unwritten rules and etiquette of tennis for spectators and recreational players, covering when to clap, silence during points, dress codes, and court behavior' },
  { category: 'lifestyle', slug: 'best-tennis-academies-world', title: 'Best Tennis Academies in the World', topic: 'Best tennis academies in the world including IMG Academy, Mouratoglou Academy, Rafa Nadal Academy, Sanchez-Casal, and Bollettieri — programs, costs, and famous alumni' },
  { category: 'lifestyle', slug: 'tennis-player-tattoos-stories', title: 'Tennis Player Tattoos — Stories Behind the Ink', topic: 'Stories behind tattoos of famous tennis players including Stan Wawrinka, Aryna Sabalenka, Alexander Zverev, and other players who express themselves through body art' },
  { category: 'lifestyle', slug: 'tennis-best-sport-mental-health', title: 'Why Tennis is the Best Sport for Mental Health', topic: 'Scientific evidence for why tennis is one of the best sports for mental health, covering social connection, stress relief, cognitive benefits, and longevity studies' },
  { category: 'lifestyle', slug: 'tennis-social-media-player-brands', title: 'Tennis and Social Media — How Players Build Their Brand', topic: 'How tennis players use Instagram, TikTok, YouTube, and X to build personal brands — case studies of successful player social media strategies' },
  { category: 'lifestyle', slug: 'richest-tennis-players-homes', title: 'Richest Tennis Players\' Homes — Inside the Mansions', topic: 'A look inside the luxury homes and mansions of the richest tennis players including Federer, Djokovic, Nadal, Serena Williams, and their real estate portfolios' },
  { category: 'lifestyle', slug: 'tennis-player-cars-collection', title: 'Tennis Player Cars — What Do ATP/WTA Stars Drive?', topic: 'What cars do tennis stars drive? Exploring the luxury car collections of Nadal, Djokovic, Osaka, Alcaraz, and other tennis players — from Mercedes to Aston Martin' },
  { category: 'lifestyle', slug: 'tennis-couples-love-stories', title: 'Tennis Couples — Love Stories On and Off the Court', topic: 'Famous tennis couples and love stories — players who dated or married each other, including Agassi-Graf, Elina Svitolina-Gael Monfils, and current ATP/WTA couples' },
  { category: 'lifestyle', slug: 'how-to-become-professional-tennis-player', title: 'How to Become a Professional Tennis Player', topic: 'Step-by-step guide to becoming a professional tennis player — from junior development, ITF Futures, Challenger circuit, to the ATP/WTA tour pathway' },
  { category: 'lifestyle', slug: 'tennis-scoring-love-deuce-explained', title: 'Tennis Scoring Explained — Love, Deuce, and Everything Between', topic: 'Complete guide to tennis scoring for beginners — why love means zero, how deuce works, tiebreakers, sets, and the unique scoring history of tennis' },
  { category: 'lifestyle', slug: 'best-tennis-books-all-time', title: 'Best Tennis Books of All Time', topic: 'Best tennis books ever written including Open by Agassi, Infinite Jest tennis scenes, Levels of the Game, and memoirs from Federer, Nadal, and Billie Jean King' },
  { category: 'lifestyle', slug: 'tennis-vs-padel-differences', title: 'Tennis vs Padel — What\'s the Difference?', topic: 'Tennis vs padel: key differences in court size, scoring, equipment, rules, and why padel is growing so fast — plus which sport is right for you' },
  { category: 'lifestyle', slug: 'best-tennis-video-games-ever', title: 'Best Tennis Video Games Ever Made', topic: 'Best tennis video games of all time from Virtua Tennis and Top Spin to modern titles like Tennis World Tour and AO Tennis, plus upcoming releases' },
  { category: 'lifestyle', slug: 'tennis-travel-best-cities-live-tennis', title: 'Tennis Travel — Best Cities to Watch Live Tennis', topic: 'Best cities in the world to watch live professional tennis — Melbourne, Paris, London, New York, Indian Wells, Monte Carlo, and insider tips for each venue' },
  { category: 'lifestyle', slug: 'tennis-player-pre-match-rituals', title: 'Tennis Player Superstitions — Pre-Match Rituals', topic: 'Strangest pre-match rituals and superstitions of tennis pros — Nadal bottle arrangement, Djokovic bouncing routine, Serena socks, and other quirky habits' },

  // RECORDS (12)
  { category: 'records', slug: 'longest-tennis-matches-history', title: 'Longest Tennis Matches in History', topic: 'Longest tennis matches in history by duration, including Isner-Mahut at Wimbledon 2010, and other marathon matches that pushed human endurance to the limit' },
  { category: 'records', slug: 'youngest-grand-slam-champions', title: 'Youngest Grand Slam Champions Ever', topic: 'Youngest Grand Slam champions in tennis history for both men and women — from Michael Chang and Martina Hingis to Carlos Alcaraz and modern prodigies' },
  { category: 'records', slug: 'oldest-grand-slam-champions', title: 'Oldest Grand Slam Champions', topic: 'Oldest Grand Slam champions in tennis history — Ken Rosewall, Serena Williams, Roger Federer at 36, and the remarkable late-career achievements' },
  { category: 'records', slug: 'most-aces-tennis-history-records', title: 'Most Aces in Tennis History', topic: 'All-time records for most aces in tennis history — career leaders like Ivo Karlovic and John Isner, single-match records, and Grand Slam ace records' },
  { category: 'records', slug: 'fastest-tennis-serves-ever', title: 'Fastest Tennis Serves Ever Recorded', topic: 'Fastest tennis serves ever recorded — Sam Groth 263 km/h, John Isner, and the evolution of serve speed in both ATP and WTA tennis with detailed records' },
  { category: 'records', slug: 'most-double-faults-tennis', title: 'Most Double Faults in Tennis History', topic: 'Records for most double faults in tennis — single match records, career leaders, Grand Slam double fault records, and the most error-prone servers in history' },
  { category: 'records', slug: 'most-consecutive-grand-slam-finals', title: 'Most Consecutive Grand Slam Finals', topic: 'Players who reached the most consecutive Grand Slam finals — Roger Federer record 10 in a row, Djokovic streaks, and the greatest sustained excellence in tennis' },
  { category: 'records', slug: 'tennis-comebacks-two-sets-down', title: 'Tennis Players With Most Comebacks From 2 Sets Down', topic: 'Greatest comebacks from two sets down in Grand Slam history — players who have overcome the odds, including famous five-set turnarounds' },
  { category: 'records', slug: 'most-prize-money-single-tournament', title: 'Most Prize Money Won in a Single Tournament', topic: 'Records for most prize money won in a single tennis tournament — biggest paydays, how prize money has grown, and the richest tournaments in 2026' },
  { category: 'records', slug: 'most-tennis-titles-single-year', title: 'Most Tennis Titles Won in a Single Year', topic: 'Records for most tennis titles won in a single calendar year — Jimmy Connors, Rod Laver, Martina Navratilova, and modern era records by Djokovic and Swiatek' },
  { category: 'records', slug: 'longest-winning-streaks-each-surface', title: 'Longest Winning Streaks on Each Surface', topic: 'Longest winning streaks on each tennis surface — clay (Nadal 81), grass, hard court records, and the dominant surface specialists throughout history' },
  { category: 'records', slug: 'most-bagels-grand-slams', title: 'Most Bagels (6-0 Sets) in Grand Slam History', topic: 'Records for most 6-0 sets (bagels) in Grand Slam history — who has dished out the most, who has received the most, and the most lopsided Grand Slam matches' },

  // TOURNAMENTS (8)
  { category: 'tournaments', slug: 'indian-wells-complete-guide', title: 'Indian Wells — Complete Tournament Guide', topic: 'Complete guide to the BNP Paribas Open at Indian Wells — history, records, how to get tickets, best seats, travel tips, and what makes it the 5th Grand Slam' },
  { category: 'tournaments', slug: 'miami-open-complete-guide', title: 'Miami Open — Complete Tournament Guide', topic: 'Complete guide to the Miami Open at Hard Rock Stadium — history, past champions, how to attend, ticket prices, and the Sunshine Double connection with Indian Wells' },
  { category: 'tournaments', slug: 'monte-carlo-masters-complete-guide', title: 'Monte Carlo Masters — Complete Tournament Guide', topic: 'Complete guide to the Monte Carlo Masters — history, Nadal record 11 titles, clay court season opener, how to attend, and the glamorous Riviera setting' },
  { category: 'tournaments', slug: 'madrid-open-guide', title: 'Madrid Open — Complete Tournament Guide', topic: 'Complete guide to the Madrid Open at Caja Magica — history, altitude effect on play, combined ATP/WTA event, how to attend, and the unique blue clay controversy' },
  { category: 'tournaments', slug: 'rome-masters-guide', title: 'Rome Masters — Complete Tournament Guide', topic: 'Complete guide to the Italian Open in Rome at Foro Italico — history, tradition as Roland Garros warmup, how to attend, and the passionate Italian crowd atmosphere' },
  { category: 'tournaments', slug: 'cincinnati-masters-guide', title: 'Cincinnati Masters — Complete Tournament Guide', topic: 'Complete guide to the Cincinnati Masters (Western & Southern Open) — history as oldest tournament after Grand Slams, US Open warmup, and how to attend' },
  { category: 'tournaments', slug: 'shanghai-masters-complete-guide', title: 'Shanghai Masters — Complete Tournament Guide', topic: 'Complete guide to the Shanghai Masters at Qizhong Forest Sports City — history, Asian tennis growth, how to attend, and top performances' },
  { category: 'tournaments', slug: 'atp-finals-complete-guide', title: 'ATP Finals — Complete Tournament Guide', topic: 'Complete guide to the Nitto ATP Finals in Turin — round-robin format explained, qualification rules, history from past locations, and how to attend' },
];

// ── OpenAI helper ────────────────────────────────────────────────────

async function callOpenAI(systemPrompt, userPrompt) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2500,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.choices[0].message.content.trim();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Prompt builders ──────────────────────────────────────────────────

function getSystemPrompt(category) {
  const base = `You are a professional tennis journalist writing for SUPER.TENNIS, a tennis portal for fans who don't play tennis themselves. Write in an engaging, accessible style. Use markdown formatting with ## headings. Do NOT start with a top-level # heading (the title is added separately). Write 600-1000 words. Be factual, mention real players and real statistics. Current year is 2026.`;

  const categorySpecific = {
    gear: 'Focus on practical buying advice. Mention specific products, prices when possible, and who each product is best for. Include pros and cons.',
    lifestyle: 'Make it entertaining and accessible for casual fans. Include interesting anecdotes and fun facts. Connect tennis culture to broader pop culture when relevant.',
    records: 'Include specific statistics, dates, and tournament details. Use a leaderboard or list format where appropriate. Compare eras fairly.',
    tournaments: 'Cover history, atmosphere, notable moments, practical visitor information, past champions, and what makes this tournament unique. Include travel tips.',
  };

  return `${base}\n\n${categorySpecific[category] || ''}`;
}

function getUserPrompt(article) {
  return `Write an article about: "${article.title}"\n\nKey topics to cover: ${article.topic}\n\nRemember: Do NOT include a top-level # heading. Start directly with an engaging introduction paragraph, then use ## for section headings. Write 600-1000 words in markdown.`;
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log('=== SUPER.TENNIS Article Generator ===\n');

  // 1. Get existing slugs
  const { data: existingArticles, error: fetchErr } = await supabase
    .from('articles')
    .select('slug');

  if (fetchErr) {
    console.error('Failed to fetch existing articles:', fetchErr.message);
    process.exit(1);
  }

  const existingSlugs = new Set(existingArticles.map(a => a.slug));
  console.log(`Found ${existingSlugs.size} existing articles in database.\n`);

  // 2. Filter out already-existing slugs
  const toGenerate = ARTICLES.filter(a => !existingSlugs.has(a.slug));
  const skipped = ARTICLES.length - toGenerate.length;

  console.log(`Total defined: ${ARTICLES.length}`);
  console.log(`Already exist (skipping): ${skipped}`);
  console.log(`To generate: ${toGenerate.length}\n`);

  if (toGenerate.length === 0) {
    console.log('Nothing to generate. All articles already exist.');
    return;
  }

  // 3. Process in batches of 5
  const BATCH_SIZE = 5;
  let generated = 0;
  let failed = 0;

  for (let i = 0; i < toGenerate.length; i += BATCH_SIZE) {
    const batch = toGenerate.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(toGenerate.length / BATCH_SIZE);
    console.log(`\n--- Batch ${batchNum}/${totalBatches} ---`);

    for (const article of batch) {
      try {
        console.log(`  Generating: ${article.title}...`);

        const body = await callOpenAI(
          getSystemPrompt(article.category),
          getUserPrompt(article)
        );

        // Build excerpt (first 200 chars of body)
        const excerpt = body.substring(0, 200).replace(/\n/g, ' ').trim() + '...';

        // Build meta fields
        const metaTitle = `${article.title} — SUPER.TENNIS`;
        const metaDescription = body.substring(0, 155).replace(/[#*\n]/g, ' ').replace(/\s+/g, ' ').trim();

        const now = new Date().toISOString();

        const record = {
          slug: article.slug,
          title: article.title,
          category: article.category,
          subcategory: article.category,
          excerpt,
          body,
          image_url: null,
          image_alt: null,
          meta_title: metaTitle,
          meta_description: metaDescription,
          status: 'published',
          published_at: now,
          ai_model: 'gpt-4o-mini',
          ai_generated_at: now,
        };

        const { error: insertErr } = await supabase
          .from('articles')
          .insert(record);

        if (insertErr) {
          if (insertErr.message.includes('duplicate') || insertErr.message.includes('unique')) {
            console.log(`    SKIP (duplicate): ${article.slug}`);
          } else {
            console.error(`    FAIL: ${insertErr.message}`);
            failed++;
          }
        } else {
          generated++;
          console.log(`    OK (${generated} done)`);
        }

        // Delay between OpenAI calls
        await sleep(2000);

      } catch (err) {
        console.error(`    ERROR: ${err.message}`);
        failed++;
        await sleep(3000);
      }
    }
  }

  // 4. Final stats
  console.log('\n=== DONE ===');
  console.log(`Generated: ${generated}`);
  console.log(`Failed: ${failed}`);
  console.log(`Skipped (already existed): ${skipped}`);

  // Count total
  const { count } = await supabase
    .from('articles')
    .select('*', { count: 'exact', head: true });
  console.log(`\nTotal articles in database: ${count}`);

  // Count by category
  for (const cat of ['gear', 'lifestyle', 'records', 'tournaments', 'players', 'vs']) {
    const { count: catCount } = await supabase
      .from('articles')
      .select('*', { count: 'exact', head: true })
      .eq('category', cat);
    console.log(`  ${cat}: ${catCount}`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
