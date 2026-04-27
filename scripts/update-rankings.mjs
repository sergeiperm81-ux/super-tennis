#!/usr/bin/env node
/**
 * SUPER.TENNIS — Rankings Update
 *
 * Sources (as of 2026-04):
 *   ATP: atptour.com official HTML — 200 players (2 pages × ~100)
 *   WTA: wtatennis.com official HTML — 50 players (SSR limit)
 *
 * Previous ESPN source failed: ESPN uses JS rendering so tbody is empty
 * server-side. atptour.com + wtatennis.com both SSR their ranking tables.
 *
 * Usage:
 *   node scripts/update-rankings.mjs [--dry-run]
 *
 * Requires env: SUPABASE_URL, SUPABASE_SERVICE_KEY
 * Optional env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (for alerts)
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { execSync } from 'child_process';

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

// ─── Fetch helper ──────────────────────────────────────
// atptour.com is behind Cloudflare with JA3 TLS fingerprinting that
// blocks Node.js fetch (returns 403) but allows curl (different TLS fingerprint).
// We use curl for ATP pages and regular fetch for WTA (no such restriction).
function fetchHTMLviaCurl(url) {
  try {
    return execSync(
      `curl -s "${url}" -H "User-Agent: ${BROWSER_UA}" -H "Accept: */*" --max-time 20 --compressed`,
      { encoding: 'utf-8', maxBuffer: 8 * 1024 * 1024 }
    );
  } catch (err) {
    throw new Error(`curl failed for ${url}: ${err.message}`);
  }
}

async function fetchHTML(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': BROWSER_UA,
      'Accept': '*/*',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.text();
}

// ─── Parse ATP Tour HTML ────────────────────────────────
// Source: https://www.atptour.com/en/rankings/singles[?rankRange=101-200]
// Structure: <td class="rank bold heavy...">1</td>
//            <a href="/en/players/jannik-sinner/s0ag/overview"><span class="lastName">J. Sinner</span></a>
//            <td class="points center bold..."><a ...>13,350</a></td>
function parseATPPage(html, tour = 'atp') {
  const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/);
  if (!tbodyMatch) return [];

  const rows = tbodyMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];

  return rows.map(row => {
    const rank = row.match(/class="rank bold heavy[^"]*"[^>]*>(\d+)</)?.[1];
    if (!rank) return null;

    // Slug from player profile URL
    const slugMatch = row.match(/href="\/en\/players\/([^/]+)\//);
    const slug = slugMatch?.[1] || null;

    // Abbreviated name (e.g. "J. Sinner")
    const nameMatch = row.match(/class="lastName">([^<]+)</);
    const name = nameMatch ? nameMatch[1].trim() : null;

    // Points — inside points td, inside an anchor: <td ...><a ...>\n  13,350\n</a></td>
    // Must allow \s* between ">" and digits since content has leading whitespace
    const ptsMatch = row.match(/class="points center bold[^"]*"[^>]*>\s*<a[^>]*>\s*([\d,]+)/);
    const points = ptsMatch ? parseInt(ptsMatch[1].replace(/,/g, ''), 10) : null;

    if (!rank || !name) return null;

    return { rank: parseInt(rank, 10), name, slug, points: points ?? 0, tour };
  }).filter(Boolean);
}

// ─── Fetch ATP rankings (2 pages = ~200 players) ───────
async function fetchATPRankings() {
  const pages = [
    'https://www.atptour.com/en/rankings/singles',
    'https://www.atptour.com/en/rankings/singles?rankRange=101-200',
  ];

  const all = [];
  for (const url of pages) {
    console.log(`  📥 Fetching ATP: ${url}`);
    try {
      const html = fetchHTMLviaCurl(url);
      const players = parseATPPage(html, 'atp');
      console.log(`     → Parsed ${players.length} players`);
      all.push(...players);
      // Small delay between requests
      await new Promise(r => setTimeout(r, 1500));
    } catch (err) {
      console.error(`  ❌ Error fetching ${url}: ${err.message}`);
    }
  }

  // Deduplicate by rank (in case of overlap between pages)
  const seen = new Set();
  return all.filter(p => {
    if (seen.has(p.rank)) return false;
    seen.add(p.rank);
    return true;
  });
}

// ─── Parse WTA tennis.com HTML ─────────────────────────
// Source: https://www.wtatennis.com/rankings/singles
// Structure: data-player-name="Aryna Sabalenka"
//            <span class="player-row__rank ...">1</span>
//            <td class="player-row__cell--points ...">10,895</td>
// Note: WTA SSR only renders top 50. The rest loads via JS.
function parseWTAPage(html) {
  // Split by player row blocks
  const playerBlocks = html.split(/class="player-row js-player-item/).slice(1);

  return playerBlocks.map(block => {
    // Name from data attribute (most reliable)
    const nameMatch = block.match(/data-player-name="([^"]+)"/);
    const name = nameMatch ? nameMatch[1].trim() : null;

    // Rank
    const rankMatch = block.match(/player-row__rank[^"]*">\s*(\d+)\s*</);
    const rank = rankMatch ? parseInt(rankMatch[1], 10) : null;

    // Points
    const ptsMatch = block.match(/player-row__cell--points[^"]*">\s*([\d,]+)\s*</);
    const points = ptsMatch ? parseInt(ptsMatch[1].replace(/,/g, ''), 10) : null;

    // Slug from player profile link
    const slugMatch = block.match(/href="\/players\/([^/?"]+)/);
    const slug = slugMatch ? slugMatch[1] : null;

    if (!rank || !name) return null;
    return { rank, name, slug, points: points ?? 0, tour: 'wta' };
  }).filter(Boolean);
}

// ─── Fetch WTA rankings ────────────────────────────────
async function fetchWTARankings() {
  const url = 'https://www.wtatennis.com/rankings/singles';
  console.log(`  📥 Fetching WTA: ${url}`);

  try {
    const html = await fetchHTML(url);
    const players = parseWTAPage(html);
    console.log(`     → Parsed ${players.length} players`);
    return players;
  } catch (err) {
    console.error(`  ❌ Error fetching WTA: ${err.message}`);
    return [];
  }
}

// ─── Slug from name ────────────────────────────────────
function nameToSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

// ─── Validate parsed data (safety) ─────────────────────
function validateRankings(players, tour) {
  const errors = [];

  const minExpected = tour === 'atp' ? 50 : 30;
  if (players.length < minExpected) {
    errors.push(`Only ${players.length} ${tour.toUpperCase()} players parsed (expected ${minExpected}+)`);
  }

  // Top 10 should all have > 1000 points
  const top10 = players.filter(p => p.rank <= 10);
  const zeroPointsTop10 = top10.filter(p => !p.points || p.points === 0 || isNaN(p.points));
  if (zeroPointsTop10.length > 5) {
    errors.push(`${zeroPointsTop10.length} top-10 ${tour.toUpperCase()} players have 0 points`);
  }

  // #1 should have > 5000 points
  const num1 = players.find(p => p.rank === 1);
  if (num1 && num1.points < 5000) {
    errors.push(`#1 ${tour.toUpperCase()} ${num1.name} has only ${num1.points} points`);
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
    if (p.slug) slugMap.set(p.slug, p);
    const fullName = `${p.first_name} ${p.last_name}`.toLowerCase().trim();
    nameMap.set(fullName, p);
    nameMap.set(`${p.last_name} ${p.first_name}`.toLowerCase().trim(), p);
  }

  const rankingRows = [];
  let matched = 0;
  let unmatched = 0;

  for (const r of parsedPlayers) {
    let player = null;

    // 1) Try source slug (exact match)
    if (r.slug) {
      player = slugMap.get(r.slug);
    }

    // 2) Try name-to-slug conversion
    if (!player) {
      const slug = nameToSlug(r.name);
      player = slugMap.get(slug);
    }

    // 3) Try full name match
    if (!player) {
      player = nameMap.get(r.name.toLowerCase().trim());
    }

    // 4) For abbreviated ATP names like "J. Sinner" — match by last name + first initial
    if (!player && r.name.includes('.')) {
      const parts = r.name.split(' ');
      // "J. Sinner" → firstInitial="j", lastName="sinner"
      const firstInitial = parts[0].replace('.', '').toLowerCase();
      const lastName = parts[parts.length - 1].toLowerCase();
      for (const [, p] of nameMap) {
        const pLast = p.last_name?.toLowerCase() || '';
        const pFirst = p.first_name?.toLowerCase() || '';
        if (pLast === lastName && pFirst.startsWith(firstInitial)) {
          player = p;
          break;
        }
      }
    }

    // 5) Fuzzy: last name + first name parts
    if (!player) {
      const nameParts = r.name.toLowerCase().split(' ');
      const lastName = nameParts[nameParts.length - 1];
      const firstName = nameParts[0].replace('.', '');
      for (const [, p] of slugMap) {
        const pLast = p.last_name?.toLowerCase() || '';
        const pFirst = p.first_name?.toLowerCase() || '';
        if (pLast === lastName && pFirst.startsWith(firstName)) {
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
      console.log(`  Sample ATP #1: ${rankingRows.find(r => r.ranking === 1 && r.tour === 'atp')?.points || '?'} pts`);
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
  console.log('🎾 SUPER.TENNIS Rankings Updater (atptour.com + wtatennis.com)\n');
  if (DRY_RUN) console.log('🏜️  DRY RUN MODE — no writes\n');

  const today = new Date().toISOString().split('T')[0];
  console.log(`📅 Ranking date: ${today}\n`);

  // Fetch ATP (2 pages → ~200 players)
  console.log('── ATP Singles ──');
  const atpPlayers = await fetchATPRankings();
  console.log(`  Total ATP: ${atpPlayers.length} players\n`);

  // Fetch WTA (top 50 via SSR)
  console.log('── WTA Singles ──');
  const wtaPlayers = await fetchWTARankings();
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

    // Abort only if absolutely no data
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
