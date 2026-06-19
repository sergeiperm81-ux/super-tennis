/**
 * Строгая схема page_translations.fields_json (Phase 1, версия 1).
 *
 * Намеренно `.mjs`, а не `.ts`: единый источник правды, импортируемый И из Astro-сборки
 * (TS-роуты), И из node-скрипта перевода (`scripts/i18n/translate-content.mjs`). Node не
 * умеет импортировать `.ts` без лоадера, поэтому схема живёт в JS + zod, а TS-типы выводятся
 * через `z.infer` в `src/lib/i18n.ts`.
 *
 * Правило целостности: набор и ПОРЯДОК блоков перевода обязан соответствовать английскому
 * источнику (faqs.length / bodyBlocks.length совпадают) — это проверяет вызывающий код,
 * схема же гарантирует форму и отсутствие лишних ключей (.strict()).
 */
import { z } from 'zod';

export const PAGE_SCHEMA_VERSION = 1;

export const FaqV1 = z
  .object({ q: z.string().min(1), a: z.string().min(1) })
  .strict();

export const PageTranslationV1Schema = z
  .object({
    title: z.string().min(1), // <title> / h1-tier
    h1: z.string().min(1),
    metaDescription: z.string().min(1),
    quickAnswer: z.string().optional(), // лид Quick Answer (если у страницы есть)
    faqs: z.array(FaqV1).optional(), // порядок и длина = EN-источнику
    bodyBlocks: z.array(z.string()).optional(), // HTML-блоки тела по порядку; длина = EN
  })
  .strict();

/**
 * Валидирует объект полей перевода страницы.
 * @param {unknown} data
 * @returns {{ ok: true, value: import('zod').infer<typeof PageTranslationV1Schema> } | { ok: false, error: string }}
 */
export function validatePageFields(data) {
  const result = PageTranslationV1Schema.safeParse(data);
  if (result.success) return { ok: true, value: result.data };
  const error = result.error.issues
    .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('; ');
  return { ok: false, error };
}
