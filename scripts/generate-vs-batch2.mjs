#!/usr/bin/env node
/**
 * SUPER.TENNIS — VS/Rivalry Article Generator (Batch 2)
 *
 * Generates 25 new head-to-head rivalry articles using OpenAI gpt-4o-mini.
 * Articles are inserted into the Supabase `articles` table.
 *
 * Usage: node scripts/generate-vs-batch2.mjs [--dry-run] [--limit N]
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}
if (!OPENAI_KEY || OPENAI_KEY === 'sk-your-key') {
  console.error('Missing or placeholder OPENAI_API_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx !== -1 ? parseInt(args[limitIdx + 1]) : 25;

const SYSTEM_PROMPT = `You are a tennis historian and analyst writing for super.tennis — a tennis entertainment site for casual fans ("tennis for people who DON'T play tennis"). Write engaging head-to-head rivalry articles that combine statistical analysis with storytelling. Include specific match scores, dates, and Grand Slam results where relevant. Use markdown formatting with ## headers. Write 800-1000 words. Make it accessible and entertaining for casual fans, not just tennis experts. Write in present tense for active players and past tense for retired players. Current date context: March 2026.`;

const H2H_BATCH2 = [
  // ── Modern ATP rivalries ──
  {
    slug: 'sinner-vs-alcaraz-grand-slams',
    title: 'Sinner vs Alcaraz at Grand Slams — The Defining Rivalry of the 2020s',
    prompt: `Write a head-to-head rivalry article (800-1000 words) about Jannik Sinner vs Carlos Alcaraz specifically at Grand Slams.

## Sinner vs Alcaraz at Grand Slams — When Everything Is on the Line

Include:
- Their Grand Slam head-to-head record
- Key Grand Slam matches (2024 Australian Open semifinal, 2024 French Open semifinal, etc.)
- How the pressure of Grand Slams changes their dynamic
- Sinner's 2024 Australian Open title run, Alcaraz's 2024 French Open and Wimbledon titles
- What makes their Grand Slam meetings appointment television
- The contrast in their styles under pressure`
  },
  {
    slug: 'sinner-vs-medvedev',
    title: 'Sinner vs Medvedev — Cool Precision Meets Cold Calculation',
    prompt: `Write a head-to-head rivalry article (800-1000 words) about Jannik Sinner vs Daniil Medvedev.

## Sinner vs Medvedev — A Rivalry Built on Respect

Include:
- Their head-to-head record and notable matches
- The 2024 Australian Open final — Sinner's comeback from 2 sets down
- Medvedev's attempts to decode Sinner's game
- Sinner's clean ball-striking vs Medvedev's unorthodox defense
- How the rivalry has shifted as Sinner rose to No. 1
- Key matches at Masters 1000 events`
  },
  {
    slug: 'djokovic-vs-sinner',
    title: 'Djokovic vs Sinner — The Torch Is Being Passed',
    prompt: `Write a head-to-head rivalry article (800-1000 words) about Novak Djokovic vs Jannik Sinner.

## Djokovic vs Sinner — When the GOAT Met His Successor

Include:
- Their head-to-head record through 2025
- How Sinner ended Djokovic's dominance at the top
- Key matches (2024 Australian Open semifinal, ATP Finals)
- The respect between them despite the generational gap
- Djokovic's experience vs Sinner's youthful consistency
- What Sinner learned from facing the greatest of all time`
  },
  {
    slug: 'alcaraz-vs-medvedev',
    title: 'Alcaraz vs Medvedev — Power vs Anti-Power',
    prompt: `Write a head-to-head rivalry article (800-1000 words) about Carlos Alcaraz vs Daniil Medvedev.

## Alcaraz vs Medvedev — The Stylistic Clash

Include:
- Their head-to-head record
- Key matches including 2023 Wimbledon semifinal, Indian Wells meetings
- Alcaraz's explosive power vs Medvedev's frustrating defense
- How Medvedev's unorthodox game can neutralize Alcaraz
- The entertainment factor when they play
- Where this rivalry stands in early 2026`
  },
  {
    slug: 'djokovic-vs-zverev',
    title: 'Djokovic vs Zverev — The Final Boss and the Challenger',
    prompt: `Write a head-to-head rivalry article (800-1000 words) about Novak Djokovic vs Alexander Zverev.

## Djokovic vs Zverev — Always Close, Never Quite

Include:
- Their head-to-head record
- Key matches (2021 Olympics semifinal where Zverev won, Grand Slam meetings)
- Why Zverev has struggled to beat Djokovic at Grand Slams
- The Tokyo Olympics as Zverev's greatest moment against Djokovic
- Zverev's Grand Slam finals drought against the Big Three era
- The mutual respect and how their matchups have evolved`
  },
  {
    slug: 'sinner-vs-zverev',
    title: 'Sinner vs Zverev — Two Europeans Battling for the Top',
    prompt: `Write a head-to-head rivalry article (800-1000 words) about Jannik Sinner vs Alexander Zverev.

## Sinner vs Zverev — The New European Duel

Include:
- Their head-to-head record and recent meetings
- How both have risen to challenge for the No. 1 ranking
- Style contrasts: Sinner's aggressive baseline vs Zverev's big serve
- Key matches at Masters 1000 and Grand Slams
- How this rivalry could define the next few years of men's tennis
- Their different paths to the top of the game`
  },
  {
    slug: 'alcaraz-vs-djokovic-wimbledon',
    title: 'Alcaraz vs Djokovic at Wimbledon — Centre Court Coronation',
    prompt: `Write a head-to-head rivalry article (800-1000 words) about Carlos Alcaraz vs Novak Djokovic specifically at Wimbledon.

## Alcaraz vs Djokovic at Wimbledon — A New King of the Grass

Include:
- The 2023 Wimbledon final — Alcaraz's breakthrough in 5 sets
- The 2024 Wimbledon final — Alcaraz's dominant straight-sets victory
- What these finals meant for the generational shift in tennis
- How Wimbledon became the stage for their rivalry
- The Centre Court atmosphere during their matches
- Djokovic's quest for records vs Alcaraz's fearlessness`
  },
  {
    slug: 'ruud-vs-alcaraz',
    title: 'Ruud vs Alcaraz — The Roland Garros Rivalry',
    prompt: `Write a head-to-head rivalry article (800-1000 words) about Casper Ruud vs Carlos Alcaraz.

## Ruud vs Alcaraz — Meeting at the Top

Include:
- Their head-to-head record
- The 2024 French Open final
- Ruud's clay-court mastery vs Alcaraz's all-surface dominance
- Key matches and their respective rises through the rankings
- Ruud's consistency vs Alcaraz's explosive talent
- How their rivalry reflects different paths in modern tennis`
  },
  // ── Modern WTA rivalries ──
  {
    slug: 'sabalenka-vs-gauff',
    title: 'Sabalenka vs Gauff — Power vs Poise in the New WTA',
    prompt: `Write a head-to-head rivalry article (800-1000 words) about Aryna Sabalenka vs Coco Gauff.

## Sabalenka vs Gauff — The Future of Women's Tennis

Include:
- Their head-to-head record
- Key matches including the 2023 US Open final
- Sabalenka's raw power vs Gauff's all-around game
- How both have emerged as WTA leaders in the post-Serena era
- The generational aspect — Gauff as the youngest of the new wave
- Grand Slam meetings and their significance`
  },
  {
    slug: 'sabalenka-vs-rybakina',
    title: 'Sabalenka vs Rybakina — The Power Battle of Modern Tennis',
    prompt: `Write a head-to-head rivalry article (800-1000 words) about Aryna Sabalenka vs Elena Rybakina.

## Sabalenka vs Rybakina — When Unstoppable Force Meets Unstoppable Force

Include:
- Their head-to-head record
- Key matches at Grand Slams and WTA events
- Two of the most powerful players in WTA history going head to head
- Sabalenka's aggressive baseline game vs Rybakina's serve and flat groundstrokes
- How their rivalry has intensified as both competed for No. 1
- The physical and tactical chess match when they play`
  },
  {
    slug: 'gauff-vs-pegula',
    title: 'Gauff vs Pegula — America\'s Next Tennis Rivalry',
    prompt: `Write a head-to-head rivalry article (800-1000 words) about Coco Gauff vs Jessica Pegula.

## Gauff vs Pegula — The New American Rivalry

Include:
- Their head-to-head record
- The dynamic of being American teammates and rivals
- Key WTA matches between them
- Gauff's youth and potential vs Pegula's experience and consistency
- Their Billie Jean King Cup partnership
- How this all-American rivalry compares to the Williams sisters' dynamic`
  },
  {
    slug: 'swiatek-vs-rybakina',
    title: 'Swiatek vs Rybakina — Spin vs Flat, Poland vs Kazakhstan',
    prompt: `Write a head-to-head rivalry article (800-1000 words) about Iga Swiatek vs Elena Rybakina.

## Swiatek vs Rybakina — Contrasting Champions

Include:
- Their head-to-head record
- Key matches at Grand Slams
- Swiatek's heavy topspin and clay dominance vs Rybakina's flat power
- How their different styles create fascinating tactical battles
- Their respective Grand Slam titles and rivalry for WTA supremacy
- The global nature of their rivalry — Poland vs Kazakhstan`
  },
  {
    slug: 'gauff-vs-sabalenka-us-open',
    title: 'Gauff vs Sabalenka at the US Open — New York\'s Favorite Match',
    prompt: `Write a head-to-head rivalry article (800-1000 words) about Coco Gauff vs Aryna Sabalenka at the US Open.

## Gauff vs Sabalenka at the US Open — Arthur Ashe Under Lights

Include:
- The 2023 US Open final — Gauff's first Grand Slam title
- Subsequent US Open meetings between them
- The New York crowd's love for Gauff and the atmosphere
- How the US Open has become their defining battleground
- What makes their US Open matches must-watch television
- The tactical adjustments they make for each other`
  },
  // ── Classic rivalries ──
  {
    slug: 'lendl-vs-mcenroe',
    title: 'Lendl vs McEnroe — The Rivalry That Changed Tennis Forever',
    prompt: `Write a head-to-head rivalry article (800-1000 words) about Ivan Lendl vs John McEnroe.

## Lendl vs McEnroe — Baseline Power vs Serve-and-Volley Artistry

Include:
- Their head-to-head record (36 matches total)
- The 1984 French Open final — Lendl came back from 2 sets down
- How Lendl's rise signaled the end of the serve-and-volley era
- McEnroe's genius touch vs Lendl's fitness and baseline grinding
- Their contrasting personalities — McEnroe's fire vs Lendl's stoicism
- Why this rivalry is underrated in tennis history`
  },
  {
    slug: 'agassi-vs-sampras-us-open',
    title: 'Agassi vs Sampras at the US Open — America\'s Grand Slam Duel',
    prompt: `Write a head-to-head rivalry article (800-1000 words) about Andre Agassi vs Pete Sampras specifically at the US Open.

## Agassi vs Sampras at the US Open — The Duels That Defined the 90s

Include:
- Their US Open head-to-head meetings
- The 2001 US Open quarterfinal — their last great match
- How the US Open hardcourt suited both their games
- The American public's divided loyalty
- Key US Open finals and semifinals between them
- Why their US Open rivalry was appointment television in America`
  },
  {
    slug: 'edberg-vs-becker',
    title: 'Edberg vs Becker — The Serve-and-Volley Rivalry',
    prompt: `Write a head-to-head rivalry article (800-1000 words) about Stefan Edberg vs Boris Becker.

## Edberg vs Becker — Two Serve-and-Volley Masters Collide

Include:
- Their head-to-head record (35 matches)
- Three consecutive Wimbledon finals (1988, 1989, 1990)
- Both being serve-and-volley players but with different styles
- Edberg's elegance vs Becker's explosive power
- Their rivalry's impact on grass-court tennis history
- Why the late 1980s produced the best net play ever seen`
  },
  {
    slug: 'agassi-vs-federer',
    title: 'Agassi vs Federer — The Passing of the Torch',
    prompt: `Write a head-to-head rivalry article (800-1000 words) about Andre Agassi vs Roger Federer.

## Agassi vs Federer — When Two Eras Met

Include:
- Their head-to-head record
- The 2005 US Open final — Agassi's emotional last Grand Slam final
- How Federer's rise coincided with Agassi's final years
- The mutual admiration and respect between them
- Agassi's return game vs Federer's serve and all-court play
- What Agassi said about Federer being the greatest he'd seen`
  },
  {
    slug: 'hingis-vs-williams',
    title: 'Hingis vs Serena — The Late-90s WTA Feud',
    prompt: `Write a head-to-head rivalry article (800-1000 words) about Martina Hingis vs Serena Williams.

## Hingis vs Serena — Finesse vs Power, Old World vs New Era

Include:
- Their head-to-head record
- The infamous 1999 US Open final
- How Serena's power game changed what it took to dominate WTA
- Hingis's teenage dominance ended by the Williams sisters' arrival
- The personal tensions and contrasting personalities
- How this rivalry marked a turning point in women's tennis`
  },
  {
    slug: 'graf-vs-navratilova',
    title: 'Graf vs Navratilova — The Generational Clash',
    prompt: `Write a head-to-head rivalry article (800-1000 words) about Steffi Graf vs Martina Navratilova.

## Graf vs Navratilova — Youth Dethroned the Queen

Include:
- Their head-to-head record
- How teenage Graf ended Navratilova's reign
- The 1987 French Open final as a turning point
- Navratilova's serve-and-volley vs Graf's powerful forehand
- The emotional weight of the rivalry for Navratilova
- How their rivalry bridged two different eras of women's tennis`
  },
  {
    slug: 'nadal-vs-murray',
    title: 'Nadal vs Murray — The Underappreciated Rivalry',
    prompt: `Write a head-to-head rivalry article (800-1000 words) about Rafael Nadal vs Andy Murray.

## Nadal vs Murray — Overshadowed but Never Boring

Include:
- Their head-to-head record (24 matches)
- Key Grand Slam semifinals between them
- How both suffered through injuries but kept fighting
- Murray's two Wimbledon titles vs Nadal's 14 French Open crowns
- Their friendship and mutual respect off the court
- Why this rivalry is underrated compared to Big Three matchups`
  },
  // ── Cross-era and special matchups ──
  {
    slug: 'federer-vs-wawrinka',
    title: 'Federer vs Wawrinka — The Swiss Derby',
    prompt: `Write a head-to-head rivalry article (800-1000 words) about Roger Federer vs Stan Wawrinka.

## Federer vs Wawrinka — Teammates, Friends, Rivals

Include:
- Their head-to-head record (26 matches)
- Wawrinka's 3 Grand Slam titles vs Federer's 20
- Key matches at Grand Slams
- Their Olympic doubles gold medal partnership
- How Wawrinka stepped out of Federer's shadow to win 3 Slams
- The Swiss tennis golden era they created together`
  },
  {
    slug: 'djokovic-vs-nadal-australian-open',
    title: 'Djokovic vs Nadal at the Australian Open — Midnight Marathons',
    prompt: `Write a head-to-head rivalry article (800-1000 words) about Novak Djokovic vs Rafael Nadal specifically at the Australian Open.

## Djokovic vs Nadal at the Australian Open — Late Night in Melbourne

Include:
- The 2012 Australian Open final — 5 hours 53 minutes, the longest Grand Slam final ever
- Their multiple Australian Open finals (2012, 2019)
- Djokovic's dominance in Melbourne (10 titles)
- The famous late-night matches and marathon rallies
- How the heat and conditions favor Djokovic
- Why Melbourne became their defining battleground`
  },
  {
    slug: 'osaka-vs-barty',
    title: 'Osaka vs Barty — Two No. 1s, Two Different Journeys',
    prompt: `Write a head-to-head rivalry article (800-1000 words) about Naomi Osaka vs Ashleigh Barty.

## Osaka vs Barty — Power Baseline vs All-Court Genius

Include:
- Their head-to-head record
- Both reaching No. 1 in contrasting ways
- Osaka's 4 Grand Slam titles vs Barty's 3
- Barty's early retirement at 25 while at No. 1
- Their contrasting styles — Osaka's power vs Barty's variety
- What might have been if Barty hadn't retired so early`
  },
  {
    slug: 'nadal-vs-alcaraz',
    title: 'Nadal vs Alcaraz — The Spanish Succession',
    prompt: `Write a head-to-head rivalry article (800-1000 words) about Rafael Nadal vs Carlos Alcaraz.

## Nadal vs Alcaraz — Master and Apprentice

Include:
- Their head-to-head record (limited but significant)
- Both being from Spain and training at similar academies
- Alcaraz's emergence as Nadal's successor to Spanish tennis dominance
- Key matches (2022 Indian Wells, 2022 Madrid)
- Nadal as the mentor figure vs Alcaraz as the fearless heir
- How Alcaraz's game differs from Nadal's despite the comparisons`
  },
  {
    slug: 'draper-vs-sinner',
    title: 'Draper vs Sinner — The Emerging Next-Gen Rivalry',
    prompt: `Write a head-to-head rivalry article (800-1000 words) about Jack Draper vs Jannik Sinner.

## Draper vs Sinner — Britain's Hope vs Italy's Champion

Include:
- Their head-to-head record
- Draper's rapid rise through the rankings in 2024-2025
- The 2024 US Open semifinal
- Both being part of the new generation challenging the established order
- Draper's left-handed game and big serve vs Sinner's relentless baseline play
- Why this rivalry could become one of the defining matchups of the late 2020s`
  },
];

// ────────────────────────────────────────────────────────────
// OpenAI helper
// ────────────────────────────────────────────────────────────

async function callOpenAI(system, prompt, maxTokens = 1200) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_KEY}`,
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

// ────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(50));
  console.log('  SUPER.TENNIS — VS Articles Batch 2 (25 new)');
  console.log('='.repeat(50));
  console.log(`  Dry run: ${DRY_RUN}`);
  console.log(`  Limit: ${LIMIT}`);
  console.log('');

  // Filter out any that already exist
  const { data: existing } = await supabase
    .from('articles')
    .select('slug')
    .eq('category', 'vs')
    .in('slug', H2H_BATCH2.map(a => a.slug));

  const existingSlugs = new Set((existing || []).map(a => a.slug));
  let articles = H2H_BATCH2.filter(a => !existingSlugs.has(a.slug));

  if (existingSlugs.size > 0) {
    console.log(`  Skipping ${existingSlugs.size} already existing: ${[...existingSlugs].join(', ')}`);
  }

  if (LIMIT < articles.length) articles = articles.slice(0, LIMIT);
  console.log(`  ${articles.length} articles to generate\n`);

  let generated = 0;
  let errors = 0;

  for (const article of articles) {
    process.stdout.write(`  [${generated + errors + 1}/${articles.length}] ${article.title}... `);

    if (DRY_RUN) {
      console.log('SKIP (dry run)');
      generated++;
      continue;
    }

    try {
      const body = await callOpenAI(SYSTEM_PROMPT, article.prompt, 1200);

      const { error: upsertError } = await supabase
        .from('articles')
        .upsert(
          {
            slug: article.slug,
            title: article.title,
            category: 'vs',
            subcategory: 'vs',
            excerpt: body.substring(0, 200).replace(/\n/g, ' ').trim() + '...',
            body,
            meta_title: `${article.title} | SUPER.TENNIS`,
            meta_description: body.substring(0, 155).replace(/\n/g, ' ').trim(),
            status: 'published',
            published_at: new Date().toISOString(),
            ai_model: 'gpt-4o-mini',
            ai_generated_at: new Date().toISOString(),
          },
          { onConflict: 'slug' },
        );

      if (upsertError) {
        console.log(`DB error: ${upsertError.message}`);
        errors++;
      } else {
        console.log(`OK (${body.length} chars)`);
        generated++;
      }

      // Rate-limit: 800ms between calls
      await new Promise(r => setTimeout(r, 800));
    } catch (e) {
      console.log(`ERROR: ${e.message}`);
      errors++;
      if (e.message.includes('429')) {
        console.log('    Rate limited, waiting 30s...');
        await new Promise(r => setTimeout(r, 30000));
      }
    }
  }

  console.log('');
  console.log('='.repeat(50));
  console.log(`  Generated: ${generated} articles`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Est. cost: ~$${(generated * 0.001).toFixed(3)}`);
  console.log('='.repeat(50));
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
