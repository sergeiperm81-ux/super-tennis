import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const slugs = [
  'daniil-medvedev','serena-williams','venus-williams','justine-henin',
  'kim-clijsters','stefanos-tsitsipas','maria-sharapova','chris-evert',
  'martina-navratilova','monica-seles','steffi-graf','naomi-osaka',
  'rafael-nadal','novak-djokovic','roger-federer','carlos-alcaraz',
  'jannik-sinner','iga-swiatek','aryna-sabalenka','coco-gauff',
  'alexander-zverev','nick-kyrgios','andy-murray','john-mcenroe',
  'bjorn-borg','pete-sampras','andre-agassi','jimmy-connors','ivan-lendl',
  'john-isner'
];

const { data, error } = await sb.from('players').select('slug, image_url').in('slug', slugs);
if (error) { console.error(error); process.exit(1); }

for (const p of data.sort((a, b) => a.slug.localeCompare(b.slug))) {
  const status = p.image_url ? 'OK ' + p.image_url.substring(0, 80) : 'MISSING';
  console.log(`${p.slug} | ${status}`);
}

console.log('\n---');
console.log(`Found: ${data.length} of ${slugs.length} requested`);
const missing = slugs.filter(s => !data.find(d => d.slug === s));
if (missing.length) console.log('Not in DB:', missing.join(', '));
const noPhoto = data.filter(d => !d.image_url);
if (noPhoto.length) console.log('In DB but no photo:', noPhoto.map(d => d.slug).join(', '));
