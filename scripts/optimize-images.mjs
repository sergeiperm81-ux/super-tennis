/**
 * One-time image optimization script.
 * Compresses all JPG/PNG in public/images/ in-place using sharp.
 * - JPEG → 82% quality (saves ~40-60% size)
 * - PNG  → WebP at 85% quality (saves ~60-80% size), keeps original PNG for fallback
 *
 * Run: node scripts/optimize-images.mjs [--dry-run]
 */
import sharp from 'sharp';
import { readdirSync, statSync, renameSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMG_DIR = path.join(__dirname, '../public/images');
const DRY_RUN = process.argv.includes('--dry-run');

function getAllImages(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllImages(full));
    } else if (/\.(jpe?g|png)$/i.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

function formatBytes(b) {
  return b < 1024 ? `${b}B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(0)}KB` : `${(b / 1024 / 1024).toFixed(1)}MB`;
}

async function run() {
  const images = getAllImages(IMG_DIR);
  console.log(`\n🖼️  Image Optimizer ${DRY_RUN ? '(DRY RUN)' : ''}`);
  console.log(`   Found ${images.length} images in public/images/\n`);

  let totalBefore = 0, totalAfter = 0, skipped = 0;

  for (const imgPath of images) {
    const ext = path.extname(imgPath).toLowerCase();
    const before = statSync(imgPath).size;
    totalBefore += before;

    // Skip tiny images (< 20KB — not worth optimizing)
    if (before < 20 * 1024) {
      skipped++;
      totalAfter += before;
      continue;
    }

    if (DRY_RUN) {
      console.log(`  would optimize: ${path.relative(IMG_DIR, imgPath)} (${formatBytes(before)})`);
      totalAfter += Math.round(before * 0.5); // estimate
      continue;
    }

    try {
      const tmpPath = imgPath + '.tmp';

      if (ext === '.png') {
        // Convert PNG to WebP (much smaller), save alongside as .webp
        const webpPath = imgPath.replace(/\.png$/i, '.webp');
        await sharp(imgPath).webp({ quality: 85 }).toFile(webpPath);
        const after = statSync(webpPath).size;
        totalAfter += after;
        console.log(`  PNG→WebP: ${path.relative(IMG_DIR, imgPath)} ${formatBytes(before)} → ${formatBytes(after)} (-${Math.round((1 - after/before)*100)}%)`);
        // Also compress original PNG for fallback
        await sharp(imgPath).png({ quality: 85, compressionLevel: 9 }).toFile(tmpPath);
        renameSync(tmpPath, imgPath);
      } else {
        // JPEG: compress in-place
        await sharp(imgPath).jpeg({ quality: 82, mozjpeg: true }).toFile(tmpPath);
        const after = statSync(tmpPath).size;
        if (after < before) {
          renameSync(tmpPath, imgPath);
          totalAfter += after;
          console.log(`  JPEG: ${path.relative(IMG_DIR, imgPath)} ${formatBytes(before)} → ${formatBytes(after)} (-${Math.round((1 - after/before)*100)}%)`);
        } else {
          // Compressed is larger — skip
          import('fs').then(fs => { try { fs.unlinkSync(tmpPath); } catch {} });
          totalAfter += before;
          skipped++;
        }
      }
    } catch (e) {
      console.warn(`  ⚠️  Failed: ${imgPath}: ${e.message}`);
      totalAfter += before;
    }
  }

  const saved = totalBefore - totalAfter;
  console.log(`\n✅ Done!`);
  console.log(`   Before: ${formatBytes(totalBefore)}`);
  console.log(`   After:  ${formatBytes(totalAfter)}`);
  console.log(`   Saved:  ${formatBytes(saved)} (-${Math.round((saved/totalBefore)*100)}%)`);
  console.log(`   Skipped: ${skipped} (tiny or already optimal)\n`);
}

run().catch(e => { console.error('❌', e.message); process.exit(1); });
