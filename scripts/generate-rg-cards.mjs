/**
 * Generates 16 Roland Garros 2026 player share cards (1600×900 PNG)
 * Uses the existing rg-card-template.png + sharp SVG compositing
 * Run: node scripts/generate-rg-cards.mjs
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const PLAYERS = {
  atp: [
    { cc: 'es', name: 'Carlos Alcaraz',     note: 'Defending Champion' },
    { cc: 'it', name: 'Jannik Sinner',      note: 'World No. 1' },
    { cc: 'de', name: 'Alexander Zverev',   note: '3x finalist' },
    { cc: 'rs', name: 'Novak Djokovic',     note: 'Won RG 2023' },
    { cc: 'no', name: 'Casper Ruud',        note: '3x finalist' },
    { cc: 'gr', name: 'Stefanos Tsitsipas', note: 'Finalist 2021' },
    { cc: 'dk', name: 'Holger Rune',        note: 'Clay specialist' },
    { cc: 'ru', name: 'Andrey Rublev',      note: 'Top 10 clay' },
  ],
  wta: [
    { cc: 'pl', name: 'Iga Swiatek',        note: '4x champion' },
    { cc: 'by', name: 'Aryna Sabalenka',    note: 'World No. 2' },
    { cc: 'us', name: 'Coco Gauff',         note: 'US Open champion' },
    { cc: 'kz', name: 'Elena Rybakina',     note: 'Wimbledon champion' },
    { cc: 'it', name: 'Jasmine Paolini',    note: 'Finalist 2024' },
    { cc: 'ru', name: 'Mirra Andreeva',     note: 'Rising star' },
    { cc: 'cz', name: 'Karolina Muchova',   note: 'Finalist 2023' },
    { cc: 'ru', name: 'Daria Kasatkina',    note: 'Clay specialist' },
  ],
};

const TEMPLATE = path.join(ROOT, 'public/images/rg-card-template.png');
const OUT_DIR  = path.join(ROOT, 'public/images/rg-cards');

fs.mkdirSync(OUT_DIR, { recursive: true });

function slug(name) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function calcFontSize(name) {
  // Fit name into ~620px width (from x=158 to x=780)
  // Rough estimate: each uppercase char ≈ fontSize * 0.58
  const chars = name.length;
  let size = 100;
  while (size * chars * 0.58 > 620 && size > 40) size -= 4;
  return size;
}

async function fetchFlag(cc) {
  try {
    const res = await fetch(`https://flagcdn.com/w80/${cc}.png`);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function generateCard(player, tour) {
  const nameUpper = player.name.toUpperCase();
  const fontSize  = calcFontSize(nameUpper);
  const nameY     = 390 + fontSize;
  const noteY     = nameY + 48;
  const tourY     = noteY + 38;

  const svgOverlay = `<svg width="1600" height="900" xmlns="http://www.w3.org/2000/svg">
  <text x="158" y="${nameY}"
    font-family="Arial Black, Arial, sans-serif"
    font-weight="900"
    font-size="${fontSize}"
    fill="#000000"
    letter-spacing="1"
  >${escapeXml(nameUpper)}</text>
  <text x="160" y="${noteY}"
    font-family="Arial, sans-serif"
    font-weight="500"
    font-size="30"
    fill="#333333"
  >${escapeXml(player.note)}</text>
  <text x="160" y="${tourY}"
    font-family="Arial, sans-serif"
    font-weight="700"
    font-size="24"
    fill="#555555"
  >${tour.toUpperCase()}</text>
</svg>`;

  const flagBuf = await fetchFlag(player.cc);

  const composites = [
    { input: Buffer.from(svgOverlay), left: 0, top: 0 },
  ];
  if (flagBuf) {
    // Resize flag to 72×48 then place at x=158, y=322
    const resizedFlag = await sharp(flagBuf).resize(72, 48).toBuffer();
    composites.unshift({ input: resizedFlag, left: 158, top: 322 });
  }

  const outFile = path.join(OUT_DIR, `${slug(player.name)}-${tour}.png`);
  await sharp(TEMPLATE).composite(composites).toFile(outFile);
  console.log(`✓  ${outFile}`);
  return `${slug(player.name)}-${tour}`;
}

console.log('Generating Roland Garros 2026 player cards...\n');
for (const [tour, players] of Object.entries(PLAYERS)) {
  for (const player of players) {
    await generateCard(player, tour);
  }
}
console.log('\nDone! 16 cards generated in public/images/rg-cards/');
