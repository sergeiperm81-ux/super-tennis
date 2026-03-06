// scripts/check-matches.mjs
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Count total matches
const { count: matchCount } = await sb.from('matches').select('*', { count: 'exact', head: true });
console.log('Total matches:', matchCount);

// Check date range
const { data: oldest } = await sb.from('matches').select('tourney_date').order('tourney_date', { ascending: true }).limit(1);
const { data: newest } = await sb.from('matches').select('tourney_date').order('tourney_date', { ascending: false }).limit(1);
console.log('Date range:', oldest?.[0]?.tourney_date, '-', newest?.[0]?.tourney_date);

// Check some top H2H matchups
const h2hPairs = [
  { p1: 'Roger Federer', p2: 'Rafael Nadal' },
  { p1: 'Novak Djokovic', p2: 'Rafael Nadal' },
  { p1: 'Novak Djokovic', p2: 'Roger Federer' },
];

for (const pair of h2hPairs) {
  const { data: p1 } = await sb.from('players').select('player_id, full_name').ilike('full_name', `%${pair.p1}%`).limit(1);
  const { data: p2 } = await sb.from('players').select('player_id, full_name').ilike('full_name', `%${pair.p2}%`).limit(1);
  
  if (p1?.length && p2?.length) {
    const id1 = p1[0].player_id;
    const id2 = p2[0].player_id;
    
    const { count: wins1 } = await sb.from('matches').select('*', { count: 'exact', head: true })
      .eq('winner_id', id1).eq('loser_id', id2);
    const { count: wins2 } = await sb.from('matches').select('*', { count: 'exact', head: true })
      .eq('winner_id', id2).eq('loser_id', id1);
    
    console.log(`${p1[0].full_name} vs ${p2[0].full_name}: ${wins1}-${wins2}`);
  }
}
