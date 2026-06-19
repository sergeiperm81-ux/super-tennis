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

-- RLS: включить на всех + только public SELECT опубликованного
alter table public.article_translations enable row level security;
alter table public.news_translations    enable row level security;
alter table public.player_translations  enable row level security;
alter table public.page_translations    enable row level security;
alter table public.translation_glossary enable row level security;

create policy "Public read article_translations" on public.article_translations
  for select to public using (status = 'published');
create policy "Public read news_translations" on public.news_translations
  for select to public using (status = 'published');
create policy "Public read player_translations" on public.player_translations
  for select to public using (status = 'published');
create policy "Public read page_translations" on public.page_translations
  for select to public using (status = 'published');
create policy "Public read translation_glossary" on public.translation_glossary
  for select to public using (true);

-- Индексы по lang + FK (ускоряют build-time выборку «всё на язык X»)
create index article_translations_lang_idx on public.article_translations (lang);
create index news_translations_lang_idx    on public.news_translations (lang);
create index player_translations_lang_idx  on public.player_translations (lang);
create index page_translations_lang_idx    on public.page_translations (lang);
create index translation_glossary_lang_idx on public.translation_glossary (lang, kind);
```

**Открытые вопросы ревьюеру (DDL):**
- `lang CHECK (...)` жёстко зашивает es/fr/zh — при добавлении языка нужна миграция. Альтернатива:
  без CHECK (гибче, но меньше защиты). Предлагаю CHECK сейчас (явность важнее).
- news FK на `news.id` (bigint): подтвердить, что Worker в Phase 4 сможет отдавать `id` клиенту
  для подстановки перевода. Если нет — заменить ключ на `news_slug text`. (Не блокер для Phase 1,
  таблица создаётся, наполняется в Phase 4.)
- `updated_at` без триггера автообновления — обновляем из кода при upsert. Триггер можно добавить
  отдельно, если ревьюер хочет.

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

**Вопрос ревьюеру:** zod ещё не в deps — добавить `zod` в dependencies (используется и на build-time
рендере). Ок?

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
4. **Проверка целостности:** кол-во HTML-тегов на входе=выходе; для `page` — `PageTranslationV1`
   парсится + `faqs.length`/`bodyBlocks.length` = источнику. Провал → `status='review'`, без публикации.
5. INSERT в соответствующую `*_translations` (источник — только SELECT, НИКОГДА не меняется).
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

---

## 6. Что НЕ входит в Phase 1 (защита границ)

- Никаких locale-РОУТОВ и реальных `/es/` страниц (это Phase 2).
- News/players/Worker — НЕ трогаем (Phase 4); таблицы создаём, наполняем позже.
- Автоперевод в ежедневном пайплайне — НЕ подключаем (Phase 4).
- Реальный backfill — НЕ запускаем (Phase 2-3).

## 7. Чеклист одобрения (что ревьюер подтверждает перед исполнением)

- [ ] DDL additive, FK/типы/RLS/индексы корректны; ключ news (id vs slug) согласован.
- [ ] `lang CHECK` (жёсткий список) vs без него — выбор сделан.
- [ ] `PageTranslationV1` (поля v1) достаточна для evergreen-кластера.
- [ ] `zod` в deps — ок.
- [ ] Контракт `i18n.ts` (особенно `localePrefix('en')===''` и null→no-build) — ок.
- [ ] Интерфейс/guardrails перевод-скрипта (dry-run default, max-cost, idempotent) — ок.
- [ ] Список ENV (`OPENAI_API_KEY`, `I18N_LOCALES`) — ок, ключи завести.

**После проставления галок** — даю команду на: (1) применить миграцию `i18n_translation_tables`,
(2) создать `src/lib/i18n-schema.ts` + `src/lib/i18n.ts`, (3) написать `translate-content.mjs`,
(4) каркас Astro (флаг OFF) + golden diff OFF-vs-OFF = чисто.
