const express = require('express')
const crypto = require('crypto')
const router = express.Router()
const { readData, writeData, pick } = require('../utils')
const { codeStore, generateCode, cleanExpiredCodes, sendSMS, MAX_CODE_STORE_SIZE, createToken, createUserToken, validateToken, ADMIN_USER, ADMIN_PASS, SMS_ACCESS_KEY_ID, SMS_ACCESS_KEY_SECRET } = require('../auth')
const { getDb } = require('../db')

// Login (后台 username/password)
router.post('/login', (req, res) => {
  const { username, password, phone, code } = req.body || {}

  // 手机号+验证码登录（小程序）
  if (phone && code) {
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

    const token = createUserToken(phone)
    const data = readData()
    const user = (data.cards || []).find(c => c.phone === phone)
    if (!user) {
      return res.json({ ok: true, token, user: null })
    }
    return res.json({ ok: true, token, user: { nickName: user.name, title: user.title, company: user.company, department: user.department, phone: user.phone, avatar: user.avatar } })
  }

  // 后台 username/password 登录
  if (username !== ADMIN_USER) {
    return res.status(401).json({ ok: false, error: '用户名或密码错误' })
  }

  // Check DB password hash first, fallback to env var
  let passwordValid = false
  try {
    const db = getDb()
    const result = db.exec('SELECT password_hash FROM users WHERE username = ?', [ADMIN_USER])
    if (result.length > 0 && result[0].values.length > 0 && result[0].values[0][0]) {
      const stored = result[0].values[0][0]
      const [salt, hash] = stored.split(':')
      passwordValid = crypto.createHmac('sha256', salt).update(password).digest('hex') === hash
    }
  } catch (e) { /* table might not exist yet, fall through */ }

  if (!passwordValid && password !== ADMIN_PASS) {
    return res.status(401).json({ ok: false, error: '用户名或密码错误' })
  }
  const token = createToken()
  res.json({ ok: true, token })
})

// 发送短信验证码
router.post('/sms/send', (req, res) => {
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
  const now = Date.now()
  codeStore.set(phone, { code, expires: now + 300000, lastSent: now })

  if (!SMS_ACCESS_KEY_ID || !SMS_ACCESS_KEY_SECRET) {
    console.log('[SMS] SDK未配置，验证码：' + code)
    return res.json({ ok: true })
  }

  sendSMS(phone, code).then(() => {
    res.json({ ok: true })
  }).catch(err => {
    codeStore.delete(phone)
    console.error('[SMS] Send error:', err.message)
    res.status(500).json({ ok: false, error: '短信发送失败，请稍后重试' })
  })
})

// Auth check
router.get('/auth-check', (req, res) => {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false })
  }
  if (!validateToken(auth.slice(7))) {
    return res.status(401).json({ ok: false })
  }
  res.json({ ok: true, username: 'admin' })
})

module.exports = router
