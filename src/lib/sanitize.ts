/**
 * HTML sanitization utility for LLM-generated content.
 * Applied before set:html to prevent XSS from malicious database content.
 */
import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = [
  ...sanitizeHtml.defaults.allowedTags,
  'img', 'figure', 'figcaption', 'picture', 'source',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'details', 'summary',
  'mark', 'del', 'ins',
];

const ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions['allowedAttributes'] = {
  ...sanitizeHtml.defaults.allowedAttributes,
  a: ['href', 'name', 'target', 'rel', 'class'],
  img: ['src', 'alt', 'width', 'height', 'loading', 'class'],
  '*': ['class', 'id'],
};

export function sanitizeArticleHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ['https', 'http', 'mailto'],
    disallowedTagsMode: 'discard',
  });
}
