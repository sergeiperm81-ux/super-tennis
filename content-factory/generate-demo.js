/**
 * Generate TikTok App Review Demo Video
 * Simple approach: generate colored slides with text via FFmpeg
 */

import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const OUT = 'demo-frames';
const W = 1280;
const H = 720;

const slides = [
  { title: 'SUPER.TENNIS - TikTok Integration Demo', body: 'End-to-end flow showing Content Posting API integration', dur: 4 },
  { title: 'Step 1 - News Collection (Daily)', body: 'Cloudflare Worker collects 25 tennis news from RSS feeds daily at 06 UTC. Sources include ESPN, BBC Sport, Google News. All stored in Supabase database.', dur: 5 },
  { title: 'Step 2 - Video Generation', body: 'GitHub Actions runs Content Factory at 07 UTC. Picks top headline, generates 10-second vertical video with FFmpeg. Animated text overlay plus royalty-free music.', dur: 5 },
  { title: 'Step 3 - TikTok OAuth via Login Kit', body: 'Platform admin authenticates via TikTok OAuth. Scope user.info.basic reads profile info. Server-side token stored securely. No end-user login required.', dur: 4 },
  { title: 'Step 4 - Publish via Content Posting API', body: 'Video uploaded using video.upload scope. Published using video.publish scope. Method is Direct Post via push_by_file. Video appears on @supertennisnews TikTok account.', dur: 5 },
  { title: 'Step 5 - Tracking Dashboard', body: 'super.tennis/stats shows Video Publications tab. Tracks every publication with scheduled time, YouTube status, TikTok status, and error messages if any.', dur: 5 },
  { title: 'Architecture', body: 'RSS Feeds then AI Curation then Supabase DB then FFmpeg Video then TikTok Content Posting API then @supertennisnews on TikTok', dur: 5 },
  { title: 'Website - super.tennis', body: '1900 plus pages. 200 player profiles. Daily news. Terms at super.tennis/terms. Privacy at super.tennis/privacy. TikTok @supertennisnews. YouTube @SuperTennisNews', dur: 5 },
];

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

for (let i = 0; i < slides.length; i++) {
  const s = slides[i];
  const outFile = path.join(OUT, `slide-${String(i).padStart(2, '0')}.mp4`);

  // Build drawtext filter - escape colons and quotes for FFmpeg
  const safeTitle = s.title.replace(/'/g, "\u2019").replace(/:/g, '\\:');
  const safeBody = s.body.replace(/'/g, "\u2019").replace(/:/g, '\\:');

  const filter = [
    `drawtext=text='${safeTitle}':fontsize=32:fontcolor=white:x=(w-text_w)/2:y=60`,
    `drawtext=text='${safeBody}':fontsize=22:fontcolor=0xd1d5db:x=80:y=200:line_spacing=14`,
    `drawtext=text='super.tennis':fontsize=16:fontcolor=0x6b7280:x=(w-text_w)/2:y=${H - 40}`,
  ].join(',');

  const args = [
    '-y',
    '-f', 'lavfi',
    '-i', `color=c=0x1a1a2e:s=${W}x${H}:d=${s.dur}`,
    '-vf', filter,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
    outFile,
  ];

  console.log(`Slide ${i + 1}/${slides.length}: ${s.title}`);
  try {
    execFileSync('ffmpeg', args, { stdio: 'pipe' });
  } catch (e) {
    console.error(`  FAIL:`, e.stderr?.toString().split('\n').slice(-3).join('\n'));
  }
}

// Concat
const listFile = path.join(OUT, 'list.txt');
fs.writeFileSync(listFile, slides.map((_, i) =>
  `file '${path.resolve(OUT, `slide-${String(i).padStart(2, '0')}.mp4`).replace(/\\/g, '/')}'`
).join('\n'));

const finalOut = 'tiktok-demo.mp4';
console.log(`\nConcat → ${finalOut}`);
execFileSync('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', finalOut], { stdio: 'pipe' });

const sz = fs.statSync(finalOut).size;
console.log(`Done: ${finalOut} (${(sz / 1024 / 1024).toFixed(1)} MB)`);
