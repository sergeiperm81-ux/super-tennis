/**
 * Offline scoring test — verifies the headline scorer against the
 * actual Jan–Apr 2026 YouTube Studio exports. Real performers should
 * score high; real flops should score low.
 *
 * Run: cd content-factory && node test-scoring.mjs
 *
 * Since 2026-04-16 the scorer is imported directly from the production
 * file — previously this test kept a copy of the logic that drifted
 * silently when A_TIER_STARS or POWER_VERBS were updated.
 */

import { scoreHeadline } from './src/fetch-headlines.js';

// Real dataset from YouTube Studio export (29 Shorts, Jan–Apr 2026).
// Each entry mimics the Supabase row shape enough for the scorer —
// only `title` and `published_at` are read.
const AGE_HOURS = 12; // simulate "fresh" publication for scoring
const freshPublishedAt = new Date(Date.now() - AGE_HOURS * 3600_000).toISOString();

const dataset = [
  { views: 2314, title: "Rafael Nadal's Bold Words: Alcaraz's Loss is No Big Deal!" },
  { views: 2308, title: "Daniil Medvedev's Mid-Match Meltdown: What Happened in Monte Carlo?" },
  { views: 2102, title: "Caroline Garcia Announces Shocking Pregnancy: New Chapter Ahead!" },
  { views: 2055, title: "Serena Williams' Comeback: Inside the Buzz and Hype!" },
  { views: 1978, title: "Daniil Medvedev's Racket Smashing Meltdown: 7 Times in 40 Seconds!" },
  { views: 1926, title: "Shocking Backlash: Aryna Sabalenka's Controversial Kai Trump Photo" },
  { views: 1870, title: "Carlos Alcaraz's Shocking Miami Open Exit: What Went Wrong?" },
  { views: 1786, title: "Jannik Sinner Misses Top 5: Shocking Net Worth Revealed!" },
  { views: 1739, title: "Iga Swiatek's Ex-Coach Speaks Out: 'The Coach Had to Go!'" },
  { views: 1372, title: "Serena Williams' Shocking Comeback Rumors: Is She Ready to Return?" },
  { views: 1205, title: "Djokovic Withdraws from Miami Open!" },
  { views: 1059, title: "Jannik Sinner Apologizes After Heckler Sparks Miami Open Chaos!" },
  { views: 965,  title: "Emma Raducanu's Shocking Withdrawal: What's Behind the Drama?" },
  { views: 832,  title: "Daring Fan Pulls Off Risky Move for Elena Rybakina Souvenir!" },
  { views: 727,  title: "Iga Swiatek's New Coach Faces Backlash: ATP Star Calls It 'Ruthless'" },
  { views: 578,  title: "Mid-Match Drama: Elena Rybakina Shuts Down Coach Amid Tense Battle!" },
  { views: 390,  title: "Bizarre Moment! Tennis Star Storms Off the Court in Tears!" },
  { views: 363,  title: "Diego Schwartzman Celebrates First Home Title in Stunning Fashion!" },
  { views: 251,  title: "Forgotten Tennis Star Spotted Courtside in Walmart Hat!" },
  { views: 217,  title: "Daniil Medvedev's Monte-Carlo Meltdown: Racket Rage Explodes!" },
  { views: 187,  title: "Emma Raducanu's Secret Health Struggles: The Truth Revealed!" },
  { views: 180,  title: "Star-Studded Tributes Pour In as Caroline Garcia Discloses Pregnancy!" },
  { views: 146,  title: "Stunning Sight: Tennis Star Spotted Dining at Bad Bunny's Restaurant" },
  { views: 114,  title: "Local Tennis Team Sweeps Competition: National Glory Awaits!" },
  { views: 101,  title: "Glamorous World No. 1 Spotted at Bad Bunny's Lavish Dinner!" },
  { views: 24,   title: "Exclusive: Shocking Details from Rolex Monte-Carlo Masters!" },
  { views: 11,   title: "Exclusive: Serena Williams' Comeback Rumors Heat Up After Partner's Hint!" },
  { views: 7,    title: "Carlos Alcaraz Admits: No. 1 Ranking Slipping to Jannik Sinner!" },
  { views: 1,    title: "Rafael Nadal Receives Blunt Advice on His Game: 'Don't Take This Personally'" },
];

const scored = dataset.map((d) => ({
  ...d,
  ...scoreHeadline({ title: d.title, published_at: freshPublishedAt }),
}));
scored.sort((a, b) => b.score - a.score);

console.log('Score | Views | Title');
console.log('------|-------|-------------------------------------------------');
for (const r of scored) {
  console.log(
    `${String(r.score).padStart(5)} | ${String(r.views).padStart(5)} | ${r.title.slice(0, 70)}`
  );
}

const top10 = scored.slice(0, 10);
const bot10 = scored.slice(-10);
const avg = (arr) => Math.round(arr.reduce((s, x) => s + x.views, 0) / arr.length);
const topAvg = avg(top10);
const botAvg = avg(bot10);
const lift = topAvg / Math.max(botAvg, 1);
console.log(`\nAvg views — top-10 scored: ${topAvg} | bottom-10 scored: ${botAvg}`);
console.log(`Lift: ${lift.toFixed(1)}×`);

// Regression guard: scorer should produce at least 3× lift.
// If it drops below, something regressed — exit non-zero so CI can catch.
if (lift < 3) {
  console.error('\n❌ Lift below 3× — scorer may have regressed.');
  process.exit(1);
}
