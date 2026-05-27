/**
 * Miniprogram API Cache Tests — inflight dedup, response cache,
 * TTL expiry, max size eviction, cache key generation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createRequire } from 'module'

let api

beforeEach(() => {
  // Mock wx global (WeChat API)
  global.wx = {
    request: vi.fn()
  }

  const req = createRequire(import.meta.url)
  // Clear module cache to get fresh module state each test
  const apiKey = req.resolve('../../../miniprogram/utils/api.js')
  delete req.cache[apiKey]

  // Also need to mock config
  const configKey = req.resolve('../../../miniprogram/utils/config.js')
  // Inject config mock
  req.cache[configKey] = {
    id: configKey, filename: configKey, loaded: true,
    exports: { BASE_URL: 'https://test.api', STATIC_BASE: 'https://test.cdn' }
  }

  api = req('../../../miniprogram/utils/api.js')
})

afterEach(() => {
  delete global.wx
})

// Helper: resolve a wx.request call
function resolveRequest(data = {}, statusCode = 200) {
  const call = wx.request.mock.calls[wx.request.mock.calls.length - 1]
  call[0].success({ data, statusCode })
  call[0].complete?.()
}

// Helper: reject a wx.request call
function rejectRequest(err = 'Network error') {
  const call = wx.request.mock.calls[wx.request.mock.calls.length - 1]
  call[0].fail(err)
  call[0].complete?.()
}

// -----------------------------------------------------------------
// Inflight dedup
// -----------------------------------------------------------------

describe('inflight request dedup', () => {
  it('reuses in-flight promise for duplicate concurrent requests', () => {
    const p1 = api.request('/cards', { data: { page: 1 } })
    const p2 = api.request('/cards', { data: { page: 1 } })

    // Should only create one wx.request
    expect(wx.request).toHaveBeenCalledTimes(1)
    // Same promise object
    expect(p1).toBe(p2)
  })

  it('does not dedupe different URLs', () => {
    const p1 = api.request('/cards')
    const p2 = api.request('/messages')

    expect(wx.request).toHaveBeenCalledTimes(2)
    expect(p1).not.toBe(p2)
  })

  it('does not dedupe same URL with different data', () => {
    const p1 = api.request('/cards', { data: { page: 1 } })
    const p2 = api.request('/cards', { data: { page: 2 } })

    expect(wx.request).toHaveBeenCalledTimes(2)
    expect(p1).not.toBe(p2)
  })

  it('clears inflight after request completes (POST, not cached)', async () => {
    // Use POST to avoid response cache — test inflight clearing in isolation
    const p = api.request('/inquiry', { method: 'POST', data: { msg: 'a' } })
    resolveRequest({ ok: true })
    await p

    // New POST with different data (different cache key) should create new wx.request
    wx.request.mockClear()
    api.request('/inquiry', { method: 'POST', data: { msg: 'b' } })
    expect(wx.request).toHaveBeenCalledTimes(1)
  })

  it('clears inflight after request fails', async () => {
    // Failed requests aren't cached — inflight should still be cleared
    const p = api.request('/inquiry', { method: 'POST', data: { msg: 'fail' } })
    rejectRequest('Network error')
    try { await p } catch (_) {}

    wx.request.mockClear()
    api.request('/inquiry', { method: 'POST', data: { msg: 'retry' } })
    expect(wx.request).toHaveBeenCalledTimes(1)
  })
})

// -----------------------------------------------------------------
// Response cache (GET only)
// -----------------------------------------------------------------

describe('GET response cache', () => {
  it('caches GET response and serves from cache on second call', async () => {
    const p1 = api.request('/company-infos')
    resolveRequest([{ id: 1, name: 'TestCo' }])
    const data1 = await p1
    expect(data1[0].name).toBe('TestCo')

    // Second call — should NOT trigger new wx.request (cache hit)
    wx.request.mockClear()
    const data2 = await api.request('/company-infos')
    expect(wx.request).toHaveBeenCalledTimes(0)
    expect(data2).toEqual(data1)
  })

  it('does NOT cache non-GET requests', async () => {
    const p = api.request('/inquiry', { method: 'POST', data: { msg: 'hi' } })
    resolveRequest({ ok: true })
    await p

    // Second call should make a new request (POST not cached)
    wx.request.mockClear()
    api.request('/inquiry', { method: 'POST', data: { msg: 'hi' } })
    expect(wx.request).toHaveBeenCalledTimes(1)
  })

  it('re-fetches after cache TTL expires', async () => {
    // First request — cached
    const p1 = api.request('/company-infos')
    resolveRequest([{ id: 1 }])
    await p1

    // Advance time past 30s TTL
    vi.useFakeTimers()
    vi.advanceTimersByTime(31000)

    // Second call — should create new request (cache expired)
    wx.request.mockClear()
    api.request('/company-infos')
    expect(wx.request).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
  })
})

// -----------------------------------------------------------------
// Max cache size eviction
// -----------------------------------------------------------------

describe('max cache size eviction', () => {
  it('evicts oldest entry when cache exceeds 200 entries', async () => {
    // Fill cache with 200 entries
    for (let i = 0; i < 200; i++) {
      const p = api.request('/item/' + i)
      resolveRequest({ id: i })
      await p
    }

    // All 200 cached — next request should trigger eviction
    const p = api.request('/item/200')
    resolveRequest({ id: 200 })
    await p

    // Oldest entry (item/0) should be evicted
    wx.request.mockClear()
    api.request('/item/0')
    expect(wx.request).toHaveBeenCalledTimes(1) // cache miss

    // More recent entry (item/100) should still be cached
    wx.request.mockClear()
    api.request('/item/100')
    expect(wx.request).toHaveBeenCalledTimes(0) // cache hit
  })
})

// -----------------------------------------------------------------
// staticUrl
// -----------------------------------------------------------------

describe('staticUrl', () => {
  it('returns empty string for falsy path', () => {
    expect(api.staticUrl('')).toBe('')
    expect(api.staticUrl(null)).toBe('')
    expect(api.staticUrl(undefined)).toBe('')
  })

  it('returns http/https/data URLs unchanged', () => {
    expect(api.staticUrl('https://cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg')
    expect(api.staticUrl('data:image/png;base64,abc')).toBe('data:image/png;base64,abc')
  })

  it('prepends STATIC_BASE to relative paths', () => {
    expect(api.staticUrl('/uploads/a.jpg')).toBe('https://test.cdn/uploads/a.jpg')
    expect(api.staticUrl('uploads/b.png')).toBe('https://test.cdn/uploads/b.png')
  })

  it('appends OSS resize params when dimensions specified', () => {
    const url = api.staticUrl('/uploads/img.jpg', { w: 300, h: 200 })
    expect(url).toContain('x-oss-process=image/resize,m_fill,w_300,h_200')
  })

  it('does not append params when no options given', () => {
    const url = api.staticUrl('/uploads/img.jpg')
    expect(url).not.toContain('x-oss-process')
  })
})
