# Photo Rules for SUPER.TENNIS

## Why Wikimedia Commons and not Getty / AP / Reuters / other sites

Sports photos from news agencies (Getty Images, AP, Reuters, AFP) are **commercially licensed**. Embedding them on your site — even with full credit — is copyright infringement unless you have a paid license. The credit line on a news site means *they* paid; it doesn't make the photo free for everyone.

**Wikimedia Commons** photos carry open licenses (CC BY, CC BY-SA, CC0). These are genuinely free to use on the site, provided attribution is included in the article body or caption. This is the only reliable free source of real sports photography.

Other usable sources:
- Official tournament press kits (if explicitly free for editorial use)
- CC-licensed photos on Flickr
- Photos explicitly marked as free-to-use by the photographer

---

## The Three-Tier Photo Resolution System

Every page that shows a photo follows the same priority chain:

```
1. Static mapping  →  player-photos.ts (tournamentArticlePhotos, gearArticlePhotos, etc.)
2. Supabase field  →  article.image_url  (set when article was generated/inserted)
3. Fallback        →  category-specific image, chosen by slug hash
```

**All three must be wired up** for the system to work. If tier 1 returns null and tier 2 is null in the database, tier 3 kicks in.

---

## Where Photos Are Resolved

### Article hero image (`[slug].astro` pages)
```typescript
const heroImage = await getArticlePhotoUrl(slug, category) || article.image_url || null;
```
- `getArticlePhotoUrl` → checks `player-photos.ts` static mapping
- `article.image_url` → Supabase column, set at article creation
- `null` → ArticleLayout shows no hero (graceful)

### Tournament index (`/tournaments/`)
- **Guide articles** (slugs ending `-guide` / `-complete-guide`): `article.image_url || getVenuePhoto(slug)` → falls back to venue photo
- **Feature articles** (all other slugs): show `article.image_url` directly in its own section
- Rule: never classify a feature article as a "Grand Slam" just because its slug contains "roland-garros"

### RelatedArticles component ("You Might Also Like")
```typescript
photoMap.get(slug) || article.image_url || categoryFallback(slug, category)
```
- `categoryFallback` picks from a pool of category-relevant images using `abs(hashCode(slug)) % poolSize`
- This ensures different articles get different fallback images, not all the same `court-01.webp`
- Fallback pools are defined in `RelatedArticles.astro`: `FALLBACK_POOLS`

---

## Rules for Adding New Articles

### Must-have: `image_url` in Supabase

Every article inserted into Supabase **must** have `image_url` set to a real photo URL. Without it, the article falls through to the generic fallback.

```sql
-- Good
INSERT INTO articles (slug, category, title, body, image_url, image_alt)
VALUES ('my-article', 'tournaments', '...', '...', 'https://upload.wikimedia.org/...', 'Alt text here');

-- Bad — will show generic fallback
INSERT INTO articles (slug, category, title, body)
VALUES ('my-article', 'tournaments', '...', '...');
```

### Where to get Wikimedia photos

1. Go to `https://commons.wikimedia.org/wiki/Special:Search`
2. Search: `"Roland Garros" tennis` or `"[player name]" tennis`
3. Filter: Photos only, License: CC BY / CC BY-SA / CC0
4. Click the photo → click "Use this file" → copy the direct image URL ending in `.jpg` or `.png`
5. Add `image_url` and `image_alt` to the article

Attribution format (put in article body near top, or in a footer note):
```
Photo: [Photographer name] / Wikimedia Commons / CC BY-SA 4.0
```

---

## Rules for New Sections / Article Types

When a new category is added:
1. Add it to `FALLBACK_POOLS` in `src/components/RelatedArticles.astro`
2. Add the photo mapping object in `src/lib/player-photos.ts` (e.g. `newCategoryArticlePhotos`)
3. In the category `[slug].astro` page, use the pattern:
   ```typescript
   const heroImage = await getArticlePhotoUrl(slug, 'newcategory') || article.image_url || null;
   ```
4. Make sure `getArticles()` call includes articles that have `image_url` populated

---

## Tournament Index Special Rules

The `/tournaments/` index has two types of content:

| Type | Slug pattern | How to identify | Photo source |
|------|-------------|-----------------|-------------|
| Guide | ends with `-guide` or `-complete-guide` | `isTournamentGuide(slug)` | `article.image_url` → venue photo fallback |
| Feature article | everything else | `!isTournamentGuide(slug)` | `article.image_url` (required!) |

If a new Roland Garros article (or any editorial feature) is added to the `tournaments` category, it will automatically appear in the "In-Depth Articles" section as long as `image_url` is set in Supabase.

---

## Fallback Pool Maintenance

The pools in `RelatedArticles.astro → FALLBACK_POOLS` use local `/public/images/` files. When adding new local images, add them to the relevant pool. Aim for 6–10 images per category so the hash distribution looks varied.

Current pool sizes:
- `news`: 9 images (atmo, court, venue, detail varieties)
- `tournaments`: 5 images (venue photos)
- `gear`: 5 images
- `lifestyle`: 4 images
- `records`: 3 images
