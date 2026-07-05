/**
 * 2026 tennis-calendar data + helpers — source for the localized routes
 * (src/pages/[lang]/calendar/index.astro).
 *
 * NOTE: the English page (src/pages/calendar/index.astro) keeps its own inline copy of
 * this dataset so its production output stays untouched by i18n work. If you edit the
 * season data here, mirror the SAME change in the English page (and vice-versa).
 * Data is language-neutral (proper names, dates, country tokens); localization
 * (month names, surfaces, country translation) is applied in the localized route.
 */

export interface Tournament {
  name: string;
  dates: string;
  location: string;
  surface: string;
  level: string;
  emoji: string;
}

export interface Month {
  name: string;
  abbr: string;
  season: string;
  tournaments: Tournament[];
}

export const months: Month[] = [
  {
    name: 'January',
    abbr: 'JAN',
    season: 'hard',
    tournaments: [
      { name: 'Australian Open', dates: 'Jan 19 – Feb 1', location: 'Melbourne, Australia', surface: 'Hard', level: 'Grand Slam', emoji: '🏆' },
      { name: 'Adelaide International', dates: 'Jan 6 – 12', location: 'Adelaide, Australia', surface: 'Hard', level: 'ATP 250', emoji: '🎾' },
      { name: 'ASB Classic', dates: 'Jan 6 – 11', location: 'Auckland, New Zealand', surface: 'Hard', level: 'WTA 250', emoji: '🎾' },
    ],
  },
  {
    name: 'February',
    abbr: 'FEB',
    season: 'hard',
    tournaments: [
      { name: 'Dubai Tennis Championships', dates: 'Feb 16 – 22', location: 'Dubai, UAE', surface: 'Hard', level: 'ATP 500', emoji: '⭐' },
      { name: 'Qatar Open', dates: 'Feb 9 – 15', location: 'Doha, Qatar', surface: 'Hard', level: 'WTA 500', emoji: '⭐' },
      { name: 'Delray Beach Open', dates: 'Feb 9 – 16', location: 'Delray Beach, USA', surface: 'Hard', level: 'ATP 250', emoji: '🎾' },
    ],
  },
  {
    name: 'March',
    abbr: 'MAR',
    season: 'hard',
    tournaments: [
      { name: 'Indian Wells Masters', dates: 'Mar 5 – 16', location: 'Indian Wells, USA', surface: 'Hard', level: 'Masters 1000', emoji: '🏅' },
      { name: 'Miami Open', dates: 'Mar 19 – 30', location: 'Miami, USA', surface: 'Hard', level: 'Masters 1000', emoji: '🏅' },
    ],
  },
  {
    name: 'April',
    abbr: 'APR',
    season: 'clay',
    tournaments: [
      { name: 'Monte-Carlo Masters', dates: 'Apr 5 – 12', location: 'Monte Carlo, Monaco', surface: 'Clay', level: 'Masters 1000', emoji: '🏅' },
      { name: 'Barcelona Open', dates: 'Apr 13 – 19', location: 'Barcelona, Spain', surface: 'Clay', level: 'ATP 500', emoji: '⭐' },
      { name: 'Stuttgart Open', dates: 'Apr 21 – 27', location: 'Stuttgart, Germany', surface: 'Clay', level: 'WTA 500', emoji: '⭐' },
    ],
  },
  {
    name: 'May',
    abbr: 'MAY',
    season: 'clay',
    tournaments: [
      { name: 'Madrid Open', dates: 'Apr 22 – May 3', location: 'Madrid, Spain', surface: 'Clay', level: 'Masters 1000', emoji: '🏅' },
      { name: 'Italian Open', dates: 'May 6 – 17', location: 'Rome, Italy', surface: 'Clay', level: 'Masters 1000', emoji: '🏅' },
      { name: 'Roland Garros', dates: 'May 24 – Jun 7', location: 'Paris, France', surface: 'Clay', level: 'Grand Slam', emoji: '🏆' },
    ],
  },
  {
    name: 'June–July',
    abbr: 'JUN',
    season: 'grass',
    tournaments: [
      { name: 'Queens Club', dates: 'Jun 16 – 22', location: 'London, UK', surface: 'Grass', level: 'ATP 500', emoji: '⭐' },
      { name: 'Wimbledon', dates: 'Jun 30 – Jul 13', location: 'London, UK', surface: 'Grass', level: 'Grand Slam', emoji: '🏆' },
      { name: 'Birmingham Classic', dates: 'Jun 16 – 22', location: 'Birmingham, UK', surface: 'Grass', level: 'WTA 250', emoji: '🎾' },
    ],
  },
  {
    name: 'August',
    abbr: 'AUG',
    season: 'hard',
    tournaments: [
      { name: 'Montreal / Toronto Masters', dates: 'Aug 4 – 10', location: 'Canada', surface: 'Hard', level: 'Masters 1000', emoji: '🏅' },
      { name: 'Cincinnati Masters', dates: 'Aug 11 – 17', location: 'Cincinnati, USA', surface: 'Hard', level: 'Masters 1000', emoji: '🏅' },
      { name: 'US Open', dates: 'Aug 25 – Sep 7', location: 'New York, USA', surface: 'Hard', level: 'Grand Slam', emoji: '🏆' },
    ],
  },
  {
    name: 'September–October',
    abbr: 'SEP',
    season: 'hard',
    tournaments: [
      { name: 'China Open', dates: 'Sep 22 – Oct 5', location: 'Beijing, China', surface: 'Hard', level: 'ATP/WTA 1000', emoji: '🏅' },
      { name: 'Shanghai Masters', dates: 'Oct 6 – 12', location: 'Shanghai, China', surface: 'Hard', level: 'Masters 1000', emoji: '🏅' },
      { name: 'Basel / Vienna', dates: 'Oct 20 – 26', location: 'Europe', surface: 'Hard (Indoor)', level: 'ATP 500', emoji: '⭐' },
    ],
  },
  {
    name: 'November',
    abbr: 'NOV',
    season: 'indoor',
    tournaments: [
      { name: 'ATP Finals', dates: 'Nov 9 – 16', location: 'Turin, Italy', surface: 'Hard (Indoor)', level: 'Tour Finals', emoji: '🏆' },
      { name: 'WTA Finals', dates: 'Nov 2 – 9', location: 'Riyadh, Saudi Arabia', surface: 'Hard (Indoor)', level: 'Tour Finals', emoji: '🏆' },
      { name: 'Davis Cup Finals', dates: 'Nov 18 – 23', location: 'TBD', surface: 'Hard (Indoor)', level: 'Team Event', emoji: '🏆' },
    ],
  },
];

// Map tournament names to article slugs
export const tourneyLinkMap: Record<string, string> = {
  'Australian Open': '/tournaments/australian-open-guide/',
  'Roland Garros': '/tournaments/roland-garros-guide/',
  'Wimbledon': '/tournaments/wimbledon-guide/',
  'US Open': '/tournaments/us-open-guide/',
  'Indian Wells Masters': '/tournaments/indian-wells-complete-guide/',
  'Miami Open': '/tournaments/miami-open-complete-guide/',
  'Monte-Carlo Masters': '/tournaments/monte-carlo-masters-complete-guide/',
  'Madrid Open': '/tournaments/madrid-open-guide/',
  'Italian Open': '/tournaments/rome-masters-guide/',
  'Shanghai Masters': '/tournaments/shanghai-masters-complete-guide/',
  'ATP Finals': '/tournaments/atp-finals-complete-guide/',
  'WTA Finals': '/tournaments/wta-finals-guide/',
  'Davis Cup Finals': '/tournaments/davis-cup-guide/',
};

export const surfaceColors: Record<string, string> = {
  'Hard': '#2563eb',
  'Clay': '#dc6b20',
  'Grass': '#16a34a',
  'Hard (Indoor)': '#7c3aed',
};

// Country code mapping for flag images (flagcdn.com)
export function getCountryCode(location: string): string | null {
  const map: Record<string, string> = {
    'Australia': 'au',
    'New Zealand': 'nz',
    'UAE': 'ae',
    'Qatar': 'qa',
    'USA': 'us',
    'Monaco': 'mc',
    'Spain': 'es',
    'Germany': 'de',
    'Italy': 'it',
    'France': 'fr',
    'UK': 'gb',
    'Canada': 'ca',
    'China': 'cn',
    'Saudi Arabia': 'sa',
  };
  for (const [country, code] of Object.entries(map)) {
    if (location.includes(country) || location === country) return code;
  }
  // Special cases
  if (location === 'Europe') return null;
  if (location === 'TBD') return null;
  return null;
}

// Generate Event JSON-LD start/end from a "Jan 19 – Feb 1" style range.
export function parseDateRange(dates: string): { start: string; end: string } {
  const parts = dates.split('–').map((s) => s.trim());
  const monthMap: Record<string, string> = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
  };

  let startMonth = '', startDay = '', endMonth = '', endDay = '';

  const startParts = parts[0].split(/\s+/);
  startMonth = monthMap[startParts[0]] || '01';
  startDay = startParts[1]?.padStart(2, '0') || '01';

  const endParts = parts[1]?.split(/\s+/) || [];
  if (endParts.length >= 2) {
    endMonth = monthMap[endParts[0]] || startMonth;
    endDay = endParts[1]?.padStart(2, '0') || '28';
  } else {
    endMonth = startMonth;
    endDay = endParts[0]?.padStart(2, '0') || '28';
  }

  return {
    start: `2026-${startMonth}-${startDay}`,
    end: `2026-${endMonth}-${endDay}`,
  };
}
