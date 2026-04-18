// One-shot script to insert the Djokovic interview article
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env
const env = readFileSync(join(__dirname, '../.env'), 'utf-8');
const getEnv = (k) => env.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1]?.trim();

const supabase = createClient(getEnv('SUPABASE_URL'), getEnv('SUPABASE_SERVICE_KEY'));

const content = `<p>There is a version of Novak Djokovic the world thinks it knows — the relentless machine, the record-breaker, the man who has spent more weeks at world number one than any player in tennis history. Then there is the Novak Djokovic of this interview: reflective, vulnerable, occasionally uncertain, talking in long, winding sentences about fatherhood, exhaustion, the price of sacrifice, and whether he still truly loves what he does.</p>

<p>The conversation begins not with trophies but with a question about balance — and Djokovic's answer lasts nearly three hours.</p>

<h2>A New Kind of Season</h2>

<p>"Tennis has been the main thing in my life for three decades," Djokovic says. "And it is the thing I know best. It is the thing I do best in life." But something has shifted. Since becoming a father — his son Stefan was born in 2014, daughter Tara in 2017 — the calculus has changed.</p>

<p>"When I became a parent, everything changed for the better. I felt I wanted even more, to make my son happy, my wife happy, my parents." The energy fatherhood gave him powered several extraordinary seasons. Then came injuries, a period of self-doubt in 2017 when he nearly walked away from the sport entirely, and a return to number one. "Those phases of life and career I went through are very interesting. And that is exactly how I approach this now."</p>

<p>What Djokovic is describing — haltingly, honestly — is a decoupling he has never had to attempt before. For most of his career, tennis occupied perhaps 95% of his focus. Now, for the first time, it no longer does. "Tennis is no longer a percentage majority for me. I want to be a father. I want to be a husband. I want to be in other roles. I need to make up for something I sacrificed." He pauses. "Maybe that is a harsh word. But I really did sacrifice so many years."</p>

<h2>The Ten Deutschmarks</h2>

<p>To understand where Djokovic is going, you have to understand where he came from. He was born in Belgrade, grew up on the slopes of Kopaonik mountain in southern Serbia — where his parents met, fell in love, and built a restaurant business that kept the family afloat through the turbulent 1990s.</p>

<p>The tennis courts came first, not the tennis player. Three courts were built fifty metres from the family restaurant when Novak was four years old. His father Srdjan had barely watched the sport — perhaps Borg, McEnroe and Becker on television, and nothing more. But a child is curious, and the courts were right there. A first racket appeared. A wall became a practice partner. In 1992, the four-year-old watched Wimbledon on television for the first time and chose his idol.</p>

<p>Then came Elena Gencic — Serbia's legendary coach who had already discovered Monica Seles — who spotted the boy at a summer camp and began a relationship that would define his entire early formation. Gencic did not simply teach tennis. She played classical music. She read poetry. She made him watch footage of Edberg, Becker, Agassi, Sampras and Courier, then asked the eight-year-old: "What did you see in Becker's serve?" She was training his tennis eyes before she ever touched his game. And she was training something else entirely.</p>

<p>"She would say: close your eyes. When you win Wimbledon — not if, when — this is how you should dress, this is what you should say when the Queen arrives." Djokovic smiles recalling it. "She was training my dreams."</p>

<p>The defining moment came when Novak was twelve. The family was in Belgrade, having moved addresses many times. His father placed ten German marks on the table. "This is all we have." It was a message of impossible clarity. "I understood it immediately. Even at twelve, I felt I needed to grow up, to take responsibility. I felt in my head a very clear message to myself: only success is acceptable. And I felt, deep inside, that success was guaranteed — if I gave everything."</p>

<p>To fund a trip to a junior tournament in America, Srdjan Djokovic borrowed from local moneylenders — people charging 30% interest, people Novak describes carefully as "ordinary criminals." There were car chases, debts, desperate negotiations. "Those were terrible times," he says quietly. "But he found the money somehow, and always came out of trouble in the end."</p>

<h2>Goran's Banana and the Academy in Munich</h2>

<p>At twelve, almost thirteen, Djokovic arrived at the Pilic Academy in Munich — Niki Pilic's legendary institution, one of the top five academies in the world, where Pilic typically refused anyone under fourteen. Elena Gencic had called in a personal favour to secure the boy a trial. He knew exactly what that meant.</p>

<p>"I was very aware that she had used, so to speak, her one phone call for me. That was a very clear message: use your chance."</p>

<p>He did. And he sealed his place at the academy in the most unexpected way. Goran Ivanisevic arrived for a training session — shortly after his 2001 Wimbledon triumph, Djokovic's childhood idol appearing in the flesh. The thirteen-year-old watched from the sideline, then noticed something: Goran had played, finished his session, was jogging around, and had not eaten anything.</p>

<p>"Elena Gencic had taught me everything. Change of shirt. Socks. Towel. Always have a banana ready — eat it immediately after playing to recover what you lost." So the boy grabbed his banana, ran after the Wimbledon champion, and said: "Goran, excuse me — you have not eaten anything. Here." Ivanisevic smiled, patted him on the head, and told Pilic: "This little kid, he brought me a banana."</p>

<p>"I remember those moments with such joy," Djokovic says. "Every single moment at the Pilic Academy was perfect for me."</p>

<h2>The Americans Who Never Called Back</h2>

<p>At fifteen, the Djokovics took the biggest gamble yet: five plane connections to reach Tampa, Florida, for meetings with IMG, then the most powerful management agency in tennis. They arrived to find nobody waiting at the airport. They spent the night in a two-star motel. The next day they met the IMG representatives, and Novak dominated both the Prince Cup and the Orange Bowl under-16 competition. The agents promised contracts, a European base, full financial support.</p>

<p>"They promised us castles," Djokovic says. "My father started to believe it on the second meeting." Niki Pilic had warned them: don't trust these people, they will give you nothing. The father ignored the warning. The mother held the family together at home, quietly making it all possible while four men chased a dream across continents.</p>

<p>IMG never called back. Never answered.</p>

<p>"We learned something," Djokovic says. "In our countries — in the former Yugoslavia — a word means more than any paper. You look someone in the eyes, you shake hands, and that means something permanent. For them, if it is not on paper, it does not exist." He learned to carry two kinds of armour after that: professional contracts, and personal distance.</p>

<h2>The Davis Cup, the Breakthrough and the Legendary 2011</h2>

<p>His first Grand Slam came at the 2008 Australian Open — twenty years old, the tennis world insisting there was no room for a third champion alongside Federer and Nadal. He proved otherwise. But the pressure that followed a first Slam surprised him. "Suddenly you are no longer only attacking. You are also defending. And that is something entirely new."</p>

<p>Three years without another Slam followed — a period of searching, racket changes, a complete dietary overhaul (removing gluten transformed his energy levels and solved a chronic breathing problem), and one team moment that changed everything. In 2010, Serbia won the Davis Cup in Belgrade before a packed arena. "Something truly magnificent happened, and it probably happens only once in a lifetime." The national euphoria unlocked something private within him.</p>

<p>Then came 2011 — arguably the most dominant single season in the Open Era. Forty-three consecutive match wins. Three Grand Slams. World number one at the end of the year. "I reached a level of tennis where I genuinely felt that nobody could break through to me." He had built the universal game Elena Gencic and Niki Pilic had always pointed toward — adaptable to any surface, any opponent, any conditions. "Nadal told me later he never quite knew where to play against me," Djokovic says, with visible satisfaction. "That was always exactly the sensation I wanted him to have."</p>

<h2>Five Olympics and One Golden Afternoon in Paris</h2>

<p>Ask Djokovic about his greatest achievements and the answer surprises. Not the 24 Grand Slams. Not the record weeks at number one. The Olympic gold medal — finally won in Paris in 2024, on his fifth attempt — sits in a category of its own.</p>

<p>The journey was brutal. Bronze in Beijing 2008 after losing to Nadal in the semi-finals. A semi-final loss to Andy Murray at Wimbledon during London 2012, a match he calls one he "would take back" given the chance. Rio 2016 — perhaps his career peak — destroyed by a wrist injury in practice the day before competition. ("I could not move my wrist. One day to my match. What to do? Injections, everything possible.") Tokyo 2021, leading Alexander Zverev 6-1, 3-2 while serving — utterly exhausted after consecutive daily matches with no rest day in sight — losing the second and third sets on empty legs.</p>

<p>"Every time I think about those Olympic defeats, my hands start to sweat. Those were the most painful losses of my career. The most emotional." But Paris was different. He skipped the opening ceremony to rest his body. He slept in a hotel rather than the athletes' village. He reached the final without dropping a set. And he won.</p>

<p>"When I carry the crest of my country and I walk into that village and I see those fifteen thousand athletes from all over the world — gymnasts, swimmers, track athletes who have waited four entire years for this one moment — and you see the hunger in their eyes, the happiness, the inspiration. You can carry the whole world on your shoulders."</p>

<p>His next mountain is now clear: Los Angeles 2028. "That is the one thing I am certain of in my head right now, professionally. The Olympics and the national team. More than Grand Slams, it is that Olympics. I want to be there. I want to be an Olympian again."</p>

<h2>The Unwanted Child</h2>

<p>There is one more thing he addresses directly in this conversation: the years when the tennis establishment did not want to accept him alongside Federer and Nadal. The media narratives sided with the Swiss and the Spaniard. Corporate sponsors reinforced the fairy tale. For a young Serbian from a country without deep tennis tradition — from a country that had been bombed within living memory — the exclusion was felt acutely.</p>

<p>"They simply did not like that I was here and challenging these two," he says plainly. "I was the unwanted child." For a period he tried to adapt himself — to be what the tennis world wanted him to be. It did not work. "I suddenly realised what I was doing. That is completely not me. I am trying to be what they want, dancing to their tune." He stopped. He decided to be himself and accept that a portion of the public might never embrace him. "At least now I sleep peacefully."</p>

<p>With Federer the relationship was always cooler, the distance between an older generation and a younger challenger. With Nadal — closer in age, closer in the experience of grinding for every point — it was warmer and more naturally understood. But the rivalry with both, he insists without hesitation, made all three of them who they became.</p>

<p>"That rivalry had the single strongest influence on my development, especially from 2011 onward. Through this competition we pushed each other, and other players, to develop. I say this without any doubt whatsoever."</p>

<h2>What Comes Next</h2>

<p>Djokovic is still here. He is still training. The competitive intensity has not dropped — only the proportion of life that it consumes. He is looking for a balance that no previous version of himself ever had to find: between the man who has been ranked number one more than any player alive, and the father, the husband, the human being who placed everything else in a locked box for thirty years.</p>

<p>"I have to simply live something," he says quietly. "Something I need to discover about myself. I am on the way to finding out what that is."</p>

<p>The ten Deutschmarks are long gone. The courts at Kopaonik are still there. And somewhere between the boy who sprinted across a Munich practice court to offer his banana to Goran Ivanisevic, and the man who wept with a gold medal around his neck in Paris, there is still a journey very much underway.</p>`;

const article = {
  id: 833,
  slug: 'djokovic-interview-family-sacrifice-olympic-dream',
  title: "From Ten Deutschmarks to Olympic Gold: Novak Djokovic's Most Candid Interview",
  category: 'lifestyle',
  subcategory: 'culture',
  excerpt: 'In a rare three-hour conversation, Novak Djokovic speaks with extraordinary candour about his childhood on Kopaonik, his father\'s loans from criminals, meeting Elena Gencic and Goran Ivanisevic, five Olympic campaigns, the years he felt like the unwanted child of tennis — and why Los Angeles 2028 is now his greatest remaining dream.',
  body: content,
  image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Novak_Djokovic_2024_Paris_Olympics.jpg/500px-Novak_Djokovic_2024_Paris_Olympics.jpg',
  image_alt: 'Novak Djokovic celebrating his gold medal at the 2024 Paris Olympics',
  meta_description: 'Novak Djokovic opens up about family sacrifice, the ten Deutschmarks moment, five Olympics, and why Los Angeles 2028 is his final great goal.',
  player_id: 'atp_104925',
  status: 'published',
  published_at: '2026-04-18T10:00:00Z',
  updated_at: '2026-04-18T10:00:00Z',
};

const { data, error } = await supabase.from('articles').insert(article).select('id, slug, title');
if (error) {
  console.error('ERROR:', JSON.stringify(error));
  process.exit(1);
}
console.log('INSERTED:', JSON.stringify(data));
