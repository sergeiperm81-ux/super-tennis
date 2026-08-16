import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const slug = 'why-players-fall-apart-august-heat-cincinnati-2026';
const stamp = '2026-08-16T05:00:00.000Z';
const title = 'Why Great Players Fall Apart in the August Heat';
const meta_title = title;
const meta_description = 'Novak Djokovic was sick on court in 85 percent humidity in Cincinnati. Here is what heat really does to a tennis player and the new rule built to help.';
const excerpt = 'A three-time champion beaten by the air itself. Inside what August humidity does to a body, the new ATP heat rule, and how to spot a player who is cooking.';
const image_url = '/images/news/atmo-06.webp';
const image_alt = 'A lone tennis player walking off a hard court in heavy low evening sun, seen through a chain-link fence';

const body = `The best returner in the history of the sport spent Saturday afternoon in Ohio losing an argument with the air.

If you had the Cincinnati Open on in the background, you saw something that does not really have a name. Novak Djokovic — three-time champion at this event, seeded third this week, ranked fifth in the world — walked to his chair in the second set and was sick. He took a medical timeout. Then he went back out and played another hour of professional tennis, and lost 2-6, 6-4, 6-4 to a 25-year-old Argentine called Thiago Agustin Tirante, who had never beaten anybody remotely that good.

The temperature that afternoon was not the headline. The humidity was 85 percent.

Every August, at least once, tennis does this to somebody. A player you have watched win everything walks out to a mid-afternoon match on an outside court in a mid-sized American city, and by the middle of the second set they are somebody else: slower between points, blank behind the eyes, towel in hand every twenty seconds, hitting a shot they have made ten thousand times straight into the bottom of the net. If you do not play, it can look like a lapse in concentration or a bad attitude. It is neither. It is thermodynamics, and it is worth understanding, because it explains more August tennis than any tactical analysis will.

## What actually happened in Mason, Ohio

Give Tirante his due first, because the story gets told wrong otherwise.

He was born in La Plata, on the Argentine coast south of Buenos Aires, in April 2001. He started hitting balls at his grandfather's club before he could properly walk, and he was taught by his aunt. In 2019 he was the ITF junior world champion, won the boys' doubles at Roland Garros and took the Orange Bowl singles title. Then came the long grind that swallows most juniors: seven years of Challenger events, mostly on clay, mostly in South America and southern Europe, arriving in Cincinnati this week at a career-high ranking of No. 50.

Against Djokovic he lost the first set 6-2 in about half an hour and looked exactly like a man ranked fiftieth playing a man who has won twenty-four majors. Then he did not go away. He served 13 aces. He hit 40 winners. Across two hours and 44 minutes he kept the ball in play in conditions where keeping the ball in play is a form of violence, and he took the two breaks of serve he needed. Djokovic actually saved 13 of the 15 break points he faced. Two were enough.

Afterwards Djokovic was direct about it. It was, he said, "not an enjoyable match for me, for sure." He explained that he has a health issue he has been managing for several years, one that hot and humid conditions make considerably worse, and that knowing it was coming did not help: "I did anticipate it, but there are all these things, like nerves and everything involved that makes it worse, and that's what happened." Asked whether he would be back at a tournament he has won three times, he said he hoped so, but that it looked "more likely not."

Tirante, who called it the best win of his career, plays Martin Landaluce next. If you want the wider picture of the week — who is left, who is seeded where, why this event matters so much on the road to New York — our [Cincinnati Masters tournament guide](/tournaments/cincinnati-masters-guide/) has it, and [Grigor Dimitrov's wild-card return](/lifestyle/grigor-dimitrov-cincinnati-2026-long-way-back/) is the other story worth following in this draw.

## The number that matters is not the temperature

This is the part most broadcasts never explain properly, and it is the whole ballgame.

Your body has essentially one tool for dumping heat in hot weather: sweat that evaporates off your skin. The sweating itself does nothing. The cooling happens in the phase change, when liquid water on your arm turns into vapour and carries energy away with it. That is it. That is the entire cooling system.

Now make the air humid. Air that is already close to saturated cannot absorb much more water, so the sweat stops evaporating and simply sits there, running off you in sheets. You are producing litres of the stuff, losing salt and water at a frightening rate, and getting almost no cooling in return. You are paying the full price of the mechanism and receiving none of the benefit.

That is why 30 degrees in Mason, Ohio can be far more dangerous than 38 degrees in a dry heat, and it is why the sport has stopped measuring air temperature at all. The metric that now governs professional tennis is Wet Bulb Globe Temperature, or WBGT, which folds together four things: air temperature, humidity, wind speed and radiant heat from the sun and the court surface. It is a measure of how hard it is for a human being to shed heat, not how hot the air is. A still, 85-percent-humidity afternoon in the American Midwest can post a higher WBGT than a blazing dry day in Madrid.

Research on tennis bears this out: players report markedly more cramping and more heat exhaustion in hot humid conditions than in hot dry ones, at every level of the game. The thermometer lies. The wet-bulb number tells the truth.

## What is going on inside a player who is cooking

In a normal match, a professional's core temperature settles somewhere around 38.5 degrees Celsius and stays there. Push relative humidity above 60 percent and the evaporative escape route closes down, and core temperature climbs instead of stabilising — up toward 39.5. Readings above 39.0 have been recorded during live professional matches.

Meanwhile the fluid is pouring out. Sweat rates of up to 2.5 litres an hour have been measured in hot humid conditions. Two and a half litres. Per hour. In a match that can run past three hours, that is a meaningful fraction of everything a body holds, and it is not just water going — it is sodium, and once sodium levels drop far enough, muscles start firing on their own. That is what a cramp is. It is not weakness. It is chemistry.

And this is the part that most changes what you are watching: cognition goes before the legs do. Elevated core temperature degrades decision-making, reaction time and executive function well before a player is physically incapable of running. So the tell is not usually somebody hobbling. It is somebody choosing wrong. Going for a winner from a defensive position because the rally feels unsurvivable. Standing further inside the baseline to shorten points. Serving and rushing forward on a ball that does not deserve it. Missing routine forehands not because the technique broke but because the person operating the technique is, in a small and specific way, no longer entirely present.

Watch Djokovic's second and third sets on Saturday with that in mind and it reads completely differently. He was not playing badly. He was playing while overheating, which is a different sport.

## The rule that arrived this season

Here is what makes this particular week interesting rather than just grim: 2026 is the first year the men's tour has had a proper heat rule at all.

The ATP Board approved it at the end of last season, and it came into force for this one, following years of complaints that finally boiled over after some brutal Shanghai conditions. It is built on WBGT and it has two clear thresholds. When WBGT reaches 30.1 degrees Celsius during the first two sets of a best-of-three singles match, either player can request a 10-minute cooling break after the second set — and if one player asks, both get it. In those ten minutes they can use ice towels and fans, hydrate, change clothes, take a shower and even receive coaching, all supervised by ATP medical staff. If WBGT climbs past 32.2, outdoor play is suspended entirely until it is safe.

The genuinely striking thing about that rule is how late it is. The WTA has protected its players with a heat rule since 1992. It took the men's tour thirty-four more years to arrive at the same basic principle: that there is a point past which asking somebody to keep running is not a test of character but a medical risk.

You can argue about whether the thresholds are right. You cannot really argue that a sport which asks people to sprint in direct sun on a surface that radiates heat back at them, for three hours, in August, in the Ohio River valley, needed no rule at all.

## Melbourne wrote the textbook the hard way

If you want to know why these policies exist in the form they do, the answer is January in Australia.

The 2014 Australian Open is the reference point. Temperatures hit 43 degrees in the sun and 40 in the shade. Nine players withdrew on a single day. Canadian Frank Dancevic blacked out on court, and described the run-up to it in words nobody who read them has forgotten: "I was dizzy from the middle of the first set and then I saw Snoopy and I thought, wow, Snoopy, that's weird." A ball boy fainted. Water bottles deformed. It was the moment the sport stopped treating heat as weather and started treating it as a hazard.

Out of that came the Heat Stress Scale that Melbourne uses now — a 1 to 5 rating built, like the ATP rule, on air temperature, radiant heat, humidity and wind. At the bottom of the scale, normal play. At the top, level 5, everything outdoors stops.

And it still gets used. This January, on 24 January 2026, outdoor matches at the Australian Open were suspended as the mercury passed 36 degrees with 40 forecast, and the roofs went across the show courts. Jannik Sinner, the defending champion, cramped badly enough that his match was briefly halted. Players who train year-round in Florida or Dubai — Madison Keys, Jessica Pegula, Amanda Anisimova among them — coped noticeably better than those who do not. That is not a coincidence, and we will come back to it.

## New York already knew

The other landmark is the 2018 US Open, and it is the closest cousin to what happened in Cincinnati this weekend, because New York in late August is the same kind of heat as Ohio: not extreme on the thermometer, murderous in the air.

Five men retired with heat-related problems on a single day. The tournament took the emergency step of applying to the men a rule that at the time existed only on the women's tour, granting a 10-minute break between the third and fourth sets. Djokovic himself, in a four-hour match against Marton Fucsovics, called for trainers who packed him in ice towels late in the second set.

But the moment people actually remember from that fortnight involved a shirt. During his match against Djokovic, John Millman walked to the net and asked to change clothes mid-set, because the sweat pouring off him was making the court itself dangerous. The air temperature that evening was a mild 21 degrees or so. Humidity was above 80 percent. The umpire allowed the change under an "equipment out of adjustment" provision, which is possibly the driest phrase ever applied to a man who was, functionally, a fountain.

Twenty-one degrees. Remember that number the next time somebody says a match cannot have been that hard because it was not that hot.

## Why they cannot simply be fitter

The obvious objection is that these are among the most conditioned athletes alive, so why does this happen to them at all?

Two reasons. The first is that fitness and heat tolerance are not the same trait. Adapting to heat is a separate physiological process — it takes roughly one to two weeks of repeated exposure, and it produces measurable changes: you start sweating earlier, you sweat more, and crucially you lose less salt in each litre. A player who has spent June and July on European clay and grass, in mild air, and flies into the Midwest for a Sunday practice and a Tuesday first round, has not had that fortnight. Their body is still calibrated for somewhere else.

The second is scheduling. This part of the calendar is a compressed run of hard-court events squeezed between Wimbledon and the US Open, and players arrive already carrying whatever the grass season did to them. The ones who show up rested and acclimatised have an enormous, invisible advantage — which is part of why [Alexander Zverev's position as top seed here](/lifestyle/alexander-zverev-cincinnati-2026-top-seed-first-slam-champion/) is about far more than form.

And then there is the individual variable, which is the one nobody outside a player's team can see. Djokovic has now said plainly that he has a condition that makes hot, humid conditions especially punishing. That is not an excuse offered after a defeat; it is a physiological fact that has been visible in his results in this specific climate for years. Everything a professional does around heat — the hydration protocol, the salt, the pre-cooling with ice vests before walking on, the electrolyte load in the days beforehand — is an attempt to buy back a margin that a body was not necessarily born with. If the science of what these athletes put into themselves interests you, our [guide to what tennis players actually eat and drink](/lifestyle/tennis-diet-nutrition-guide/) goes through it properly.

## How to watch a player who is overheating

None of this is much use unless it changes what you see, so here is what to look for over the rest of this fortnight and through New York.

Watch the time between points, not the points. A player in trouble starts using every second of the shot clock, then a little more. Watch the towel: not the routine wipe, but the moment somebody stops mid-court, hands on knees, and looks at the ground for a beat too long. Watch where they stand to receive — a player who moves several feet inside the baseline against a big server is often not being brave, but shortening the match. Watch the ball toss on second serves, which is usually the first piece of technique to wobble.

Watch what they carry at changeovers. Ice towels round the neck, cold drinks with visible salt, cooling vests, a hand held under a fan. And listen for the umpire announcing a heat break, because from this season that is a formal event with a threshold behind it rather than a mercy the officials granted at their discretion.

Above all, watch the eyes. Overheating has a look — a slight delay before responding to a line call, a slowness in turning towards the chair. The body carries on for a surprisingly long time after the mind has begun to check out.

## The part that does not show up on the highlight reel

There is a version of Saturday that gets filed as a shock result. World No. 50 beats a legend, twenty seconds of highlights, on to the next thing.

The truer version is that two men walked onto a court in the Ohio River valley in the middle of August, both of them subject to the same laws of physics, and one of them held together while the other came apart — and that the one who came apart went back out after being sick in front of a full stadium and played another hour anyway, losing two tight sets by a single break each. That is not a collapse. That is somebody being beaten by conditions and refusing to make it look easy for them.

Tennis is the rare sport with no substitutions, no time-outs at will, no clock to run down and no teammate to hide behind. When the air turns against a player there is nowhere to go and nothing to do except keep walking to the baseline. The new rulebook helps at the edges. It does not change the fundamental deal.

So when you next see somebody great look ordinary on a sticky afternoon in a small stadium in a place you would not otherwise think about, you will know it is not a lack of effort you are watching. It is a person doing arithmetic with a body that has stopped cooperating, in an atmosphere that has quietly decided to keep every bit of heat it is given.

---

Related reading on super.tennis: our [Cincinnati Masters guide](/tournaments/cincinnati-masters-guide/), [Grigor Dimitrov and the long way back](/lifestyle/grigor-dimitrov-cincinnati-2026-long-way-back/), [Alexander Zverev as top seed in Ohio](/lifestyle/alexander-zverev-cincinnati-2026-top-seed-first-slam-champion/), and [what tennis players eat](/lifestyle/tennis-diet-nutrition-guide/).`;

const record = {
  slug, title, excerpt, body,
  category: 'lifestyle', status: 'published',
  meta_title, meta_description, image_url, image_alt,
  published_at: stamp, updated_at: stamp,
  ai_model: 'claude-cloud-auto', ai_generated_at: stamp,
};
const { data, error } = await supabase.from('articles').upsert(record, { onConflict: 'slug' }).select('id,slug');
if (error) { console.error('ERROR', error); process.exit(1); }
console.log('PUBLISHED_SLUG=' + slug);
console.log('PUBLISHED_TITLE=' + title);
