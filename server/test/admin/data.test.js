/**
 * Admin DataStore Tests — localStorage cache, authFetch 401 redirect,
 * offline fallback, corrupt cache recovery
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

let DataStore, authFetch

// Load data.js and wrap in IIFE to extract authFetch and DataStore
const dataPath = resolve(__dirname, '../../../admin/js/data.js')
const dataSrc = readFileSync(dataPath, 'utf-8')
const wrappedSrc = `(function(){\n${dataSrc}\nglobalThis._authFetch = authFetch;\nglobalThis._DataStore = DataStore;\n})()`
const globalEval = eval
globalEval(wrappedSrc)
authFetch = globalThis._authFetch
DataStore = globalThis._DataStore

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  fetch.mockClear()
  if (global.Admin) global.Admin.showToast?.mockClear?.()
  // Reset _ready so init() works fresh each test
  DataStore._ready = false
  DataStore._mutex = Promise.resolve()
})

// -----------------------------------------------------------------
// authFetch
// -----------------------------------------------------------------

describe('authFetch', () => {
  it('adds Authorization header when token is present', async () => {
    sessionStorage.setItem('admin_token', 'test-token-123')
    fetch.mockResolvedValue({ status: 200 })

    await authFetch('/api/cards')

    const [url, opts] = fetch.mock.calls[0]
    expect(url).toBe('/api/cards')
    expect(opts.headers['Authorization']).toBe('Bearer test-token-123')
  })

  it('does not add Authorization header when no token', async () => {
    fetch.mockResolvedValue({ status: 200 })

    await authFetch('/api/cards')

    const [, opts] = fetch.mock.calls[0]
    expect(opts.headers['Authorization']).toBeUndefined()
  })

  it('redirects to login.html on 401 and clears session', async () => {
    sessionStorage.setItem('admin_token', 'old-token')
    sessionStorage.setItem('admin_user', 'ratmas')
    fetch.mockResolvedValue({ status: 401 })

    try { await authFetch('/api/cards') } catch (_) {}

    expect(sessionStorage.getItem('admin_token')).toBeNull()
    expect(sessionStorage.getItem('admin_user')).toBeNull()
  })
})

// -----------------------------------------------------------------
// DataStore localStorage cache
// -----------------------------------------------------------------

describe('DataStore._getCache / _setCache', () => {
  it('returns defaults when nothing stored', () => {
    const cache = DataStore._getCache()
    expect(Array.isArray(cache.cards)).toBe(true)
    expect(cache.cards).toHaveLength(0)
    expect(cache.splashImages).toHaveLength(3)
  })

  it('round-trips data through localStorage', () => {
    DataStore._setCache({ cards: [{ id: 1, name: 'Test' }], splashImages: [] })
    const cache = DataStore._getCache()
    expect(cache.cards).toHaveLength(1)
    expect(cache.cards[0].name).toBe('Test')
    expect(localStorage.getItem('admin_data_cache')).toBeTruthy()
  })

  it('recovers from corrupt JSON in localStorage', () => {
    localStorage.setItem('admin_data_cache', '{broken json')
    const cache = DataStore._getCache()
    expect(Array.isArray(cache.cards)).toBe(true)
    // Corrupt cache should be cleared
    expect(localStorage.getItem('admin_data_cache')).toBeNull()
  })

  it('getCards returns empty array from fresh cache', () => {
    expect(DataStore.getCards()).toEqual([])
  })
})

// -----------------------------------------------------------------
// DataStore.init
// -----------------------------------------------------------------

describe('DataStore.init', () => {
  it('falls back to seed data when server is unreachable', async () => {
    fetch.mockRejectedValue(new Error('Network down'))

    const result = await DataStore.init()

    expect(result).toBe(false)
    expect(DataStore._ready).toBe(true)
    // Seed data written to localStorage
    const raw = localStorage.getItem('admin_data_cache')
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw)
    expect(parsed.splashImages).toHaveLength(3)
  })

  it('preserves existing cache when server is unreachable', async () => {
    localStorage.setItem('admin_data_cache', JSON.stringify({
      cards: [{ id: 99, name: 'Cached' }],
      splashImages: []
    }))
    fetch.mockRejectedValue(new Error('Server down'))

    await DataStore.init()

    const cache = DataStore._getCache()
    expect(cache.cards[0].name).toBe('Cached')
  })

  it('returns true on successful full fetch', async () => {
    const emptyData = []
    const emptyConfig = { sections: [] }
    const emptyJson = vi.fn().mockResolvedValue(emptyData)
    // init() fetches ~18 endpoints; each returns { json: async () => data }
    fetch.mockResolvedValue({ status: 200, json: emptyJson })

    const result = await DataStore.init()
    expect(result).toBe(true)
    expect(DataStore._ready).toBe(true)
  })
})

// -----------------------------------------------------------------
// DataStore offline mutation fallback
// -----------------------------------------------------------------

describe('DataStore offline mutations', () => {
  it('saveCard generates fallback id on network error', async () => {
    DataStore._setCache({ cards: [], splashImages: [] })
    fetch.mockRejectedValue(new Error('Offline'))

    await DataStore.saveCard({ name: 'Offline Card' })

    const cards = DataStore.getCards()
    expect(cards).toHaveLength(1)
    expect(cards[0].name).toBe('Offline Card')
    expect(cards[0].id).toBeGreaterThan(0)
  })

  it('deleteCard removes from local cache before server sync', async () => {
    DataStore._setCache({ cards: [{ id: 1 }, { id: 2 }], splashImages: [] })
    fetch.mockResolvedValue({ ok: true, status: 200 })

    await DataStore.deleteCard(1)

    const cards = DataStore.getCards()
    expect(cards).toHaveLength(1)
    expect(cards[0].id).toBe(2)
  })
})
