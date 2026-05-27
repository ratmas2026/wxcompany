import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'

let pick, parseId

beforeAll(async () => {
  // Use createRequire to avoid ESM loading issues in vitest
  const { createRequire } = await import('module')
  const req = createRequire(import.meta.url)
  const utils = req('../../utils.js')
  pick = utils.pick
  parseId = utils.parseId
})

describe('pick', () => {
  it('returns only whitelisted keys', () => {
    const obj = { name: 'x', phone: '123', secret: 'pw', extra: null }
    expect(pick(obj, 'name', 'phone')).toEqual({ name: 'x', phone: '123' })
  })

  it('skips keys not present in source', () => {
    const obj = { a: 1 }
    expect(pick(obj, 'a', 'b', 'c')).toEqual({ a: 1 })
  })

  it('returns empty object when source is empty', () => {
    expect(pick({}, 'name')).toEqual({})
  })

  it('returns empty object when no keys given', () => {
    expect(pick({ a: 1, b: 2 })).toEqual({})
  })

  it('mass-assignment protection: ignores unwanted fields', () => {
    const body = { name: 'ok', phone: '123', isAdmin: true, role: 'superuser' }
    expect(pick(body, 'name', 'phone', 'title')).not.toHaveProperty('isAdmin')
    expect(pick(body, 'name', 'phone', 'title')).not.toHaveProperty('role')
  })
})

describe('parseId', () => {
  it('parses numeric string', () => {
    expect(parseId('42')).toBe(42)
  })

  it('returns integer for float strings', () => {
    expect(parseId('3.14')).toBe(3)
  })

  it('returns NaN for non-numeric string', () => {
    expect(parseId('abc')).toBeNaN()
  })

  it('returns NaN for empty string', () => {
    expect(parseId('')).toBeNaN()
  })

  it('returns NaN for undefined', () => {
    expect(parseId(undefined)).toBeNaN()
  })
})
