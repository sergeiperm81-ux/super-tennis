import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const slug = 'best-tennis-books-ever-written-wimbledon-reading-list';
const now = new Date().toISOString();

function amazon(query, text) {
  const q = encodeURIComponent(query).replace(/%20/g, '+');
  return `<a href="https://www.amazon.com/s?k=${q}&tag=supertennis0b-20" rel="sponsored noopener noreferrer">${text}</a>`;
}

const body = `Here is a small secret that every tennis obsessive eventually discovers: the best writing about tennis is almost as good as the tennis itself. There is something about this particular sport — the solitude of it, the rhythm, the long silences broken by violence, the way it happens inside a player's head as much as on the court — that has drawn extraordinary writers to it for a hundred years. No other sport has a literature this good.

So as the Wimbledon fortnight approaches and the grass-court summer settles in, here is your reading list: the finest tennis books ever written, the ones worth keeping on the shelf and pulling out during a rain delay. Pour yourself something cold, find the strawberries, and dig in.

## Open — Andre Agassi

Start here, because nothing else is quite like it. ${amazon('Open Andre Agassi memoir book', 'Open')}, Andre Agassi's 2009 memoir, is routinely called the greatest sports autobiography ever written, and the praise is not lazy — it really is that good. Ghost-written with the novelist J.R. Moehringer, it opens with a sentence that detonates everything you thought you knew about the sport: "I play tennis for a living, even though I hate tennis, hate it with a dark and secret passion."

What follows is a brutally honest account of a life spent doing, at the highest level, something he never chose — the tyrannical father, the crystal-meth year, the toupee that nearly fell off in a Grand Slam final, the slow journey to actually loving the game. You do not need to care about tennis to be wrecked by it. It is, simply, a great book. If you read only one title on this list, read this one.

## Levels of the Game — John McPhee

The classic, and the proof that a whole book can live inside a single match. ${amazon('Levels of the Game John McPhee', 'Levels of the Game')}, John McPhee's slim 1969 masterpiece, takes one semi-final between Arthur Ashe and Clark Graebner and uses it to x-ray two men, two temperaments and, quietly, the whole of late-1960s America — the Black liberal and the white conservative, point by point.

It is barely 150 pages and not one of them is wasted. Writers still study it as a model of how to build narrative tension out of something as small as a tennis match. For anyone who loves both sport and sentences, it is essential.

## String Theory — David Foster Wallace

David Foster Wallace was a nationally ranked junior player before he became one of the most dazzling writers of his generation, and tennis never left him. ${amazon('String Theory David Foster Wallace tennis essays', 'String Theory')} collects his five great tennis essays, including the famous "Roger Federer as Religious Experience," in which he tries to describe what Federer's body actually does — and gets closer than anyone before or since.

Wallace writes about the physics, the geometry, the near-impossible beauty of elite tennis with a precision that will change how you watch it. The essay on the journeyman Michael Joyce, in particular, is one of the truest things ever written about what professional sport actually costs the people who play it.

## A Handful of Summers — Gordon Forbes

For something warmer and funnier, reach for ${amazon('A Handful of Summers Gordon Forbes', 'A Handful of Summers')}. Gordon Forbes was a good South African player in the 1950s and 60s — the amateur era, before the money, when the players travelled the world together by boat and train and treated the whole thing as one long, glorious adventure.

His 1978 memoir is a love letter to that vanished world: the friendships, the parties, the romance of a tennis circuit that felt like a travelling family. It is gentle, hilarious, and quietly moving, and it captures something the modern game, for all its brilliance, has lost. Players and writers alike adore it.

## The Master — Christopher Clarey

If you want the definitive account of the most beloved player of the modern era, ${amazon('The Master Christopher Clarey Roger Federer biography', 'The Master')} is the Roger Federer biography to own. Christopher Clarey covered Federer's entire career up close for decades, and his 2021 book is the result — thorough, intimate, and clear-eyed about both the genius and the man behind it.

It is the perfect companion read for a Wimbledon fortnight, the tournament Federer made his own. Whether you worship him or simply admire what he did to the sport, this is the fullest portrait we have.

## Rafa — Rafael Nadal

And for the other side of that great rivalry, ${amazon('Rafa Rafael Nadal John Carlin autobiography', 'Rafa')}, written with the journalist John Carlin, is Rafael Nadal's own story in his own words. What makes it fascinating is how much anxiety it reveals beneath the warrior — the superstitions, the nerves, the relentless inner doubt that drove one of the most ferocious competitors the game has ever seen.

Read alongside The Master, the two books make a perfect pair: the artist and the warrior, the two players who defined an era, told from the inside.

## Why tennis is the most literary sport

It is worth asking why tennis, of all games, keeps producing writing this good. Part of it is the solitude — a player stands alone, no teammates, no coach allowed to speak, nothing but their own mind to fall back on, which makes it irresistibly novelistic. Part of it is the rhythm, the way a match breathes, the long psychological arcs of a five-setter. And part of it is simply that the sport has been lucky in its admirers: from McPhee to Wallace to a hundred others, the best writers keep finding their way to the baseline.

Whatever the reason, the result is a bookshelf richer than almost any other sport can offer. These six are the place to start.

## The bottom line

Tennis gives you two great pleasures, and the Wimbledon fortnight is the perfect time for both: the matches themselves, and the reading that deepens them. Watch Centre Court in the afternoon; read Agassi or Wallace or Forbes in the evening, and you will find the two feeding each other — the books making you see more on court, the tennis making the books come alive.

Start with ${amazon('Open Andre Agassi memoir book', 'Open')} if you read nothing else. Then work your way through the rest across the summer. By the time the trophies are lifted, you will not only have watched a great fortnight of tennis — you will understand it, and love it, a little more deeply than before. That is what the best tennis books do. Happy reading.

### Sources

- Andre Agassi, "Open: An Autobiography" (with J.R. Moehringer, 2009)
- John McPhee, "Levels of the Game" (1969)
- David Foster Wallace, "String Theory: David Foster Wallace on Tennis" (essay collection)
- Gordon Forbes, "A Handful of Summers" (1978)
- Christopher Clarey, "The Master: The Brilliant Career of Roger Federer" (2021)
- Rafael Nadal with John Carlin, "Rafa: My Story" (2011)

Photo: Summer reading — a stack of books / Morgan Harper Nichols / Wikimedia Commons / CC0`;

const meta = {
  slug,
  title: "The Best Tennis Books Ever Written: Your Wimbledon Fortnight Reading List.",
  excerpt: "The best writing about tennis is almost as good as the tennis itself — no other sport has a literature this rich. From Andre Agassi's astonishing 'Open' to David Foster Wallace on Federer's genius, John McPhee's classic, and the memoirs of Nadal and the man who chronicled Federer — here are the six finest tennis books ever written, the perfect companions for a Wimbledon fortnight.",
  body,
  category: 'lifestyle',
  status: 'published',
  meta_title: "The Best Tennis Books Ever Written — A Wimbledon Reading List",
  meta_description: "The six greatest tennis books to read this Wimbledon: Agassi's 'Open', David Foster Wallace's 'String Theory', McPhee's 'Levels of the Game', Gordon Forbes, Clarey's Federer biography and Nadal's 'Rafa'. The perfect grass-season reading list.",
  image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Summer_Reading_%28Unsplash%29.jpg/500px-Summer_Reading_%28Unsplash%29.jpg',
  image_alt: 'A stack of books for summer reading — the best tennis books to read during the Wimbledon fortnight',
  published_at: now,
  updated_at: now,
  ai_model: 'claude-opus-4.8-1m',
  ai_generated_at: now,
};

console.log(`Publishing /lifestyle/${slug}/...`);
const { data, error } = await supabase
  .from('articles')
  .upsert(meta, { onConflict: 'slug' })
  .select('id, slug, title, image_url');

if (error) { console.error('Error:', error.message); process.exit(1); }
console.log('Published:', data?.[0]);
