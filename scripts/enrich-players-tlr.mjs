#!/usr/bin/env node
/**
 * SUPER.TENNIS — Player Enrichment from TennisLiveRanking.com
 *
 * Fetches player profiles: bio, coach, socials, career stats,
 * YTD stats, serving stats, return stats.
 * Never overwrites good data with empty/zero values.
 *
 * Usage:
 *   node scripts/enrich-players-tlr.mjs [--dry-run] [--limit=50] [--force]
 *
 * Requires env: SUPABASE_URL, SUPABASE_SERVICE_KEY
 * Optional env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const TELEGRAM_BOT = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT = process.env.TELEGRAM_CHAT_ID;

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');
const LIMIT_FLAG = process.argv.find(a => a.startsWith('--limit='));
const LIMIT = LIMIT_FLAG ? parseInt(LIMIT_FLAG.split('=')[1]) : 200;

const BASE_URL = 'https://tennisliveranking.com';
const FETCH_DELAY_MS = 1200; // polite scraping
const MAX_RETRIES = 2;      // retry transient network errors

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Utilities ─────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/** Fetch with exponential-backoff retry on network errors (not HTTP errors) */
async function fetchWithRetry(url, options) {
  let lastErr;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) await sleep(FETCH_DELAY_MS * attempt * 2);
    try {
      return await fetch(url, options);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

async function sendTelegramAlert(message) {
  if (!TELEGRAM_BOT || !TELEGRAM_CHAT) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT,
        text: `🎾 Player Enrichment\n\n${message}`,
      }),
    });
  } catch { /* silent */ }
}

// ─── Parse player profile HTML ─────────────────────────
function parsePlayerProfile(html) {
  const data = {};

  // --- Bio fields: tries multiple HTML patterns used by TLR ---
  // TLR uses both <strong>Label</strong> Value AND <div>Label</div>...<strong>Value</strong>
  const bioField = (label) => {
    // Pattern 1: <strong>Label</strong> Value (old format)
    const re1 = new RegExp(`<strong[^>]*>${label}<\\/strong>\\s*([^<]+)`, 'i');
    const m1 = html.match(re1);
    if (m1 && m1[1].trim()) return m1[1].trim();

    // Pattern 2: <div>Label</div>...<strong>Value</strong> (same as serving stats)
    const re2 = new RegExp(`<div[^>]*>\\s*${label}\\s*<\\/div>[\\s\\S]{0,300}?<strong[^>]*>\\s*([^<]+?)\\s*<\\/strong>`, 'i');
    const m2 = html.match(re2);
    if (m2 && m2[1].trim()) return m2[1].trim();

    // Pattern 3: <th/td/dt/span>Label</...> <td/dd/span>Value</...>
    const re3 = new RegExp(`>${label}(?::|)<\\/(?:th|td|dt|span|li)[^>]*>\\s*<(?:td|dd|span|li)[^>]*>\\s*([^<]+)`, 'i');
    const m3 = html.match(re3);
    if (m3 && m3[1].trim()) return m3[1].trim();

    return null;
  };

  data.birthplace = bioField('Birthplace');
  data.coach = bioField('Coach');

  const plays = bioField('Plays');
  if (plays) {
    data.hand = plays.includes('Left') ? 'L' : plays.includes('Right') ? 'R' : null;
    data.backhand = plays.includes('Two') ? 'two-handed' : plays.includes('One') ? 'one-handed' : null;
  }

  const turnedPro = bioField('Turned pro');
  data.turned_pro = turnedPro ? parseInt(turnedPro) || null : null;

  // Height/weight from schema.org JSON-LD
  const heightMatch = html.match(/"height"\s*:\s*"(\d+)\s*cm"/);
  if (heightMatch) data.height_cm = parseInt(heightMatch[1]);

  const weightMatch = html.match(/"weight"\s*:\s*"(\d+)\s*kg"/);
  if (weightMatch) data.weight_kg = parseInt(weightMatch[1]);

  const dobMatch = html.match(/"birthDate"\s*:\s*"(\d{4}-\d{2}-\d{2})"/);
  if (dobMatch) data.birth_date = dobMatch[1];

  // --- Social links ---
  const socialPatterns = [
    { key: 'social_instagram', re: /href="(https?:\/\/(?:www\.)?instagram\.com\/[^"]+)"/i },
    { key: 'social_twitter', re: /href="(https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^"]+)"/i },
    { key: 'social_facebook', re: /href="(https?:\/\/(?:www\.)?facebook\.com\/[^"]+)"/i },
  ];
  for (const { key, re } of socialPatterns) {
    const m = html.match(re);
    if (m) data[key] = m[1];
  }

  // --- Career stats ---
  // TLR uses <div>Label</div>...<strong>Value</strong> structure (same as serving stats)
  // We use two section strategies: isolated section + full-page fallback
  const careerSectionMatch = html.match(/(<(?:section|div)[^>]*>(?:(?!<\/section|<\/div).)*Career(?:(?!<\/section|<\/div).)*<\/(?:section|div)>)/is)
    || html.match(/Career[\s\S]{0,50}?(<div[\s\S]*?)<(?:section|h[234])/i);

  // Helper: find <div>Label</div>...<strong>Number</strong> in a block
  const sectionStat = (block, label) => {
    const re = new RegExp(`<div[^>]*>\\s*${label}\\s*<\\/div>[\\s\\S]{0,200}?<strong[^>]*>\\s*([\\d,.]+)\\s*<\\/strong>`, 'i');
    const m = block.match(re);
    return m ? m[1].replace(/,/g, '') : null;
  };

  // Also try <strong>Number</strong> Label (reversed pattern)
  const reverseStat = (block, label) => {
    const re = new RegExp(`<strong[^>]*>\\s*(\\d+)\\s*<\\/strong>\\s*(?:<[^>]*>\\s*)*${label}`, 'i');
    const m = block.match(re);
    return m ? m[1] : null;
  };

  const careerBlock = careerSectionMatch ? (careerSectionMatch[1] || careerSectionMatch[0]) : null;

  if (careerBlock) {
    // Titles — must be a distinct stat (NOT wins count). Validate: titles << wins for most players
    const titlesRaw = sectionStat(careerBlock, 'Titles') || reverseStat(careerBlock, 'Titles');
    if (titlesRaw) data.career_titles = parseInt(titlesRaw);

    // W/L record — original regex that was proven to work
    const wlMatch = careerBlock.match(/<strong>\s*(\d+)\s*W\s*\/\s*(\d+)\s*L/i)
      || careerBlock.match(/(\d+)\s*W\s*\/\s*(\d+)\s*L/i)
      || careerBlock.match(/<strong[^>]*>\s*(\d+)\s*<\/strong>\s*[/]\s*<strong[^>]*>\s*(\d+)\s*<\/strong>/i);
    if (wlMatch) {
      data.career_win = parseInt(wlMatch[1]);
      data.career_loss = parseInt(wlMatch[2]);
    }

    // Prize money
    const prizeMatch = careerBlock.match(/\$\s*([\d,]+)/);
    if (prizeMatch) data.career_prize_usd = parseInt(prizeMatch[1].replace(/,/g, ''));

    // Best ranking — strict: must be a small integer 1-999, not a year
    const rankRaw = sectionStat(careerBlock, 'Best Rank(?:ing)?')
      || reverseStat(careerBlock, 'Best Rank(?:ing)?');
    if (rankRaw) {
      const rankNum = parseInt(rankRaw);
      // Reject year-like values (1990-2030) and implausibly high rankings
      if (rankNum > 0 && rankNum < 1500 && !(rankNum >= 1990 && rankNum <= 2030)) {
        data.best_ranking = rankNum;
      }
    }
  }

  // --- YTD stats ---
  const ytdSection = html.match(/YTD\s+\d{4}[\s\S]*?(<div[\s\S]*?)<(?:section|h[234])/i);
  if (ytdSection) {
    const sec = ytdSection[1];
    const titlesMatch = sec.match(/<strong>\s*(\d+)\s*<\/strong>\s*Titles/i)
      || sec.match(/Titles[\s\S]*?<strong>\s*(\d+)/i);
    if (titlesMatch) data.ytd_titles = parseInt(titlesMatch[1]);

    const wlMatch = sec.match(/(\d+)\s*W\s*\/\s*(\d+)\s*L/i);
    if (wlMatch) {
      data.ytd_win = parseInt(wlMatch[1]);
      data.ytd_loss = parseInt(wlMatch[2]);
    }

    const prizeMatch = sec.match(/\$\s*([\d,]+)/);
    if (prizeMatch) data.ytd_prize_usd = parseInt(prizeMatch[1].replace(/,/g, ''));
  }

  // --- Serving stats ---
  // HTML format: <div>Label</div>\n<strong>Value</strong>
  const serveSection = html.match(/Serving Stats<\/h3>([\s\S]*?)(?:Return Stats|<\/section|$)/i);
  if (serveSection) {
    const sec = serveSection[1];
    const serveStat = (label) => {
      const re = new RegExp(`<div>${label}<\\/div>[\\s\\S]*?<strong[^>]*>\\s*([\\d,.]+)`, 'i');
      const m = sec.match(re);
      return m ? parseFloat(m[1].replace(/,/g, '')) : null;
    };

    data.serve_aces = serveStat('Aces') != null ? Math.round(serveStat('Aces')) : null;
    data.serve_double_faults = serveStat('Double Faults') != null ? Math.round(serveStat('Double Faults')) : null;
    data.serve_1st_pct = serveStat('1st Serve %');
    data.serve_1st_won_pct = serveStat('1st Serve Won');
    data.serve_2nd_won_pct = serveStat('2nd Serve Won');
    data.serve_bp_saved_pct = serveStat('Break Points Saved');
    data.serve_points_won_pct = serveStat('Service Points Won');
    data.serve_hold_pct = serveStat('Service Games Won');
  }

  // --- Return stats ---
  const returnSection = html.match(/Return Stats<\/h3>([\s\S]*?)(?:<\/section|<h[23]|$)/i);
  if (returnSection) {
    const sec = returnSection[1];
    const retStat = (label) => {
      const re = new RegExp(`<div>${label}<\\/div>[\\s\\S]*?<strong[^>]*>\\s*([\\d,.]+)`, 'i');
      const m = sec.match(re);
      return m ? parseFloat(m[1].replace(/,/g, '')) : null;
    };

    data.return_points_won_pct = retStat('Return Points Won');
    data.return_1st_won_pct = retStat('1st Return Points Won');
    data.return_2nd_won_pct = retStat('2nd Return Points Won');
    data.return_bp_converted_pct = retStat('Break Points Converted');
    data.return_games_won_pct = retStat('Return Games Won');
  }

  return data;
}

// ─── Post-parse validation: reject implausible values ──
function validateParsed(parsed, existing) {
  const issues = [];

  // career_titles must be much less than career_win for real players
  // If equal or very close, it's a parser bug (wins written as titles)
  if (parsed.career_titles !== undefined && parsed.career_win !== undefined) {
    if (parsed.career_titles === parsed.career_win) {
      issues.push(`career_titles(${parsed.career_titles}) == career_win — parser bug, nulling titles`);
      delete parsed.career_titles;
    }
    // Titles can't exceed wins (impossible in tennis)
    if (parsed.career_titles > parsed.career_win) {
      issues.push(`career_titles(${parsed.career_titles}) > career_win(${parsed.career_win}) — impossible, nulling`);
      delete parsed.career_titles;
    }
    // Sanity: no active player has more than 200 ATP/WTA titles
    if (parsed.career_titles > 200) {
      issues.push(`career_titles(${parsed.career_titles}) > 200 — implausible, nulling`);
      delete parsed.career_titles;
    }
  } else if (parsed.career_titles !== undefined && existing.career_win) {
    if (parsed.career_titles === existing.career_win || parsed.career_titles > existing.career_win) {
      issues.push(`career_titles(${parsed.career_titles}) matches/exceeds existing career_win — parser bug, nulling`);
      delete parsed.career_titles;
    }
  }

  // best_ranking: must be a real ranking 1-999, not a year or title count
  if (parsed.best_ranking !== undefined) {
    const rank = parsed.best_ranking;
    // Reject year-like values (15-30 are suspiciously close to abbreviated years 2015-2030)
    // Specifically: if career_win > 100, career high can't be worse than #80
    if (rank > 80 && existing.career_win && existing.career_win >= 100) {
      issues.push(`best_ranking(${rank}) implausible for player with ${existing.career_win} wins — nulling`);
      delete parsed.best_ranking;
    }
    // Reject if value looks like a title count (e.g., Nadal 92 titles → rank 92)
    if (existing.career_titles && rank === existing.career_titles) {
      issues.push(`best_ranking(${rank}) == career_titles — likely title count captured as rank, nulling`);
      delete parsed.best_ranking;
    }
  }

  return issues;
}

// ─── Safety: never overwrite good data with null/zero ──
function safeMerge(existing, parsed) {
  // Run validation first, removing implausible values
  const validationIssues = validateParsed(parsed, existing);
  if (validationIssues.length > 0) {
    for (const issue of validationIssues) {
      console.log(`    ⚠️  Validation: ${issue}`);
    }
  }

  const update = {};
  let changes = 0;

  for (const [key, newVal] of Object.entries(parsed)) {
    if (newVal === null || newVal === undefined || newVal === '') continue;
    if (typeof newVal === 'number' && isNaN(newVal)) continue;

    // Don't overwrite existing non-null values with zeros
    if (typeof newVal === 'number' && newVal === 0 && existing[key] && existing[key] > 0) continue;

    // Only update if value actually changed
    if (existing[key] !== newVal) {
      update[key] = newVal;
      changes++;
    }
  }

  if (changes > 0) {
    update.stats_updated_at = new Date().toISOString();
  }

  return { update, changes };
}

// ─── Main ──────────────────────────────────────────────
async function main() {
  console.log('🎾 SUPER.TENNIS Player Enrichment (TennisLiveRanking)\n');
  if (DRY_RUN) console.log('🏜️  DRY RUN MODE\n');

  // Get players that have TLR IDs (set by rankings update)
  let query = supabase
    .from('players')
    .select('player_id, first_name, last_name, slug, tour, tlr_player_id, tlr_slug, height_cm, weight_kg, birth_date, birthplace, coach, backhand, hand, turned_pro, career_titles, career_win, career_loss, career_prize_usd, best_ranking, ytd_titles, ytd_win, ytd_loss, ytd_prize_usd, social_instagram, social_twitter, social_facebook, serve_aces, serve_1st_pct, return_points_won_pct, stats_updated_at')
    .not('tlr_player_id', 'is', null)
    .order('career_titles', { ascending: false, nullsFirst: false })
    .limit(LIMIT);

  // Skip recently enriched unless --force
  if (!FORCE) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    query = query.or(`stats_updated_at.is.null,stats_updated_at.lt.${oneDayAgo}`);
  }

  const { data: players, error } = await query;

  if (error) {
    console.error('❌ DB error:', error.message);
    process.exit(1);
  }

  console.log(`📋 Found ${players.length} players to enrich\n`);

  if (players.length === 0) {
    console.log('✅ All players up to date');
    return;
  }

  let enriched = 0;
  let failed = 0;
  let skipped = 0;
  const fieldCounts = {}; // track which fields get updated most

  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    const url = `${BASE_URL}/player/${p.tlr_slug}/${p.tlr_player_id}`;
    const label = `[${i + 1}/${players.length}] ${p.first_name} ${p.last_name}`;

    try {
      const res = await fetchWithRetry(url, {
        headers: {
          'User-Agent': 'SuperTennis/1.0 (https://super.tennis)',
          'Accept': 'text/html',
        },
      });

      if (!res.ok) {
        console.log(`  ⚠️ ${label}: HTTP ${res.status}`);
        failed++;
        await sleep(FETCH_DELAY_MS);
        continue;
      }

      const html = await res.text();
      const parsed = parsePlayerProfile(html);
      const { update, changes } = safeMerge(p, parsed);

      if (changes === 0) {
        console.log(`  ⏭️ ${label}: no new data`);
        skipped++;
      } else if (DRY_RUN) {
        console.log(`  📝 ${label}: ${changes} fields would update`);
        const keys = Object.keys(update).filter(k => k !== 'stats_updated_at');
        console.log(`     Fields: ${keys.join(', ')}`);
        enriched++;
      } else {
        const { error: updateErr } = await supabase
          .from('players')
          .update(update)
          .eq('player_id', p.player_id);

        if (updateErr) {
          console.log(`  ❌ ${label}: ${updateErr.message}`);
          failed++;
        } else {
          const keys = Object.keys(update).filter(k => k !== 'stats_updated_at');
          keys.forEach(k => { fieldCounts[k] = (fieldCounts[k] || 0) + 1; });
          console.log(`  ✅ ${label}: ${changes} fields updated (${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''})`);
          enriched++;
        }
      }
    } catch (err) {
      console.log(`  ❌ ${label}: ${err.message}`);
      failed++;
    }

    if (i < players.length - 1) await sleep(FETCH_DELAY_MS);
  }

  const summary = `\n🎉 Enrichment complete!\n  ✅ Enriched: ${enriched}\n  ⏭️ Skipped: ${skipped}\n  ❌ Failed: ${failed}`;
  console.log(summary);

  // Build detailed Telegram report
  if (!DRY_RUN) {
    const topFields = Object.entries(fieldCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k, n]) => `${k}(${n})`)
      .join(', ');
    const failRate = players.length > 0 ? Math.round((failed / players.length) * 100) : 0;
    if (failed > players.length * 0.3) {
      await sendTelegramAlert(
        `⚠️ Enrichment: HIGH FAILURE RATE\n` +
        `${failed}/${players.length} players failed (${failRate}%)\n` +
        `✅ ${enriched} updated · ⏭️ ${skipped} skipped`
      );
    } else if (enriched > 0) {
      await sendTelegramAlert(
        `🎾 Player enrichment done\n` +
        `✅ ${enriched} updated · ⏭️ ${skipped} skipped · ❌ ${failed} failed\n` +
        `📊 Top fields: ${topFields || 'n/a'}`
      );
    }
  }
}

main().catch(async (err) => {
  console.error('❌ Fatal:', err.message);
  await sendTelegramAlert(`❌ Enrichment crashed: ${err.message}`);
  process.exit(1);
});
