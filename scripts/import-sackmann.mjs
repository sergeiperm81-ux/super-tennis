#!/usr/bin/env node
/**
 * SUPER.TENNIS — Jeff Sackmann Data Import Script
 *
 * Downloads ATP & WTA data from GitHub and imports into Supabase.
 * Source: https://github.com/JeffSackmann/tennis_atp (CC-BY-NC-SA 4.0)
 * Source: https://github.com/JeffSackmann/tennis_wta (CC-BY-NC-SA 4.0)
 *
 * Usage:
 *   node scripts/import-sackmann.mjs [--players] [--rankings] [--matches] [--all]
 *
 * Requires .env with SUPABASE_URL and SUPABASE_SERVICE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { parse } from 'node:url';

config(); // Load .env

// ─── Config ──────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY; // Use service key for inserts
const BATCH_SIZE = 500;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// GitHub raw URLs
const BASE_ATP = 'https://raw.githubusercontent.com/JeffSackmann/tennis_atp/master';
const BASE_WTA = 'https://raw.githubusercontent.com/JeffSackmann/tennis_wta/master';

// ─── CSV Parser (lightweight, no deps) ──────────────────
function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length !== headers.length) continue; // Skip malformed rows

    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] === '' ? null : values[idx];
    });
    rows.push(row);
  }

  return rows;
}

// ─── Fetch CSV from GitHub ──────────────────────────────
async function fetchCSV(url) {
  console.log(`  📥 Fetching ${url.split('/').pop()}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  const text = await res.text();
  const rows = parseCSV(text);
  console.log(`  ✅ Parsed ${rows.length} rows`);
  return rows;
}

// ─── Batch Insert ───────────────────────────────────────
async function batchInsert(table, rows, options = {}) {
  const { onConflict } = options;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    let query = supabase.from(table).upsert(batch, {
      onConflict: onConflict || undefined,
      ignoreDuplicates: true
    });

    const { error } = await query;
    if (error) {
      console.error(`  ❌ Batch ${Math.floor(i/BATCH_SIZE)+1} error:`, error.message);
      // Continue with next batch
    } else {
      inserted += batch.length;
    }
  }

  console.log(`  📊 Inserted/updated ${inserted} rows into ${table}`);
  return inserted;
}

// ─── Slug Generator ─────────────────────────────────────
function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ─── Parse Sackmann Date (YYYYMMDD) ────────────────────
function parseDate(dateStr) {
  if (!dateStr || dateStr.length < 8) return null;
  const y = dateStr.substring(0, 4);
  const m = dateStr.substring(4, 6);
  const d = dateStr.substring(6, 8);
  if (y === '0000' || m === '00' || d === '00') return null;
  return `${y}-${m}-${d}`;
}

// ═══════════════════════════════════════════════════════
// IMPORT: Players
// ═══════════════════════════════════════════════════════
async function importPlayers() {
  console.log('\n🎾 IMPORTING PLAYERS...');

  // Fetch ATP + WTA players
  const atpPlayers = await fetchCSV(`${BASE_ATP}/atp_players.csv`);
  const wtaPlayers = await fetchCSV(`${BASE_WTA}/wta_players.csv`);

  // Transform ATP players
  const atpRows = atpPlayers.map(p => ({
    player_id: `atp_${p.player_id}`,
    first_name: p.first_name || 'Unknown',
    last_name: p.last_name || 'Unknown',
    slug: slugify(`${p.first_name || ''} ${p.last_name || ''}`),
    hand: p.hand || 'U',
    birth_date: parseDate(p.birth_date),
    country_code: p.country_code,
    height_cm: p.height ? parseInt(p.height) : null,
    tour: 'atp',
    is_active: true,
  }));

  // Transform WTA players
  const wtaRows = wtaPlayers.map(p => ({
    player_id: `wta_${p.player_id}`,
    first_name: p.first_name || 'Unknown',
    last_name: p.last_name || 'Unknown',
    slug: slugify(`${p.first_name || ''} ${p.last_name || ''}`),
    hand: p.hand || 'U',
    birth_date: parseDate(p.birth_date),
    country_code: p.country_code,
    height_cm: null, // WTA CSV doesn't have height
    tour: 'wta',
    is_active: true,
  }));

  // Deduplicate slugs (add tour suffix if collision)
  const slugMap = new Map();
  const allPlayers = [...atpRows, ...wtaRows];

  for (const p of allPlayers) {
    if (slugMap.has(p.slug)) {
      p.slug = `${p.slug}-${p.tour}`;
    }
    slugMap.set(p.slug, true);
  }

  console.log(`  Total: ${atpRows.length} ATP + ${wtaRows.length} WTA = ${allPlayers.length} players`);

  await batchInsert('players', allPlayers, { onConflict: 'player_id' });
}

// ═══════════════════════════════════════════════════════
// IMPORT: Rankings (current only — recent weeks)
// ═══════════════════════════════════════════════════════
async function importRankings() {
  console.log('\n📊 IMPORTING RANKINGS...');

  const atpRankings = await fetchCSV(`${BASE_ATP}/atp_rankings_current.csv`);
  const wtaRankings = await fetchCSV(`${BASE_WTA}/wta_rankings_current.csv`);

  // Only import top 200 + most recent date for each tour
  function processRankings(rows, tour) {
    // Find latest date
    const dates = [...new Set(rows.map(r => r.ranking_date))].sort().reverse();
    const latestDates = dates.slice(0, 4); // Last 4 weeks

    return rows
      .filter(r => latestDates.includes(r.ranking_date) && parseInt(r.ranking) <= 200)
      .map(r => ({
        ranking_date: parseDate(r.ranking_date),
        player_id: `${tour}_${r.player}`,
        tour,
        ranking: parseInt(r.ranking),
        points: r.points ? parseInt(r.points) : null,
        tours_played: r.tours ? parseInt(r.tours) : null,
      }))
      .filter(r => r.ranking_date); // Skip null dates
  }

  const atpRows = processRankings(atpRankings, 'atp');
  const wtaRows = processRankings(wtaRankings, 'wta');
  const allRankings = [...atpRows, ...wtaRows];

  console.log(`  Total: ${atpRows.length} ATP + ${wtaRows.length} WTA = ${allRankings.length} ranking entries`);

  await batchInsert('rankings', allRankings, { onConflict: 'ranking_date,player_id,tour' });
}

// ═══════════════════════════════════════════════════════
// IMPORT: Matches (recent years for stats)
// ═══════════════════════════════════════════════════════
async function importMatches() {
  console.log('\n🏟️ IMPORTING MATCHES...');

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear]; // Last 2 years

  const tournamentsMap = new Map();
  const allMatches = [];

  for (const year of years) {
    for (const tour of ['atp', 'wta']) {
      const base = tour === 'atp' ? BASE_ATP : BASE_WTA;
      const prefix = tour === 'atp' ? 'atp' : 'wta';

      try {
        const matches = await fetchCSV(`${base}/${prefix}_matches_${year}.csv`);

        for (const m of matches) {
          // Extract tournament
          if (m.tourney_id && !tournamentsMap.has(`${tour}_${m.tourney_id}`)) {
            tournamentsMap.set(`${tour}_${m.tourney_id}`, {
              tourney_id: `${tour}_${m.tourney_id}`,
              name: m.tourney_name || 'Unknown',
              slug: slugify(`${m.tourney_name || 'unknown'}-${tour}`),
              surface: m.surface,
              level: m.tourney_level,
              tour,
              draw_size: m.draw_size ? parseInt(m.draw_size) : null,
            });
          }

          // Build match row
          allMatches.push({
            tourney_id: `${tour}_${m.tourney_id}`,
            match_num: m.match_num ? parseInt(m.match_num) : null,
            tour,
            tourney_date: parseDate(m.tourney_date),
            round: m.round,
            best_of: m.best_of ? parseInt(m.best_of) : null,
            winner_id: `${tour}_${m.winner_id}`,
            loser_id: `${tour}_${m.loser_id}`,
            score: m.score,
            minutes: m.minutes ? parseInt(m.minutes) : null,
            w_ace: m.w_ace ? parseInt(m.w_ace) : null,
            w_df: m.w_df ? parseInt(m.w_df) : null,
            w_svpt: m.w_svpt ? parseInt(m.w_svpt) : null,
            w_1st_in: m.w_1stIn ? parseInt(m.w_1stIn) : null,
            w_1st_won: m.w_1stWon ? parseInt(m.w_1stWon) : null,
            w_2nd_won: m.w_2ndWon ? parseInt(m.w_2ndWon) : null,
            w_sv_gms: m.w_SvGms ? parseInt(m.w_SvGms) : null,
            w_bp_saved: m.w_bpSaved ? parseInt(m.w_bpSaved) : null,
            w_bp_faced: m.w_bpFaced ? parseInt(m.w_bpFaced) : null,
            l_ace: m.l_ace ? parseInt(m.l_ace) : null,
            l_df: m.l_df ? parseInt(m.l_df) : null,
            l_svpt: m.l_svpt ? parseInt(m.l_svpt) : null,
            l_1st_in: m.l_1stIn ? parseInt(m.l_1stIn) : null,
            l_1st_won: m.l_1stWon ? parseInt(m.l_1stWon) : null,
            l_2nd_won: m.l_2ndWon ? parseInt(m.l_2ndWon) : null,
            l_sv_gms: m.l_SvGms ? parseInt(m.l_SvGms) : null,
            l_bp_saved: m.l_bpSaved ? parseInt(m.l_bpSaved) : null,
            l_bp_faced: m.l_bpFaced ? parseInt(m.l_bpFaced) : null,
          });
        }
      } catch (err) {
        console.log(`  ⚠️ No data for ${prefix}_matches_${year}: ${err.message}`);
      }
    }
  }

  // Insert tournaments first
  const tournaments = [...tournamentsMap.values()];
  console.log(`\n  🏟️ ${tournaments.length} tournaments extracted`);
  await batchInsert('tournaments', tournaments, { onConflict: 'tourney_id' });

  // Insert matches
  console.log(`\n  🎾 ${allMatches.length} matches total`);
  await batchInsert('matches', allMatches, { onConflict: 'tourney_id,match_num,tour' });
}

// ═══════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════
const args = process.argv.slice(2);
const doAll = args.includes('--all') || args.length === 0;

console.log('═══════════════════════════════════════════════');
console.log('  SUPER.TENNIS — Sackmann Data Import');
console.log('═══════════════════════════════════════════════');
console.log(`  Supabase: ${SUPABASE_URL}`);
console.log(`  Mode: ${doAll ? 'ALL' : args.join(', ')}`);

const start = Date.now();

try {
  if (doAll || args.includes('--players'))  await importPlayers();
  if (doAll || args.includes('--rankings')) await importRankings();
  if (doAll || args.includes('--matches'))  await importMatches();

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n✅ Import complete in ${elapsed}s`);
} catch (err) {
  console.error('\n❌ Import failed:', err.message);
  process.exit(1);
}
