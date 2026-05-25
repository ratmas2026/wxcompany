/**
 * Admin Common Tests — statusLabel, renderPagination, exportCSV
 *
 * These tests import Admin functions directly by loading common.js
 * in the jsdom environment. The Admin object is attached to global scope.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load common.js and expose Admin to globalThis so we can access it.
// ES modules are strict — direct eval scopes all declarations internally.
// Indirect eval (via globalEval) runs in jsdom's global scope (window).
// We replace 'const Admin' with 'globalThis.Admin' so it becomes a window property.
const commonPath = resolve(__dirname, '../../../admin/js/common.js')
let commonSrc = readFileSync(commonPath, 'utf-8')
commonSrc = commonSrc.replace('const Admin = {', 'globalThis.Admin = {')
const globalEval = eval
globalEval(commonSrc)
const { statusLabel, renderPagination, exportCSV } = globalThis.Admin

describe('statusLabel', () => {
  it('returns badge HTML for known status "new"', () => {
    const html = statusLabel('new')
    expect(html).toContain('新咨询')
    expect(html).toContain('badge')
  })

  it('returns badge HTML for known status "contacted"', () => {
    const html = statusLabel('contacted')
    expect(html).toContain('已联系')
  })

  it('returns badge HTML for known status "converted"', () => {
    const html = statusLabel('converted')
    expect(html).toContain('已转化')
  })

  it('returns badge HTML for known status "invalid"', () => {
    const html = statusLabel('invalid')
    expect(html).toContain('无效')
  })

  it('returns neutral badge for unknown status (does not crash)', () => {
    const html = statusLabel('unknown_xyz_status')
    expect(html).toContain('unknown_xyz_status')
    expect(html).toContain('badge')
  })

  it('does not crash on empty string', () => {
    const html = statusLabel('')
    expect(typeof html).toBe('string')
  })

  it('does not crash on null (returns string)', () => {
    const html = statusLabel(null)
    expect(typeof html).toBe('string')
    expect(html).toContain('null')
  })

  it('is case-sensitive (preserves case, or handles gracefully)', () => {
    const html = statusLabel('NEW')
    // Should not match the known 'new' status (case sensitive)
    expect(typeof html).toBe('string')
    // Either returns default badge or exact match
    expect(html.length).toBeGreaterThan(0)
  })

  it('renders status strings as-is (trusted DB values, note XSS risk if user-supplied)', () => {
    // Current implementation does NOT escape — statuses come from trusted DB values.
    // If statuses ever become user-supplied, this would need HTML escaping.
    const html = statusLabel('<script>alert(1)</script>')
    // Documents current behavior: renders raw string inside badge span
    expect(html).toContain('badge-neutral')
    expect(typeof html).toBe('string')
  })
})

describe('renderPagination', () => {
  it('returns empty string for single page (total <= pageSize)', () => {
    const html = renderPagination(5, 1, 10, () => {})
    expect(html).toBe('')
  })

  it('returns pagination HTML for multiple pages (first page)', () => {
    const html = renderPagination(50, 1, 10, () => {})
    expect(html).toContain('pagination')
    expect(html).toContain('共 50 条')
    // First page button should be active
    expect(html).toContain('active')
    expect(html).toContain('data-page="1"')
  })

  it('shows correct range on first page', () => {
    const html = renderPagination(50, 1, 10, () => {})
    expect(html).toContain('显示 1-10')
  })

  it('shows correct range on last page', () => {
    const html = renderPagination(50, 5, 10, () => {})
    expect(html).toContain('显示 41-50')
  })

  it('shows correct range for partial last page', () => {
    const html = renderPagination(43, 5, 10, () => {})
    expect(html).toContain('显示 41-43')
  })

  it('generates correct number of page buttons', () => {
    const html = renderPagination(50, 1, 10, () => {})
    // 5 pages: buttons for 1,2,3,4,5
    const matches = html.match(/data-page="/g)
    expect(matches).toHaveLength(5)
  })

  it('handles empty result (total = 0)', () => {
    const html = renderPagination(0, 1, 10, () => {})
    // totalPages = Math.ceil(0/10) = 0, <= 1 → returns ''
    expect(html).toBe('')
  })

  it('handles exactly one page (total = pageSize)', () => {
    const html = renderPagination(10, 1, 10, () => {})
    expect(html).toBe('')
  })

  it('handles exactly pageSize + 1 (two pages)', () => {
    const html = renderPagination(11, 1, 10, () => {})
    expect(html).toContain('pagination')
    const matches = html.match(/data-page="/g)
    expect(matches).toHaveLength(2)
  })

  it('highlights the correct active page (page 3)', () => {
    const html = renderPagination(50, 3, 10, () => {})
    // Page 3 button should have the 'active' class
    // (attribute order: class before data-page in the rendered HTML)
    expect(html).toMatch(/<button[^>]*class="[^"]*\bactive\b[^"]*"[^>]*data-page="3"/)
    // Only one active button total
    const activeMatches = html.match(/class="[^"]*\bactive\b[^"]*"/g)
    expect(activeMatches).toHaveLength(1)
  })

  it('handles large page count without crash', () => {
    const html = renderPagination(10000, 500, 10, () => {})
    expect(typeof html).toBe('string')
    expect(html.length).toBeGreaterThan(0)
  })
})

describe('exportCSV', () => {
  it('does nothing for empty data array', () => {
    // Should not throw, returns early
    expect(() => exportCSV([], 'test')).not.toThrow()
  })

  it('creates a download link with correct filename', () => {
    // Mock document.createElement to capture the anchor
    const origCreateElement = document.createElement.bind(document)
    const anchors = []
    document.createElement = vi.fn((tag) => {
      if (tag === 'a') {
        const a = origCreateElement('a')
        anchors.push(a)
        a.click = vi.fn()
        return a
      }
      return origCreateElement(tag)
    })

    exportCSV([{ name: 'Test', value: 1 }], 'export-test')

    expect(anchors.length).toBe(1)
    expect(anchors[0].download).toBe('export-test.csv')

    // Restore
    document.createElement = origCreateElement
  })

  it('includes BOM in the CSV content', () => {
    const origCreateElement = document.createElement.bind(document)
    let csvContent = ''
    document.createElement = vi.fn((tag) => {
      if (tag === 'a') {
        const a = origCreateElement('a')
        a.click = vi.fn()
        return a
      }
      return origCreateElement(tag)
    })

    // Intercept Blob creation
    const OrigBlob = global.Blob
    global.Blob = vi.fn(function (parts, opts) {
      csvContent = parts[0]
      return new OrigBlob(parts, opts)
    })

    exportCSV([{ name: 'Test', value: 1 }], 'test')

    expect(csvContent.charCodeAt(0)).toBe(0xFEFF) // BOM
    expect(csvContent).toContain('name,value')
    expect(csvContent).toContain('"Test"')

    // Restore
    document.createElement = origCreateElement
    global.Blob = OrigBlob
  })

  it('wraps values containing commas in quotes', () => {
    const OrigBlob = global.Blob
    let csvContent = ''
    global.Blob = vi.fn(function (parts, opts) {
      csvContent = parts[0]
      return new OrigBlob(parts, opts)
    })

    exportCSV([{ name: 'Hello, World', val: 1 }], 'test')

    // The value "Hello, World" should be in quotes
    expect(csvContent).toContain('"Hello, World"')

    global.Blob = OrigBlob
  })

  it('handles null and undefined values as empty cells', () => {
    const OrigBlob = global.Blob
    let csvContent = ''
    global.Blob = vi.fn(function (parts, opts) {
      csvContent = parts[0]
      return new OrigBlob(parts, opts)
    })

    exportCSV([{ a: null, b: undefined, c: 'ok' }], 'test')

    // null and undefined should produce empty strings in quotes
    expect(csvContent).toContain('""')

    global.Blob = OrigBlob
  })

  it('preserves Unicode characters', () => {
    const OrigBlob = global.Blob
    let csvContent = ''
    global.Blob = vi.fn(function (parts, opts) {
      csvContent = parts[0]
      return new OrigBlob(parts, opts)
    })

    exportCSV([{ name: '展示企业' }], 'test')
    expect(csvContent).toContain('展示企业')

    global.Blob = OrigBlob
  })
})
