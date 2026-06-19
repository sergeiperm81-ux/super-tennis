#!/usr/bin/env node
/**
 * snapshot-dist.mjs — снимок сборки для golden-safety-теста (см. docs/I18N_IMPLEMENTATION_PLAN.md).
 *
 * Рекурсивно обходит каталог сборки, считает sha256 каждого файла и пишет манифест
 * { "relative/path": "<sha256>" } (ключи отсортированы для стабильного diff).
 *
 * Использование:
 *   node scripts/i18n/snapshot-dist.mjs [distDir=dist] [outPath=scripts/i18n/.dist-manifest.json]
 *
 * Манифест НЕ содержит контента — только хэши, поэтому безопасен для коммита.
 */
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const distDir = process.argv[2] || 'dist';
const outPath = process.argv[3] || 'scripts/i18n/.dist-manifest.json';

/** @param {string} dir @param {string[]} acc */
async function walk(dir, acc = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    console.error(`[snapshot] cannot read ${dir}: ${err.message}`);
    throw err;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) await walk(full, acc);
    else if (e.isFile()) acc.push(full);
  }
  return acc;
}

async function main() {
  const files = (await walk(distDir)).sort();
  /** @type {Record<string,string>} */
  const manifest = {};
  for (const f of files) {
    const buf = await readFile(f);
    const rel = relative(distDir, f).split(sep).join('/');
    manifest[rel] = createHash('sha256').update(buf).digest('hex');
  }
  await writeFile(outPath, JSON.stringify(manifest) + '\n', 'utf8');
  console.log(`[snapshot] ${files.length} files from ${distDir}/ -> ${outPath}`);
}

main().catch((err) => {
  console.error('[snapshot] FAILED:', err.message);
  process.exit(1);
});
