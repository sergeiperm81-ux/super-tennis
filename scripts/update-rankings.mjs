#!/usr/bin/env node
/**
 * SUPER.TENNIS — Rankings Update (TennisLiveRanking.com)
 *
 * Fetches current ATP & WTA rankings from tennisliveranking.com
 * with real points, validates data, updates Supabase.
 * Sends Telegram alert on failure.
 *
 * Usage:
 *   node scripts/update-rankings.mjs [--dry-run] [--pages=4]
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
const PAGES_FLAG = process.argv.find(a => a.startsWith('--pages='));
const MAX_PAGES = PAGES_FLAG ? parseInt(PAGES_FLAG.split('=')[1]) : 4; // 4 pages = top 200

const BASE_URL = 'https://tennisliveranking.com';
const FETCH_DELAY_MS = 800; // polite delay between page fetches

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

// ─── Sleep utility ─────────────────────────────────────
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ─── Parse rankings from JSON-LD structured data ───────
function parseRankingsPage(html, tour) {
  const players = [];

  // TennisLiveRanking embeds JSON-LD ItemList with all 50 players per page
  // Much more reliable than parsing HTML tables
  const jsonLdBlocks = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
  if (!jsonLdBlocks) return players;

  for (const block of jsonLdBlocks) {
    const jsonStr = block.replace(/<script[^>]*>/, '').replace(/<\/script>/, '').trim();
    let parsed;
    try {
      // Handle array or single object
      const raw = JSON.parse(jsonStr);
      const items = Array.isArray(raw) ? raw : [raw];
      for (const item of items) {
        if (item['@type'] !== 'ItemList' || !item.itemListElement) continue;
        parsed = item;
        break;
      }
    } catch {
      continue;
    }
    if (!parsed) continue;

    for (const entry of parsed.itemListElement) {
      const person = entry.item;
      if (!person || !person.name) continue;

      // Extract rank and points from "award": "Ranking: #1, Points: 12050"
      const awardMatch = (person.award || '').match(/Ranking:\s*#(\d+),\s*Points:\s*(\d+)/);
      if (!awardMatch) continue;

      const rank = parseInt(awardMatch[1]);
      const points = parseInt(awardMatch[2]);

      // Extract slug and TLR ID from URL: /player/carlos-alcaraz/DbA5
      const urlMatch = (person.url || '').match(/\/player\/([^/]+)\/([^/?#]+)/);
      const tlrSlug = urlMatch ? urlMatch[1] : '';
      const tlrId = urlMatch ? urlMatch[2] : '';

      players.push({
        rank,
        name: person.name,
        country: '', // Not in JSON-LD, matched via DB
        points,
        tour,
        tlr_slug: tlrSlug,
        tlr_id: tlrId,
      });
    }
  }

  return players;
}

// ─── Fetch all ranking pages for a tour ────────────────
async function fetchTourRankings(tour) {
  const tourPath = tour === 'atp' ? 'atp-singles' : 'wta-singles';
  const allPlayers = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `${BASE_URL}/ranking/${tourPath}?pageNum=${page}`;
    console.log(`  📥 Fetching ${tour.toUpperCase()} page ${page}/${MAX_PAGES}: ${url}`);

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'SuperTennis/1.0 (https://super.tennis; data aggregation)',
          'Accept': 'text/html',
        },
      });

      if (!res.ok) {
        console.error(`  ❌ HTTP ${res.status} for page ${page}`);
        break;
      }

      const html = await res.text();
      const pagePlayers = parseRankingsPage(html, tour);
      console.log(`     → Parsed ${pagePlayers.length} players`);

      if (pagePlayers.length === 0) {
        console.log(`     → Empty page, stopping pagination`);
        break;
      }

      allPlayers.push(...pagePlayers);

      if (page < MAX_PAGES) await sleep(FETCH_DELAY_MS);
    } catch (err) {
      console.error(`  ❌ Fetch error page ${page}: ${err.message}`);
      break;
    }
  }

  return allPlayers;
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
  const tlrIdMap = new Map();

  for (const p of existingPlayers) {
    slugMap.set(p.slug, p);
    const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
    nameMap.set(fullName, p);
    nameMap.set(`${p.last_name} ${p.first_name}`.toLowerCase(), p);
    if (p.tlr_player_id) {
      tlrIdMap.set(p.tlr_player_id, p);
    }
  }

  const rankingRows = [];
  const tlrUpdates = []; // Update players with TLR IDs
  let matched = 0;
  let unmatched = 0;

  for (const r of parsedPlayers) {
    // Try matching: 1) TLR ID, 2) slug, 3) name fuzzy
    let player = tlrIdMap.get(r.tlr_id);

    if (!player) {
      const slug = nameToSlug(r.name);
      player = slugMap.get(slug);
    }

    if (!player) {
      player = nameMap.get(r.name.toLowerCase());
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
        points: r.points,
      });

      // Save TLR mapping if not yet stored
      if (!player.tlr_player_id && r.tlr_id) {
        tlrUpdates.push({
          player_id: player.player_id,
          tlr_player_id: r.tlr_id,
          tlr_slug: r.tlr_slug,
        });
      }

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
    console.log(`  Would update ${tlrUpdates.length} TLR player IDs`);
    if (rankingRows.length > 0) {
      console.log(`  Sample: #1 = ${rankingRows[0].points} pts (player_id: ${rankingRows[0].player_id})`);
    }
    return { inserted: 0, tlrUpdated: 0 };
  }

  if (rankingRows.length === 0) {
    const msg = '❌ No rankings to insert — all players unmatched';
    console.log(msg);
    await sendTelegramAlert(msg);
    return { inserted: 0, tlrUpdated: 0 };
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

  // Update TLR IDs on players
  let tlrUpdated = 0;
  if (tlrUpdates.length > 0) {
    console.log(`\n🔗 Saving ${tlrUpdates.length} TLR player ID mappings...`);
    for (const upd of tlrUpdates) {
      const { error } = await supabase
        .from('players')
        .update({ tlr_player_id: upd.tlr_player_id, tlr_slug: upd.tlr_slug })
        .eq('player_id', upd.player_id);

      if (error) {
        console.error(`  ⚠️ TLR update failed for ${upd.player_id}: ${error.message}`);
      } else {
        tlrUpdated++;
      }
    }
    console.log(`  ✅ Updated ${tlrUpdated} TLR mappings`);
  }

  return { inserted, tlrUpdated };
}

// ─── Main ──────────────────────────────────────────────
async function main() {
  console.log('🎾 SUPER.TENNIS Rankings Updater (TennisLiveRanking)\n');
  if (DRY_RUN) console.log('🏜️  DRY RUN MODE — no writes\n');

  const today = new Date().toISOString().split('T')[0];
  console.log(`📅 Ranking date: ${today}`);
  console.log(`📄 Max pages per tour: ${MAX_PAGES} (${MAX_PAGES * 50} players)\n`);

  // Fetch ATP
  console.log('── ATP Singles ──');
  const atpPlayers = await fetchTourRankings('atp');
  console.log(`  Total ATP: ${atpPlayers.length} players\n`);

  await sleep(1000);

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
  const { inserted, tlrUpdated } = await updateRankingsInDB(allParsed, today);

  // Summary
  const summary = [
    `\n🎉 Rankings update complete!`,
    `   Date: ${today}`,
    `   ATP: ${atpPlayers.length} parsed`,
    `   WTA: ${wtaPlayers.length} parsed`,
    `   DB: ${inserted} rankings inserted`,
    `   TLR mappings: ${tlrUpdated} saved`,
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
