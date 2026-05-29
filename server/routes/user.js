const express = require('express')
const crypto = require('crypto')
const router = express.Router()
const { getDb, save } = require('../db')
const { ADMIN_USER, ADMIN_PASS, codeStore, generateCode, cleanExpiredCodes, sendSMS, MAX_CODE_STORE_SIZE } = require('../auth')

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.createHmac('sha256', salt).update(password).digest('hex')
  return salt + ':' + hash
}

function getUserRow() {
  const db = getDb()
  const result = db.exec('SELECT * FROM users WHERE username = ?', [ADMIN_USER])
  if (result.length === 0 || result[0].values.length === 0) return null
  const cols = result[0].columns
  const vals = result[0].values[0]
  const row = {}
  cols.forEach((c, i) => { row[c] = vals[i] })
  return row
}

function upsertUser(username, fields) {
  const db = getDb()
  const existing = getUserRow()
  if (existing) {
    const setClauses = Object.keys(fields).map(k => k + ' = ?').join(', ')
    const values = Object.values(fields)
    values.push(username)
    db.run('UPDATE users SET ' + setClauses + ' WHERE username = ?', values)
  } else {
    const allFields = { username, ...fields, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    const keys = Object.keys(allFields)
    const placeholders = keys.map(() => '?').join(', ')
    const values = keys.map(k => allFields[k])
    db.run('INSERT INTO users (' + keys.join(', ') + ') VALUES (' + placeholders + ')', values)
  }
  save()
}

function verifyCodeEntry(target, code) {
  const entry = codeStore.get(target)
  if (!entry) return '请先获取验证码'
  if (Date.now() > entry.expires) { codeStore.delete(target); return '验证码已过期' }
  if (entry.code !== code) return '验证码错误'
  codeStore.delete(target)
  return null
}

function sendCode(target, type) {
  const code = generateCode()
  codeStore.set(target, { code, expires: Date.now() + 300000, lastSent: Date.now() })

  if (type === 'phone') {
    const { SMS_ACCESS_KEY_ID, SMS_ACCESS_KEY_SECRET } = require('../auth')
    if (!SMS_ACCESS_KEY_ID || !SMS_ACCESS_KEY_SECRET) {
      console.log('[User] SMS SDK未配置，验证码：' + code)
      return Promise.resolve()
    }
    return sendSMS(target, code)
  } else {
    console.log('[User] 邮箱验证码 (dev模式): ' + target + ' → ' + code)
    return Promise.resolve()
  }
}

function maskPhone(phone) {
  if (!phone || phone.length < 11) return phone
  return phone.slice(0, 3) + '*****' + phone.slice(-3)
}

function maskEmail(email) {
  if (!email || !email.includes('@')) return email
  const [name, domain] = email.split('@')
  if (name.length <= 3) return name[0] + '***@' + domain
  return name.slice(0, 3) + '***@' + domain
}

// PUT /api/user/password — 修改密码（通过验证码验证身份）
router.put('/user/password', (req, res) => {
  const { code, verifyTarget, newPassword } = req.body || {}
  if (!code || !verifyTarget || !newPassword) {
    return res.status(400).json({ ok: false, error: '参数不完整' })
  }
  if (newPassword.length < 8 || newPassword.length > 16) {
    return res.status(400).json({ ok: false, error: '密码长度需为8-16位' })
  }
  // 至少两种字符类型：大写/小写/数字/特殊字符
  let types = 0
  if (/[a-z]/.test(newPassword)) types++
  if (/[A-Z]/.test(newPassword)) types++
  if (/\d/.test(newPassword)) types++
  if (/[^a-zA-Z0-9]/.test(newPassword)) types++
  if (types < 2) {
    return res.status(400).json({ ok: false, error: '密码需包含至少两种类型：大写字母、小写字母、数字、特殊字符' })
  }

  const err = verifyCodeEntry(verifyTarget, code)
  if (err) return res.status(401).json({ ok: false, error: err })

  upsertUser(ADMIN_USER, { password_hash: hashPassword(newPassword), updated_at: new Date().toISOString() })
  res.json({ ok: true })
})

// POST /api/user/send-verify-code — 身份验证：向已绑定手机/邮箱发送验证码
router.post('/user/send-verify-code', (req, res) => {
  const { type } = req.body || {}
  if (!type || (type !== 'phone' && type !== 'email')) {
    return res.status(400).json({ ok: false, error: '请指定验证方式' })
  }

  const user = getUserRow()
  const target = type === 'phone' ? (user && user.phone_verified && user.phone) : (user && user.email_verified && user.email)
  if (!target) {
    return res.status(400).json({ ok: false, error: (type === 'phone' ? '未绑定手机号' : '未绑定邮箱') })
  }

  const entry = codeStore.get(target)
  if (entry && (Date.now() - entry.lastSent) < 60000) {
    return res.status(429).json({ ok: false, error: '发送过于频繁，请60秒后再试' })
  }

  cleanExpiredCodes()
  if (codeStore.size >= MAX_CODE_STORE_SIZE) {
    return res.status(503).json({ ok: false, error: '系统繁忙，请稍后重试' })
  }

  sendCode(target, type).then(() => {
    res.json({ ok: true, masked: type === 'phone' ? maskPhone(target) : maskEmail(target) })
  }).catch(err => {
    codeStore.delete(target)
    console.error('[User] Send error:', err.message)
    res.status(500).json({ ok: false, error: '发送失败，请稍后重试' })
  })
})

// POST /api/user/verify-code — 验证码校验（不绑定，仅验证身份）
router.post('/user/verify-code', (req, res) => {
  const { type, code } = req.body || {}
  if (!type || !code) {
    return res.status(400).json({ ok: false, error: '参数不完整' })
  }

  const user = getUserRow()
  const target = type === 'phone' ? (user && user.phone_verified && user.phone) : (user && user.email_verified && user.email)
  if (!target) {
    return res.status(400).json({ ok: false, error: (type === 'phone' ? '未绑定手机号' : '未绑定邮箱') })
  }

  const err = verifyCodeEntry(target, code)
  if (err) return res.status(401).json({ ok: false, error: err })

  res.json({ ok: true, verifyTarget: target })
})

// --- 绑定管理（首次绑定 + 更换）---

// POST /api/user/bind-phone — 发送手机验证码
router.post('/user/bind-phone', (req, res) => {
  const { phone } = req.body || {}
  if (!phone || !/^1\d{10}$/.test(phone)) {
    return res.status(400).json({ ok: false, error: '请输入正确的11位手机号' })
  }

  const entry = codeStore.get(phone)
  if (entry && (Date.now() - entry.lastSent) < 60000) {
    return res.status(429).json({ ok: false, error: '发送过于频繁，请60秒后再试' })
  }

  cleanExpiredCodes()
  if (codeStore.size >= MAX_CODE_STORE_SIZE) {
    return res.status(503).json({ ok: false, error: '系统繁忙，请稍后重试' })
  }

  sendCode(phone, 'phone').then(() => {
    res.json({ ok: true })
  }).catch(err => {
    codeStore.delete(phone)
    console.error('[User] SMS send error:', err.message)
    res.status(500).json({ ok: false, error: '短信发送失败，请稍后重试' })
  })
})

// POST /api/user/bind-phone/verify — 验证并绑定手机
router.post('/user/bind-phone/verify', (req, res) => {
  const { phone, code } = req.body || {}
  if (!phone || !code) {
    return res.status(400).json({ ok: false, error: '参数不完整' })
  }

  const err = verifyCodeEntry(phone, code)
  if (err) return res.status(401).json({ ok: false, error: err })

  upsertUser(ADMIN_USER, { phone, phone_verified: 1, updated_at: new Date().toISOString() })
  res.json({ ok: true })
})

// POST /api/user/bind-email — 发送邮箱验证码
router.post('/user/bind-email', (req, res) => {
  const { email } = req.body || {}
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: '请输入正确的邮箱地址' })
  }

  const entry = codeStore.get(email)
  if (entry && (Date.now() - entry.lastSent) < 60000) {
    return res.status(429).json({ ok: false, error: '发送过于频繁，请60秒后再试' })
  }

  cleanExpiredCodes()
  if (codeStore.size >= MAX_CODE_STORE_SIZE) {
    return res.status(503).json({ ok: false, error: '系统繁忙，请稍后重试' })
  }

  sendCode(email, 'email').then(() => {
    res.json({ ok: true })
  }).catch(err => {
    codeStore.delete(email)
    console.error('[User] Email send error:', err.message)
    res.status(500).json({ ok: false, error: '发送失败，请稍后重试' })
  })
})

// POST /api/user/bind-email/verify — 验证并绑定邮箱
router.post('/user/bind-email/verify', (req, res) => {
  const { email, code } = req.body || {}
  if (!email || !code) {
    return res.status(400).json({ ok: false, error: '参数不完整' })
  }

  const err = verifyCodeEntry(email, code)
  if (err) return res.status(401).json({ ok: false, error: err })

  upsertUser(ADMIN_USER, { email, email_verified: 1, updated_at: new Date().toISOString() })
  res.json({ ok: true })
})

// GET /api/user/bindings — 获取绑定状态（含脱敏信息）
router.get('/user/bindings', (req, res) => {
  const user = getUserRow()
  res.json({
    ok: true,
    bindings: {
      phone: (user && user.phone_verified && user.phone) || '',
      phoneMasked: (user && user.phone_verified && user.phone) ? maskPhone(user.phone) : '',
      email: (user && user.email_verified && user.email) || '',
      emailMasked: (user && user.email_verified && user.email) ? maskEmail(user.email) : ''
    }
  })
})

// GET /api/user/profile — 获取用户信息
router.get('/user/profile', (req, res) => {
  const user = getUserRow()
  res.json({
    ok: true,
    nickName: ADMIN_USER,
    phone: (user && user.phone_verified && user.phone) || '',
    email: (user && user.email_verified && user.email) || '',
    hasPassword: !!(user && user.password_hash),
    phoneMasked: (user && user.phone_verified && user.phone) ? maskPhone(user.phone) : '',
    emailMasked: (user && user.email_verified && user.email) ? maskEmail(user.email) : ''
  })
})

module.exports = router
