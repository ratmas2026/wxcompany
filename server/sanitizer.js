// XSS sanitizer — DOMPurify + jsdom wrapper (ESM-loaded for compat)
let DOMPurify = null
let _jsdomWindow = null

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
  })

  DOMPurify.addHook('uponSanitizeAttribute', function(node, data) {
    // DOMPurify strips SVG path/d attribute even when whitelisted — force keep
    if (data.attrName === 'd') {
      data.keepAttr = true
      data.forceKeepAttr = true
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

  // Check if input has a DOCTYPE declaration
  var inputHasDocType = /^\s*<!DOCTYPE\s/i.test(html)

  var result = DOMPurify.sanitize(html, {
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
      'svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'g', 'defs', 'clipPath',
      'pattern', 'use', 'filter', 'linearGradient', 'radialGradient', 'stop',
      'feGaussianBlur', 'feDropShadow', 'feOffset', 'feMerge', 'feMergeNode',
      'mask', 'text', 'tspan', 'marker', 'image'
    ],
    ALLOWED_ATTR: [
      'class', 'id', 'style',
      'src', 'alt', 'width', 'height',
      'href', 'target', 'rel',
      'type', 'crossorigin', 'charset', 'content', 'name', 'property', 'media', 'as', 'lang',
      'border', 'cellpadding', 'cellspacing', 'colspan', 'rowspan',
      'viewBox', 'xmlns', 'd', 'cx', 'cy', 'r', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
      'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'stroke-dashoffset',
      'transform', 'opacity',
      'href', 'fill-rule', 'clip-rule', 'clip-path', 'mask', 'filter',
      'patternUnits', 'patternTransform', 'preserveAspectRatio',
      'gradientUnits', 'gradientTransform', 'offset', 'stop-color', 'stop-opacity',
      'marker-start', 'marker-mid', 'marker-end',
      'text-anchor', 'dominant-baseline', 'font-family', 'font-size',
      'stroke-opacity', 'fill-opacity', 'stroke-miterlimit'
    ],
    ADD_ATTR: ['d'],
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

  // DOMPurify strips DOCTYPE; restore it if the input had one
  if (inputHasDocType && !/^\s*<!DOCTYPE\s/i.test(result)) {
    result = '<!DOCTYPE html>\n' + result
  }

  return result
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
