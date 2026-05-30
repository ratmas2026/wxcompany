const PHONE_RE = /^1[3-9]\d{9}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function required(obj, keys) {
  for (const k of keys) {
    const v = obj[k]
    if (v === undefined || v === null || v === '') {
      return `${k} 不能为空`
    }
  }
  return null
}

function isPhone(str) {
  return typeof str === 'string' && PHONE_RE.test(str)
}

function isEmail(str) {
  return typeof str === 'string' && EMAIL_RE.test(str)
}

function allowed(obj, ...keys) {
  const result = {}
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      result[k] = obj[k]
    }
  }
  return result
}

module.exports = { required, isPhone, isEmail, allowed, PHONE_RE, EMAIL_RE }
