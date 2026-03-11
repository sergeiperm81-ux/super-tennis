#!/usr/bin/env node
/**
 * SUPER.TENNIS — Wikipedia Photo Fetcher
 *
 * Fetches verified player photos from Wikipedia/Wikimedia Commons.
 * Uses the PageImages API to get the main article image (most reliable).
 *
 * Usage: node scripts/fetch-wiki-photos.mjs [options]
 *
 * Options:
 *   --limit N         Number of players to process (default: 50)
 *   --tour atp|wta    Filter by tour
 *   --dry-run         Show results without updating DB
 *   --force           Re-fetch even if photo already exists
 *   --report          Generate HTML report for manual verification
 *   --ranked          Target ranked players (ATP/WTA top 100) missing photos,
 *                     regardless of career_titles
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { writeFileSync } from 'fs';
config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Parse CLI args
const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : null;
};
const hasFlag = (name) => args.includes(`--${name}`);

const LIMIT = parseInt(getArg('limit') || '50');
const TOUR = getArg('tour');
const DRY_RUN = hasFlag('dry-run');
const FORCE = hasFlag('force');
const REPORT = hasFlag('report');
const RANKED = hasFlag('ranked');

// Wikipedia API — User-Agent required by policy
const USER_AGENT = 'SuperTennisBot/1.0 (https://super.tennis; contact@super.tennis)';

// Rate limit: max ~50 req/sec, we do 2 per second to be safe
const DELAY_MS = 500;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Search Wikipedia for the correct article title
 * Handles diacritics: "Iga Swiatek" → "Iga Świątek"
 */
async function searchWikipediaTitle(query) {
  const url = new URL('https://en.wikipedia.org/w/api.php');
  url.searchParams.set('action', 'query');
  url.searchParams.set('list', 'search');
  url.searchParams.set('srsearch', query);
  url.searchParams.set('srnamespace', '0');
  url.searchParams.set('srlimit', '3');
  url.searchParams.set('format', 'json');
  url.searchParams.set('formatversion', '2');

  try {
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const results = data.query?.search || [];
    // Filter out sub-pages (career statistics, records, etc.) — we want the main bio article
    const isMainArticle = (title) => !title.toLowerCase().includes('career statistics')
      && !title.toLowerCase().includes('records and')
      && !title.toLowerCase().includes(' at the ')
      && !title.toLowerCase().includes(' vs ');
    // Find the best match — prefer tennis-related main articles
    for (const r of results) {
      if (!isMainArticle(r.title)) continue;
      const snippetLower = (r.snippet || '').toLowerCase();
      if (snippetLower.includes('tennis') || r.title.toLowerCase().includes('tennis')) {
        return r.title;
      }
    }
    // Fallback: first main article result
    const mainResults = results.filter(r => isMainArticle(r.title));
    return mainResults[0]?.title || results[0]?.title || null;
  } catch (e) {
    return null;
  }
}

/**
 * Fetch the main image from a Wikipedia article using PageImages API
 * Returns: { imageUrl, thumbUrl, filename, width, height } or null
 */
async function getWikipediaImage(playerName, thumbSize = 400) {
  // Wikipedia article titles use underscores
  const title = playerName.replace(/ /g, '_');

  const url = new URL('https://en.wikipedia.org/w/api.php');
  url.searchParams.set('action', 'query');
  url.searchParams.set('titles', title);
  url.searchParams.set('prop', 'pageimages');
  url.searchParams.set('piprop', 'original|thumbnail|name');
  url.searchParams.set('pithumbsize', thumbSize.toString());
  url.searchParams.set('redirects', '1'); // Follow redirects (ASCII → diacritical)
  url.searchParams.set('format', 'json');
  url.searchParams.set('formatversion', '2');

  try {
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!res.ok) return null;

    const data = await res.json();
    const page = data.query?.pages?.[0];

    if (!page || page.missing) return null;

    const result = {
      pageTitle: page.title,
      filename: page.pageimage || null,
      thumbUrl: page.thumbnail?.source || null,
      thumbWidth: page.thumbnail?.width || null,
      thumbHeight: page.thumbnail?.height || null,
      originalUrl: page.original?.source || null,
      originalWidth: page.original?.width || null,
      originalHeight: page.original?.height || null,
    };

    // Skip non-photo images (SVG flags, logos, etc.)
    if (result.filename) {
      const lower = result.filename.toLowerCase();
      if (lower.endsWith('.svg') || lower.includes('flag') || lower.includes('logo') || lower.includes('coat_of_arms')) {
        return null;
      }
    }

    return result.thumbUrl ? result : null;
  } catch (e) {
    console.error(`  ⚠️  API error for ${playerName}:`, e.message);
    return null;
  }
}

/**
 * Get license/attribution info from Wikimedia Commons
 */
async function getImageMetadata(filename) {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.searchParams.set('action', 'query');
  url.searchParams.set('titles', `File:${filename}`);
  url.searchParams.set('prop', 'imageinfo');
  url.searchParams.set('iiprop', 'extmetadata|url');
  url.searchParams.set('format', 'json');
  url.searchParams.set('formatversion', '2');

  try {
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!res.ok) return null;

    const data = await res.json();
    const page = data.query?.pages?.[0];
    const info = page?.imageinfo?.[0];
    if (!info) return null;

    const ext = info.extmetadata || {};

    return {
      descriptionUrl: info.descriptionurl || null,
      license: ext.LicenseShortName?.value || 'Unknown',
      artist: ext.Artist?.value?.replace(/<[^>]*>/g, '') || 'Unknown', // Strip HTML
      attribution: ext.Attribution?.value || null,
      usageTerms: ext.UsageTerms?.value || null,
    };
  } catch (e) {
    return null;
  }
}

/**
 * Generate a custom thumbnail URL at a specific size
 * Wikimedia allows on-the-fly resizing via URL pattern
 */
function getResizedUrl(originalUrl, width) {
  if (!originalUrl) return null;
  // Pattern: .../commons/X/XX/Filename.jpg → .../commons/thumb/X/XX/Filename.jpg/WIDTHpx-Filename.jpg
  const match = originalUrl.match(/\/commons\/(\w\/\w\w)\/(.+)$/);
  if (match) {
    const [, path, filename] = match;
    return `https://upload.wikimedia.org/wikipedia/commons/thumb/${path}/${filename}/${width}px-${filename}`;
  }
  return originalUrl;
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  SUPER.TENNIS — Wikipedia Photo Fetcher');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Limit: ${LIMIT}`);
  console.log(`  Tour: ${TOUR || 'both'}`);
  console.log(`  Force: ${FORCE}`);
  console.log(`  Dry run: ${DRY_RUN}`);
  console.log(`  Report: ${REPORT}`);
  console.log(`  Ranked: ${RANKED}`);
  console.log('');

  let players;

  if (RANKED) {
    // --ranked mode: fetch players from the rankings table who are missing photos
    // This catches lower-ranked players with 0 career titles who appear in ATP/WTA top 100
    console.log('  Mode: RANKED — fetching players from rankings table missing photos...\n');

    // Get the latest ranking date for each tour
    const tours = TOUR ? [TOUR] : ['atp', 'wta'];
    const rankedPlayers = [];

    for (const tour of tours) {
      const { data: dateData } = await supabase
        .from('rankings')
        .select('ranking_date')
        .eq('tour', tour)
        .order('ranking_date', { ascending: false })
        .limit(1);

      if (!dateData?.[0]) continue;

      const latestDate = dateData[0].ranking_date;
      console.log(`  ${tour.toUpperCase()} latest ranking date: ${latestDate}`);

      // Fetch ranked player_ids
      const { data: rankingData, error: rankError } = await supabase
        .from('rankings')
        .select('player_id, ranking')
        .eq('tour', tour)
        .eq('ranking_date', latestDate)
        .order('ranking', { ascending: true })
        .limit(100);

      if (rankError || !rankingData) {
        console.error(`  Failed to fetch ${tour} rankings:`, rankError?.message);
        continue;
      }

      // Now fetch player details for those player_ids
      const playerIds = rankingData.map(r => r.player_id);
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select('player_id, first_name, last_name, full_name, slug, country_code, tour, career_titles, image_url')
        .in('player_id', playerIds);

      if (playerError || !playerData) {
        console.error(`  Failed to fetch player details:`, playerError?.message);
        continue;
      }

      // Build a ranking map for sorting
      const rankMap = new Map(rankingData.map(r => [r.player_id, r.ranking]));

      // Filter: only players missing photos (or force mode)
      const filtered = playerData.filter(p => {
        if (FORCE) return true;
        return !p.image_url || !p.image_url.includes('wikimedia');
      });

      // Attach ranking for display & sorting
      for (const p of filtered) {
        p._ranking = rankMap.get(p.player_id) || 999;
        rankedPlayers.push(p);
      }
    }

    // Sort by ranking
    rankedPlayers.sort((a, b) => a._ranking - b._ranking);

    players = rankedPlayers.slice(0, LIMIT);
  } else {
    // Default mode: fetch players with career_titles > 0
    let query = supabase
      .from('players')
      .select('player_id, first_name, last_name, full_name, slug, country_code, tour, career_titles, image_url')
      .gt('career_titles', 0)
      .order('career_titles', { ascending: false });

    if (TOUR) query = query.eq('tour', TOUR);

    // If not forcing, skip players who already have a wikimedia photo
    if (!FORCE) {
      query = query.or('image_url.is.null,image_url.not.ilike.%wikimedia%');
    }

    query = query.limit(LIMIT);

    const { data, error } = await query;
    if (error) {
      console.error('❌ Failed to fetch players:', error.message);
      process.exit(1);
    }
    players = data;
  }

  if (!players || players.length === 0) {
    console.log('✅ No players to process. All ranked players already have photos!');
    return;
  }

  console.log(`📋 ${players.length} players to process\n`);

  const results = [];
  let found = 0;
  let notFound = 0;
  let errors = 0;

  for (const player of players) {
    const name = `${player.first_name} ${player.last_name}`;
    process.stdout.write(`  🔍 ${name}...`);

    // Try full name first (with redirects enabled for diacritics)
    let imageData = await getWikipediaImage(name);

    // If not found, try with "(tennis)" suffix
    if (!imageData) {
      await sleep(DELAY_MS);
      imageData = await getWikipediaImage(`${name} (tennis)`);
    }

    // Try first_name last_name (tennis player) pattern
    if (!imageData) {
      await sleep(DELAY_MS);
      imageData = await getWikipediaImage(`${name} (tennis player)`);
    }

    // Fallback: use Wikipedia search to find the correct article title
    // Handles diacritical mismatches (Swiatek → Świątek, Monfils → Gaël Monfils)
    if (!imageData) {
      await sleep(DELAY_MS);
      const searchTitle = await searchWikipediaTitle(`${name} tennis player`);
      if (searchTitle) {
        await sleep(DELAY_MS);
        imageData = await getWikipediaImage(searchTitle);
      }
    }

    if (imageData) {
      // Get metadata (license, author)
      await sleep(DELAY_MS);
      const meta = await getImageMetadata(imageData.filename);

      // Build the 400px thumbnail URL
      const photoUrl = imageData.thumbUrl || getResizedUrl(imageData.originalUrl, 400);

      const result = {
        player_id: player.player_id,
        slug: player.slug,
        name,
        tour: player.tour,
        career_titles: player.career_titles,
        country_code: player.country_code,
        photoUrl,
        originalUrl: imageData.originalUrl,
        filename: imageData.filename,
        wikiTitle: imageData.pageTitle,
        license: meta?.license || 'Unknown',
        artist: meta?.artist || 'Unknown',
        commonsUrl: meta?.descriptionUrl || null,
        oldImageUrl: player.image_url,
      };

      results.push(result);

      // Update Supabase unless dry run
      if (!DRY_RUN && photoUrl) {
        const { error: updateError } = await supabase
          .from('players')
          .update({ image_url: photoUrl })
          .eq('player_id', player.player_id);

        if (updateError) {
          console.log(` ❌ DB error: ${updateError.message}`);
          errors++;
        } else {
          console.log(` ✅ ${imageData.filename} [${meta?.license || '?'}]`);
          found++;
        }
      } else {
        console.log(` ✅ (dry) ${imageData.filename}`);
        found++;
      }
    } else {
      console.log(' ❌ no photo found');
      results.push({
        player_id: player.player_id,
        slug: player.slug,
        name,
        tour: player.tour,
        career_titles: player.career_titles,
        country_code: player.country_code,
        photoUrl: null,
        filename: null,
        error: 'Not found on Wikipedia',
      });
      notFound++;
    }

    await sleep(DELAY_MS);
  }

  // Generate HTML report for manual verification
  if (REPORT && results.length > 0) {
    const reportPath = 'scripts/photo-report.html';
    const html = generateReport(results);
    writeFileSync(reportPath, html);
    console.log(`\n📄 Report saved to: ${reportPath}`);
  }

  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log(`  ✅ Found: ${found}`);
  console.log(`  ❌ Not found: ${notFound}`);
  console.log(`  ⚠️  Errors: ${errors}`);
  console.log('═══════════════════════════════════════════════');
}

/**
 * Generate an HTML report for manual photo verification
 */
function generateReport(results) {
  const rows = results.map(r => {
    const img = r.photoUrl
      ? `<img src="${r.photoUrl}" alt="${r.name}" style="width:120px;height:120px;object-fit:cover;border-radius:8px;" loading="lazy" />`
      : `<div style="width:120px;height:120px;background:#f0f0f0;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#999;">No photo</div>`;

    const status = r.photoUrl ? '✅' : '❌';
    const commonsLink = r.commonsUrl ? `<a href="${r.commonsUrl}" target="_blank">Commons</a>` : '';
    const wikiLink = r.wikiTitle ? `<a href="https://en.wikipedia.org/wiki/${encodeURIComponent(r.wikiTitle)}" target="_blank">Wikipedia</a>` : '';

    return `
      <tr>
        <td style="text-align:center">${status}</td>
        <td>${img}</td>
        <td>
          <strong>${r.name}</strong><br>
          <small>${r.tour?.toUpperCase()} · ${r.country_code || ''} · ${r.career_titles} titles</small><br>
          <small>${r.license || ''} · ${(r.artist || '').substring(0, 60)}</small><br>
          <small>${wikiLink} ${commonsLink}</small>
        </td>
        <td><small>${r.filename || r.error || ''}</small></td>
      </tr>
    `;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SUPER.TENNIS — Photo Verification Report</title>
  <style>
    body { font-family: -apple-system, sans-serif; max-width: 1000px; margin: 40px auto; padding: 0 20px; }
    h1 { font-size: 1.5rem; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; vertical-align: middle; }
    th { background: #f9f9f9; font-size: 0.8rem; text-transform: uppercase; }
    a { color: #2d8c3c; }
    .summary { background: #f0fdf4; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
  </style>
</head>
<body>
  <h1>🎾 SUPER.TENNIS — Photo Verification Report</h1>
  <div class="summary">
    <strong>Total:</strong> ${results.length} players |
    <strong>Found:</strong> ${results.filter(r => r.photoUrl).length} |
    <strong>Missing:</strong> ${results.filter(r => !r.photoUrl).length}
    <br><small>Generated: ${new Date().toISOString()}</small>
    <br><small>⚠️ Please verify each photo matches the correct player before approving.</small>
  </div>
  <table>
    <thead>
      <tr><th>OK?</th><th>Photo</th><th>Player</th><th>File</th></tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</body>
</html>`;
}

main().catch(console.error);
