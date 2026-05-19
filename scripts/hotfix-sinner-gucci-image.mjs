import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const slug = 'jannik-sinner-gucci-black-bag-rome-2026';

// Was pointing to /images/lifestyle/gucci-logo-hero.webp which doesn't exist
// (404 on the live site, not in repo). Swap for a verified Wikimedia thumb.
const fix = {
  image_url:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Jannik_Sinner_vs_Richard_Gasquet%2C_2025_Roland_Garros%2C_2025-05-29_%28248%29.jpg/500px-Jannik_Sinner_vs_Richard_Gasquet%2C_2025_Roland_Garros%2C_2025-05-29_%28248%29.jpg',
  image_alt: 'Jannik Sinner at the 2025 Roland Garros',
  updated_at: new Date().toISOString(),
};

console.log(`Patching image_url for /lifestyle/${slug}/...`);
const { data, error } = await supabase
  .from('articles')
  .update(fix)
  .eq('slug', slug)
  .select('id, slug, image_url');

if (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
if (!data || data.length === 0) {
  console.error('No row matched slug:', slug);
  process.exit(1);
}
console.log('Patched:', data[0]);
