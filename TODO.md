# SUPER.TENNIS — TODO

Последнее обновление: 23 марта 2026

---

## Критично (блокеры)

- [ ] **TikTok API** — ждём одобрения приложения (повторная подача). После одобрения: написать `publish-tiktok.js`, добавить в `daily-run.js`
- [ ] **YouTube Advanced Features** — канал создан 17 марта, ограничение снимется ~17 апреля. После: переключить на 3 видео/день в GitHub Actions (`cron: '0 7,13,19 * * *'`)
- [ ] **Supabase RLS** — таблица `articles` доступна только через service key. Нужно добавить RLS policy для анонимного чтения published статей

---

## Контент (новые разделы и статьи)

- [ ] **Расширить базу статей** — сейчас 260, контракт на 260 страниц выполнен, но можно больше:
  - [ ] Больше lifestyle статей (18 → 30+)
  - [ ] Больше gear reviews (22 → 35+)
  - [ ] Больше H2H/versus (25 → 40+)
  - [ ] Больше tournament guides (12 → 20+)
- [ ] **Актуализация AI-контента** — некоторые статьи ссылаются на "October 2023", нужна регенерация с актуальными датами
- [ ] **Live Scores** — решено НЕ делать, но если инвестор попросит — рассмотреть виджет от стороннего API
- [ ] **Мультиязычность (RU)** — только после запуска EN версии. Отдельный хостинг (CF заблокирован в РФ)

---

## Видеопубликации

- [ ] **TikTok publish script** — `content-factory/src/publish-tiktok.js` (после одобрения API)
- [ ] **Улучшить видео** — протестировать разные фоны, шрифты, длительность
- [ ] **Персистентное состояние** — `bg-history.json` и `published-log.json` теряются между GitHub Actions запусками. Перенести в Supabase или использовать `actions/cache`
- [ ] **Instagram Reels** — когда будет аккаунт, добавить публикацию (те же видео)

---

## Производительность

- [ ] **Оптимизация изображений** — 17 МБ в dist/images/, средний размер 255 КБ. Нужно:
  - [ ] Конвертировать в WebP (с JPG fallback)
  - [ ] Сжать до <100 КБ каждое
  - [ ] Добавить `srcset` для responsive размеров
- [ ] **OG images** — 9 PNG × 122 КБ = 1.1 МБ. Перегенерировать в WebP (~50 КБ каждый)
- [ ] **CSS дедупликация** — Lite YouTube стили дублируются в компоненте и в global CSS
- [ ] **Условная загрузка CSS** — `dynamic-content.css` (9.7 КБ) грузится на всех страницах, нужен только на /news/ и /video/
- [ ] **Font subsetting** — подключить только Latin subset для Inter и Oswald

---

## Безопасность (после аудита)

- [x] Auth на `/trigger/*` и `/api/publications`
- [x] XSS sanitization в `dynamic-content.js`
- [x] Password через Authorization header (не в URL)
- [x] CORS: убран localhost
- [x] CSP: добавлен cloudflareinsights.com
- [x] `.gitignore`: добавлен `**/.env`
- [x] `vite.define`: убран SUPABASE_SERVICE_KEY
- [x] HTML escaping в stats dashboard
- [ ] **Убрать `unsafe-inline` из CSP** — перенести inline скрипты в external файлы
- [ ] **Rate limiting** на /api/analytics — сейчас без ограничений
- [ ] **Supabase RLS policies** — настроить для всех таблиц

---

## SEO и аналитика

- [x] Google Search Console — подключен, индексация запущена
- [x] Cloudflare Web Analytics — beacon на каждой странице
- [ ] **Мониторинг GSC** — через 2-3 недели начнут поступать данные по запросам
- [ ] **Sitemap** — проверить что все 1942 страницы в sitemap-index.xml
- [ ] **Structured Data** — проверить JSON-LD на всех типах страниц через Google Rich Results Test
- [ ] **Internal linking** — усилить перелинковку между разделами

---

## Инфраструктура

- [ ] **Worker мониторинг** — настроить алерты если cron падает (Cloudflare Notifications)
- [ ] **GitHub Actions notifications** — уведомления при failed workflows
- [ ] **Backup** — периодический экспорт Supabase данных
- [ ] **Staging environment** — отдельный CF Pages preview для тестирования
- [ ] **Lighthouse CI** — автоматическая проверка производительности при деплое

---

## Дизайн и UX

- [ ] **Мобильная версия** — протестировать на реальных устройствах
- [ ] **Dark mode** — при желании (низкий приоритет)
- [ ] **Улучшить главную** — hero section, более engaging контент above the fold
- [ ] **Newsletter подписка** — если инвестор решит

---

## Таймлайн

| Период | Фокус |
|--------|-------|
| Март 2026 (сейчас) | Запуск, автоматизация, видео, аналитика |
| Апрель 2026 | YouTube 3x/день, TikTok, оптимизация изображений, SEO |
| Май 2026 | Расширение контента, мультиязычность (RU), Instagram |
