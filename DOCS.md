# SUPER.TENNIS — Техническая документация

Последнее обновление: 23 марта 2026

---

## Обзор

Теннисный портал **super.tennis** — "теннис для тех, кто НЕ играет в теннис".
Статический сайт на Astro 5 с автоматической генерацией контента через AI.

- **Домен:** super.tennis
- **Хостинг:** Cloudflare Pages (проект `supertennis`)
- **База данных:** Supabase (PostgreSQL)
- **AI:** OpenAI gpt-4o-mini
- **Видео:** YouTube Shorts + TikTok (в процессе)
- **Аналитика:** Cloudflare Web Analytics + Google Search Console

---

## Архитектура

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Cloudflare      │     │  Cloudflare       │     │  GitHub      │
│  Pages (CDN)     │◄────│  Worker (cron)    │────►│  Actions     │
│  super.tennis    │     │  06:00 UTC daily  │     │  CI/CD       │
└────────┬────────┘     └────────┬─────────┘     └──────┬──────┘
         │                       │                       │
         │  статика              │  API + cron            │  билд + деплой
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Браузер         │────►│  Supabase        │     │  YouTube     │
│  dynamic-content │     │  (PostgreSQL)     │     │  TikTok      │
│  .js (fetch)     │     │  news, articles,  │     │  (публикация)│
│                  │     │  players, rankings│     │              │
└─────────────────┘     └──────────────────┘     └─────────────┘
```

### Что статическое (SSG), что динамическое

| Контент | Тип | Обновление |
|---------|-----|------------|
| Игроки, статьи, турниры, рекорды | SSG (HTML) | При ребилде (еженедельно) |
| Рейтинги ATP/WTA | SSG (HTML) | Ежемесячно (1-го числа) |
| Новости | Динамика (JS fetch) | Ежедневно, без ребилда |
| Видео на сайте | Динамика (JS fetch) | Каждые 3 дня, без ребилда |

---

## Структура файлов

```
super-tennis/
├── src/
│   ├── pages/           # Astro страницы (23 шаблона → 1942 HTML)
│   │   ├── index.astro  # Главная
│   │   ├── players/     # 200 игроков + net-worth + racket
│   │   ├── rankings/    # ATP + WTA таблицы
│   │   ├── records/     # 23 статьи о рекордах
│   │   ├── vs/          # 25 rivalry статей
│   │   ├── gear/        # 22 статьи об экипировке
│   │   ├── lifestyle/   # 18 статей
│   │   ├── tournaments/ # 12 гайдов
│   │   ├── calendar/    # Расписание 2026
│   │   ├── news/        # Динамические новости
│   │   ├── video/       # Видео (YouTube embeds)
│   │   ├── stats/       # Аналитика (закрытый, с паролем)
│   │   ├── terms.astro  # Условия использования
│   │   └── privacy.astro # Политика конфиденциальности
│   ├── components/      # Header, Footer, ArticleLayout, etc.
│   ├── layouts/         # BaseLayout.astro (общий шаблон)
│   ├── lib/             # supabase.ts, interlinks.ts
│   └── data/            # youtube-channels.ts, статические данные
├── public/
│   ├── js/dynamic-content.js  # Клиентский fetch новостей/видео
│   ├── css/dynamic-content.css
│   ├── images/          # Статические картинки
│   └── _headers         # Security headers (CSP, HSTS, etc.)
├── workers/
│   └── content-cron/    # Cloudflare Worker
│       └── src/index.ts # Cron + API (1300+ строк)
├── content-factory/     # Генерация YouTube Shorts
│   └── src/
│       ├── daily-run.js      # Точка входа (cron)
│       ├── fetch-headlines.js # Сбор заголовков из Supabase
│       ├── generate-video.js  # FFmpeg генерация видео
│       └── publish-youtube.js # Публикация на YouTube
├── scripts/             # Одноразовые скрипты импорта
├── .github/workflows/   # CI/CD
└── dist/                # Сбилженный сайт (1942 HTML)
```

---

## Секреты и переменные окружения

### Локальный `.env` (корень проекта)

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_KEY=eyJhbG...   # НИКОГДА не коммитить!
OPENAI_API_KEY=sk-proj-...       # НИКОГДА не коммитить!
```

### Cloudflare Worker secrets

Устанавливаются через `wrangler secret put НАЗВАНИЕ`:

| Секрет | Описание |
|--------|----------|
| SUPABASE_URL | URL Supabase проекта |
| SUPABASE_SERVICE_KEY | Service role ключ (обходит RLS) |
| OPENAI_API_KEY | Ключ OpenAI для генерации контента |
| GITHUB_TOKEN | GitHub PAT для trigger rebuild |
| ANALYTICS_PASSWORD | Пароль для /stats/ дашборда и /api/analytics |
| CF_API_TOKEN | Cloudflare API token для аналитики |
| CF_ZONE_ID | Zone ID домена super.tennis |
| TRIGGER_SECRET | Секрет для /trigger/* эндпоинтов |

### GitHub Actions secrets

| Секрет | Описание |
|--------|----------|
| SUPABASE_URL | URL Supabase проекта |
| SUPABASE_SERVICE_KEY | Service role ключ |
| CLOUDFLARE_API_TOKEN | Для деплоя на CF Pages |
| CLOUDFLARE_ACCOUNT_ID | Account ID Cloudflare |
| YOUTUBE_CLIENT_ID | OAuth client ID |
| YOUTUBE_CLIENT_SECRET | OAuth client secret |
| YOUTUBE_REFRESH_TOKEN | Offline access token |

### Где ротировать секреты

| Секрет | Где менять |
|--------|-----------|
| SUPABASE_SERVICE_KEY | Supabase Dashboard → Settings → API |
| OPENAI_API_KEY | platform.openai.com → API Keys |
| YOUTUBE_REFRESH_TOKEN | `cd content-factory && npm run auth:youtube` |
| CF_API_TOKEN | Cloudflare Dashboard → My Profile → API Tokens |
| GITHUB_TOKEN | GitHub → Settings → Developer settings → PAT |

---

## API эндпоинты (Worker)

**Базовый URL:** `https://supertennis-cron.sfedoroff.workers.dev`

### Публичные (без аутентификации)

| Эндпоинт | Описание | Кэш |
|-----------|----------|------|
| `GET /api/news?limit=20` | Активные новости | 5 мин |
| `GET /api/videos` | 6 видео (ротация по категориям) | 1 час |

### Защищённые (header `Authorization: Bearer <пароль>`)

| Эндпоинт | Описание |
|-----------|----------|
| `GET /api/analytics?period=7d` | Аналитика сайта (визиты, страны) |
| `GET /api/publications?limit=50` | Статус видеопубликаций |

### Триггеры (header `X-Trigger-Secret: <секрет>`)

| Эндпоинт | Описание |
|-----------|----------|
| `GET /trigger/news` | Сгенерировать 25 новостей |
| `GET /trigger/videos` | Обновить YouTube видео в БД |
| `GET /trigger/article` | Сгенерировать статью + ребилд |
| `GET /trigger/rankings` | Обновить рейтинги + ребилд |
| `GET /trigger/all` | Новости + видео (без ребилда) |

---

## Расписание автоматизации

| Что | Когда | Где | Ребилд? |
|-----|-------|-----|---------|
| Генерация новостей | Ежедневно 06:00 UTC | CF Worker cron | Нет |
| Обновление видео в БД | Каждые 3 дня | CF Worker cron | Нет |
| Еженедельная статья | Понедельник | CF Worker cron | Да |
| Обновление рейтингов | 1-е число месяца | CF Worker cron | Да |
| YouTube Shorts | Ежедневно 07:00 UTC | GitHub Actions | Нет |
| Деплой на CF Pages | При пуше в main | GitHub Actions | — |

---

## Supabase таблицы

| Таблица | Записей | Описание |
|---------|---------|----------|
| players | 200 | Профили игроков |
| rankings | ~400 | ATP/WTA рейтинги (top 100 каждый) |
| articles | 260+ | Статьи всех разделов |
| news | ~25 активных | Ежедневные новости (is_active flag) |
| youtube_videos | ~225 | Видео с 15 YouTube каналов |
| video_publications | растёт | Лог публикаций видео (YT + TT статус) |
| tournaments | 12 | Данные турниров |

---

## Деплой

### Автоматический (при пуше в main)

```bash
git push origin main
# → GitHub Actions: build → deploy to Cloudflare Pages
```

### Ручной

```bash
# Билд сайта
npm run build

# Деплой на Cloudflare Pages
npx wrangler pages deploy dist --project-name supertennis

# Деплой Worker (после изменений в workers/content-cron/)
cd workers/content-cron
npx wrangler deploy
```

### Добавить секрет в Worker

```bash
cd workers/content-cron
echo "значение" | npx wrangler secret put НАЗВАНИЕ_СЕКРЕТА
npx wrangler deploy
```

---

## Устранение неполадок

### Новости не появляются на сайте

1. Проверить Worker: `curl https://supertennis-cron.sfedoroff.workers.dev/api/news`
2. Если пусто — триггер вручную (см. API эндпоинты)
3. Проверить в Supabase: таблица `news`, поле `is_active = true`
4. Логи Worker: Cloudflare Dashboard → Workers → content-cron → Logs

### Видео не публикуется на YouTube

1. GitHub Actions → вкладка Actions → Content Factory → посмотреть лог
2. `uploadLimitExceeded` — лимит YouTube (1 видео/день для нового канала, до середины апреля)
3. `Invalid credentials` — протухший refresh token:
   ```bash
   cd content-factory && npm run auth:youtube
   # Обновить YOUTUBE_REFRESH_TOKEN в GitHub Secrets
   ```
4. Проверить запись: Supabase → таблица `video_publications`

### Сайт не обновляется после пуша

1. GitHub Actions → вкладка Actions → Deploy → посмотреть ошибку
2. Очистить кэш: Cloudflare Dashboard → Caching → Purge Everything

### Рейтинги устарели

Обновляются автоматически 1-го числа. Ручной триггер: `/trigger/rankings`

### /stats/ дашборд не грузится

1. Пароль должен совпадать с Worker secret `ANALYTICS_PASSWORD`
2. Нужны `CF_API_TOKEN` и `CF_ZONE_ID` в Worker secrets
3. Данные появляются через 24-48 часов после подключения CF Web Analytics

---

## Текущие ограничения

| Ограничение | Причина | Когда снимется |
|-------------|---------|----------------|
| YouTube: 1 видео/день | Новый канал (<30 дней) | ~Середина апреля 2026 |
| TikTok: не публикуем | Приложение на ревью | 1-3 рабочих дня |
| Supabase RLS | articles видны только через service key | Нужно настроить RLS policies |
| Нет Instagram | Аккаунт не создан | Когда решим |

---

## Внешние сервисы

| Сервис | Назначение | Панель управления |
|--------|------------|-------------------|
| Cloudflare Pages | Хостинг сайта | dash.cloudflare.com |
| Cloudflare Workers | Cron + API | dash.cloudflare.com → Workers |
| Cloudflare Web Analytics | Метрика посещений | dash.cloudflare.com → Analytics |
| Supabase | База данных | supabase.com/dashboard |
| OpenAI | Генерация контента (gpt-4o-mini) | platform.openai.com |
| YouTube Studio | Управление каналом | studio.youtube.com |
| TikTok Developer | API приложение | developers.tiktok.com |
| GitHub Actions | CI/CD пайплайн | github.com → Actions |
| Google Search Console | SEO аналитика | search.google.com/search-console |

---

## Соцсети

| Платформа | Аккаунт | Статус |
|-----------|---------|--------|
| YouTube | @SuperTennisNews | Активен, автопубликация |
| TikTok | @supertennisnews | Ждём одобрения API |
| Instagram | — | Не создан |
