/**
 * Generate short news videos (9:16, 10 sec) — v8.
 *
 * Design: text-first, video is just a background.
 *
 * Animation timeline:
 *   0.0–1.5s: Smooth dark overlay via eq=brightness (continuous, no steps)
 *   1.0–1.5s: Category badge fades in
 *   1.5–2.5s: BIG headline (Anton 84px)
 *   4.0–4.5s: Lead text (Anton 60px)
 *   7.0–7.5s: CTA "Full story on SUPER.TENNIS"
 *
 * Fonts: Anton (headline, lead, CTA) + Inter Bold (badge, watermark)
 * Audio: real background music (bg-loop.aac)
 * Background: looped with -stream_loop to ensure full 10s
 */

import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BG_DIR = path.join(ROOT, 'backgrounds');
const OUT_DIR = path.join(ROOT, 'output');
const FONT_DIR = path.join(ROOT, 'fonts');
const HISTORY_FILE = path.join(ROOT, 'bg-history.json');

/**
 * Background rotation — deterministic round-robin.
 * No repeats until every background has been used.
 * Uses a shuffled queue so adjacent videos always differ visually.
 */
function getRotationState() {
  try { return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8')); }
  catch { return { queue: [], used: [] }; }
}
function saveRotationState(state) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(state, null, 2));
}

/** Fisher-Yates shuffle (deterministic seed from date for reproducibility) */
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Permanently banned backgrounds — ball-only / equipment-only / grass clips (user: "never again")
const BANNED_BACKGROUNDS = new Set([
  'bg-05.mp4', // Pexels 5738572 — racket and ball on clay, no player
  'bg-06.mp4', // Pexels 5738573 — ball bouncing on clay/grass, no player
  'bg-07.mp4', // Pexels 5740607 — tennis balls on court surface, no player
  'bg-08.mp4', // Pexels 5740608 — tennis equipment on bench, no player
  'bg-10.mp4', // Pexels 4902141 — ball bounce suspended, no player
  'bg-11.mp4', // Pexels 4902142 — ball bouncing slow motion, no player
  'bg-12.mp4', // Pexels 4902143 — ball bouncing training field, no player
  'bg-13.mp4', // Pexels 4902144 — GRASS + ball, no player (appeared 9x, banned)
  'bg-21.mp4', // Pexels 992694 — outdoor grass court golden hour (no close action)
  'bg-22.mp4', // Pexels 992696 — grass court practice (no close action)
]);

function pickBackground() {
  const allBgs = fs.readdirSync(BG_DIR)
    .filter(f => f.endsWith('.mp4') && !BANNED_BACKGROUNDS.has(f))
    .sort();
  const state = getRotationState();

  // Migrate from old array format
  if (Array.isArray(state)) {
    state.queue = [];
    state.used = [];
  }

  // Purge any banned backgrounds that may have been cached in the queue
  // before they were added to BANNED_BACKGROUNDS (the root cause of bg-13 crash).
  if (state.queue) {
    state.queue = state.queue.filter(f => !BANNED_BACKGROUNDS.has(f));
  }
  if (state.used) {
    state.used = state.used.filter(f => !BANNED_BACKGROUNDS.has(f));
  }

  // Rebuild queue if empty or if new backgrounds were added
  if (!state.queue || state.queue.length === 0) {
    const unused = allBgs.filter(f => !state.used?.includes(f));
    if (unused.length === 0) {
      // Full cycle complete — reset and reshuffle everything
      state.queue = shuffleArray(allBgs);
      state.used = [];
    } else {
      // Shuffle only the remaining unused backgrounds
      state.queue = shuffleArray(unused);
    }
  }

  const picked = state.queue.shift();
  state.used.push(picked);
  saveRotationState(state);
  return picked;
}

function wrapText(text, maxChars) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars && cur) {
      lines.push(cur.trim());
      cur = w;
    } else {
      cur = (cur + ' ' + w).trim();
    }
  }
  if (cur) lines.push(cur.trim());
  return lines;
}

function esc(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, '\u2019').replace(/:/g, '\\:').replace(/%/g, '%%').replace(/"/g, '\\"');
}

function truncate(text, max = 150) {
  if (!text || text.length <= max) return text || '';
  const cut = text.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(' ')) + '...';
}

function hasAudio(filePath) {
  try {
    return execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=codec_name', '-of', 'csv=p=0', filePath], { stdio: 'pipe', timeout: 10000 }).toString().trim().length > 0;
  } catch { return false; }
}

/** Get random background music file (royalty-free, rotates each video) */
function getMusicPath() {
  const musicDir = path.join(ROOT, 'music');
  if (!fs.existsSync(musicDir)) return null;
  const files = fs.readdirSync(musicDir).filter(f => f.endsWith('.aac') || f.endsWith('.mp3'));
  if (files.length === 0) return null;
  const picked = files[Math.floor(Math.random() * files.length)];
  return path.join(musicDir, picked);
}

export async function generateVideo({ title, summary = '', category = 'buzz', index = 0 }) {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const bgFile = pickBackground();
  const bgPath = path.join(BG_DIR, bgFile);
  const outPath = path.join(OUT_DIR, `video-${index}.mp4`);

  // --- Temp dir & fonts ---
  const tmp = '/tmp/stcf';
  if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true });

  const fonts = {
    anton: path.join(FONT_DIR, 'Anton-Regular.ttf'),
    bold: path.join(FONT_DIR, 'Inter-Bold.ttf'),
    regular: path.join(FONT_DIR, 'Inter-Regular.ttf'),
  };
  const tmpFonts = {};
  for (const [key, src] of Object.entries(fonts)) {
    const dst = `${tmp}/${path.basename(src)}`;
    if (fs.existsSync(src) && !fs.existsSync(dst)) fs.copyFileSync(src, dst);
    tmpFonts[key] = fs.existsSync(dst) ? `fontfile=${dst}:` : '';
  }

  // --- Category config ---
  const catConf = {
    scandal: { label: 'SCANDAL', color: '#ef4444' },
    love:    { label: 'LOVE',    color: '#ec4899' },
    money:   { label: 'MONEY',   color: '#eab308' },
    fashion: { label: 'FASHION', color: '#a855f7' },
    viral:   { label: 'VIRAL',   color: '#f97316' },
    buzz:    { label: 'BREAKING',color: '#22c55e' },
    wellness:{ label: 'WELLNESS',color: '#06b6d4' },
  };
  const cat = catConf[category] || catConf.buzz;

  // --- Text layout ---
  // Headline: Anton font, 84px, ~16 chars/line
  const hLines = wrapText(title, 16);
  const hFS = hLines.length > 4 ? 72 : 84;
  const hLH = hFS + 12;

  // Lead: Anton font, 60px, ~24 chars/line — big, bold, readable
  const leadText = truncate(summary, 150);
  const lLines = wrapText(leadText, 24);
  const lFS = 60;
  const lLH = lFS + 12;

  // --- Vertical layout: evenly distribute badge, headline, lead, CTA ---
  // Screen: 1920px high. Safe area: 250–1700 (1450px usable)
  const badgeY = 280;
  const hTop = 360;
  const headlineBlockH = hLines.length * hLH;
  const accentY = hTop + headlineBlockH + 35;  // gap before accent line
  const lTop = accentY + 50;                    // full line gap after accent
  // CTA area: pushed lower
  const ctaBoxY = 1520;
  const ctaLine1Y = 1550;
  const ctaLine2Y = 1610;

  // --- Filter chain ---
  const f = [];

  // 1. Scale + crop to 9:16
  f.push('scale=1080:1920:force_original_aspect_ratio=increase', 'crop=1080:1920');

  // 2. Smooth dark overlay via eq=brightness — continuous expression, no stepping
  // Fades from 0 to -0.65 brightness between 0.2s and 1.5s, stays at -0.65 after
  // Strong darkening ensures white text is always readable, even on bright backgrounds
  f.push(
    `eq=brightness='if(lt(t,0.2),0,if(lt(t,1.5),-0.65*(t-0.2)/1.3,-0.65))'`
  );

  // 3. Category badge — fades in at 1.0s
  f.push(
    `drawtext=${tmpFonts.bold}text='  ${esc(cat.label)}  ':fontsize=32:fontcolor=white:x=(w-text_w)/2:y=${badgeY}:box=1:boxcolor=${cat.color}@0.95:boxborderw=16:enable='gte(t,1.0)':alpha='min((t-1.0)/0.3,1)'`
  );

  // 4. HEADLINE — Anton, fades in at 1.5s, dark pill behind each line for readability
  hLines.forEach((line, i) => {
    const y = hTop + i * hLH;
    f.push(
      `drawtext=${tmpFonts.anton}text='${esc(line.toUpperCase())}':fontsize=${hFS}:fontcolor=white:x=(w-text_w)/2:y=${y}:box=1:boxcolor=black@0.55:boxborderw=12:shadowcolor=black@0.6:shadowx=2:shadowy=2:enable='gte(t,1.5)':alpha='min((t-1.5)/0.5,1)'`
    );
  });

  // 5. Accent line under headline — at 2.5s
  f.push(
    `drawbox=x=340:y=${accentY}:w=400:h=4:color=${cat.color}@0.9:t=fill:enable='gte(t,2.5)':replace=1`
  );

  // 6. LEAD TEXT — Anton 60px, fades in at 4.0s, dark pill behind each line
  if (lLines.length > 0) {
    lLines.forEach((line, i) => {
      const y = lTop + i * lLH;
      f.push(
        `drawtext=${tmpFonts.anton}text='${esc(line)}':fontsize=${lFS}:fontcolor=white@0.92:x=(w-text_w)/2:y=${y}:box=1:boxcolor=black@0.45:boxborderw=10:shadowcolor=black@0.5:shadowx=2:shadowy=2:enable='gte(t,4.0)':alpha='min((t-4.0)/0.5,1)'`
      );
    });
  }

  // 7. CTA — from 7.0s, prominent at bottom
  f.push(
    `drawbox=x=100:y=${ctaBoxY}:w=880:h=200:color=black@0.7:t=fill:enable='gte(t,7.0)'`
  );
  f.push(
    `drawtext=${tmpFonts.anton}text='FULL STORY ON':fontsize=36:fontcolor=white:x=(w-text_w)/2:y=${ctaLine1Y}:shadowcolor=black@0.6:shadowx=2:shadowy=2:enable='gte(t,7.0)':alpha='min((t-7.0)/0.4,1)'`
  );
  f.push(
    `drawtext=${tmpFonts.anton}text='SUPER.TENNIS':fontsize=72:fontcolor=${cat.color}:x=(w-text_w)/2:y=${ctaLine2Y}:shadowcolor=black@0.6:shadowx=2:shadowy=2:enable='gte(t,7.0)':alpha='min((t-7.0)/0.5,1)'`
  );

  // 8. Subtle watermark
  f.push(
    `drawtext=${tmpFonts.bold}text='super.tennis':fontsize=18:fontcolor=white@0.2:x=(w-text_w)/2:y=h-40`
  );

  const vf = f.join(',');

  // --- Audio ---
  const tmpBg = `${tmp}/bg-${index}.mp4`;
  const tmpOut = `${tmp}/out-${index}.mp4`;
  fs.copyFileSync(bgPath, tmpBg);

  const bgAudio = hasAudio(tmpBg);
  const musicPath = getMusicPath();

  // Use -stream_loop -1 to loop short backgrounds so we always get 10s
  const args = ['-y', '-stream_loop', '-1', '-i', tmpBg];

  if (musicPath) {
    args.push('-i', musicPath);
    if (bgAudio) {
      args.push('-filter_complex', '[0:a]volume=0.15[bg];[1:a]volume=0.20[mus];[bg][mus]amix=inputs=2:duration=first:normalize=0[aout]');
      args.push('-map', '0:v', '-map', '[aout]');
    } else {
      args.push('-filter_complex', '[1:a]volume=0.20[aout]');
      args.push('-map', '0:v', '-map', '[aout]');
    }
  } else if (!bgAudio) {
    args.push('-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo');
  }

  args.push(
    '-t', '10',
    '-vf', vf,
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k',
    '-movflags', '+faststart',
    tmpOut,
  );

  console.log(`🎬 Generating video ${index}: "${title}"`);
  console.log(`   Background: ${bgFile} | Category: ${category} | Audio: ${bgAudio ? 'original+music' : 'music'}`);

  try {
    execFileSync('ffmpeg', args, { stdio: 'pipe', timeout: 120000 });
    fs.copyFileSync(tmpOut, outPath);
    fs.unlinkSync(tmpBg);
    fs.unlinkSync(tmpOut);
    console.log(`   ✅ Output: ${(fs.statSync(outPath).size / 1024).toFixed(0)} KB`);
    return outPath;
  } catch (err) {
    console.error(`   ❌ FFmpeg error:`, err.stderr?.toString().slice(-500) || err.message);
    try { fs.unlinkSync(tmpBg); } catch {}
    try { fs.unlinkSync(tmpOut); } catch {}
    return null;
  }
}

// CLI
if (process.argv.includes('--test')) {
  await generateVideo({
    title: 'Djokovic Withdraws from Miami Open!',
    summary: 'World No. 1 Novak Djokovic has officially pulled out of the Miami Open, citing a persistent knee injury that has plagued him all season.',
    category: 'buzz',
    index: 0,
  }).then(r => r && console.log(`\n🎉 Test: ${r}`));
} else if (process.argv.includes('--headlines')) {
  const idx = process.argv.indexOf('--headlines');
  const items = JSON.parse(process.argv[idx + 1]);
  for (let i = 0; i < items.length; i++) {
    const h = items[i];
    await generateVideo({ title: h.title || h, summary: h.summary || '', category: h.category || 'buzz', index: i });
  }
}
