/**
 * Grand Slam champions data for tournament results pages.
 * High-value SEO: "australian open winners", "wimbledon champions" etc.
 */

export interface Champion {
  year: number;
  menssingles: string;
  womenssingles: string;
  mensdoubles?: string;
  womensdoubles?: string;
}

export interface GrandSlam {
  slug: string;
  name: string;
  city: string;
  country: string;
  surface: string;
  months: string;
  established: number;
  emoji: string;
  photo: string;
  champions: Champion[];
}

export const grandSlams: GrandSlam[] = [
  {
    slug: 'australian-open',
    name: 'Australian Open',
    city: 'Melbourne',
    country: 'Australia',
    surface: 'Hard (GreenSet)',
    months: 'January',
    established: 1905,
    emoji: '🇦🇺',
    photo: '/images/tournaments/melbourne-park.jpg',
    champions: [
      { year: 2026, menssingles: 'Jannik Sinner', womenssingles: 'Aryna Sabalenka' },
      { year: 2025, menssingles: 'Jannik Sinner', womenssingles: 'Madison Keys' },
      { year: 2024, menssingles: 'Jannik Sinner', womenssingles: 'Aryna Sabalenka' },
      { year: 2023, menssingles: 'Novak Djokovic', womenssingles: 'Aryna Sabalenka' },
      { year: 2022, menssingles: 'Rafael Nadal', womenssingles: 'Ashleigh Barty' },
      { year: 2021, menssingles: 'Novak Djokovic', womenssingles: 'Naomi Osaka' },
      { year: 2020, menssingles: 'Novak Djokovic', womenssingles: 'Sofia Kenin' },
      { year: 2019, menssingles: 'Novak Djokovic', womenssingles: 'Naomi Osaka' },
      { year: 2018, menssingles: 'Roger Federer', womenssingles: 'Caroline Wozniacki' },
      { year: 2017, menssingles: 'Roger Federer', womenssingles: 'Serena Williams' },
      { year: 2016, menssingles: 'Novak Djokovic', womenssingles: 'Angelique Kerber' },
      { year: 2015, menssingles: 'Novak Djokovic', womenssingles: 'Serena Williams' },
      { year: 2014, menssingles: 'Stan Wawrinka', womenssingles: 'Li Na' },
      { year: 2013, menssingles: 'Novak Djokovic', womenssingles: 'Victoria Azarenka' },
      { year: 2012, menssingles: 'Novak Djokovic', womenssingles: 'Victoria Azarenka' },
      { year: 2011, menssingles: 'Novak Djokovic', womenssingles: 'Kim Clijsters' },
      { year: 2010, menssingles: 'Roger Federer', womenssingles: 'Serena Williams' },
    ],
  },
  {
    slug: 'roland-garros',
    name: 'Roland Garros (French Open)',
    city: 'Paris',
    country: 'France',
    surface: 'Clay',
    months: 'May–June',
    established: 1891,
    emoji: '🇫🇷',
    photo: '/images/tournaments/roland-garros.jpg',
    champions: [
      { year: 2025, menssingles: 'Carlos Alcaraz', womenssingles: 'Iga Swiatek' },
      { year: 2024, menssingles: 'Carlos Alcaraz', womenssingles: 'Iga Swiatek' },
      { year: 2023, menssingles: 'Novak Djokovic', womenssingles: 'Iga Swiatek' },
      { year: 2022, menssingles: 'Rafael Nadal', womenssingles: 'Iga Swiatek' },
      { year: 2021, menssingles: 'Novak Djokovic', womenssingles: 'Barbora Krejcikova' },
      { year: 2020, menssingles: 'Rafael Nadal', womenssingles: 'Iga Swiatek' },
      { year: 2019, menssingles: 'Rafael Nadal', womenssingles: 'Ashleigh Barty' },
      { year: 2018, menssingles: 'Rafael Nadal', womenssingles: 'Simona Halep' },
      { year: 2017, menssingles: 'Rafael Nadal', womenssingles: 'Jelena Ostapenko' },
      { year: 2016, menssingles: 'Novak Djokovic', womenssingles: 'Garbine Muguruza' },
      { year: 2015, menssingles: 'Stan Wawrinka', womenssingles: 'Serena Williams' },
      { year: 2014, menssingles: 'Rafael Nadal', womenssingles: 'Maria Sharapova' },
      { year: 2013, menssingles: 'Rafael Nadal', womenssingles: 'Serena Williams' },
      { year: 2012, menssingles: 'Rafael Nadal', womenssingles: 'Maria Sharapova' },
      { year: 2011, menssingles: 'Rafael Nadal', womenssingles: 'Li Na' },
      { year: 2010, menssingles: 'Rafael Nadal', womenssingles: 'Francesca Schiavone' },
    ],
  },
  {
    slug: 'wimbledon',
    name: 'Wimbledon',
    city: 'London',
    country: 'United Kingdom',
    surface: 'Grass',
    months: 'June–July',
    established: 1877,
    emoji: '🇬🇧',
    photo: '/images/tournaments/wimbledon.jpg',
    champions: [
      { year: 2025, menssingles: 'Novak Djokovic', womenssingles: 'Jasmine Paolini' },
      { year: 2024, menssingles: 'Carlos Alcaraz', womenssingles: 'Barbora Krejcikova' },
      { year: 2023, menssingles: 'Carlos Alcaraz', womenssingles: 'Marketa Vondrousova' },
      { year: 2022, menssingles: 'Novak Djokovic', womenssingles: 'Elena Rybakina' },
      { year: 2021, menssingles: 'Novak Djokovic', womenssingles: 'Ashleigh Barty' },
      { year: 2019, menssingles: 'Novak Djokovic', womenssingles: 'Simona Halep' },
      { year: 2018, menssingles: 'Novak Djokovic', womenssingles: 'Angelique Kerber' },
      { year: 2017, menssingles: 'Roger Federer', womenssingles: 'Garbine Muguruza' },
      { year: 2016, menssingles: 'Andy Murray', womenssingles: 'Serena Williams' },
      { year: 2015, menssingles: 'Novak Djokovic', womenssingles: 'Serena Williams' },
      { year: 2014, menssingles: 'Novak Djokovic', womenssingles: 'Petra Kvitova' },
      { year: 2013, menssingles: 'Andy Murray', womenssingles: 'Marion Bartoli' },
      { year: 2012, menssingles: 'Roger Federer', womenssingles: 'Serena Williams' },
      { year: 2011, menssingles: 'Novak Djokovic', womenssingles: 'Petra Kvitova' },
      { year: 2010, menssingles: 'Rafael Nadal', womenssingles: 'Serena Williams' },
    ],
  },
  {
    slug: 'us-open',
    name: 'US Open',
    city: 'New York',
    country: 'United States',
    surface: 'Hard (DecoTurf)',
    months: 'August–September',
    established: 1881,
    emoji: '🇺🇸',
    photo: '/images/tournaments/us-open.jpg',
    champions: [
      { year: 2025, menssingles: 'Jannik Sinner', womenssingles: 'Aryna Sabalenka' },
      { year: 2024, menssingles: 'Jannik Sinner', womenssingles: 'Aryna Sabalenka' },
      { year: 2023, menssingles: 'Novak Djokovic', womenssingles: 'Coco Gauff' },
      { year: 2022, menssingles: 'Carlos Alcaraz', womenssingles: 'Iga Swiatek' },
      { year: 2021, menssingles: 'Daniil Medvedev', womenssingles: 'Emma Raducanu' },
      { year: 2020, menssingles: 'Dominic Thiem', womenssingles: 'Naomi Osaka' },
      { year: 2019, menssingles: 'Rafael Nadal', womenssingles: 'Bianca Andreescu' },
      { year: 2018, menssingles: 'Novak Djokovic', womenssingles: 'Naomi Osaka' },
      { year: 2017, menssingles: 'Rafael Nadal', womenssingles: 'Sloane Stephens' },
      { year: 2016, menssingles: 'Stan Wawrinka', womenssingles: 'Angelique Kerber' },
      { year: 2015, menssingles: 'Novak Djokovic', womenssingles: 'Flavia Pennetta' },
      { year: 2014, menssingles: 'Marin Cilic', womenssingles: 'Serena Williams' },
      { year: 2013, menssingles: 'Rafael Nadal', womenssingles: 'Serena Williams' },
      { year: 2012, menssingles: 'Andy Murray', womenssingles: 'Serena Williams' },
      { year: 2011, menssingles: 'Novak Djokovic', womenssingles: 'Samantha Stosur' },
      { year: 2010, menssingles: 'Rafael Nadal', womenssingles: 'Kim Clijsters' },
    ],
  },
];

/** All-time Grand Slam title leaders for FAQ section */
export const allTimeMensLeaders = [
  { name: 'Novak Djokovic', titles: 24 },
  { name: 'Rafael Nadal', titles: 22 },
  { name: 'Roger Federer', titles: 20 },
  { name: 'Pete Sampras', titles: 14 },
  { name: 'Roy Emerson', titles: 12 },
  { name: 'Rod Laver', titles: 11 },
  { name: 'Bjorn Borg', titles: 11 },
];

export const allTimeWomensLeaders = [
  { name: 'Margaret Court', titles: 24 },
  { name: 'Serena Williams', titles: 23 },
  { name: 'Steffi Graf', titles: 22 },
  { name: 'Helen Wills Moody', titles: 19 },
  { name: 'Chris Evert', titles: 18 },
  { name: 'Martina Navratilova', titles: 18 },
];
