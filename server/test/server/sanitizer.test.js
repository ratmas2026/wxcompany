import { describe, it, expect, beforeAll } from 'vitest'

let sanitize

beforeAll(async () => {
  const { createRequire } = await import('module')
  const req = createRequire(import.meta.url)
  const mod = req('../../sanitizer.js')
  sanitize = mod.sanitize
})

describe('sanitize', () => {
  it('returns empty string for null input', async () => {
    expect(await sanitize(null)).toBe('')
  })

  it('returns empty string for undefined input', async () => {
    expect(await sanitize(undefined)).toBe('')
  })

  it('returns empty string for empty string', async () => {
    expect(await sanitize('')).toBe('')
  })

  it('returns empty string for non-string (number)', async () => {
    expect(await sanitize(123)).toBe('')
  })

  it('preserves simple HTML structure', async () => {
    const html = '<div><p>Hello World</p></div>'
    const result = await sanitize(html)
    expect(result).toContain('Hello World')
    expect(result).toContain('<div')
  })

  it('preserves script tag but strips forbidden event handlers on it', async () => {
    // script IS in ALLOWED_TAGS (for Tailwind CDN), so the tag itself stays.
    // But FORBID_ATTR (onload etc.) are stripped, and FORBID_TAGS like iframe are removed.
    const html = '<div>ok</div><script onload="doBad()">console.log("hi")</script><p>good</p>'
    const result = await sanitize(html)
    expect(result).not.toContain('onload')
    expect(result).toContain('console.log')
    expect(result).toContain('ok')
    expect(result).toContain('good')
  })

  it('strips inline event handlers (onclick)', async () => {
    const html = '<div onclick="alert(1)">click me</div>'
    const result = await sanitize(html)
    expect(result).not.toContain('onclick')
    expect(result).toContain('click me')
  })

  it('strips javascript: protocol in href', async () => {
    const html = '<a href="javascript:alert(1)">link</a>'
    const result = await sanitize(html)
    expect(result).not.toMatch(/javascript\s*:/i)
  })

  it('strips iframe tags', async () => {
    const html = '<p>before</p><iframe src="evil.com"></iframe><p>after</p>'
    const result = await sanitize(html)
    expect(result).not.toContain('iframe')
    expect(result).not.toContain('evil.com')
    expect(result).toContain('before')
  })

  it('strips form/input tags', async () => {
    const html = '<form action="/steal"><input name="pw"></form>'
    const result = await sanitize(html)
    expect(result).not.toContain('<form')
    expect(result).not.toContain('<input')
  })

  it('preserves Tailwind CDN script src', async () => {
    const html = '<script src="https://cdn.tailwindcss.com"></script>'
    const result = await sanitize(html)
    expect(result).toContain('cdn.tailwindcss.com')
  })

  it('preserves DOCTYPE if present in input', async () => {
    const html = '<!DOCTYPE html>\n<html><body><p>test</p></body></html>'
    const result = await sanitize(html)
    expect(result).toMatch(/<!DOCTYPE\s/i)
  })
})
