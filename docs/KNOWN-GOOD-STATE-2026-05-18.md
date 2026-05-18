# Known-Good State — 2026-05-18

Baseline snapshot after Round 4 (Watch cluster) + SEO indexing audit.
Use this doc as the starting point for the next iteration so we don't
build on top of a hazy state.

## Production status

| Component | Value |
|---|---|
| **Site commit** | `56ad075` |
| **Last deploy** | success (run id `26033480774`) |
| **Total pages on prod** | 2433 |
| **Sitemap entries** | 2425 (utility pages excluded) |
| **Image sitemap entries** | 2415 |
| **Worker version** | `329a5cec-ceea-4358-81fb-1f1a44784fec` |
| **Worker secrets** | OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID |
| **Worker bindings** | RATE_LIMIT (KV) |
| **TypeScript** | `tsc --noEmit` passes (0 errors) |
| **Build green** | yes (npm run build) |

## Evergreen cluster inventory (16 URLs from Round 1-4)

All cluster URLs verified:
- HTTP 200 on prod
- in sitemap-0.xml with correct lastmod + priority + changefreq
- reachable from homepage in ≤2 clicks (via Footer Tools → hub → child)
- byline = "SUPER.TENNIS Editorial" (no fake authors)
- JSON-LD: Article + BreadcrumbList + FAQPage (CollectionPage on hubs)

### Round 1: Tennis Rules (published 2026-05-17)
- `/rules/` — hub
- `/rules/tennis-scoring-explained/`
- `/rules/tie-break-rules-explained/`
- `/rules/how-many-sets-in-tennis/`

### Round 2: Rankings Explainers (published 2026-05-17)
- `/rankings/how-tennis-rankings-work/`
- `/rankings/atp-ranking-points-explained/`
- `/rankings/wta-ranking-points-explained/`
- `/rankings/live-rankings-vs-official-rankings/`

### Round 3: Tennis Money (published 2026-05-17)
- `/money/` — hub
- `/money/tennis-prize-money-explained/`
- `/money/how-much-tennis-players-earn/`
- `/money/grand-slam-prize-money-breakdown/`

### Round 4: How to Watch Tennis (published 2026-05-18)
- `/watch/` — hub
- `/watch/where-to-watch-grand-slams/`
- `/watch/best-tennis-streaming-services/`
- `/watch/tennis-tv-rights-by-country/`

## Sitemap signal correctness (verified 2026-05-18)

| URL pattern | lastmod | priority | changefreq |
|---|---|---|---|
| `/` (homepage) | today | 1.0 | daily |
| `/rankings/` (live index) | today | 1.0 | daily |
| `/news/` (index) | today | 1.0 | daily |
| `/calendar/` | today | 1.0 | daily |
| `/players/*`, `/news/{slug}/`, `/vs/*` | real `updated_at` from freshness map | 0.9 | weekly |
| `/rules/*`, `/money/*`, `/watch/*`, `/rankings/{slug}/`, `/gear/*`, `/lifestyle/*`, `/records/*` | real date | 0.8 | monthly |
| `/tournaments/*`, `/calendar/*` | real date | 0.7 | monthly |
| `/about/`, `/faq/`, `/contact/`, `/privacy/`, `/terms/`, `/stats/`, `/search/`, `/authors/*` | **excluded from sitemap** | — | — |

## Indexing API status

- Daily 200-URL rotation runs at 11:00 UTC via `.github/workflows/indexing-cron.yml` (Today's quota consumed before our priority push could run.)
- Priority push script + workflow created: `scripts/index-new-clusters.mjs` + `.github/workflows/index-new-clusters.yml`
- **Action needed (next 24h):** re-trigger `gh workflow run index-new-clusters.yml -f dry_run=false` AFTER ~11:30 UTC tomorrow when daily quota resets.
- Alternative: just let the daily rotation pick up the new URLs naturally over the next ~12 days (full sitemap cycle).

## Worker pipelines (all live)

| Pipeline | Schedule | Owner | Status |
|---|---|---|---|
| News generation (RSS → Supabase) | daily 04:00 UTC | Worker scheduled handler | LIVE |
| Content refresh (8 oldest articles → updated_at bump) | daily 04:00 UTC (Mon-Sat) | Worker scheduled handler | LIVE |
| Weekly evergreen article + brief | Monday 04:00 UTC | Worker scheduled handler | LIVE |
| Monthly rankings update | 1st of month 04:00 UTC | Worker scheduled handler | LIVE |
| YouTube videos rotation | every 3rd day 04:00 UTC | Worker scheduled handler | LIVE |
| Astro site rebuild | daily 04:30 UTC + on push | `.github/workflows/deploy.yml` | LIVE |
| Google Indexing API | daily 11:00 UTC | `.github/workflows/indexing-cron.yml` | LIVE |
| Rankings scraper | weekly Monday | `.github/workflows/weekly-rankings.yml` | LIVE |
| Watchdog Telegram alerts | 10:00 + 16:00 Sofia | `.github/workflows/watchdog.yml` | LIVE |
| Bluesky social poster | every 30 min (~20/day) | `.github/workflows/social-poster.yml` | LIVE |
| Contact form notifications | on form submit | Worker `/api/contact` endpoint | LIVE (Telegram only) |

## Contact form

- Form on `/contact/` → POST `https://supertennis-cron.sfedoroff.workers.dev/api/contact`
- Worker: rate-limit check → Supabase insert into `contact_messages` table → ctx.waitUntil(Telegram notification)
- Telegram: bot `@Tenniswatchdog_bot` (8592375548), chat 268433238 — same bot as cron alerts
- No email channel (owner decided Telegram is enough on 2026-05-18)
- `contact_messages` table schema: id (int), name, email, subject, message, created_at

## Editorial integrity

- All fake author personas (Alex Morgan, Sara Kellner) removed 2026-05-17
- 3 fake author pages deleted, /authors/* redirects to /about/
- All Article JSON-LD: `author` is now `Organization` with name "SUPER.TENNIS Editorial"
- Visible byline pattern: `By SUPER.TENNIS Editorial · Updated [date]` with link to /about/
- Fake email `contact@super.tennis` removed from /about/

## What to watch next (action items for tomorrow + next week)

### Tomorrow (~11:30 UTC, after quota reset)
- [ ] `gh workflow run index-new-clusters.yml -f dry_run=false` — push 16 cluster URLs to Indexing API
- [ ] verify run succeeded (no quota errors)

### Within 3-7 days
- [ ] check GSC Coverage report — are the 16 URLs `Discovered → crawled → indexed` or stuck somewhere?
- [ ] check GSC Performance — first impressions on the 16 URLs?
- [ ] confirm no `Duplicate, Google chose different canonical` or `Soft 404` warnings

### Within 14 days
- [ ] GSC Performance: which cluster URLs are getting clicks/impressions
- [ ] hub authority pass: strengthen the worst-performing hub (extra FAQs, more interlinks, etc.)
- [ ] decide on Round 5 cluster topic: Tickets/Travel (was user's suggested next cluster)

## Recent commits (last 6, newest first)

```
56ad075  fix(seo): correct lastmod + priority for Round 1-4 cluster URLs + Indexing API push
0fcbecf  feat(seo): Round 4 evergreen cluster — How to Watch Tennis (4 pages)
e8caa3c  chore(worker): simplify contact form to Telegram-only
00e0644  fix(worker): drop MarkdownV2 from Telegram contact-form notification
f7f809f  fix(worker): wrangler.toml send_email typo
6157c59  feat(worker): contact form notifications via Telegram + CF Send Email
```
