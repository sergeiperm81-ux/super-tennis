#!/usr/bin/env node
/**
 * Cross-reference orphan scan: finds webp files under public/images/
 * that are NOT referenced in either the TypeScript photo maps, the
 * worker STOCK_PHOTOS list, or Supabase image_url values.
 *
 * Prints a grouped report. Does NOT delete — use the output to decide.
 *
 * Run: node scripts/find-orphans.mjs
 *
 * The Supabase reference list is hard-coded below (26 paths at audit
 * time). Re-generate by running:
 *   SELECT DISTINCT image_url FROM news
 *   WHERE image_url LIKE 'https://super.tennis/images/%'
 * (plus the same for articles, players) — and paste slugs into DB_REFS.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');

// 1. Collect every local path referenced in code.
const photoMap = fs.readFileSync(path.join(ROOT, 'src/lib/player-photos.ts'), 'utf8');
const workerSrc = fs.readFileSync(path.join(ROOT, 'workers/content-cron/src/index.ts'), 'utf8');

const referenced = new Set();
for (const m of photoMap.matchAll(/'(\/images\/[^']+\.webp)'/g)) {
  referenced.add(m[1]);
}
const stockMatch = workerSrc.match(/const STOCK_PHOTOS = \[([\s\S]*?)\]/);
const urlMatch = workerSrc.match(/`https:\/\/super\.tennis\/images\/news\/\$\{pick\}\.(\w+)`/);
if (stockMatch && urlMatch) {
  const ext = urlMatch[1];
  for (const s of stockMatch[1].matchAll(/'([^']+)'/g)) {
    referenced.add(`/images/news/${s[1]}.${ext}`);
  }
}

// 2. Supabase references (snapshot taken 2026-04-16 via execute_sql MCP).
// Re-sync by running the query in the module doc-comment above.
const DB_REFS_NEWS = [
  'atmo-05',
  'court-01', 'court-02', 'court-04', 'court-06', 'court-07', 'court-09',
  'court-10', 'court-11', 'court-12', 'court-13', 'court-14', 'court-15',
  'equip-01', 'equip-02', 'equip-03', 'equip-04', 'equip-05', 'equip-06', 'equip-07',
  'venue-03', 'venue-04', 'venue-05', 'venue-06', 'venue-07', 'venue-09',
];
for (const s of DB_REFS_NEWS) referenced.add(`/images/news/${s}.webp`);

// 3. Walk disk.
function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, acc);
    else if (e.isFile() && e.name.toLowerCase().endsWith('.webp')) acc.push(full);
  }
  return acc;
}

const all = walk(path.join(PUBLIC_DIR, 'images'));
const orphans = [];
for (const abs of all) {
  const rel = '/' + path.relative(PUBLIC_DIR, abs).split(path.sep).join('/');
  if (!referenced.has(rel)) {
    orphans.push({ rel, bytes: fs.statSync(abs).size });
  }
}
orphans.sort((a, b) => b.bytes - a.bytes);

const totalBytes = orphans.reduce((s, o) => s + o.bytes, 0);
console.log(
  `Referenced (code+DB): ${referenced.size} | on disk: ${all.length} | orphans: ${orphans.length} (${(totalBytes / 1024 / 1024).toFixed(2)} MB)\n`
);

const byDir = {};
for (const o of orphans) {
  const d = path.dirname(o.rel);
  (byDir[d] ||= []).push(o);
}

for (const [dir, files] of Object.entries(byDir)) {
  const sum = files.reduce((s, f) => s + f.bytes, 0);
  console.log(`--- ${dir} (${files.length} files, ${(sum / 1024 / 1024).toFixed(2)} MB) ---`);
  for (const f of files.slice(0, 40)) {
    console.log(`  ${f.rel}  [${(f.bytes / 1024).toFixed(1)} KB]`);
  }
  if (files.length > 40) console.log(`  … and ${files.length - 40} more`);
}
