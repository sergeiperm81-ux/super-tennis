/**
 * HTML sanitization core — shared by the Astro build (via src/lib/sanitize.ts re-export)
 * AND the node translation script (scripts/i18n/translate-content.mjs).
 *
 * Lives in `.mjs` so both runtimes import ONE config (node can't import the `.ts` wrapper).
 * Config is byte-identical to the original sanitize.ts — behaviour for the English render
 * path is unchanged (verify via golden diff).
 *
 * Applied before set:html to prevent XSS from LLM-generated / translated database content.
 */
import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = [
  ...sanitizeHtml.defaults.allowedTags,
  'img', 'figure', 'figcaption', 'picture', 'source',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'details', 'summary',
  'mark', 'del', 'ins',
];

const ALLOWED_ATTRIBUTES = {
  ...sanitizeHtml.defaults.allowedAttributes,
  a: ['href', 'name', 'target', 'rel', 'class'],
  img: ['src', 'alt', 'width', 'height', 'loading', 'class'],
  '*': ['class', 'id'],
};

/**
 * @param {string} html
 * @returns {string}
 */
export function sanitizeArticleHtml(html) {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ['https', 'http', 'mailto'],
    disallowedTagsMode: 'discard',
  });
}
