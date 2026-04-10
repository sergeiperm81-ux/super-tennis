#!/usr/bin/env node
/**
 * Find TLR (TennisLiveRanking) IDs for players that don't have them yet.
 *
 * Targets: players with photos + career titles but no tlr_player_id
 * (historical players: Federer, Serena, Murray, Sharapova, etc.)
 *
 * Strategy:
 *   1. Search TLR via /search?q={last_name}
 *   2. Parse JSON-LD ItemList OR player links /player/{slug}/{id}
 *   3. Match by name similarity
 *   4. Set tlr_player_id + tlr_slug in Supabase
 *
 * Run: node scripts/find-tlr-ids.mjs [--dry-run] [--limit=50]
 * Requires env: SUPABASE_URL, SUPABASE_SERVICE_KEY
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT_FLAG = process.argv.find(a => a.startsWith('--limit='));
const LIMIT = LIMIT_FLAG ? parseInt(LIMIT_FLAG.split('=')[1]) : 50;

const BASE_URL = 'https://tennisliveranking.com';
const DELAY_MS = 1500;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ─── Name similarity ────────────────────────────────────────────────────────

function normalizeName(s) {
  return s.toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Simple token overlap score (0-1) */
function nameSimilarity(a, b) {
  const ta = new Set(normalizeName(a).split(' '));
  const tb = new Set(normalizeName(b).split(' '));
  const overlap = [...ta].filter(t => tb.has(t)).length;
  return overlap / Math.max(ta.size, tb.size);
}

// ─── Parse TLR search/player page for player links ─────────────────────────

/**
 * Extract {name, tlr_slug, tlr_id} entries from a TLR HTML page.
 * Tries JSON-LD ItemList first, falls back to href scanning.
 */
function extractPlayerLinks(html) {
  const results = [];

  // Strategy 1: JSON-LD ItemList (rankings and search pages)
  const jsonBlocks = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [];
  for (const block of jsonBlocks) {
    try {
      const raw = JSON.parse(block.replace(/<script[^>]*>/, '').replace(/<\/script>/, '').trim());
      const items = Array.isArray(raw) ? raw : [raw];
      for (const item of items) {
        if (item['@type'] === 'ItemList' && item.itemListElement) {
          for (const entry of item.itemListElement) {
            const person = entry.item || entry;
            const urlM = (person.url || '').match(/\/player\/([^/]+)\/([^/?#\s]+)/);
            if (urlM && person.name) {
              results.push({ name: person.name, tlr_slug: urlM[1], tlr_id: urlM[2] });
            }
          }
        }
        // Single Person (individual profile page)
        if (item['@type'] === 'Person' && item.url && item.name) {
          const urlM = item.url.match(/\/player\/([^/]+)\/([^/?#\s]+)/);
          if (urlM) results.push({ name: item.name, tlr_slug: urlM[1], tlr_id: urlM[2] });
        }
      }
    } catch { /* bad JSON */ }
  }

  if (results.length > 0) return results;

  // Strategy 2: Scan all href="/player/..." links
  const linkRe = /href="\/player\/([a-z0-9-]+)\/([A-Za-z0-9]{3,8})"/g;
  let m;
  // Also grab nearby anchor text as name
  const anchors = html.match(/<a[^>]+href="\/player\/[^"]+">([^<]+)<\/a>/g) || [];
  for (const a of anchors) {
    const hrefM = a.match(/href="\/player\/([a-z0-9-]+)\/([A-Za-z0-9]{3,8})"/);
    const nameM = a.match(/>([^<]+)<\/a>/);
    if (hrefM && nameM) {
      results.push({ name: nameM[1].trim(), tlr_slug: hrefM[1], tlr_id: hrefM[2] });
    }
  }

  return results;
}

// ─── Search TLR for a player ───────────────────────────────────────────────

async function searchTlrPlayer(firstName, lastName) {
  const query = encodeURIComponent(lastName);
  const urls = [
    `${BASE_URL}/search?q=${query}`,
    `${BASE_URL}/en/search?q=${query}`,
    `${BASE_URL}/player/search?q=${query}`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'SuperTennis/1.0 (https://super.tennis)',
          'Accept': 'text/html',
        },
        redirect: 'follow',
      });
      if (!res.ok) continue;
      const html = await res.text();
      const candidates = extractPlayerLinks(html);
      if (candidates.length > 0) {
        // Find best match by name
        const fullName = `${firstName} ${lastName}`;
        let best = null, bestScore = 0;
        for (const c of candidates) {
          const score = nameSimilarity(fullName, c.name);
          if (score > bestScore) { bestScore = score; best = c; }
        }
        if (best && bestScore >= 0.5) return best;
      }
    } catch { /* try next URL */ }
  }

  // Fallback: try fetching the player's likely TLR URL directly
  // TLR slugs match our slugs in most cases
  const ourSlug = `${firstName}-${lastName}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  // We don't know the 4-char ID, so we can't use this without a search
  return null;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔍 TLR ID Finder ${DRY_RUN ? '(DRY RUN)' : ''} — limit ${LIMIT}\n`);

  // Get players with pages but no TLR ID
  const { data: players, error } = await supabase
    .from('players')
    .select('player_id, first_name, last_name, slug, tour, career_titles')
    .is('tlr_player_id', null)
    .not('image_url', 'is', null)
    .gt('career_titles', 3)
    .order('career_titles', { ascending: false })
    .limit(LIMIT);

  if (error) { console.error('❌ DB error:', error.message); process.exit(1); }
  console.log(`📋 ${players.length} players to search for\n`);

  let found = 0, missed = 0;

  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    const label = `[${i + 1}/${players.length}] ${p.first_name} ${p.last_name} (${p.career_titles} titles)`;

    const result = await searchTlrPlayer(p.first_name, p.last_name);
    await sleep(DELAY_MS);

    if (!result) {
      console.log(`  ❌ ${label}: not found on TLR`);
      missed++;
      continue;
    }

    console.log(`  ✅ ${label}: ${result.tlr_slug}/${result.tlr_id} (matched: "${result.name}")`);
    found++;

    if (!DRY_RUN) {
      const { error: upErr } = await supabase
        .from('players')
        .update({ tlr_player_id: result.tlr_id, tlr_slug: result.tlr_slug })
        .eq('player_id', p.player_id);
      if (upErr) console.warn(`    ⚠️ DB update failed: ${upErr.message}`);
    }
  }

  console.log(`\n✅ Done! Found: ${found}  Missed: ${missed}`);
  if (found > 0 && !DRY_RUN) {
    console.log('   Run enrich-players-tlr.mjs to fetch their profile data.\n');
  }
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
