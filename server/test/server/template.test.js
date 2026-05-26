import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// These modules are pure functions — no mocking needed
const templateEngine = require('../../template-engine.js')
const sanitizer = require('../../sanitizer.js')
const templateCache = require('../../template-cache.js')

// ============================================================
// template-engine: renderTemplate
// ============================================================
describe('renderTemplate', () => {
  const data = {
    user: {
      name: '张三', phone: '13800138000', title: '工程师',
      department: '技术部', email: 'zhangsan@test.com',
      address: '北京市朝阳区', avatar: '/avatar.jpg', bio: '全栈开发者'
    },
    company: { name: '测试公司', logo: '/logo.png' },
    qr_code: 'data:image/png;base64,abc123'
  }

  it('replaces all whitelisted placeholders', () => {
    const html = '<p>{{user.name}}</p><p>{{user.phone}}</p><p>{{company.name}}</p><img src="{{qr_code}}">'
    const result = templateEngine.renderTemplate(html, data)
    expect(result).toContain('张三')
    expect(result).toContain('13800138000')
    expect(result).toContain('测试公司')
    expect(result).toContain('data:image/png;base64,abc123')
  })

  it('replaces non-whitelisted placeholders with empty string', () => {
    const html = '<p>{{evil.code}}</p><p>{{constructor}}</p><p>{{user.name}}</p>'
    const result = templateEngine.renderTemplate(html, data)
    expect(result).toContain('张三')
    expect(result).not.toContain('{{evil.code}}')
    expect(result).not.toContain('{{constructor}}')
  })

  it('handles missing/missing nested data gracefully (returns empty string)', () => {
    const html = '<p>{{user.name}}</p><p>{{user.nonexistent}}</p>'
    const result = templateEngine.renderTemplate(html, data)
    expect(result).toContain('张三')
    // nonexistent field → empty string
    expect(result).toBe('<p>张三</p><p></p>')
  })

  it('handles empty data object', () => {
    const html = '<p>{{user.name}}</p>'
    const result = templateEngine.renderTemplate(html, { user: {}, company: {}, qr_code: '' })
    expect(result).toBe('<p></p>')
  })

  it('escapes HTML entities in values', () => {
    const html = '<div>{{user.name}}</div>'
    const result = templateEngine.renderTemplate(html, {
      user: { name: '<script>alert("xss")</script>' },
      company: {}, qr_code: ''
    })
    expect(result).not.toContain('<script>')
    expect(result).toContain('&lt;script&gt;')
  })

  it('escapes double quotes in values (attribute safety)', () => {
    const html = '<div title="{{user.name}}"></div>'
    const result = templateEngine.renderTemplate(html, {
      user: { name: 'test"evil' },
      company: {}, qr_code: ''
    })
    expect(result).toContain('&quot;')
    expect(result).not.toContain('"evil')
  })
})

// ============================================================
// template-engine: wrapTxtAsHtml
// ============================================================
describe('wrapTxtAsHtml', () => {
  it('wraps plain text in HTML document skeleton', () => {
    const result = templateEngine.wrapTxtAsHtml('Hello World')
    expect(result).toMatch(/^<!DOCTYPE html>/)
    expect(result).toContain('<html lang="zh-CN">')
    expect(result).toContain('<meta charset="utf-8">')
    expect(result).toContain('Hello World')
    expect(result).toContain('</html>')
  })

  it('converts newlines to <br> tags', () => {
    const result = templateEngine.wrapTxtAsHtml('Line 1\nLine 2\nLine 3')
    expect(result).toContain('Line 1<br>Line 2<br>Line 3')
  })

  it('escapes HTML entities in the text', () => {
    const result = templateEngine.wrapTxtAsHtml('<script>alert(1)</script>')
    expect(result).toContain('&lt;script&gt;')
    expect(result).not.toContain('<script>')
  })

  it('escapes ampersands in the text', () => {
    const result = templateEngine.wrapTxtAsHtml('A & B Company')
    expect(result).toContain('A &amp; B')
  })

  it('handles empty string', () => {
    const result = templateEngine.wrapTxtAsHtml('')
    expect(result).toContain('<body>')
    expect(result).toContain('</body>')
  })
})

// ============================================================
// template-engine: wrapHtmlDocument
// ============================================================
describe('wrapHtmlDocument', () => {
  it('wraps body HTML in full document skeleton', () => {
    const result = templateEngine.wrapHtmlDocument('<p>Hello</p>')
    expect(result).toMatch(/^<!DOCTYPE html>/)
    expect(result).toContain('<meta charset="utf-8">')
    expect(result).toContain('<meta name="viewport"')
    expect(result).toContain('<body><p>Hello</p></body>')
    expect(result).toContain('</html>')
  })
})

// ============================================================
// sanitizer: sanitize
// ============================================================
describe('sanitize', () => {
  it('allows inline <script> tags (security via iframe sandbox)', async () => {
    const result = await sanitizer.sanitize('<div>Hello</div><script>alert(1)</script>')
    expect(result).toContain('<script>')
    expect(result).toContain('alert(1)')
    expect(result).toContain('Hello')
  })

  it('preserves external <script src> tags (CDN frameworks)', async () => {
    const result = await sanitizer.sanitize('<script src="https://cdn.tailwindcss.com"></script><div>OK</div>')
    expect(result).toContain('<script')
    expect(result).toContain('src="https://cdn.tailwindcss.com"')
    expect(result).toContain('OK')
  })

  it('preserves <link>, <meta>, <title> in full documents', async () => {
    const result = await sanitizer.sanitize('<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Test</title><link rel="stylesheet" href="/style.css"></head><body><p>Hi</p></body></html>')
    expect(result).toContain('<html')
    expect(result).toContain('<meta')
    expect(result).toContain('<link')
    expect(result).toContain('<title>')
    expect(result).toContain('<body>')
    expect(result).toContain('Hi')
  })

  it('strips onclick event handlers', async () => {
    const result = await sanitizer.sanitize('<div onclick="alert(1)">Click</div>')
    expect(result).not.toContain('onclick')
    expect(result).toContain('Click')
  })

  it('strips onerror event handlers', async () => {
    const result = await sanitizer.sanitize('<img src=x onerror="alert(1)">')
    expect(result).not.toContain('onerror')
  })

  it('strips javascript: protocol in href', async () => {
    const result = await sanitizer.sanitize('<a href="javascript:alert(1)">Link</a>')
    expect(result).not.toContain('javascript:')
  })

  it('preserves safe inline styles', async () => {
    const result = await sanitizer.sanitize('<div style="color:red;font-size:14px">Styled</div>')
    expect(result).toContain('color:red')
    expect(result).toContain('font-size:14px')
    expect(result).toContain('Styled')
  })

  it('preserves safe tags like div, p, span, img, a', async () => {
    const result = await sanitizer.sanitize('<div><p>Text</p><span>More</span><img src="/img.jpg" alt="pic"><a href="https://example.com">Link</a></div>')
    expect(result).toContain('<div>')
    expect(result).toContain('<p>')
    expect(result).toContain('<span>')
    expect(result).toContain('<img')
    expect(result).toContain('<a')
    expect(result).toContain('href="https://example.com"')
  })

  it('strips <iframe> tags', async () => {
    const result = await sanitizer.sanitize('<iframe src="https://evil.com"></iframe>')
    expect(result).not.toContain('<iframe')
  })

  it('strips <form>/<input>/<button> tags', async () => {
    const result = await sanitizer.sanitize('<form><input name="user"><button>Submit</button></form>')
    expect(result).not.toContain('<form')
    expect(result).not.toContain('<input')
    expect(result).not.toContain('<button')
  })

  it('returns empty string for null/undefined/non-string input', async () => {
    expect(await sanitizer.sanitize(null)).toBe('')
    expect(await sanitizer.sanitize(undefined)).toBe('')
    expect(await sanitizer.sanitize(123)).toBe('')
  })

  it('handles empty string', async () => {
    expect(await sanitizer.sanitize('')).toBe('')
  })

  it('preserves inline scripts and surrounding text', async () => {
    const result = await sanitizer.sanitize('<div>Before<script>alert(1)</script>After</div>')
    expect(result).toContain('Before')
    expect(result).toContain('After')
    expect(result).toContain('<script>alert(1)</script>')
  })
})

// ============================================================
// template-cache
// ============================================================
describe('template cache', () => {
  beforeEach(() => {
    // Clear all cache entries manually (no public clear method, so rebuild)
    // We use fresh key each test to avoid cross-test pollution
  })

  it('returns null for missing key', () => {
    expect(templateCache.get('nonexistent:99')).toBeNull()
  })

  it('stores and retrieves value', () => {
    const key = templateCache.getCacheKey(1, 100)
    templateCache.set(key, '<html>rendered</html>')
    expect(templateCache.get(key)).toBe('<html>rendered</html>')
  })

  it('getCacheKey builds correct key format', () => {
    const key = templateCache.getCacheKey(5, 42)
    expect(key).toBe('5:42')
  })

  it('getCacheKey coerces arguments to strings', () => {
    const key = templateCache.getCacheKey('tpl-1', 99)
    expect(key).toBe('tpl-1:99')
  })

  it('invalidates all entries for a specific card/user', () => {
    templateCache.set(templateCache.getCacheKey(1, 100), 'render-1')
    templateCache.set(templateCache.getCacheKey(2, 100), 'render-2')
    templateCache.set(templateCache.getCacheKey(1, 200), 'render-3')

    templateCache.invalidateUser(100)

    expect(templateCache.get(templateCache.getCacheKey(1, 100))).toBeNull()
    expect(templateCache.get(templateCache.getCacheKey(2, 100))).toBeNull()
    // Unrelated user should still be cached
    expect(templateCache.get(templateCache.getCacheKey(1, 200))).toBe('render-3')
  })

  it('expires entries after TTL', () => {
    const realDateNow = Date.now.bind(Date)
    const now = Date.now()
    let currentTime = now

    vi.spyOn(Date, 'now').mockImplementation(() => currentTime)

    const key = templateCache.getCacheKey(1, 100)
    templateCache.set(key, 'cached-value')

    // Within TTL — should hit
    currentTime = now + 1000
    expect(templateCache.get(key)).toBe('cached-value')

    // After TTL (24h + 1ms) — should miss
    currentTime = now + 24 * 60 * 60 * 1000 + 1
    expect(templateCache.get(key)).toBeNull()

    Date.now.mockRestore()
  })

  it('stats returns correct counts', () => {
    const s = templateCache.stats()
    expect(typeof s.size).toBe('number')
    expect(typeof s.active).toBe('number')
    expect(typeof s.expired).toBe('number')
  })
})
