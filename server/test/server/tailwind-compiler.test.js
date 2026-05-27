import { describe, it, expect } from 'vitest'
const { hasTailwindCDN, injectCompiledCSS, preprocessTemplate } = require('../../tailwind-compiler.js')

describe('hasTailwindCDN', () => {
  it('detects Tailwind CDN script tag', () => {
    expect(hasTailwindCDN('<script src="https://cdn.tailwindcss.com"></script>')).toBe(true)
  })

  it('detects CDN with query params', () => {
    expect(hasTailwindCDN('<script src="https://cdn.tailwindcss.com?plugins=forms"></script>')).toBe(true)
  })

  it('returns false when no CDN present', () => {
    expect(hasTailwindCDN('<div class="bg-red-500">Hello</div>')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(hasTailwindCDN('')).toBe(false)
  })
})

describe('injectCompiledCSS', () => {
  it('injects style block before </head>', () => {
    const html = '<html><head></head><body></body></html>'
    const result = injectCompiledCSS(html, '.flex{display:flex}')
    expect(result).toContain('<style data-source="tailwind-compiler">.flex{display:flex}</style>')
    expect(result).toContain('</head>')
  })

  it('removes Tailwind CDN script tag', () => {
    const html = '<head><script src="https://cdn.tailwindcss.com"></script></head>'
    const result = injectCompiledCSS(html, '.flex{display:flex}')
    expect(result).not.toContain('cdn.tailwindcss.com')
    expect(result).toContain('<style data-source="tailwind-compiler">')
  })

  it('returns original HTML when css is empty', () => {
    const html = '<div>test</div>'
    expect(injectCompiledCSS(html, '')).toBe(html)
  })

  it('handles HTML without head tag', () => {
    const html = '<body><div>test</div></body>'
    const result = injectCompiledCSS(html, '.x{color:red}')
    expect(result).toContain('<style data-source="tailwind-compiler">')
    expect(result).toContain('<body')
  })
})

describe('preprocessTemplate', () => {
  it('returns original HTML when no CDN detected', async () => {
    const html = '<div class="bg-red-500">Hello</div>'
    const result = await preprocessTemplate(html)
    expect(result).toBe(html)
  })

  it('returns original HTML for empty input', async () => {
    expect(await preprocessTemplate('')).toBe('')
  })
})
