#!/usr/bin/env node
/**
 * Suggest Unsplash → local swaps for lifestyleArticlePhotos by matching
 * slug tokens against local /images/lifestyle/*.webp filenames.
 *
 * Prints suggestions only — does NOT modify the map. Review output, then
 * apply with Edit. High-confidence matches (≥2 shared meaningful tokens)
 * are marked with ✓.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const photoMap = fs.readFileSync(path.join(ROOT, 'src/lib/player-photos.ts'), 'utf8');
const startIdx = photoMap.indexOf('export const lifestyleArticlePhotos');
const braceIdx = photoMap.indexOf('{', startIdx);
let depth = 1, i = braceIdx + 1;
while (depth > 0 && i < photoMap.length) {
  if (photoMap[i] === '{') depth++;
  else if (photoMap[i] === '}') depth--;
  i++;
}
const block = photoMap.substring(braceIdx + 1, i - 1);

const localDir = path.join(ROOT, 'public/images/lifestyle');
const localFiles = fs.readdirSync(localDir)
  .filter(f => f.endsWith('.webp'))
  .map(f => f.replace('.webp', ''));

const STOPWORDS = new Set(['tennis', 'the', 'a', 'and', 'or', 'of', 'for', 'in', 'on', 'to', 'best', 'top']);
function tokens(s) {
  return s.split(/[-_\s]+/).filter(t => t && !STOPWORDS.has(t));
}

const re = /'([^']+)':\s*\{\s*type:\s*'([^']+)',\s*value:\s*'([^']+)'/g;
let m;
const suggestions = [];
while ((m = re.exec(block)) !== null) {
  const [, slug, type, value] = m;
  if (!value.startsWith('http')) continue;

  const slugTokens = new Set(tokens(slug));
  const scored = localFiles.map(f => {
    const fileTokens = new Set(tokens(f));
    let shared = 0;
    for (const t of slugTokens) if (fileTokens.has(t)) shared++;
    return { file: f, shared };
  }).filter(x => x.shared > 0).sort((a, b) => b.shared - a.shared);

  if (scored.length > 0 && scored[0].shared >= 2) {
    suggestions.push({ slug, local: scored[0].file, shared: scored[0].shared, conf: 'high' });
  } else if (scored.length > 0 && scored[0].shared === 1) {
    suggestions.push({ slug, local: scored[0].file, shared: 1, conf: 'low' });
  }
}

suggestions.sort((a, b) => b.shared - a.shared);
console.log(`Total candidates: ${suggestions.length}\n`);
for (const s of suggestions) {
  const mark = s.conf === 'high' ? '✓' : ' ';
  console.log(`${mark} ${s.slug.padEnd(50)} → ${s.local}.webp  (shared: ${s.shared})`);
}
