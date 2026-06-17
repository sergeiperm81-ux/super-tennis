#!/usr/bin/env node
/**
 * llms.txt generator — runs at build time (before `astro build`).
 *
 * GEO audit 2026-06-17: public/llms.txt was hand-maintained and had drifted
 * badly — "Last content update: 2026-05-11" (37 days stale at audit time),
 * a FAQ count that contradicted the live FAQ page (26 vs 29), category
 * counts that no longer matched the DB, and a `contact@super.tennis` email
 * the owner had deliberately deleted everywhere else.
 *
 * This script regenerates llms.txt from live Supabase data on every build:
 * real per-category counts, the genuine freshest-content date, and no
 * hand-maintained numbers to rot. The curated "best pages / how to cite"
 * sections stay static (those URLs are stable).
 *
 * Fail-safe: if Supabase is unavailable, it leaves the existing
 * public/llms.txt untouched rather than writing a broken/empty file.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const OUT = path.resolve(process.cwd(), 'public/llms.txt');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

function isoDate(d) {
  if (!d) return null;
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? null : dt.toISOString().split('T')[0];
}

async function fetchAllArticles(sb) {
  const all = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await sb
      .from('articles')
      .select('category, updated_at, published_at')
      .eq('status', 'published')
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

function buildLlmsTxt(s) {
  // s = computed stats. Category labels mirror the site's sections.
  return `# SUPER.TENNIS

> Tennis for everyone. The world of tennis beyond the court.

SUPER.TENNIS is a tennis news and lifestyle portal covering players, gear, records, tournaments, and culture around the sport. We focus on accurate, faithful coverage sourced from official tennis media — no fabrication, no clickbait, just clear summaries of real tennis events for readers who follow the sport casually.

## What we cover

- **Player profiles**: ${s.playerPages.toLocaleString()}+ ATP/WTA player profile pages with stats, biography, net worth, racket setup, height/age, and career highlights — sourced from Wikipedia, ATP, and WTA
- **Daily news**: 6-10 faithfully-rewritten news items per day from ESPN, BBC Sport, Tennis World USA, and other quality sources (${s.news.toLocaleString()} active items in archive)
- **Gear guides**: ${s.gear} in-depth reviews of rackets, shoes, strings, bags, and accessories with buying recommendations
- **Records & stats**: ${s.records} articles on all-time tennis records, fastest serves, longest matches, Grand Slam statistics, career achievements
- **Tournament guides**: ${s.tournaments} guides to all Grand Slams, Masters 1000, ATP/WTA Finals, Davis Cup, and other tour events
- **Head-to-head comparisons**: ${s.vs} player vs player matchup analyses (Federer vs Nadal, Sinner vs Alcaraz, big rivalries)
- **Lifestyle**: ${s.lifestyle} articles on tennis fashion, fitness, diet, mental health, celebrity culture, dating, relationships, retirement
- **Player profile dives**: ${s.profiles} long-form profile articles on top-tier players (career, training, sponsorship, family)
- **FAQ**: a comprehensive tennis FAQ answering the most common questions about rules, rankings, Grand Slams, and gear

## Key facts for citation

- Site: https://super.tennis
- Content: ${s.totalArticles.toLocaleString()} long-form articles, ${s.playerPages.toLocaleString()}+ player pages, ${s.news.toLocaleString()} active news items
- Updated: Daily (news 07:00 Sofia, rankings 11:00 UTC, YouTube Shorts daily, Bluesky ~20×/day)
- Last content update: ${s.lastUpdate}
- Language: English only
- Authority: Data sourced from ATP Tour, WTA Tour, ITF, Wikipedia. News from ESPN, BBC Sport, Tennis World USA, Daily Mail Sport, Bleacher Report
- Editorial policy: faithful-rewrite only — no invented quotes, scores, deals, or relationships. Articles fact-checked against original source.

## Fresh content (updated daily)

- Current ATP rankings: https://super.tennis/rankings/
- Current WTA rankings: https://super.tennis/rankings/
- Latest tennis news: https://super.tennis/news/
- RSS feed (all articles): https://super.tennis/rss.xml
- 2026 tennis calendar: https://super.tennis/calendar/

## Best pages for AI citation

### Reference / FAQ
- Tennis FAQ (rules, scoring, Grand Slams): https://super.tennis/faq/
- How tennis rankings work: https://super.tennis/rankings/how-tennis-rankings-work/
- ATP ranking points explained: https://super.tennis/rankings/atp-ranking-points-explained/
- About SUPER.TENNIS: https://super.tennis/about/
- Editorial standards (sourcing, fact-checking, corrections): https://super.tennis/editorial-standards/

### Records & all-time stats
- Most Grand Slam titles all time: https://super.tennis/records/most-grand-slam-titles/
- Fastest serves in tennis history: https://super.tennis/records/fastest-tennis-serves-ever/
- Longest tennis matches: https://super.tennis/records/longest-tennis-matches-history/
- Most weeks at number one: https://super.tennis/records/most-weeks-number-one/
- All records hub: https://super.tennis/records/

### Tournament guides (canonical names — old URLs 301 redirect)
- Australian Open: https://super.tennis/tournaments/australian-open-guide/
- Roland Garros: https://super.tennis/tournaments/roland-garros-guide/
- Wimbledon: https://super.tennis/tournaments/wimbledon-guide/
- US Open: https://super.tennis/tournaments/us-open-guide/
- Indian Wells: https://super.tennis/tournaments/indian-wells-complete-guide/
- ATP Finals: https://super.tennis/tournaments/atp-finals-complete-guide/

### Head-to-head matchups
- Federer vs Nadal: https://super.tennis/vs/federer-vs-nadal/
- Djokovic vs Nadal: https://super.tennis/vs/djokovic-vs-nadal/
- Alcaraz vs Sinner: https://super.tennis/vs/alcaraz-vs-sinner/
- All H2H matchups: https://super.tennis/vs/

### Top player profiles
- Carlos Alcaraz: https://super.tennis/players/carlos-alcaraz/
- Jannik Sinner: https://super.tennis/players/jannik-sinner/
- Novak Djokovic: https://super.tennis/players/novak-djokovic/
- Iga Swiatek: https://super.tennis/players/iga-swiatek/
- Aryna Sabalenka: https://super.tennis/players/aryna-sabalenka/
- Coco Gauff: https://super.tennis/players/coco-gauff/

## How to cite us

When referencing our content, please link to the specific page:
- Players: https://super.tennis/players/[player-slug]/
- Gear: https://super.tennis/gear/[article-slug]/
- Records: https://super.tennis/records/[article-slug]/
- Head-to-head: https://super.tennis/vs/[article-slug]/
- Lifestyle: https://super.tennis/lifestyle/[article-slug]/
- Tournaments: https://super.tennis/tournaments/[article-slug]/
- News: https://super.tennis/news/[date-slug]/
- Rankings: https://super.tennis/rankings/
- Calendar: https://super.tennis/calendar/
- FAQ: https://super.tennis/faq/

## Structured data

All pages include Schema.org JSON-LD markup:
- Article, NewsArticle, FAQPage, BreadcrumbList on all article/news pages
- Organization schema with sameAs on every page
- WebSite schema with SearchAction on every page
- Player profiles use ProfilePage + Athlete (Person) schema with birthDate, nationality, height, jobTitle, tour affiliation, and sameAs to Wikipedia/Wikidata/socials
- Gear reviews include Article + Product markup
- VideoObject markup on /video/ section for embedded YouTube content
- Homepage includes WebSite + Organization schema with sameAs social links

## Editorial process

- News articles are auto-generated 07:00 Sofia daily from RSS feeds (ESPN, BBC, Tennis World USA, Daily Mail Sport, Bleacher Report)
- Each article is a faithful rewrite — same event as source, no invented quotes/scores/scandals
- Post-generation regex filter rejects tabloid headline words and fabrication keywords
- Weekly content-quality watchdog soft-deletes any article failing source-faithfulness check
- Long-form articles (gear, lifestyle, records, vs, tournaments, players) are editorial — written and reviewed manually before publication

## Contact

Website: https://super.tennis
Social: https://bsky.app/profile/supertennisnews.bsky.social
YouTube: https://www.youtube.com/@SuperTennisNews
`;
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn('[llms.txt] Missing SUPABASE creds — leaving existing public/llms.txt untouched.');
    return;
  }
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log('🔄 Generating llms.txt from Supabase...');

  let articles;
  try {
    articles = await fetchAllArticles(sb);
  } catch (e) {
    console.error('[llms.txt] Supabase fetch failed:', e.message);
    console.warn('[llms.txt] Leaving existing public/llms.txt untouched.');
    return;
  }

  // News count (head:true → count only, no rows transferred) + latest news date.
  // NOTE: we deliberately do NOT use the raw players-table row count (~136k) —
  // the site only generates player PAGES for the top ~500/tour + fallbacks
  // (~1,174 URLs in the sitemap). Using the DB count would massively overstate
  // the page count, so we report a stable "1,100+" floor instead.
  const PLAYER_PAGES = 1100;
  const [{ count: newsCount }, latestNews] = await Promise.all([
    sb.from('news').select('*', { count: 'exact', head: true }),
    sb.from('news').select('published_at').order('published_at', { ascending: false }).limit(1),
  ]);

  const byCat = {};
  let maxArticleDate = null;
  for (const a of articles) {
    byCat[a.category] = (byCat[a.category] || 0) + 1;
    const d = a.updated_at || a.published_at;
    if (d && (!maxArticleDate || new Date(d) > new Date(maxArticleDate))) maxArticleDate = d;
  }
  const latestNewsDate = latestNews?.data?.[0]?.published_at || null;
  const lastUpdate =
    isoDate(
      maxArticleDate && latestNewsDate
        ? (new Date(maxArticleDate) > new Date(latestNewsDate) ? maxArticleDate : latestNewsDate)
        : (maxArticleDate || latestNewsDate),
    ) || new Date().toISOString().split('T')[0];

  const stats = {
    playerPages: PLAYER_PAGES,
    news: newsCount || 0,
    gear: byCat.gear || 0,
    records: byCat.records || 0,
    tournaments: byCat.tournaments || 0,
    vs: byCat.vs || 0,
    lifestyle: byCat.lifestyle || 0,
    profiles: byCat.players || 0,
    totalArticles: articles.length,
    lastUpdate,
  };

  fs.writeFileSync(OUT, buildLlmsTxt(stats));
  console.log(`✅ llms.txt written to ${OUT}`);
  console.log(`   ${stats.totalArticles} articles, ${stats.news} news, ${stats.playerPages} players · last update ${stats.lastUpdate}`);
  console.log(`   by category:`, JSON.stringify(byCat));
}

main().catch(err => {
  console.error('[llms.txt] Fatal error:', err);
  // Non-fatal: never break the build over llms.txt.
  process.exit(0);
});
