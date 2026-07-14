import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const slug = 'wimbledon-2026-recap-sinner-noskova-champions';
const now = new Date().toISOString();

const title = 'Wimbledon 2026: Sinner Defends His Crown, Noskova Steals the Show';
const meta_title = title;
const meta_description = 'Wimbledon 2026 is over. Jannik Sinner defended his title and won a fifth major; 21-year-old Linda Noskova won an all-Czech final for her first. The fortnight, wrapped.';
const excerpt = 'Two very different champions, a British fairytale, a Czech takeover, and the end of a Djokovic dream. Everything that happened at Wimbledon 2026, in one place.';
const image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Jannik_Sinner_%282024_US_Open%29_04_%28cropped%29.jpg/500px-Jannik_Sinner_%282024_US_Open%29_04_%28cropped%29.jpg';
const image_alt = 'Jannik Sinner in a navy shirt and white cap, racket raised on the follow-through of a forehand';

const body = `The gates are shut, the grass is scuffed brown along the baselines, and the tarpaulins are back over Centre Court. Wimbledon 2026 is done. And if you spent the last two weeks half-watching, half-scrolling, wondering whether you were missing anything — you were. This was a fortnight that had a bit of everything: a man defending his throne, a 21-year-old lying flat on her back in disbelief, a local kid the whole country adopted, and the quiet, final closing of one of the great chases in tennis history.

If you didn't catch it all live, don't worry. Here is the whole thing, gathered up in one place — the champions, the heartbreaks, and the moments you'll be seeing in highlight reels for years.

## Sinner reigns again

Let's start at the top, because the man at the top barely moved.

Jannik Sinner beat Alexander Zverev 6-7 (7), 7-6 (2), 6-3, 6-4 in the men's final to defend his Wimbledon title and win the fifth Grand Slam of his career. Read that back and it sounds routine. It wasn't. Zverev came out swinging and took a nervy first-set tiebreak, the kind of early blow that can rattle a favourite in front of a full Centre Court. For a set, the German looked like a man who had decided this was finally, at long last, his day.

Then Sinner did what Sinner does. He didn't rage, didn't rush, didn't overhit. He simply tightened every screw by a quarter-turn — a few more first serves in, a few more returns landing at Zverev's feet — until the match quietly tilted his way and stayed there. The second-set tiebreak was a demolition, 7-2. From there it was less a battle than a slow, methodical closing of doors. By the fourth set, Zverev's shoulders had dropped, and everyone in the building knew how the story ended.

There is something almost eerie about watching Sinner on a big occasion now. He plays like the weather — no drama, no visible weather system at all, just a steady pressure that wears you down. Five majors. A defended Wimbledon. He is 25 in that photo up top and already the most reliable big-match player in the men's game.

## The end of a Djokovic dream

To reach that final, Sinner had to walk through a ghost — or, rather, past a legend still very much alive.

In the semifinals, Sinner beat Novak Djokovic 6-4, 6-4, 6-4. Three sets, three of the same score, no way back. And with that scoreline, he almost certainly closed the door on Djokovic's last, best chance to win a 25th Grand Slam singles title.

We wrote earlier in the fortnight about [Djokovic's quiet, relentless quest for that 25th major](/lifestyle/novak-djokovic-wimbledon-2026-25th-slam-eighth-title-quest/) — the obsession that has powered him past every record in the book. He arrived at Wimbledon 2026 still chasing it, still fit, still capable of beauty. And in a strange way, this Wimbledon gave him one last gift on his way out: over the fortnight he passed 106 career match wins at the All England Club, more than anyone in history, moving clear of Roger Federer on the grass Federer once owned.

But the semifinal was a passing of the torch made brutally literal. Djokovic was not embarrassed — he was simply beaten, cleanly, by a younger man playing the exact game Djokovic himself perfected. There were no tears, no farewell speech, no announcement. Just a handshake at the net and a long, slow walk off Centre Court, the applause following him up the tunnel. Whether we saw the last of him at Wimbledon, only he knows. But it felt like a chapter closing.

## Zverev's breakthrough, and a fairytale ended

The other semifinal produced a first and ended a fairytale.

Alexander Zverev beat Arthur Fery 7-6 (0), 6-2, 6-4 to reach the final and, in doing so, became the first German man to make a Wimbledon singles final since Boris Becker in 1995. Let that number sink in. An entire generation of German tennis fans grew up without a home man in the last match of the world's most famous tournament. Zverev, so often the nearly-man of the big four's shadow, finally got there.

But you might have been cheering for the other guy. Almost everyone in Britain was. Arthur Fery — ranked outside the world's top 400 when the fortnight began, a wildcard, the son of a football-club owner, a young man who had genuinely considered walking away from the sport — ran all the way to a Wimbledon semifinal. We told [the full story of Arthur Fery's improbable run](/lifestyle/arthur-fery-wimbledon-2026-wildcard-grew-up-local/) as it was happening, and by the time he walked out to face Zverev, he wasn't a curiosity anymore. He was the story.

That first-set tiebreak — 7-0 — was cruel. Fery had hung with Zverev for an hour and then watched the set evaporate in seven brutal points. He couldn't quite climb back. But the ovation he got walking off was the kind you don't earn with a ranking. You earn it by making a stadium full of strangers believe in you for a week. He'll be back, and the whole country will be watching.

## Noskova's coronation

Now to the other champion — and the image of the whole tournament.

When Karolina Muchova netted a return on championship point, Linda Noskova didn't leap or scream. She fell. Straight backwards onto the grass, flat on her back, hands pressed to her head, staring up at the London sky in what looked less like joy than pure, uncomprehending shock. She was a Grand Slam champion, and her body seemed to know it before her mind did.

Noskova beat Muchova 6-2, 5-7, 6-3 to win the Wimbledon women's title — her first Grand Slam, at 21 years and 236 days old, making her the youngest women's champion at the All England Club since Petra Kvitova back in 2011. "It is definitely something that I'm going to remember forever, but it will definitely take me a few days to realize it," she said afterwards, still half in a daze. "On the last match point, I didn't even realize that I had a match point. I kept going."

The final itself was no formality. Noskova stormed the first set 6-2, playing with the fearlessness of someone too young to know she was supposed to be nervous. Then Muchova — the elder, the artist, the crowd's sentimental favourite — dug in and stole the second 7-5, and suddenly the young one had to win a Grand Slam final the hard way, from level, under real pressure. She did. A tight, ferocious third set, 6-3, and it was done.

## The Czech takeover, complete

Here is the detail that makes this women's final historic beyond the trophy: both finalists were Czech.

The Czech Republic became just the sixth country in the Open Era to have two of its own women contest a major singles final. We spent a good chunk of the fortnight marvelling at [the machine that keeps producing these players](/lifestyle/czech-tennis-miracle-all-czech-wimbledon-final-2026/) — a nation of ten and a half million people that somehow out-produces countries thirty times its size, generation after generation, from Navratilova to Kvitova to a whole current roster of contenders.

And we watched [Muchova, the shot-maker who plays tennis like jazz](/lifestyle/karolina-muchova-artist-wimbledon-2026-final/), reach the final she has deserved for years — only to run into a compatriot ten years younger and hungrier. There was heartbreak in that for Muchova, the nearly-woman of women's tennis, who has had her career interrupted by injury again and again. But there was something fitting about it too. The torch didn't leave the country. It just moved down the road.

For Noskova, the win confirms what the Czech system has been whispering for a couple of years: she is the next one. Not a flash. The next one.

## Who is Linda Noskova, anyway?

If the name only half-rings a bell, you're not alone — and that's part of the charm. Noskova is not an overnight sensation so much as a slow-burn one, a player insiders have been circling for years while the wider public looked elsewhere.

She grew up in Vsetin, a small town in the east of the Czech Republic, and announced her talent early: back in 2021 she won the girls' singles title at Roland Garros, the junior stamp of approval that so often precedes a real career. The junior trophies are easy to win and easy to forget, though. What made people sit up came later.

At the 2024 Australian Open, still a teenager, Noskova walked onto court against the world No. 1, Iga Swiatek — and won. It was one of the upsets of that season, the kind of result that gets a young player a reputation before she's ready to carry it. For the next couple of years she was a name the tour respected and the casual fan hadn't quite memorised: a dangerous floater, a big hitter, someone the top seeds genuinely did not want to draw early.

What she'd never done was string it together over two full weeks at the very top. Until now. Seven matches, a Grand Slam trophy, and a place in history as the youngest Wimbledon women's champion in fifteen years. The floater is a champion. And the tour, which saw this coming, can now say so out loud.

## The fortnight's other stories

A Grand Slam is never just its two finals. Wimbledon 2026 was stuffed with the kind of moments that don't make the record books but make the tournament.

Alexandra Eala, the 21-year-old from the Philippines, kept the giant-killing going, and we followed [how a kid from Manila keeps toppling the game's biggest names](/lifestyle/alexandra-eala-philippines-first-tennis-star-berlin-grass-2026/). The women's draw again refused to crown the obvious favourites — Noskova's title made her the tenth consecutive different women's Wimbledon champion, an astonishing run of unpredictability that has become the defining feature of the women's game.

And the whole thing played out under a genuinely punishing sun. The opening days were among the hottest in the tournament's history, sending fans scrambling for shade and forcing players to change kit between games. If you were there — or planning your own summer tennis — we put together [a survival guide for watching and playing tennis in real heat](/lifestyle/tennis-in-the-heat-summer-survival-guide/), because the modern game increasingly happens in conditions the old guard never had to deal with.

There was nostalgia, too. The All England Club has always been the place where the sport looks back on itself, and this year the crowd got a warm reminder of the family that once ruled these lawns — a subject we explored in [the enduring Wimbledon story of the Williams sisters](/lifestyle/venus-serena-williams-wimbledon-2026-doubles-reunion/). The sport keeps handing its future to new names, but it never quite lets go of the old ones.

## What Wimbledon 2026 told us

Step back from the individual matches and a picture forms — two of them, actually, one for each side of the game.

The men's story is one of consolidation. For years we talked about the "next generation" as a crowd, a jostling pack of young players who might inherit the sport. Wimbledon 2026 suggests the inheritance is being settled, and it is being settled by Jannik Sinner. Defending a Wimbledon title, beating Djokovic in straight sets on the way, winning a fifth major before his mid-twenties — this is no longer a promising young player. This is the man to beat, on every surface, for the foreseeable future. His great rival Carlos Alcaraz was absent from the deep rounds this year, and the rivalry that may define the decade is still waiting to fully ignite. When it does, tennis will be very lucky indeed.

The women's story is the opposite, and just as thrilling. Ten straight different Wimbledon champions. A draw where the seeds mean less than they have in years. A 21-year-old lifting the trophy nobody expected her to. The women's game right now is gloriously, chaotically open — anyone in the top forty can beat anyone, on any given afternoon, and the tournament is better for it. Noskova is a champion today. Whether she is a dynasty or one of a dozen contenders trading majors, we genuinely don't know. That uncertainty is the fun.

## The tale of the tape

For the record-keepers and the settle-an-argument crowd, here is Wimbledon 2026 in plain figures:

- **Men's singles champion:** Jannik Sinner, def. Alexander Zverev 6-7 (7), 7-6 (2), 6-3, 6-4. Sinner's second Wimbledon title and fifth Grand Slam overall.
- **Women's singles champion:** Linda Noskova, def. Karolina Muchova 6-2, 5-7, 6-3. Her first Grand Slam title; youngest women's champion at Wimbledon since 2011.
- **Men's semifinals:** Sinner def. Novak Djokovic 6-4, 6-4, 6-4; Zverev def. Arthur Fery 7-6 (0), 6-2, 6-4.
- **First in a generation:** Zverev, first German man in a Wimbledon final since Boris Becker (1995).
- **A record on the way out:** Djokovic passed 106 career match wins at Wimbledon, the most in tournament history.
- **A historic final:** Noskova and Muchova gave the Czech Republic the sixth all-same-nation women's major final of the Open Era.

## Until next July

So that's your Wimbledon. A champion who barely broke stride and a champion who couldn't believe her own eyes. A German ending a thirty-year wait and a British wildcard writing a chapter he'll dine out on forever. A legend passing a record and, quite possibly, a torch.

The strawberries are gone, the queue has dispersed, and the players have scattered to the summer hard courts. But if you came away from these two weeks feeling like tennis is in a strange, wide-open, wildly entertaining place right now — with one man building an empire on the men's side and total glorious anarchy on the women's — you were paying attention. See you on the grass next July.

---

*Photo: Jannik Sinner by Hameltion, CC BY-SA 4.0, via Wikimedia Commons.*`;

const record = {
  slug, title, excerpt, body,
  category: 'lifestyle', status: 'published',
  meta_title, meta_description, image_url, image_alt,
  published_at: now, updated_at: now,
  ai_model: 'claude-opus-4.8-1m', ai_generated_at: now,
};

const { data, error } = await supabase.from('articles').upsert(record, { onConflict: 'slug' }).select('id,slug,title,image_url');
if (error) { console.error('ERROR', error); process.exit(1); }
console.log('OK', JSON.stringify(data, null, 2));
const words = body.replace(/[#*_>`\-]/g, ' ').split(/\s+/).filter(Boolean).length;
console.log('WORD COUNT (approx):', words);
