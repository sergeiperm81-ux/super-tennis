# SUPER.TENNIS — TODO

Последнее обновление: 10 апреля 2026

---

## Критично (блокеры)

- [ ] **TikTok API** — ждём одобрения приложения. После: написать `publish-tiktok.js`, добавить в `daily-run.js`
- [ ] **YouTube 3x/день** — Advanced Features открываются ~17 апреля. Переключить cron на `'0 7,13,19 * * *'` в `content-factory.yml`

---

## Контент

- [x] **Расширить базу статей** — выполнено: gear 60, lifestyle 100, vs 79, records 49, tournaments 24 (все цели перевыполнены)
- [x] **Актуализация AI-контента** — исправлены "as of 2023" → "as of 2026", Davis Cup, Djokovic $200M+
- [ ] **Internal linking** — усилить перелинковку между разделами (interlinks.ts уже работает, но можно добавить больше паттернов)
- [ ] **Мультиязычность (RU)** — только после EN версии. Отдельный хостинг (CF заблокирован в РФ)

---

## Видеопубликации

- [ ] **TikTok publish script** — `content-factory/src/publish-tiktok.js` (после одобрения API)
- [ ] **Instagram Reels** — после создания аккаунта (те же видео что и YouTube)
- [x] **bg-history.json** — персистируется через GitHub Actions cache

---

## Производительность

- [x] **Оптимизация изображений** — 203 JPEG → WebP, 15.4MB → 13.5MB; stub-файлы удалены
- [x] **OG images** — 9 PNG сжаты: 1069KB → 150KB (-86%)
- [x] **Условная загрузка CSS** — `dynamic-content.css` только на 5 страницах с динамикой
- [x] **Font subsetting** — `&subset=latin` для Inter и Oswald
- [ ] **CSS дедупликация** — LiteYouTube стили дублируются в компоненте и в global CSS
- [ ] **srcset** — добавить responsive sizes для article card изображений

---

## Безопасность

- [x] Auth на `/trigger/*`, `/api/publications`, `/api/analytics`, `/api/brief`
- [x] XSS sanitization в `dynamic-content.js`
- [x] Rate limiting на auth endpoints — KV-based, 15 попыток / 15 мин / IP
- [x] Supabase RLS — проверено, public SELECT policies настроены на всех таблицах
- [ ] **Убрать `unsafe-inline` из CSP** — перенести inline скрипты в external файлы (сложно, низкий приоритет)

---

## SEO и аналитика

- [x] Google Search Console — подключён
- [x] Microsoft Clarity — подключён
- [x] 301 redirects — `/players/[slug]/(stats|grand-slams|...)` → `/players/[slug]/` (в `_redirects` с 2 апреля)
- [x] Все внутренние ссылки исправлены на канонические (10 апреля)
- [x] Structured Data — publisher.logo добавлен, @type исправлены (SportsEvent, Product)
- [ ] **Google Rich Results Test** — проверить вручную несколько страниц через search.google.com/rich-results
- [ ] **Мониторинг GSC** — данные по запросам появятся через 2-4 недели после индексации

---

## Инфраструктура

- [x] **Worker мониторинг** — Telegram алерты при падении cron (news, videos, article, brief, rankings)
- [x] **GitHub Actions notifications** — Telegram при failed workflows (deploy, weekly-rankings, enrich-boost, content-factory)
- [x] **Backup** — `backup-supabase.yml`: каждое воскресенье, 4 таблицы, 90 дней retention
- [x] **Lighthouse CI** — `.github/workflows/lighthouse-ci.yml`: запускается после деплоя, 5 страниц, Telegram-отчёт
- [ ] **Staging environment** — отдельный CF Pages preview для тестирования (низкий приоритет)

---

## Дизайн и UX

- [ ] **Мобильная версия** — протестировать на реальных устройствах
- [ ] **Улучшить главную** — hero section, engaging контент above the fold
- [ ] **Dark mode** — низкий приоритет

---

## Таймлайн

| Период | Фокус |
|--------|-------|
| Апрель 2026 | YouTube 3x/день (17 апр), TikTok, мониторинг GSC |
| Май 2026 | RU версия, Instagram, расширение контента |
