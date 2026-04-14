#!/usr/bin/env node
/**
 * Fix duplicate gear images.
 * 7 groups of identical files detected via MD5.
 * Downloads 12 unique replacement photos from Unsplash.
 */
import { writeFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GEAR_DIR = resolve(__dirname, '..', 'public', 'images', 'gear');

// Files to replace → unique Unsplash photo IDs (tennis/sports equipment)
// All from confirmed-valid Unsplash photo IDs (from download-stock-images.mjs catalog)
const REPLACEMENTS = [
  // Group 1: spin-racket-showdown = tennis-grip-guide = tennis-grip-measure = tennis-overgrip-compare
  // Keep spin-racket-showdown, replace the grip/overgrip files
  {
    file: 'tennis-grip-guide.webp',
    url: 'https://images.unsplash.com/photo-1519672808815-bdd52bb3bd41?w=800&h=500&fit=crop&crop=entropy&fm=webp&q=80',
    desc: 'tennis grip / racket handle closeup'
  },
  {
    file: 'tennis-grip-measure.webp',
    url: 'https://images.unsplash.com/photo-1652911588534-b36a1807bf6b?w=800&h=500&fit=crop&crop=entropy&fm=webp&q=80',
    desc: 'tennis grip measure'
  },
  {
    file: 'tennis-overgrip-compare.webp',
    url: 'https://images.unsplash.com/photo-1530915534664-4ac6423816b7?w=800&h=500&fit=crop&crop=entropy&fm=webp&q=80',
    desc: 'tennis overgrip comparison'
  },

  // Group 2: tennis-bags-budget = tennis-bags-guide
  // Keep tennis-bags-budget, replace tennis-bags-guide
  {
    file: 'tennis-bags-guide.webp',
    url: 'https://images.unsplash.com/photo-1520462551646-bf2f6a00423b?w=800&h=500&fit=crop&crop=entropy&fm=webp&q=80',
    desc: 'tennis bags guide'
  },

  // Group 3: smartwatch-tennis = tennis-smartwatch
  // Keep smartwatch-tennis, replace tennis-smartwatch
  {
    file: 'tennis-smartwatch.webp',
    url: 'https://images.unsplash.com/photo-1601868071295-70ae1bf49090?w=800&h=500&fit=crop&crop=entropy&fm=webp&q=80',
    desc: 'smartwatch fitness tracker'
  },

  // Group 4: pre-strung-rackets = tennis-beginner-gear = tennis-rackets-budget = tennis-rackets-prestrung
  // Keep pre-strung-rackets, replace the other 3
  {
    file: 'tennis-beginner-gear.webp',
    url: 'https://images.unsplash.com/photo-1599280174407-fdc3e8c47856?w=800&h=500&fit=crop&crop=entropy&fm=webp&q=80',
    desc: 'tennis beginner gear'
  },
  {
    file: 'tennis-rackets-budget.webp',
    url: 'https://images.unsplash.com/photo-1599236760739-9d3b26be520b?w=800&h=500&fit=crop&crop=entropy&fm=webp&q=80',
    desc: 'tennis rackets budget'
  },
  {
    file: 'tennis-rackets-prestrung.webp',
    url: 'https://images.unsplash.com/photo-1671750668222-85132f0a717f?w=800&h=500&fit=crop&crop=entropy&fm=webp&q=80',
    desc: 'tennis rackets pre-strung'
  },

  // Group 5: tennis-clay-court-shoes = tennis-shoe-tech = tennis-socks
  // Keep tennis-clay-court-shoes, replace shoe-tech and socks
  {
    file: 'tennis-shoe-tech.webp',
    url: 'https://images.unsplash.com/photo-1622318456819-8c662c0c872c?w=800&h=500&fit=crop&crop=entropy&fm=webp&q=80',
    desc: 'tennis shoe technology'
  },
  {
    file: 'tennis-socks.webp',
    url: 'https://images.unsplash.com/photo-1485785254843-9be5a0c072a4?w=800&h=500&fit=crop&crop=entropy&fm=webp&q=80',
    desc: 'tennis socks athletic'
  },

  // Group 6: head-vs-babolat = wilson-prostaff-blade = wilson-vs-blade
  // Keep wilson-vs-blade (used in mapping), replace head-vs-babolat
  {
    file: 'head-vs-babolat.webp',
    url: 'https://images.unsplash.com/photo-1579528542333-4148f1769c35?w=800&h=500&fit=crop&crop=entropy&fm=webp&q=80',
    desc: 'racket brand comparison'
  },

  // Group 7: tennis-headbands = tennis-skirts-dresses
  // Keep tennis-skirts-dresses, replace tennis-headbands
  {
    file: 'tennis-headbands.webp',
    url: 'https://images.unsplash.com/photo-1485660063059-5d44c96d3345?w=800&h=500&fit=crop&crop=entropy&fm=webp&q=80',
    desc: 'tennis headbands wristbands'
  },
];

async function downloadImage(url, outputPath) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SuperTennis/1.0)' },
    redirect: 'follow'
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  await writeFile(outputPath, buffer);
  return buffer.length;
}

async function main() {
  console.log(`Replacing ${REPLACEMENTS.length} duplicate gear images...\n`);
  let ok = 0;
  let fail = 0;

  for (const { file, url, desc } of REPLACEMENTS) {
    const outputPath = resolve(GEAR_DIR, file);
    process.stdout.write(`  ${file} (${desc})... `);
    try {
      const bytes = await downloadImage(url, outputPath);
      console.log(`✓ ${Math.round(bytes / 1024)}KB`);
      ok++;
    } catch (err) {
      console.log(`✗ FAILED: ${err.message}`);
      fail++;
    }
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\nDone: ${ok} replaced, ${fail} failed.`);
}

main().catch(console.error);
