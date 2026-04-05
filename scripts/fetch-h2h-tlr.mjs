#!/usr/bin/env node
/**
 * SUPER.TENNIS — H2H Data from TennisLiveRanking.com
 *
 * Fetches head-to-head data for player pairs used in vs-articles.
 * Stores in h2h_cache table for display on vs pages.
 *
 * Usage:
 *   node scripts/fetch-h2h-tlr.mjs [--dry-run]
 *
 * Requires env: SUPABASE_URL, SUPABASE_SERVICE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const TELEGRAM_BOT = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT = process.env.TELEGRAM_CHAT_ID;

const DRY_RUN = process.argv.includes('--dry-run');
const BASE_URL = 'https://tennisliveranking.com';
const FETCH_DELAY_MS = 1500;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function sendTelegramAlert(message) {
  if (!TELEGRAM_BOT || !TELEGRAM_CHAT) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT, text: `🎾 H2H Update\n\n${message}` }),
    });
  } catch { /* silent */ }
}

// ─── Parse H2H page ────────────────────────────────────
function parseH2HPage(html) {
  const data = {
    player1_wins: 0,
    player2_wins: 0,
    surface_hard_p1: 0, surface_hard_p2: 0,
    surface_clay_p1: 0, surface_clay_p2: 0,
    surface_grass_p1: 0, surface_grass_p2: 0,
    last_match_date: null,
    last_match_score: null,
    last_match_tournament: null,
  };

  // Overall H2H score — look for patterns like "15 - 12" or "W 15 / L 12"
  const h2hMatch = html.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (h2hMatch) {
    data.player1_wins = parseInt(h2hMatch[1]);
    data.player2_wins = parseInt(h2hMatch[2]);
  }

  // Surface breakdown — look for Hard/Clay/Grass with scores
  const surfacePatterns = [
    { key: 'hard', re: /Hard[^<]*?(\d+)\s*[-–]\s*(\d+)/i },
    { key: 'clay', re: /Clay[^<]*?(\d+)\s*[-–]\s*(\d+)/i },
    { key: 'grass', re: /Grass[^<]*?(\d+)\s*[-–]\s*(\d+)/i },
  ];

  for (const { key, re } of surfacePatterns) {
    const m = html.match(re);
    if (m) {
      data[`surface_${key}_p1`] = parseInt(m[1]);
      data[`surface_${key}_p2`] = parseInt(m[2]);
    }
  }

  // Last match — look for most recent match entry
  // Typically in a table with date, tournament, score
  const matchRows = html.match(/<tr[^>]*>[\s\S]*?(\d{4}[-/]\d{2}[-/]\d{2})[\s\S]*?<\/tr>/g);
  if (matchRows && matchRows.length > 0) {
    const lastRow = matchRows[0]; // First row is most recent
    const dateMatch = lastRow.match(/(\d{4})[-/](\d{2})[-/](\d{2})/);
    if (dateMatch) {
      data.last_match_date = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
    }
    // Try to extract score
    const scoreMatch = lastRow.match(/(\d-\d(?:\s+\d-\d)*)/);
    if (scoreMatch) data.last_match_score = scoreMatch[1];

    // Try to extract tournament name
    const tourneyMatch = lastRow.match(/<a[^>]*>([^<]+)<\/a>/);
    if (tourneyMatch) data.last_match_tournament = tourneyMatch[1].trim();
  }

  return data;
}

// ─── Main ──────────────────────────────────────────────
async function main() {
  console.log('🎾 SUPER.TENNIS H2H Fetcher (TennisLiveRanking)\n');
  if (DRY_RUN) console.log('🏜️  DRY RUN MODE\n');

  // Get all vs-articles to find player pairs
  const { data: vsArticles, error: artErr } = await supabase
    .from('articles')
    .select('slug')
    .eq('category', 'vs')
    .eq('status', 'published');

  if (artErr) {
    console.error('❌ DB error:', artErr.message);
    process.exit(1);
  }

  console.log(`📋 Found ${vsArticles.length} vs-articles\n`);

  // Get all players with TLR IDs
  const { data: allPlayers } = await supabase
    .from('players')
    .select('player_id, slug, tlr_player_id, tlr_slug')
    .not('tlr_player_id', 'is', null);

  const slugToPlayer = new Map();
  for (const p of (allPlayers || [])) {
    slugToPlayer.set(p.slug, p);
  }

  let fetched = 0;
  let failed = 0;

  for (const art of vsArticles) {
    // Parse slug: "player1-vs-player2" or "player1-vs-player2-grand-slams" etc.
    const vsMatch = art.slug.match(/^(.+?)-vs-(.+?)(?:-grand-slams|-rivalry|-h2h)?$/);
    if (!vsMatch) {
      console.log(`  ⏭️ Can't parse pair from: ${art.slug}`);
      continue;
    }

    const [, slug1, slug2] = vsMatch;
    const p1 = slugToPlayer.get(slug1);
    const p2 = slugToPlayer.get(slug2);

    if (!p1 || !p2) {
      console.log(`  ⏭️ Missing TLR data: ${slug1} (${p1 ? '✓' : '✗'}) vs ${slug2} (${p2 ? '✓' : '✗'})`);
      continue;
    }

    const url = `${BASE_URL}/h2h/${p1.tlr_slug}-vs-${p2.tlr_slug}/${p1.tlr_player_id}_${p2.tlr_player_id}`;
    console.log(`  📥 ${slug1} vs ${slug2}: ${url}`);

    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'SuperTennis/1.0 (https://super.tennis)', 'Accept': 'text/html' },
      });

      if (!res.ok) {
        console.log(`     ❌ HTTP ${res.status}`);
        failed++;
        await sleep(FETCH_DELAY_MS);
        continue;
      }

      const html = await res.text();
      const h2h = parseH2HPage(html);
      h2h.source_url = url;

      if (h2h.player1_wins === 0 && h2h.player2_wins === 0) {
        console.log(`     ⚠️ No H2H data found`);
        failed++;
        await sleep(FETCH_DELAY_MS);
        continue;
      }

      console.log(`     → ${h2h.player1_wins}-${h2h.player2_wins} (H: ${h2h.surface_hard_p1}-${h2h.surface_hard_p2}, C: ${h2h.surface_clay_p1}-${h2h.surface_clay_p2}, G: ${h2h.surface_grass_p1}-${h2h.surface_grass_p2})`);

      if (!DRY_RUN) {
        // Ensure player1_id < player2_id for consistent ordering
        const [pid1, pid2] = [p1.player_id, p2.player_id].sort();
        const isSwapped = pid1 !== p1.player_id;

        const row = {
          player1_id: pid1,
          player2_id: pid2,
          player1_wins: isSwapped ? h2h.player2_wins : h2h.player1_wins,
          player2_wins: isSwapped ? h2h.player1_wins : h2h.player2_wins,
          surface_hard_p1: isSwapped ? h2h.surface_hard_p2 : h2h.surface_hard_p1,
          surface_hard_p2: isSwapped ? h2h.surface_hard_p1 : h2h.surface_hard_p2,
          surface_clay_p1: isSwapped ? h2h.surface_clay_p2 : h2h.surface_clay_p1,
          surface_clay_p2: isSwapped ? h2h.surface_clay_p1 : h2h.surface_clay_p2,
          surface_grass_p1: isSwapped ? h2h.surface_grass_p2 : h2h.surface_grass_p1,
          surface_grass_p2: isSwapped ? h2h.surface_grass_p1 : h2h.surface_grass_p2,
          last_match_date: h2h.last_match_date,
          last_match_score: h2h.last_match_score,
          last_match_tournament: h2h.last_match_tournament,
          source_url: h2h.source_url,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('h2h_cache')
          .upsert(row, { onConflict: 'player1_id,player2_id' });

        if (error) {
          console.log(`     ❌ DB error: ${error.message}`);
          failed++;
        } else {
          fetched++;
        }
      } else {
        fetched++;
      }
    } catch (err) {
      console.log(`     ❌ ${err.message}`);
      failed++;
    }

    await sleep(FETCH_DELAY_MS);
  }

  console.log(`\n🎉 H2H fetch complete: ${fetched} saved, ${failed} failed`);

  if (fetched > 0 && !DRY_RUN) {
    await sendTelegramAlert(`✅ H2H updated: ${fetched} pairs (${failed} failed)`);
  }
}

main().catch(async (err) => {
  console.error('❌ Fatal:', err.message);
  await sendTelegramAlert(`❌ H2H fetch crashed: ${err.message}`);
  process.exit(1);
});
