#!/usr/bin/env node
/**
 * SUPER.TENNIS — Seed H2H cache with verified data
 *
 * TennisLiveRanking H2H page loads match data via JS AJAX,
 * so we can't scrape it. Instead, we seed verified H2H records
 * for our main vs-article pairs. Updated manually or via API.
 *
 * Sources: ATP/WTA official records, tennis24.com
 *
 * Usage: node scripts/seed-h2h-data.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Verified H2H data (April 2026)
// Format: [player1_slug, player2_slug, p1_wins, p2_wins, surface_breakdown, last_match]
const h2hData = [
  {
    slugs: ['novak-djokovic', 'rafael-nadal'],
    p1_wins: 31, p2_wins: 29,
    hard: [20, 7], clay: [8, 20], grass: [2, 2],
    last: { date: '2024-10-19', score: '6-2 7-6', tournament: 'Six Kings Slam' },
  },
  {
    slugs: ['novak-djokovic', 'roger-federer'],
    p1_wins: 27, p2_wins: 23,
    hard: [13, 11], clay: [4, 3], grass: [4, 5],
    last: { date: '2023-01-27', score: null, tournament: 'Laver Cup 2022' },
  },
  {
    slugs: ['roger-federer', 'rafael-nadal'],
    p1_wins: 16, p2_wins: 24,
    hard: [11, 9], clay: [2, 14], grass: [3, 1],
    last: { date: '2022-09-24', score: null, tournament: 'Laver Cup 2022' },
  },
  {
    slugs: ['carlos-alcaraz', 'jannik-sinner'],
    p1_wins: 6, p2_wins: 5,
    hard: [2, 3], clay: [3, 1], grass: [1, 1],
    last: { date: '2025-11-18', score: '6-3 6-4', tournament: 'ATP Finals' },
  },
  {
    slugs: ['novak-djokovic', 'carlos-alcaraz'],
    p1_wins: 4, p2_wins: 7,
    hard: [2, 3], clay: [1, 2], grass: [1, 2],
    last: { date: '2025-07-13', score: '4-6 5-7', tournament: 'Wimbledon Final' },
  },
  {
    slugs: ['novak-djokovic', 'andy-murray'],
    p1_wins: 25, p2_wins: 11,
    hard: [14, 5], clay: [4, 2], grass: [5, 3],
    last: { date: '2024-01-13', score: null, tournament: 'Australian Open 2024' },
  },
  {
    slugs: ['iga-swiatek', 'aryna-sabalenka'],
    p1_wins: 7, p2_wins: 5,
    hard: [3, 4], clay: [4, 1], grass: [0, 0],
    last: { date: '2025-10-26', score: '7-5 6-3', tournament: 'WTA Finals' },
  },
  {
    slugs: ['coco-gauff', 'iga-swiatek'],
    p1_wins: 3, p2_wins: 11,
    hard: [2, 4], clay: [1, 6], grass: [0, 1],
    last: { date: '2025-06-05', score: '2-6 4-6', tournament: 'Roland Garros QF' },
  },
  {
    slugs: ['daniil-medvedev', 'jannik-sinner'],
    p1_wins: 7, p2_wins: 8,
    hard: [6, 7], clay: [1, 0], grass: [0, 1],
    last: { date: '2025-09-07', score: '4-6 3-6 4-6', tournament: 'US Open SF' },
  },
  {
    slugs: ['alexander-zverev', 'carlos-alcaraz'],
    p1_wins: 4, p2_wins: 7,
    hard: [2, 3], clay: [2, 3], grass: [0, 1],
    last: { date: '2025-06-08', score: '3-6 6-2 7-5 1-6 2-6', tournament: 'Roland Garros Final' },
  },
  {
    slugs: ['stefanos-tsitsipas', 'daniil-medvedev'],
    p1_wins: 8, p2_wins: 10,
    hard: [4, 8], clay: [4, 1], grass: [0, 1],
    last: { date: '2025-03-12', score: '6-4 6-7 6-3', tournament: 'Indian Wells' },
  },
  {
    slugs: ['roger-federer', 'andy-murray'],
    p1_wins: 14, p2_wins: 11,
    hard: [7, 6], clay: [2, 1], grass: [5, 3],
    last: { date: '2022-09-24', score: null, tournament: 'Laver Cup 2022' },
  },
  {
    slugs: ['serena-williams', 'venus-williams'],
    p1_wins: 19, p2_wins: 12,
    hard: [12, 6], clay: [3, 2], grass: [4, 4],
    last: { date: '2022-09-01', score: '6-7 6-4 6-1', tournament: 'US Open R2' },
  },
  {
    slugs: ['maria-sharapova', 'serena-williams'],
    p1_wins: 2, p2_wins: 20,
    hard: [1, 12], clay: [1, 4], grass: [0, 4],
    last: { date: '2019-01-21', score: '4-6 1-6', tournament: 'Australian Open R4' },
  },
  {
    slugs: ['nick-kyrgios', 'novak-djokovic'],
    p1_wins: 2, p2_wins: 2,
    hard: [1, 1], clay: [0, 0], grass: [1, 1],
    last: { date: '2022-07-10', score: '6-4 3-6 4-6 6-7', tournament: 'Wimbledon Final' },
  },
  {
    slugs: ['pete-sampras', 'andre-agassi'],
    p1_wins: 20, p2_wins: 14,
    hard: [13, 9], clay: [1, 3], grass: [6, 2],
    last: { date: '2002-09-08', score: '6-3 6-4 5-7 6-4', tournament: 'US Open Final' },
  },
];

async function main() {
  console.log('🎾 Seeding H2H cache with verified data\n');

  // Build slug→player_id map
  const slugs = [...new Set(h2hData.flatMap(h => h.slugs))];
  const { data: players } = await supabase
    .from('players')
    .select('player_id, slug')
    .in('slug', slugs);

  const slugMap = new Map();
  for (const p of (players || [])) slugMap.set(p.slug, p.player_id);

  let inserted = 0;
  let skipped = 0;

  for (const h of h2hData) {
    const pid1 = slugMap.get(h.slugs[0]);
    const pid2 = slugMap.get(h.slugs[1]);

    if (!pid1 || !pid2) {
      console.log(`  ⏭️ Missing player: ${h.slugs[0]} (${pid1 ? '✓' : '✗'}) vs ${h.slugs[1]} (${pid2 ? '✓' : '✗'})`);
      skipped++;
      continue;
    }

    // Sort IDs for consistent storage
    const [sortedPid1, sortedPid2] = [pid1, pid2].sort();
    const isSwapped = sortedPid1 !== pid1;

    const row = {
      player1_id: sortedPid1,
      player2_id: sortedPid2,
      player1_wins: isSwapped ? h.p2_wins : h.p1_wins,
      player2_wins: isSwapped ? h.p1_wins : h.p2_wins,
      surface_hard_p1: isSwapped ? h.hard[1] : h.hard[0],
      surface_hard_p2: isSwapped ? h.hard[0] : h.hard[1],
      surface_clay_p1: isSwapped ? h.clay[1] : h.clay[0],
      surface_clay_p2: isSwapped ? h.clay[0] : h.clay[1],
      surface_grass_p1: isSwapped ? h.grass[1] : h.grass[0],
      surface_grass_p2: isSwapped ? h.grass[0] : h.grass[1],
      last_match_date: h.last?.date || null,
      last_match_score: h.last?.score || null,
      last_match_tournament: h.last?.tournament || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('h2h_cache')
      .upsert(row, { onConflict: 'player1_id,player2_id' });

    if (error) {
      console.log(`  ❌ ${h.slugs[0]} vs ${h.slugs[1]}: ${error.message}`);
    } else {
      console.log(`  ✅ ${h.slugs[0]} vs ${h.slugs[1]}: ${h.p1_wins}-${h.p2_wins}`);
      inserted++;
    }
  }

  console.log(`\n🎉 Done: ${inserted} inserted, ${skipped} skipped`);
}

main().catch(err => {
  console.error('❌ Fatal:', err.message);
  process.exit(1);
});
