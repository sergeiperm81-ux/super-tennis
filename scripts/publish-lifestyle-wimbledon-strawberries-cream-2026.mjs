import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const slug = 'wimbledon-strawberries-and-cream-tradition-history';
const now = new Date().toISOString();

const body = `For two weeks every summer, in one leafy corner of south-west London, a nation sits down and eats strawberries by the tonne. Not metaphorically — literally by the tonne, somewhere around thirty-eight of them, drowned in roughly seven thousand litres of cream, all consumed in a fortnight by people who came to watch tennis and somehow cannot leave without a little plastic punnet of red fruit in their hands.

Strawberries and cream at Wimbledon is one of those traditions so total, so taken-for-granted, that almost nobody stops to ask why. The tennis is the reason everyone is there. But the strawberries might be the thing they remember just as warmly — the taste of an English summer, eaten courtside, as much a part of the Championships as the grass, the whites and the rain delays. So let's stop and ask the obvious question: why strawberries, and how did a piece of fruit become as essential to Wimbledon as the trophies?

## The numbers are genuinely absurd

Start with the scale, because it is hard to believe until you see it written down. Across a single Wimbledon fortnight, the crowds get through in the region of thirty-eight tonnes of strawberries — that is well over a million individual berries — paired with thousands upon thousands of litres of cream. Lorries arrive at the All England Club every single morning of the tournament with the day's fresh delivery, because Wimbledon does not do yesterday's strawberries.

The fruit is almost always Grade 1 Kent strawberries, grown in the south of England, picked the day before they are served and inspected the morning they arrive. The classic serving is a small punnet of around ten berries with a pour of cream, and the price became famous for staying almost stubbornly the same for years — a small, quiet point of pride in an event that could charge whatever it liked and chooses, on this one thing, not to gouge. It is one of the few bargains at the most exclusive tennis tournament on earth.

## Why strawberries, of all things?

The answer, like so much about Wimbledon, runs back to the Victorians. The Championships began in 1877, in the heart of the English summer — and the English summer is, conveniently, strawberry season. In the 1870s, fresh strawberries were a fashionable, faintly luxurious seasonal treat, exactly the sort of thing a genteel garden-party crowd would expect to be served while watching a refined new lawn game.

It is the same impulse that gave us [the all-white dress code](/lifestyle/wimbledon-all-white-dress-code-tennis-history) — Wimbledon was born as an upper-class summer social occasion as much as a sporting one, and the strawberries were part of the costume. They signalled the season, the class, the genteel Englishness of the whole affair. And then, as with everything at the All England Club, what began as fashion hardened into tradition, and tradition into law. A century and a half later, the fashion is long gone, but the strawberries remain, because at Wimbledon things remain. That is the entire point of the place.

## The ritual

What makes the strawberries more than just a snack is the ritual around them. You queue, you carry your little punnet to your seat or to a spot on the grass, you pour the cream, and you eat them while the tennis plays out in front of you. It is unhurried, slightly old-fashioned, gloriously simple — a fixed point in a fortnight built on fixed points.

And they almost never come alone. Strawberries and cream are one corner of a whole sensory package the tournament has perfected: the fruit, a glass of Pimm's, the green of the grass against the white of the players, the British weather doing whatever it pleases. Together they make Wimbledon an experience you taste and smell as much as watch — the most successful piece of sensory branding in sport, achieved not with marketing but with a bowl of fruit that has not changed in a hundred and fifty years.

## Why it endures

You could, of course, sell anything at a tennis tournament. Other events do — nachos, burgers, whatever moves. Wimbledon sells strawberries, and keeps selling them, because the strawberries are not really about the eating. They are about belonging to something old and continuous, the comfort of a ritual your grandparents would recognise instantly. In a sport that has changed almost beyond recognition — the rackets, the speed, the science, the money — there is something deeply reassuring about a punnet of strawberries that has stayed exactly the same.

That is the quiet genius of Wimbledon. It understands that people do not only come for the tennis; they come for the feeling, and the feeling is made of small, unchanging things. The grass. The whites. The hush before a serve. And a million strawberries, picked yesterday in Kent, waiting in the sun.

## The bottom line

When the Championships come round again and the cameras pan across Centre Court, watch the crowd as much as the players, and you will see them everywhere — the little punnets, the spoons, the cream. The tennis is the reason Wimbledon exists. The strawberries are part of how it feels, and at this tournament, more than any other, how it feels is the whole point.

So if you are lucky enough to go, do the obvious thing: buy the strawberries, pour the cream, find a patch of grass, and eat them slowly while the best players in the world chase a ball around a lawn. You will be taking part in a ritual a hundred and fifty years old, and tasting the English summer exactly the way Wimbledon has always intended. The trophies go to the champions. The strawberries belong to everyone.

### Sources

- Wimbledon / All England Club: official figures on strawberries and cream consumption
- Wimbledon official: history of strawberries and cream at the Championships
- BBC / UK press: Wimbledon strawberries — sourcing, Kent growers and daily deliveries
- Histories of the Championships since 1877 and their Victorian garden-party origins
- Coverage of Wimbledon catering traditions and pricing

Photo: Strawberries and cream / Hannah Clover / Wikimedia Commons / CC BY 4.0`;

const meta = {
  slug,
  title: "Strawberries and Cream: How a Summer Fruit Became as Much a Part of Wimbledon as the Tennis.",
  excerpt: "Every Wimbledon fortnight, the crowds get through around 38 tonnes of strawberries and thousands of litres of cream — over a million berries, delivered fresh from Kent every single morning. It is one of sport's most total traditions, and almost nobody asks why. The charming Victorian story behind the punnet, the cream and the taste of an English summer.",
  body,
  category: 'lifestyle',
  status: 'published',
  meta_title: "Wimbledon Strawberries and Cream: The History Behind the Tradition",
  meta_description: "Why strawberries and cream are inseparable from Wimbledon: around 38 tonnes eaten each fortnight, fresh Kent berries delivered daily, a tradition born of Victorian garden-party fashion in 1877. The charming story behind sport's most famous snack.",
  image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Stawberries_and_whipped_cream.jpg/500px-Stawberries_and_whipped_cream.jpg',
  image_alt: 'A bowl of strawberries and cream — the Wimbledon tradition since 1877',
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
