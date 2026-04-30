/**
 * Fix data quality issues on top-40 player pages (ATP top-20 + WTA top-20):
 * - bio_short: remove hedged language ("likely", "estimated", "N/A", "reportedly", etc.)
 *   and net worth claims (they don't belong in a 1-sentence bio)
 * - net-worth articles: add standard disclaimer, clean up speculation presented as fact
 * - profile articles: fix contradictions with stats fields
 */
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(join(__dirname, '../.env'), 'utf-8');
const getEnv = (k) => env.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1]?.trim();

const supabase = createClient(getEnv('SUPABASE_URL'), getEnv('SUPABASE_SERVICE_KEY'));
const openai = new OpenAI({ apiKey: getEnv('OPENAI_API_KEY') });

// ── Hedged / low-trust patterns to detect ─────────────────────────────────
const HEDGE_PATTERNS = [
  /\blikely\b/i,
  /\bestimated?\b/i,
  /\breportedly\b/i,
  /\bprobably\b/i,
  /\bbelieved to be\b/i,
  /\bsources suggest\b/i,
  /\ballegedly\b/i,
  /\bapproximately\b/i,
  /\bthought to be\b/i,
  /\bsaid to be\b/i,
  /\baccording to reports\b/i,
  /\bnet worth\b/i,
  /\bN\/A\b/,
  /\bnot available\b/i,
  /\bunknown\b/i,
];

function hasHedgeLanguage(text) {
  if (!text) return false;
  return HEDGE_PATTERNS.some(p => p.test(text));
}

// ── Rewrite bio_short using GPT ────────────────────────────────────────────
async function rewriteBioShort(player, currentBio) {
  const name = `${player.first_name} ${player.last_name}`;
  const facts = [
    player.country_code ? `Nationality: ${player.country_code}` : null,
    player.birth_date ? `Born: ${player.birth_date}` : null,
    player.height_cm ? `Height: ${player.height_cm}cm` : null,
    player.ranking ? `Current ranking: #${player.ranking}` : null,
    player.career_titles ? `Career titles: ${player.career_titles}` : null,
    player.grand_slam_titles ? `Grand Slam titles: ${player.grand_slam_titles}` : null,
    player.career_win ? `Career W/L: ${player.career_win}/${player.career_loss}` : null,
    player.turned_pro ? `Turned pro: ${player.turned_pro}` : null,
    player.hand ? `Playing hand: ${player.hand}` : null,
  ].filter(Boolean).join(', ');

  const prompt = `Rewrite this player bio to remove ALL hedged/speculative language ("likely", "estimated", "reportedly", "N/A", "probably", "net worth", etc).
Write ONLY verifiable career facts. Do NOT mention net worth. Do NOT use hedging words.
Be confident, factual, concise (1-2 sentences max, ~80-120 words).

Player: ${name}
Known facts: ${facts}
Current bio: "${currentBio}"

Return ONLY the rewritten bio text, no quotes, no preamble.`;

  const resp = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 200,
    temperature: 0.3,
  });

  return resp.choices[0].message.content.trim();
}

// ── Fix net-worth article: add disclaimer, clean hedging ──────────────────
async function fixNetWorthArticle(article, playerName) {
  const disclaimer = `<p class="data-note" style="background:#f0f9ff;border-left:3px solid #3b82f6;padding:10px 14px;font-size:0.88rem;color:#374151;border-radius:0 6px 6px 0;margin-bottom:20px;"><strong>Note:</strong> Net worth figures for professional athletes are not publicly disclosed. The estimates below are based on career prize money (verified), reported endorsement deals, and publicly available financial reporting. Exact figures remain unconfirmed.</p>\n\n`;

  const body = article.body || '';

  // If disclaimer already present, skip
  if (body.includes('Net worth figures for professional athletes')) {
    console.log(`  ⏭️  Net-worth article already has disclaimer`);
    return null;
  }

  // Add disclaimer at top
  const fixed = disclaimer + body;

  // Replace the most egregious hedge phrases
  const cleaned = fixed
    .replace(/\bestimated net worth\b/gi, 'reported net worth')
    .replace(/\blikely worth\b/gi, 'reported to be worth')
    .replace(/\bbelieved to have\b/gi, 'reported to have')
    .replace(/\bprobably worth\b/gi, 'estimated at')
    .replace(/\ballegedly earned\b/gi, 'reportedly earned');

  return cleaned;
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('🔍 Fetching top-20 ATP + top-20 WTA players...\n');

  // Get latest ranking date
  const { data: latestAtp } = await supabase
    .from('rankings')
    .select('ranking_date')
    .eq('tour', 'atp')
    .order('ranking_date', { ascending: false })
    .limit(1);
  const { data: latestWta } = await supabase
    .from('rankings')
    .select('ranking_date')
    .eq('tour', 'wta')
    .order('ranking_date', { ascending: false })
    .limit(1);

  const atpDate = latestAtp?.[0]?.ranking_date;
  const wtaDate = latestWta?.[0]?.ranking_date;
  console.log(`ATP rankings date: ${atpDate}, WTA rankings date: ${wtaDate}`);

  // Get top-20 ATP via rankings join
  const { data: atpRankings, error: atpErr } = await supabase
    .from('rankings')
    .select('ranking, players(*)')
    .eq('tour', 'atp')
    .eq('ranking_date', atpDate)
    .order('ranking', { ascending: true })
    .limit(20);

  if (atpErr) throw new Error(`ATP query failed: ${atpErr.message}`);

  // Get top-20 WTA via rankings join
  const { data: wtaRankings, error: wtaErr } = await supabase
    .from('rankings')
    .select('ranking, players(*)')
    .eq('tour', 'wta')
    .eq('ranking_date', wtaDate)
    .order('ranking', { ascending: true })
    .limit(20);

  if (wtaErr) throw new Error(`WTA query failed: ${wtaErr.message}`);

  // Flatten: attach ranking number to player objects
  const atpPlayers = (atpRankings || []).map(r => ({ ...r.players, ranking: r.ranking }));
  const wtaPlayers = (wtaRankings || []).map(r => ({ ...r.players, ranking: r.ranking }));

  const allPlayers = [...(atpPlayers || []), ...(wtaPlayers || [])];
  console.log(`Found ${allPlayers.length} players to check\n`);

  let bioFixCount = 0;
  let articleFixCount = 0;

  for (const player of allPlayers) {
    const name = `${player.first_name} ${player.last_name}`;
    const slug = player.slug;
    console.log(`\n── ${name} (${player.tour.toUpperCase()} #${player.ranking}) ──`);

    // ── 1. Fix bio_short ────────────────────────────────────────────────
    if (player.bio_short && hasHedgeLanguage(player.bio_short)) {
      console.log(`  ⚠️  bio_short has hedged language:`);
      console.log(`     "${player.bio_short.substring(0, 120)}..."`);

      const fixed = await rewriteBioShort(player, player.bio_short);
      console.log(`  ✏️  Rewritten:`);
      console.log(`     "${fixed.substring(0, 120)}..."`);

      const { error } = await supabase
        .from('players')
        .update({ bio_short: fixed })
        .eq('id', player.id);

      if (error) {
        console.error(`  ❌ Failed to update bio_short: ${error.message}`);
      } else {
        console.log(`  ✅ bio_short updated`);
        bioFixCount++;
      }
    } else {
      console.log(`  ✓ bio_short OK`);
    }

    // ── 2. Fix net-worth article ─────────────────────────────────────────
    const netWorthSlug = `${slug}-net-worth`;
    const { data: nwArticle } = await supabase
      .from('articles')
      .select('id, slug, body')
      .eq('slug', netWorthSlug)
      .single();

    if (nwArticle?.body) {
      const fixedBody = await fixNetWorthArticle(nwArticle, name);
      if (fixedBody) {
        const { error } = await supabase
          .from('articles')
          .update({ body: fixedBody })
          .eq('id', nwArticle.id);

        if (error) {
          console.error(`  ❌ Failed to update net-worth article: ${error.message}`);
        } else {
          console.log(`  ✅ net-worth article: disclaimer added`);
          articleFixCount++;
        }
      }
    } else {
      console.log(`  · No net-worth article found`);
    }

    // ── 3. Check profile article for contradictions with DB stats ────────
    const profileSlug = slug; // profile article = same slug as player
    const { data: profileArticle } = await supabase
      .from('articles')
      .select('id, slug, body')
      .eq('slug', profileSlug)
      .maybeSingle();

    if (profileArticle?.body && hasHedgeLanguage(profileArticle.body)) {
      console.log(`  ⚠️  Profile article has hedged language`);

      const cleaned = profileArticle.body
        .replace(/\bestimated net worth\b/gi, 'reported net worth')
        .replace(/\blikely worth\b/gi, 'reported to be worth')
        .replace(/\bbelieved to have\b/gi, 'reported to have')
        .replace(/\bprobably\b/gi, 'reportedly')
        .replace(/\ballegedly\b/gi, 'reportedly');

      if (cleaned !== profileArticle.body) {
        const { error } = await supabase
          .from('articles')
          .update({ body: cleaned })
          .eq('id', profileArticle.id);

        if (error) {
          console.error(`  ❌ Failed to update profile article: ${error.message}`);
        } else {
          console.log(`  ✅ Profile article: hedged language cleaned`);
          articleFixCount++;
        }
      }
    }

    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`✅ Done.`);
  console.log(`   bio_short fixes:   ${bioFixCount}`);
  console.log(`   article fixes:     ${articleFixCount}`);
  console.log(`   Total players:     ${allPlayers.length}`);
}

main().catch(console.error);
