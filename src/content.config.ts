import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Shared fields used across most content types
const seoFields = {
  title: z.string(),
  description: z.string(),
  ogImage: z.string().optional(),
  canonical: z.string().optional(),
};

const contentMeta = {
  publishedAt: z.coerce.date(),
  updatedAt: z.coerce.date().optional(),
  author: z.string().default('SUPER.TENNIS'),
  draft: z.boolean().default(false),
};

// ── Players ─────────────────────────────────────────────────
// Profiles, net-worth sub-pages, racket sub-pages
const players = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/players' }),
  schema: z.object({
    ...seoFields,
    ...contentMeta,
    // Player identity
    name: z.string(),
    slug: z.string(),
    nationality: z.string(),
    birthDate: z.coerce.date().optional(),
    height: z.string().optional(),
    plays: z.enum(['Right-Handed', 'Left-Handed']).optional(),
    turnedPro: z.number().optional(),
    // Sub-page type: profile | net-worth | racket
    type: z.enum(['profile', 'net-worth', 'racket']).default('profile'),
    parentPlayer: z.string().optional(), // slug of parent player for sub-pages
    // Stats & ranking
    tier: z.number().min(1).max(3).default(2), // 1=top 30, 2=top 100, 3=rest
    currentRanking: z.number().optional(),
    careerTitles: z.number().optional(),
    grandSlams: z.number().optional(),
    // Media
    image: z.string(),
    badge: z.string().default('PLAYERS'),
    // Related content
    relatedLinks: z.array(z.object({
      title: z.string(),
      href: z.string(),
    })).default([]),
  }),
});

// ── Records ─────────────────────────────────────────────────
const records = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/records' }),
  schema: z.object({
    ...seoFields,
    ...contentMeta,
    category: z.enum([
      'speed', 'titles', 'matches', 'streaks', 'age', 'money', 'other',
    ]),
    recordHolder: z.string().optional(),
    recordValue: z.string().optional(),
    image: z.string(),
    badge: z.string().default('RECORDS'),
    relatedLinks: z.array(z.object({
      title: z.string(),
      href: z.string(),
    })).default([]),
  }),
});

// ── Gear ────────────────────────────────────────────────────
const gear = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/gear' }),
  schema: z.object({
    ...seoFields,
    ...contentMeta,
    category: z.enum([
      'rackets', 'shoes', 'strings', 'bags', 'accessories', 'apparel',
    ]),
    priceRange: z.string().optional(),
    image: z.string(),
    badge: z.string().default('GEAR'),
    relatedLinks: z.array(z.object({
      title: z.string(),
      href: z.string(),
    })).default([]),
  }),
});

// ── Lifestyle ───────────────────────────────────────────────
const lifestyle = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/lifestyle' }),
  schema: z.object({
    ...seoFields,
    ...contentMeta,
    category: z.enum([
      'money', 'luxury', 'fashion', 'travel', 'culture', 'other',
    ]),
    image: z.string(),
    badge: z.string().default('LIFESTYLE'),
    relatedLinks: z.array(z.object({
      title: z.string(),
      href: z.string(),
    })).default([]),
  }),
});

// ── Tournaments ─────────────────────────────────────────────
const tournaments = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/tournaments' }),
  schema: z.object({
    ...seoFields,
    ...contentMeta,
    // Tournament identity
    name: z.string(),
    location: z.string(),
    surface: z.enum(['Hard', 'Clay', 'Grass', 'Indoor Hard', 'Carpet']),
    category: z.enum([
      'Grand Slam', 'Masters 1000', 'ATP 500', 'ATP 250', 'WTA 1000', 'WTA 500', 'WTA 250', 'Other',
    ]),
    prizeMoney: z.string().optional(),
    dates: z.string().optional(),
    // Media
    image: z.string(),
    badge: z.string().default('TOURNAMENTS'),
    relatedLinks: z.array(z.object({
      title: z.string(),
      href: z.string(),
    })).default([]),
  }),
});

export const collections = {
  players,
  records,
  gear,
  lifestyle,
  tournaments,
};
