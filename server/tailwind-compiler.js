// Tailwind CSS pre-compiler — generates static CSS from HTML at upload time.
// Eliminates the need for client-side Tailwind CDN runtime (which is blocked in China).
// Uses Tailwind v3 + PostCSS: writes HTML to a temp file for reliable class scanning,
// then generates CSS containing only the rules actually used by the template.

const tailwindcss = require('tailwindcss')
const postcss = require('postcss')
const autoprefixer = require('autoprefixer')
const fs = require('fs')
const path = require('path')
const os = require('os')

/**
 * Generate a minimal Tailwind CSS stylesheet containing only the rules needed
 * by the classes found in the given HTML.
 *
 * Writes HTML to a temp file because Tailwind v3's file-based scanner is more
 * reliable than `content.raw` (which can miss classes due to inline JS interference).
 *
 * @param {string} html - The template HTML to extract classes from
 * @returns {Promise<string>} Minified CSS string
 */
async function compileCSS(html) {
  if (!html || typeof html !== 'string') return ''

  // Strip <script> tags before scanning — inline JS (like drag-and-drop code)
  // contains class-like strings that confuse Tailwind's content scanner.
  var scanSafe = html.replace(/<script[\s\S]*?<\/script>/gi, '')

  var tmpFile = path.join(os.tmpdir(), 'twc-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.html')
  fs.writeFileSync(tmpFile, scanSafe, 'utf-8')

  try {
    const result = await postcss([
      tailwindcss({ content: [tmpFile] }),
      autoprefixer
    ]).process('@tailwind base;@tailwind components;@tailwind utilities;', {
      from: undefined
    })

    return result.css || ''
  } catch (e) {
    console.error('[tailwind-compiler] CSS compilation failed:', e.message)
    return ''
  } finally {
    try { fs.unlinkSync(tmpFile) } catch (_) {}
  }
}

/**
 * Check if the HTML references Tailwind CDN (meaning it needs CSS pre-compilation).
 *
 * @param {string} html
 * @returns {boolean}
 */
function hasTailwindCDN(html) {
  return /cdn\.tailwindcss\.com/.test(html)
}

/**
 * Replace Tailwind CDN <script> tags with an inline <style> block containing
 * pre-compiled Tailwind CSS. Also removes related config/meta tags.
 *
 * @param {string} html - The template HTML
 * @param {string} compiledCSS - The pre-compiled CSS from compileCSS()
 * @returns {string} HTML with CDN script replaced by inline <style>
 */
function injectCompiledCSS(html, compiledCSS) {
  if (!compiledCSS) return html

  // Remove Tailwind CDN <script> tags (with or without query params)
  html = html.replace(
    /<script\b[^>]*\bsrc="https:\/\/cdn\.tailwindcss\.com[^"]*"[^>]*>\s*<\/script>/gi,
    ''
  )

  // Inject the compiled CSS as a <style> block before the first existing <style> or </head>
  var styleBlock = '<style data-source="tailwind-compiler">' + compiledCSS + '</style>'
  if (/<\/head>/i.test(html)) {
    html = html.replace(/<\/head>/i, styleBlock + '\n</head>')
  } else if (/<body/i.test(html)) {
    html = html.replace(/<body/i, styleBlock + '\n<body')
  } else {
    html = styleBlock + '\n' + html
  }

  return html
}

/**
 * Full pre-processing pipeline for a template HTML string:
 * 1. Detect if it references Tailwind CDN
 * 2. If yes: compile CSS → inject inline <style> → remove CDN <script>
 * 3. If no: return as-is
 *
 * @param {string} html
 * @returns {Promise<string>} Processed HTML
 */
async function preprocessTemplate(html) {
  if (!hasTailwindCDN(html)) return html
  const css = await compileCSS(html)
  if (!css) return html
  return injectCompiledCSS(html, css)
}

module.exports = { compileCSS, hasTailwindCDN, injectCompiledCSS, preprocessTemplate }
