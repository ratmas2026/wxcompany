// XSS sanitizer — DOMPurify + jsdom wrapper
const createDOMPurify = require('dompurify')
const { JSDOM } = require('jsdom')

// Singleton: create JSDOM window once and reuse it
const window = new JSDOM('').window
const DOMPurify = createDOMPurify(window)

/**
 * Sanitize HTML string against XSS attacks.
 * Strips <script>, on* event handlers, javascript: protocol, etc.
 *
 * @param {string} html - Raw HTML string
 * @returns {string} Cleaned HTML string
 */
function sanitize(html) {
  if (!html || typeof html !== 'string') return ''
  return DOMPurify.sanitize(html, {
    // Tags allowed in card templates
    ALLOWED_TAGS: [
      'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'img', 'a', 'br', 'hr',
      'table', 'thead', 'tbody', 'tr', 'td', 'th', 'caption',
      'ul', 'ol', 'li',
      'b', 'strong', 'i', 'em', 'u', 's', 'sub', 'sup',
      'pre', 'code', 'blockquote',
      'section', 'header', 'footer', 'main', 'article', 'nav',
      'style',
      // SVG safe elements for icons/logos
      'svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'g', 'defs', 'clipPath'
    ],
    // Attributes allowed on elements
    ALLOWED_ATTR: [
      'class', 'id', 'style',
      'src', 'alt', 'width', 'height',
      'href', 'target', 'rel',
      'border', 'cellpadding', 'cellspacing', 'colspan', 'rowspan',
      // SVG attributes
      'viewBox', 'xmlns', 'd', 'cx', 'cy', 'r', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
      'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
      'transform', 'opacity'
    ],
    // Disallow data-* attributes (potential XSS vector)
    ALLOW_DATA_ATTR: false,
    // Explicitly forbid dangerous tags (defense-in-depth, DOMPurify strips these by default)
    FORBID_TAGS: [
      'script', 'noscript',
      'iframe', 'object', 'embed', 'applet',
      'form', 'input', 'button', 'select', 'option', 'textarea',
      'link', 'meta', 'base',
      'audio', 'video', 'source', 'track'
    ],
    // Explicitly forbid event handler attributes
    FORBID_ATTR: [
      'onerror', 'onload', 'onclick', 'ondblclick',
      'onmouseover', 'onmouseout', 'onmousedown', 'onmouseup', 'onmousemove',
      'onfocus', 'onblur', 'onchange', 'oninput', 'onsubmit', 'onreset',
      'onkeydown', 'onkeyup', 'onkeypress',
      'onscroll', 'onresize',
      'ontouchstart', 'ontouchend', 'ontouchmove',
      'onpointerdown', 'onpointerup', 'onpointermove'
    ],
    // Preserve text content inside forbidden tags (strip only the tag)
    KEEP_CONTENT: true,
    // Allow safe URL protocols only
    ALLOWED_URI_REGEXP: /^(?:(?:https?|data):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i
  })
}

module.exports = { sanitize }
