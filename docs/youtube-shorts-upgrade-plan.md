# YouTube Shorts Factory — Upgrade Plan

> Status: Phase 1 implemented in this branch. Phases 2–4 are proposals for review.
> Constraint (hard): **fully automated** — no human recording, **no voiceover/TTS**,
> no manual editing. Everything runs in the existing GitHub Actions cron + FFmpeg + APIs.

## 1. Current mechanism (verified against code)

Pipeline lives in `content-factory/`, driven by `.github/workflows/content-factory.yml`.

1. **Trigger** — cron 3×/day (06:00 / 11:00 / 16:00 UTC), 1 video per run (`VIDEOS_PER_RUN=1`).
2. **Select news** — `src/fetch-headlines.js`: pulls 50 active news from Supabase where
   `youtube_video_id IS NULL` (DB-level dedup), then **scores** each headline:
   `+3` A-tier star · `+1` star in first 3 words · `+1` B-tier star · `+2` specific number ·
   `+2` fresh ≤24h · `+1` power verb · `−3` generic placeholder · `−1` stale >72h.
   Picks top with per-player diversity. Escape hatch: `SCORING_STRATEGY=random`.
3. **Generate video** — `src/generate-video.js`: 10s, 1080×1920. Stock tennis clip
   (round-robin rotation, banned player-less clips, gender filter) + dark overlay +
   timed `drawtext` (badge @1.0s → headline @1.5s → lead @4.0s → CTA text @7.0s) +
   random royalty-free music.
4. **Upload** — `src/publish-youtube.js`: YouTube Data API v3 (OAuth refresh token).
   Title = news headline. Description = summary + plain-text "super.tennis" + hashtags.
5. **Bookkeeping** — `video_publications` row, `youtube_video_id` written back to `news`,
   `published-log.json`, temp cleanup, `bg-history.json` cached between runs.

**Assessment:** automation, dedup, rotation, gender filter and **topic selection are solid**.
The bottleneck is the **output format and the funnel**, not the selection.

## 2. Statistics (export 2026-03-17 → 06-24, 208 Shorts)

| Metric | Value | Read |
|---|---|---|
| Total views | 141,575 | OK for a micro-channel |
| Avg / median views | 682 / 480 | modest, flat |
| Best video | 4,659 | no viral breakout |
| **Retention** | 4.2s of 11s = **38%** | viewers swipe fast |
| **Subscribers gained** | **44** | the core problem |
| View→sub conversion | **0.031%** (1 per 3,200) | very low |
| **Site referrals** (GA4, 28d) | **~4 sessions** | funnel is dead |

What works: drama + big names (Swiatek injury, Sinner records, Medvedev meltdown) — exactly
what the scorer rewards.

**Three root causes:** (1) funnel broken — no clickable link anywhere → the site (where the
affiliate revenue is) gets ~0; (2) "text-on-stock" format → nothing to watch → 38% retention;
(3) no recognizable brand/format → no reason to subscribe → 44 subs.

## 3. Proposal — phased, all automatable

### Phase 1 — Funnel to the site (cheap, measurable, highest ROI) — **IMPLEMENTED HERE**
Files: `src/publish-youtube.js`, `src/daily-run.js`.
1. **Clickable article link** as the first line of the description, with UTM
   (`?utm_source=youtube&utm_medium=shorts`) → GA4 attributes the traffic.
2. **Player hashtags** from `player_slugs`, human-readable (`#JannikSinner`, not the raw slug).
3. **Optional top comment** with the same link right after upload (uses the existing
   `youtube.force-ssl` scope — no re-auth). Pinning is not part of the flow (no API for it).
All three behind env flags for instant rollback / A-B. Expected: site referrals from ~4/mo
to a measurable stream. Metric: GA4 sessions with `utm_medium=shorts`.

### Phase 2 — Retention (so the algorithm distributes wider)
File: `src/generate-video.js`.
4. **First frame = the hook**, no bright→dark fade (better Shorts cover).
5. **Kinetic captions** — progressive reveal of 2–3 facts from the summary (the proven
   faceless-Shorts substitute for voiceover).
6. **Player photo + Ken Burns** (`zoompan`) instead of abstract stock — face + motion.
   ⚠️ Licensing: see open question. **Decision for PR-1: variant B — keep licensed stock,
   no player photos yet.**
7. **Hook question in the first second**, derived from the headline.
Expected: retention 38% → 50%+. Metric: avg view duration, % viewed.

### Phase 3 — Brand & subscriptions
File: `src/generate-video.js`.
8. Consistent template (top bar "SUPER.TENNIS · DAILY").
9. Subscribe CTA in the last ~1.5s.
10. 0.5s branded intro sting.
Metric: subs per 1,000 views.

### Phase 4 — Close the analytics loop (optional, larger)
11. Auto-pull YouTube Analytics API → Supabase weekly → recompute scorer constants
    (`A_TIER_STARS`, weights) from live data instead of the hardcoded Jan–Apr set.

## 4. Autonomy (hard requirement — confirmed)

Phase 1 runs **fully unattended**. It executes inside the existing 3×/day cron, with the
existing GitHub secrets and the existing YouTube OAuth refresh token (which already powers
daily uploads). No new credentials, no re-authorization:
- Description link + hashtags need no new scope.
- The top comment uses `commentThreads.insert`, covered by the already-granted
  `youtube.force-ssl` scope (`src/auth-youtube.js`).
- The only thing the API cannot do is **pin** the comment — deliberately left out; the
  description link is the primary funnel, so zero manual steps are required.

## 5. Env flags (Phase 1)

| Flag | Default | Effect |
|---|---|---|
| `YT_DESC_LINK` | `1` (on) | **Master link switch** — clickable article link + UTM as first description line. Also gates the top comment. |
| `YT_PLAYER_HASHTAGS` | `1` (on) | Append human-readable player hashtags |
| `YT_TOP_COMMENT` | `1` (on) | Post a top-level comment with the link after upload (only when `YT_DESC_LINK` is also on) |
| `YT_UTM_CAMPAIGN` | `shorts` | UTM campaign value (for A-B labelling) |

Set any to `0` in the workflow `env:` to disable. `YT_DESC_LINK` is the **master**
switch for the link funnel: the top comment is gated on it too, so setting
`YT_DESC_LINK=0` produces a genuinely link-free A/B arm (no link in the description
**and** none in a comment). So a clean reach-impact A/B is just toggling
`YT_DESC_LINK` per period.

## 6. Rollout & metrics
- Phase 1 to all videos at once (effect is measured via GA4, independent of impressions).
- Phase 2 as a 50/50 A-B on retention over 2–3 weeks.
- 4-week success bar: site sessions from YouTube > 50/mo (from ~4); retention > 48%;
  subs/1,000 views ×2.

## 7. Open questions for review
1. **Player-photo licensing (Phase 2.6):** site uses Wikimedia CC w/ attribution. For YouTube,
   CC-BY is fine with attribution in the description; CC-BY-SA on video is murkier.
   PR-1 takes **variant B** (no photos) to keep it clean; revisit with a safe attribution layer.
2. **Description links & reach:** the "links hurt Shorts reach" claim is unproven — A-B it.
3. **Channel's #1 goal** (site traffic vs YouTube growth) sets the priority of Phases 2–3.

## 8. Honest ceiling
Faceless auto-news Shorts without voiceover have a ceiling. The surest ROI is Phase 1 (funnel),
because that's where the money is (affiliate site). Plan: ship Phase 1, watch for a month —
if site traffic from YouTube moves, continue with Phases 2–3; if even a clickable link drives
no traffic, cut YouTube effort and reinvest in SEO/GEO (which is growing the site +61% users).
