/**
 * HTML sanitization utility for LLM-generated content.
 * Applied before set:html to prevent XSS from malicious database content.
 *
 * The implementation lives in ./sanitize-core.mjs so the node i18n translation script can
 * share the exact same config (it cannot import a .ts file). This wrapper keeps the existing
 * import path (`./sanitize`) stable for all current consumers (e.g. lib/interlinks.ts).
 */
export { sanitizeArticleHtml } from './sanitize-core.mjs';
