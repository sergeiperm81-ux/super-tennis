import https from 'https';
import fs from 'fs';
import path from 'path';

const photos = [
  { url: 'https://images.unsplash.com/photo-1601646840214-a9d74f908a9f?w=800&q=80', file: 'public/images/gear/tennis-balls.jpg' },
  { url: 'https://images.unsplash.com/photo-1681307640559-fb87ed1a8348?w=800&q=80', file: 'public/images/gear/tennis-ball-machine.jpg' },
  { url: 'https://images.unsplash.com/photo-1508832853614-be55e0b8fdec?w=800&q=80', file: 'public/images/gear/tennis-racket-vintage.jpg' },
  { url: 'https://images.unsplash.com/photo-1696688713460-de12ac76ebc6?w=800&q=80', file: 'public/images/gear/tennis-watch.jpg' },
  { url: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80', file: 'public/images/gear/tennis-net.jpg' },
  { url: 'https://images.unsplash.com/photo-1631880383152-f29099b0fd16?w=800&q=80', file: 'public/images/lifestyle/tennis-nutrition.jpg' },
  { url: 'https://images.unsplash.com/photo-1620177088260-a9150572baf4?w=800&q=80', file: 'public/images/lifestyle/cinema-popcorn.jpg' },
  { url: 'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?w=800&q=80', file: 'public/images/lifestyle/airplane-travel.jpg' },
  { url: 'https://images.unsplash.com/photo-1566093284990-aefe8cc59698?w=800&q=80', file: 'public/images/lifestyle/tennis-fashion.jpg' },
  { url: 'https://images.unsplash.com/photo-1617952986600-802f965dcdbc?w=800&q=80', file: 'public/images/lifestyle/tennis-physio.jpg' },
  { url: 'https://images.unsplash.com/photo-1759506266118-15537c32619b?w=800&q=80', file: 'public/images/lifestyle/padel-court.jpg' },
];

function download(url, filePath) {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    https.get(url, { headers: { 'User-Agent': 'SuperTennis/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        download(res.headers.location, filePath).then(resolve).catch(reject);
        return;
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        fs.writeFileSync(filePath, buf);
        console.log(`OK ${filePath} (${Math.round(buf.length/1024)}KB)`);
        resolve();
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  for (const p of photos) {
    await download(p.url, p.file);
  }
  console.log('All photos downloaded!');
}

main().catch(console.error);
