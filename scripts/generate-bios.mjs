#!/usr/bin/env node
/**
 * SUPER.TENNIS — AI Bio Generator
 *
 * Generates short player bios using OpenAI gpt-4o-mini.
 * Fetches player data from Supabase, generates bio, and updates the record.
 *
 * Usage: node scripts/generate-bios.mjs [--limit 50] [--tour atp|wta] [--force]
 *
 * Options:
 *   --limit N    Number of players to process (default: 50)
 *   --tour       Filter by tour: atp or wta (default: both)
 *   --force      Regenerate even if bio already exists
 *   --dry-run    Show what would be generated without making API calls
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

if (!OPENAI_KEY || OPENAI_KEY === 'sk-your-key') {
  console.error('❌ Missing or placeholder OPENAI_API_KEY in .env');
  console.error('   Get your key at https://platform.openai.com/api-keys');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Parse CLI args
const args = process.argv.slice(2);
function getArg(name, defaultVal) {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return defaultVal;
  return args[idx + 1] || defaultVal;
}
const LIMIT = parseInt(getArg('limit', '50'));
const TOUR_FILTER = getArg('tour', null);
const FORCE = args.includes('--force');
const DRY_RUN = args.includes('--dry-run');

// Country names for prompt context
const COUNTRIES = {
  USA: 'United States', GBR: 'Great Britain', FRA: 'France', GER: 'Germany',
  ESP: 'Spain', ITA: 'Italy', SRB: 'Serbia', SUI: 'Switzerland', AUS: 'Australia',
  ARG: 'Argentina', CAN: 'Canada', RUS: 'Russia', JPN: 'Japan', CHN: 'China',
  CZE: 'Czech Republic', POL: 'Poland', BLR: 'Belarus', KAZ: 'Kazakhstan',
  NOR: 'Norway', GRE: 'Greece', CRO: 'Croatia', BUL: 'Bulgaria', ROU: 'Romania',
  BRA: 'Brazil', DEN: 'Denmark', RSA: 'South Africa', IND: 'India', KOR: 'South Korea',
  NED: 'Netherlands', BEL: 'Belgium', AUT: 'Austria', SWE: 'Sweden', UKR: 'Ukraine',
  COL: 'Colombia', CHI: 'Chile', GEO: 'Georgia', TUN: 'Tunisia', LAT: 'Latvia',
  EST: 'Estonia', ISR: 'Israel', THA: 'Thailand', TPE: 'Chinese Taipei',
  SVK: 'Slovakia', SLO: 'Slovenia', HUN: 'Hungary', POR: 'Portugal', FIN: 'Finland',
};

function getCountryName(code) {
  return COUNTRIES[code] || code || 'Unknown';
}

function getAge(birthDate) {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// OpenAI API call
async function generateBio(player) {
  const age = getAge(player.birth_date);
  const country = getCountryName(player.country_code);
  const tourName = player.tour === 'atp' ? 'ATP' : 'WTA';
  const gender = player.tour === 'atp' ? 'male' : 'female';
  const hand = player.hand === 'L' ? 'left-handed' : player.hand === 'R' ? 'right-handed' : '';

  const prompt = `Write a concise, engaging biography (2-3 sentences, 40-60 words) for the tennis player ${player.first_name} ${player.last_name}.

Key facts to incorporate:
- Country: ${country}
- Tour: ${tourName} (${gender})
${age ? `- Age: ${age} years old` : ''}
${player.height_cm ? `- Height: ${player.height_cm}cm` : ''}
${hand ? `- Playing hand: ${hand}` : ''}
- Career titles: ${player.career_titles}
${player.grand_slam_titles > 0 ? `- Grand Slam titles: ${player.grand_slam_titles}` : ''}
- Career win-loss: ${player.career_win}-${player.career_loss}

Guidelines:
- Write in third person, present tense for active players
- Focus on their playing style, achievements, or what makes them notable
- Be factual — do NOT invent specific tournament wins or achievements not listed above
- If Grand Slam titles > 0, mention them
- If career titles are high (20+), highlight the accomplishment
- Do NOT include quotes or citations
- Write for a general audience who may not follow tennis closely`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a professional sports journalist writing for a tennis website. Write concise, factual player biographies.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 150,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  const bio = data.choices?.[0]?.message?.content?.trim();

  if (!bio) throw new Error('Empty response from OpenAI');

  return bio;
}

// Generate meta description from bio
function generateMetaDescription(player, bio) {
  const name = `${player.first_name} ${player.last_name}`;
  const country = getCountryName(player.country_code);
  return `${name} tennis player profile from ${country}. Career stats, ${player.career_titles} titles${player.grand_slam_titles > 0 ? `, ${player.grand_slam_titles} Grand Slams` : ''}, rankings and bio.`;
}

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  SUPER.TENNIS — AI Bio Generator');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Model: gpt-4o-mini`);
  console.log(`  Limit: ${LIMIT} players`);
  console.log(`  Tour: ${TOUR_FILTER || 'both'}`);
  console.log(`  Force: ${FORCE}`);
  console.log(`  Dry run: ${DRY_RUN}`);
  console.log('');

  // Fetch players that need bios
  let query = supabase
    .from('players')
    .select('player_id, first_name, last_name, slug, country_code, tour, hand, birth_date, height_cm, career_titles, grand_slam_titles, career_win, career_loss, bio_short')
    .gt('career_titles', 0)
    .order('career_titles', { ascending: false })
    .limit(LIMIT);

  if (TOUR_FILTER) query = query.eq('tour', TOUR_FILTER);
  if (!FORCE) query = query.is('bio_short', null);

  const { data: players, error } = await query;

  if (error) {
    console.error('❌ Supabase error:', error.message);
    process.exit(1);
  }

  if (!players || players.length === 0) {
    console.log('✅ No players need bios! Use --force to regenerate.');
    return;
  }

  console.log(`📋 Found ${players.length} players needing bios\n`);

  let generated = 0;
  let errors = 0;
  const costPerRequest = 0.00015; // ~150 input + 150 output tokens at gpt-4o-mini prices

  for (const player of players) {
    const name = `${player.first_name} ${player.last_name}`;
    process.stdout.write(`  🤖 ${name} (${player.career_titles} titles)... `);

    if (DRY_RUN) {
      console.log('SKIP (dry run)');
      generated++;
      continue;
    }

    try {
      const bio = await generateBio(player);
      const metaDesc = generateMetaDescription(player, bio);

      // Update Supabase
      const { error: updateError } = await supabase
        .from('players')
        .update({
          bio_short: bio,
          meta_description: metaDesc,
        })
        .eq('player_id', player.player_id);

      if (updateError) {
        console.log(`❌ DB error: ${updateError.message}`);
        errors++;
      } else {
        console.log(`✅ (${bio.length} chars)`);
        generated++;
      }

      // Rate limit: 500ms between requests to be safe
      await new Promise(r => setTimeout(r, 500));

    } catch (e) {
      console.log(`❌ ${e.message}`);
      errors++;

      // If rate limited, wait longer
      if (e.message.includes('429')) {
        console.log('    ⏳ Rate limited, waiting 30s...');
        await new Promise(r => setTimeout(r, 30000));
      }
    }
  }

  const estCost = generated * costPerRequest;
  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log(`  ✅ Generated: ${generated} bios`);
  console.log(`  ❌ Errors: ${errors}`);
  console.log(`  💰 Estimated cost: ~$${estCost.toFixed(3)}`);
  console.log('═══════════════════════════════════════════════');

  // Verify — show a few examples
  if (generated > 0 && !DRY_RUN) {
    console.log('\n📝 Sample bios:');
    const { data: samples } = await supabase
      .from('players')
      .select('first_name, last_name, bio_short')
      .not('bio_short', 'is', null)
      .order('career_titles', { ascending: false })
      .limit(3);

    if (samples) {
      for (const s of samples) {
        console.log(`\n  ${s.first_name} ${s.last_name}:`);
        console.log(`  "${s.bio_short}"`);
      }
    }
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
