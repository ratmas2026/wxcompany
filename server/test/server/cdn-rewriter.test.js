import { describe, it, expect } from 'vitest'
const { rewriteCdnUrls } = require('../../cdn-rewriter.js')

describe('rewriteCdnUrls', () => {
  it('replaces Tailwind CDN script src with local path', () => {
    const input = '<script src="https://cdn.tailwindcss.com"></script>'
    const result = rewriteCdnUrls(input)
    expect(result).toContain('/api/templates-runtime/tailwind.js')
    expect(result).not.toContain('cdn.tailwindcss.com')
  })

  it('preserves non-CDN script tags unchanged', () => {
    const input = '<script>console.log("hello")</script>'
    const result = rewriteCdnUrls(input)
    expect(result).toBe(input)
  })

  it('replaces CDN URL with plugin query params', () => {
    const input = '<script src="https://cdn.tailwindcss.com?plugins=forms,typography"></script>'
    const result = rewriteCdnUrls(input)
    expect(result).toContain('/api/templates-runtime/tailwind.js')
    expect(result).not.toContain('cdn.tailwindcss.com')
    expect(result).toContain('cdn-rewriter')
    expect(result).toContain('forms, typography')
  })

  it('handles HTML with multiple scripts', () => {
    const input = '<html><head><script src="https://cdn.tailwindcss.com"></script></head><body><script>init()</script></body></html>'
    const result = rewriteCdnUrls(input)
    expect(result).toContain('/api/templates-runtime/tailwind.js')
    expect(result).toContain('init()')
    expect(result).not.toContain('cdn.tailwindcss.com')
  })

  it('does not modify HTML without Tailwind CDN', () => {
    const input = '<div class="bg-red-500">Hello</div>'
    const result = rewriteCdnUrls(input)
    expect(result).toBe(input)
  })

  it('handles empty string', () => {
    expect(rewriteCdnUrls('')).toBe('')
  })
})
