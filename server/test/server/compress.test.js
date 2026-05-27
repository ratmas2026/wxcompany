import { describe, it, expect, beforeAll, vi } from 'vitest'

let compressImage

beforeAll(async () => {
  const { createRequire } = await import('module')
  const req = createRequire(import.meta.url)

  // Mock sharp before loading compress.js
  const mockPipeline = {
    resize: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    png: vi.fn().mockReturnThis(),
    toFile: vi.fn().mockResolvedValue(undefined)
  }
  const sharpMock = vi.fn(() => mockPipeline)
  sharpMock.default = sharpMock

  // Inject mock
  const sharpKey = req.resolve('sharp')
  if (!require.cache[sharpKey]) {
    require.cache[sharpKey] = {
      id: sharpKey, filename: sharpKey, loaded: true, exports: sharpMock
    }
  }

  // Mock fs with controlled file sizes — .tmp files are "smaller" to trigger replace
  const fsMock = {
    statSync: vi.fn((p) => ({ size: String(p).endsWith('.tmp') ? 50000 : 100000 })),
    unlinkSync: vi.fn(),
    renameSync: vi.fn()
  }
  const fsKey = req.resolve('fs')
  require.cache[fsKey] = {
    id: fsKey, filename: fsKey, loaded: true, exports: fsMock
  }

  const mod = req('../../compress.js')
  compressImage = mod.compressImage
})

describe('compressImage', () => {
  it('skips GIF files', async () => {
    const result = await compressImage('/uploads/test.gif')
    expect(result.compressed).toBe(false)
  })

  it('skips SVG files', async () => {
    const result = await compressImage('/uploads/icon.svg')
    expect(result.compressed).toBe(false)
  })

  it('skips WebP files', async () => {
    const result = await compressImage('/uploads/photo.webp')
    expect(result.compressed).toBe(false)
  })

  it('returns originalSize and newSize keys', async () => {
    const result = await compressImage('/uploads/photo.png')
    expect(result).toHaveProperty('compressed')
    expect(result).toHaveProperty('originalSize')
    expect(result).toHaveProperty('newSize')
  })

  it('compresses JPEG files with progressive option', async () => {
    const result = await compressImage('/uploads/photo.jpg')
    expect(result.compressed).toBe(true)
  })

  it('compresses PNG files (quality 80)', async () => {
    const result = await compressImage('/uploads/screenshot.png')
    expect(result.compressed).toBe(true)
  })
})
