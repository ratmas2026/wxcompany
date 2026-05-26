// XSS sanitizer — DOMPurify + jsdom wrapper (ESM-loaded for compat)
let DOMPurify = null
let _jsdomWindow = null

// DOMPurify strips src from <script> tags when the URL contains query params.
// Save src before sanitization so we can restore allowed CDN sources after.
var _savedScriptSrc = new WeakMap()

async function _init() {
  if (DOMPurify) return
  if (_jsdomWindow) {
    try { _jsdomWindow.close() } catch (_) {}
    _jsdomWindow = null
  }
  const [createDOMPurify, { JSDOM }] = await Promise.all([
    import('dompurify').then(m => m.default),
    import('jsdom')
  ])
  _jsdomWindow = new JSDOM('').window
  DOMPurify = createDOMPurify(_jsdomWindow)

  // Save script src before DOMPurify strips it
  DOMPurify.addHook('beforeSanitizeElements', function(node) {
    if (node.nodeName === 'SCRIPT' && node.hasAttribute('src')) {
      _savedScriptSrc.set(node, node.getAttribute('src'))
    }
  })

  DOMPurify.addHook('uponSanitizeElement', function(node, data) {
    // Remove inline event handlers (e.g., onclick="...")
    if (node.attributes) {
      for (var i = node.attributes.length - 1; i >= 0; i--) {
        var name = node.attributes[i].name
        if (/^on/i.test(name)) {
          node.removeAttribute(name)
        }
      }
    }
    // Restore external script src for known-safe CDN origins
    if (data.tagName === 'script') {
      var savedSrc = _savedScriptSrc.get(node)
      if (savedSrc) {
        _savedScriptSrc.delete(node)
        // Allow Tailwind CDN (with or without query params)
        if (/^https:\/\/cdn\.tailwindcss\.com/.test(savedSrc)) {
          node.setAttribute('src', savedSrc)
        }
      }
    }
  })
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
      'html', 'head', 'body', 'title', 'script', 'link', 'meta',
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
      'type', 'crossorigin', 'charset', 'content', 'name', 'property', 'media', 'as', 'lang',
      'border', 'cellpadding', 'cellspacing', 'colspan', 'rowspan',
      'viewBox', 'xmlns', 'd', 'cx', 'cy', 'r', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
      'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
      'transform', 'opacity'
    ],
    ALLOW_DATA_ATTR: true,
    FORBID_TAGS: [
      'noscript',
      'iframe', 'object', 'embed', 'applet',
      'form', 'input', 'button', 'select', 'option', 'textarea',
      'base',
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
    WHOLE_DOCUMENT: true,
    KEEP_CONTENT: true,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|data):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i
  })
}

// Fallback when DOMPurify/jsdom are unavailable (ESM load failure)
// Simplified regexes to avoid ReDoS backtracking
function _fallbackSanitize(html) {
  return html
    // Remove script/iframe/object/embed/applet tags with their content
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[^>]*?>/gi, '')
    .replace(/<applet[\s\S]*?<\/applet>/gi, '')
    // Remove inline event handlers (all quote styles + unquoted)
    .replace(/\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|`[^`]*`|[^\s>]*)/gi, '')
    // Remove javascript: URIs (case-insensitive)
    .replace(/javascript\s*:/gi, '')
}

module.exports = { sanitize }
