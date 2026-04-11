#!/usr/bin/env node
/**
 * Generate French Open 2026 preview articles + missing Grand Slam records.
 * High priority for traffic: RG starts ~May 25, 2026 (6 weeks away).
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const OPENAI_KEY = process.env.OPENAI_API_KEY;

const ARTICLES = [
  // ── French Open 2026 (URGENT — starts ~May 25) ──────────────────────
  {
    category: 'tournaments',
    slug: 'french-open-2026-preview',
    title: 'French Open 2026: Complete Preview & Predictions',
    topic: 'Full preview of Roland Garros 2026 — who are the favorites for men\'s and women\'s titles, Sinner vs Alcaraz battle on clay, Swiatek aiming for another title, dark horses, key draws, and bold predictions. Starts late May 2026.'
  },
  {
    category: 'tournaments',
    slug: 'roland-garros-2026-mens-predictions',
    title: 'Roland Garros 2026 Men\'s Draw — Who Will Win?',
    topic: 'Deep dive into the men\'s side of French Open 2026: Jannik Sinner as world No. 1 on clay, Carlos Alcaraz defending champion, Djokovic\'s Paris legacy, Alexander Zverev, Taylor Fritz, and who can cause upsets on Parisian clay in 2026.'
  },
  {
    category: 'tournaments',
    slug: 'roland-garros-2026-womens-predictions',
    title: 'Roland Garros 2026 Women\'s Draw — Swiatek vs the Field',
    topic: 'Women\'s French Open 2026: Can Iga Swiatek win her sixth Roland Garros title? Aryna Sabalenka\'s clay improvement, Coco Gauff\'s breakthrough potential, Elena Rybakina, and the next generation challenging Swiatek\'s Paris dominance.'
  },
  {
    category: 'tournaments',
    slug: 'how-to-watch-french-open-2026',
    title: 'How to Watch French Open 2026 — TV, Streaming & Schedule',
    topic: 'How to watch Roland Garros 2026: TV broadcast rights by country, streaming options (Tennis Channel, Prime Video, Eurosport), schedule and session times, how to get tickets, and the Philippe Chatrier court night sessions.'
  },
  {
    category: 'tournaments',
    slug: 'roland-garros-clay-records',
    title: 'Roland Garros Records — Most Titles, Longest Matches, Biggest Upsets',
    topic: 'All-time Roland Garros records: Nadal\'s 14 titles (most ever at a single Grand Slam), most wins without a loss, youngest champions, biggest upsets in French Open history, and incredible clay court statistics.'
  },

  // ── Grand Slam individual records (evergreen, high search volume) ────
  {
    category: 'records',
    slug: 'most-wimbledon-titles-ever',
    title: 'Most Wimbledon Titles in History — Men\'s & Women\'s',
    topic: 'All-time Wimbledon titles records: Roger Federer 8 men\'s titles, Martina Navratilova 9 women\'s titles, most doubles titles, complete leaderboards for men and women, and analysis of who dominated the grass courts of SW19.'
  },
  {
    category: 'records',
    slug: 'most-french-open-titles-ever',
    title: 'Most French Open (Roland Garros) Titles in History',
    topic: 'All-time Roland Garros titles records: Rafael Nadal\'s 14 titles — the most at any single Grand Slam — Chris Evert women\'s record 7 titles, complete historical leaderboards, and analysis of the greatest clay court legends.'
  },
  {
    category: 'records',
    slug: 'most-us-open-titles-ever',
    title: 'Most US Open Titles in History — Men\'s & Women\'s All-Time',
    topic: 'All-time US Open titles records: Jimmy Connors 5 men\'s titles, Serena Williams and Chris Evert tied with 6 women\'s titles, complete historical leaderboards, and the greatest performances at Flushing Meadows.'
  },
  {
    category: 'records',
    slug: 'most-australian-open-titles-ever',
    title: 'Most Australian Open Titles in History',
    topic: 'All-time Australian Open titles records: Novak Djokovic record 10 men\'s titles, Serena Williams 7 women\'s titles, the Melbourne dominance of certain players, and analysis of what makes the Australian Open unique in terms of repeat champions.'
  },
  {
    category: 'records',
    slug: 'youngest-world-number-one-tennis',
    title: 'Youngest World No. 1 in Tennis History',
    topic: 'Youngest players ever ranked world No. 1 in tennis: Martina Hingis at 16, Carlos Alcaraz at 19, complete lists for men and women, how long they held the ranking, and profiles of the teenage prodigies who reached the pinnacle.'
  },
  {
    category: 'records',
    slug: 'most-grand-slam-finals-lost',
    title: 'Most Grand Slam Finals Lost — Tennis Heartbreak Records',
    topic: 'Players who lost the most Grand Slam finals in tennis history: Ivan Lendl, Roger Federer at Australian Open, complete runners-up records, and the psychological challenge of being a perennial Grand Slam finalist who can\'t break through.'
  },
  {
    category: 'records',
    slug: 'tennis-hall-of-fame-records',
    title: 'Tennis Hall of Fame — Records, Most Inductees & Greatest Honorees',
    topic: 'International Tennis Hall of Fame in Newport: how inductees are selected, youngest and oldest inductees, complete list of inducted legends by era, and profiles of the most celebrated Hall of Famers including Federer, Navratilova, and Agassi.'
  },
  {
    category: 'records',
    slug: 'open-era-records-tennis',
    title: 'Open Era Tennis Records — 1968 to Present',
    topic: 'Key records from the Open Era of tennis (1968-present): most titles, most wins, highest earnings, longest careers, and how the Open Era transformed professional tennis into a global sport. Comparison with pre-Open Era achievements.'
  },

  // ── High-volume lifestyle gaps ───────────────────────────────────────
  {
    category: 'lifestyle',
    slug: 'tennis-player-earnings-salary',
    title: 'How Much Do Tennis Players Make? Salary & Prize Money Explained',
    topic: 'Complete breakdown of how tennis players earn money: prize money, sponsorships, appearance fees, exhibition matches. How much do top players like Djokovic, Swiatek, Alcaraz earn per year? How much do lower-ranked players make? Is professional tennis financially viable?'
  },
  {
    category: 'lifestyle',
    slug: 'tennis-player-sponsorships-deals',
    title: 'Biggest Tennis Sponsorship Deals — Who Pays the Most?',
    topic: 'Biggest sponsorship deals in tennis: Roger Federer\'s $300M Uniqlo deal, Rafael Nadal Nike/Kia deals, Carlos Alcaraz Rolex/Ralph Lauren contracts, Serena Williams. How do endorsement deals work in tennis and who are the most bankable players?'
  },
];

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
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content.trim();
}

function getSystemPrompt(category) {
  const base = `You are a professional tennis journalist writing for SUPER.TENNIS, a tennis portal for passionate fans. Write in an engaging, authoritative style. Use markdown with ## headings. Do NOT start with # heading. Write 700-1000 words. Be factual with real statistics. Current year is 2026.`;
  const extra = {
    tournaments: 'Include specific facts, records, how to watch/attend, and excitement about the upcoming tournament. Make it feel current and urgent for 2026.',
    records: 'Include specific statistics, dates, player names. Use tables or leaderboards where appropriate. Compare eras fairly. Be comprehensive.',
    lifestyle: 'Be engaging and accessible. Include real numbers and examples. Useful for fans who want to understand the tennis business.',
  };
  return `${base}\n\n${extra[category] || ''}`;
}

async function main() {
  console.log('=== SUPER.TENNIS — French Open 2026 + Records Generator ===\n');

  const { data: existing } = await supabase.from('articles').select('slug');
  const existingSlugs = new Set(existing.map(a => a.slug));

  const toGenerate = ARTICLES.filter(a => !existingSlugs.has(a.slug));
  console.log(`To generate: ${toGenerate.length} / ${ARTICLES.length} (${ARTICLES.length - toGenerate.length} already exist)\n`);

  if (toGenerate.length === 0) {
    console.log('All articles already exist.');
    return;
  }

  let generated = 0;
  let failed = 0;

  for (const article of toGenerate) {
    try {
      process.stdout.write(`  [${generated + failed + 1}/${toGenerate.length}] ${article.title}... `);

      const body = await callOpenAI(
        getSystemPrompt(article.category),
        `Write an article about: "${article.title}"\n\nKey topics: ${article.topic}\n\nDo NOT use a top-level # heading. Start with an engaging intro paragraph, then use ## for sections. Write 700-1000 words.`
      );

      const slug = article.slug;
      const now = new Date().toISOString();

      const { error } = await supabase.from('articles').insert({
        slug,
        title: article.title,
        category: article.category,
        body,
        status: 'published',
        created_at: now,
        updated_at: now,
      });

      if (error) throw new Error(error.message);

      console.log('✅');
      generated++;
    } catch (err) {
      console.log(`❌ ${err.message}`);
      failed++;
    }

    // Rate limit: 1 req/sec
    await new Promise(r => setTimeout(r, 1100));
  }

  console.log(`\n=== Done: ${generated} generated, ${failed} failed ===`);
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
