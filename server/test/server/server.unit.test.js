import { describe, it, expect, beforeEach } from 'vitest'

// Import the exported functions from server.js
const { generateCode, createToken, validateToken } = require('../../server.js')

describe('generateCode', () => {
  it('returns a string', () => {
    const code = generateCode()
    expect(typeof code).toBe('string')
  })

  it('returns exactly 6 characters', () => {
    for (let i = 0; i < 100; i++) {
      expect(generateCode()).toHaveLength(6)
    }
  })

  it('returns only numeric digits', () => {
    for (let i = 0; i < 100; i++) {
      expect(generateCode()).toMatch(/^\d{6}$/)
    }
  })

  it('returns value in range [100000, 999999]', () => {
    for (let i = 0; i < 100; i++) {
      const n = parseInt(generateCode(), 10)
      expect(n).toBeGreaterThanOrEqual(100000)
      expect(n).toBeLessThanOrEqual(999999)
    }
  })

  it('does not always return the same value (probabilistic)', () => {
    const codes = new Set()
    for (let i = 0; i < 50; i++) {
      codes.add(generateCode())
    }
    // Extremely unlikely that 50 calls all return the same 6-digit code
    expect(codes.size).toBeGreaterThan(1)
  })
})

describe('createToken / validateToken', () => {
  // Ensure ADMIN_SECRET is set in the test environment
  beforeEach(() => {
    // process.env.ADMIN_SECRET is set in setup.js
    expect(process.env.ADMIN_SECRET).toBeDefined()
  })

  describe('createToken', () => {
    it('returns a non-empty string', () => {
      const token = createToken()
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(0)
    })

    it('returns valid base64 characters only', () => {
      const token = createToken()
      expect(token).toMatch(/^[A-Za-z0-9+/=]+$/)
    })

    it('creates a token that validateToken accepts (round-trip)', () => {
      const token = createToken()
      const result = validateToken(token)
      expect(result).toBe(true)
    })
  })

  describe('validateToken — normal cases', () => {
    it('accepts a freshly created token', () => {
      const token = createToken()
      expect(validateToken(token)).toBe(true)
    })
  })

  describe('validateToken — error cases', () => {
    it('returns false for an empty string', () => {
      expect(validateToken('')).toBe(false)
    })

    it('returns false for null/undefined', () => {
      expect(validateToken(null)).toBe(false)
      expect(validateToken(undefined)).toBe(false)
    })

    it('returns false for invalid base64', () => {
      expect(validateToken('!!!not-base64!!!')).toBe(false)
    })

    it('returns false for a tampered payload (modified after decode)', () => {
      const token = createToken()
      // Decode, modify the timestamp, re-encode (break HMAC)
      const decoded = Buffer.from(token, 'base64').toString()
      // Replace last 4 hex chars of the HMAC (end of string)
      const tampered = decoded.slice(0, -4) + 'dead'
      const tamperedToken = Buffer.from(tampered).toString('base64')
      expect(validateToken(tamperedToken)).toBe(false)
    })

    it('returns false for a tampered token (middle char replaced)', () => {
      const token = createToken()
      // Replace a character in the middle of the base64 string (before padding)
      // to actually corrupt the decoded payload+hmac
      const pos = Math.floor(token.length / 2)
      const tamperedToken = token.slice(0, pos) + (token[pos] === 'A' ? 'B' : 'A') + token.slice(pos + 1)
      expect(validateToken(tamperedToken)).toBe(false)
    })

    it('returns false for an expired token', () => {
      const crypto = require('crypto')
      const pastExpiry = Date.now() - 1000 // 1 second ago (expired)
      const payload = 'admin:' + pastExpiry.toString()
      const hmac = crypto.createHmac('sha256', process.env.ADMIN_SECRET).update(payload).digest('hex')
      const expiredToken = Buffer.from(payload + ':' + hmac).toString('base64')
      expect(validateToken(expiredToken)).toBe(false)
    })
  })

  describe('validateToken — boundary conditions', () => {
    it('handles very long malformed token gracefully', () => {
      const longStr = 'x'.repeat(10000)
      expect(validateToken(longStr)).toBe(false)
    })

    it('rejects a token where the base64 decodes to no colon separator', () => {
      // "no-colon" in base64
      const token = Buffer.from('nocolon').toString('base64')
      expect(validateToken(token)).toBe(false)
    })
  })
})
