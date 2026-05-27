import { describe, it, expect, beforeAll, vi } from 'vitest'

let createToken, createUserToken, validateToken, getTokenType
let ADMIN_SECRET, USER_SECRET, TOKEN_TTL

beforeAll(async () => {
  process.env.ADMIN_SECRET = 'test-admin-secret-32chars-xxx'
  process.env.USER_SECRET = 'test-user-secret-32chars-yyy'

  const { createRequire } = await import('module')
  const req = createRequire(import.meta.url)
  // Clear auth module cache to pick up new env vars
  delete req.cache[req.resolve('../../auth.js')]
  const auth = req('../../auth.js')
  createToken = auth.createToken
  createUserToken = auth.createUserToken
  validateToken = auth.validateToken
  getTokenType = auth.getTokenType
  ADMIN_SECRET = auth.ADMIN_SECRET
  USER_SECRET = auth.USER_SECRET
  TOKEN_TTL = auth.TOKEN_TTL
})

describe('createToken (admin)', () => {
  it('returns a non-empty base64 string', () => {
    const token = createToken()
    expect(token).toBeTruthy()
    expect(typeof token).toBe('string')
    expect(() => Buffer.from(token, 'base64').toString()).not.toThrow()
  })

  it('produces different tokens when timestamps differ', () => {
    const t1 = createToken()
    // Force different expiry by advancing the clock between calls
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 1000)
    const t2 = createToken()
    vi.restoreAllMocks()
    expect(t1).not.toBe(t2)
  })

  it('is valid when freshly created', () => {
    expect(validateToken(createToken())).toBe(true)
  })
})

describe('createUserToken', () => {
  it('returns a valid token for a phone number', () => {
    const token = createUserToken('13775194009')
    expect(validateToken(token)).toBe(true)
  })

  it('token type is "user"', () => {
    const token = createUserToken('13775194009')
    expect(getTokenType(token)).toBe('user')
  })
})

describe('validateToken', () => {
  it('rejects empty string', () => {
    expect(validateToken('')).toBe(false)
  })

  it('rejects random garbage', () => {
    expect(validateToken('not-a-valid-token')).toBe(false)
  })

  it('rejects valid base64 that is not a token', () => {
    expect(validateToken(Buffer.from('garbage:data').toString('base64'))).toBe(false)
  })

  it('rejects tampered token (wrong HMAC)', () => {
    const token = createToken()
    const decoded = Buffer.from(token, 'base64').toString()
    // Flip last char of the hmac
    const parts = decoded.split(':')
    parts[parts.length - 1] = parts[parts.length - 1].slice(0, -1) + 'x'
    const tampered = Buffer.from(parts.join(':')).toString('base64')
    expect(validateToken(tampered)).toBe(false)
  })

  it('rejects admin token validated with user secret', () => {
    // Create a token with admin prefix but sign with user secret
    const expiry = Date.now() + 86400000
    const payload = 'admin:' + expiry
    const crypto = require('crypto')
    const hmac = crypto.createHmac('sha256', USER_SECRET).update(payload).digest('hex')
    const token = Buffer.from(payload + ':' + hmac).toString('base64')
    expect(validateToken(token)).toBe(false)
  })

  it('rejects nil input', () => {
    expect(validateToken(null)).toBe(false)
    expect(validateToken(undefined)).toBe(false)
  })
})

describe('getTokenType', () => {
  it('returns "admin" for admin token', () => {
    expect(getTokenType(createToken())).toBe('admin')
  })

  it('returns "user" for user token', () => {
    expect(getTokenType(createUserToken('13775194009'))).toBe('user')
  })

  it('returns whatever base64 decodes to for arbitrary strings', () => {
    // getTokenType base64-decodes and splits on ':', returns first part.
    // Even invalid strings can produce some decoded output.
    const result = getTokenType('garbage')
    expect(typeof result).toBe('string')
  })

  it('returns null for null input', () => {
    expect(getTokenType(null)).toBeNull()
  })
})

describe('TOKEN_TTL', () => {
  it('is 24 hours in milliseconds', () => {
    expect(TOKEN_TTL).toBe(24 * 60 * 60 * 1000)
  })
})
