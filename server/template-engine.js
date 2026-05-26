// Template engine — whitelist-based placeholder replacement + TXT auto-wrap

// Only these placeholders are allowed. Any other {{...}} is replaced with empty string.
const WHITELIST = [
  'user.name', 'user.phone', 'user.title', 'user.department',
  'user.email', 'user.address', 'user.avatar', 'user.bio',
  'company.name', 'company.logo',
  'qr_code'
]

/**
 * Replace whitelisted placeholders in HTML with actual data.
 * Non-whitelisted placeholders are silently stripped.
 *
 * @param {string} html - Template HTML with {{user.name}} etc.
 * @param {object} data - { user: {...}, company: {...}, qr_code: '...' }
 * @returns {string} HTML with placeholders replaced
 */
function renderTemplate(html, data) {
  if (!data) return html
  return html.replace(/\{\{([\w.]+)\}\}/g, (match, key) => {
    if (!WHITELIST.includes(key)) return ''
    // qr_code is a top-level key (not namespaced)
    if (key === 'qr_code') return escapeAttr(data.qr_code || '')
    const dotIdx = key.indexOf('.')
    const scope = key.slice(0, dotIdx)
    const field = key.slice(dotIdx + 1)
    const value = (data[scope] && data[scope][field]) || ''
    return escapeAttr(value)
  })
}

/**
 * Replace whitelisted placeholders WITHOUT HTML-escaping values.
 * Used for TXT templates where wrapTxtAsHtml handles all escaping.
 */
function renderTemplateRaw(html, data) {
  if (!data) return html
  return html.replace(/\{\{([\w.]+)\}\}/g, (match, key) => {
    if (!WHITELIST.includes(key)) return ''
    if (key === 'qr_code') return data.qr_code || ''
    const dotIdx = key.indexOf('.')
    const scope = key.slice(0, dotIdx)
    const field = key.slice(dotIdx + 1)
    return (data[scope] && data[scope][field]) || ''
  })
}

/**
 * Escape a value for safe use inside HTML attribute values and text content.
 * Only escapes the three characters that have meaning in attribute values.
 */
function escapeAttr(val) {
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Wrap plain text content in a complete HTML document skeleton.
 * Used when the uploaded template is .txt (text/plain).
 *
 * @param {string} content - Raw text content
 * @returns {string} Full HTML document
 */
function wrapTxtAsHtml(content) {
  const escaped = String(content)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Preserve line breaks as <br> for display
    .replace(/\n/g, '<br>')
  return '<!DOCTYPE html>\n<html lang="zh-CN">\n<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">\n<style>body{margin:0;padding:20px;font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.8;color:#333;max-width:380px;margin:0 auto;word-wrap:break-word;overflow-wrap:break-word}img{max-width:100%;height:auto}</style></head>\n<body>' + escaped + '</body>\n</html>'
}

/**
 * Wrap rendered HTML in a proper document skeleton with CSS reset.
 * Always called before sending the preview to the client.
 *
 * @param {string} bodyHtml - The rendered card HTML
 * @returns {string} Full HTML document
 */
function wrapHtmlDocument(bodyHtml) {
  return '<!DOCTYPE html>\n<html lang="zh-CN">\n<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">\n<style>body{margin:0;padding:16px;font-family:system-ui,-apple-system,sans-serif}*,*::before,*::after{box-sizing:border-box}img{max-width:100%;height:auto}</style></head>\n<body>' + bodyHtml + '</body>\n</html>'
}

module.exports = { renderTemplate, renderTemplateRaw, wrapTxtAsHtml, wrapHtmlDocument, WHITELIST }
