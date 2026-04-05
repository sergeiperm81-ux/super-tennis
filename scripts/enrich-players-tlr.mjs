#!/usr/bin/env node
/**
 * SUPER.TENNIS — Player Enrichment from TennisLiveRanking.com
 *
 * Fetches player profiles: bio, coach, socials, career stats,
 * YTD stats, serving stats, return stats.
 * Never overwrites good data with empty/zero values.
 *
 * Usage:
 *   node scripts/enrich-players-tlr.mjs [--dry-run] [--limit=50] [--force]
 *
 * Requires env: SUPABASE_URL, SUPABASE_SERVICE_KEY
 * Optional env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const TELEGRAM_BOT = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT = process.env.TELEGRAM_CHAT_ID;

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');
const LIMIT_FLAG = process.argv.find(a => a.startsWith('--limit='));
const LIMIT = LIMIT_FLAG ? parseInt(LIMIT_FLAG.split('=')[1]) : 200;

const BASE_URL = 'https://tennisliveranking.com';
const FETCH_DELAY_MS = 1200; // polite scraping

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Utilities ─────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function sendTelegramAlert(message) {
  if (!TELEGRAM_BOT || !TELEGRAM_CHAT) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT,
        text: `🎾 Player Enrichment\n\n${message}`,
      }),
    });
  } catch { /* silent */ }
}

// ─── Parse player profile HTML ─────────────────────────
function parsePlayerProfile(html) {
  const data = {};

  // --- Bio fields via <strong>Label</strong> value pattern ---
  const bioField = (label) => {
    const re = new RegExp(`<strong[^>]*>${label}<\\/strong>\\s*([^<]+)`, 'i');
    const m = html.match(re);
    return m ? m[1].trim() : null;
  };

  data.birthplace = bioField('Birthplace');
  data.coach = bioField('Coach');

  const plays = bioField('Plays');
  if (plays) {
    data.hand = plays.includes('Left') ? 'L' : plays.includes('Right') ? 'R' : null;
    data.backhand = plays.includes('Two') ? 'two-handed' : plays.includes('One') ? 'one-handed' : null;
  }

  const turnedPro = bioField('Turned pro');
  data.turned_pro = turnedPro ? parseInt(turnedPro) || null : null;

  // Height/weight from schema.org JSON-LD
  const heightMatch = html.match(/"height"\s*:\s*"(\d+)\s*cm"/);
  if (heightMatch) data.height_cm = parseInt(heightMatch[1]);

  const weightMatch = html.match(/"weight"\s*:\s*"(\d+)\s*kg"/);
  if (weightMatch) data.weight_kg = parseInt(weightMatch[1]);

  const dobMatch = html.match(/"birthDate"\s*:\s*"(\d{4}-\d{2}-\d{2})"/);
  if (dobMatch) data.birth_date = dobMatch[1];

  // --- Social links ---
  const socialPatterns = [
    { key: 'social_instagram', re: /href="(https?:\/\/(?:www\.)?instagram\.com\/[^"]+)"/i },
    { key: 'social_twitter', re: /href="(https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^"]+)"/i },
    { key: 'social_facebook', re: /href="(https?:\/\/(?:www\.)?facebook\.com\/[^"]+)"/i },
  ];
  for (const { key, re } of socialPatterns) {
    const m = html.match(re);
    if (m) data[key] = m[1];
  }

  // --- Career stats ---
  const careerSection = html.match(/Career[\s\S]*?(<div[\s\S]*?)<(?:section|h[234])/i);
  if (careerSection) {
    const sec = careerSection[1];
    const titlesMatch = sec.match(/<strong>\s*(\d+)\s*<\/strong>\s*Titles/i)
      || sec.match(/Titles[\s\S]*?<strong>\s*(\d+)/i);
    if (titlesMatch) data.career_titles = parseInt(titlesMatch[1]);

    const wlMatch = sec.match(/<strong>\s*(\d+)\s*W\s*\/\s*(\d+)\s*L/i)
      || sec.match(/(\d+)\s*W\s*\/\s*(\d+)\s*L/i);
    if (wlMatch) {
      data.career_win = parseInt(wlMatch[1]);
      data.career_loss = parseInt(wlMatch[2]);
    }

    const prizeMatch = sec.match(/\$\s*([\d,]+)/);
    if (prizeMatch) data.career_prize_usd = parseInt(prizeMatch[1].replace(/,/g, ''));

    const bestRankMatch = sec.match(/<strong>\s*(\d+)\s*<\/strong>\s*Best Rank/i)
      || sec.match(/Best Rank[\s\S]*?<strong>\s*(\d+)/i);
    if (bestRankMatch) data.best_ranking = parseInt(bestRankMatch[1]);
  }

  // --- YTD stats ---
  const ytdSection = html.match(/YTD\s+\d{4}[\s\S]*?(<div[\s\S]*?)<(?:section|h[234])/i);
  if (ytdSection) {
    const sec = ytdSection[1];
    const titlesMatch = sec.match(/<strong>\s*(\d+)\s*<\/strong>\s*Titles/i)
      || sec.match(/Titles[\s\S]*?<strong>\s*(\d+)/i);
    if (titlesMatch) data.ytd_titles = parseInt(titlesMatch[1]);

    const wlMatch = sec.match(/(\d+)\s*W\s*\/\s*(\d+)\s*L/i);
    if (wlMatch) {
      data.ytd_win = parseInt(wlMatch[1]);
      data.ytd_loss = parseInt(wlMatch[2]);
    }

    const prizeMatch = sec.match(/\$\s*([\d,]+)/);
    if (prizeMatch) data.ytd_prize_usd = parseInt(prizeMatch[1].replace(/,/g, ''));
  }

  // --- Serving stats ---
  // HTML format: <div>Label</div>\n<strong>Value</strong>
  const serveSection = html.match(/Serving Stats<\/h3>([\s\S]*?)(?:Return Stats|<\/section|$)/i);
  if (serveSection) {
    const sec = serveSection[1];
    const serveStat = (label) => {
      const re = new RegExp(`<div>${label}<\\/div>[\\s\\S]*?<strong[^>]*>\\s*([\\d,.]+)`, 'i');
      const m = sec.match(re);
      return m ? parseFloat(m[1].replace(/,/g, '')) : null;
    };

    data.serve_aces = serveStat('Aces') != null ? Math.round(serveStat('Aces')) : null;
    data.serve_double_faults = serveStat('Double Faults') != null ? Math.round(serveStat('Double Faults')) : null;
    data.serve_1st_pct = serveStat('1st Serve %');
    data.serve_1st_won_pct = serveStat('1st Serve Won');
    data.serve_2nd_won_pct = serveStat('2nd Serve Won');
    data.serve_bp_saved_pct = serveStat('Break Points Saved');
    data.serve_points_won_pct = serveStat('Service Points Won');
    data.serve_hold_pct = serveStat('Service Games Won');
  }

  // --- Return stats ---
  const returnSection = html.match(/Return Stats<\/h3>([\s\S]*?)(?:<\/section|<h[23]|$)/i);
  if (returnSection) {
    const sec = returnSection[1];
    const retStat = (label) => {
      const re = new RegExp(`<div>${label}<\\/div>[\\s\\S]*?<strong[^>]*>\\s*([\\d,.]+)`, 'i');
      const m = sec.match(re);
      return m ? parseFloat(m[1].replace(/,/g, '')) : null;
    };

    data.return_points_won_pct = retStat('Return Points Won');
    data.return_1st_won_pct = retStat('1st Return Points Won');
    data.return_2nd_won_pct = retStat('2nd Return Points Won');
    data.return_bp_converted_pct = retStat('Break Points Converted');
    data.return_games_won_pct = retStat('Return Games Won');
  }

  return data;
}

// ─── Safety: never overwrite good data with null/zero ──
function safeMerge(existing, parsed) {
  const update = {};
  let changes = 0;

  for (const [key, newVal] of Object.entries(parsed)) {
    if (newVal === null || newVal === undefined || newVal === '') continue;
    if (typeof newVal === 'number' && isNaN(newVal)) continue;

    // Don't overwrite existing non-null values with zeros
    if (typeof newVal === 'number' && newVal === 0 && existing[key] && existing[key] > 0) continue;

    // Only update if value actually changed
    if (existing[key] !== newVal) {
      update[key] = newVal;
      changes++;
    }
  }

  if (changes > 0) {
    update.stats_updated_at = new Date().toISOString();
  }

  return { update, changes };
}

// ─── Main ──────────────────────────────────────────────
async function main() {
  console.log('🎾 SUPER.TENNIS Player Enrichment (TennisLiveRanking)\n');
  if (DRY_RUN) console.log('🏜️  DRY RUN MODE\n');

  // Get players that have TLR IDs (set by rankings update)
  let query = supabase
    .from('players')
    .select('player_id, first_name, last_name, slug, tour, tlr_player_id, tlr_slug, height_cm, weight_kg, birth_date, birthplace, coach, backhand, hand, turned_pro, career_titles, career_win, career_loss, career_prize_usd, best_ranking, ytd_titles, ytd_win, ytd_loss, ytd_prize_usd, social_instagram, social_twitter, social_facebook, serve_aces, serve_1st_pct, return_points_won_pct, stats_updated_at')
    .not('tlr_player_id', 'is', null)
    .order('career_titles', { ascending: false, nullsFirst: false })
    .limit(LIMIT);

  // Skip recently enriched unless --force
  if (!FORCE) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    query = query.or(`stats_updated_at.is.null,stats_updated_at.lt.${oneDayAgo}`);
  }

  const { data: players, error } = await query;

  if (error) {
    console.error('❌ DB error:', error.message);
    process.exit(1);
  }

  console.log(`📋 Found ${players.length} players to enrich\n`);

  if (players.length === 0) {
    console.log('✅ All players up to date');
    return;
  }

  let enriched = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    const url = `${BASE_URL}/player/${p.tlr_slug}/${p.tlr_player_id}`;
    const label = `[${i + 1}/${players.length}] ${p.first_name} ${p.last_name}`;

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'SuperTennis/1.0 (https://super.tennis)',
          'Accept': 'text/html',
        },
      });

      if (!res.ok) {
        console.log(`  ⚠️ ${label}: HTTP ${res.status}`);
        failed++;
        await sleep(FETCH_DELAY_MS);
        continue;
      }

      const html = await res.text();
      const parsed = parsePlayerProfile(html);
      const { update, changes } = safeMerge(p, parsed);

      if (changes === 0) {
        console.log(`  ⏭️ ${label}: no new data`);
        skipped++;
      } else if (DRY_RUN) {
        console.log(`  📝 ${label}: ${changes} fields would update`);
        const keys = Object.keys(update).filter(k => k !== 'stats_updated_at');
        console.log(`     Fields: ${keys.join(', ')}`);
        enriched++;
      } else {
        const { error: updateErr } = await supabase
          .from('players')
          .update(update)
          .eq('player_id', p.player_id);

        if (updateErr) {
          console.log(`  ❌ ${label}: ${updateErr.message}`);
          failed++;
        } else {
          const keys = Object.keys(update).filter(k => k !== 'stats_updated_at');
          console.log(`  ✅ ${label}: ${changes} fields updated (${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''})`);
          enriched++;
        }
      }
    } catch (err) {
      console.log(`  ❌ ${label}: ${err.message}`);
      failed++;
    }

    if (i < players.length - 1) await sleep(FETCH_DELAY_MS);
  }

  const summary = `\n🎉 Enrichment complete!\n  ✅ Enriched: ${enriched}\n  ⏭️ Skipped: ${skipped}\n  ❌ Failed: ${failed}`;
  console.log(summary);

  if (failed > players.length * 0.3) {
    await sendTelegramAlert(`⚠️ High failure rate: ${failed}/${players.length} players failed enrichment`);
  } else if (enriched > 0 && !DRY_RUN) {
    await sendTelegramAlert(`✅ Enriched ${enriched} players (${failed} failed, ${skipped} skipped)`);
  }
}

main().catch(async (err) => {
  console.error('❌ Fatal:', err.message);
  await sendTelegramAlert(`❌ Enrichment crashed: ${err.message}`);
  process.exit(1);
});
