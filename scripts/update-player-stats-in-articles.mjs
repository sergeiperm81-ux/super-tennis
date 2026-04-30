/**
 * Update outdated numbers in player articles to match current DB stats.
 * Targets: profile, stats, grand-slams, career-timeline articles for top-40 players.
 * Uses GPT to find and replace stale numbers only — keeps prose intact.
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

// Article types to update numbers in
const ARTICLE_TYPES = ['profile', 'stats', 'grand-slams', 'career-timeline'];

function formatPrize(usd) {
  if (!usd || usd === 0) return null;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  return `$${(usd / 1_000).toFixed(0)}K`;
}

function winPct(w, l) {
  if (!w || !l) return null;
  return ((w / (w + l)) * 100).toFixed(1) + '%';
}

// Build a concise "ground truth" facts block for the player
function buildFactsBlock(player, ranking) {
  const lines = [
    `Full name: ${player.first_name} ${player.last_name}`,
    `Tour: ${player.tour?.toUpperCase()}`,
    ranking ? `Current ranking: #${ranking}` : null,
    player.best_ranking ? `Career-high ranking: #${player.best_ranking}` : null,
    player.career_titles != null ? `Career titles: ${player.career_titles}` : null,
    player.grand_slam_titles != null ? `Grand Slam titles: ${player.grand_slam_titles}` : null,
    (player.career_win != null && player.career_loss != null)
      ? `Career win-loss: ${player.career_win}-${player.career_loss} (${winPct(player.career_win, player.career_loss)})` : null,
    player.ytd_titles != null ? `2026 titles: ${player.ytd_titles}` : null,
    (player.ytd_win != null && player.ytd_loss != null)
      ? `2026 record: ${player.ytd_win}-${player.ytd_loss}` : null,
    player.career_prize_usd ? `Career prize money: ${formatPrize(player.career_prize_usd)}` : null,
    player.birth_date ? `Date of birth: ${player.birth_date}` : null,
    player.height_cm ? `Height: ${player.height_cm} cm` : null,
    player.turned_pro ? `Turned pro: ${player.turned_pro}` : null,
  ].filter(Boolean);
  return lines.join('\n');
}

async function updateNumbersInArticle(articleBody, factsBlock, playerName, articleType) {
  // Skip very short articles
  if (!articleBody || articleBody.length < 100) return null;

  const prompt = `You are a sports editor. Update ONLY the factual statistics (numbers, records, rankings, titles) in this article to match the current verified data below.

RULES:
- Change ONLY numbers/stats that contradict the verified facts
- Do NOT rewrite sentences, change tone, or alter structure
- Do NOT change net worth estimates (those are in a separate section)
- Do NOT add new information
- If a stat in the article matches the verified data, leave it untouched
- Return the COMPLETE updated article body (HTML)
- If no numbers need updating, return the exact original text unchanged

VERIFIED FACTS for ${playerName} (as of April 2026):
${factsBlock}

ARTICLE TYPE: ${articleType}
ARTICLE BODY:
${articleBody}`;

  const resp = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 4000,
    temperature: 0.1,
  });

  const updated = resp.choices[0].message.content.trim();

  // Only return if something changed
  if (updated === articleBody) return null;
  // Basic sanity check: result should be similar length (±30%)
  const ratio = updated.length / articleBody.length;
  if (ratio < 0.7 || ratio > 1.4) {
    console.log(`    ⚠️  Result length ratio ${ratio.toFixed(2)} — skipping (GPT likely hallucinated)`);
    return null;
  }

  return updated;
}

async function main() {
  console.log('📊 Fetching top-20 ATP + WTA rankings...\n');

  // Get latest ranking dates
  const { data: latestAtp } = await supabase.from('rankings').select('ranking_date')
    .eq('tour', 'atp').order('ranking_date', { ascending: false }).limit(1);
  const { data: latestWta } = await supabase.from('rankings').select('ranking_date')
    .eq('tour', 'wta').order('ranking_date', { ascending: false }).limit(1);

  const atpDate = latestAtp?.[0]?.ranking_date;
  const wtaDate = latestWta?.[0]?.ranking_date;

  // Get top-20 ATP
  const { data: atpRankings } = await supabase.from('rankings')
    .select('ranking, players(*)')
    .eq('tour', 'atp').eq('ranking_date', atpDate)
    .order('ranking', { ascending: true }).limit(20);

  // Get top-20 WTA
  const { data: wtaRankings } = await supabase.from('rankings')
    .select('ranking, players(*)')
    .eq('tour', 'wta').eq('ranking_date', wtaDate)
    .order('ranking', { ascending: true }).limit(20);

  const allPlayers = [
    ...(atpRankings || []).map(r => ({ ...r.players, _ranking: r.ranking })),
    ...(wtaRankings || []).map(r => ({ ...r.players, _ranking: r.ranking })),
  ];

  console.log(`Processing ${allPlayers.length} players × ${ARTICLE_TYPES.length} article types\n`);

  let totalUpdated = 0;
  let totalSkipped = 0;

  for (const player of allPlayers) {
    const name = `${player.first_name} ${player.last_name}`;
    const slug = player.slug;
    const facts = buildFactsBlock(player, player._ranking);

    console.log(`\n── ${name} (${player.tour?.toUpperCase()} #${player._ranking})`);

    for (const type of ARTICLE_TYPES) {
      const articleSlug = type === 'profile' ? slug : `${slug}-${type}`;

      const { data: article } = await supabase
        .from('articles')
        .select('id, slug, body')
        .eq('slug', articleSlug)
        .maybeSingle();

      if (!article?.body) {
        process.stdout.write(`  · ${type}: not found\n`);
        continue;
      }

      process.stdout.write(`  ↻ ${type}: checking...`);

      const updated = await updateNumbersInArticle(article.body, facts, name, type);

      if (!updated) {
        process.stdout.write(` ✓ no changes\n`);
        totalSkipped++;
        continue;
      }

      const { error } = await supabase
        .from('articles')
        .update({ body: updated, updated_at: new Date().toISOString() })
        .eq('id', article.id);

      if (error) {
        process.stdout.write(` ❌ ${error.message}\n`);
      } else {
        process.stdout.write(` ✅ updated\n`);
        totalUpdated++;
      }

      // Rate limit: GPT-4o-mini allows ~500 RPM, be safe
      await new Promise(r => setTimeout(r, 200));
    }
  }

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`✅ Done.`);
  console.log(`   Articles updated: ${totalUpdated}`);
  console.log(`   No changes:       ${totalSkipped}`);
  console.log(`   Total processed:  ${allPlayers.length * ARTICLE_TYPES.length}`);
}

main().catch(console.error);
