// XSS sanitizer — DOMPurify + jsdom wrapper (ESM-loaded for compat)
let DOMPurify = null

async function _init() {
  if (DOMPurify) return
  const [createDOMPurify, { JSDOM }] = await Promise.all([
    import('dompurify').then(m => m.default),
    import('jsdom')
  ])
  const window = new JSDOM('').window
  DOMPurify = createDOMPurify(window)
}
var _initPromise = null
function ensureInit() {
  if (!_initPromise) _initPromise = _init().catch(function() { DOMPurify = null; _initPromise = null })
  return _initPromise
}

/**
 * Sanitize HTML string against XSS attacks.
 * Strips <script>, on* event handlers, javascript: protocol, etc.
 *
 * @param {string} html - Raw HTML string
 * @returns {Promise<string>} Cleaned HTML string
 */
async function sanitize(html) {
  if (!html || typeof html !== 'string') return ''
  await ensureInit()
  if (!DOMPurify) return _fallbackSanitize(html)
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'img', 'a', 'br', 'hr',
      'table', 'thead', 'tbody', 'tr', 'td', 'th', 'caption',
      'ul', 'ol', 'li',
      'b', 'strong', 'i', 'em', 'u', 's', 'sub', 'sup',
      'pre', 'code', 'blockquote',
      'section', 'header', 'footer', 'main', 'article', 'nav',
      'style',
      'svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'g', 'defs', 'clipPath'
    ],
    ALLOWED_ATTR: [
      'class', 'id', 'style',
      'src', 'alt', 'width', 'height',
      'href', 'target', 'rel',
      'border', 'cellpadding', 'cellspacing', 'colspan', 'rowspan',
      'viewBox', 'xmlns', 'd', 'cx', 'cy', 'r', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
      'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
      'transform', 'opacity'
    ],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: [
      'script', 'noscript',
      'iframe', 'object', 'embed', 'applet',
      'form', 'input', 'button', 'select', 'option', 'textarea',
      'link', 'meta', 'base',
      'audio', 'video', 'source', 'track'
    ],
    FORBID_ATTR: [
      'onerror', 'onload', 'onclick', 'ondblclick',
      'onmouseover', 'onmouseout', 'onmousedown', 'onmouseup', 'onmousemove',
      'onfocus', 'onblur', 'onchange', 'oninput', 'onsubmit', 'onreset',
      'onkeydown', 'onkeyup', 'onkeypress',
      'onscroll', 'onresize',
      'ontouchstart', 'ontouchend', 'ontouchmove',
      'onpointerdown', 'onpointerup', 'onpointermove'
    ],
    KEEP_CONTENT: true,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|data):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i
  })
}

// Fallback when DOMPurify/jsdom are unavailable (ESM load failure)
function _fallbackSanitize(html) {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^>]*\/?>/gi, '')
    .replace(/<applet\b[^<]*(?:(?!<\/applet>)<[^<]*)*<\/applet>/gi, '')
    .replace(/\bon\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\bon\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript\s*:/gi, '')
}

module.exports = { sanitize }
