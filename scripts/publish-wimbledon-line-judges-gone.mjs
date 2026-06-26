import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const slug = 'wimbledon-line-judges-replaced-electronic-line-calling';
const now = new Date().toISOString();

const body = `For nearly a century and a half, the call came from a human throat. A player struck the ball, it landed somewhere near a white line, and a person crouched at the edge of the court — immaculately dressed, utterly still until that moment — would bark "Out!" and throw an arm sideways, and that was that. The line judge was as much a part of Wimbledon as the grass, the whites and the rain. And then, quietly and completely, they were gone.

Wimbledon has played the last two Championships without a single human line judge, ending a tradition that ran for almost a hundred and fifty years. In their place stands a system of cameras and an automated voice, calling the lines to the millimetre, never tiring, never blinking, never wrong in the way a human is wrong. It is, by the cold logic of accuracy, an upgrade. It is also one of the strangest and quietly saddest changes the old tournament has ever made — and the messy way it has unfolded says something about what we give up when we hand the human jobs to the machines.

## The best-dressed officials in sport

To feel the loss you have to remember what the line judge actually was, because they were never just an official. At Wimbledon they were a spectacle in their own right. Around three hundred of them worked the Championships each year, fanned out across the eighteen courts, and they were turned out in tailored Ralph Lauren uniforms — crisp blue-striped shirts, cream trousers, the green-and-purple of the club at the throat — so well dressed that they were routinely called the best-dressed officials in all of sport. People who could not name a single player recognised those uniforms.

And the role itself had a strange theatre to it. A line judge stood or crouched in absolute stillness for hours, a coiled spring of concentration, and then exploded into a single sharp call and a decisive gesture before freezing again. They took abuse from players, the occasional ball at a hundred-plus miles an hour to the body, and the full glare of Centre Court without ever changing expression. They were part furniture, part theatre, part human shock absorber for the players' tempers — and they had been there, in some form, since the nineteenth century. You did not really notice them, which was exactly the point, until the day they were not there at all.

## Now a machine says "out"

What replaced them is called Electronic Line Calling, or ELC, built on the Hawk-Eye Live system — an array of high-speed cameras tracking the ball around every court and computing, within a couple of millimetres, exactly where it lands. When the ball is out, a recorded voice calls it, instantly and automatically, loud enough for the players and the crowd to hear. There is no human in the loop at all. The cameras see, the computer decides, the voice announces, and the point moves on.

It is now on every one of Wimbledon's courts, for the main draw and the qualifying rounds alike. The voices were recorded from real people — including members of the club's staff and ball crew — which lends the whole thing a faint, eerie echo of the humans it replaced: a recorded human saying the words a live human used to say. But the judgement, the actual decision of in or out, belongs entirely to the machine now. The crouching figure in the striped shirt has been distilled into a line of code and a loudspeaker.

## The signal you can no longer see

There is a subtler change buried in the switch, one that took a while for anyone to notice. The old line judge did not only make a sound; they made a shape. The call of "out" came with an unmistakable visual signal — the arm thrown sharply out to the side — and that gesture quietly did a job the recorded voice cannot. On a roaring Centre Court, a player who did not hear a call could still see it; a spectator high in the stands caught the verdict in an instant from the body language alone, long before any sound reached them.

The electronic system speaks but does not gesture, and that has consequences few people weighed in advance. Deaf and hard-of-hearing players and fans, who had always relied on the visual signal, lost it overnight. Players on the noisiest courts have occasionally missed the automated voice altogether, carrying on a point that had already been called dead, or stopping when they should have played on. A human line judge communicated in two channels at once, sound and sight, in a way that turned out to be quietly robust. The machine communicates in only one — and on a loud day in a vast stadium, one channel is not always enough. It is a small thing, right up until it is your point.

## Why Wimbledon finally gave in

The case for the change is, frankly, hard to argue with, which is why it happened. A professional serve arrives at up to a hundred and forty miles an hour; the ball is in contact with the ground for a few thousandths of a second; and the margins that decide points are often a millimetre or two. No human eye, however expert, can resolve that reliably, and for years the sport quietly admitted as much — which is why Hawk-Eye existed in the first place, as the technology players could appeal to when they doubted a call. The electronic system is simply more accurate than the people it replaced, and in a sport where careers and millions of pounds turn on a single line call, accuracy is a powerful argument.

Wimbledon was also, by this point, the last of the hard-and-grass-court holdouts. The Australian Open and the US Open had both gone fully electronic back in 2021, abolishing their line judges with far less fuss, and the grass-court tournaments that lead into Wimbledon had followed. The most tradition-bound tournament on earth, the one that still enforces an [all-white dress code](/lifestyle/wimbledon-all-white-dress-code-tennis-history) and serves [strawberries and cream](/lifestyle/wimbledon-strawberries-and-cream-tradition-history) exactly as it did a century ago, held out longer than anyone — and then, in the end, even Wimbledon decided that being right mattered more than being romantic.

## The one Grand Slam that said no

There is, however, a single, stubborn exception, and it is the most French thing imaginable. The French Open is now the only Grand Slam that still employs human line judges, and the reason is written into the surface itself. Clay, unlike grass or hard court, takes a mark. When a ball lands on the terre battue it leaves a small, readable smudge, and the umpire can climb down from the chair, walk over and physically inspect where the ball struck. On clay, the evidence is right there in the dirt, so the human eye — backed up by the human finger pointing at a mark — remains good enough, and the electronic systems have never been trusted to work as reliably on the soft, shifting surface anyway.

So the line judge survives in Paris, for now, saved by the one surface that keeps its own records. Everywhere else in the upper reaches of the sport, the striped shirts have vanished. It is a strange thought: that a job which lasted a hundred and fifty years now hangs on, at the very top of the game, by nothing more than the physics of clay.

## A very messy first year

If the machines were supposed to be flawlessly, reassuringly perfect, the debut summer did its best to argue otherwise — and the failures were, almost poetically, human ones. During one fourth-round match on Centre Court, an operator accidentally switched the line-calling system off for more than six minutes, so that an entire stretch of a Grand Slam match was played with no functioning line calls at all, the very situation the technology was meant to make impossible. Players including Britain's Emma Raducanu and Jack Draper openly questioned the accuracy of specific calls, unable, in the new system, to challenge or appeal them in any way.

And then, most fittingly of all, the heat got involved. During qualifying, the electronic system suffered a failure linked to the very high temperatures — and because Wimbledon had cut its line judges down to a skeleton crew, there was no longer a full bench of humans to step in, and play had to be suspended. A tournament that had replaced people with machines to remove human error found itself stopped by a machine, with too few people left to take over. If you wanted a single image of the awkward handover from human to automated officiating, the [heat breaking the system mid-summer](/lifestyle/tennis-in-the-heat-summer-survival-guide) with no one left to call the lines is hard to beat.

## The fix, and the second year

To its credit, the All England Club responded the way you would hope. After the embarrassing Centre Court shutdown, it simply removed the ability for operators to manually deactivate the ball-tracking at all — closing off the exact human error that had caused the worst of the chaos. The fault, the club pointed out, had been human rather than mechanical, and that particular human mistake can no longer be made because the option to make it has been taken away.

The second Championships without line judges has, by most accounts, run far more smoothly, the technology settling into the background the way good infrastructure is supposed to. The teething is mostly over. The machine works. And yet the smoother it runs, the more cleanly it does its job, the more you notice the specific thing that has gone quiet — because efficiency was never quite the point of the people it replaced.

## What disappeared with them

Here is what the accuracy argument leaves out. The line judge was not only a measuring instrument; they were a character in the drama, and the drama is poorer without them. Think of the old ritual of the challenge — a player convinced a call was wrong, the umpire calling for the replay, the whole stadium turning to the big screen and beginning to clap in slow, building rhythm as the animation traced the ball's path to the line, the roar when it showed in or out. That entire piece of theatre is gone. There is nothing left to challenge, because the call is already the machine's perfect verdict. The crowd never gets to hold its breath, because there is no longer any doubt to hold it over.

Think, too, of the sport's greatest pieces of pantomime. John McEnroe's "you cannot be serious" — the most famous outburst in tennis history, the seed of a thousand impressions — was screamed at a human being. The grand tradition of the player [losing their mind at an official](/lifestyle/tennis-wildest-arguments-umpires) requires an official with a mind to lose it at. You cannot rage at a loudspeaker; there is no satisfaction in it, no theatre, no human spark flying between two people under pressure. And beneath all the spectacle sits the simplest loss of all: somewhere around three hundred people, many of them volunteers who trained for years and treasured their fortnight in the Ralph Lauren stripes, no longer have a place at the tournament they loved. Roughly eighty were kept on as "match assistants," standing by in case the machines fail. The rest were simply, quietly, no longer needed.

## The question that isn't really about tennis

Strip the strawberries and the grass away and what happened at Wimbledon is a small, clear example of a question the whole world is now asking: when a machine can do a human job more accurately, should it — and what is lost in the trade even when the machine is better? The honest answer at Wimbledon is that the sport gained precision and fairness, and gave up drama, employment and a little of its soul. Both halves of that are real. Pretending the machine is purely a villain is nostalgia; pretending nothing of value was lost is the cold, slightly inhuman voice of pure efficiency.

Tennis is simply ahead of the curve here, the canary in the mine for automated judgement everywhere. The same argument is playing out, more slowly and more loudly, across football's video replays, across workplaces and courtrooms and newsrooms — the steady handover of judgement from fallible, expensive, characterful humans to accurate, tireless, characterless systems. Wimbledon, of all places, has quietly become a live experiment in what that feels like, and the early answer is unsettling precisely because it is so reasonable. Nobody can really argue the machine should be less accurate. Everybody can feel that something has gone.

## What is confirmed, and what is just nostalgia

To be clear about the facts: the change is permanent, and it is spreading. Human line judges are gone from Wimbledon, the US Open and the Australian Open, with only the French Open and its tell-tale clay still holding out. The electronic system, after a bumpy start, is genuinely more accurate than the people it replaced, and the worst of the first-year failures have been engineered away. None of that is going to be reversed; no Grand Slam that has gone electronic is going to bring three hundred line judges back.

What is not just sentiment, though, is the cost. The loss of the challenge ritual is real. The loss of the jobs is real. The loss of the human friction that gave tennis some of its most unforgettable moments is real. You are allowed to accept that the machine is better and still feel the absence of the person it replaced. The two things are not in contradiction; they are simply the price tag, printed at last in plain view.

## The last word

So next summer, when the Championships come round again and a serve clips a line and a clipped, recorded voice says "Fault" before the ball has even finished bouncing, watch the empty corners of the court for a second. There is no one crouched there now in blue and cream, no still figure waiting to spring, no human face for a furious player to turn on. Just a green wall, a camera somewhere up high, and a verdict delivered with the flat, untroubled certainty that only a machine can manage.

The calls are better than they have ever been. Wimbledon has never been more accurate, more fair, more correct. It is just a fraction less alive than it used to be — and the people who could once tell you, from years of watching the lines, exactly how a ball behaves on worn grass in fading evening light have gone home for good, taking something with them that no camera has yet learned to replace.

### Sources

- CNN and Yahoo Sports: Wimbledon plays without line judges for the first time in nearly 150 years; "takes away the humanity"
- Sport Resolutions: Wimbledon eliminates line judges after 147 years in favour of Hawk-Eye Live; pool of around 300 reduced to about 80 "match assistants"
- Front Office Sports and Wimbledon (IBM): how Electronic Line Calling works; the French Open as the only Grand Slam still using human line judges
- Sky Sports: Emma Raducanu and Jack Draper question the system; controversy over accuracy
- PBS NewsHour and Yahoo: the Centre Court shutdown blamed on human error, and the qualifying suspension linked to heat; the All England Club's subsequent fix removing manual deactivation

Photo: A Wimbledon line judge in the traditional uniform / Carine06 / Wikimedia Commons / CC BY-SA 2.0`;

const meta = {
  slug,
  title: 'Wimbledon Got Rid of Its Line Judges After 147 Years. Something Human Went With Them.',
  excerpt: 'For nearly 150 years, immaculately dressed humans called the lines at Wimbledon. Now a machine does it — more accurately, and with something important quietly missing.',
  body,
  category: 'lifestyle',
  status: 'published',
  meta_title: "Wimbledon's Line Judges Are Gone: What We Lost",
  meta_description: 'Wimbledon replaced its 300 line judges with electronic line calling after 147 years. The machines are more accurate — but the messy rollout showed what we lost.',
  image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Flickr_-_Carine06_-_Wimbledon_line_judge.jpg/500px-Flickr_-_Carine06_-_Wimbledon_line_judge.jpg',
  image_alt: 'A Wimbledon line judge in the traditional striped uniform standing beside the court',
  published_at: now,
  updated_at: now,
  ai_model: 'claude-opus-4.8-1m',
  ai_generated_at: now,
};

const { data, error } = await supabase.from('articles').upsert(meta, { onConflict: 'slug' }).select('id, slug, title, image_url');
if (error) { console.error('Error:', error.message); process.exit(1); }
console.log('Published:', data[0].id, '|', data[0].slug, '|', body.length, 'chars');
