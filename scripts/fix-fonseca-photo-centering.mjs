import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const slug = 'joao-fonseca-roland-garros-2026-brazil-guga-kuerten-heir';

// The Argentina Open celebration photo is a portrait with the cap/arms at the top
// and the face lower; the homepage card-hero uses object-position:top, so it cropped
// to the cap and cut the face. Swiss Indoors Basel 2025 is landscape with the face
// clearly in the top third — crops cleanly with object-position:top.
const newImageUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Jo%C3%A3o_Fonseca%2C_Swiss_Indoors_Basel_2025.jpg/500px-Jo%C3%A3o_Fonseca%2C_Swiss_Indoors_Basel_2025.jpg';
const newImageAlt = 'Joao Fonseca at the Swiss Indoors Basel 2025 — the 19-year-old Brazilian arriving at Roland Garros 2026 as the heir to Gustavo Kuerten';
const newCreditLine = 'Photo: Joao Fonseca at the Swiss Indoors Basel 2025 / Skyscraper2010 / Wikimedia Commons / CC BY-SA 4.0';

const { data: rows, error: fetchErr } = await supabase
  .from('articles')
  .select('id, body')
  .eq('slug', slug)
  .limit(1);

if (fetchErr) { console.error(fetchErr.message); process.exit(1); }
if (!rows || rows.length === 0) { console.error('Not found:', slug); process.exit(1); }

// Replace the trailing "Photo: ..." credit line (covers the old Argentina credit).
const body = rows[0].body.replace(/Photo:.*$/s, newCreditLine);

const { data, error } = await supabase
  .from('articles')
  .update({
    image_url: newImageUrl,
    image_alt: newImageAlt,
    body,
    updated_at: new Date().toISOString(),
  })
  .eq('id', rows[0].id)
  .select('id, slug, image_url');

if (error) { console.error('Error:', error.message); process.exit(1); }
console.log('Photo recentered:', data[0]);
