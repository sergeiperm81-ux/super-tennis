import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const slug = 'lost-art-serve-and-volley-grass-tennis-wimbledon';
const now = new Date().toISOString();

const body = `There was a time, not so long ago, when grass-court tennis meant one thing above all others: you served, and then you ran. Forward, fast, to the net, behind the serve, to finish the point with a volley before your opponent could line up a passing shot. For decades that was simply how the best players won on grass — at Wimbledon especially, the whole sport was built around the dash to the net. Watch a match from the 1990s and half the points are over in three or four shots, decided up at the net in a blur of reflex and nerve.

Now? Almost nobody does it. The serve-and-volley game — once the most thrilling, high-wire style in tennis — has very nearly vanished from the professional game. It is one of the quiet tragedies of modern tennis, and the grass season is the one time of year you can still, occasionally, catch a glimpse of the old art flickering back to life.

Here is what we lost, why we lost it, and why grass remains its last refuge.

## What serve-and-volley actually was

The style was exactly what it sounds like. You hit a big serve, and instead of staying back to rally, you sprinted in behind it, arriving at the net just as the return came back, and put the ball away with a volley angled into open court. Done well, it was breathtaking — a combination of power, footwork, soft hands and sheer bravery, all compressed into about two seconds.

It produced some of the sport's greatest champions and most beautiful players. Pete Sampras built seven Wimbledon titles on it. Stefan Edberg made it look like ballet. Patrick Rafter, Boris Becker, John McEnroe, and on the women's side the great Martina Navratilova — they came forward relentlessly, and the grass of Wimbledon was their cathedral, the surface that rewarded the brave more than any other. For a young player learning the game in that era, serve-and-volley was not a tactic. It was the goal.

## Why it died

So where did it go? The honest answer is that the sport quietly engineered it out of existence, in three overlapping ways.

First, the courts slowed down. Around the turn of the millennium, even Wimbledon changed its grass — a denser, more durable ryegrass that made the bounce a touch higher and the surface a fraction slower, taking the sting out of the skidding serve that made rushing in so deadly. The balls got a little heavier too. The margins that serve-and-volley depended on shrank.

Second, and most importantly, the strings changed. The arrival of polyester strings in the 2000s let baseline players generate astonishing topspin — which meant the passing shot, the serve-and-volleyer's nightmare, became a weapon almost anyone could wield. Suddenly, coming to the net was a good way to get a dipping topspin pass fired at your feet. The risk had always been there; now the reward was gone.

Third, the whole game tilted toward the baseline. Fitness, racket and string technology, and the dominance of players like Andre Agassi and then the Federer–Nadal–Djokovic generation made the modern baseline game so powerful and so reliable that there was simply no need to take the risk of rushing the net. Why gamble on a volley when you can out-hit anyone from the back of the court? The economics of winning changed, and serve-and-volley did not survive the new maths.

## Grass: the last refuge

And yet it is not quite dead, and the reason is the grass itself. Even a slowed-down Wimbledon lawn still produces a lower, faster, more unpredictable bounce than clay or hard courts — [the very opposite of the high, slow clay we wrote a love letter to](/lifestyle/roland-garros-clay-terre-battue-why-it-decides-everything). That low skid still, occasionally, rewards the player brave enough to come forward, because a good low volley on grass is very hard to answer.

So it is on grass, and really only on grass, that you still see the old art flicker. The last great all-court player, [Roger Federer](/players/roger-federer/), kept the flame alive longer than anyone, mixing in serve-and-volley points at Wimbledon well into the 2010s with a grace that made you ache for the lost era. A handful of modern players still try it as a surprise weapon, a change of pace, a way to shorten points on a fast day. It is no longer a way of life. But [as the tour makes its strange annual switch from clay to grass](/lifestyle/tennis-clay-to-grass-transition-grass-season-2026), the surface quietly invites the bravest players to remember what their sport used to look like.

## If you ever want to try it yourself

Here is the thing club players discover the moment they attempt it: serve-and-volley is far harder than the pros made it look. Getting to the net in time, then stopping, splitting your feet and changing direction to cover a passing shot, asks more of your movement than any baseline rally ever will — it is all explosive first steps, sudden stops and lateral scrambles. Which is exactly why, if you do want to add a little net-rushing to your own game this grass season, a proper pair of [tennis court shoes](/gear/best-tennis-shoes-2026/) matters more for a would-be volleyer than for almost anyone else on the court. The right shoes are what let you get in, stop, and react — and the wrong ones are how net-rushers turn ankles.

Beyond the footwear, the rest is nerve. Come in behind your best serves, accept that you will get passed sometimes, and enjoy the variety it brings. There is nothing in recreational tennis quite as satisfying as a point won at the net with a crisp volley — a little hit of the old magic.

## Why we miss it

The real loss is not tactical, it is aesthetic. Serve-and-volley gave tennis contrast — the baseliner versus the net-rusher, two completely different philosophies colliding, the rally player trying to pass and the volleyer trying to cut the point short. That contrast made matches into arguments between styles, and it is mostly gone now, replaced by two baseliners hitting hard from the back of the court in broadly the same way.

The modern game is faster, fitter and in many ways more athletic than ever. But it is also more uniform. The vanishing of serve-and-volley took some of the sport's variety, its bravery, and a little of its romance with it — which is why, when a player does come charging in on a Wimbledon afternoon, the whole crowd leans forward. We remember what it used to be.

## The bottom line

Serve-and-volley is not officially dead, but it is on life support, and the grass season is the ward where it is kept breathing. Slower courts, polyester strings and the all-conquering baseline game retired the most thrilling style tennis ever produced, and most of the players who could do it are long since gone.

But for two weeks at Wimbledon, on the low fast lawn that made the art great in the first place, you might just see it again — a player taking the brave option, serving and storming the net, finishing with a volley the way the giants used to. When it happens, savour it. You are watching a ghost of the sport's most romantic age, and the grass is the only place it still walks.

### Sources

- Wimbledon / All England Club: changes to the grass courts in the early 2000s
- ITF: court surface pace ratings and the effect of slower surfaces
- Tennis histories: the decline of serve-and-volley and the rise of the baseline game
- Coverage of polyester strings and their effect on topspin and passing shots
- Profiles of serve-and-volley champions: Sampras, Edberg, Rafter, Becker, Navratilova
- Analyses of Roger Federer's all-court game at Wimbledon

Photo: Roger Federer at the 2019 Wimbledon final / LHC88 / Wikimedia Commons / CC BY 4.0`;

const meta = {
  slug,
  title: "The Lost Art of Serve-and-Volley: Why Grass Is the Last Place It Still Lives.",
  excerpt: "There was a time when grass-court tennis meant one thing: serve, and charge the net. The serve-and-volley game gave the sport Sampras, Edberg, Navratilova and some of its most thrilling tennis — and then it quietly vanished, killed off by slower courts, polyester strings and the all-conquering baseline game. Why the most romantic style in tennis died, and why the grass season is the one place it still flickers back to life.",
  body,
  category: 'lifestyle',
  status: 'published',
  meta_title: "The Lost Art of Serve-and-Volley: Why It Survives Only on Grass",
  meta_description: "Serve-and-volley once ruled grass-court tennis — Sampras, Edberg, Navratilova. Then slower courts, polyester strings and the baseline game killed it off. Why the most thrilling style in tennis vanished, and why Wimbledon's grass is its last refuge.",
  image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Federer_backhand_in_the_2019_Wimbledon_final.png/500px-Federer_backhand_in_the_2019_Wimbledon_final.png',
  image_alt: 'Roger Federer at the 2019 Wimbledon final — the last great all-court player who kept serve-and-volley alive on grass',
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
