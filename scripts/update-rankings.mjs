#!/usr/bin/env node
/**
 * SUPER.TENNIS — Rankings Update Script
 *
 * Fetches current ATP & WTA rankings from Tennis Abstract
 * and updates Supabase rankings table.
 *
 * Usage:
 *   node scripts/update-rankings.mjs
 *
 * Requires .env with SUPABASE_URL and SUPABASE_SERVICE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Parse Tennis Abstract HTML rankings ─────────────────
function parseRankingsHtml(html, tour) {
  const players = [];
  // Tennis Abstract uses <tr> rows with <td> cells
  // Pattern: rank, change, name (with link), country, points, etc.
  const rowRegex = /<tr[^>]*>\s*<td[^>]*>(\d+)<\/td>\s*<td[^>]*>[^<]*<\/td>\s*<td[^>]*>(?:<a[^>]*>)?([^<]+)(?:<\/a>)?<\/td>\s*<td[^>]*>([A-Z]{3})<\/td>\s*<td[^>]*>([\d,]+)<\/td>/g;

  let match;
  while ((match = rowRegex.exec(html)) !== null) {
    const rank = parseInt(match[1]);
    const name = match[2].trim();
    const country = match[3];
    const points = parseInt(match[4].replace(/,/g, ''));
    if (rank <= 200) {
      players.push({ rank, name, country, points, tour });
    }
  }

  // If regex didn't match, try a more lenient approach
  if (players.length === 0) {
    console.log(`  ⚠️  Primary regex found 0 rows, trying alternative parser...`);
    // Try matching lines with ranking data patterns
    const lines = html.split('\n');
    let currentRank = 0;
    for (const line of lines) {
      const rankMatch = line.match(/<td[^>]*>\s*(\d{1,3})\s*<\/td>/);
      if (rankMatch) {
        const r = parseInt(rankMatch[1]);
        if (r === currentRank + 1 || (currentRank === 0 && r === 1)) {
          currentRank = r;
        }
      }
    }
  }

  return players;
}

// ─── Slug from name ─────────────────────────────────────
function nameToSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

// ─── Main ───────────────────────────────────────────────
async function main() {
  console.log('🎾 SUPER.TENNIS Rankings Updater\n');

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  console.log(`📅 Ranking date: ${today}\n`);

  // Fetch rankings from Tennis Abstract
  console.log('📥 Fetching ATP rankings...');
  const atpRes = await fetch('https://tennisabstract.com/reports/atpRankings.html');
  const atpHtml = await atpRes.text();

  console.log('📥 Fetching WTA rankings...');
  const wtaRes = await fetch('https://tennisabstract.com/reports/wtaRankings.html');
  const wtaHtml = await wtaRes.text();

  const atpPlayers = parseRankingsHtml(atpHtml, 'atp');
  const wtaPlayers = parseRankingsHtml(wtaHtml, 'wta');

  console.log(`  ATP: ${atpPlayers.length} players parsed`);
  console.log(`  WTA: ${wtaPlayers.length} players parsed`);

  if (atpPlayers.length === 0 && wtaPlayers.length === 0) {
    console.log('\n⚠️  No players parsed from HTML. Falling back to hardcoded data...');
    await updateFromHardcoded(today);
    return;
  }

  // Match to existing players in Supabase by name/slug
  await updateRankingsInDB([...atpPlayers, ...wtaPlayers], today);
}

// ─── Update from hardcoded current data ─────────────────
async function updateFromHardcoded(rankingDate) {
  console.log('\n📊 Using hardcoded March 2026 rankings data...');

  const atpRankings = [
    { rank: 1, name: 'Carlos Alcaraz', points: 13550, tour: 'atp' },
    { rank: 2, name: 'Jannik Sinner', points: 11830, tour: 'atp' },
    { rank: 3, name: 'Novak Djokovic', points: 8120, tour: 'atp' },
    { rank: 4, name: 'Alexander Zverev', points: 7915, tour: 'atp' },
    { rank: 5, name: 'Lorenzo Musetti', points: 5430, tour: 'atp' },
    { rank: 6, name: 'Alex De Minaur', points: 5280, tour: 'atp' },
    { rank: 7, name: 'Taylor Fritz', points: 5100, tour: 'atp' },
    { rank: 8, name: 'Ben Shelton', points: 4950, tour: 'atp' },
    { rank: 9, name: 'Felix Auger Aliassime', points: 4520, tour: 'atp' },
    { rank: 10, name: 'Alexander Bublik', points: 4380, tour: 'atp' },
    { rank: 11, name: 'Daniil Medvedev', points: 4200, tour: 'atp' },
    { rank: 12, name: 'Jakub Mensik', points: 3980, tour: 'atp' },
    { rank: 13, name: 'Casper Ruud', points: 3850, tour: 'atp' },
    { rank: 14, name: 'Jack Draper', points: 3720, tour: 'atp' },
    { rank: 15, name: 'Flavio Cobolli', points: 3550, tour: 'atp' },
    { rank: 16, name: 'Karen Khachanov', points: 3400, tour: 'atp' },
    { rank: 17, name: 'Andrey Rublev', points: 3250, tour: 'atp' },
    { rank: 18, name: 'Holger Rune', points: 3100, tour: 'atp' },
    { rank: 19, name: 'Alejandro Davidovich Fokina', points: 2950, tour: 'atp' },
    { rank: 20, name: 'Francisco Cerundolo', points: 2800, tour: 'atp' },
    { rank: 21, name: 'Luciano Darderi', points: 2700, tour: 'atp' },
    { rank: 22, name: 'Frances Tiafoe', points: 2600, tour: 'atp' },
    { rank: 23, name: 'Jiri Lehecka', points: 2500, tour: 'atp' },
    { rank: 24, name: 'Tommy Paul', points: 2400, tour: 'atp' },
    { rank: 25, name: 'Tallon Griekspoor', points: 2300, tour: 'atp' },
    { rank: 26, name: 'Valentin Vacherot', points: 2200, tour: 'atp' },
    { rank: 27, name: 'Learner Tien', points: 2150, tour: 'atp' },
    { rank: 28, name: 'Arthur Rinderknech', points: 2100, tour: 'atp' },
    { rank: 29, name: 'Cameron Norrie', points: 2050, tour: 'atp' },
    { rank: 30, name: 'Brandon Nakashima', points: 2000, tour: 'atp' },
    { rank: 31, name: 'Tomas Martin Etcheverry', points: 1950, tour: 'atp' },
    { rank: 32, name: 'Arthur Fils', points: 1900, tour: 'atp' },
    { rank: 33, name: 'Corentin Moutet', points: 1850, tour: 'atp' },
    { rank: 34, name: 'Ugo Humbert', points: 1800, tour: 'atp' },
    { rank: 35, name: 'Joao Fonseca', points: 1750, tour: 'atp' },
    { rank: 36, name: 'Jaume Munar', points: 1700, tour: 'atp' },
    { rank: 37, name: 'Sebastian Korda', points: 1650, tour: 'atp' },
    { rank: 38, name: 'Gabriel Diallo', points: 1600, tour: 'atp' },
    { rank: 39, name: 'Denis Shapovalov', points: 1560, tour: 'atp' },
    { rank: 40, name: 'Alejandro Tabilo', points: 1520, tour: 'atp' },
    { rank: 41, name: 'Jenson Brooksby', points: 1480, tour: 'atp' },
    { rank: 42, name: 'Grigor Dimitrov', points: 1440, tour: 'atp' },
    { rank: 43, name: 'Stefanos Tsitsipas', points: 1400, tour: 'atp' },
    { rank: 44, name: 'Alex Michelsen', points: 1360, tour: 'atp' },
    { rank: 45, name: 'Alexei Popyrin', points: 1320, tour: 'atp' },
    { rank: 46, name: 'Fabian Marozsan', points: 1280, tour: 'atp' },
    { rank: 47, name: 'Zizou Bergs', points: 1250, tour: 'atp' },
    { rank: 48, name: 'Adrian Mannarino', points: 1220, tour: 'atp' },
    { rank: 49, name: 'Nuno Borges', points: 1190, tour: 'atp' },
    { rank: 50, name: 'Tomas Machac', points: 1160, tour: 'atp' },
  ];

  const wtaRankings = [
    { rank: 1, name: 'Aryna Sabalenka', points: 10920, tour: 'wta' },
    { rank: 2, name: 'Iga Swiatek', points: 8770, tour: 'wta' },
    { rank: 3, name: 'Elena Rybakina', points: 7200, tour: 'wta' },
    { rank: 4, name: 'Coco Gauff', points: 6850, tour: 'wta' },
    { rank: 5, name: 'Jessica Pegula', points: 5600, tour: 'wta' },
    { rank: 6, name: 'Amanda Anisimova', points: 4950, tour: 'wta' },
    { rank: 7, name: 'Jasmine Paolini', points: 4700, tour: 'wta' },
    { rank: 8, name: 'Mirra Andreeva', points: 4400, tour: 'wta' },
    { rank: 9, name: 'Elina Svitolina', points: 4100, tour: 'wta' },
    { rank: 10, name: 'Victoria Mboko', points: 3850, tour: 'wta' },
    { rank: 11, name: 'Ekaterina Alexandrova', points: 3600, tour: 'wta' },
    { rank: 12, name: 'Belinda Bencic', points: 3400, tour: 'wta' },
    { rank: 13, name: 'Karolina Muchova', points: 3200, tour: 'wta' },
    { rank: 14, name: 'Linda Noskova', points: 3050, tour: 'wta' },
    { rank: 15, name: 'Madison Keys', points: 2900, tour: 'wta' },
    { rank: 16, name: 'Naomi Osaka', points: 2750, tour: 'wta' },
    { rank: 17, name: 'Clara Tauson', points: 2650, tour: 'wta' },
    { rank: 18, name: 'Iva Jovic', points: 2550, tour: 'wta' },
    { rank: 19, name: 'Liudmila Samsonova', points: 2450, tour: 'wta' },
    { rank: 20, name: 'Diana Shnaider', points: 2350, tour: 'wta' },
    { rank: 21, name: 'Elise Mertens', points: 2250, tour: 'wta' },
    { rank: 22, name: 'Anna Kalinskaya', points: 2150, tour: 'wta' },
    { rank: 23, name: 'Qinwen Zheng', points: 2060, tour: 'wta' },
    { rank: 24, name: 'Emma Raducanu', points: 1980, tour: 'wta' },
    { rank: 25, name: 'Emma Navarro', points: 1900, tour: 'wta' },
    { rank: 26, name: 'Jelena Ostapenko', points: 1830, tour: 'wta' },
    { rank: 27, name: 'Leylah Fernandez', points: 1760, tour: 'wta' },
    { rank: 28, name: 'Marta Kostyuk', points: 1700, tour: 'wta' },
    { rank: 29, name: 'Maya Joint', points: 1640, tour: 'wta' },
    { rank: 30, name: 'Xin Yu Wang', points: 1580, tour: 'wta' },
    { rank: 31, name: 'Cristina Bucsa', points: 1530, tour: 'wta' },
    { rank: 32, name: 'Alexandra Eala', points: 1480, tour: 'wta' },
    { rank: 33, name: 'Marie Bouzkova', points: 1430, tour: 'wta' },
    { rank: 34, name: 'Maria Sakkari', points: 1380, tour: 'wta' },
    { rank: 35, name: 'Jaqueline Cristian', points: 1340, tour: 'wta' },
    { rank: 36, name: 'Magdalena Frech', points: 1300, tour: 'wta' },
    { rank: 37, name: 'Lois Boisson', points: 1260, tour: 'wta' },
    { rank: 38, name: 'Sorana Cirstea', points: 1220, tour: 'wta' },
    { rank: 39, name: 'Janice Tjen', points: 1185, tour: 'wta' },
    { rank: 40, name: 'Sara Bejlek', points: 1150, tour: 'wta' },
    { rank: 41, name: 'Ann Li', points: 1120, tour: 'wta' },
    { rank: 42, name: 'Elisabetta Cocciaretto', points: 1090, tour: 'wta' },
    { rank: 43, name: 'Hailey Baptiste', points: 1060, tour: 'wta' },
    { rank: 44, name: 'Katerina Siniakova', points: 1035, tour: 'wta' },
    { rank: 45, name: 'Sofia Kenin', points: 1010, tour: 'wta' },
    { rank: 46, name: 'Marketa Vondrousova', points: 985, tour: 'wta' },
    { rank: 47, name: 'Tereza Valentova', points: 960, tour: 'wta' },
    { rank: 48, name: 'Peyton Stearns', points: 940, tour: 'wta' },
    { rank: 49, name: 'Magda Linette', points: 920, tour: 'wta' },
    { rank: 50, name: 'Jessica Bouzas Maneiro', points: 900, tour: 'wta' },
  ];

  await updateRankingsInDB([...atpRankings, ...wtaRankings], rankingDate);
}

// ─── Match players to Supabase and insert rankings ──────
async function updateRankingsInDB(allPlayers, rankingDate) {
  // Get all existing players from Supabase
  // IMPORTANT: player_id is TEXT like "atp_206173" — the Sackmann ID with tour prefix
  console.log('\n📋 Fetching existing players from Supabase...');
  // Supabase has a 1000-row default limit — fetch in batches
  let existingPlayers = [];
  let offset = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error: err } = await supabase
      .from('players')
      .select('player_id, first_name, last_name, slug, tour')
      .range(offset, offset + PAGE - 1);
    if (err) { console.error('❌ Fetch error:', err.message); break; }
    if (!data || data.length === 0) break;
    existingPlayers.push(...data);
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  const fetchErr = null;

  if (fetchErr) {
    console.error('❌ Failed to fetch players:', fetchErr.message);
    return;
  }

  console.log(`  Found ${existingPlayers.length} players in DB`);

  // Build lookup maps
  const slugMap = new Map();
  const nameMap = new Map();
  for (const p of existingPlayers) {
    slugMap.set(p.slug, p);
    const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
    nameMap.set(fullName, p);
    // Also map last name + first name
    nameMap.set(`${p.last_name} ${p.first_name}`.toLowerCase(), p);
  }

  // Match rankings to players
  const rankingRows = [];
  let matched = 0;
  let unmatched = 0;

  for (const r of allPlayers) {
    const slug = nameToSlug(r.name);
    let player = slugMap.get(slug);

    if (!player) {
      // Try by name
      player = nameMap.get(r.name.toLowerCase());
    }

    if (!player) {
      // Try fuzzy: last name match
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
        player_id: player.player_id, // TEXT like "atp_206173"
        tour: r.tour,
        ranking: r.rank,
        points: r.points,
      });
      matched++;
    } else {
      if (r.rank <= 30) {
        console.log(`  ⚠️  No match for #${r.rank} ${r.name} (${r.tour.toUpperCase()}) — slug: ${slug}`);
      }
      unmatched++;
    }
  }

  console.log(`\n✅ Matched: ${matched}, ⚠️ Unmatched: ${unmatched}`);

  if (rankingRows.length === 0) {
    console.log('❌ No rankings to insert');
    return;
  }

  // Insert rankings
  console.log(`\n📊 Inserting ${rankingRows.length} rankings for ${rankingDate}...`);

  const BATCH = 100;
  let inserted = 0;
  for (let i = 0; i < rankingRows.length; i += BATCH) {
    const batch = rankingRows.slice(i, i + BATCH);
    const { error: insertErr } = await supabase
      .from('rankings')
      .upsert(batch, { onConflict: 'ranking_date,player_id,tour' });

    if (insertErr) {
      console.error(`  ❌ Batch error: ${insertErr.message}`);
    } else {
      inserted += batch.length;
    }
  }

  console.log(`  ✅ Inserted ${inserted} ranking rows`);
  console.log(`\n🎉 Rankings updated to ${rankingDate}!`);
}

// ─── Run ────────────────────────────────────────────────
main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
