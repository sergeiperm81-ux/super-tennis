#!/usr/bin/env node
/**
 * SUPER.TENNIS — Prize Money Import Script
 *
 * Updates career_prize_usd for players in Supabase.
 * Data sourced from publicly available ATP/WTA career earnings records.
 *
 * Usage: node scripts/import-prize-money.mjs
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

// ─── Career Prize Money Data (USD) ─────────────────────────
// Source: ATP Tour & WTA Tour official career earnings (public records)
// Updated: March 2026 (approximate career totals)
const PRIZE_MONEY = {
  // === ATP — Top Career Earners ===
  'novak-djokovic': 185_000_000,
  'rafael-nadal': 135_000_000,
  'roger-federer': 131_000_000,
  'carlos-alcaraz': 38_000_000,
  'jannik-sinner': 32_000_000,
  'alexander-zverev': 43_000_000,
  'daniil-medvedev': 32_000_000,
  'andy-murray': 64_000_000,
  'stefanos-tsitsipas': 25_000_000,
  'andrey-rublev': 18_000_000,
  'casper-ruud': 16_000_000,
  'holger-rune': 10_000_000,
  'taylor-fritz': 14_000_000,
  'hubert-hurkacz': 12_000_000,
  'felix-auger-aliassime': 10_500_000,
  'tommy-paul': 9_000_000,
  'grigor-dimitrov': 22_000_000,
  'alex-de-minaur': 11_000_000,
  'nick-kyrgios': 12_500_000,
  'ben-shelton': 5_000_000,
  'stan-wawrinka': 36_000_000,
  'dominic-thiem': 29_000_000,
  'marin-cilic': 26_000_000,
  'kei-nishikori': 25_000_000,
  'milos-raonic': 18_000_000,
  'john-isner': 18_500_000,
  'gael-monfils': 22_000_000,
  'matteo-berrettini': 10_500_000,
  'cameron-norrie': 8_000_000,
  'denis-shapovalov': 8_000_000,
  'diego-schwartzman': 12_000_000,
  'roberto-bautista-agut': 18_000_000,
  'david-goffin': 14_000_000,
  'pablo-carreno-busta': 14_500_000,
  'karen-khachanov': 10_000_000,
  'frances-tiafoe': 8_500_000,
  'lorenzo-musetti': 5_500_000,
  'sebastian-korda': 4_500_000,
  'jack-draper': 4_000_000,
  'ugo-humbert': 5_000_000,
  'arthur-fils': 3_000_000,
  'flavio-cobolli': 2_500_000,
  'francisco-cerundolo': 4_000_000,
  'tomas-machac': 3_500_000,
  'alejandro-tabilo': 3_000_000,
  'jiri-lehecka': 3_500_000,
  'thanasi-kokkinakis': 3_000_000,

  // ATP Legends
  'pete-sampras': 43_280_000,
  'andre-agassi': 31_152_000,
  'boris-becker': 25_080_000,
  'john-mcenroe': 12_500_000,
  'bjorn-borg': 3_650_000,
  'ivan-lendl': 21_262_000,
  'jimmy-connors': 8_641_000,
  'stefan-edberg': 20_630_000,
  'lleyton-hewitt': 20_887_000,
  'david-ferrer': 31_483_000,
  'juan-martin-del-potro': 25_905_000,
  'tomas-berdych': 20_000_000,
  'jo-wilfried-tsonga': 21_000_000,
  'richard-gasquet': 18_500_000,
  'nikolay-davydenko': 16_100_000,
  'andy-roddick': 20_640_000,
  'michael-chang': 11_200_000,
  'jim-courier': 7_900_000,
  'gustavo-kuerten': 14_800_000,
  'marat-safin': 14_370_000,
  'yevgeny-kafelnikov': 23_783_000,
  'patrick-rafter': 11_127_000,
  'marcelo-rios': 9_500_000,

  // === WTA — Top Career Earners ===
  'serena-williams': 94_816_000,
  'venus-williams': 42_290_000,
  'iga-swiatek': 28_000_000,
  'aryna-sabalenka': 25_000_000,
  'coco-gauff': 15_000_000,
  'elena-rybakina': 15_000_000,
  'jessica-pegula': 13_000_000,
  'ons-jabeur': 10_000_000,
  'maria-sakkari': 10_500_000,
  'qinwen-zheng': 8_000_000,
  'barbora-krejcikova': 11_000_000,
  'karolina-muchova': 6_500_000,
  'daria-kasatkina': 8_000_000,
  'marketa-vondrousova': 6_500_000,
  'jelena-ostapenko': 9_500_000,
  'danielle-collins': 8_500_000,
  'leylah-fernandez': 5_500_000,
  'emma-raducanu': 7_500_000,
  'jasmine-paolini': 6_000_000,
  'anna-kalinskaya': 4_000_000,
  'madison-keys': 14_000_000,
  'belinda-bencic': 11_000_000,
  'donna-vekic': 7_500_000,
  'beatriz-haddad-maia': 5_500_000,
  'petra-kvitova': 36_000_000,
  'victoria-azarenka': 33_000_000,
  'simona-halep': 40_000_000,
  'naomi-osaka': 22_000_000,
  'garbine-muguruza': 24_000_000,
  'angelique-kerber': 30_000_000,
  'karolina-pliskova': 23_000_000,
  'elina-svitolina': 20_000_000,
  'caroline-wozniacki': 35_700_000,
  'ashleigh-barty': 24_000_000,
  'bianca-andreescu': 7_500_000,
  'sloane-stephens': 13_000_000,

  // WTA Legends
  'maria-sharapova': 38_777_000,
  'martina-hingis': 25_000_000,
  'steffi-graf': 21_895_000,
  'monica-seles': 14_891_000,
  'martina-navratilova': 21_626_000,
  'chris-evert': 8_896_000,
  'billie-jean-king': 1_966_000,
  'justine-henin': 20_817_000,
  'kim-clijsters': 24_491_000,
  'lindsay-davenport': 22_166_000,
  'jennifer-capriati': 10_198_000,
  'amelie-mauresmo': 15_098_000,
  'ana-ivanovic': 15_613_000,
  'svetlana-kuznetsova': 19_078_000,
  'li-na': 16_749_000,
  'agnieszka-radwanska': 27_684_000,
  'flavia-pennetta': 11_218_000,
  'dominika-cibulkova': 11_400_000,
  'samantha-stosur': 12_550_000,
};

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  SUPER.TENNIS — Prize Money Import');
  console.log('═══════════════════════════════════════════════');

  const slugs = Object.keys(PRIZE_MONEY);
  console.log(`  💰 ${slugs.length} players with prize money data\n`);

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  // Query each slug directly (DB has 136K+ rows, can't fetch all)
  for (const slug of slugs) {
    const prize = PRIZE_MONEY[slug];
    const { data: rows, error } = await supabase
      .from('players')
      .select('id, first_name, last_name, career_prize_usd, tour')
      .eq('slug', slug)
      .limit(1);

    if (error) {
      console.error(`  ❌ ${slug}: ${error.message}`);
      continue;
    }

    if (!rows || rows.length === 0) {
      console.log(`  ⚠️  ${slug}: not in database`);
      notFound++;
      continue;
    }

    const player = rows[0];
    const current = player.career_prize_usd || 0;

    if (current === prize) {
      skipped++;
      continue;
    }

    const { error: updateError } = await supabase
      .from('players')
      .update({ career_prize_usd: prize })
      .eq('id', player.id);

    if (updateError) {
      console.error(`  ❌ ${slug}: ${updateError.message}`);
    } else {
      console.log(`  ✅ ${player.first_name} ${player.last_name}: $${current.toLocaleString()} → $${prize.toLocaleString()}`);
      updated++;
    }
  }

  console.log('\n───────────────────────────────────────────────');
  console.log(`  ✅ Updated: ${updated} players`);
  console.log(`  ⏭️  Already correct: ${skipped} players`);
  console.log(`  ❓ No data: ${notFound} players (minor players)`);

  // Verification: top 10 by prize money
  console.log('\n🏆 Top 10 Career Prize Money:');
  const { data: top10 } = await supabase
    .from('players')
    .select('first_name, last_name, career_prize_usd, tour')
    .gt('career_prize_usd', 0)
    .order('career_prize_usd', { ascending: false })
    .limit(10);

  if (top10) {
    for (let i = 0; i < top10.length; i++) {
      const p = top10[i];
      console.log(`  ${i + 1}. ${p.first_name} ${p.last_name} (${p.tour.toUpperCase()}): $${p.career_prize_usd.toLocaleString()}`);
    }
  }

  console.log('\n✅ Prize money import complete!');
}

main().catch(console.error);
