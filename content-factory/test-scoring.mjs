/**
 * Offline scoring test — verifies the new headline scorer against the
 * actual Jan–Apr 2026 YouTube analytics dataset. Real performers should
 * score high; real flops should score low.
 *
 * Run: cd content-factory && node test-scoring.mjs
 *
 * This file is a sanity check and is not part of the runtime pipeline.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Re-implement a tiny shim so we don't need Supabase — directly import the scorer.
// Hack: the scorer is not exported, so we redefine a minimal copy here just for tests.
// (Keep in sync with fetch-headlines.js.)

const A = ['Djokovic','Nadal','Alcaraz','Sinner','Federer','Serena','Williams','Swiatek','Sabalenka','Medvedev','Raducanu','Garcia','Rybakina'];
const B = ['Zverev','Tsitsipas','Rune','Fritz','Shelton','Draper','Gauff','Pegula','Osaka','Murray','Navratilova','Graf','Sharapova','Wozniacki','Kvitova','Halep','Cerundolo','Opelka','Isner','Becker','Schwartzman','Dimitrov'];
const G = ['Tennis Star','Tennis Player','Tennis Icon','World No. 1','World No. 2','Former Star','Forgotten Star','Local Tennis','Rising Star'];
const V = ['slams','smashes','smashing','withdraws','announces','admits','spotted','withdrawal','apologizes','storms off','sparks','revealed','exit','meltdown'];

function score(title, ageHours = 12) {
  let s = 0;
  const reasons = [];
  const firstA = A.find(p => title.includes(p));
  const firstB = B.find(p => title.includes(p));
  if (firstA) {
    s += 3; reasons.push(`+3 A-star`);
    if (title.split(/\s+/).slice(0,3).join(' ').includes(firstA)) { s += 1; reasons.push('+1 early'); }
  } else if (firstB) { s += 1; reasons.push('+1 B-star'); }
  for (const ph of G) if (title.includes(ph)) { s -= 3; reasons.push(`-3 placeholder`); break; }
  if (/\b(\d{2,}|\$\d+|\d+(st|nd|rd|th)|Top\s*\d+|No\.?\s*\d+)\b/i.test(title)) { s += 2; reasons.push('+2 number'); }
  if (ageHours <= 24) { s += 2; reasons.push('+2 fresh'); }
  else if (ageHours > 72) { s -= 1; reasons.push('-1 stale'); }
  const lo = title.toLowerCase();
  if (V.some(v => lo.includes(v))) { s += 1; reasons.push('+1 verb'); }
  return { s, reasons };
}

// Real dataset from YouTube Studio export
const data = [
  { views: 2314, t: "Rafael Nadal's Bold Words: Alcaraz's Loss is No Big Deal!" },
  { views: 2308, t: "Daniil Medvedev's Mid-Match Meltdown: What Happened in Monte Carlo?" },
  { views: 2102, t: "Caroline Garcia Announces Shocking Pregnancy: New Chapter Ahead!" },
  { views: 2055, t: "Serena Williams' Comeback: Inside the Buzz and Hype!" },
  { views: 1978, t: "Daniil Medvedev's Racket Smashing Meltdown: 7 Times in 40 Seconds!" },
  { views: 1926, t: "Shocking Backlash: Aryna Sabalenka's Controversial Kai Trump Photo" },
  { views: 1870, t: "Carlos Alcaraz's Shocking Miami Open Exit: What Went Wrong?" },
  { views: 1786, t: "Jannik Sinner Misses Top 5: Shocking Net Worth Revealed!" },
  { views: 1739, t: "Iga Swiatek's Ex-Coach Speaks Out: 'The Coach Had to Go!'" },
  { views: 1372, t: "Serena Williams' Shocking Comeback Rumors: Is She Ready to Return?" },
  { views: 1205, t: "Djokovic Withdraws from Miami Open!" },
  { views: 1059, t: "Jannik Sinner Apologizes After Heckler Sparks Miami Open Chaos!" },
  { views: 965,  t: "Emma Raducanu's Shocking Withdrawal: What's Behind the Drama?" },
  { views: 832,  t: "Daring Fan Pulls Off Risky Move for Elena Rybakina Souvenir!" },
  { views: 727,  t: "Iga Swiatek's New Coach Faces Backlash: ATP Star Calls It 'Ruthless'" },
  { views: 578,  t: "Mid-Match Drama: Elena Rybakina Shuts Down Coach Amid Tense Battle!" },
  { views: 390,  t: "Bizarre Moment! Tennis Star Storms Off the Court in Tears!" },
  { views: 363,  t: "Diego Schwartzman Celebrates First Home Title in Stunning Fashion!" },
  { views: 251,  t: "Forgotten Tennis Star Spotted Courtside in Walmart Hat!" },
  { views: 217,  t: "Daniil Medvedev's Monte-Carlo Meltdown: Racket Rage Explodes!" },
  { views: 187,  t: "Emma Raducanu's Secret Health Struggles: The Truth Revealed!" },
  { views: 180,  t: "Star-Studded Tributes Pour In as Caroline Garcia Discloses Pregnancy!" },
  { views: 146,  t: "Stunning Sight: Tennis Star Spotted Dining at Bad Bunny's Restaurant" },
  { views: 114,  t: "Local Tennis Team Sweeps Competition: National Glory Awaits!" },
  { views: 101,  t: "Glamorous World No. 1 Spotted at Bad Bunny's Lavish Dinner!" },
  { views: 24,   t: "Exclusive: Shocking Details from Rolex Monte-Carlo Masters!" },
  { views: 11,   t: "Exclusive: Serena Williams' Comeback Rumors Heat Up After Partner's Hint!" },
  { views: 7,    t: "Carlos Alcaraz Admits: No. 1 Ranking Slipping to Jannik Sinner!" },
  { views: 1,    t: "Rafael Nadal Receives Blunt Advice on His Game: 'Don't Take This Personally'" },
];

const scored = data.map(d => ({ ...d, ...score(d.t, 12) }));
scored.sort((a, b) => b.s - a.s);

console.log('Score | Views | Title');
console.log('------|-------|-------------------------------------------------');
for (const r of scored) {
  console.log(`${String(r.s).padStart(5)} | ${String(r.views).padStart(5)} | ${r.t.slice(0, 70)}`);
}

// Correlation check: what's the avg views of top-10 scored vs bottom-10?
const top10 = scored.slice(0, 10);
const bot10 = scored.slice(-10);
const avg = (arr) => Math.round(arr.reduce((s, x) => s + x.views, 0) / arr.length);
console.log(`\nAvg views — top-10 scored: ${avg(top10)} | bottom-10 scored: ${avg(bot10)}`);
console.log(`Lift: ${(avg(top10) / Math.max(avg(bot10), 1)).toFixed(1)}×`);
