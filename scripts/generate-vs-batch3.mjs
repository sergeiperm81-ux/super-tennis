#!/usr/bin/env node
/**
 * Generate new vs/ rivalry articles — Batch 3
 * High-search-volume rivalries not yet in the DB.
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
  {
    slug: 'tsitsipas-vs-alcaraz',
    title: 'Tsitsipas vs Alcaraz — Head-to-Head, Stats & Analysis',
    topic: 'Complete analysis of the rivalry between Stefanos Tsitsipas and Carlos Alcaraz: head-to-head record, key matches including their clay court battles, how their games match up, Grand Slam meetings, and who has the edge going forward in 2026.',
  },
  {
    slug: 'tsitsipas-vs-djokovic',
    title: 'Tsitsipas vs Djokovic — The Rivalry That Defined a Generation',
    topic: 'Deep dive into the Tsitsipas vs Djokovic rivalry: the infamous 2021 Australian Open comeback where Djokovic came back from 2 sets down, their French Open battles, head-to-head record across all surfaces, and the mental chess game between them.',
  },
  {
    slug: 'tsitsipas-vs-sinner',
    title: 'Tsitsipas vs Sinner — European Rivalry Battle',
    topic: 'The rivalry between Stefanos Tsitsipas and Jannik Sinner: head-to-head stats, key matches where Sinner has asserted dominance, how their playing styles clash, and whether Tsitsipas can challenge the new generation leader.',
  },
  {
    slug: 'rublev-vs-medvedev',
    title: 'Rublev vs Medvedev — The Russian Derby',
    topic: 'The fascinating Russian rivalry between Andrey Rublev and Daniil Medvedev: head-to-head record, their contrasting personalities and playing styles, key ATP matches between them, and who has come out on top in their career rivalry.',
  },
  {
    slug: 'federer-vs-sampras',
    title: 'Federer vs Sampras — Who Is the Greater Champion?',
    topic: 'The ultimate debate: Roger Federer vs Pete Sampras. Their only professional meeting, career Grand Slam totals, Wimbledon dominance, serve statistics, era comparisons, and which one deserves to be called the greater champion. Federer idolized Sampras growing up.',
  },
  {
    slug: 'nadal-vs-sampras',
    title: 'Nadal vs Sampras — Clay King vs Grass God',
    topic: 'Comparing Rafael Nadal and Pete Sampras across eras: Nadal\'s clay dominance vs Sampras\'s grass supremacy, their Grand Slam records on different surfaces, similarities in their serve-and-athleticism games, and the impossible question of who was better.',
  },
  {
    slug: 'fritz-vs-alcaraz',
    title: 'Fritz vs Alcaraz — America\'s Best vs the World No. 1',
    topic: 'Taylor Fritz vs Carlos Alcaraz: head-to-head record including Fritz victories over Alcaraz at Wimbledon and Indian Wells, the American vs Spanish rivalry, Fritz\'s aggressive baseline game against Alcaraz\'s all-court brilliance, and match analysis.',
  },
  {
    slug: 'azarenka-vs-williams',
    title: 'Azarenka vs Serena Williams — The Greatest WTA Rivalry?',
    topic: 'Victoria Azarenka vs Serena Williams: one of the most compelling WTA rivalries of the 2010s. The 2013 Australian Open semifinal controversy, US Open finals battles, head-to-head record, and how Azarenka pushed Serena harder than almost anyone.',
  },
  {
    slug: 'halep-vs-swiatek',
    title: 'Halep vs Swiatek — Romanian Legend vs Polish Queen',
    topic: 'Simona Halep vs Iga Swiatek: the passing of the torch in women\'s tennis. Their Roland Garros connection (Halep won RG twice, Swiatek now dominates it), head-to-head meetings, contrasting clay styles, and Swiatek\'s emergence as the dominant force.',
  },
  {
    slug: 'djokovic-vs-lendl',
    title: 'Djokovic vs Lendl — Comparing the Greatest Grinders in Tennis History',
    topic: 'Comparing Novak Djokovic and Ivan Lendl across eras: both known for their exceptional returning, fitness, and mental strength. Career Grand Slam totals, world No. 1 weeks records, dominance over rivals, and who was the more complete champion.',
  },
];

async function callOpenAI(title, topic) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a professional tennis journalist writing for SUPER.TENNIS. Write engaging head-to-head rivalry articles for passionate tennis fans. Use markdown with ## headings. Do NOT start with # heading. Write 700-900 words. Include specific statistics, memorable match moments, and analysis. Current year is 2026.`
        },
        {
          role: 'user',
          content: `Write a rivalry article: "${title}"\n\nKey topics: ${topic}`
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const d = await res.json();
  return d.choices[0].message.content.trim();
}

async function generateFAQs(title, body) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Generate 5 FAQ pairs for a tennis rivalry article. Return ONLY a JSON array: [{"question": "...", "answer": "..."}]. Answers 1-2 sentences.' },
        { role: 'user', content: `Title: "${title}"\nBody:\n${body.slice(0, 1200)}\nReturn JSON array only.` }
      ],
      temperature: 0.3,
      max_tokens: 500,
    }),
  });
  const d = await res.json();
  const text = d.choices[0].message.content.trim();
  const match = text.match(/\[[\s\S]*\]/);
  return JSON.parse(match[0]);
}

async function main() {
  console.log('=== VS Batch 3 Generator ===\n');

  const { data: existing } = await supabase.from('articles').select('slug');
  const existingSlugs = new Set(existing.map(a => a.slug));

  const toGenerate = ARTICLES.filter(a => !existingSlugs.has(a.slug));
  console.log(`To generate: ${toGenerate.length} / ${ARTICLES.length}\n`);

  let done = 0, failed = 0;

  for (const article of toGenerate) {
    try {
      process.stdout.write(`  [${done + failed + 1}/${toGenerate.length}] ${article.title.slice(0, 55)}... `);

      const body = await callOpenAI(article.title, article.topic);
      await new Promise(r => setTimeout(r, 700));
      const faqs = await generateFAQs(article.title, body);

      const now = new Date().toISOString();
      const { error } = await supabase.from('articles').insert({
        slug: article.slug,
        title: article.title,
        category: 'vs',
        body,
        faqs,
        status: 'published',
        created_at: now,
        updated_at: now,
      });

      if (error) throw new Error(error.message);
      console.log('✅');
      done++;
    } catch (err) {
      console.log(`❌ ${err.message}`);
      failed++;
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\n=== Done: ${done} generated, ${failed} failed ===`);
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
