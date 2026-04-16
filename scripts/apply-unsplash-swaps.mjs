#!/usr/bin/env node
/**
 * One-shot migration: swap hand-picked Unsplash URLs in
 * lifestyleArticlePhotos for byte-matching local files. High-confidence
 * swaps only; remaining Unsplash URLs require manual visual QA.
 *
 * Safe to re-run — no-ops if slug already points to a non-Unsplash value.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.resolve(__dirname, '..', 'src/lib/player-photos.ts');
let src = fs.readFileSync(file, 'utf8');

const swaps = [
  ['tennis-player-cars-collection', 'tennis-player-cars'],
  ['best-tennis-video-games-ever', 'tennis-video-games'],
  ['tennis-and-music-players-dj-sing', 'tennis-music-dj'],
  ['tennis-best-sport-mental-health', 'tennis-mental-health'],
  ['tennis-brain-health-dementia', 'tennis-brain-health'],
  ['tennis-osteoporosis-bone-health', 'tennis-bone-health'],
  ['tennis-player-diet-what-pros-eat', 'tennis-player-diet'],
  ['tennis-social-media-player-brands', 'tennis-social-media'],
  ['tennis-player-social-media-controversies', 'tennis-social-media'],
  ['tennis-travel-best-cities-live-tennis', 'tennis-travel-cities'],
  ['tennis-fan-culture-loudest-crowds', 'tennis-fan-culture'],
  ['tennis-vs-padel-differences', 'tennis-vs-padel'],
  ['tennis-vs-golf-retirement-sport', 'tennis-vs-golf'],
  ['tennis-retirement-life-after-tour', 'tennis-retirement-tour'],
  ['best-tennis-books-all-time', 'tennis-books'],
  ['best-tennis-instagram-accounts', 'tennis-instagram'],
  ['tennis-injuries-common', 'tennis-injuries'],
  ['tennis-injuries-prevention', 'tennis-injuries'],
  ['tennis-couples-love-stories', 'tennis-couples'],
  ['tennis-couples-relationship', 'tennis-couples'],
  ['tennis-diet-nutrition', 'tennis-nutrition'],
  ['tennis-diet-nutrition-guide', 'tennis-nutrition'],
  ['tennis-coaching-tips-beginners', 'tennis-coaching'],
  ['tennis-etiquette-rules-fans', 'tennis-etiquette'],
  ['tennis-etiquette-unwritten-rules', 'tennis-etiquette'],
  ['tennis-grandparents-grandkids', 'tennis-grandparents'],
  ['tennis-scoring-love-deuce-explained', 'tennis-scoring'],
  ['tennis-player-nicknames-history', 'tennis-nicknames'],
  ['tennis-players-deal-with-pressure', 'tennis-pressure'],
  ['tennis-player-morning-routines', 'tennis-morning-routine'],
  ['padel-tennis-explained', 'padel-court'],
];

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

let applied = 0;
for (const [slug, newFile] of swaps) {
  const pattern = new RegExp(
    `('${escapeRegex(slug)}':\\s*\\{\\s*type:\\s*'local',\\s*value:\\s*')https:\\/\\/[^']+(')`
  );
  const next = src.replace(pattern, `$1/images/lifestyle/${newFile}.webp$2`);
  if (next !== src) {
    applied++;
    src = next;
  }
}
fs.writeFileSync(file, src);
console.log(`Applied ${applied}/${swaps.length} Unsplash→local swaps.`);
