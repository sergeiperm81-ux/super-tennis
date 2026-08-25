/**
 * i18n core — locale helpers + build-time чтение переводов (Phase 1, флаг OFF по умолчанию).
 *
 * HARD INVARIANTS (см. docs/I18N_IMPLEMENTATION_PLAN.md):
 *  - Английский ВСЕГДА на корне: localePrefix('en') === ''.
 *  - Пустой I18N_LOCALES → getActiveLocales() === [] → сайт строго как сейчас (golden diff чист).
 *  - Нет перевода → null → роут не строит locale-страницу (билд не падает).
 *
 * Чтение переводов — только build-time (service key через ./supabase). На Phase 1 не вызывается
 * (locale-роутов ещё нет); живёт готовым к Phase 2.
 */
import { supabase } from './supabase';
import { validatePageFields } from './i18n-schema.mjs';

export type Locale = 'en' | 'es' | 'fr' | 'zh';
export const DEFAULT_LOCALE: Locale = 'en';

/** Локали, которые МОГУТ быть активированы (кроме дефолтной en). */
const ACTIVATABLE: Locale[] = ['es', 'fr', 'zh'];
/** RETIRED 2026-08-25: сайт снова чисто английский.
 *  Испанская версия проработала несколько месяцев и дала 63 органические сессии
 *  за 90 дней (1.7% живого трафика) при ~1 287 страницах — почти половина сайта
 *  ради 0.05 сессии на страницу. Её 5 265 просмотров в GA4 были на 97% ботами
 *  (5 119 Direct со средней сессией 8 секунд против 63 из поиска).
 *  Пустой список = /es/ не собирается, hreflang-альтернативы не выводятся,
 *  переключатель языка в шапке скрыт (showSwitcher требует >1 локали).
 *  Переводы в Supabase НЕ удалены — вернуть можно этим же списком.
 *  Override через I18N_LOCALES (CSV) по-прежнему работает. */
const SHIPPED_DEFAULT: Locale[] = [];

const OG_LOCALE: Record<Locale, string> = {
  en: 'en_US',
  es: 'es_ES',
  fr: 'fr_FR',
  zh: 'zh_CN',
};

const HREFLANG: Record<Locale, string> = {
  en: 'en',
  es: 'es',
  fr: 'fr',
  zh: 'zh-Hans',
};

/** Читает env-переменную. На SSG-сборке не-PUBLIC переменные доступны через import.meta.env
 *  (как SUPABASE_* в ./supabase); в node-контексте — через process.env. */
function readEnv(key: string): string {
  const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const fromVite = viteEnv?.[key];
  if (typeof fromVite === 'string') return fromVite;
  if (typeof process !== 'undefined' && typeof process.env?.[key] === 'string') {
    return process.env[key] as string;
  }
  return '';
}

let _activeCache: Locale[] | null = null;

/** Активные локали. Не задано I18N_LOCALES → shipped-дефолт (es). I18N_LOCALES=none|off → [].
 *  Иначе — CSV из I18N_LOCALES, пересечённый с ACTIVATABLE. */
export function getActiveLocales(): Locale[] {
  if (_activeCache) return _activeCache;
  const raw = readEnv('I18N_LOCALES').trim().toLowerCase();
  if (raw === '') {
    _activeCache = [...SHIPPED_DEFAULT];
    return _activeCache;
  }
  if (raw === 'none' || raw === 'off') {
    _activeCache = [];
    return _activeCache;
  }
  const requested = new Set(raw.split(',').map((s) => s.trim()).filter(Boolean));
  _activeCache = ACTIVATABLE.filter((l) => requested.has(l));
  return _activeCache;
}

/** true для en (всегда валиден как дефолт) и для активных локалей. */
export function isActiveLocale(x: string): x is Locale {
  return x === 'en' || (getActiveLocales() as string[]).includes(x);
}

/** Префикс пути: en → '' (корень!), иначе '/es' и т.п. */
export function localePrefix(locale: Locale): string {
  return locale === 'en' ? '' : `/${locale}`;
}

/** Локализованный путь: ('es','/rules/x/') → '/es/rules/x/'; ('en', p) → p без изменений. */
export function localizedPath(locale: Locale, path: string): string {
  if (locale === 'en') return path;
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${localePrefix(locale)}${clean}`;
}

/** og:locale (en_US / es_ES / fr_FR / zh_CN). */
export function ogLocale(locale: Locale): string {
  return OG_LOCALE[locale] ?? OG_LOCALE.en;
}

/** hreflang BCP-47 (en / es / fr / zh-Hans). */
export function hreflang(locale: Locale): string {
  return HREFLANG[locale] ?? HREFLANG.en;
}

export interface Alternate {
  hreflang: string;
  /** Путь (относительный). Layout резолвит в абсолютный через new URL(path, Astro.site). */
  href: string;
}

/**
 * Alternates для страницы по РЕАЛЬНО доступным переводам. Всегда включает en + x-default=en.
 * Если переводов нет (available=[]) → только en + x-default = текущий вывод BaseLayout
 * (golden diff чист).
 * @param enPath канонический английский путь страницы (напр. '/rules/x/').
 * @param available локали, для которых перевод этой страницы реально существует.
 */
export function buildAlternates(enPath: string, available: Locale[]): Alternate[] {
  // `available` is hard-coded as ['es'] by ~20 evergreen pages, so it cannot be
  // trusted on its own: after the Spanish edition was retired those calls would
  // still advertise hreflang="es" pointing at URLs that now 301 away, and
  // BaseLayout would keep showing the language switcher (it derives its options
  // from this list). Intersecting with the active locales here disables both
  // from one place and keeps the hard-coded callers harmless.
  const active = getActiveLocales();
  const list: Alternate[] = [{ hreflang: hreflang('en'), href: enPath }];
  for (const loc of available) {
    if (loc === 'en') continue;
    if (!active.includes(loc)) continue;
    list.push({ hreflang: hreflang(loc), href: localizedPath(loc, enPath) });
  }
  list.push({ hreflang: 'x-default', href: enPath });
  return list;
}

// ============================================================
// BUILD-TIME чтение переводов (service key). null → страница на локали не строится.
// ============================================================

export interface ArticleTranslation {
  article_id: number;
  lang: Locale;
  title: string | null;
  excerpt: string | null;
  body: string | null;
  meta_title: string | null;
  meta_description: string | null;
  image_alt: string | null;
  status: string;
}

export interface PlayerTranslation {
  player_id: string;
  lang: Locale;
  bio_short: string | null;
  meta_title: string | null;
  meta_description: string | null;
  status: string;
}

export interface PageTranslationFields {
  title: string;
  h1: string;
  metaDescription: string;
  quickAnswer?: string;
  faqs?: { q: string; a: string }[];
  bodyBlocks?: string[];
}

/** Перевод статической страницы (page_translations). Невалидный fields_json → null + warn. */
export async function getPageTranslation(
  pageKey: string,
  locale: Locale,
): Promise<PageTranslationFields | null> {
  if (locale === 'en') return null;
  const { data, error } = await supabase
    .from('page_translations')
    .select('fields_json')
    .eq('page_key', pageKey)
    .eq('lang', locale)
    .eq('status', 'published')
    .maybeSingle();
  if (error || !data) return null;
  const validated = validatePageFields(data.fields_json);
  if (!validated.ok) {
    console.warn(`[i18n] invalid page_translations ${pageKey}/${locale}: ${validated.error}`);
    return null;
  }
  return validated.value as PageTranslationFields;
}

export async function getArticleTranslation(
  articleId: number,
  locale: Locale,
): Promise<ArticleTranslation | null> {
  if (locale === 'en') return null;
  const { data, error } = await supabase
    .from('article_translations')
    .select('article_id, lang, title, excerpt, body, meta_title, meta_description, image_alt, status')
    .eq('article_id', articleId)
    .eq('lang', locale)
    .eq('status', 'published')
    .maybeSingle();
  if (error || !data) return null;
  return data as ArticleTranslation;
}

/**
 * Build-time alternates for an English evergreen page: en + any PUBLISHED locale translations
 * of the same page_key. Returns [] when no active locales or no translations exist → the English
 * page renders its current static en+x-default hreflang (golden diff clean when flag OFF).
 * The ONLY sanctioned English-output change in the pilot (added hreflang) — see
 * scripts/i18n/allowed-english-diff.json.
 */
export async function getPageAlternates(pageKey: string, enPath: string): Promise<Alternate[]> {
  const active = getActiveLocales();
  if (active.length === 0) return [];
  const { data, error } = await supabase
    .from('page_translations')
    .select('lang')
    .eq('page_key', pageKey)
    .eq('status', 'published')
    .in('lang', active as string[]);
  if (error || !data || data.length === 0) return [];
  const avail = data.map((r) => r.lang as Locale);
  return buildAlternates(enPath, avail);
}

/** Alternates for an English article page: en + any published locale translations of it.
 *  [] when no active locales / no translations → English output unchanged. */
export async function getArticleAlternates(articleId: number, enPath: string): Promise<Alternate[]> {
  const active = getActiveLocales();
  if (active.length === 0) return [];
  const { data, error } = await supabase
    .from('article_translations')
    .select('lang')
    .eq('article_id', articleId)
    .eq('status', 'published')
    .in('lang', active as string[]);
  if (error || !data || data.length === 0) return [];
  return buildAlternates(enPath, data.map((r) => r.lang as Locale));
}

export async function getPlayerTranslation(
  playerId: string,
  locale: Locale,
): Promise<PlayerTranslation | null> {
  if (locale === 'en') return null;
  const { data, error } = await supabase
    .from('player_translations')
    .select('player_id, lang, bio_short, meta_title, meta_description, status')
    .eq('player_id', playerId)
    .eq('lang', locale)
    .eq('status', 'published')
    .maybeSingle();
  if (error || !data) return null;
  return data as PlayerTranslation;
}
