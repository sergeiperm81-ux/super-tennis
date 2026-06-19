# I18N Phase 1 — DESIGN PASS (НЕ ИСПОЛНЕНО)

> Review-пакет для одобрения ПЕРЕД любым `CREATE TABLE` / кодом. Ничего из этого ещё не
> применено: миграции не запускались, файлы `src/lib/*` не созданы. Цель — чтобы ревьюер
> утвердил/завернул DDL, схему, контракты и guardrails до изменения инфраструктуры.
> Контекст: `docs/I18N_IMPLEMENTATION_PLAN.md`, факты: `docs/I18N_NOTES.md`.
>
> Типы из БД (проверено SELECT): `articles.id` integer · `news.id` bigint ·
> `players.player_id` text (NOT NULL, идиоматичный кросс-табличный ключ) · `slug` text NOT NULL.
> Существующие RLS: public SELECT (`articles`: status='published'; `news`: is_active=true;
> `players`: true). Новые таблицы зеркалят public-read.

---

## 0. Вердикт ревью (2026-06-19)

**APPROVED с 2 точечными правками — обе внесены ниже.** Решения ревьюера:
- ✅ `lang CHECK (es/fr/zh)` — жёсткий список (лучше для staged rollout). Оставлен как есть (§1).
- ✅ Ключ news = `news.id` bigint (реально есть в схеме, правильнее slug). Оставлен (§1.2).
- ✅ `zod` добавить в `dependencies` (сейчас его нет — `package.json`). Будет при исполнении.
- 🔧 **[P1] Санитизация переведённого HTML** — внесено в §3, §4, §5 (через `sanitizeArticleHtml`).
- 🔧 **[P2] `translation_glossary` НЕ public-read** — public SELECT убран, только service key (§1).
- `updated_at` без триггера — принято (обновление через upsert в коде, ок для этого этапа).

После этих правок — go на миграцию `i18n_translation_tables` + код.

---

## 1. DDL новых таблиц (черновик миграции — НЕ применять до одобрения)

Все таблицы **additive**, в существующие — ноль изменений. RLS on + только public SELECT
(запись — service key, минует RLS). Предлагаю применять как ОДНУ миграцию
`i18n_translation_tables`.

```sql
-- 1.1 Переводы статей (Supabase-бэкенные: gear/lifestyle/records/vs/tournaments)
create table public.article_translations (
  id               bigint generated always as identity primary key,
  article_id       integer not null references public.articles(id) on delete cascade,
  lang             text    not null check (lang in ('es','fr','zh')),
  title            text,
  excerpt          text,
  body             text,            -- переведённый HTML
  meta_title       text,
  meta_description text,
  image_alt        text,
  status           text    not null default 'published' check (status in ('published','review','draft')),
  schema_version   integer not null default 1,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (article_id, lang)
);

-- 1.2 Переводы новостей (живут в Supabase, отдаются Worker'ом — см. блок B; FK на news.id)
create table public.news_translations (
  id             bigint generated always as identity primary key,
  news_id        bigint  not null references public.news(id) on delete cascade,
  lang           text    not null check (lang in ('es','fr','zh')),
  title          text,
  summary        text,
  body           text,
  status         text    not null default 'published' check (status in ('published','review','draft')),
  schema_version integer not null default 1,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (news_id, lang)
);

-- 1.3 Переводы игроков (key = players.player_id text, как в rankings/articles)
create table public.player_translations (
  id               bigint generated always as identity primary key,
  player_id        text    not null references public.players(player_id) on delete cascade,
  lang             text    not null check (lang in ('es','fr','zh')),
  bio_short        text,
  meta_title       text,
  meta_description text,
  status           text    not null default 'published' check (status in ('published','review','draft')),
  schema_version   integer not null default 1,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (player_id, lang)
);

-- 1.4 Переводы статических evergreen-страниц (.astro, не в Supabase). page_key = маршрут.
create table public.page_translations (
  id             bigint generated always as identity primary key,
  page_key       text    not null,   -- напр. 'rules/tennis-scoring-explained'
  lang           text    not null check (lang in ('es','fr','zh')),
  fields_json    jsonb   not null,   -- строгая схема, валидируется кодом (см. §2)
  status         text    not null default 'published' check (status in ('published','review','draft')),
  schema_version integer not null default 1,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (page_key, lang)
);

-- 1.5 Глоссарий (имена игроков → транслитерации для zh, теннис-термины, бренды)
create table public.translation_glossary (
  id          bigint generated always as identity primary key,
  lang        text not null check (lang in ('es','fr','zh')),
  source_term text not null,
  target_term text not null,
  kind        text not null check (kind in ('player_name','term','brand')),
  unique (lang, source_term, kind)
);

-- RLS: включить на ВСЕХ. Контент-таблицы — public SELECT опубликованного.
-- [P2] translation_glossary — служебная: RLS on БЕЗ public-политики => для anon/public
--      доступ закрыт по умолчанию; читается ТОЛЬКО service key (build/script). Посетителю не нужен.
alter table public.article_translations enable row level security;
alter table public.news_translations    enable row level security;
alter table public.player_translations  enable row level security;
alter table public.page_translations    enable row level security;
alter table public.translation_glossary enable row level security;  -- без public policy

create policy "Public read article_translations" on public.article_translations
  for select to public using (status = 'published');
create policy "Public read news_translations" on public.news_translations
  for select to public using (status = 'published');
create policy "Public read player_translations" on public.player_translations
  for select to public using (status = 'published');
create policy "Public read page_translations" on public.page_translations
  for select to public using (status = 'published');
-- translation_glossary: НЕТ public-политики (service-key-only).

-- Индексы по lang + FK (ускоряют build-time выборку «всё на язык X»)
create index article_translations_lang_idx on public.article_translations (lang);
create index news_translations_lang_idx    on public.news_translations (lang);
create index player_translations_lang_idx  on public.player_translations (lang);
create index page_translations_lang_idx    on public.page_translations (lang);
create index translation_glossary_lang_idx on public.translation_glossary (lang, kind);
```

**Решения ревьюера по DDL (одобрено, см. §0):**
- `lang CHECK (es/fr/zh)` — оставлен жёстким (явность > гибкость для staged rollout).
- news FK = `news.id` bigint — одобрен. В Phase 4 Worker должен отдавать `id` клиенту для
  подстановки перевода (если вдруг нельзя — отдельная миграция на `news_slug`; не блокер сейчас).
- `updated_at` без триггера — принято; обновление из кода при upsert.

---

## 2. Строгая схема `page_translations.fields_json` (Zod, версия 1)

Файл `src/lib/i18n-schema.ts` (создаётся ПОСЛЕ одобрения). Валидируется на ЗАПИСЬ (скрипт) и
на ЧТЕНИЕ (роут). Неизвестный ключ → ошибка (`.strict()`).

```ts
import { z } from 'zod';

export const FaqV1 = z.object({ q: z.string().min(1), a: z.string().min(1) }).strict();

export const PageTranslationV1 = z.object({
  title: z.string().min(1),            // <title> / h1-tier
  h1: z.string().min(1),
  metaDescription: z.string().min(1),
  quickAnswer: z.string().optional(),  // лид Quick Answer (если у страницы есть)
  faqs: z.array(FaqV1).optional(),     // порядок и длина обязаны совпасть с EN-источником
  bodyBlocks: z.array(z.string()).optional(), // HTML-блоки тела по порядку; длина = EN
}).strict();

export type PageTranslationV1 = z.infer<typeof PageTranslationV1>;
export const PAGE_SCHEMA_VERSION = 1;
```

**Правило целостности:** при переводе `faqs.length` и `bodyBlocks.length` обязаны равняться
английскому источнику; при расхождении строка пишется со `status='review'` и НЕ публикуется.
Изменение набора полей = бамп `PAGE_SCHEMA_VERSION` + миграция данных, не молчаливое расширение.

**Решено (§0):** `zod` добавляется в `dependencies` при исполнении (используется и на build-time
рендере для валидации `fields_json`).

---

## 3. Контракт `src/lib/i18n.ts` (сигнатуры + поведение; реализация после одобрения)

```ts
export type Locale = 'en' | 'es' | 'fr' | 'zh';
export const DEFAULT_LOCALE: Locale = 'en';

/** Активные локали из env I18N_LOCALES (CSV). Пусто/нет → [] → сайт строго как сейчас. */
export function getActiveLocales(): Locale[];

/** true, если локаль входит в active (en всегда валиден как дефолт). */
export function isActiveLocale(x: string): x is Locale;

/** Префикс пути для локали: en → '' (корень!), es → '/es', и т.д. Инвариант: en без префикса. */
export function localePrefix(locale: Locale): string;

/** Локализованный путь: ('es','/rules/x/') → '/es/rules/x/'; ('en',p) → p без изменений. */
export function localizedPath(locale: Locale, path: string): string;

/** og:locale: en→'en_US', es→'es_ES', fr→'fr_FR', zh→'zh_CN'. */
export function ogLocale(locale: Locale): string;

/** hreflang BCP-47: en→'en', es→'es', fr→'fr', zh→'zh-Hans'. */
export function hreflang(locale: Locale): string;

/**
 * Список alternates для страницы на основе РЕАЛЬНО доступных переводов.
 * Возвращает [{ hreflang, href }] вкл. x-default=en. Если переводов нет — только en+x-default
 * (= текущий вывод BaseLayout, golden diff чист).
 */
export function buildAlternates(canonicalPathEn: string, available: Locale[]): Array<{ hreflang: string; href: string }>;

/** Build-time чтение перевода (service key). null → страница на этой локали не строится. */
export function getPageTranslation(pageKey: string, locale: Locale): Promise<PageTranslationV1 | null>;
export function getArticleTranslation(articleId: number, locale: Locale): Promise<ArticleTranslation | null>;
export function getPlayerTranslation(playerId: string, locale: Locale): Promise<PlayerTranslation | null>;
```

**Поведение-инварианты:**
- `getActiveLocales() === []` при пустом env → ВСЕ хелперы дают английское поведение 1:1.
- `localePrefix('en') === ''` — английский всегда на корне (HARD INVARIANT №1).
- Чтение переводов — кэш в памяти на build (как существующий `ensure*Cache`), батчами по 1000.
- Нет перевода → `null` → `getStaticPaths` не эмитит путь (HARD INVARIANT №3, билд не падает).
- **[P1]** Любой HTML-перевод (`body`/`bodyBlocks`), идущий в `set:html`, проходит
  `sanitizeArticleHtml()` (на write — канонически; на read — defense-in-depth), как английский путь.

---

## 4. Перевод-скрипт `scripts/i18n/translate-content.mjs` — интерфейс + dry-run дизайн

**CLI:**
```
node scripts/i18n/translate-content.mjs --type <page|article|news|player> --lang <es|fr|zh>
     [--limit N] [--ids a,b,c] [--model gpt-4o-mini] [--confirm] [--max-cost 25]
```
- **Без `--confirm` = DRY-RUN** (по умолчанию): выбирает непереведённые строки, печатает
  счётчик + объём символов + ОЦЕНКУ стоимости, НИ ОДНОГО вызова API, НИ ОДНОЙ записи в БД.
- `--confirm` — реальные вызовы + INSERT. `--limit`/`--ids` — батчи/точечно.
- `--max-cost` — abort, если оценка превышает порог (по умолчанию $25), без молчаливого слива.

**Поток на элемент:**
1. SELECT источника + LEFT JOIN перевода → берём только те, где перевода для (type,lang) нет
   (идемпотентность: повторный запуск не переводит дважды).
2. Грузим глоссарий для lang → подмешиваем в промпт (имена/термины/бренды).
3. Вызов GPT-4o-mini: system-prompt = «спортивный перевод, СОХРАНЯЙ HTML-теги/атрибуты без
   изменений, имена собственные не переводи кроме глоссария, тон тёплый болельщицкий
   (см. article_writing_playbook)». Для `page` — переводим именованные поля по схеме §2.
4. **[P1] Санитизация (на write):** переведённый `body` и каждый HTML-блок (`bodyBlocks[]`)
   пропускаются через существующий `sanitizeArticleHtml()` из `src/lib/sanitize.ts` ПЕРЕД записью.
   Это тот же санитайзер, что защищает английский рендер перед `set:html` (см. lifestyle/news роуты).
5. **Проверка целостности:** кол-во HTML-тегов источника=перевода — сравнивается на УЖЕ
   санитизированных строках с обеих сторон (sanitize(EN-source) vs sanitize(translation)), иначе
   discard несовпадающих тегов даст ложные срабатывания. Для `page` — `PageTranslationV1` парсится
   + `faqs.length`/`bodyBlocks.length` = источнику. Провал → `status='review'`, без публикации.
6. INSERT санитизированного перевода в `*_translations` (источник — только SELECT, НИКОГДА не меняется).

> **Двойная защита (write + read).** Канонически санитизируем на write (шаг 4). Дополнительно
> locale-роуты ОБЯЗАНЫ вызывать `sanitizeArticleHtml()` перед `set:html` — ровно как английские
> `lifestyle/[slug]` и `news/[slug]` (defense-in-depth: если в таблицу попал несанитизированный
> контент в обход скрипта, рендер всё равно безопасен).
6. Аккумулируем стоимость; в конце — сводка.

**Образец dry-run вывода:**
```
[translate] type=page lang=es  model=gpt-4o-mini  MODE=DRY-RUN (no API calls, no writes)
  candidates (no es translation yet): 14
  source chars: ~86,400  →  est tokens in/out: ~21.6K / ~24K
  est cost: ~$0.018   (gpt-4o-mini $0.15/M in + $0.60/M out)
  glossary terms loaded for es: 312
  → run again with --confirm to execute.  (--limit N to batch)
```

**Стоимость-формула (документируется в скрипте):** est_tokens ≈ chars/4; cost =
in_tok×$0.15/M + out_tok×$0.60/M (out ≈ in×1.1 для es/fr, ×0.7 для zh).

---

## 5. ENV и guardrails

**ENV (всё из окружения, НИКОГДА не в коде/гите):**
| Переменная | Назначение | Статус |
|---|---|---|
| `OPENAI_API_KEY` | перевод-скрипт (GPT-4o-mini) | **новая** (нужно завести локально + в CI, где гоняем backfill) |
| `SUPABASE_URL` | чтение/запись | существует (build-time) |
| `SUPABASE_SERVICE_KEY` | INSERT переводов (минует RLS) | существует |
| `I18N_LOCALES` | активные локали сборки (CSV, напр. `es`) | **новая**; пусто/нет → сайт строго как сейчас |

**Guardrails:**
- Dry-run по умолчанию; `--confirm` обязателен для реальных вызовов; `--max-cost` стоп-кран.
- Идемпотентность (LEFT JOIN → только непереведённое).
- Источник read-only: скрипт делает SELECT источника + INSERT в `*_translations`, без UPDATE/DELETE
  существующих таблиц.
- HTML/схема-целостность → провал = `status='review'`, не публикуется (не попадёт в билд).
- Секреты не логируются; при отсутствии `OPENAI_API_KEY`/`SUPABASE_*` — явный fail-fast с понятным
  сообщением (без вывода значений).
- `I18N_LOCALES` пуст → Astro-каркас не строит ни одной locale-страницы (флаг OFF = golden diff чист).
- Валидация входа: `--type`/`--lang` из белого списка; иначе ошибка.
- **[P1] Санитизация:** переведённый HTML санитизируется `sanitizeArticleHtml()` на write +
  гарантированно на read перед `set:html`. Глоссарий (`translation_glossary`) — service-key-only
  (RLS без public-политики, [P2]).

---

## 6. Что НЕ входит в Phase 1 (защита границ)

- Никаких locale-РОУТОВ и реальных `/es/` страниц (это Phase 2).
- News/players/Worker — НЕ трогаем (Phase 4); таблицы создаём, наполняем позже.
- Автоперевод в ежедневном пайплайне — НЕ подключаем (Phase 4).
- Реальный backfill — НЕ запускаем (Phase 2-3).

## 7. Чеклист одобрения (подтверждён ревьюером 2026-06-19)

- [x] DDL additive, FK/типы/RLS/индексы корректны; ключ news = `news.id` bigint.
- [x] `lang CHECK` (жёсткий список) — одобрен.
- [x] `PageTranslationV1` (поля v1) достаточна для evergreen-кластера.
- [x] `zod` в deps — одобрен (добавить при исполнении).
- [x] Контракт `i18n.ts` (`localePrefix('en')===''`, null→no-build) — одобрен.
- [x] Интерфейс/guardrails перевод-скрипта (dry-run default, max-cost, idempotent) — одобрен.
- [x] Список ENV (`OPENAI_API_KEY`, `I18N_LOCALES`) — одобрен, ключи завести.
- [x] **[P1]** Санитизация переведённого HTML (`sanitizeArticleHtml`, write+read) — внесена.
- [x] **[P2]** `translation_glossary` без public-чтения (service-key-only) — внесена.

**После проставления галок** — даю команду на: (1) применить миграцию `i18n_translation_tables`,
(2) создать `src/lib/i18n-schema.ts` + `src/lib/i18n.ts`, (3) написать `translate-content.mjs`,
(4) каркас Astro (флаг OFF) + golden diff OFF-vs-OFF = чисто.
