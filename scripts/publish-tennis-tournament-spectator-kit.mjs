import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const slug = 'what-to-pack-tennis-tournament-spectator-kit';
const now = new Date().toISOString();

const title = 'Going to a Tennis Tournament? Here’s Exactly What to Pack';
const meta_title = title;
const meta_description = 'A day at a live tennis tournament is long, hot and gloriously worth it. Here is exactly what to pack — bag, seat, sun kit and the small things that save the day.';
const excerpt = 'A day at a big tennis tournament is one of the great days out in sport — and a long, sun-baked marathon if you turn up unprepared. Here is the spectator kit that gets it right.';
const image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/2017_US_Open_Tennis_-_Qualifying_Rounds_-_Crowd_in_the_stands_%2836752803900%29.jpg/500px-2017_US_Open_Tennis_-_Qualifying_Rounds_-_Crowd_in_the_stands_%2836752803900%29.jpg';
const image_alt = 'A packed crowd of tennis spectators in the sunny stands at the US Open, most wearing hats and sunglasses';

const A = (q, text) => `<a href="https://www.amazon.com/s?k=${q}&tag=supertennis0b-20" target="_blank" rel="sponsored noopener noreferrer">${text}</a>`;

const body = `So you finally did it. You bought the ticket. Sometime this summer you're going to walk through the gates of a real tennis tournament — maybe one of the big hard-court events leading into the US Open, maybe a smaller stop closer to home — and watch the sport you love with your own eyes instead of through a screen. Good. It is one of the genuinely great days out in all of sport.

It is also, if you turn up unprepared, a long and punishing one. A day at a tennis tournament is not like a football match with a fixed ninety minutes and a roof. It's an open-air marathon: seven, eight, ten hours in the sun on a hard seat, with matches that can finish early or run for five hours, weather that turns on a dime, and security lines with strong opinions about your bag. The fans who look relaxed and happy at 6pm are not luckier than everyone else. They just packed better. Here is exactly how to be one of them.

## First rule: sort out the bag

Before you think about anything else, think about your bag — because it's the thing most likely to cause you grief at the gate.

Almost every major tennis venue now enforces a bag policy, and most have gone the way of American stadiums: small bags only, and often clear ones. Turn up with a normal backpack and you can find yourself stuck in a slow line, or sent all the way back to a distant bag-check, missing the first match you paid to see. The fix is to travel light and travel legal. A compact ${A('clear+stadium+bag+crossbody', 'clear stadium-approved crossbody bag')} sails through security while everyone around you is emptying a rucksack onto a table, and it doubles as a way to keep your phone, sunscreen and tickets in one findable place all day.

Check your specific tournament's website before you go — the exact dimensions and rules vary — but as a rule of thumb, the smaller and more see-through your bag, the faster your day begins. Whatever you save in packing space, you'll gain in not standing in a queue in the sun.

## Save your back: bring a seat cushion

Nobody warns first-timers about the seating, so let this be your warning: it is brutal. Outside the premium boxes, you are looking at hours on a hard plastic seat or, on the outer courts, a bare metal or concrete bleacher. Two matches in, your lower back will be writing you angry letters.

A thin, packable ${A('stadium+seat+cushion+padded', 'padded stadium seat cushion')} is the single most disproportionately useful thing you can bring. It weighs almost nothing, folds flat into your small bag, and completely changes how the back half of your day feels. Regulars at every big event have one; you can spot them by how comfortable they look at hour six while everyone else is shifting and wincing. Some versions come with a bit of back support, which is worth it if you know you'll be there gate-to-gate.

## The sun is the opponent you didn't scout

Whatever the forecast promises, plan for sun, because a tennis stadium is essentially a giant reflective bowl with you sitting in the middle of it. This is where most unprepared fans get quietly wrecked — not by a single dramatic moment, but by six hours of steady exposure they didn't feel until it was too late.

Three things handle it. First, cover your head: a ${A('wide+brim+sun+hat+packable', 'packable wide-brim hat')} shades your face, ears and neck far better than a regular cap, and folds away when you don't need it. Second, protect your eyes — you'll be tracking a small fast object for hours, often into glare. A decent pair of ${A('polarized+sunglasses+sport', 'polarized sport sunglasses')} cuts the shine off the court and saves you a day-long squint-headache. Third, and non-negotiably: sunscreen. A ${A('sunscreen+stick+spf+50+face', 'high-SPF sunscreen stick')} is the smart format for a stadium — no spill, no mess in your bag, easy to reapply on the back of your neck and the tops of your ears without greasing up your phone. Reapply more often than you think you need to. If you want the fuller version of surviving a genuinely hot day, we wrote a whole [guide to tennis in serious heat](/lifestyle/tennis-in-the-heat-summer-survival-guide/) worth a read before you go.

## Dress for the long haul

What you wear matters more at a tennis tournament than at almost any other sporting event, precisely because you're there so long and the conditions swing so much. The morning can start cool, the afternoon can roast you, and an evening session under the lights can turn genuinely chilly — sometimes all in the same ticket.

Start from the feet, because you will walk far more than you expect. Between the entrance, the concourses, the food stalls, the outer courts and your seat, a full day at a big tournament can rack up serious mileage on hard concrete. A pair of broken-in, cushioned ${A('comfortable+walking+sneakers+men+women', 'comfortable cushioned walking shoes')} is worth more to your enjoyment than almost anything else on this list — this is not the day to break in stiff new shoes or wear fashion sneakers with no support. Then dress in light, breathable layers you can peel and add: a breathable shirt for the heat of the day, and crucially a ${A('packable+lightweight+jacket', 'packable lightweight jacket')} rolled into your bag for when the sun drops and the temperature goes with it. Nothing spoils the drama of a night match under the lights like sitting through it shivering in a t-shirt because you assumed the warmth would last. It rarely does.

## Hydration, done the stadium way

You will be told, correctly, to drink water. What nobody tells you is how to do it within the rules. Most venues won't let you bring liquids through security, but almost all of them now have free water-refill stations inside — so the move is to carry an empty bottle in and fill it once you're through.

Bring an insulated one. A good ${A('insulated+water+bottle+stainless', 'insulated stainless water bottle')} keeps that refill cold for hours in the heat, which matters a lot more than it sounds when the alternative is warm water at 3pm. Pair it with a ${A('cooling+towel+microfiber', 'microfibre cooling towel')} — you soak it, wring it out, drape it on the back of your neck, and it buys you real relief during the hottest part of the afternoon. It's a small, cheap thing that the veterans swear by and the first-timers always wish they'd known about.

## The small things that save the day

These are the unglamorous items that separate a great day from a slightly miserable one, and they cost almost nothing to throw in.

A ${A('portable+phone+charger+power+bank', 'portable power bank')} is close to essential now: between photos, texting your group across a packed concourse, and refreshing scores from the other courts, your phone will be dead by mid-afternoon, and your ticket probably lives on that phone. Keep it alive. Add a small ${A('packable+rain+poncho', 'packable rain poncho')} — tennis is an outdoor sport, delays happen, and a two-ounce poncho stuffed in a corner of your bag beats either buying an overpriced one on-site or sitting through a shower in a soaked t-shirt. Toss in a few blister plasters too, because you'll walk far more than you expect between courts, and a little cash for the stalls that still don't take cards. None of it is exciting. All of it is the difference.

## See the far courts: binoculars

If your seats are high up in a big stadium — and on a normal ticket, they often are — a compact pair of ${A('compact+binoculars+lightweight', 'lightweight compact binoculars')} genuinely transforms the experience. Tennis is a game of tiny details: the grip change, the toss, the flicker of a player's eyes before a drop shot, the coach's face in the box. From the upper tiers you miss all of it with the naked eye. A small pair of binoculars pulls you right down onto the court, and lets you follow the practice courts too, where you can often watch the biggest stars up close with a fraction of the crowd. It's the one "luxury" item on this list that regular fans consistently say they'd never go without again.

## Plan the day like a regular

The gear gets you comfortable; a little planning gets you the most out of the ticket. And a tennis tournament rewards planning in a way few events do, because so much of the best stuff is happening away from the main court.

If your ticket is a grounds pass rather than a stadium seat, treat the outer courts as the main event, not the consolation prize. In the first week of a big tournament, world-class players are out on the small courts with only a few hundred fans around them, and you can sit close enough to hear the ball and the coaching. Get there early — the gates open well before the marquee matches, and the morning hours on the outer courts are the best-value tennis you will ever watch. Wander the practice courts too, where the biggest names in the sport warm up in near-silence in front of whoever bothered to show up. It is the closest you will ever get to them.

Pace yourself across the day rather than trying to see everything at once. Pick a couple of matches you really want, and let the rest be happy accidents you stumble into between them. Check the order of play when you arrive so you know roughly when the big names are on, but stay loose — half the magic of a tennis tournament is ducking onto a random court and catching a five-set thriller nobody predicted. And know that evening sessions have a completely different, more electric feel than the daytime, so if you have any choice in tickets, one of each is the dream.

## The food-and-money game

Nobody enjoys the moment they discover what a stadium charges for a sandwich, so go in with a plan. Tournament food and drink is convenient, often quite good, and reliably expensive — and over a ten-hour day, the little purchases add up into a number that can genuinely take the shine off.

Most tennis venues let you bring in your own food as long as it fits the small-bag rules and isn't in glass or a giant cooler. A few packed snacks — something salty for the heat, something with a bit of substance to get you through a long afternoon — will save you money and spare you the queue at exactly the moment a great match is starting. Pair that with the empty bottle you're refilling for free inside, and you've covered the essentials without paying stadium prices for them. Then treat one thing on-site as part of the experience: the signature drink, the local speciality, whatever the tournament is known for. That's not a splurge, that's the day. It's the difference between being sensible and being miserable.

A couple of final money notes. Keep a little cash on you even at cashless venues, for tips and the odd stall that hasn't caught up. Screenshot your tickets in case the network dies under the weight of forty thousand phones — it always strains, usually right when you're at the gate. And set a loose budget before you walk in, because the combination of sunshine, excitement and a long day is precision-engineered to make you spend more than you meant to. None of this is about being tight. It's about spending on the stuff that matters and not bleeding money on the stuff that doesn't.

## What you don't need — and how to behave

Just as important as what to bring is what to leave at home, and how to act once you're in.

Leave the selfie stick and the big professional camera; most tournaments ban both. Leave the giant cooler and the picnic hamper; the small-bag rules kill them anyway. And bring a little tennis etiquette, because live tennis has manners that other sports don't. Phones go on silent. You stay in your seat during games and only move at the changeovers, when the ushers let people in and out — wandering to your seat mid-rally will get you a stadium's worth of glares and, at the majors, politely stopped by an usher. When the umpire asks for quiet, the whole crowd genuinely goes quiet, and there's something wonderful about being part of that hush right before a big serve. If you've never experienced it, our [beginner's guide to watching tennis](/lifestyle/how-to-watch-tennis-beginners-guide/) explains the rhythms and unwritten rules that make it all click.

## Can't get to the tournament this year?

Not everyone can make it to a big event, and that's fine — the at-home version has its own joys, and honestly its own comforts (a sofa beats a bleacher, and the fridge is right there). If you're going that route, gather a few friends and do it properly; we put together a whole playbook on [how to host a tennis watch party](/lifestyle/tennis-watch-parties-how-to-host/) that turns a quiet afternoon of tennis into an event of its own.

## Now go enjoy it

Here's the truth underneath all the packing lists: a day at a live tennis tournament is worth every bit of the sunburn-risk and the sore back and the long queues. There is nothing quite like the crack of a clean strike heard live, the collective gasp at a great get, the strange intimacy of thousands of people falling silent together. Screens are brilliant, but they flatten it. In person, you feel it.

So pack the bag, fill the bottle, find the hat, and go. Get there early, stay late, wander the outer courts where the future stars are grinding away in front of a hundred people, and let the day unfold at its own unhurried pace. You'll come home tired, a little pink, and already checking next year's dates. That's exactly how it's supposed to go.

---

*Photo: Spectators at the US Open by Steven Pisano, CC BY 2.0, via Wikimedia Commons.*`;

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
const words = body.replace(/[#*_>`\-]/g, ' ').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
console.log('WORD COUNT (approx):', words);
