#!/usr/bin/env node
/**
 * Download 60 tennis stock images from Unsplash for news articles.
 * All images are free under the Unsplash License (commercial use OK).
 * Images are cropped to 16:10 aspect ratio at 1200x750px.
 */
import { writeFile, access } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(__dirname, '..', 'public', 'images', 'news');

// 60 Unsplash tennis images grouped by theme
const IMAGES = [
  // COURTS (15)
  { name: 'court-01.jpg', url: 'https://images.unsplash.com/photo-1547934045-2942d193cb49?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'court-02.jpg', url: 'https://images.unsplash.com/photo-1448743133657-f67644da3008?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'court-03.jpg', url: 'https://images.unsplash.com/photo-1567220720374-a67f33b2a6b9?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'court-04.jpg', url: 'https://images.unsplash.com/photo-1465125672495-63cdc2fa22ed?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'court-05.jpg', url: 'https://images.unsplash.com/photo-1622669253059-e345500cf0e9?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'court-06.jpg', url: 'https://images.unsplash.com/photo-1515017804404-92b19fdfe6ac?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'court-07.jpg', url: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'court-08.jpg', url: 'https://images.unsplash.com/photo-1692288720754-743fbd1f2155?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'court-09.jpg', url: 'https://images.unsplash.com/photo-1541744686607-75102f024505?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'court-10.jpg', url: 'https://images.unsplash.com/photo-1520733772731-e33af4616207?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'court-11.jpg', url: 'https://images.unsplash.com/photo-1617144520113-88ae706a86eb?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'court-12.jpg', url: 'https://images.unsplash.com/photo-1520641147456-f78b3e1d83b6?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'court-13.jpg', url: 'https://images.unsplash.com/photo-1618548723848-1b339b8a7999?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'court-14.jpg', url: 'https://images.unsplash.com/photo-1750858285691-e81b6b6f686e?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'court-15.jpg', url: 'https://images.unsplash.com/photo-1751275061697-0f3aede33696?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },

  // EQUIPMENT (15)
  { name: 'equip-01.jpg', url: 'https://images.unsplash.com/photo-1544287757-a8ab80d90b60?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'equip-02.jpg', url: 'https://images.unsplash.com/photo-1519672808815-bdd52bb3bd41?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'equip-03.jpg', url: 'https://images.unsplash.com/photo-1652911588534-b36a1807bf6b?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'equip-04.jpg', url: 'https://images.unsplash.com/photo-1530915534664-4ac6423816b7?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'equip-05.jpg', url: 'https://images.unsplash.com/photo-1520462551646-bf2f6a00423b?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'equip-06.jpg', url: 'https://images.unsplash.com/photo-1601868071295-70ae1bf49090?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'equip-07.jpg', url: 'https://images.unsplash.com/photo-1599280174407-fdc3e8c47856?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'equip-08.jpg', url: 'https://images.unsplash.com/photo-1599236760739-9d3b26be520b?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'equip-09.jpg', url: 'https://images.unsplash.com/photo-1671750668222-85132f0a717f?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'equip-10.jpg', url: 'https://images.unsplash.com/photo-1622318456819-8c662c0c872c?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'equip-11.jpg', url: 'https://images.unsplash.com/photo-1485785254843-9be5a0c072a4?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'equip-12.jpg', url: 'https://images.unsplash.com/photo-1579528542333-4148f1769c35?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'equip-13.jpg', url: 'https://images.unsplash.com/photo-1485660063059-5d44c96d3345?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'equip-14.jpg', url: 'https://images.unsplash.com/photo-1636705941762-ae56d531a7d7?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'equip-15.jpg', url: 'https://images.unsplash.com/photo-1595341888016-a392ef81b7de?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },

  // VENUES / STADIUMS (10)
  { name: 'venue-01.jpg', url: 'https://images.unsplash.com/photo-1568663469495-b09d5e3c2e07?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'venue-02.jpg', url: 'https://images.unsplash.com/photo-1542446530-86641f39f2cd?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'venue-03.jpg', url: 'https://images.unsplash.com/photo-1557646234-2740fe240b52?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'venue-04.jpg', url: 'https://images.unsplash.com/photo-1638401081713-fe754e6a1eca?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'venue-05.jpg', url: 'https://images.unsplash.com/photo-1638401081672-9da1ba850162?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'venue-06.jpg', url: 'https://images.unsplash.com/photo-1638573615178-6f2950746614?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'venue-07.jpg', url: 'https://images.unsplash.com/photo-1543721560-90b946a30386?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'venue-08.jpg', url: 'https://images.unsplash.com/photo-1662437447166-4ba78953f24f?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'venue-09.jpg', url: 'https://images.unsplash.com/photo-1719328860652-d28d10c63639?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'venue-10.jpg', url: 'https://images.unsplash.com/photo-1661749711934-492cd19a25c3?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },

  // ABSTRACT / CLOSE-UP (10)
  { name: 'detail-01.jpg', url: 'https://images.unsplash.com/photo-1501465006562-12c01c283100?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'detail-02.jpg', url: 'https://images.unsplash.com/photo-1570953233426-4e235751c6f3?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'detail-03.jpg', url: 'https://images.unsplash.com/photo-1530915365347-e35b749a0381?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'detail-04.jpg', url: 'https://images.unsplash.com/photo-1634475664922-ee7a9a05fb99?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'detail-05.jpg', url: 'https://images.unsplash.com/photo-1521342877220-c9d6e14213f1?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'detail-06.jpg', url: 'https://images.unsplash.com/photo-1559368804-f0f175d5f91d?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'detail-07.jpg', url: 'https://images.unsplash.com/photo-1613586516733-1cb124e3b025?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'detail-08.jpg', url: 'https://images.unsplash.com/photo-1684225506181-c12cacc73db3?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'detail-09.jpg', url: 'https://images.unsplash.com/photo-1574755883888-0c24aa651edb?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'detail-10.jpg', url: 'https://images.unsplash.com/photo-1591848552381-d6e0faf6625c?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },

  // ATMOSPHERE (10)
  { name: 'atmo-01.jpg', url: 'https://images.unsplash.com/photo-1725680647573-9737175af6c4?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'atmo-02.jpg', url: 'https://images.unsplash.com/photo-1763913771541-4d43d5c3bc93?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'atmo-03.jpg', url: 'https://images.unsplash.com/photo-1708173737430-4296f6bf89c3?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'atmo-04.jpg', url: 'https://images.unsplash.com/photo-1689500609995-c8ccb3f1fe85?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'atmo-05.jpg', url: 'https://images.unsplash.com/photo-1674484128725-7cb93ffb7df4?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'atmo-06.jpg', url: 'https://images.unsplash.com/photo-1608187557818-10e4804a07c3?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'atmo-07.jpg', url: 'https://images.unsplash.com/photo-1583775676247-ff0cc51c8dfe?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'atmo-08.jpg', url: 'https://images.unsplash.com/photo-1630890125280-e91611d1d678?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'atmo-09.jpg', url: 'https://images.unsplash.com/photo-1625235441865-e9ae558348b7?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
  { name: 'atmo-10.jpg', url: 'https://images.unsplash.com/photo-1448542146881-1d78dfb2f674?w=1200&h=750&fit=crop&crop=entropy&fm=jpg&q=80' },
];

async function fileExists(path) {
  try { await access(path); return true; } catch { return false; }
}

async function downloadImage(url, filepath) {
  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) return false;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 5000) return false; // too small = error
    await writeFile(filepath, buffer);
    return true;
  } catch { return false; }
}

async function main() {
  console.log(`📸 Downloading ${IMAGES.length} stock tennis images...`);
  let ok = 0, skip = 0, fail = 0;

  // Download in batches of 5
  for (let i = 0; i < IMAGES.length; i += 5) {
    const batch = IMAGES.slice(i, i + 5);
    const results = await Promise.all(batch.map(async (img) => {
      const filepath = resolve(OUTPUT_DIR, img.name);
      if (await fileExists(filepath)) {
        skip++;
        return `  ⏭️  ${img.name} (exists)`;
      }
      const success = await downloadImage(img.url, filepath);
      if (success) {
        ok++;
        return `  ✅ ${img.name}`;
      } else {
        fail++;
        return `  ❌ ${img.name} FAILED`;
      }
    }));
    results.forEach(r => console.log(r));
  }

  console.log(`\n📊 Done: ${ok} downloaded, ${skip} skipped, ${fail} failed`);
}

main();
