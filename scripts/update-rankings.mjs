#!/usr/bin/env node
/**
 * SUPER.TENNIS — Rankings Update
 *
 * Sources (as of 2026-04):
 *   ATP: atptour.com official HTML — 200 players (2 pages × 100)
 *   WTA: ESPN tennis rankings HTML — 150 players (1 page)
 *
 * tennisliveranking.com was repurposed (no longer tennis),
 * Sofascore blocks server-side requests (403),
 * WTA official site only SSR's top 50.
 *
 * Usage:
 *   node scripts/update-rankings.mjs [--dry-run]
 *
 * Requires env: SUPABASE_URL, SUPABASE_SERVICE_KEY
 * Optional env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (for alerts)
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

// ─── Config ────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const TELEGRAM_BOT = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT = process.env.TELEGRAM_CHAT_ID;

const DRY_RUN = process.argv.includes('--dry-run');

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Telegram Alert ────────────────────────────────────
async function sendTelegramAlert(message) {
  if (!TELEGRAM_BOT || !TELEGRAM_CHAT) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT,
        text: `🎾 Rankings Update Alert\n\n${message}`,
        parse_mode: 'HTML',
      }),
    });
  } catch (err) {
    console.error('  ⚠️ Telegram alert failed:', err.message);
  }
}

// ─── Parse ESPN tennis rankings HTML ──────────────────
function parseESPN(html, tour) {
  const tb = html.match(/<tbody[\s\S]*?<\/tbody>/);
  if (!tb) return [];
  const rows = tb[0].match(/<tr[\s\S]*?<\/tr>/g) || [];
  return rows.map(row => {
    const rank = row.match(/class="rank_column">(\d+)</)?.[1];
    const name = row.match(/class="AnchorLink"[^>]*>([^<]+)<\/a>/)?.[1];
    const slug = row.match(/\/tennis\/player\/_\/id\/\d+\/([^"]+)"/)?.[1];
    // Points: first <span class=""> in the row that contains a number
    const ptSpans = row.match(/<span class="">([0-9,]+)<\/span>/g) || [];
    const pts = ptSpans[0] ? +ptSpans[0].replace(/<[^>]*>/g, '').replace(/,/g, '') : null;
    return rank && name ? { rank: +rank, name: name.trim(), slug, points: pts, tour } : null;
  }).filter(Boolean);
}

// ─── Fetch rankings from ESPN (ATP or WTA, top 150) ────
async function fetchTourRankings(tour) {
  const espnType = tour === 'atp' ? 'atp' : 'wta';
  const url = `https://www.espn.com/tennis/rankings/_/type/${espnType}`;
  console.log(`  📥 Fetching ${tour.toUpperCase()} from ESPN: ${url}`);

  const res = await fetch(url, {
    headers: { 'User-Agent': BROWSER_UA, 'Accept': 'text/html' },
  });

  if (!res.ok) throw new Error(`ESPN ${tour.toUpperCase()} returned HTTP ${res.status}`);
  const html = await res.text();
  const players = parseESPN(html, tour);
  console.log(`     → Parsed ${players.length} players`);
  return players;
}

// ─── Slug from name ────────────────────────────────────
function nameToSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

// ─── Validate parsed data (safety) ─────────────────────
function validateRankings(players, tour) {
  const errors = [];

  if (players.length < 30) {
    errors.push(`Only ${players.length} ${tour.toUpperCase()} players parsed (expected 50+)`);
  }

  // Top 10 should all have > 1000 points
  const top10 = players.filter(p => p.rank <= 10);
  const zeroPointsTop10 = top10.filter(p => p.points === 0 || isNaN(p.points));
  if (zeroPointsTop10.length > 0) {
    errors.push(`${zeroPointsTop10.length} top-10 ${tour.toUpperCase()} players have 0 points`);
  }

  // #1 should have > 5000 points
  const num1 = players.find(p => p.rank === 1);
  if (num1 && num1.points < 5000) {
    errors.push(`#1 ${tour.toUpperCase()} ${num1.name} has only ${num1.points} points`);
  }

  // Points should be descending (with some tolerance)
  for (let i = 1; i < Math.min(players.length, 20); i++) {
    if (players[i].points > players[i - 1].points + 100) {
      errors.push(`Points not descending: #${players[i - 1].rank} (${players[i - 1].points}) < #${players[i].rank} (${players[i].points})`);
      break;
    }
  }

  return errors;
}

// ─── Fetch existing players for matching ───────────────
async function fetchExistingPlayers() {
  const allPlayers = [];
  let offset = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('players')
      .select('player_id, first_name, last_name, slug, tour, tlr_player_id')
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error('❌ DB fetch error:', error.message);
      break;
    }
    if (!data || data.length === 0) break;
    allPlayers.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return allPlayers;
}

// ─── Match and upsert rankings ─────────────────────────
async function updateRankingsInDB(parsedPlayers, rankingDate) {
  console.log('\n📋 Fetching existing players from Supabase...');
  const existingPlayers = await fetchExistingPlayers();
  console.log(`  Found ${existingPlayers.length} players in DB`);

  // Build lookup maps
  const slugMap = new Map();
  const nameMap = new Map();

  for (const p of existingPlayers) {
    slugMap.set(p.slug, p);
    const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
    nameMap.set(fullName, p);
    nameMap.set(`${p.last_name} ${p.first_name}`.toLowerCase(), p);
  }

  const rankingRows = [];
  let matched = 0;
  let unmatched = 0;

  for (const r of parsedPlayers) {
    // Try matching: 1) source slug (ATP Tour / ESPN), 2) name slug, 3) full name, 4) fuzzy
    let player = (r.slug ? slugMap.get(r.slug) : undefined);
    if (!player) {
      const slug = nameToSlug(r.name);
      player = slugMap.get(slug) || nameMap.get(r.name.toLowerCase());
    }

    if (!player) {
      // Fuzzy: first + last name parts
      const nameParts = r.name.split(' ');
      const lastName = nameParts[nameParts.length - 1].toLowerCase();
      const firstName = nameParts[0].toLowerCase();
      for (const [key, p] of nameMap) {
        if (key.includes(lastName) && key.includes(firstName)) {
          player = p;
          break;
        }
      }
    }

    if (player) {
      rankingRows.push({
        ranking_date: rankingDate,
        player_id: player.player_id,
        tour: r.tour,
        ranking: r.rank,
        points: r.points ?? 0,
      });
      matched++;
    } else {
      if (r.rank <= 30) {
        console.log(`  ⚠️  No match: #${r.rank} ${r.name} (${r.tour.toUpperCase()}) → slug: ${nameToSlug(r.name)}`);
      }
      unmatched++;
    }
  }

  console.log(`\n✅ Matched: ${matched}, ⚠️ Unmatched: ${unmatched}`);

  if (DRY_RUN) {
    console.log('\n🏜️  DRY RUN — no database writes');
    console.log(`  Would insert ${rankingRows.length} rankings`);
    if (rankingRows.length > 0) {
      console.log(`  Sample: #1 = ${rankingRows[0].points} pts (player_id: ${rankingRows[0].player_id})`);
    }
    return { inserted: 0 };
  }

  if (rankingRows.length === 0) {
    const msg = '❌ No rankings to insert — all players unmatched';
    console.log(msg);
    await sendTelegramAlert(msg);
    return { inserted: 0 };
  }

  // Insert rankings in batches
  console.log(`\n📊 Inserting ${rankingRows.length} rankings for ${rankingDate}...`);
  const BATCH = 100;
  let inserted = 0;

  for (let i = 0; i < rankingRows.length; i += BATCH) {
    const batch = rankingRows.slice(i, i + BATCH);
    const { error } = await supabase
      .from('rankings')
      .upsert(batch, { onConflict: 'ranking_date,player_id,tour' });

    if (error) {
      console.error(`  ❌ Batch error: ${error.message}`);
    } else {
      inserted += batch.length;
    }
  }

  console.log(`  ✅ Inserted ${inserted} ranking rows`);
  return { inserted };
}

// ─── Main ──────────────────────────────────────────────
async function main() {
  console.log('🎾 SUPER.TENNIS Rankings Updater (ATP Tour + ESPN)\n');
  if (DRY_RUN) console.log('🏜️  DRY RUN MODE — no writes\n');

  const today = new Date().toISOString().split('T')[0];
  console.log(`📅 Ranking date: ${today}\n`);

  // Fetch ATP
  console.log('── ATP Singles ──');
  const atpPlayers = await fetchTourRankings('atp');
  console.log(`  Total ATP: ${atpPlayers.length} players\n`);

  // Fetch WTA
  console.log('── WTA Singles ──');
  const wtaPlayers = await fetchTourRankings('wta');
  console.log(`  Total WTA: ${wtaPlayers.length} players\n`);

  // Validate
  console.log('── Validation ──');
  const atpErrors = validateRankings(atpPlayers, 'atp');
  const wtaErrors = validateRankings(wtaPlayers, 'wta');
  const allErrors = [...atpErrors, ...wtaErrors];

  if (allErrors.length > 0) {
    console.log('❌ Validation FAILED:');
    for (const err of allErrors) {
      console.log(`   • ${err}`);
    }
    const alertMsg = `❌ Rankings validation failed:\n${allErrors.map(e => `• ${e}`).join('\n')}`;
    await sendTelegramAlert(alertMsg);

    // If critical errors (no data at all), abort
    if (atpPlayers.length === 0 && wtaPlayers.length === 0) {
      console.log('\n🛑 ABORT: No data parsed from either tour');
      process.exit(1);
    }
    console.log('\n⚠️ Proceeding with partial data...');
  } else {
    console.log('✅ All validation checks passed');
    if (atpPlayers.length > 0) {
      console.log(`   ATP #1: ${atpPlayers[0].name} — ${atpPlayers[0].points} pts`);
    }
    if (wtaPlayers.length > 0) {
      console.log(`   WTA #1: ${wtaPlayers[0].name} — ${wtaPlayers[0].points} pts`);
    }
  }

  // Update DB
  const allParsed = [...atpPlayers, ...wtaPlayers];
  const { inserted } = await updateRankingsInDB(allParsed, today);

  // Summary
  const summary = [
    `\n🎉 Rankings update complete!`,
    `   Date: ${today}`,
    `   ATP: ${atpPlayers.length} parsed`,
    `   WTA: ${wtaPlayers.length} parsed`,
    `   DB: ${inserted} rankings inserted`,
  ].join('\n');
  console.log(summary);

  if (inserted > 0 && !DRY_RUN) {
    await sendTelegramAlert(`✅ Rankings updated: ${inserted} rows\nATP #1: ${atpPlayers[0]?.name} (${atpPlayers[0]?.points})\nWTA #1: ${wtaPlayers[0]?.name} (${wtaPlayers[0]?.points})`);
  }
}

main().catch(async (err) => {
  console.error('❌ Fatal error:', err.message);
  await sendTelegramAlert(`❌ Rankings script crashed: ${err.message}`);
  process.exit(1);
});
