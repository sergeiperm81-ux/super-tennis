/**
 * Generates 8 "My Tennis Style" share cards (1080×1350 PNG)
 * Player name is overlaid right under "MY TENNIS STYLE" heading
 * Run: node scripts/generate-style-cards.mjs
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// Template: 1080×1350. "MY TENNIS STYLE" heading ends ~y=195 (14.4% of height)
// Player name goes right below at y≈230, sized to fit within ~900px wide

const PLAYERS = [
  { id: 'carlos-alcaraz',   name: 'Carlos Alcaraz'   },
  { id: 'novak-djokovic',   name: 'Novak Djokovic'   },
  { id: 'rafael-nadal',     name: 'Rafael Nadal'      },
  { id: 'roger-federer',    name: 'Roger Federer'     },
  { id: 'andy-murray',      name: 'Andy Murray'       },
  { id: 'john-isner',       name: 'John Isner'        },
  { id: 'stefan-edberg',    name: 'Stefan Edberg'     },
  { id: 'andre-agassi',     name: 'Andre Agassi'      },
];

const TEMPLATE = path.join(ROOT, 'public/images/style-card-template.png');
const OUT_DIR  = path.join(ROOT, 'public/images/style-cards');
fs.mkdirSync(OUT_DIR, { recursive: true });

function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function calcFontSize(name, maxWidth, maxSize) {
  // rough: Arial Black char width ≈ size * 0.62
  let size = maxSize;
  while (size * name.length * 0.62 > maxWidth && size > 32) size -= 2;
  return size;
}

async function generateCard(player) {
  const nameUpper = player.name.toUpperCase();
  const fontSize = calcFontSize(nameUpper, 900, 90);

  // Name sits right under the "MY TENNIS STYLE" heading (~y=195 in 1350px)
  // Text baseline at y ≈ 285
  const nameY = 285;

  const svg = `<svg width="1080" height="1350" xmlns="http://www.w3.org/2000/svg">
  <text
    x="540"
    y="${nameY}"
    text-anchor="middle"
    font-family="Arial Black, Arial, sans-serif"
    font-weight="900"
    font-size="${fontSize}"
    fill="#1a1a1a"
    letter-spacing="0.5"
  >${escapeXml(nameUpper)}</text>
</svg>`;

  const outFile = path.join(OUT_DIR, `${player.id}.png`);
  await sharp(TEMPLATE)
    .composite([{ input: Buffer.from(svg), left: 0, top: 0 }])
    .toFile(outFile);
  console.log(`✓  ${player.id}.png  (fontSize: ${fontSize})`);
}

console.log('Generating tennis style cards...\n');
for (const player of PLAYERS) {
  await generateCard(player);
}
console.log('\nDone! 8 cards in public/images/style-cards/');
