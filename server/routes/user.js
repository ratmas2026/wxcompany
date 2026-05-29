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

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':')
  return crypto.createHmac('sha256', salt).update(password).digest('hex') === hash
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

function verifyOldPassword(oldPassword) {
  const user = getUserRow()
  if (user && user.password_hash) {
    return verifyPassword(oldPassword, user.password_hash)
  }
  return oldPassword === ADMIN_PASS
}

// PUT /api/user/password — 修改密码
router.put('/user/password', (req, res) => {
  const { oldPassword, newPassword } = req.body || {}
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ ok: false, error: '请输入旧密码和新密码' })
  }
  if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
    return res.status(400).json({ ok: false, error: '新密码至少8位，需包含字母和数字' })
  }
  if (!verifyOldPassword(oldPassword)) {
    return res.status(401).json({ ok: false, error: '旧密码错误' })
  }
  upsertUser(ADMIN_USER, { password_hash: hashPassword(newPassword), updated_at: new Date().toISOString() })
  res.json({ ok: true })
})

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

  const code = generateCode()
  codeStore.set(phone, { code, expires: Date.now() + 300000, lastSent: Date.now() })

  const SMS_ACCESS_KEY_ID = require('../auth').SMS_ACCESS_KEY_ID
  const SMS_ACCESS_KEY_SECRET = require('../auth').SMS_ACCESS_KEY_SECRET

  if (!SMS_ACCESS_KEY_ID || !SMS_ACCESS_KEY_SECRET) {
    console.log('[User] SMS SDK未配置，验证码：' + code)
    return res.json({ ok: true })
  }

  sendSMS(phone, code).then(() => {
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

  const entry = codeStore.get(phone)
  if (!entry) {
    return res.status(401).json({ ok: false, error: '请先获取验证码' })
  }
  if (Date.now() > entry.expires) {
    codeStore.delete(phone)
    return res.status(401).json({ ok: false, error: '验证码已过期' })
  }
  if (entry.code !== code) {
    return res.status(401).json({ ok: false, error: '验证码错误' })
  }
  codeStore.delete(phone)

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

  const code = generateCode()
  codeStore.set(email, { code, expires: Date.now() + 300000, lastSent: Date.now() })

  console.log('[User] 邮箱验证码 (dev模式): ' + email + ' → ' + code)
  res.json({ ok: true })
})

// POST /api/user/bind-email/verify — 验证并绑定邮箱
router.post('/user/bind-email/verify', (req, res) => {
  const { email, code } = req.body || {}
  if (!email || !code) {
    return res.status(400).json({ ok: false, error: '参数不完整' })
  }

  const entry = codeStore.get(email)
  if (!entry) {
    return res.status(401).json({ ok: false, error: '请先获取验证码' })
  }
  if (Date.now() > entry.expires) {
    codeStore.delete(email)
    return res.status(401).json({ ok: false, error: '验证码已过期' })
  }
  if (entry.code !== code) {
    return res.status(401).json({ ok: false, error: '验证码错误' })
  }
  codeStore.delete(email)

  upsertUser(ADMIN_USER, { email, email_verified: 1, updated_at: new Date().toISOString() })
  res.json({ ok: true })
})

// GET /api/user/bindings — 获取绑定状态
router.get('/user/bindings', (req, res) => {
  const user = getUserRow()
  res.json({
    ok: true,
    bindings: {
      phone: (user && user.phone_verified && user.phone) || '',
      email: (user && user.email_verified && user.email) || ''
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
    email: (user && user.email_verified && user.email) || ''
  })
})

module.exports = router
