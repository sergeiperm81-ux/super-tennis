/**
 * Add affiliate CTAs to vs/ articles that don't have them yet.
 * Categorizes each article by slug to pick the right CTA block.
 *
 * Run: node scripts/add-vs-affiliate-links.mjs [--dry-run]
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const DRY_RUN = process.argv.includes('--dry-run');

// ─── CTA blocks ────────────────────────────────────────────────────────────

const RACKET_CTA = `

---

## Shop Tennis Rackets

Find the right racket for your game:

👉 [Head Heavy Rackets on Amazon](https://www.amazon.com/s?tag=supertennis0b-20&k=head+heavy+tennis+racket) | [Head Light Rackets](https://www.amazon.com/s?tag=supertennis0b-20&k=head+light+tennis+racket) | [All Tennis Rackets](https://www.amazon.com/s?tag=supertennis0b-20&k=tennis+racket)

## Improve Your Technique

The right equipment is only half the equation:

🎾 [Tennis Training Programs](http://www.memberstennisfitness.com/a/2147833367/Fq9Sy7S5) — Expert coaching for all levels. Code **SERGEI** for 10% off!`;

const STRINGS_CTA = `

---

## Shop Tennis Strings

Choose the right strings for your playing style:

👉 [Natural Gut Strings on Amazon](https://www.amazon.com/s?tag=supertennis0b-20&k=natural+gut+tennis+strings) | [Polyester Strings](https://www.amazon.com/s?tag=supertennis0b-20&k=polyester+tennis+strings) | [All Tennis Strings](https://www.amazon.com/s?tag=supertennis0b-20&k=tennis+strings)

## Maximize Your String's Potential

Great strings paired with great technique = results:

🎾 [Tennis Training Programs](http://www.memberstennisfitness.com/a/2147833367/Fq9Sy7S5) — Expert coaching for all levels. Code **SERGEI** for 10% off!`;

const SHOES_CTA = `

---

## Shop Tennis Shoes

The right shoes for your court surface:

👉 [Clay Court Shoes on Amazon](https://www.amazon.com/s?tag=supertennis0b-20&k=clay+court+tennis+shoes) | [Hard Court Shoes](https://www.amazon.com/s?tag=supertennis0b-20&k=hard+court+tennis+shoes) | [All Tennis Shoes](https://www.amazon.com/s?tag=supertennis0b-20&k=tennis+shoes)

## Train Smarter on Any Surface

🎾 [Tennis Fitness Programs](http://www.memberstennisfitness.com/a/2147833367/Fq9Sy7S5) — Footwork drills and conditioning. Code **SERGEI** for 10% off!`;

const PLAYER_RIVALRY_CTA = `

---

## Train Like the Pros

Want to improve your own game? These programs are used by serious players worldwide:

🎾 [Complete Tennis Training](http://www.memberstennisfitness.com/a/2147833367/Fq9Sy7S5) — Expert coaching for all levels. Code **SERGEI** for 10% off!

## Essential Tennis Gear

👉 [Tennis rackets on Amazon](https://www.amazon.com/s?tag=supertennis0b-20&k=tennis+racket) | [Tennis bags](https://www.amazon.com/s?tag=supertennis0b-20&k=tennis+bag) | [Tennis shoes](https://www.amazon.com/s?tag=supertennis0b-20&k=tennis+shoes)`;

const TOURNAMENT_CTA = `

---

## Follow the Action

Watch your favorite Grand Slam rivalries live:

👉 [Tennis rackets on Amazon](https://www.amazon.com/s?tag=supertennis0b-20&k=tennis+racket) | [Tennis gear](https://www.amazon.com/s?tag=supertennis0b-20&k=tennis+gear)

## Play Like Your Favorites

🎾 [Tennis Training Programs](http://www.memberstennisfitness.com/a/2147833367/Fq9Sy7S5) — Train smarter, not harder. Code **SERGEI** for 10% off!`;

const SPORT_COMPARISON_CTA = `

---

## Get Started With Tennis

New to the sport? Here's everything you need:

👉 [Beginner Tennis Rackets on Amazon](https://www.amazon.com/s?tag=supertennis0b-20&k=beginner+tennis+racket) | [Tennis balls](https://www.amazon.com/s?tag=supertennis0b-20&k=tennis+balls) | [Tennis shoes](https://www.amazon.com/s?tag=supertennis0b-20&k=tennis+shoes)

## Learn Faster With Expert Coaching

🎾 [Tennis Training Programs](http://www.memberstennisfitness.com/a/2147833367/Fq9Sy7S5) — Beginner to advanced. Code **SERGEI** for 10% off!`;

// ─── Categorize by slug ─────────────────────────────────────────────────────

const PLAYER_NAMES = [
  'federer','nadal','djokovic','alcaraz','sinner','medvedev','zverev','kyrgios',
  'tsitsipas','rune','draper','shelton','fritz','tiafoe','ruud','murray','wawrinka',
  'swiatek','sabalenka','rybakina','gauff','osaka','barty','pegula','keys',
  'serena','venus','williams','graf','navratilova','hingis','sharapova','evert',
  'henin','clijsters','seles','agassi','sampras','borg','mcenroe','lendl','connors',
  'edberg','becker','big-three',
];

const TOURNAMENT_SLUGS = [
  'australian-open','us-open','wimbledon','roland-garros','french-open',
  'grand-slam',
];

function categorizeCTA(slug) {
  const s = slug.toLowerCase();

  if (s.includes('racket')) return RACKET_CTA;
  if (s.includes('string')) return STRINGS_CTA;
  if (s.includes('clay') || s.includes('hard-court') || s.includes('indoor') || s.includes('outdoor') || s.includes('surface')) return SHOES_CTA;
  if (TOURNAMENT_SLUGS.some(t => s.includes(t))) return TOURNAMENT_CTA;
  if (s.includes('squash') || s.includes('badminton') || s.includes('table-tennis') || s.includes('pickleball')) return SPORT_COMPARISON_CTA;
  if (PLAYER_NAMES.some(p => s.includes(p))) return PLAYER_RIVALRY_CTA;

  // Default: player rivalry CTA for general vs articles
  return PLAYER_RIVALRY_CTA;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function run() {
  console.log(`\n🔗 VS Article Affiliate Link Adder ${DRY_RUN ? '(DRY RUN)' : ''}\n`);

  const { data: articles, error } = await supabase
    .from('articles')
    .select('slug, title, body')
    .eq('category', 'vs');

  if (error) throw error;
  console.log(`📋 Found ${articles.length} vs/ articles\n`);

  let added = 0, skipped = 0;
  const updates = [];

  for (const article of articles) {
    // Skip if already has affiliate links
    if (article.body.includes('supertennis0b-20') || article.body.includes('memberstennisfitness.com')) {
      skipped++;
      continue;
    }

    const cta = categorizeCTA(article.slug);
    const newBody = article.body + cta;
    updates.push({ slug: article.slug, title: article.title, newBody });
    added++;
  }

  console.log(`✅ To add affiliate links: ${added}`);
  console.log(`⏭️  Already have links: ${skipped}\n`);

  if (DRY_RUN) {
    console.log('DRY RUN — showing first 5 updates:');
    for (const u of updates.slice(0, 5)) {
      const ctaType = u.newBody.includes('racket') && u.slug.includes('racket') ? 'RACKET'
        : u.newBody.includes('string') && u.slug.includes('string') ? 'STRINGS'
        : u.slug.includes('shoes') || u.slug.includes('clay') ? 'SHOES'
        : u.slug.includes('squash') || u.slug.includes('badminton') ? 'SPORT_COMPARISON'
        : 'PLAYER_RIVALRY';
      console.log(`  ${u.slug} → ${ctaType}`);
    }
    return;
  }

  // Apply updates in batches of 10
  const BATCH = 10;
  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH);
    await Promise.all(batch.map(u =>
      supabase.from('articles').update({ body: u.newBody }).eq('slug', u.slug)
    ));
    console.log(`  ✅ Updated ${Math.min(i + BATCH, updates.length)}/${updates.length}`);
  }

  console.log(`\n🎉 Done! ${added} vs/ articles now have affiliate links.`);
  console.log('   Rebuild + deploy to make them live on super.tennis\n');
}

run().catch(e => { console.error('❌', e.message); process.exit(1); });
