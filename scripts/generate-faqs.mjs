#!/usr/bin/env node
/**
 * Generate FAQ structured data for articles.
 * Adds 4-6 Q&A pairs per article → enables FAQPage JSON-LD → Google featured snippets.
 *
 * Targets: all records + key lifestyle + tournament articles without faqs.
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

async function callOpenAI(title, body) {
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
          content: `You generate FAQ structured data for tennis articles. Given an article title and body, create 5 question-answer pairs that people commonly search for about this topic.

Rules:
- Questions should be specific and factual ("Who has the most Wimbledon titles?" not "What is Wimbledon?")
- Answers should be 1-3 sentences, factual, and complete on their own
- Questions should reflect real Google search queries
- Return ONLY valid JSON array: [{"question": "...", "answer": "..."}, ...]
- No markdown, no explanation, just the JSON array`
        },
        {
          role: 'user',
          content: `Article title: "${title}"\n\nArticle body (excerpt):\n${body.slice(0, 2000)}\n\nGenerate 5 FAQ pairs as JSON array.`
        }
      ],
      temperature: 0.3,
      max_tokens: 800,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const data = await res.json();
  const text = data.choices[0].message.content.trim();
  // Extract JSON array from response
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('No JSON array in response');
  return JSON.parse(match[0]);
}

async function main() {
  console.log('=== FAQ Generator for SUPER.TENNIS ===\n');

  // Get articles without faqs — prioritize records, then tournaments, then lifestyle
  const { data: articles, error } = await supabase
    .from('articles')
    .select('id, slug, title, category, body')
    .eq('status', 'published')
    .is('faqs', null)
    .in('category', ['records', 'tournaments', 'lifestyle'])
    .order('category')
    .limit(150);

  if (error) { console.error('Fetch error:', error.message); process.exit(1); }

  console.log(`Found ${articles.length} articles without FAQs\n`);

  let done = 0, failed = 0;

  for (const article of articles) {
    try {
      process.stdout.write(`  [${done + failed + 1}/${articles.length}] ${article.title.slice(0, 60)}... `);

      const faqs = await callOpenAI(article.title, article.body || '');

      if (!Array.isArray(faqs) || faqs.length === 0) throw new Error('Empty FAQ array');

      const { error: updateError } = await supabase
        .from('articles')
        .update({ faqs })
        .eq('id', article.id);

      if (updateError) throw new Error(updateError.message);

      console.log(`✅ (${faqs.length} FAQs)`);
      done++;
    } catch (err) {
      console.log(`❌ ${err.message}`);
      failed++;
    }

    await new Promise(r => setTimeout(r, 700));
  }

  console.log(`\n=== Done: ${done} updated, ${failed} failed ===`);
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
