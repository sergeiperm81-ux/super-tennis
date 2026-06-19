# I18N Implementation Plan (es / zh / fr) — Playbook для Claude Code

> Цель: добавить испанскую, китайскую и французскую версии super.tennis **без единого
> изменения** в работающей английской версии. Перевод — GPT-4o-mini + глоссарий.
> Этот документ — пошаговая инструкция. Выполнять фазы строго по порядку.
> НЕ переходить к следующей фазе, пока review-gate и verify-gate текущей не зелёные.
>
> Контекст и обоснование выбора языков/движка: см. память `i18n-multilingual-plan.md`.
> Архитектурные правила проекта: `~/.claude/rules/common/large-scale-seo-architecture.md`.

---

## 0. HARD INVARIANTS — нерушимые правила (читать перед КАЖДОЙ задачей)

Если задача нарушает любой из этих пунктов — СТОП, не делать, спросить пользователя.

1. **Английский живёт на корне. URL не меняются.** Никакого `/en/` префикса. `/news/x/`
   остаётся `/news/x/`. Любое изменение английских URL = потеря ~4000 проиндексированных
   страниц = провал.
2. **Supabase — только additive.** Разрешено: `CREATE TABLE`, `CREATE INDEX`, новые RLS-политики
   на новых таблицах. ЗАПРЕЩЕНО: `ALTER`/`DROP`/`UPDATE`/`DELETE` на `articles`, `news`,
   `players` и любых существующих таблицах. Источник (английский контент) — read-only.
3. **Сборка не падает на неполных данных.** Если перевода для страницы нет — locale-страница
   просто не генерируется (или fallback на английский), но `npm run build` обязан проходить
   зелёным. Никаких throw, рушащих весь билд.
4. **Feature flag по умолчанию OFF.** Пока флаг выключен — вывод сборки байт-в-байт равен
   текущему проду. Включение i18n — отдельный осознанный шаг. Это же — мгновенный откат.
5. **English-output golden diff после каждой фазы.** С флагом OFF список файлов `dist/` и их
   хэши не меняются по сравнению с baseline (Фаза 0). С флагом ON — английские файлы те же,
   только ДОБАВЛЯются `/es/`, `/zh/`, `/fr/`.
6. **Каждая фаза = review-gate + verify-gate.** Сначала `code-reviewer` (и `security-reviewer`,
   `database-reviewer` где релевантно), потом сборка + проверка вывода. Коммит — только после
   обоих зелёных. Один логический коммит на фазу/подзадачу.
7. **Никаких секретов в коде/гите.** `OPENAI_API_KEY`, `SUPABASE_SERVICE_KEY` — только из env.
8. **Cost guard на скрипте перевода.** Скрипт печатает оценку стоимости и требует `--confirm`
   (или `--limit N`) перед реальными вызовами API. Идемпотентность обязательна — повторный
   запуск не переводит уже переведённое.

---

## Golden safety test (механика проверки инварианта №5)

`scripts/i18n/snapshot-dist.mjs`: обходит `dist/`, пишет манифест `{ "path": "<sha256>" }`.
`scripts/i18n/diff-dist.mjs`: сравнивает ДВА манифеста, печатает ADDED/REMOVED/CHANGED,
делит CHANGED на volatile (data-drift, игнор) и significant (потенциальная регрессия), делит
ADDED на locale (ожидаемо) и non-locale (подозрительно). Exit 1 при significant/removed/non-locale.

**ВАЖНО — детерминизм.** Сборка тянет ЖИВЫЕ данные (rankings/news/`lastmod=today`), поэтому две
сборки в разное время отличаются на data-driven страницах ДАЖЕ без изменений кода. Отсюда два режима:

- **ГЛАВНЫЙ тест — OFF-vs-ON одной сессии (изолирует код от data-drift):**
  build с пустым `I18N_LOCALES` → `snapshot-dist .dist/ manifest-off.json`;
  build с `I18N_LOCALES=es` → `snapshot manifest-on.json`; `diff-dist manifest-off.json
  manifest-on.json`. Данные идентичны → дельта = ТОЛЬКО наш код. Ожидаем: ADDED только под
  локалями (`es/...`), significant-CHANGED = 0 (кроме allowlist hreflang/`locale`-пропа),
  REMOVED = 0, non-locale ADDED = 0.
- **Вспомогательный — кросс-временной против Phase 0 baseline:** с volatile-ignore-list
  (`scripts/i18n/volatile-paths.json`: `index.html`, `news/**`, `rankings/index`, `calendar/**`,
  `sitemap*.xml`, `rss.xml` и др.). significant-CHANGED на статических английских страницах = 0.

Протокол по фазам:
- **Baseline (Фаза 0):** `npm run build` → snapshot → закоммитить `.dist-manifest.json` как опорную точку.
- **Каждая фаза:** прогнать ГЛАВНЫЙ OFF-vs-ON тест → significant-CHANGED только из allowlist, иначе СТОП.

**Allowlist допустимых изменений английских страниц (артефакт, обязателен).**
Чтобы потом не спорить «что считать нормой», ведём версионируемый файл
`scripts/i18n/allowed-english-diff.json`:
```json
{ "phase-2": { "urls": ["/rules/...", "/money/..."],
  "allowed_change": "added <link rel=alternate hreflang=es> + reciprocal x-default; no content/canonical change",
  "reviewed_by": "<человек>", "reviewed_at": "<дата>" } }
```
Правило: `diff-dist.mjs` печатает список CHANGED среди English; КАЖДЫЙ такой файл обязан быть
в allowlist текущей фазы И его дельта обязана сводиться только к описанному `allowed_change`
(добавление hreflang/locale-узлов, ноль изменений контента/`<title>`/canonical/тела). Любой
CHANGED вне allowlist или с иной дельтой = СТОП, регрессия. Allowlist ревьюится глазами и
коммитится вместе с фазой.

---

## Phase 0 — Safety net & baseline (ничего не ломает, только готовит почву)

**Goal:** зафиксировать эталон английской сборки и завести инструменты проверки.

**Tasks:**
1. Создать ветку `feat/i18n-foundation` от свежего `main`. Вся работа — в ветке, не в `main`.
2. Прочитать и законспектировать в `docs/I18N_NOTES.md` фактическую картину:
   - все динамические роуты (`src/pages/**/[slug].astro`, `[lang]?`), откуда берут данные
     (Supabase напрямую vs Worker API `supertennis-cron.sfedoroff.workers.dev`);
   - как устроен `ArticleLayout.astro` (где `<head>`, canonical, meta);
   - как `astro.config.mjs` строит sitemap (`serialize`);
   - точную схему таблиц `articles`, `news`, `players` (через Supabase MCP `list_tables`)
     + их RLS-политики (новые таблицы будем делать по тому же образцу).
3. Написать `scripts/i18n/snapshot-dist.mjs` и `scripts/i18n/diff-dist.mjs` (см. выше).
4. `npm run build` → snapshot → закоммитить `.dist-manifest.json`.

**Review-gate:** `architect` агент ревьюит `docs/I18N_NOTES.md` — корректно ли понята
архитектура, нет ли мест где английские роуты пришлось бы менять (если есть — поднять флаг).

**Verify-gate:** `node scripts/i18n/diff-dist.mjs` сразу после snapshot → пусто (sanity check
самого инструмента: пересборка детерминирована; если есть недетерминизм типа дат — внести
эти пути в ignore-list инструмента и задокументировать).

**Definition of Done (Phase 0) — что Клод обязан принести (чеклист приёмки):**
- [ ] Ветка `feat/i18n-foundation` создана от `main`; прод/`main` не тронуты.
- [ ] `docs/I18N_NOTES.md`: список всех динамических роутов + источник данных каждого
      (Supabase / Worker API / static); карта `<head>` BaseLayout (где lang/hreflang/og/schema);
      разбор `serialize()` sitemap; точная схема `articles`/`news`/`players` + их RLS.
- [ ] `scripts/i18n/snapshot-dist.mjs` + `scripts/i18n/diff-dist.mjs` написаны и работают.
- [ ] `npm run build` проходит зелёным; снят baseline → `scripts/i18n/.dist-manifest.json`
      закоммичен (сколько файлов в манифесте — указать числом в отчёте).
- [ ] `node scripts/i18n/diff-dist.mjs` сразу после snapshot = **0/0/0** (инструмент
      детерминирован; если есть «плавающие» пути типа дат — они в ignore-list и это
      задокументировано в I18N_NOTES.md с объяснением).
- [ ] Ни одной строки изменений в существующих `.astro`, `astro.config.mjs`, Supabase —
      Phase 0 только добавляет инструменты и заметки.
- [ ] Короткий отчёт: число роутов по типам, число файлов в `dist/`, время сборки, найденные
      «подводные камни» (если роут нельзя локализовать без правки английского — поднять флаг).

**Commit:** `chore(i18n): add build-output snapshot tooling + architecture notes`
**Rollback:** удалить ветку. Прод не затронут.

---

## Phase 1 — Foundation (инфраструктура; флаг i18n всё ещё OFF)

**Goal:** таблицы переводов, глоссарий, скрипт перевода, i18n-каркас Astro — но НИ ОДНОЙ
locale-страницы на проде. English-output diff обязан быть пустым.

**Tasks:**
1. **Supabase (additive).** Через `apply_migration` создать:
   - `article_translations (id pk, article_id fk→articles, lang text, title, body, excerpt,
     meta_title, meta_description, image_alt, status text default 'published',
     created_at, updated_at, UNIQUE(article_id, lang))`.
   - `news_translations (id pk, news_id, lang, title, body, summary, ...,
     UNIQUE(news_id, lang))`. (news берётся через Worker API — уточнить, есть ли у news
     стабильный id/slug ключ; если ключ только slug — UNIQUE(news_slug, lang).)
   - `player_translations (id pk, player_id, lang, bio_short, meta_title, meta_description,
     UNIQUE(player_id, lang))`.
   - `page_translations (id pk, page_key text, lang, schema_version int default 1,
     fields_json jsonb, status default 'published', UNIQUE(page_key, lang))` — для статических
     evergreen-страниц (`/rules/`, `/money/`, `/watch/`, ranking-explainers), чей контент лежит
     в `.astro`, а НЕ в Supabase. `page_key` = маршрут (напр. `rules/tennis-scoring-explained`).
     **`fields_json` — НЕ произвольный JSON, а строгая версионируемая схема** (см. ниже).
   - `translation_glossary (id pk, lang, source_term, target_term, kind)` — kind ∈
     {player_name, term, brand}. Имена игроков (в zh — транслитерация), теннис-термины.
   - Индексы по `(lang)` и FK. RLS — зеркалить существующие таблицы (public read).
   - Никаких изменений в существующих таблицах.

   **Строгая схема `page_translations.fields_json` (фиксируется СРАЗУ, иначе через пару фаз —
   каша).** Описать Zod-схемой в `src/lib/i18n-schema.ts` и валидировать на запись (скрипт) И
   на чтение (роут). `schema_version` в строке; при изменении набора полей — бамп версии +
   миграция, а не молчаливое расширение. Версия 1:
   ```ts
   // только эти ключи, никаких лишних; неизвестный ключ = ошибка валидации
   PageTranslationV1 = {
     title: string;            // <title> / h1-tier
     h1: string;
     metaDescription: string;
     quickAnswer?: string;     // лид Quick Answer, если у страницы есть
     faqs?: { q: string; a: string }[];   // порядок и длина = английскому источнику
     bodyBlocks?: string[];    // HTML-блоки тела по порядку; кол-во = английскому
   }
   ```
   Правило: набор и ПОРЯДОК блоков перевода обязан соответствовать английскому источнику
   (faqs.length, bodyBlocks.length совпадают), иначе строка → `status='review'`, не публикуется.
2. **Скрипт перевода** `scripts/i18n/translate-content.mjs`:
   - Читает непереведённые строки источника для заданного `--lang` и `--type`
     (article|news|player), пачками (`--limit`, по умолчанию dry-run + оценка стоимости).
   - GPT-4o-mini, system-prompt: «профессиональный спортивный перевод, сохраняй HTML-теги
     и атрибуты без изменений, не переводи имена собственные кроме глоссария, тон — тёплый
     болельщицкий (как в `article_writing_playbook`)». Подмешивает глоссарий для языка.
   - Валидирует: HTML-структура на входе и выходе совпадает (кол-во тегов), иначе помечает
     строку `status='review'` и НЕ публикует.
   - Идемпотентно: пропускает то, где перевод уже есть. Печатает счётчики и стоимость.
   - Источник НЕ трогает (только SELECT + INSERT в `*_translations`).
   - Cost guard: без `--confirm` только считает и показывает оценку, реальные вызовы — нет.
3. **Astro i18n-каркас (флаг OFF):**
   - В `astro.config.mjs` добавить чтение env `I18N_LOCALES` (CSV, напр. `es,zh,fr`).
     Пусто/нет → массив пустой → НИЧЕГО не меняется (Фаза 5-инвариант).
   - Добавить `i18n: { defaultLocale: 'en', locales: ['en', ...active], routing:
     { prefixDefaultLocale: false } }` — но так, чтобы при пустом active конфиг был
     эквивалентен текущему (проверить golden diff!).
   - **Не трогать существующие английские роут-файлы.** Вместо рефактора — вынести тело
     рендера статьи в общий компонент `src/components/ArticleBody.astro` ТОЛЬКО если golden
     diff после этого пустой; если diff не пустой — откатить и оставить дублирование на
     Фазу 2 (DRY вторично, неприкосновенность английского первична).
   - Хелперы в `src/lib/i18n.ts`: `getActiveLocales()`, `getTranslation(type, id, lang)`,
     `localizedPath(lang, path)`, `hreflangAlternates(path, availableLocales)`.
4. Подключить локали к sitemap (alternates) — но при пустом active поведение прежнее.
   ВНИМАНИЕ: `astro.config.mjs/serialize` уже содержит кастомную логику lastmod/priority/
   STATIC_CLUSTER_DATES — её надо проектировать СРАЗУ с локалями (alternates + lastmod на
   переводы), а не «добавим потом». При пустом active — поведение байт-в-байт прежнее.
5. **Спроектировать cross-cutting блоки A-D** (см. секцию ниже) и зафиксировать решения
   в `docs/I18N_NOTES.md` ДО старта Phase 2. Это блокеры целостности локализации, не «потом».

**Review-gate (параллельно):**
- `database-reviewer` — миграции (additive? индексы? RLS? FK?).
- `code-reviewer` — скрипт перевода и `src/lib/i18n.ts`.
- `security-reviewer` — скрипт (секреты из env, нет инъекций в SQL/prompt, нет утечки ключей).
- `architect` — дизайн cross-cutting блоков A-D (полнота, нет ли скрытой ломки английского).

**Verify-gate:**
- `npm run build` зелёный.
- `node scripts/i18n/diff-dist.mjs` → **0/0/0** (флаг OFF, прод-вывод не изменился).
- Прогнать скрипт перевода в dry-run на 2-3 строках → корректная оценка стоимости, HTML
  сохраняется (визуально проверить вывод одной статьи).

**Commit:** отдельными коммитами: `feat(i18n): translation tables migration`,
`feat(i18n): GPT translation pipeline`, `feat(i18n): astro i18n scaffolding (flag off)`.
**Rollback:** флаг OFF и так активен → прод не затронут. Таблицы можно оставить (пустые,
никем не читаются) или дропнуть отдельной миграцией.

---

## Cross-cutting i18n design blocks (СПРОЕКТИРОВАТЬ в Phase 1, ДО любого пилота)

Эти 4 блока — не опциональные дополнения. Без них локализованная версия будет «дырявой»
(переведён текст, но layout/meta/поиск/шрифты остаются английскими/сломанными). План защищает
английский сайт — эти блоки защищают КАЧЕСТВО локализованного сайта.

### A. Locale-aware layout / meta / schema layer
`BaseLayout.astro` сейчас хардкодит английский: `<html lang="en">` (стр.72),
`hreflang="en"` + `x-default` (119-120), `og:locale="en_US"` (134). Нужно:
- `BaseLayout` принимает проп `locale` (default `'en'` → текущее поведение 1:1).
- `<html lang>` ← locale; `og:locale` ← карта (`en_US`/`es_ES`/`fr_FR`/`zh_CN`).
- Блок `hreflang` строится из РЕАЛЬНЫХ alternates страницы (en + доступные переводы +
  x-default=en), а не статически. На английском без переводов — вывод прежний (golden diff!).
- Organization/WebSite schema: локализовать `description` и (если поиск пер-язычный)
  `SearchAction.target`; добавить `inLanguage`.
- ArticleLayout/NewsArticle JSON-LD: `inLanguage`, локализованные `headline`/`description`.
- КРИТИЧНО: дефолт всех новых пропов = английское поведение, иначе ломается golden diff.

### B. Worker/API strategy для news (и динамических витрин)
News тянется через Worker API (`supertennis-cron…workers.dev/api/news`), часть витрин —
client-side JS. Перевод в Supabase это не покрывает автоматически. Решение сейчас:
**news и динамические витрины ИСКЛЮЧЕНЫ из пилота и ранних фаз (до Phase 4).** Спроектировать
(но не внедрять): переводить ли на стороне Worker (`?lang=es` → локализованный JSON),
как кэшировать, как клиентский рендер выберет язык. Не раньше Phase 4.

### C. Search / Pagefind strategy
Поиск — Pagefind, индексирует весь `dist/` в один индекс `/pagefind/` (`search.astro`).
Добавив `/es/`, Pagefind проиндексирует их в общий индекс → смешанная выдача языков.
Решение для пилота: **исключить `/es/` из индекса** (`data-pagefind-ignore` на locale-страницах
или не индексировать каталог `es/`) — поиск временно остаётся английским. Пер-язычный поиск
(отдельные индексы / языковой фильтр) — проектируем к Phase 4. Выбор зафиксировать до Phase 2.

### D. Font / rendering strategy для zh
Шрифты грузятся с `&subset=latin` (BaseLayout 157-158) — CJK не отрендерится корректно.
Для `/zh/`: подключать CJK-шрифт (напр. Noto Sans SC) ТОЛЬКО на китайских страницах
(не тащить мегабайты глифов на латинские локали — performance budget < 200КБ/стр!).
Проверить переносы, межстрочный интервал, CJK-фолбэк у `--font-heading`/`--font-body`.
Это блокер запуска zh → поэтому zh идёт последним (Phase 5).

---

## Phase 2 — Узкий пилот: испанский, ТОЛЬКО evergreen-кластер (10-20 страниц)

> Переписано по ревью: один язык, один тип страниц, один ограниченный кластер.
> БЕЗ news, БЕЗ players, БЕЗ автоперевода в ежедневном пайплайне. Расширяемся ТОЛЬКО
> после того как индексация/качество/ссылки/hreflang/поиск/сборка ведут себя нормально.

**Почему именно evergreen-кластер:** `/rules/`, `/money/`, `/watch/`, ranking-explainers —
статические `.astro` с инлайн-контентом (НЕ Supabase, НЕ Worker, минимум клиентского JS),
хорошо структурированы и самодостаточны. Чистейший первый срез локализации.
News (Worker/API + client JS) и player pages (много UI-текста, фактов, виджетов, боковых
блоков, общих меток помимо bio) — НЕ в пилоте: там просто «завести translation tables»
недостаточно для целостной локализованной страницы.

**Модель хранения для статических страниц:** контент в `.astro`, не в Supabase →
используем таблицу `page_translations` (см. Phase 1). Источник перевода — извлечённые
английские поля этих страниц (read-only, `.astro` НЕ меняем для контента); locale-роут
рендерит из `page_translations`; английский корень рендерится как сейчас.

**Tasks:**
1. Зафиксировать список 10-20 evergreen-страниц для пилота (старт: `/rules/` + `/money/`).
2. Извлечь их переводимые поля → перевести на `es` (`--type page --lang es --confirm`).
   Страниц немного → **вычитать ГЛАЗАМИ каждую** (тон, термины, HTML/структуру).
3. Locale-роут `src/pages/[lang]/rules/...`, `[lang]/money/...` и т.д. ТОЛЬКО для этих типов;
   `getStaticPaths` эмитит путь лишь там, где есть `page_translations` со `status='published'`.
4. Подключить locale-layer из блока A (`BaseLayout` проп `locale`, динамический hreflang,
   `og:locale`, `inLanguage`).
5. Pagefind: пометить `/es/` `data-pagefind-ignore` (блок C) — поиск остаётся английским.
6. Переключатель языка в хедере — показывать `es` ТОЛЬКО на страницах, где перевод есть.
7. `I18N_LOCALES=es` в env прод-сборки (Cloudflare Pages).

**Review-gate:** `code-reviewer` (locale-роуты, layout-проп, переключатель) +
`database-reviewer` (`page_translations`). Глаз-ревью списка английских файлов, куда добавился
hreflang/`locale`-проп (ожидаемо и только это).

**Verify-gate (preview, обязательно):**
- `npm run build` зелёный, время сборки не деградировало.
- golden diff (флаг ON): ADDED = только `es/rules|money|...`; English CHANGED = только страницы
  с новым hreflang/`locale`-пропом, контент/canonical НЕ тронуты.
- Preview: `/es/rules/...` рендерится, текст испанский, FAQ/quick-answer/schema на месте,
  `<html lang="es">`, `og:locale="es_ES"`, hreflang en↔es симметричен, canonical self-ref.
- Поиск работает по-английски, `/es/` в выдачу НЕ попадают.
- Внутренние ссылки на `/es/` ведут внутри `/es/` (или осознанно на англ., где перевода нет).

**Commit:** `feat(i18n): spanish evergreen pilot (rules/money/watch) — no news/players`.
**Deploy:** прод, обновить sitemap, **мониторить GSC 2-3 недели**.

**GATE на расширение (ВСЕ зелёные, иначе не двигаемся в Phase 3):**
индексация `/es/` идёт нормально · качество перевода ок (вычитано) · внутренние ссылки целы ·
hreflang валиден · поиск не сломан · сборка стабильна · golden diff чистый · нет всплеска
«Excluded»/«scaled content abuse» в GSC.
**Rollback:** убрать `I18N_LOCALES` из env → пересборка → `/es/` и hreflang исчезают.

---

## Phase 3 — Расширение es на article-бэкенные типы (всё ещё БЕЗ news/players/автоматики)

**Goal:** ТОЛЬКО после зелёного GATE Phase 2 — добавить к `es` статьи из Supabase
(`articles`: gear/lifestyle/records/vs) через `article_translations`. News и players
по-прежнему НЕ трогаем. Автоперевода в ежедневном пайплайне ещё НЕТ (батчи вручную).

**Tasks:**
1. Перевести `articles` на `es` батчами (`--type article --lang es --confirm --limit N`),
   контролировать стоимость и долю `status='review'` (битый HTML — разобрать вручную).
2. Locale-роуты для `gear/lifestyle/records/vs`, рендер из `article_translations`.
3. Расширять покрытие постепенными батчами, мониторя GSC.

**Review-gate:** `code-reviewer`. **Verify-gate:** golden diff чистый (англ. только hreflang),
preview выборочных страниц, GSC в норме.
**Commit:** `feat(i18n): expand spanish to article-backed pages (gear/lifestyle/records/vs)`.
**Rollback:** env-флаг; данные переводов остаются.

---

## Phase 4 — News + Players + автоперевод в пайплайне (самое сложное; только после устойчивого es)

**Goal:** покрыть динамические/UI-тяжёлые типы и автоматизировать. ТОЛЬКО когда es-версия
стабильна и проиндексирована.

**Tasks:**
1. **News (блок B):** реализовать выбранную стратегию Worker/API-локализации + `news_translations`.
   Проверить, что клиентский рендер новостей показывает локализованный контент.
2. **Players:** локализовать не только `bio_short`, но и UI-текст/метки/виджеты/боковые блоки —
   вынести строки интерфейса в locale-словарь `src/i18n/ui/*.json`. Просто перевод bio =
   «дырявая» страница, так делать нельзя.
3. **Search (блок C):** включить пер-язычный поиск (отдельный индекс/фильтр), убрать временный
   `data-pagefind-ignore`.
4. **Автоперевод в пайплайне:** после генерации английской статьи — шаг перевода на активные
   локали. В `try/catch`: фейл перевода НЕ ломает английскую публикацию (англ. выходит ВСЕГДА).

**Review-gate:** `code-reviewer` + `security-reviewer` (Worker-изменения). Явно проверить
изоляцию: ошибка перевода не трогает английский путь.
**Verify-gate:** preview news/players на `es`, поиск по языку, golden diff, GSC.
**Commit:** отдельными коммитами по подзадачам.
**Rollback:** покомпонентно (флаг локали; шаг перевода в пайплайне — за отдельным флагом).

---

## Phase 5 — Французский + китайский

**Goal:** добавить `fr` и `zh` по обкатанному на `es` пути.

**Tasks:**
1. **`fr`** — повторить путь `es` (Фазы 2→4), глоссарий fr. Качество MT высокое, без блокеров.
2. **`zh`** — ПОСЛЕ реализации блока D (CJK-шрифты только на `/zh/`). Глоссарий zh
   (транслитерации имён). Особое внимание: CJK-рендеринг, переносы, длина строк не ломает
   layout, `lang="zh"`. Желателен носитель / доп. LLM-ревью качества zh.
3. `I18N_LOCALES=es,fr,zh` — включать по одному, мониторя GSC между языками.

**Review-gate / Verify-gate:** как в Фазах 2-4 + визуальная проверка zh-рендеринга (preview).
**Commit:** `feat(i18n): add french locale`, затем `feat(i18n): add chinese locale`.
**Rollback:** убирать языки из `I18N_LOCALES` по одному.

---

## Сводная таблица review/verify-агентов

| Что проверяем | Агент / инструмент | Когда |
|---|---|---|
| Понимание архитектуры | `architect` | Фаза 0 |
| Дизайн cross-cutting блоков A-D (locale-layer/news/search/fonts) | `architect` | Фаза 1 |
| Миграции Supabase (additive, RLS, индексы) | `database-reviewer` | Фазы 1-2 |
| Скрипт перевода, i18n-хелперы, роуты, layout | `code-reviewer` | каждая фаза |
| Секреты, инъекции, утечки ключей | `security-reviewer` | Фаза 1 (скрипт), 4 (Worker) |
| Сборка зелёная | `npm run build` / `build-error-resolver` при фейле | каждая фаза |
| English-вывод не пострадал | `scripts/i18n/diff-dist.mjs` (golden diff) | **каждая фаза** |
| Реальный рендер `/es/` и т.д. | preview-сервер + ручная проверка | Фазы 2+ |
| hreflang/canonical/sitemap/`og:locale`/`inLanguage` | валидаторы + глаз | Фазы 2+ |
| Поиск не смешивает языки | preview + проверка Pagefind-индекса | Фазы 2+ |
| Целостность локализации (UI-текст, не только контент) | глаз-ревью + `code-reviewer` | Фазы 4+ |
| zh-рендеринг (CJK-шрифты, переносы, layout) | preview визуально | Фаза 5 |
| Индексация без аномалий | Google Search Console | после каждого деплоя |

---

## Глобальные процедуры отката (от мягкого к жёсткому)

1. **Мгновенно:** убрать/сократить `I18N_LOCALES` в env Cloudflare Pages → пересборка →
   locale-страницы и hreflang исчезают, английский в исходном виде. (Главный предохранитель.)
2. **Код:** `git revert` коммита фазы (ветка, не main, до мёржа — просто не мёржить).
3. **Данные:** таблицы переводов additive и read-only для прода — можно оставить пустыми/полными
   без эффекта; при желании дропнуть отдельной миграцией.

## Cost guardrails

- Скрипт: dry-run по умолчанию, печать оценки (символы × тариф GPT-4o-mini), реальные вызовы
  только с `--confirm`; `--limit` для батчей; идемпотентность (не переводит дважды).
- Ориентир бэкфилла: ~$5-15 на язык на ~4000 страниц. Если оценка сильно выше — остановиться,
  перепроверить (вероятно дубли/слишком большой body) и спросить пользователя.

## Definition of Done (вся задача)

- `/es/`, `/zh/`, `/fr/` индексируются, hreflang симметричен, sitemap с alternates.
- Английская версия: URL, контент, canonical — без изменений (golden diff подтверждает).
- Новые статьи автоматически переводятся на активные локали, фейл перевода не ломает англ.
- GSC: рост проиндексированных локализованных страниц, без всплеска ошибок/«scaled content».
