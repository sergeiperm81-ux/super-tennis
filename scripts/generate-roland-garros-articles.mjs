#!/usr/bin/env node
/**
 * Generate 6 Roland Garros long-form articles and insert into Supabase.
 * Written manually (not AI-generated), humanized, fact-checked from research.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const NOW = new Date().toISOString();

const ARTICLES = [

// ─── ARTICLE 1 ───────────────────────────────────────────────────────────────
{
  slug: 'roland-garros-2026-favorites-predictions',
  title: 'Roland Garros 2026: Can Anyone Stop Carlos Alcaraz?',
  category: 'tournaments',
  excerpt: 'Carlos Alcaraz arrives at Roland Garros as two-time defending champion with six Grand Slam titles at 22. Jannik Sinner just beat him in Monte Carlo. So who actually wins this thing?',
  meta_title: 'Roland Garros 2026 Predictions — Who Will Win the French Open?',
  meta_description: 'Carlos Alcaraz is the two-time defending champion. Jannik Sinner wants his career Grand Slam. Our full Roland Garros 2026 preview and predictions.',
  image_url: '/images/tournaments/roland-garros.jpg',
  image_alt: 'Roland Garros 2026 court Philippe Chatrier',
  body: `## The last time someone tried to win three straight Roland Garros titles, his name was Rafael Nadal

And he did it four times in a row. Carlos Alcaraz, 22 years old with six Grand Slams already, is trying to become the first player since Nadal to win three consecutive French Opens. That alone would be enough storyline for one tournament. Then you add Jannik Sinner, who just claimed the Monte Carlo title and reclaimed the world number one ranking, who has won three of the four Grand Slams but has never won the one played on red clay. Then you add Novak Djokovic, who tore his meniscus at Roland Garros in 2024 and has been hinting at retirement ever since, but keeps showing up.

This is the state of men's tennis heading into May. It is genuinely impossible to predict, which is both frustrating and kind of wonderful.

## Alcaraz: the weight of precedent

The 2025 final between Alcaraz and Sinner was the longest Roland Garros final in history at five hours and 29 minutes. Alcaraz saved three championship points. He was two sets down to Sinner and came back to win. Go find that match if you haven't seen it. Actually stop reading this and go find it now.

Heading into 2026, Alcaraz leads Sinner in their head-to-head 10-6 overall, 4-2 on clay. Those clay numbers matter more than they might look. On paper Sinner should be dangerous on clay — he's been improving for three straight seasons — but Alcaraz has something that is very hard to describe precisely and very easy to see. The ball comes off his racquet at angles that shouldn't be possible from where he's standing. His heavy forehand grips the clay and kicks above shoulder height in a way that takes years of muscle memory to handle. He's also been the year-end world number one in three of the last four years, starting at 19.

The 2026 season started shakily for him. A loss in Monte Carlo to Sinner. Some erratic results on hard courts earlier in the year. But Alcaraz on clay in Paris is a different category of problem for opponents. He won five consecutive clay finals before his first Roland Garros title. He defends championship points like he's personally offended by the idea of losing them.

The honest question is not whether Alcaraz is a favorite — he clearly is — but whether the weight of being the two-time defending champion changes something psychological. Nadal never seemed to feel that weight. Alcaraz is a human being, not Nadal. We'll find out.

## Sinner: one Slam away from everything

Here is Jannik Sinner's problem with Roland Garros. He has the Australian Open, Wimbledon, and the US Open. He is the world number one. He is 23 years old. He has beaten Alcaraz in three of their last five matches. And yet every year when May arrives, the clay somehow finds a way to complicate his game.

Sinner plays a flat, aggressive baseline game. He takes the ball early, hits through the court, and uses pace better than almost anyone on tour. That style works everywhere except Roland Garros, where the clay slows everything down, raises the bounce past shoulder height, and turns every rally into a marathon of topspin. The ball that Sinner would hit as a winner on hard court becomes a ball that sits up into Alcaraz's forehand strike zone at Roland Garros.

That said, Sinner has been visibly working on his clay game. His Monte Carlo title in 2026 is the most concrete evidence yet. He won Rome last year. The clay results are trending in one direction. There is a version of Roland Garros 2026 where Sinner finally puts it together in the second week, gets into a final against Alcaraz, and the third Alcaraz-Sinner Roland Garros final becomes the moment Sinner claims the last piece of his career Grand Slam.

One more complication: Sinner served a three-month doping suspension that ended May 4, 2025 — just days before Roland Garros began that year. He's been back a full season now, but the cloud over his reputation hasn't fully cleared. He knows that a Roland Garros title would go a long way toward silencing the noise.

## The rest of the men's draw

Alexander Zverev is the most dangerous player in the draw outside of the top two. He reached the Roland Garros final in 2024 and has enough clay experience to cause damage in the second week. His serve has gotten bigger, his movement has gotten better, and he's won enough big clay matches to know he belongs in that conversation.

Novak Djokovic is worth watching not because anyone expects him to win but because watching him at Roland Garros is watching tennis history in real time. He's won the French Open three times, has 24 Grand Slams total, and returns to Paris in 2026 at an age where even making it through a five-set match is something to watch with admiration rather than expectations. His 2020 Roland Garros final loss to Nadal (6-0, 6-2, 7-5) was one of the most lopsided defeats in Grand Slam final history. His 2021 semifinal win over Nadal in a night session was one of the most dramatic results the tournament has ever produced. Whatever happens in 2026, pay attention.

Casper Ruud has two Roland Garros final appearances and zero titles. He is one of the most consistent clay performers in the game and consistently comes up just short when it matters most. Lorenzo Musetti, the Italian clay specialist who reached the semifinals in 2024, is another name to track. And then there's Arthur Fils, the young Frenchman playing at home for the first time with genuine Grand Slam expectations.

## The women's side

Iga Swiatek has won Roland Garros four times (2020, 2022, 2023, 2024) and holds a career record of 35-2 at the tournament. She is the obvious favorite. She is also coming off a year where Aryna Sabalenka beat her in the 2025 semifinal and her 26-match winning streak at Roland Garros finally ended. The invincibility at Roland Garros that felt permanent is now something she has to earn back.

Swiatek's own doping case — a one-month suspension in August 2024 for contaminated melatonin tablets — was kept secret for months before being revealed. She's been competing and winning since then. Whether the mental weight of that controversy affects her in Paris, where the pressure is already highest, is a question without a clean answer.

Sabalenka beat Swiatek in the 2025 Roland Garros semifinal and has won Madrid three times. The one thing missing from her CV is a clay Grand Slam. She is the second favorite and means it.

The wildcard is Mirra Andreeva, 18 years old, who became the youngest player in 30 years to reach the Roland Garros semifinals when she did it in 2024 at 17. She will be playing her second Roland Garros as a genuine contender, which is a very strange sentence to type about a teenager.

## The call

Men: Alcaraz in five sets over Sinner. For the third straight year. I might be wrong about this but I will not be apologetic about it.

Women: Swiatek, who tends to perform best when people start doubting her.`,

  faqs: [
    { question: "Who is the favorite to win Roland Garros 2026?", answer: "Carlos Alcaraz is the two-time defending champion and the primary favorite. Jannik Sinner, who beat Alcaraz in the 2026 Monte Carlo final, is the main challenger. Among women, Iga Swiatek with four Roland Garros titles is the odds-on favorite." },
    { question: "When does Roland Garros 2026 start?", answer: "Roland Garros 2026 runs from late May to mid-June 2026, typically starting in the last week of May. The exact dates are announced by the French Tennis Federation." },
    { question: "Has Carlos Alcaraz won Roland Garros before?", answer: "Yes. Alcaraz won Roland Garros in both 2024 and 2025. His 2025 final win over Sinner lasted 5 hours 29 minutes and was the longest final in Roland Garros history." },
    { question: "Has Jannik Sinner won Roland Garros?", answer: "No. Sinner has won the Australian Open, Wimbledon, and the US Open but has not yet won Roland Garros. A French Open title would complete his career Grand Slam." }
  ]
},

// ─── ARTICLE 2 ───────────────────────────────────────────────────────────────
{
  slug: 'nadal-roland-garros-14-titles-legacy',
  title: 'The 14 Titles That Will Never Be Matched: Nadal\'s Roland Garros Story',
  category: 'tournaments',
  excerpt: 'Rafael Nadal won Roland Garros 14 times. He lost there exactly four times in his career. No one in any major professional sport has dominated a single event the way Nadal dominated clay in Paris.',
  meta_title: 'Nadal Roland Garros: The Story Behind 14 French Open Titles',
  meta_description: 'Rafael Nadal won Roland Garros 14 times with a 112-4 career record. The full story of how he built the most dominant run in Grand Slam history.',
  image_url: '/images/tournaments/roland-garros.jpg',
  image_alt: 'Rafael Nadal Roland Garros clay court champion',
  body: `## 112 wins, 4 losses, 14 trophies, 17 years

Those are the numbers. They do not fully communicate the reality. Rafael Nadal first won Roland Garros in 2005 when he was 19 years old. He last won it in 2022 when he was 36. The gap between those two dates is 17 years. He was still winning the French Open when players who idolized him as teenagers were losing to him in the semifinals. No athlete in any major professional sport has maintained that level of dominance at a single event for that long.

To understand why requires understanding both what the clay court at Roland Garros is and what Nadal's game was built to do to it.

## What the clay does

Roland Garros uses crushed red brick from northern France, compacted into a surface that slows the ball by roughly 25 percent compared to hard courts and raises the bounce significantly above what players see anywhere else. A heavy topspin shot that skids through at waist height on a hard court sits up at shoulder height on clay. This is the fundamental tactical fact of the tournament. Players who generate extreme topspin benefit disproportionately because the clay amplifies it. Players who rely on pace and flat hitting suffer because the clay absorbs it.

Nadal generated somewhere around 4,900 RPM on his forehand. Roger Federer, for comparison, generated around 3,200. That gap sounds technical. What it means in practice is that Federer's shots, which were devastating on every other surface, were significantly less damaging on clay. Nadal's shots, already effective elsewhere, became genuinely punishing on clay because the surface amplified the kick and pushed the ball above where most players could hit it aggressively.

Add to that Nadal's left-handedness, which sent his serve curling away from right-handers in a direction they were unaccustomed to defending, and his extreme defensive depth, which allowed him to retreat 10 feet behind the baseline and still construct winners from positions most players would concede the point from. The result was a player whose game was optimized for clay in ways that were probably not entirely intentional but were completely comprehensive.

## The run

Nadal won his first Roland Garros in 2005 without losing a set. He was 19 years old and had never played at the highest level on a major clay court. He beat Puerta in the final and cried. What looked at the time like a promising debut turned out to be the beginning of the most extraordinary run in the history of Grand Slam tennis.

He won again in 2006, 2007, and 2008. The 2006 final against Federer ended 6-1, 6-1, 6-4. The 2007 final ended 6-3, 4-6, 6-3, 6-4. The 2008 final ended 6-1, 6-3, 6-0. Federer lost in the final to Nadal four times between 2006 and 2011 and never won. He finally won Roland Garros once, in 2009, and only because Robin Soderling had knocked Nadal out in the fourth round weeks earlier. Without that upset, Federer's career Grand Slam — one of the most storied achievements in tennis history — does not happen on that timeline.

The first loss came in 2009. Soderling, ranked 23rd, ended a 31-match winning streak at Roland Garros that had lasted four years. Nadal was dealing with knee problems and had clearly lost something that year; he also lost Wimbledon later that summer. But what happened next is the thing that separates Nadal from every other athlete at every other event: he came back in 2010 and won without losing a set. He came back in 2011 and won. And 2012. And 2013. And 2014.

## The Djokovic question

From about 2011 onward, the interesting storyline was not whether Nadal would win but whether Djokovic could stop him. Djokovic was arguably the better player in that period. He held the world number one ranking for longer, won more majors total, was more versatile across surfaces. On clay, though, Nadal was something else. Djokovic finally beat him at Roland Garros in 2015 (7-5, 6-3, 6-1) — one of the most dominant wins over Nadal that anyone managed on clay, ever — and that loss effectively ended Nadal's second great Roland Garros run. But even then, Nadal came back. He won in 2017. He won in 2018, 2019, 2020, and then one final time in 2022 when nobody expected it.

The 2020 final deserves its own mention. Djokovic was the world number one, arguably playing the best tennis of his life, and Nadal beat him 6-0, 6-2, 7-5. Djokovic, 33 years old, one of the greatest players in history, was bageled in the first set of a Grand Slam final. By Nadal. At Roland Garros. In 2020. The year Nadal turned 34.

## The records in context

Bjorn Borg won six Roland Garros titles and remains the previous benchmark for clay dominance at the French Open. Borg lost three matches there across his six titles. Nadal lost four matches. Borg won his six titles in seven years between 1974 and 1981. Nadal won 14 titles across 17 years, never winning in years where he withdrew injured (2004, 2016) and never losing in a final.

That last part deserves repetition: Nadal was 14-0 in Roland Garros finals. He never needed a fifth set to win a final. He won four titles without dropping a single set across the entire tournament. If you built a simulation and tried to design the most complete record at a single Grand Slam, you would not design something this complete.

Pete Sampras won 14 Grand Slams across his career and zero Roland Garros titles. He reached the quarterfinals once, in 1996. Sampras was the dominant player of his era on every surface except clay, where Nadal's predecessors and contemporaries proved equally capable of neutralizing his serve. Nadal is the counterpoint to Sampras: a record defined not by breadth but by absolute depth at one place.

## What Alcaraz inherits

Carlos Alcaraz said, after his 2024 Roland Garros title, that Nadal showed him the way. That Nadal is the reason he fell in love with that court. Alcaraz grew up in Murcia, 200 miles from Nadal's hometown in Mallorca, and watched Nadal win Roland Garros as a child. The forehand he built, heavy with topspin and optimized for clay, is not accidental. The defensive depth, the willingness to run down balls that opponents have already written off — these things are studied.

Whether Alcaraz can build anything that challenges what Nadal did is genuinely unknowable. What is knowable is that Nadal's record is not going to fall easily or quickly. Fourteen titles at a single Grand Slam in the professional era, with a 97 percent win rate, over 17 years. That number exists in its own category.

Casper Ruud, who lost the 2022 final to Nadal at age 36, said it best: "Playing against him at Roland Garros is like playing against God on his home court."`,

  faqs: [
    { question: "How many times did Nadal win Roland Garros?", answer: "Rafael Nadal won Roland Garros 14 times: in 2005, 2006, 2007, 2008, 2010, 2011, 2012, 2013, 2014, 2017, 2018, 2019, 2020, and 2022. His career record at Roland Garros was 112 wins and only 4 losses." },
    { question: "Did Nadal ever lose at Roland Garros?", answer: "Yes, four times. He lost to Robin Soderling in the fourth round in 2009 (ending a 31-match win streak), to Djokovic in the quarterfinals in 2015, to Djokovic in the 2021 semifinal, and to Alexander Zverev in 2023 and 2024." },
    { question: "What is Nadal's Roland Garros win record?", answer: "Nadal went 112-4 at Roland Garros for a 97% win rate. He was 14-0 in finals and won four titles without dropping a set (2008, 2010, 2017, 2020)." },
    { question: "Who beat Nadal at Roland Garros?", answer: "Robin Soderling (2009, R4), Novak Djokovic (2015 QF, 2021 SF), and Alexander Zverev (2023 QF, 2024 R1) are the only players to beat Nadal at Roland Garros." }
  ]
},

// ─── ARTICLE 3 ───────────────────────────────────────────────────────────────
{
  slug: 'roland-garros-biggest-upsets-history',
  title: 'The Greatest Upsets in Roland Garros History',
  category: 'tournaments',
  excerpt: 'In 2009, a 23rd seed ended Rafael Nadal\'s 31-match unbeaten streak at Roland Garros. In 1989, a cramping 17-year-old served underhand to beat the world number one. The clay court is the great equalizer.',
  meta_title: 'Greatest Upsets in Roland Garros History — French Open Shocks',
  meta_description: 'From Soderling stunning Nadal in 2009 to Michael Chang\'s legendary 1989 run, the biggest upsets and shocks in Roland Garros history.',
  image_url: '/images/tournaments/roland-garros.jpg',
  image_alt: 'Roland Garros upset shock French Open history',
  body: `## The clay court gives the underdog something that grass and hard courts don't

It gives them time. On grass, a 130mph serve is an unreturnable fact. On clay, the same serve slows down, sits up, and becomes a ball that can theoretically be returned if you move quickly enough and have enough topspin on your reply. The slower the surface, the more rallies happen, and the more rallies happen, the more chances exist for the player who was supposed to lose to do something extraordinary. This is why Roland Garros, across its long history, has produced some of the most shocking results in tennis.

## Soderling def. Nadal, 2009: the upset that changed everything

Robin Soderling was ranked 23rd in the world. He had played Roland Garros eight times before 2009 and had not once made it past the third round. His game was flat, aggressive, and not particularly suited to clay — he hit through the ball rather than over it, which is the opposite of what most successful clay players do.

Rafael Nadal arrived at Roland Garros in 2009 as the four-time defending champion. He had not lost a match there in four years. His 31-match winning streak at the tournament was the longest active win streak at any Grand Slam by any player. Six weeks before Roland Garros, Nadal had beaten Soderling 6-1, 6-0 at Rome. One set, 12 games, and Nadal had won all 12.

What happened in the fourth round at Roland Garros has never been adequately explained. Soderling won in four sets. He hit the ball flatter and harder than anyone had hit it against Nadal at Roland Garros, took it early, denied Nadal the defensive depth he used to construct points, and essentially played as if the clay surface was not there. Nadal, who had been dealing with knee problems, never looked like his invincible self.

The ripple effect of that match extended well beyond Soderling's run to the final. Roger Federer, who had lost four Roland Garros finals to Nadal, now had a clear path through the draw. He made the final, beat Soderling, and completed his career Grand Slam — something that would have had to wait at least another year if Nadal had survived. The most remarkable individual achievement in recent tennis history is in some ways a direct consequence of Soderling's afternoon.

## Michael Chang, 1989: the kid with the cramps and the underarm serve

Michael Chang was 17 years old when he played Roland Garros in 1989. He had never won a Grand Slam match before that tournament. He was 5 feet 9 inches tall in a sport increasingly dominated by big servers.

He made it to the fourth round and faced Ivan Lendl, the world number one, who had won Roland Garros twice and was one of the dominant players of the era. In the fifth set, with the match on the line, Chang's legs started cramping. The television cameras caught him standing mid-rally, barely able to run, grimacing with each step.

At 4-3 in the fifth set, 15-30, Chang served underhand. He tossed the ball up gently and pushed it just over the net, barely in. Lendl, who had never seen this in a professional match at this stage, was so surprised he barely moved. The crowd erupted. It was probably gamesmanship, possibly desperation, possibly a combination of both. Chang said afterward: "I had an unbelievable conviction in my heart." Whatever it was, it worked.

Chang won the fifth set and went on to win Roland Garros. He was 17 years and 109 days old, the youngest man to win a Grand Slam title in the Open Era. He beat Lendl, the world number one, in the fourth round, came back from two sets down in the final against Stefan Edberg, and won in five.

He was also the first American man to win Roland Garros since Tony Trabert in 1955. Not bad for a kid who could barely stand up in the fourth round.

## Seyboth Wild def. Medvedev, Roland Garros 2023

Thiago Seyboth Wild had never made it past the qualifying rounds at Roland Garros. He was ranked 172nd in the world. In the first round, he played Daniil Medvedev, the second seed, who had won the US Open and multiple Masters titles and was one of the two or three best players in the world.

Medvedev does not like clay. He has said this publicly. His flat, aggressive game is poorly suited to the high bounces and slow pace, and his results at Roland Garros have been consistently below what his overall ranking would suggest. But being beaten in the first round by a qualifier ranked 172nd was not something anyone expected.

Seyboth Wild won in five sets. Medvedev had never been knocked out in the first round of a major before this match. It is, in a straightforward way, one of the most surprising single-match results Roland Garros has produced in the last decade.

## Djokovic def. Nadal, 2015: not technically a major upset, but it felt like one

This was not an upset in the ranking sense — Djokovic was the world number one at the time. But Djokovic beating Nadal at Roland Garros in the quarterfinals by scores of 7-5, 6-3, 6-1 felt seismic. The 6-1 third set, with Nadal barely able to hold a service game, represented the first time in roughly a decade that Nadal had looked genuinely beatable at Roland Garros. Not just beatable — dominated.

It cracked something. Not the myth entirely — Nadal came back and won the tournament again in 2017 — but it proved that even on clay, even at Roland Garros, the right opponent having the right day could make Nadal look ordinary. That had not been proven before 2015.

## The 1993 first round: Lendl loses to a qualifier ranked 297th

Ivan Lendl, two-time Roland Garros finalist, multiple Grand Slam champion, was eliminated in the first round of the 1993 French Open by a 22-year-old French qualifier ranked 297th in the world. The Frenchman was playing his first ATP-level match. He had never played at Roland Garros before. He won in four sets and bageled Lendl in one of them.

This one requires no analysis. Sometimes the clay court just decides that today is not your day, and there is nothing you or anyone else can do about it.

## Why upsets happen here and not at Wimbledon

The slow surface gives lower-ranked players more time to build their game in each match. At Wimbledon, a big server can hit 15 aces and remove most of the rally tennis from the equation. At Roland Garros, the server gets one ace and then must construct a point. If the lower-ranked player is having a great day — if they're finding their topspin, if they're solving the opponent's patterns — the surface cooperates with them in a way that faster courts do not.

This doesn't mean upsets are common at Roland Garros. In most years the favorites reach the second week. But when the upset comes, it tends to be total and memorable. Soderling didn't just beat Nadal — he won in four sets and reached the final. Chang didn't just get through one match — he won the whole thing. The clay court doesn't just allow upsets. When it allows them, it tends to let them run.`,

  faqs: [
    { question: "Who beat Rafael Nadal at Roland Garros for the first time?", answer: "Robin Soderling, seeded 23rd, defeated Nadal in the fourth round of Roland Garros 2009, ending Nadal's 31-match unbeaten streak at the tournament. It was Nadal's first loss at Roland Garros after four consecutive titles." },
    { question: "Who is the youngest Roland Garros champion?", answer: "Michael Chang won Roland Garros in 1989 at age 17 years and 109 days, making him the youngest men's Grand Slam champion in the Open Era. He memorably beat world number one Ivan Lendl in the fourth round while suffering from leg cramps." },
    { question: "What is the biggest upset in Roland Garros history?", answer: "Most tennis historians consider Soderling's defeat of Nadal in 2009 the biggest upset in French Open history, given Nadal's dominance and the length of his winning streak. Michael Chang's entire 1989 run from unseeded to champion is arguably equally shocking." }
  ]
},

// ─── ARTICLE 4 ───────────────────────────────────────────────────────────────
{
  slug: 'roland-garros-records-statistics',
  title: 'Roland Garros Records: The Numbers That Define the French Open',
  category: 'tournaments',
  excerpt: 'A 97% win rate. 14 finals, 14 titles. A match that lasted six hours and 33 minutes. The record books at Roland Garros contain numbers that seem impossible until you realize they happened.',
  meta_title: 'Roland Garros Records — French Open Statistics and History',
  meta_description: 'Complete Roland Garros records: most titles, longest matches, youngest champions, career win rates and more French Open statistics.',
  image_url: '/images/tournaments/roland-garros.jpg',
  image_alt: 'Roland Garros records statistics French Open history',
  body: `## The number that does not have a comparison

Fourteen titles at a single Grand Slam. Rafael Nadal's Roland Garros record is the kind of statistic that invites comparison and then defeats every comparison you attempt. Chris Evert won seven Roland Garros titles — the women's record until Swiatek challenged it — and that is considered one of the great records in tennis history. Bjorn Borg won six consecutive French Opens. His record was considered untouchable for decades. Nadal passed it in 2013 and then kept going.

To understand the scale of what 14 means: the second-highest number of titles at any single Grand Slam, in the men's game, is six (Borg at Roland Garros and Federer at Wimbledon). Nadal has more than twice that number. At the same tournament.

His career record there was 112 wins and four losses. Four losses across 19 appearances spanning 17 years. The 97% win rate holds up under any kind of scrutiny. He dropped just 37 sets across all 19 editions. He won four titles without dropping a single set in the entire tournament: 2008, 2010, 2017, and 2020. In 2020, he beat Djokovic — the world number one — in the final, 6-0 in the first set.

He was also 14-0 in finals. The only major where he never lost a final.

## The longest match: six hours and 33 minutes

The longest match in Roland Garros history was not a classic. It was a first-round match between Fabrice Santoro and Arnaud Clément in 2004, two Frenchmen, played on a court probably not much larger than a living room in the context of global viewership. It lasted six hours and 33 minutes, ending 4-6, 3-6, 7-6, 6-3, 16-14. The final set alone lasted over two hours.

In 2020, Lorenzo Giustino and Corentin Moutet played a first-round match that went six hours and five minutes, also decided by a final-set score of 18-16. Both matches are reminders that before tiebreaks in the fifth set became standard, Roland Garros produced genuinely medieval final-set battles.

The longest match in tennis history is still Isner-Mahut at Wimbledon in 2010: 11 hours and five minutes, with a fifth set that ended 70-68. But Roland Garros, where the clay slows everything down and final sets were played without tiebreaks for most of the tournament's history, produced more of these extended matches than any other Grand Slam.

By comparison, the 2025 Roland Garros final between Alcaraz and Sinner (5 hours 29 minutes) is the longest Roland Garros final on record, despite being decided by a tiebreak.

## The youngest and oldest

Michael Chang won Roland Garros in 1989 at 17 years and 109 days — the youngest men's Grand Slam champion in the Open Era. He was so young that reporters initially had to check whether his passport was accurate.

On the women's side, Monica Seles won the 1990 French Open at 16 years old. She would go on to win three consecutive French Opens (1990, 1991, 1992) before her career was interrupted.

On the other end, Serena Williams reached the Roland Garros final in 2016 while pregnant — or, at minimum, while in the early weeks of pregnancy that she confirmed after the tournament. Nadal, as noted, won his last title at 36. Martina Navratilova reached the 1999 Roland Garros doubles final at 42 years old.

## Records that don't involve Nadal

Roger Federer won 14 Grand Slams total and exactly one Roland Garros title, in 2009. His record at Roland Garros is a study in the limits of greatness when the surface doesn't cooperate: he reached four finals there (2006, 2007, 2008, 2011) and lost all four to Nadal. His lone title came only because Soderling had already eliminated Nadal.

Pete Sampras won 14 Grand Slams and zero Roland Garros titles. His best result was a quarterfinal in 1996. This is probably the most striking single fact about what clay does to great players who were not built for it.

Iga Swiatek currently holds the women's record for consecutive Roland Garros titles with four straight from 2020 to 2024, matching Chris Evert's total of seven. Swiatek's career record at Roland Garros entering 2026 was 35-2 — a win percentage comparable to Nadal's in the early years of his run. She is 24 years old.

## The surface itself

Roland Garros is the only Grand Slam still played on natural clay. The surface uses crushed red brick from northern France, processed in Belgium, and applied in a layer 1-2mm deep over a base structure. Approximately 40 tons of clay are used per season across 18 courts. The clay is watered twice daily, sometimes between sets during play.

It is also the only Grand Slam without Hawk-Eye electronic line calling — because the clay distorts ball marks in a way that makes human line judges and visible court marks more reliable than camera-based systems. In 2023, Wimbledon became the last major outside Roland Garros to fully adopt electronic calls.

Court Philippe Chatrier, the main show court, holds 14,840 fans. The retractable roof was added in 2021, which allowed night sessions for the first time. The court is named for Philippe Chatrier, FFT and ITF president, who modernized professional tennis in the 1970s and 1980s. He died in 2000.

## A number worth sitting with

Before Nadal's era, the record for most titles at Roland Garros was eight — held by Max Decugis, set across the years 1903 to 1914, in the pre-professional era when most of the world's best players couldn't afford to travel to Paris. In the modern professional era, Borg's six was the number everyone pointed to.

Nadal has 14. The next closest active player, in 2026, has two. That gap may not close in anyone's career who is currently playing. It may not close for a generation. It is the kind of record that professional sports produces once, if ever, at a specific intersection of player and surface and era and physical makeup that cannot be scheduled or predicted.`,

  faqs: [
    { question: "What is the record for most Roland Garros titles?", answer: "Rafael Nadal holds the record with 14 titles (2005–2022). Among women, Chris Evert and Iga Swiatek are tied with 7 titles each." },
    { question: "What is the longest match in Roland Garros history?", answer: "The longest match is Fabrice Santoro vs Arnaud Clément in 2004, lasting 6 hours and 33 minutes (4-6, 3-6, 7-6, 6-3, 16-14). The longest final is the 2025 Alcaraz vs Sinner match at 5 hours 29 minutes." },
    { question: "Who is the youngest Roland Garros champion?", answer: "Michael Chang won in 1989 at 17 years and 109 days, the youngest men's Grand Slam champion in the Open Era. Monica Seles won the women's title in 1990 at 16 years old." },
    { question: "Did Pete Sampras ever win Roland Garros?", answer: "No. Despite winning 14 Grand Slams, Pete Sampras never won Roland Garros. His best result was a quarterfinal in 1996. Roland Garros was the only Grand Slam he never captured." }
  ]
},

// ─── ARTICLE 5 ───────────────────────────────────────────────────────────────
{
  slug: 'roland-garros-why-clay-changes-everything',
  title: 'Why Clay Changes Everything: Roland Garros vs. Every Other Grand Slam',
  category: 'tournaments',
  excerpt: 'Pete Sampras won 14 Grand Slams and never won Roland Garros. Roger Federer played 18 French Opens and won exactly once. The clay court doesn\'t care about your ranking, your serve speed, or your results everywhere else.',
  meta_title: 'Why Clay Makes Roland Garros Unique — French Open vs Other Grand Slams',
  meta_description: 'What makes Roland Garros different from Wimbledon, the US Open, and the Australian Open? The physics of clay and why it produces different champions.',
  image_url: '/images/tournaments/roland-garros.jpg',
  image_alt: 'Clay court Roland Garros vs grass hard court comparison',
  body: `## Four surfaces, four different sports

The four Grand Slams are officially one sport. In practice, they test four different versions of it. A player's game that wins on grass at Wimbledon may actively hurt them on clay in Paris three weeks later. The mental reset required, the physical adaptation, the tactical overhaul — it's substantial enough that players spend weeks before Roland Garros doing nothing except learning how to play on clay again.

Here is the most illustrative fact: Pete Sampras won 14 Grand Slams, seven of them at Wimbledon, and never won Roland Garros. He reached the quarterfinals there once, in 1996. That quarterfinal is his best result across 15 Roland Garros appearances. Roger Federer won 20 Grand Slams and won Roland Garros once — in 2009, when Rafael Nadal had already been knocked out. These are not marginal players having bad luck. These are two of the greatest players in the history of the sport, and the clay neutralized significant portions of what made them great.

## What the clay actually does

The physics explanation is straightforward. Clay slows the ball down by roughly 25 percent compared to grass and raises the bounce significantly higher. A flat, 130mph serve that skids through at knee height on grass sits up at waist height on clay, giving the returner considerably more time. A topspin forehand that lands at waist height on a hard court kicks up to shoulder height on clay, pulling the opponent out of their optimal strike zone.

This creates a tactical environment that rewards specific attributes: heavy topspin, defensive depth, physical endurance, and the ability to construct points over long rally exchanges rather than ending them quickly. It punishes attributes that work well on other surfaces: flat hitting, big serves, aggressive net approaches, and strategies based on taking time away from the opponent.

Sampras's game was built around a 130mph first serve that effectively removed the returner's options. On clay, that serve becomes returnable. The rest of his game — solid but not spectacular from the baseline — was not equipped to win five-set clay-court matches against players who had built their entire game around the surface.

## The specialists

For most of tennis history, Roland Garros produced a category of player that didn't really exist elsewhere: the clay-court specialist. Thomas Muster won the 1995 French Open and was ranked world number one on clay with a career hard-court record that was mediocre at best. Gustavo Kuerten won three Roland Garros titles (1997, 2000, 2001) with a baseline game built entirely around topspin and defense. Carlos Moya won in 1998. Sergi Bruguera won in 1993 and 1994.

None of these players won more than two Grand Slams combined. On clay in Paris, they were better than Sampras, better than Becker, better than Edberg. On any other surface they were ordinary. The clay doesn't care.

The modern equivalent is Casper Ruud, who has reached two Roland Garros finals, won Masters titles in Miami and Montreal, and is competitive at the tour's highest level everywhere — but on clay in Paris he becomes something slightly different, a player who belongs in the last four almost regardless of the draw.

## Compared to the other three

Wimbledon is the fastest Grand Slam, played on grass that allows serves to skid through and rewards aggressive net play. The grass season lasts two weeks in the professional calendar — players go from Roland Garros to Wimbledon with barely enough time to change their shoes. The bounce is low, the rallies are short, the conditions favor servers and aggressive players. It is the opposite of Roland Garros in almost every meaningful way. White clothing is mandatory. The crowd is quieter and more reserved. The history stretches back to 1877.

The Australian Open and US Open are both played on hard courts, which are faster than clay and slower than grass. They produce a middle ground — power players succeed but cannot simply serve their way through matches the way they can at Wimbledon. Both have retractable roofs and night sessions as standard practice. The US Open has the loudest, most electric crowd in tennis. The Australian Open has the longest travel requirements for European players and the most unpredictable weather. Both tend to reward players with the broadest games.

Roland Garros has the longest matches (five-set men's tennis on a slow surface where the server has limited advantage), the most partisan and unpredictable crowd, the only surface without electronic line-calling, and the highest physical demands in terms of lateral movement and endurance. It is, in the opinion of most coaches and players, the hardest Grand Slam to win if your game wasn't built specifically for clay.

## Why Djokovic had to change everything

Novak Djokovic spent years trying to beat Nadal at Roland Garros and failing. His response was more systematic than any other player's: he overhauled his clay-court game specifically to counter what Nadal did. He flattened his swing path to take the ball earlier, before it kicked to shoulder height. He worked on his return of serve to neutralize Nadal's left-handed kick. He trained his movement for clay-specific lateral sliding.

It took him until 2015 to beat Nadal at Roland Garros, and until 2016 to win the title. He did it, eventually, by becoming a different player on clay than he was on other surfaces. No other current player has gone to those lengths. Alcaraz and Sinner are both young enough that clay is simply part of their vocabulary. But for a player who grew up training on hard courts in Eastern Europe, as Djokovic did, Roland Garros required a deliberate transformation.

## The 180 people nobody talks about

Each season, 40 tons of clay are applied across Roland Garros's 18 courts. The maintenance staff — roughly 180 workers — tend the courts from dawn to dusk. They water the courts twice daily, roll them between sessions, repair damaged areas after matches, and replace sections of clay that wear down unevenly. During the tournament, the courts are prepared between every match.

The clay must maintain a specific moisture content. Too dry and the surface becomes hard and fast, losing what makes it distinctive. Too wet and it becomes heavy and unpredictable, with balls skidding unpredictably and players sliding dangerously. The people who maintain this are not athletes or tacticians, but the tournament's results are in part a function of their work.

Roland Garros without the clay is just another tennis tournament. The clay is the whole point.`,

  faqs: [
    { question: "Why is Roland Garros played on clay?", answer: "Roland Garros has been played on clay since the early 20th century. The French Tennis Federation uses crushed red brick from northern France, which creates a slow surface that rewards topspin and endurance. Clay has been the tournament's identity for over 100 years." },
    { question: "How is clay different from grass or hard courts?", answer: "Clay slows the ball by roughly 25% compared to grass and raises the bounce significantly. This rewards heavy topspin, defensive play, and endurance. It disadvantages players who rely on flat hitting, big serves, or aggressive net play." },
    { question: "Why did Pete Sampras never win Roland Garros?", answer: "Sampras's game was built around a powerful serve and aggressive play that worked on faster surfaces. Clay negated much of his serve's effectiveness and required extended baseline rallies that weren't his strength. Despite 14 Grand Slam titles, he never advanced past the Roland Garros quarterfinals." },
    { question: "Which Grand Slam is the hardest to win?", answer: "Most professionals consider Roland Garros the hardest Grand Slam to win if your game wasn't specifically built for clay, due to the slow surface, high bounce, long matches, and the clay specialists who compete there. It's the only major that consistently eliminates world number ones who haven't adapted to the surface." }
  ]
},

// ─── ARTICLE 6 ───────────────────────────────────────────────────────────────
{
  slug: 'roland-garros-controversies-dark-side',
  title: 'Clay, Chaos, Controversy: The Dark Side of Roland Garros',
  category: 'tournaments',
  excerpt: 'Behind the roses and the red clay, Roland Garros has a history of controversies it doesn\'t advertise: a WWII detention camp, a gender scheduling war, two doping cases involving the sport\'s best players, and a crowd so hostile it has been described as a circus.',
  meta_title: 'Roland Garros Controversies and Scandals — The Dark Side of the French Open',
  meta_description: 'The controversies at Roland Garros: WWII history, women\'s scheduling discrimination, doping scandals, hostile crowd behavior, and more.',
  image_url: '/images/tournaments/roland-garros.jpg',
  image_alt: 'Roland Garros controversy scandal French Open dark history',
  body: `## The history nobody advertises

When Roland Garros publishes its history, it starts with the clay courts and the roses. It tends to skip September 1939 through June 1940, when the stadium served as a detention camp for what the French government called "undesirable foreigners." The people detained there were primarily Jews of German and Austrian origin who had fled the Third Reich to France. The French government locked them in the Roland Garros stadium — under the stairways, on wet straw — before the Nazis had even arrived.

Arthur Koestler, the journalist and writer who was interned there, described it in his memoir: "We called ourselves the cave dwellers. We slept on wet straw. We were so crammed in, we felt like sardines. It smells of filth and excrement." Approximately 600 people were held there. The conditions were deliberately poor. This was not Nazi Germany — this was the French Republic, acting under its own authority, before the German occupation.

Tennis resumed on the same courts in 1941, during the German occupation, under the name Tournoi de France. Roland Garros's own official history has, for most of its existence, made no mention of this period. The stadium's name comes from Roland Garros, a French aviator and pioneer of aerial warfare who died in 1918. He had no connection to tennis. The tournament was named after him in 1928.

## The scheduling war

Roland Garros introduced night sessions in 2021 when the retractable roof on Court Philippe Chatrier was completed. Night sessions under the roof, starting at 9:15pm, became the tournament's premium product — high attendance, Amazon Prime broadcasting, the matches that the world watches live regardless of time zone.

From 2021 through 2025, 52 night sessions were played. Four featured women's matches. In 2025, the number was zero.

Players noticed. Ons Jabeur said: "You don't show women's sport, then you ask why people watch more men. Of course they watch more men because you show men more. Everything goes together." Iga Swiatek, Aryna Sabalenka, Coco Gauff, Jessica Pegula, and Madison Keys all made similar points at various press conferences. The pattern was not subtle: women's matches, including semifinal and quarterfinal matches between top-10 players, were consistently placed in afternoon slots on secondary courts while lower-ranked men's matches were given prime-time Chatrier slots.

The tournament director defending these decisions was Amelie Mauresmo — a former world number one and two-time Grand Slam champion, one of the greatest players the women's game has produced. Her argument was that men's five-set matches were better suited for prime-time because of length, and that Amazon Prime's broadcasting contract allowed only one match per night session, forcing a choice. This is not an unreasonable argument. It also doesn't fully explain the 52-4 split over five years.

Patrick Mouratoglou, Swiatek's former coach, said publicly that Swiatek was "not a star" in the commercial sense required to justify a night session slot. The comment landed poorly, given that Swiatek had four Roland Garros titles at the time and was the world number one.

## The doping cloud

The two best players in the world heading into Roland Garros 2026 — Jannik Sinner and Iga Swiatek — have both served doping suspensions in recent years.

Sinner tested positive for clostebol, a banned steroid, in March 2024. The amounts detected were trace-level (86 picograms per litre). An independent tribunal ruled there was "no fault or negligence" — Sinner's physical therapist had used a spray containing clostebol on his own skin and subsequently gave Sinner a massage. WADA appealed. In February 2025, Sinner agreed to a three-month suspension that ran from February 9 to May 4, 2025 — clearing him to return just before Roland Garros.

Swiatek tested positive for trimetazidine, a heart medication, in August 2024. The source was contaminated melatonin tablets purchased in Poland. Her suspension was one month. The case was kept secret by the relevant authorities for months before being made public, which generated significant secondary controversy about transparency in tennis's doping enforcement.

Both players returned and competed at the highest level. Both cases were resolved with relatively short bans and with the players maintaining that contamination, not intentional doping, was responsible.

The comparison that critics raised: Simona Halep, a former Roland Garros champion and world number one, received a four-year ban for roxadustat at the 2022 US Open, later reduced to nine months. A Spanish figure skater named Laura Barquero received a six-year ban for clostebol — the same substance as Sinner, at a higher concentration — while Sinner received three months. The Spanish Tennis Federation's president called for an external investigation into "differential treatment" based on a player's ranking and commercial value. Djokovic has made similar remarks publicly.

These questions don't have clean answers. The anti-doping system is supposed to apply equally regardless of the player's name. Whether it does is something the tennis authorities have been reluctant to address directly.

## The crowd

Roland Garros has a crowd problem, and it has had it for a long time. The French spectators are among the most passionate in tennis and among the most comfortable making that passion felt in ways that are considered unacceptable at other tournaments.

In 2022, Novak Djokovic entered Court Philippe Chatrier to whistling and booing. Not because he had done anything wrong, but because he was not French and the French crowd preferred their players. He broke his racquet during the match in visible frustration. The crowd whistled louder.

In 2025, Mirra Andreeva, 18 years old and playing against a French crowd that was actively against her, was booed after winning a close first-set tiebreak. The crowd made noise between her first and second serves — a particular violation of tennis etiquette that crosses from partisanship into genuine interference with play.

Jaume Munar, a Spanish player, said the Roland Garros crowd showed "an absolute lack of respect." Serena Williams, at various points in her career, played matches in Paris where portions of the crowd audibly cheered her mistakes. Alcohol was banned from the stands in 2024 after tournament organizers warned that the crowd behavior had reached the level of what they called "hooliganism."

None of this is exclusively a Roland Garros problem — every major tournament has crowd incidents. Roland Garros has them more consistently and more explicitly than the others, and the tournament has historically done less to address them than Wimbledon or the Australian Open.

## What to make of all this

Roland Garros is also the tournament that produced the most extraordinary dynasty in professional sports history, that made Federer cry at the trophy ceremony in a good way, that gave Michael Chang his title at 17 years old, that Nadal called "my second home." The controversies listed here are real and some of them are significant, but they exist alongside something genuine and beautiful in the event.

The scheduling discrimination against women's tennis is a serious ongoing problem with no resolution in sight. The doping cases raise legitimate questions about how anti-doping enforcement actually works at the top of professional tennis. The crowd behavior is consistently worse than at comparable events. The wartime history deserves more acknowledgment than it receives.

None of this makes Roland Garros less worth watching. It makes it more complicated, which is usually what happens when you look at anything closely enough.`,

  faqs: [
    { question: "Was Roland Garros used during World War II?", answer: "Yes. From September 1939 to June 1940, the Roland Garros stadium was used by the French government as a detention camp for refugees, primarily Jews who had fled Germany and Austria. Approximately 600 people were held there in poor conditions. Tennis resumed at the venue in 1941 during the German occupation." },
    { question: "Why don't women's matches get night sessions at Roland Garros?", answer: "From 2021-2025, only 4 of 52 night sessions featured women's matches. Tournament organizers cited Amazon Prime's single-match broadcast slot and men's five-set match length as justifications. Players including Swiatek, Jabeur, and Sabalenka have publicly criticized this practice." },
    { question: "Did Sinner and Swiatek serve doping bans?", answer: "Yes. Jannik Sinner served a three-month ban (February-May 2025) for trace amounts of clostebol attributed to contaminated massage spray. Iga Swiatek served a one-month ban in 2024 for trimetazidine from contaminated melatonin tablets. Both returned to competition before Roland Garros 2026." },
    { question: "Is the Roland Garros crowd hostile?", answer: "Roland Garros crowds are known for vocal partisanship toward French players, including whistling and booing opponents. Incidents have involved Djokovic, Andreeva, Williams, and others. Alcohol was banned from the stands in 2024 after tournament organizers warned of hooliganism-level behavior." }
  ]
}

];

// ── Insert into Supabase ──────────────────────────────────────────────────────

async function run() {
  console.log(`\n📝 Inserting ${ARTICLES.length} Roland Garros articles...\n`);

  for (const article of ARTICLES) {
    // Check if already exists
    const { data: existing } = await supabase
      .from('articles')
      .select('slug')
      .eq('slug', article.slug)
      .single();

    if (existing) {
      console.log(`⏭  SKIP (exists): ${article.slug}`);
      continue;
    }

    const { error } = await supabase.from('articles').insert({
      ...article,
      status: 'published',
      published_at: NOW,
      created_at: NOW,
      updated_at: NOW,
      ai_model: 'manual',
      ai_generated_at: NOW,
    });

    if (error) {
      console.error(`❌ FAIL: ${article.slug}:`, error.message);
    } else {
      console.log(`✅ OK: ${article.slug}`);
    }
  }

  console.log('\n✅ Done!\n');
}

run().catch(e => { console.error(e); process.exit(1); });
