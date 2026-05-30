import { describe, it, expect } from 'vitest'
const { hasTailwindCDN, injectCompiledCSS, preprocessTemplate, compileCSS, countClasses, MAX_CLASSES } = require('../../tailwind-compiler.js')

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

describe('countClasses', () => {
  it('counts unique CSS classes in HTML', () => {
    expect(countClasses('<div class="bg-red-500 mt-4">test</div>')).toBe(2)
  })

  it('counts classes across multiple elements', () => {
    expect(countClasses('<div class="a b c"></div><span class="d e"></span>')).toBe(5)
  })

  it('returns 0 for HTML with no class attributes', () => {
    expect(countClasses('<div>hello</div>')).toBe(0)
  })
})

describe('compileCSS DoS protection', () => {
  it('rejects HTML with too many classes', async () => {
    let html = ''
    for (let i = 0; i <= MAX_CLASSES + 10; i++) {
      html += `<div class="bg-${i}">x</div>`
    }
    const result = await compileCSS(html)
    expect(result).toBe('')
  })

  it('compiles small HTML normally', async () => {
    const html = '<div class="bg-red-500 text-white">Hello</div>'
    const result = await compileCSS(html)
    expect(typeof result).toBe('string')
  })
})
