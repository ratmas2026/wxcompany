/**
 * Miniprogram Utils Tests — api.js (staticUrl, _cacheKey, request)
 *
 * Note: _cacheKey is a private function not exported from api.js.
 * We test it by replicating the logic, since it's a simple pure function.
 * staticUrl is exported and tested directly.
 * request() tests use a wx.request mock with callback queue pattern.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Replicate _cacheKey logic (from api.js lines 10-13)
function _cacheKey(url, options) {
  const method = (options.method || 'GET').toUpperCase()
  return method + ':' + url + ':' + JSON.stringify(options.data || {})
}

describe('_cacheKey', () => {
  it('generates deterministic key for GET without data', () => {
    const key1 = _cacheKey('/api/cards', { method: 'GET' })
    const key2 = _cacheKey('/api/cards', { method: 'GET' })
    expect(key1).toBe(key2)
    expect(key1).toBe('GET:/api/cards:{}')
  })

  it('includes method in the key (GET vs POST)', () => {
    const getKey = _cacheKey('/api/login', { method: 'GET' })
    const postKey = _cacheKey('/api/login', { method: 'POST' })
    expect(getKey).not.toBe(postKey)
    expect(getKey).toContain('GET:')
    expect(postKey).toContain('POST:')
  })

  it('defaults to GET when method is not specified', () => {
    const key = _cacheKey('/api/cards', {})
    expect(key).toContain('GET:')
  })

  it('includes request data in key', () => {
    const key1 = _cacheKey('/api/cards', { method: 'GET', data: { page: 1 } })
    const key2 = _cacheKey('/api/cards', { method: 'GET', data: { page: 2 } })
    expect(key1).not.toBe(key2)
    expect(key1).toContain('"page":1')
    expect(key2).toContain('"page":2')
  })

  it('generates same key for same complex data object', () => {
    const data = { page: 1, filters: { status: 'active', tags: ['a', 'b'] } }
    const key1 = _cacheKey('/api/search', { method: 'GET', data })
    const key2 = _cacheKey('/api/search', { method: 'GET', data })
    expect(key1).toBe(key2)
  })

  it('handles empty options object', () => {
    const key = _cacheKey('/api/test', {})
    expect(key).toBe('GET:/api/test:{}')
  })
})

describe('staticUrl', () => {
  const { staticUrl } = require('../../../miniprogram/utils/api.js')

  it('returns empty string for falsy input', () => {
    expect(staticUrl('')).toBe('')
    expect(staticUrl(null)).toBe('')
    expect(staticUrl(undefined)).toBe('')
  })

  it('returns http URL unchanged', () => {
    const url = 'http://example.com/image.png'
    expect(staticUrl(url)).toBe(url)
  })

  it('returns https URL unchanged', () => {
    const url = 'https://example.com/image.png'
    expect(staticUrl(url)).toBe(url)
  })

  it('returns data: URI unchanged', () => {
    const url = 'data:image/png;base64,abc123'
    expect(staticUrl(url)).toBe(url)
  })

  it('prefixes relative path with STATIC_BASE', () => {
    const result = staticUrl('/uploads/avatars/test.jpg')
    expect(result).toContain('flow-rhythm.com')
    expect(result).toContain('/uploads/avatars/test.jpg')
    expect(result.startsWith('https://')).toBe(true)
  })

  it('adds leading slash if missing from relative path', () => {
    const result = staticUrl('uploads/avatars/test.jpg')
    expect(result).toContain('/uploads/avatars/test.jpg')
    // Should not have double slashes
    expect(result).not.toContain('com//')
  })

  it('does not double the leading slash', () => {
    const result = staticUrl('/uploads/test.jpg')
    // Count occurrences of "//" only after the protocol
    const pathPart = result.replace('https://', '')
    expect(pathPart).not.toContain('//')
  })
})

// ---------------------------------------------------------------------------
// Phase 3b — request() tests with wx.request callback-queue mock
// Uses vi.resetModules() + beforeEach to get a fresh API module per test,
// ensuring clean _inflight / _cache state.
// ---------------------------------------------------------------------------

describe('request', () => {
  let request, pendingRequests

  function setupWxMock() {
    pendingRequests = []
    global.wx = {
      request: vi.fn((opts) => {
        pendingRequests.push(opts)
      })
    }
  }

  function flushSuccess(idx, data, statusCode) {
    const opts = pendingRequests[idx]
    opts.success({ statusCode: statusCode || 200, data })
    if (opts.complete) opts.complete()
  }

  function flushFail(idx, err) {
    const opts = pendingRequests[idx]
    opts.fail(err)
    if (opts.complete) opts.complete()
  }

  beforeEach(() => {
    vi.resetModules()
    setupWxMock()
    const api = require('../../../miniprogram/utils/api.js')
    request = api.request
  })

  it('resolves with data on successful GET', async () => {
    const p = request('/test-get')
    flushSuccess(0, { result: 'ok' })
    const data = await p
    expect(data).toEqual({ result: 'ok' })
    expect(global.wx.request).toHaveBeenCalledTimes(1)
  })

  it('deduplicates concurrent GET requests (single inflight)', async () => {
    const p1 = request('/test-dedup')
    const p2 = request('/test-dedup')
    expect(global.wx.request).toHaveBeenCalledTimes(1)
    flushSuccess(0, { result: 'shared' })
    const [d1, d2] = await Promise.all([p1, p2])
    expect(d1).toEqual({ result: 'shared' })
    expect(d2).toEqual({ result: 'shared' })
  })

  it('returns cached GET response without calling wx.request again', async () => {
    const p1 = request('/test-cache')
    flushSuccess(0, { result: 'cached' })
    await p1

    const data = await request('/test-cache')
    expect(global.wx.request).toHaveBeenCalledTimes(1)
    expect(data).toEqual({ result: 'cached' })
  })

  it('does not cache POST requests (calls wx.request each time)', async () => {
    const p1 = request('/test-post', { method: 'POST', data: { x: 1 } })
    flushSuccess(0, { result: 'first' })
    await p1

    const p2 = request('/test-post', { method: 'POST', data: { x: 1 } })
    flushSuccess(1, { result: 'second' })
    const data = await p2
    expect(global.wx.request).toHaveBeenCalledTimes(2)
    expect(data).toEqual({ result: 'second' })
  })

  it('rejects on non-200 status code', async () => {
    const p = request('/test-4xx')
    flushSuccess(0, { error: 'Not Found' }, 404)
    await expect(p).rejects.toMatchObject({ statusCode: 404 })
  })

  it('rejects on network error (wx.request fail)', async () => {
    const p = request('/test-network-error')
    flushFail(0, { errMsg: 'request:fail timeout' })
    await expect(p).rejects.toEqual({ errMsg: 'request:fail timeout' })
  })

  it('different URLs produce separate wx.request calls', async () => {
    const p1 = request('/url-1')
    const p2 = request('/url-2')
    expect(global.wx.request).toHaveBeenCalledTimes(2)
    flushSuccess(0, { id: 1 })
    flushSuccess(1, { id: 2 })
    const [d1, d2] = await Promise.all([p1, p2])
    expect(d1).toEqual({ id: 1 })
    expect(d2).toEqual({ id: 2 })
  })

  it('same URL with different GET params gets different cache keys', async () => {
    const p1 = request('/test-params', { data: { page: 1 } })
    const p2 = request('/test-params', { data: { page: 2 } })
    expect(global.wx.request).toHaveBeenCalledTimes(2)
    flushSuccess(0, { page: 1 })
    flushSuccess(1, { page: 2 })
    await Promise.all([p1, p2])
  })

  it('clears inflight after request completes', async () => {
    const p1 = request('/test-reflight')
    flushSuccess(0, { first: true })
    await p1

    // After completion, inflight is clear. Cache hit → still 1 request total.
    const data = await request('/test-reflight')
    expect(global.wx.request).toHaveBeenCalledTimes(1)
    expect(data).toEqual({ first: true })
  })

  it('does not cache failed GET requests (failed request does not poison cache)', async () => {
    const p1 = request('/test-fail-cache')
    flushFail(0, { errMsg: 'timeout' })
    await expect(p1).rejects.toEqual({ errMsg: 'timeout' })

    // Second attempt should try wx.request again (not return poisoned cache)
    const p2 = request('/test-fail-cache')
    flushSuccess(1, { result: 'recovered' })
    const data = await p2
    expect(global.wx.request).toHaveBeenCalledTimes(2)
    expect(data).toEqual({ result: 'recovered' })
  })

  it('inflight-deduplicates concurrent POST but does not cache', async () => {
    // Inflight dedup applies to all methods (same key → same promise)
    const p1 = request('/test-post-dedup', { method: 'POST', data: { id: 1 } })
    const p2 = request('/test-post-dedup', { method: 'POST', data: { id: 1 } })
    expect(global.wx.request).toHaveBeenCalledTimes(1) // deduplicated inflight
    flushSuccess(0, { result: 'first' })
    const [d1, d2] = await Promise.all([p1, p2])
    expect(d1).toEqual({ result: 'first' })
    expect(d2).toEqual({ result: 'first' })

    // POST not cached — second call fires wx.request again
    const p3 = request('/test-post-dedup', { method: 'POST', data: { id: 1 } })
    flushSuccess(1, { result: 'second' })
    const d3 = await p3
    expect(global.wx.request).toHaveBeenCalledTimes(2)
    expect(d3).toEqual({ result: 'second' })
  })

  it('handles empty response body', async () => {
    const p = request('/test-empty')
    flushSuccess(0, '')
    const data = await p
    expect(data).toBe('')
  })

  it('handles large response body', async () => {
    const largeData = { items: Array.from({ length: 1000 }, (_, i) => ({ id: i, name: 'Item ' + i })) }
    const p = request('/test-large')
    flushSuccess(0, largeData)
    const data = await p
    expect(data.items).toHaveLength(1000)
  })

  it('handles requests with custom headers', async () => {
    const p = request('/test-headers', { header: { 'X-Custom': 'test-value' } })
    flushSuccess(0, { ok: true })
    await p
    expect(global.wx.request).toHaveBeenCalledTimes(1)
    const callOpts = global.wx.request.mock.calls[0][0]
    // api.js adds Content-Type: application/json by default, merged with custom headers
    expect(callOpts.header).toMatchObject({ 'X-Custom': 'test-value' })
    expect(callOpts.header['Content-Type']).toBe('application/json')
  })
})
