import { describe, it, expect } from 'vitest'

let required, isPhone, isEmail, allowed

beforeAll(async () => {
  const mod = require('../../validate.js')
  required = mod.required
  isPhone = mod.isPhone
  isEmail = mod.isEmail
  allowed = mod.allowed
})

describe('validate.required', () => {
  it('returns null when all keys are present and non-empty', () => {
    expect(required({ name: 'John', phone: '13912345678' }, ['name', 'phone'])).toBe(null)
  })

  it('returns error when a key is missing', () => {
    expect(required({ name: 'John' }, ['name', 'phone'])).toBe('phone 不能为空')
  })

  it('returns error when a key is null', () => {
    expect(required({ name: null, phone: '123' }, ['name', 'phone'])).toBe('name 不能为空')
  })

  it('returns error when a key is empty string', () => {
    expect(required({ name: '', phone: '123' }, ['name', 'phone'])).toBe('name 不能为空')
  })

  it('returns error when a key is undefined', () => {
    expect(required({ name: 'John' }, ['name', 'phone'])).toBe('phone 不能为空')
  })

  it('returns first error when multiple keys fail', () => {
    expect(required({}, ['name', 'phone'])).toBe('name 不能为空')
  })

  it('returns null with empty keys array', () => {
    expect(required({}, [])).toBe(null)
  })
})

describe('validate.isPhone', () => {
  it('returns true for valid Chinese mobile', () => {
    expect(isPhone('13912345678')).toBe(true)
    expect(isPhone('15800001111')).toBe(true)
  })

  it('returns false for invalid formats', () => {
    expect(isPhone('12345')).toBe(false)
    expect(isPhone('12345678901')).toBe(false)
    expect(isPhone('abc')).toBe(false)
    expect(isPhone('')).toBe(false)
    expect(isPhone(null)).toBe(false)
    expect(isPhone(undefined)).toBe(false)
  })
})

describe('validate.isEmail', () => {
  it('returns true for valid emails', () => {
    expect(isEmail('test@example.com')).toBe(true)
  })

  it('returns false for invalid emails', () => {
    expect(isEmail('notanemail')).toBe(false)
    expect(isEmail('')).toBe(false)
    expect(isEmail(null)).toBe(false)
  })
})

describe('validate.allowed', () => {
  it('returns only whitelisted keys', () => {
    const result = allowed(
      { name: 'John', phone: '13912345678', evil: 'payload' },
      'name', 'phone', 'title'
    )
    expect(result).toEqual({ name: 'John', phone: '13912345678' })
  })

  it('skips keys not on the object', () => {
    const result = allowed({ name: 'John' }, 'name', 'title')
    expect(result).toEqual({ name: 'John' })
  })

  it('returns empty object when no keys match', () => {
    const result = allowed({ name: 'John' }, 'title', 'department')
    expect(result).toEqual({})
  })

  it('respects own properties only', () => {
    const obj = Object.create({ injected: 'bad' })
    obj.name = 'safe'
    const result = allowed(obj, 'name', 'injected')
    expect(result).toEqual({ name: 'safe' })
  })
})
