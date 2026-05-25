/**
 * Miniprogram Utils Tests — layout.js (parseGridLayout)
 */

import { describe, it, expect } from 'vitest'

const { parseGridLayout, FONT_SIZE_MAP } = require('../../../miniprogram/utils/layout.js')

describe('FONT_SIZE_MAP', () => {
  it('maps all known size keys to rpx values', () => {
    expect(FONT_SIZE_MAP).toHaveProperty('xs')
    expect(FONT_SIZE_MAP).toHaveProperty('small')
    expect(FONT_SIZE_MAP).toHaveProperty('medium')
    expect(FONT_SIZE_MAP).toHaveProperty('large')
    expect(FONT_SIZE_MAP).toHaveProperty('xl')
    expect(FONT_SIZE_MAP).toHaveProperty('xxl')
    expect(FONT_SIZE_MAP).toHaveProperty('huge')
  })
})

describe('parseGridLayout', () => {
  describe('named layouts', () => {
    it('parses "carousel" as horizontal-scroll', () => {
      const result = parseGridLayout('carousel')
      expect(result.layout).toBe('horizontal-scroll')
      expect(result.gridCols).toBe(0)
    })

    it('parses "horizontal-scroll" as horizontal-scroll', () => {
      const result = parseGridLayout('horizontal-scroll')
      expect(result.layout).toBe('horizontal-scroll')
    })

    it('parses "tab" layout', () => {
      const result = parseGridLayout('tab')
      expect(result.layout).toBe('tab')
      expect(result.gridCols).toBe(0)
    })

    it('parses "hero" layout', () => {
      const result = parseGridLayout('hero')
      expect(result.layout).toBe('hero')
    })

    it('parses "single" layout', () => {
      const result = parseGridLayout('single')
      expect(result.layout).toBe('single')
    })
  })

  describe('grid layouts', () => {
    it('parses "grid-6-2x3"', () => {
      const result = parseGridLayout('grid-6-2x3')
      expect(result.layout).toBe('grid')
      expect(result.gridCols).toBe(2)
      expect(result.gridClass).toBe('grid-6-2x3')
    })

    it('parses "grid-6-3x2"', () => {
      const result = parseGridLayout('grid-6-3x2')
      expect(result.layout).toBe('grid')
      expect(result.gridCols).toBe(3)
      expect(result.gridClass).toBe('grid-6-3x2')
    })

    it('parses "grid-4" numeric grid', () => {
      const result = parseGridLayout('grid-4')
      expect(result.layout).toBe('grid')
      expect(result.gridCols).toBe(2)
      expect(result.gridClass).toBe('grid-4')
    })

    it('parses "grid_8" with underscore separator', () => {
      const result = parseGridLayout('grid_8')
      expect(result.layout).toBe('grid')
      expect(result.gridCols).toBe(2)
      expect(result.gridClass).toBe('grid-8')
    })

    it('parses "grid" (bare) with default grid-4', () => {
      const result = parseGridLayout('grid')
      expect(result.layout).toBe('grid')
      expect(result.gridCols).toBe(2)
      expect(result.gridClass).toBe('grid-4')
    })

    it('converts legacy "grid-6" to grid-6-3x2 with warning', () => {
      const result = parseGridLayout('grid-6')
      // Legacy grid-6 should be upgraded to grid-6-3x2
      expect(result.layout).toBe('grid')
      expect(result.gridCols).toBe(3)
      expect(result.gridClass).toBe('grid-6-3x2')
    })
  })

  describe('boundary conditions', () => {
    it('returns single layout for empty string', () => {
      const result = parseGridLayout('')
      expect(result.layout).toBe('single')
      expect(result.gridCols).toBe(0)
    })

    it('returns grid-4 default for whitespace-only string (empty after trim)', () => {
      const result = parseGridLayout('   ')
      // After trim, '' doesn't match any known layout — defaults to grid-4
      expect(result.layout).toBe('grid')
      expect(result.gridClass).toBe('grid-4')
    })

    it('trims whitespace around valid value', () => {
      const result = parseGridLayout('  carousel  ')
      expect(result.layout).toBe('horizontal-scroll')
    })

    it('handles null gracefully', () => {
      // The implementation uses (displayLayout || 'single'), so null → 'single'
      const result = parseGridLayout(null)
      expect(result.layout).toBe('single')
    })

    it('handles undefined gracefully', () => {
      const result = parseGridLayout(undefined)
      expect(result.layout).toBe('single')
    })
  })

  describe('error / unknown layouts', () => {
    it('returns grid-4 default for unknown layout string', () => {
      const result = parseGridLayout('unknown_abc')
      expect(result.layout).toBe('grid')
      expect(result.gridCols).toBe(2)
      expect(result.gridClass).toBe('grid-4')
    })

    it('returns grid-4 default for text-only string', () => {
      const result = parseGridLayout('abc,def')
      expect(result.layout).toBe('grid')
      expect(result.gridClass).toBe('grid-4')
    })

    it('returns grid-4 default for single number without grid prefix', () => {
      const result = parseGridLayout('5')
      expect(result.layout).toBe('grid')
      expect(result.gridClass).toBe('grid-4')
    })
  })

  describe('grid with arbitrary N', () => {
    it('parses "grid-12" for 12 items', () => {
      const result = parseGridLayout('grid-12')
      expect(result.layout).toBe('grid')
      expect(result.gridCols).toBe(2)
      expect(result.gridClass).toBe('grid-12')
    })

    it('parses "grid-3" for 3 items', () => {
      const result = parseGridLayout('grid-3')
      expect(result.layout).toBe('grid')
      expect(result.gridCols).toBe(2)
      expect(result.gridClass).toBe('grid-3')
    })
  })
})
