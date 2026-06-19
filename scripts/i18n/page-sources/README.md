# page-sources — английский источник статических evergreen-страниц для перевода

Реестр извлечённых полей статических `.astro`-страниц (`/rules/`, `/money/`, …), чей контент
НЕ лежит в Supabase. `scripts/i18n/translate-content.mjs --type page` берёт отсюда источник,
переводит и пишет в таблицу `page_translations`. Английские `.astro` НЕ меняются.

## Формат файла

Один JSON на страницу. Имя файла: `page_key` с `/` → `__` (напр.
`rules/tennis-scoring-explained` → `rules__tennis-scoring-explained.json`).

```jsonc
{
  "page_key": "rules/tennis-scoring-explained",   // = маршрут без ведущего слэша
  "source_lang": "en",
  "source_astro": "src/pages/rules/...astro",      // провенанс (откуда извлечено)
  "fields": {                                       // строго схема PageTranslationV1 (i18n-schema.mjs)
    "title": "...",            // <title>
    "h1": "...",
    "metaDescription": "...",
    "quickAnswer": "...",      // опц.
    "faqs": [{ "q": "...", "a": "..." }],   // опц.; порядок/кол-во сохраняются при переводе
    "bodyBlocks": ["<h2 ...>...</h2>", "<p>...</p>", "<ul>...</ul>"]  // опц.
  }
}
```

## Конвенции извлечения (важно)

- **`bodyBlocks`** = упорядоченные верхнеуровневые HTML-блоки из `.article-body`
  (`<h2>`, `<p>`, `<ul>`, `<ol>`, `<table>`). Inline-разметка (`<strong>`, `<em>`, `<a>`)
  сохраняется. `id`-якоря у `<h2>` оставляем как есть (не видимы, GPT их не переводит).
- **Data-таблицы** (напр. `formatRows.map(...)` в how-many-sets) **«замораживаются»** в один
  статический `<table>`-блок: структура фиксируется, переводится только текст ячеек. Locale-страница
  не регенерит таблицу из JS-массива — для evergreen это норма.
- **НЕ извлекаем (это chrome роута, не контент):** breadcrumbs, hero-эмодзи, byline
  («By … · Updated …»), блок «Continue Reading» (related-context), заголовок FaqBlock.
  Их рендерит locale-роут/UI-словарь (работа Phase 2), а не перевод страницы.
- **Внутренние ссылки** в `bodyBlocks` пока ведут на английские пути (`/rules/...`). Locale-aware
  интерлинкинг отложен (NOTES §6, Phase 3-4). Допустимо: целевые страницы существуют на английском.
- **JSON-LD** (Article/BreadcrumbList) locale-роут собирает из переведённых полей, здесь не храним.

## Пилотный набор (Phase 2, Часть A)

`/rules/` + `/money/` — 6 leaf-страниц (хабы `/rules/`, `/money/` — отдельно, позже):
- `rules/tennis-scoring-explained`  ✅ извлечён (эталон)
- `rules/tie-break-rules-explained`
- `rules/how-many-sets-in-tennis`  (содержит data-таблицу → frozen `<table>`-блок)
- `money/tennis-prize-money-explained`
- `money/how-much-tennis-players-earn`
- `money/grand-slam-prize-money-breakdown`
