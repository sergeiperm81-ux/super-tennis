#!/usr/bin/env node
/**
 * Photo validation — blocks build if any article photo mapping is broken.
 *
 * Checks:
 *   1. Every "local" path in *ArticlePhotos maps points to a real file.
 *   2. No two slugs in the same category share the same image (duplicates).
 *   3. Every referenced .webp starts with RIFF....WEBP magic bytes
 *      (catches files that are really HTML error pages or truncated downloads).
 *   4. Every .webp file under public/images/ that exists on disk is a valid webp
 *      (catches bad files even if not yet referenced in the map).
 *
 * Non-goal for v1: validating Supabase `article.image_url`. That needs network
 * + env vars; can be added later as an optional soft-warn step.
 *
 * Run via `npm run build` (prepended to astro build) or standalone:
 *   node scripts/validate-photos.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const PHOTO_MAP_FILE = path.join(ROOT, 'src/lib/player-photos.ts');

const MAP_NAMES = [
  'gearArticlePhotos',
  'lifestyleArticlePhotos',
  'recordsArticlePhotos',
  'tournamentArticlePhotos',
];

/** Extract a single `export const <name>: ... = { ... };` block by brace matching. */
function extractMapBlock(source, mapName) {
  const startIdx = source.indexOf('export const ' + mapName);
  if (startIdx < 0) return null;
  const braceIdx = source.indexOf('{', startIdx);
  if (braceIdx < 0) return null;
  let depth = 1;
  let i = braceIdx + 1;
  while (depth > 0 && i < source.length) {
    const ch = source[i];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    i++;
  }
  return source.substring(braceIdx + 1, i - 1);
}

/** Parse entries out of one map block. Returns [{ slug, type, value }, ...]. */
function parseEntries(block) {
  const entries = [];
  const re = /'([^']+)':\s*\{\s*type:\s*'([^']+)',\s*value:\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    entries.push({ slug: m[1], type: m[2], value: m[3] });
  }
  return entries;
}

/** Read first 12 bytes and check RIFF....WEBP signature. */
function isValidWebp(absPath) {
  try {
    const fd = fs.openSync(absPath, 'r');
    const buf = Buffer.alloc(12);
    fs.readSync(fd, buf, 0, 12, 0);
    fs.closeSync(fd);
    return buf.slice(0, 4).toString('ascii') === 'RIFF' &&
           buf.slice(8, 12).toString('ascii') === 'WEBP';
  } catch {
    return false;
  }
}

/** Walk public/images/ and collect every .webp file. */
function walkImages(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkImages(full, acc);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.webp')) acc.push(full);
  }
  return acc;
}

const errors = [];
const warnings = [];

// --- Parse maps ---
const source = fs.readFileSync(PHOTO_MAP_FILE, 'utf8');
const mapsByName = {};
for (const name of MAP_NAMES) {
  const block = extractMapBlock(source, name);
  if (!block) {
    errors.push(`Could not find map \`${name}\` in ${path.relative(ROOT, PHOTO_MAP_FILE)}`);
    continue;
  }
  mapsByName[name] = parseEntries(block);
}

// --- Check 1+3: referenced local files exist and are valid webp (if webp) ---
// --- Check 2: duplicates within each map                                   ---
for (const [mapName, entries] of Object.entries(mapsByName)) {
  const seen = new Map(); // key (type:value) -> first slug
  for (const { slug, type, value } of entries) {
    const key = `${type}:${value}`;

    // Duplicate detection
    if (seen.has(key)) {
      errors.push(
        `[${mapName}] duplicate image ${key} — used by "${seen.get(key)}" and "${slug}"`
      );
    } else {
      seen.set(key, slug);
    }

    // Only "local" paths can be verified on disk; "player" resolves at runtime.
    if (type !== 'local') continue;
    // Skip remote URLs (Unsplash etc.) — can't verify without network.
    if (value.startsWith('http://') || value.startsWith('https://')) continue;

    const abs = path.join(PUBLIC_DIR, value.replace(/^\//, ''));
    if (!fs.existsSync(abs)) {
      errors.push(`[${mapName}] "${slug}" → missing file: ${value}`);
      continue;
    }
    if (abs.toLowerCase().endsWith('.webp') && !isValidWebp(abs)) {
      errors.push(`[${mapName}] "${slug}" → corrupt webp (no RIFF/WEBP magic): ${value}`);
    }
  }
}

// --- Check 4: every webp under public/images/ is a valid webp ---
const allWebps = walkImages(path.join(PUBLIC_DIR, 'images'));
for (const abs of allWebps) {
  if (!isValidWebp(abs)) {
    warnings.push(`corrupt webp on disk: /${path.relative(PUBLIC_DIR, abs).replace(/\\/g, '/')}`);
  }
}

// --- Report ---
if (warnings.length > 0) {
  console.warn(`\n⚠️  ${warnings.length} warning(s):`);
  for (const w of warnings) console.warn('  - ' + w);
}

if (errors.length > 0) {
  console.error(`\n❌ Photo validation failed: ${errors.length} error(s):\n`);
  for (const e of errors) console.error('  - ' + e);
  console.error('\nBuild aborted. Fix the issues above in src/lib/player-photos.ts (or add the missing image files) and try again.\n');
  process.exit(1);
}

console.log(`✓ Photo validation passed (${Object.values(mapsByName).reduce((n, arr) => n + arr.length, 0)} mappings, ${allWebps.length} webp files).`);
