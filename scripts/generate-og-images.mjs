#!/usr/bin/env node
/**
 * SUPER.TENNIS — OG Image Generator
 *
 * Generates Open Graph images (1200x630) for social sharing.
 * Uses Satori for HTML→SVG and @resvg/resvg-js for SVG→PNG.
 *
 * Usage: node scripts/generate-og-images.mjs
 */

import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'public', 'og');

// Load fonts (use system fonts or download)
async function loadFonts() {
  // Try to find Inter and Oswald fonts, fall back to fetching from Google Fonts CDN
  const fonts = [];

  // Fetch Inter Bold (700)
  try {
    const interBoldUrl = 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZhrib2Bg-4.ttf';
    const res = await fetch(interBoldUrl);
    const buf = await res.arrayBuffer();
    fonts.push({ name: 'Inter', data: buf, weight: 700, style: 'normal' });
  } catch (e) {
    console.warn('Could not load Inter Bold font');
  }

  // Fetch Inter Regular (400)
  try {
    const interUrl = 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf';
    const res = await fetch(interUrl);
    const buf = await res.arrayBuffer();
    fonts.push({ name: 'Inter', data: buf, weight: 400, style: 'normal' });
  } catch (e) {
    console.warn('Could not load Inter Regular font');
  }

  // Fetch Oswald Bold (700)
  try {
    const oswaldUrl = 'https://fonts.gstatic.com/s/oswald/v53/TK3_WkUHHAIjg75cFRf3bXL8LICs1xZogUFoZAaRliE.ttf';
    const res = await fetch(oswaldUrl);
    const buf = await res.arrayBuffer();
    fonts.push({ name: 'Oswald', data: buf, weight: 700, style: 'normal' });
  } catch (e) {
    console.warn('Could not load Oswald Bold font');
  }

  return fonts;
}

// Generate OG image with Satori
async function generateOG(fonts, { title, subtitle, accent = '#2d8c3c', icon = '🎾' }) {
  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)',
          padding: '60px',
          fontFamily: 'Inter',
        },
        children: [
          // Top: icon + accent line
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: '48px',
                      lineHeight: 1,
                    },
                    children: icon,
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      height: '4px',
                      flex: 1,
                      background: accent,
                      borderRadius: '2px',
                    },
                  },
                },
              ],
            },
          },
          // Middle: title + subtitle
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      fontFamily: 'Oswald',
                      fontSize: title.length > 40 ? '52px' : '64px',
                      fontWeight: 700,
                      color: '#ffffff',
                      textTransform: 'uppercase',
                      lineHeight: 1.1,
                      letterSpacing: '-0.02em',
                    },
                    children: title,
                  },
                },
                subtitle
                  ? {
                      type: 'div',
                      props: {
                        style: {
                          fontSize: '24px',
                          color: '#a0a0a0',
                          lineHeight: 1.4,
                        },
                        children: subtitle,
                      },
                    }
                  : null,
              ].filter(Boolean),
            },
          },
          // Bottom: branding
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      fontFamily: 'Oswald',
                      fontSize: '28px',
                      fontWeight: 700,
                      color: accent,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    },
                    children: 'SUPER.TENNIS',
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: '18px',
                      color: '#666666',
                    },
                    children: 'super.tennis',
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts,
    }
  );

  // Convert SVG → PNG
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
  });
  return resvg.render().asPng();
}

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  SUPER.TENNIS — OG Image Generator');
  console.log('═══════════════════════════════════════════════\n');

  // Ensure output directory exists
  if (!existsSync(OUT)) {
    mkdirSync(OUT, { recursive: true });
  }

  const fonts = await loadFonts();
  console.log(`  📝 Loaded ${fonts.length} fonts\n`);

  // Define images to generate
  const images = [
    {
      file: 'default.png',
      title: 'Super.Tennis',
      subtitle: 'Tennis for people who don\'t play tennis',
      accent: '#2d8c3c',
      icon: '🎾',
    },
    {
      file: 'players.png',
      title: 'Player Profiles',
      subtitle: 'Stats, career highlights, net worth & equipment',
      accent: '#2d8c3c',
      icon: '👥',
    },
    {
      file: 'rankings.png',
      title: 'ATP & WTA Rankings',
      subtitle: 'Current world tennis rankings updated weekly',
      accent: '#3b82f6',
      icon: '📊',
    },
    {
      file: 'records.png',
      title: 'Tennis Records',
      subtitle: 'All-time records, milestones & statistical leaders',
      accent: '#d4a017',
      icon: '🏆',
    },
    {
      file: 'gear.png',
      title: 'Tennis Gear',
      subtitle: 'Expert reviews, pro setups & buying guides',
      accent: '#059669',
      icon: '🎾',
    },
    {
      file: 'lifestyle.png',
      title: 'Tennis Lifestyle',
      subtitle: 'Net worth, culture, rivalries & stories',
      accent: '#7c3aed',
      icon: '💰',
    },
    {
      file: 'tournaments.png',
      title: 'Tennis Tournaments',
      subtitle: 'Grand Slams, Masters 1000 & event guides',
      accent: '#d4a017',
      icon: '🏟️',
    },
    {
      file: 'vs.png',
      title: 'Head to Head',
      subtitle: 'Greatest rivalries & matchup histories',
      accent: '#dc2626',
      icon: '⚔️',
    },
    {
      file: 'calendar.png',
      title: '2026 Tennis Calendar',
      subtitle: 'Complete ATP & WTA tournament schedule',
      accent: '#0891b2',
      icon: '📅',
    },
  ];

  for (const img of images) {
    const png = await generateOG(fonts, img);
    const outPath = join(OUT, img.file);
    writeFileSync(outPath, png);
    const sizeKB = (png.length / 1024).toFixed(1);
    console.log(`  ✅ ${img.file} (${sizeKB} KB)`);
  }

  console.log(`\n  🎉 Generated ${images.length} OG images in public/og/`);
  console.log('  💡 Update BaseLayout.astro to reference /og/default.png');
}

main().catch(console.error);
