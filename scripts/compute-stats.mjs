#!/usr/bin/env node
/**
 * SUPER.TENNIS — Compute Career Stats from Match Data
 *
 * Downloads match CSVs (2010-2024), computes career stats per player,
 * and updates the players table in Supabase.
 *
 * Stats computed: career_titles, grand_slam_titles, career_win, career_loss
 *
 * Usage: node scripts/compute-stats.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BASE_ATP = 'https://raw.githubusercontent.com/JeffSackmann/tennis_atp/master';
const BASE_WTA = 'https://raw.githubusercontent.com/JeffSackmann/tennis_wta/master';

// Years to download (covers most active careers)
const YEARS = [];
for (let y = 2000; y <= 2024; y++) YEARS.push(y);

// Lightweight CSV parser
function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    // Handle quoted fields (some player names have commas)
    const values = [];
    let current = '';
    let inQuotes = false;
    for (const ch of lines[i]) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { values.push(current.trim()); current = ''; continue; }
      current += ch;
    }
    values.push(current.trim());
    if (values.length < headers.length - 2) continue; // Skip badly malformed
    const row = {};
    headers.forEach((h, idx) => { row[h] = values[idx] === '' ? null : values[idx]; });
    rows.push(row);
  }
  return rows;
}

async function fetchCSV(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const text = await res.text();
    return parseCSV(text);
  } catch {
    return [];
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  SUPER.TENNIS — Career Stats Computation');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Years: ${YEARS[0]}-${YEARS[YEARS.length - 1]}`);

  // Stats accumulators: player_id -> { wins, losses, titles, gs_titles }
  const stats = new Map();

  function ensurePlayer(pid) {
    if (!stats.has(pid)) {
      stats.set(pid, { wins: 0, losses: 0, titles: 0, gs_titles: 0 });
    }
    return stats.get(pid);
  }

  // Process matches for a tour
  async function processMatches(tour, baseUrl, prefix) {
    console.log(`\n🎾 Processing ${tour.toUpperCase()} matches...`);
    let totalMatches = 0;

    for (const year of YEARS) {
      const filename = `${prefix}_matches_${year}.csv`;
      process.stdout.write(`  📥 ${year}... `);
      const matches = await fetchCSV(`${baseUrl}/${filename}`);

      if (matches.length === 0) {
        console.log('skip');
        continue;
      }

      console.log(`${matches.length} matches`);
      totalMatches += matches.length;

      for (const m of matches) {
        const winnerId = `${tour}_${m.winner_id}`;
        const loserId = `${tour}_${m.loser_id}`;

        if (!m.winner_id || !m.loser_id) continue;

        // Count wins and losses
        const winnerStats = ensurePlayer(winnerId);
        const loserStats = ensurePlayer(loserId);
        winnerStats.wins++;
        loserStats.losses++;

        // Count titles (winner of Final round)
        if (m.round === 'F') {
          winnerStats.titles++;

          // Count Grand Slam titles
          if (m.tourney_level === 'G') {
            winnerStats.gs_titles++;
          }
        }
      }
    }

    console.log(`  📊 Total ${tour.toUpperCase()}: ${totalMatches} matches processed`);
  }

  await processMatches('atp', BASE_ATP, 'atp');
  await processMatches('wta', BASE_WTA, 'wta');

  console.log(`\n📊 Stats computed for ${stats.size} players`);

  // Top players by titles (sanity check)
  const topByTitles = [...stats.entries()]
    .sort((a, b) => b[1].titles - a[1].titles)
    .slice(0, 10);

  console.log('\n🏆 Top 10 by career titles:');
  for (const [pid, s] of topByTitles) {
    console.log(`  ${pid}: ${s.titles} titles (${s.gs_titles} GS), W${s.wins}-L${s.losses}`);
  }

  // Update Supabase in batches
  console.log('\n📤 Updating Supabase...');
  let updated = 0;
  let errors = 0;
  const entries = [...stats.entries()];

  // Update in batches of 100 using individual updates (upsert on player_id)
  for (let i = 0; i < entries.length; i += 100) {
    const batch = entries.slice(i, i + 100);

    const promises = batch.map(([playerId, s]) =>
      supabase
        .from('players')
        .update({
          career_titles: s.titles,
          grand_slam_titles: s.gs_titles,
          career_win: s.wins,
          career_loss: s.losses,
        })
        .eq('player_id', playerId)
    );

    const results = await Promise.all(promises);
    for (const { error } of results) {
      if (error) errors++;
      else updated++;
    }

    if ((i + 100) % 1000 === 0 || i + 100 >= entries.length) {
      process.stdout.write(`\r  Updated ${Math.min(i + 100, entries.length)}/${entries.length} players...`);
    }
  }

  console.log(`\n  ✅ Updated ${updated} players (${errors} errors)`);

  // Verify top players
  console.log('\n🔍 Verification — top ATP players:');
  const { data: topPlayers } = await supabase
    .from('players')
    .select('first_name, last_name, career_titles, grand_slam_titles, career_win, career_loss')
    .eq('tour', 'atp')
    .order('career_titles', { ascending: false })
    .limit(5);

  if (topPlayers) {
    for (const p of topPlayers) {
      console.log(`  ${p.first_name} ${p.last_name}: ${p.career_titles} titles (${p.grand_slam_titles} GS), W${p.career_win}-L${p.career_loss}`);
    }
  }

  console.log('\n✅ Stats computation complete!');
}

main().catch(console.error);
