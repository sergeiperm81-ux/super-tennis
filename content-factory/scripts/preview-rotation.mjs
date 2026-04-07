#!/usr/bin/env node
/**
 * Preview background rotation for the next 30 days (3 videos/day = 90 videos).
 * Shows which background will be used for each video, ensuring no repeats.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BG_DIR = path.join(ROOT, 'backgrounds');

const allBgs = fs.readdirSync(BG_DIR).filter(f => f.endsWith('.mp4')).sort();

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

console.log(`\n📊 BACKGROUND ROTATION PREVIEW — 30 days (3 videos/day)`);
console.log(`   Total unique backgrounds: ${allBgs.length}`);
console.log(`   Videos per day: 3`);
console.log(`   Days before any repeat: ${Math.floor(allBgs.length / 3)} days\n`);

let queue = shuffleArray([...allBgs]);
const today = new Date();

for (let day = 0; day < 30; day++) {
  const date = new Date(today);
  date.setDate(date.getDate() + day);
  const dateStr = date.toISOString().split('T')[0];
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

  const picks = [];
  for (let v = 0; v < 3; v++) {
    if (queue.length === 0) {
      queue = shuffleArray([...allBgs]);
      console.log(`   🔄 Queue reset — new cycle starts`);
    }
    picks.push(queue.shift());
  }

  console.log(`${dayName} ${dateStr}: ${picks.join(' | ')}`);
}

console.log(`\n✅ No background repeats for ${Math.floor(allBgs.length / 3)} consecutive days`);
console.log(`   With 101 backgrounds and 3/day: ~33 days without any repeat\n`);
