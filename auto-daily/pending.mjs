import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const slug = 'us-open-2026-no-line-judges-electronic-line-calling';
const stamp = '2026-09-05T05:00:00.000Z';
const title = 'Nobody Shouts OUT Anymore: Tennis Without Line Judges';
const meta_title = title;
const meta_description = 'Line judges have vanished from the US Open. How a recorded voice replaced nine people on court, what tennis gained by it, and what quietly went missing.';
const excerpt = 'Nine people once ringed a Grand Slam court, frozen at the back fence, waiting to bark a single syllable. At the 2026 US Open not one of them is there. This is how tennis handed its lines to a machine, and what the sport traded away when the arguing stopped.';
const image_url = '/images/news/court-02.webp';
const image_alt = 'The corner of a hard court where the baseline meets the sideline, the kind of line a human being once watched for four hours at a time';

const body = `The strangest sound at the US Open this week is a voice that belongs to nobody.

It arrives from a speaker somewhere above the court, half a beat after the ball lands, and it says one word. Out. Sharp, clipped, a little louder when the ball was close. The player nods, or does not, and walks back to the baseline. Nobody argues. Nobody turns to the chair with their arms spread wide. The point ends the way a light switch ends a room.

If you started watching tennis in the last five years, that is simply what tennis sounds like. If you have been watching longer, some stubborn part of your brain is still waiting for the person who used to make that noise: a human being crouched at the back fence in a branded polo, one of nine ringed around the court, holding themselves perfectly still for four hours in order to shout a single syllable perhaps forty times.

Those nine people are gone from Flushing Meadows. They have been gone for a while now, and this fortnight is a good moment to notice, because the third round finishes today, the fourth round starts tomorrow, and for the whole of the second week the closest thing to a line call you will hear is a recording made in a studio by somebody who is not in New York.

## The nine people you stopped noticing

A full officiating crew at a Grand Slam used to be a chair umpire plus as many as nine line umpires, and the geometry of where they stood was the first thing that told you tennis was a serious sport. Two at the back, one behind each baseline, deep enough to see the whole line but close enough to be sure. One on each sideline at each end. Two watching the service lines and the centre line, which was the fast and horrible job, because a first serve arrives at 130mph and lands in a box you are staring down the length of.

They had a language. Palms flat and low, sweeping down and away, meant the ball was good and you should stop looking at me. An arm shot out straight to the side meant out, and it came with the shout, which had to be loud enough to cut through a crowd and stop two professionals mid rally. Hands over the eyes meant the worst admission in officiating: I did not see it, the call is yours.

Mostly, though, the job was stillness. You were not allowed to move while the ball was live. You were not allowed to flinch when a forehand came at you at chest height. On changeovers you walked, in step, to your next position, and the crew rotated so nobody spent two hours squinting into the sun on the same line.

Being one of them was a serious ambition. Line umpiring was the bottom rung of a ladder that ran up through badge levels toward the chair, and getting to a Slam meant years of qualifying events in the rain. Wimbledon alone employed around 300 of them, most with normal jobs the rest of the year, coming back every summer for the privilege of standing very still fifteen feet from the best tennis in the world.

## The quarterfinal that broke the old system

The unravelling has a date, and it is the 2004 US Open.

Serena Williams played Jennifer Capriati in the quarterfinals, and in the deciding set a run of calls went against Williams that were not close and not defensible. The most notorious was an overrule: a ball that had landed inside the line, called good, then taken away from her by the chair. There were others. Watching at home, you could see all of it, because television had been running Hawk-Eye since 2003 as a broadcast toy, drawing an animated ball landing on an animated line for the viewers while the people on court had nothing but their eyes.

That gap was the whole problem. For the first time, everyone in the world knew the truth of a call except the two people it was being done to. The USTA apologised to Williams. The chair umpire did not work another of her matches at that tournament. And the sport was left holding a very awkward fact: it now owned a machine that could see better than its officials, and it was using it to entertain the audience rather than to get the score right.

## The challenge years, which were secretly wonderful

Hawk-Eye was the work of a British engineer, Paul Hawkins, who built it at the end of the 1990s for cricket. Tennis borrowed it for broadcast, tested it, argued about it, and finally let players use it in a match at a tour event in Miami in March 2006. The US Open became the first Grand Slam to run the challenge system later that same year.

The rules were simple enough to explain to somebody who had wandered into the room. Three unsuccessful challenges per set, one extra in a tiebreak, and if you were right you kept the ones you had. What nobody predicted was how good the theatre would be.

A player would raise a finger. The chair would say the word. And then, for four or five seconds, twenty thousand people would clap in unison, faster and faster, while a cartoon ball rolled across a giant screen toward a cartoon line. The replay always paused a fraction longer than it needed to. The graphic always landed on the line with a millimetre of drama. Then either a roar or a groan, and the crowd had, briefly, been part of the officiating.

It also made the audience numerate. Fans kept count of a player's challenges the way they kept count of break points, and you could read someone's mental state from how they spent them: the player who burned two in the first three games out of irritation, the one who hoarded them into the third set like a survivalist.

And crucially, the human was still the default. The call came from a person. The machine was the appeal.

## September 6, 2020

The pivot happened during the strangest tournament any of us have watched.

The 2020 US Open was played in an empty park. No fans, no queues, no noise, and electronic line calling on every court except the two biggest, where line judges still worked because Arthur Ashe Stadium and Louis Armstrong Stadium had the space to keep officials spread out.

On September 6, six years ago tomorrow, Novak Djokovic was serving at 5-5 in the first set of his fourth round match against Pablo Carreno Busta on Ashe. He had just been broken. He turned, and he hit a spare ball away behind him without looking, the way players have done ten thousand times without consequence, and it struck a line judge in the throat. The official went down at the back of the court and needed help getting up. Djokovic was defaulted. The world number one was out of the tournament, in an empty stadium, over a ball hit in irritation at somebody whose job was to stand still.

It was an accident, and it should not carry the weight of an argument. But it did become a strange marker, because the following spring the USTA announced that every court at the US Open would use electronic line calling, and the sport more or less stopped debating it after that. The 2021 Australian Open ran an entire Grand Slam with no line judges at all, the first to do so. Wimbledon held out until 2025, then retired around 300 line judges after 147 years and replaced them with a camera system and roughly eighty on-court assistants doing everything except calling lines.

By this year, the human line judge has become a thing you have to explain to a teenager.

## How the machine actually calls a ball

There is no mystery in it, which is part of why nobody argues.

Around a dozen cameras sit high around each court, synchronised, tracking the ball hundreds of frames a second. Software triangulates the ball in three dimensions, models how it squashes on impact, and works out the patch of court it touched. A further set of cameras watches feet at the baseline for foot faults, monitored by a review official, because that is the one call the system is not left entirely alone with.

Then it speaks. And here is the detail most people miss: the voice is a real person. Officials were recorded in a studio saying out and fault over and over, in several takes, at different levels of urgency, so a ball that misses by a hair sounds tighter than a ball that misses by a foot. The Australian Open has gone further and used voices of front-line workers who worked through the pandemic and the bushfires, and once, memorably, the actress Rebel Wilson.

So when you hear a call at Flushing Meadows this week, you are hearing a human being who is somewhere else, saying a word they said months ago into a microphone, played back by software that has decided your favourite player just lost the point.

As for accuracy: on the tight calls, the ones close enough to be worth reviewing, USTA data found human line umpires were right roughly three times in four. The system misses by millimetres, and it misses consistently, which matters more than it sounds. A machine that is wrong the same way every time is still fair to both players. A tired official at the end of a fourth set is not wrong the same way every time.

## What the sport actually gained

Start with the obvious. No career now turns on a stranger blinking.

Think about what used to be possible. A semifinal decided by a foot fault call at 15-30, as happened to Serena Williams in 2009, where the disputed call was the spark and the argument that followed ended the match on a point penalty. A quarterfinal in which the losing player had a legitimate grievance that could never be answered because there was no evidence, only two accounts. Whole rivalries carried a subplot of who got the calls.

That is gone, and its disappearance has been quietly good for the sport's temper. Players have almost nothing left to shout at. There is no person in a polo shirt at the back fence absorbing a tirade because they had a clear view of something a professional did not want to be true. Officiating abuse has not vanished from tennis, but the easiest target for it has.

Matches also move faster. No challenge, no replay, no theatrical pause. And on the outside courts, where a handful of officials once covered the whole surface, the standard did not just improve, it changed category. If you have ever wandered [the free week at Flushing Meadows](/lifestyle/us-open-2026-fan-week-qualifying-free-week-flushing-meadows/) and watched a match with eleven people in the stands, you were watching the same technology that will decide the title next weekend.

## What quietly went missing

The ritual, first. There is no equivalent now of the clap-along, no shared four seconds where a crowd and two players wait for the same answer. Tennis gave up one of the very few moments in sport where the audience got to participate in a decision rather than react to one.

The jobs, second, and this is a real thing rather than nostalgia. Line umpiring was where chair umpires came from. You learned the rhythm of a match from the back fence for a decade before you were trusted with the chair. Take away hundreds of those posts, at every level from junior events upward, and you have removed the training ground for the officials who still make every judgement the cameras cannot: hindrance, a double bounce, a time violation, whether a player is genuinely injured or buying four minutes. Nobody has fully solved where the next generation of chair umpires is supposed to be trained.

And third, the failure mode moved. It did not disappear.

At Wimbledon last year, in a fourth round match on Centre Court between Sonay Kartal and Anastasia Pavlyuchenkova, the system was switched off in error on part of one side of the court for a single game. Three calls went uncalled. The chair umpire, unaware anything was wrong, made two of them himself, then stopped a point that should have been Pavlyuchenkova's game and ordered it replayed, because the tracking had not recorded it. She said afterwards that a game had been stolen from her. Wimbledon apologised, called it human error, and removed the operators' ability to pause the tracking at all.

Read that carefully. The cameras did not fail. A person at a console did. We have not removed human error from line calling; we have moved it off the court and into a room, where it is harder to see and much harder to argue with in real time.

## The last place where a human still calls a line

There is one holdout, and it is not a museum piece.

Roland Garros will keep human line judges again, the only Grand Slam that does. The tournament director Amelie Mauresmo has argued that electronic tracking is not fully reliable on clay, a surface that shifts and dries and changes hour by hour, and the French federation framed the decision partly as a matter of pride in French officiating. It came after a line-call controversy in Casper Ruud's loss in Paris this year, which is to say they made the decision with the argument still ringing.

They also have something no hard court has: evidence. On clay, the ball leaves a mark. The umpire climbs down from the chair, walks over, points at an oval smudge, and the whole stadium leans in to look at a piece of dirt. That is now the last live officiating drama left anywhere in professional tennis, and it survives not because the French are sentimental but because the surface keeps a receipt.

## What to listen for in the second week

The fourth round is tomorrow and Monday, the quarterfinals are Tuesday and Wednesday, and the finals are next weekend. Which gives you a week to hear a sport that has changed its soundtrack.

Listen for the delay. The call is not instant; there is a beat while the software resolves the bounce, and good players have learned to play through it rather than stop.

Watch for the glance. Players who came up in the challenge era still look at the chair for a fraction of a second after a close ball, out of pure habit, and find nobody looking back.

Notice how rallies end now. There is no shout, no gesture, no human argument to freeze the frame. There is a flat electronic word and then two people walking. It is cleaner and it is colder, and both of those are true at once.

And keep an eye on everything the chair still does, because the job did not shrink as much as it looks. The score, the clock, the code violations, the double bounce, the hindrance, the medical timeout, the crowd. When Aryna Sabalenka is chasing a third US Open title in a row and the stadium will not settle, the person who quiets 23,000 people is still a person. So are [the 315 people who work the court itself](/lifestyle/us-open-2026-ball-crew-315-people-on-court/), and so is everybody who makes [a night session on Arthur Ashe](/lifestyle/us-open-2026-night-session-arthur-ashe-after-dark/) run to time. Tennis has automated exactly one job, and it happens to be the one that used to generate all of the shouting. If you enjoy the sport arguing with itself about its own equipment, [the fight over the balls](/lifestyle/new-balls-please-why-tennis-argues-about-the-ball-2026/) is very much still open.

The old system was human and unfair and it produced arguments people still relitigate twenty years later. The new one is fair and quiet and produces nothing to talk about at all, which is what fairness is supposed to look like when it is working properly. You are allowed to prefer the accuracy and still miss the noise.

So listen for that voice tomorrow, on the biggest court, at a moment that matters. It belongs to somebody real. They stood in a studio on an ordinary afternoon and said one word into a microphone, over and over, until there was a version for every kind of close. They are not in New York. They may well be asleep. And their voice is going to decide a Grand Slam.

*Photo: the corner of a hard court where the baseline meets the sideline, via Unsplash.*`;

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
