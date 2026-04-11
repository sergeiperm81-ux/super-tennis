/**
 * Generates 8 "My Tennis Style" share cards (1080×1350 PNG)
 * Run: node scripts/generate-style-cards.mjs
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const STYLES = [
  { id: 'aggressive-baseliner', label: 'Aggressive Baseliner', like: 'Like Carlos Alcaraz' },
  { id: 'counterpuncher',       label: 'The Counterpuncher',   like: 'Like Novak Djokovic' },
  { id: 'clay-king',            label: 'The Clay King',        like: 'Like Rafael Nadal'   },
  { id: 'serve-machine',        label: 'Serve Machine',        like: 'Like John Isner'     },
  { id: 'all-court-wizard',     label: 'All-Court Wizard',     like: 'Like Roger Federer'  },
  { id: 'speed-demon',          label: 'The Speed Demon',      like: 'Like Andy Murray'    },
  { id: 'net-rusher',           label: 'The Net Rusher',       like: 'Like Stefan Edberg'  },
  { id: 'tactician',            label: 'The Tactician',        like: 'Like Andre Agassi'   },
];

const TEMPLATE = path.join(ROOT, 'public/images/style-card-template.png');
const OUT_DIR  = path.join(ROOT, 'public/images/style-cards');
fs.mkdirSync(OUT_DIR, { recursive: true });

function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function calcFontSize(text, maxWidth, maxSize) {
  // rough: each uppercase char ≈ size * 0.62
  let size = maxSize;
  while (size * text.length * 0.62 > maxWidth && size > 32) size -= 4;
  return size;
}

async function generateCard(style) {
  const labelSize = calcFontSize(style.label.toUpperCase(), 960, 96);

  const svg = `<svg width="1080" height="1350" xmlns="http://www.w3.org/2000/svg">
  <!-- dark overlay at bottom for text readability -->
  <rect x="0" y="1050" width="1080" height="300" fill="rgba(0,0,0,0.52)" />
  <!-- style label -->
  <text x="60" y="${1050 + labelSize + 12}"
    font-family="Arial Black, Arial, sans-serif"
    font-weight="900"
    font-size="${labelSize}"
    fill="#FFFFFF"
    letter-spacing="1"
  >${escapeXml(style.label.toUpperCase())}</text>
  <!-- like player -->
  <text x="62" y="${1050 + labelSize + 64}"
    font-family="Arial, sans-serif"
    font-weight="500"
    font-size="38"
    fill="#d4f54a"
  >${escapeXml(style.like)}</text>
  <!-- super.tennis watermark already in template -->
</svg>`;

  const outFile = path.join(OUT_DIR, `${style.id}.png`);
  await sharp(TEMPLATE)
    .composite([{ input: Buffer.from(svg), left: 0, top: 0 }])
    .toFile(outFile);
  console.log(`✓  ${style.id}.png`);
}

console.log('Generating tennis style cards...\n');
for (const style of STYLES) {
  await generateCard(style);
}
console.log('\nDone! 8 cards in public/images/style-cards/');
