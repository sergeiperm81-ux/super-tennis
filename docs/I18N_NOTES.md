# I18N_NOTES — фактическая карта архитектуры (Phase 0)

> Разведданные перед локализацией. Источник истины на 2026-06-19, ветка `feat/i18n-foundation`.
> Цель: знать ТОЧНО, где живёт контент и `<head>`, чтобы не сломать английский (см.
> `docs/I18N_IMPLEMENTATION_PLAN.md`).

## 1. Инвентарь роутов и источники данных

| Роут | Тип | Источник данных | Layout | В пилоте (Phase 2)? |
|---|---|---|---|---|
| `index.astro` | static route, live data | Supabase (rankings/players/articles) | BaseLayout | нет (live-data) |
| `rules/*.astro` (3 + hub) | **static inline** | в `.astro` (консты) | BaseLayout | **ДА** |
| `money/*.astro` (3 + hub) | **static inline** | в `.astro` | BaseLayout | **ДА** |
| `watch/*.astro` (3 + hub) | **static inline** | в `.astro` | BaseLayout | **ДА** |
| `rankings/<explainer>.astro` (4) | **static inline** | в `.astro` | BaseLayout | **ДА** |
| `rankings/index.astro` | live data | Supabase rankings | BaseLayout | нет (live, daily) |
| `lifestyle/<subhub>.astro` (style/culture/…) | static inline | в `.astro` | BaseLayout | кандидат (позже) |
| `players/[slug].astro` | dynamic SSG | **Supabase** (`getPlayerBySlug`,`getTopPlayerSlugs`) | (свой) | нет → Phase 4 (UI-тяжёлый) |
| `lifestyle/[slug].astro` | dynamic SSG | **Supabase** (`getArticleSlugs('lifestyle')`) | ArticleLayout | Phase 3 |
| `gear/[slug].astro` | dynamic SSG | **Supabase** (`getArticleSlugs('gear')`) | ArticleLayout | Phase 3 |
| `records/[slug].astro` | dynamic SSG | **Supabase** (`getArticleSlugs('records')`) | ArticleLayout | Phase 3 |
| `vs/[slug].astro` | dynamic SSG | **Supabase** (article + `getPlayerBySlug`+`getH2H`) | ArticleLayout | Phase 3 |
| `tournaments/[slug].astro` | dynamic SSG | **Supabase** (`getArticleSlugs('tournaments')`) | ArticleLayout | Phase 3 |
| `tournaments/[slug]/results.astro` | dynamic SSG | static `getStaticPaths` (derived) | — | позже |
| `news/[slug].astro` | dynamic SSG | **Worker API** `supertennis-cron…workers.dev/api/news?limit=2000` | ArticleLayout | **нет → Phase 4** |
| `news/index.astro` | live data | **Worker API** (`/api/news?limit=80`) + Supabase sidebar | BaseLayout | нет → Phase 4 |
| `stats/index.astro` | client-side | **Worker API** в браузере (runtime JS) | BaseLayout | нет (password/utility) |
| `*/index.astro` (gear/lifestyle/records/vs/tournaments/players/calendar) | live data | Supabase | BaseLayout | хабы — позже |
| `about/contact/terms/privacy/faq/editorial-standards/404/search/quizzes` | static | в `.astro` / Pagefind | BaseLayout | служебные, низкий приоритет |

**Вывод:** пилотный кластер (`/rules/`,`/money/`,`/watch/`, ranking-explainers) — чисто
статический инлайн-контент в `.astro`, без Supabase/Worker/клиентского JS. Идеален.
News сидит в Supabase (1644 строк), но **отдаётся через Worker** → перевод требует работы на
стороне Worker (Phase 4, блок B). Players — Supabase, но страница UI-тяжёлая (Phase 4).

## 2. `<head>` в BaseLayout.astro (где хардкод английского)

`src/layouts/BaseLayout.astro`:
- стр. 72 — `<html lang="en">` ← локализовать.
- стр. 118 — `<link rel="canonical" href={canonicalURL}>` (self, ок; на локалях — self локали).
- стр. 119 — `<link rel="alternate" hreflang="en" …>` ← статический, заменить на динамический.
- стр. 120 — `<link rel="alternate" hreflang="x-default" …>` ← оставить = английский.
- стр. 128-134 — Open Graph; стр. 134 `og:locale = "en_US"` ← локализовать.
- стр. 157-158 — шрифты `…&subset=latin` ← блок D (CJK для zh).
- стр. 32-68 — Organization + WebSite JSON-LD (description, SearchAction.target) ← локализовать +
  `inLanguage`.
- Пропсы (стр. 6-14): `title, description, ogImage, jsonLd, publishedTime, dynamicContent,
  ogType`. **Добавить `locale='en'` (дефолт = текущее поведение 1:1).**

`ArticleLayout.astro` — обёртка над BaseLayout для статей; здесь NewsArticle/Article JSON-LD,
нужен `inLanguage` + локализованные headline/description (Phase 3-4).

## 3. Sitemap — `astro.config.mjs` → `serialize()`

Кастомная логика (стр. 39-174):
- **Volatile/date-driven** (lastmod=today): `/`, `/rankings/` (index), `/news/`, `/calendar/`,
  индивидуальные `/news/...` и URL с датой → **меняются между сборками** (важно для golden diff).
- `STATIC_CLUSTER_DATES` (стр. 69-93) — хардкод-даты для `/rules/`,`/money/`,`/watch/`,
  ranking-explainers, lifestyle-субхабов.
- `freshnessMap` из `src/data/freshness-map.json` (генерится pre-build из Supabase `updated_at`).
- Priority/changefreq по типам (стр. 119-170); служебные (`/search/`,`/about` и т.д.) — `return undefined` (выкидываются).
- **Локали:** alternates надо добавлять здесь же (а не «потом»); при пустом active — вывод прежний.

## 4. Supabase (project `supertennis` = `qpnxhiwauhuogwkspxuq`, ACTIVE_HEALTHY)

Схема таблиц — в TS-интерфейсах `src/lib/supabase.ts` (`Player`, `Article`, `NewsItem`,
`Tournament`, `Ranking`, `H2HData`). Чтение build-time через service key (in-memory cache).

Таблицы (public, все `rls_enabled=true`): `players`, `articles` (697), `news` (1644),
`rankings` (5078), `tournaments`, `matches`, `interlinks`, `youtube_videos`,
`video_publications`, `weekly_briefs`, `contact_messages`, `h2h_cache`.

**RLS-политики для зеркалирования в новых таблицах переводов:**
| Таблица | policy | cmd | roles | qual |
|---|---|---|---|---|
| `articles` | Public read articles | SELECT | public | `status = 'published'` |
| `news` | anon_read | SELECT | public | `is_active = true` |
| `players` | Public read players | SELECT | public | `true` |

→ Новые `*_translations`/`page_translations`: RLS on + public SELECT с `status='published'`.
Запись — только service key (минует RLS). Никаких write-политик для public.

## 5. Build-пайплайн и детерминизм (КРИТИЧНО для golden diff)

`npm run build` = `validate-photos → generate-freshness-map → generate-llms-txt → astro build
→ generate-image-sitemap`. Output: **`dist/`**. ESM (`"type":"module"`). `openai` v6 уже в deps.

**Детерминизм:** сборка тянет ЖИВЫЕ данные (rankings, news, `lastmod=today`) → две сборки в
разное время отличаются на data-driven страницах ДАЖЕ без изменений кода. Поэтому:
- **Главный golden-тест = OFF-vs-ON одной сессии** (build с `I18N_LOCALES` пустым → manifest A;
  build с `I18N_LOCALES=es` → manifest B; diff(A,B)). Одни и те же данные → дельта = только наш код.
- Кросс-временной diff против Phase 0 baseline — best-effort, с ignore-list волатильных путей
  (`scripts/i18n/volatile-paths.json`): `index.html`, `news/**`, `rankings/index`, `calendar/**`,
  `sitemap*.xml`, `rss.xml`, и др. live-data хабы.
- Локальный build без Supabase-кред падает в fallback (см. try/catch в роутах + `lib/fallback-data.ts`)
  → набор страниц МЕНЬШЕ прод. Для golden diff это ок, пока OFF и ON собраны в ОДНОМ окружении.

## 6. Подводные камни (gotchas) для локализации

- **Interlinks** (`src/lib/interlinks.ts`, `addInterlinks`) врезает внутренние ссылки в тело —
  на локалях они будут вести на английские URL, если не сделать locale-aware (Phase 3-4).
- **Header/Footer** (`src/components/`) — навигация/метки на английском; вынести в UI-словарь
  `src/i18n/ui/*.json` (Phase 4).
- **Pagefind** — один индекс на весь `dist/` (`search.astro`); `/es/` исключать (блок C).
- **Шрифты** — latin-subset (блок D), zh потребует Noto Sans SC только на `/zh/`.
- **news** живёт в Supabase, но раздаётся Worker'ом — перевод требует Worker-работы (блок B).
- **Клиентские скрипты** в BaseLayout (affiliate-tracking, external-links rel, flag-fallback) —
  не зависят от языка, локализация их не трогает.
