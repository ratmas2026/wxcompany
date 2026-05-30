const crypto = require('crypto')

// SMS config from env
const SMS_ACCESS_KEY_ID = process.env.SMS_ACCESS_KEY_ID || ''
const SMS_ACCESS_KEY_SECRET = process.env.SMS_ACCESS_KEY_SECRET || ''
const SMS_SIGN_NAME = process.env.SMS_SIGN_NAME || ''
const SMS_TEMPLATE_CODE = process.env.SMS_TEMPLATE_CODE || ''

// 验证码存储（phone → {code, expires, lastSent}）
const codeStore = new Map()

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function cleanExpiredCodes() {
  const now = Date.now()
  for (const [phone, entry] of codeStore) {
    if (entry.expires < now) codeStore.delete(phone)
  }
}

// Periodic cleanup: purge expired codes every 60 seconds
setInterval(cleanExpiredCodes, 60000)

// Prevent unbounded growth from abuse
const MAX_CODE_STORE_SIZE = 1000

async function sendSMS(phone, code) {
  const Core = require('@alicloud/pop-core')
  const client = new Core({
    accessKeyId: SMS_ACCESS_KEY_ID,
    accessKeySecret: SMS_ACCESS_KEY_SECRET,
    endpoint: 'https://dysmsapi.aliyuncs.com',
    apiVersion: '2017-05-25'
  })
  const res = await client.request('SendSms', {
    PhoneNumbers: phone,
    SignName: SMS_SIGN_NAME,
    TemplateCode: SMS_TEMPLATE_CODE,
    TemplateParam: JSON.stringify({ code })
  }, { method: 'POST' })
  if (res.Code !== 'OK') {
    throw new Error(res.Message || 'SMS send failed')
  }
  return res
}

// 登录鉴权 — 环境变量未设置时生成随机凭据，绝不用硬编码默认值
let ADMIN_USER = process.env.ADMIN_USER
let ADMIN_PASS = process.env.ADMIN_PASS

if (!ADMIN_USER || !ADMIN_PASS) {
  const randUser = 'admin_' + crypto.randomBytes(4).toString('hex')
  const randPass = crypto.randomBytes(16).toString('hex')
  if (!ADMIN_USER) ADMIN_USER = randUser
  if (!ADMIN_PASS) ADMIN_PASS = randPass
  console.warn('⚠  ADMIN_USER / ADMIN_PASS 未在环境变量中设置！')
  if (!process.env.ADMIN_USER) console.warn('   ADMIN_USER 已随机生成: ' + randUser)
  if (!process.env.ADMIN_PASS) console.warn('   ADMIN_PASS 已随机生成: ' + randPass)
  console.warn('   请在 ecosystem.config.js 中设置永久凭据，重启后此随机凭据将失效。')
}

const ADMIN_SECRET = process.env.ADMIN_SECRET || crypto.randomBytes(32).toString('hex')
const USER_SECRET = process.env.USER_SECRET || crypto.randomBytes(32).toString('hex')
const TOKEN_TTL = 24 * 60 * 60 * 1000 // 24小时

function createToken() {
  const expiry = Date.now() + TOKEN_TTL
  const payload = 'admin:' + expiry.toString()
  const hmac = crypto.createHmac('sha256', ADMIN_SECRET).update(payload).digest('hex')
  return Buffer.from(payload + ':' + hmac).toString('base64')
}

function createUserToken(phone) {
  const expiry = Date.now() + TOKEN_TTL
  const payload = 'user:' + phone + ':' + expiry.toString()
  const hmac = crypto.createHmac('sha256', USER_SECRET).update(payload).digest('hex')
  return Buffer.from(payload + ':' + hmac).toString('base64')
}

function validateToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64').toString()
    const parts = decoded.split(':')
    if (parts.length < 3) return false
    const hmac = parts.pop()
    const payload = parts.join(':')
    if (Date.now() > parseInt(parts[parts.length - 1])) return false
    const prefix = parts[0]
    const secret = prefix === 'user' ? USER_SECRET : ADMIN_SECRET
    const expectedHmac = crypto.createHmac('sha256', secret).update(payload).digest('hex')
    return hmac === expectedHmac
  } catch (e) { return false }
}

function getTokenType(token) {
  try {
    const decoded = Buffer.from(token, 'base64').toString()
    return decoded.split(':')[0]
  } catch (e) { return null }
}

// --- Rate Limiting ---
const rateLimit = require('express-rate-limit')

const skipInTest = (req) => process.env.NODE_ENV === 'test' || process.env.VITEST

// Global API limiter: 200 requests per minute per IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: { error: 'Too many requests, please try again later.' }
})

// Strict limiter for login: 10 requests per minute per IP (brute force protection)
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: { ok: false, error: '登录尝试过于频繁，请稍后再试' }
})

// SMS limiter: 3 requests per minute per IP (anti-abuse)
const smsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: { ok: false, error: '短信发送过于频繁，请稍后再试' }
})

// Template upload limiter: 10 requests per minute per IP (anti-abuse)
const templateUploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: { ok: false, error: '模板上传过于频繁，请稍后再试' }
})

// Template render limiter: 60 requests per minute per IP (anti-cache-flood)
const templateRenderLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: { error: '请求过于频繁，请稍后再试' }
})

// --- Auth Middleware ---
// Admin-only GET paths (contain sensitive data, require token even for GET)
const ADMIN_GET_PREFIXES = [
  '/api/messages'
]
// Routes accessible with user token (mini-program)
const USER_ROUTES = [
  '/api/inquiry'
]
function isAdminGet(path) {
  return ADMIN_GET_PREFIXES.some(p => path.startsWith(p))
}
function isUserRoute(path, method) {
  return USER_ROUTES.some(p => path === p) && method === 'POST'
}

function authMiddleware(req, res, next) {
  if (req.path === '/api/login' || req.path === '/api/auth-check' || req.path === '/api/sms/send') return next()
  if (!req.path.startsWith('/api/') && req.path !== '/api') return next()
  if (req.method === 'GET' && !isAdminGet(req.path)) return next()

  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized', code: 'NO_TOKEN' })
  }
  const token = auth.slice(7)
  if (!validateToken(token)) {
    return res.status(401).json({ error: 'Unauthorized', code: 'INVALID_TOKEN' })
  }

  const tokenType = getTokenType(token)
  if (tokenType === 'user' && !isUserRoute(req.path, req.method)) {
    return res.status(403).json({ error: 'Forbidden', code: 'ADMIN_ONLY' })
  }

  next()
}

module.exports = {
  codeStore,
  generateCode,
  cleanExpiredCodes,
  sendSMS,
  MAX_CODE_STORE_SIZE,
  ADMIN_USER,
  ADMIN_PASS,
  ADMIN_SECRET,
  USER_SECRET,
  TOKEN_TTL,
  createToken,
  createUserToken,
  validateToken,
  getTokenType,
  globalLimiter,
  loginLimiter,
  smsLimiter,
  templateUploadLimiter,
  templateRenderLimiter,
  authMiddleware,
  SMS_ACCESS_KEY_ID,
  SMS_ACCESS_KEY_SECRET
}
