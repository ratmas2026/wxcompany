const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const multer = require('multer')
const db = require('./db')
const crypto = require('crypto')
const compression = require('compression')
const rateLimit = require('express-rate-limit')

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
    const hmac = parts.pop()
    const payload = parts.join(':')
    const prefix = parts[0]
    if (Date.now() > parseInt(parts[parts.length - 1])) return false
    const secret = prefix === 'user' ? USER_SECRET : ADMIN_SECRET
    const expectedHmac = crypto.createHmac('sha256', secret).update(payload).digest('hex')
    return hmac === expectedHmac
  } catch (e) { return false }
}

function getTokenType(token) {
  try {
    const decoded = Buffer.from(token, 'base64').toString()
    return decoded.split(':')[0] // 'admin' or 'user'
  } catch (e) { return null }
}

const app = express()
const PORT = 3456
const UPLOADS_DIR = path.join(__dirname, 'uploads')
var VIDEOS_DIR = path.join(UPLOADS_DIR, 'videos')
var COVERS_DIR = path.join(UPLOADS_DIR, 'covers')
var AVATARS_DIR = path.join(UPLOADS_DIR, 'avatars')
var SPLASH_DIR = path.join(UPLOADS_DIR, 'splash')
var PROFILE_DIR = path.join(UPLOADS_DIR, 'profile')
var HONORS_DIR = path.join(UPLOADS_DIR, 'honors')
var PROJECTS_DIR = path.join(UPLOADS_DIR, 'projects')
var EDITOR_DIR = path.join(UPLOADS_DIR, 'editor')
var BUSINESS_MODULES_DIR = path.join(UPLOADS_DIR, 'business-modules')
var PERFORMANCE_DIR = path.join(UPLOADS_DIR, 'performance')

// Ensure upload directories exist
if (!fs.existsSync(VIDEOS_DIR)) fs.mkdirSync(VIDEOS_DIR, { recursive: true })
if (!fs.existsSync(COVERS_DIR)) fs.mkdirSync(COVERS_DIR, { recursive: true })
if (!fs.existsSync(AVATARS_DIR)) fs.mkdirSync(AVATARS_DIR, { recursive: true })
if (!fs.existsSync(SPLASH_DIR)) fs.mkdirSync(SPLASH_DIR, { recursive: true })
if (!fs.existsSync(PROFILE_DIR)) fs.mkdirSync(PROFILE_DIR, { recursive: true })
if (!fs.existsSync(HONORS_DIR)) fs.mkdirSync(HONORS_DIR, { recursive: true })
if (!fs.existsSync(PROJECTS_DIR)) fs.mkdirSync(PROJECTS_DIR, { recursive: true })
if (!fs.existsSync(EDITOR_DIR)) fs.mkdirSync(EDITOR_DIR, { recursive: true })
if (!fs.existsSync(BUSINESS_MODULES_DIR)) fs.mkdirSync(BUSINESS_MODULES_DIR, { recursive: true })
if (!fs.existsSync(PERFORMANCE_DIR)) fs.mkdirSync(PERFORMANCE_DIR, { recursive: true })

// Multer config
var videoStorage = multer.diskStorage({
  destination: function(req, file, cb) { cb(null, VIDEOS_DIR) },
  filename: function(req, file, cb) {
    var ext = path.extname(file.originalname) || '.mp4'
    cb(null, 'video_' + Date.now() + '_' + Math.round(Math.random() * 1000) + ext)
  }
})
var coverStorage = multer.diskStorage({
  destination: function(req, file, cb) { cb(null, COVERS_DIR) },
  filename: function(req, file, cb) {
    var ext = path.extname(file.originalname) || '.jpg'
    cb(null, 'cover_' + Date.now() + '_' + Math.round(Math.random() * 1000) + ext)
  }
})
var imageMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
var videoMimes = ['video/mp4', 'video/webm']
function imageFilter(req, file, cb) {
  if (imageMimes.includes(file.mimetype)) { cb(null, true) }
  else { cb(new Error('仅支持 JPEG/PNG/GIF/WebP 图片格式'), false) }
}
function videoFilter(req, file, cb) {
  if (videoMimes.includes(file.mimetype)) { cb(null, true) }
  else { cb(new Error('仅支持 MP4/WebM 视频格式'), false) }
}

var uploadVideo = multer({ storage: videoStorage, limits: { fileSize: 50 * 1048576 }, fileFilter: videoFilter })
var uploadCover = multer({ storage: coverStorage, limits: { fileSize: 5 * 1048576 }, fileFilter: imageFilter })

var avatarStorage = multer.diskStorage({
  destination: function(req, file, cb) { cb(null, AVATARS_DIR) },
  filename: function(req, file, cb) {
    var ext = path.extname(file.originalname) || '.jpg'
    cb(null, 'avatar_' + Date.now() + '_' + Math.round(Math.random() * 1000) + ext)
  }
})
var uploadAvatar = multer({ storage: avatarStorage, limits: { fileSize: 1 * 1048576 }, fileFilter: imageFilter })

var splashStorage = multer.diskStorage({
  destination: function(req, file, cb) { cb(null, SPLASH_DIR) },
  filename: function(req, file, cb) {
    var ext = path.extname(file.originalname) || '.jpg'
    cb(null, 'splash_' + Date.now() + '_' + Math.round(Math.random() * 1000) + ext)
  }
})
var uploadSplash = multer({ storage: splashStorage, limits: { fileSize: 5 * 1048576 }, fileFilter: imageFilter })

var profileStorage = multer.diskStorage({
  destination: function(req, file, cb) { cb(null, PROFILE_DIR) },
  filename: function(req, file, cb) {
    var ext = path.extname(file.originalname) || '.jpg'
    cb(null, 'profile_' + Date.now() + '_' + Math.round(Math.random() * 1000) + ext)
  }
})
var uploadProfile = multer({ storage: profileStorage, limits: { fileSize: 5 * 1048576 }, fileFilter: imageFilter })

var honorsStorage = multer.diskStorage({
  destination: function(req, file, cb) { cb(null, HONORS_DIR) },
  filename: function(req, file, cb) {
    var ext = path.extname(file.originalname) || '.jpg'
    cb(null, 'honor_' + Date.now() + '_' + Math.round(Math.random() * 1000) + ext)
  }
})
var uploadHonors = multer({ storage: honorsStorage, limits: { fileSize: 5 * 1048576 }, fileFilter: imageFilter })

var projectsStorage = multer.diskStorage({
  destination: function(req, file, cb) { cb(null, PROJECTS_DIR) },
  filename: function(req, file, cb) {
    var ext = path.extname(file.originalname) || '.jpg'
    cb(null, 'project_' + Date.now() + '_' + Math.round(Math.random() * 1000) + ext)
  }
})
var uploadProjects = multer({ storage: projectsStorage, limits: { fileSize: 5 * 1048576 }, fileFilter: imageFilter })

var editorStorage = multer.diskStorage({
  destination: function(req, file, cb) { cb(null, EDITOR_DIR) },
  filename: function(req, file, cb) {
    var ext = path.extname(file.originalname) || '.jpg'
    cb(null, 'editor_' + Date.now() + '_' + Math.round(Math.random() * 1000) + ext)
  }
})
var uploadEditor = multer({ storage: editorStorage, limits: { fileSize: 50 * 1048576 }, fileFilter: imageFilter })

var businessModuleStorage = multer.diskStorage({
  destination: function(req, file, cb) { cb(null, BUSINESS_MODULES_DIR) },
  filename: function(req, file, cb) {
    var ext = path.extname(file.originalname) || '.jpg'
    cb(null, 'bm_' + Date.now() + '_' + Math.round(Math.random() * 1000) + ext)
  }
})
var uploadBusinessModule = multer({ storage: businessModuleStorage, limits: { fileSize: 5 * 1048576 }, fileFilter: imageFilter })

var performanceStorage = multer.diskStorage({
  destination: function(req, file, cb) { cb(null, PERFORMANCE_DIR) },
  filename: function(req, file, cb) {
    var ext = path.extname(file.originalname) || '.jpg'
    cb(null, 'performance_' + Date.now() + '_' + Math.round(Math.random() * 1000) + ext)
  }
})
var uploadPerformance = multer({ storage: performanceStorage, limits: { fileSize: 5 * 1048576 }, fileFilter: imageFilter })

app.use(cors())
app.use(compression())
app.use(express.json({ limit: '10mb' }))

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'admin')))
app.use('/uploads', express.static(UPLOADS_DIR, {
  maxAge: '7d',
  setHeaders(res, filePath) {
    if (/\.(jpg|jpeg|png|gif|webp|svg|mp4|webm|ico)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable')
    }
  }
}))

// Multer error handling
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large' })
  }
  if (err.name === 'MulterError') {
    return res.status(400).json({ error: err.message })
  }
  next(err)
})

// --- Rate Limiting ---
// Disable rate limiting in test environment
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

app.use('/api', globalLimiter)
app.use('/api/login', loginLimiter)
app.use('/api/sms/send', smsLimiter)

// --- Auth Middleware ---
// Admin-only GET paths (contain sensitive data, require token even for GET)
const ADMIN_GET_PREFIXES = [
  '/api/messages'  // inquiry messages contain user PII
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
  // 登录和鉴权检查始终放行 + 短信接口放行
  if (req.path === '/api/login' || req.path === '/api/auth-check' || req.path === '/api/sms/send') return next()
  // 非 API 路径放行（静态文件等）
  if (!req.path.startsWith('/api/') && req.path !== '/api') return next()
  // 小程序公开 GET 接口放行（管理员敏感路径除外）
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

app.use(authMiddleware)

// Helper: extract only allowed fields from an object (mass-assignment protection)
function pick(obj, ...keys) {
  const result = {}
  for (const k of keys) { if (k in obj) result[k] = obj[k] }
  return result
}

// Login (后台 username/password)
app.post('/api/login', (req, res) => {
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
  if (username !== ADMIN_USER || password !== ADMIN_PASS) {
    return res.status(401).json({ ok: false, error: '用户名或密码错误' })
  }
  const token = createToken()
  res.json({ ok: true, token })
})

// 发送短信验证码
app.post('/api/sms/send', (req, res) => {
  const { phone } = req.body || {}
  if (!phone || !/^1\d{10}$/.test(phone)) {
    return res.status(400).json({ ok: false, error: '请输入正确的11位手机号' })
  }

  const entry = codeStore.get(phone)
  if (entry && (Date.now() - entry.lastSent) < 60000) {
    return res.status(429).json({ ok: false, error: '发送过于频繁，请60秒后再试' })
  }

  cleanExpiredCodes()

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
app.get('/api/auth-check', (req, res) => {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false })
  }
  if (!validateToken(auth.slice(7))) {
    return res.status(401).json({ ok: false })
  }
  res.json({ ok: true, username: 'admin' })
})

// --- Helpers ---
function readData() {
  return db.readData()
}

function writeData(data) {
  db.writeData(data)
}

// API health
app.get('/api', (req, res) => res.json({ ok: true, endpoints: ['company/profile','company/profile/:id','cards','messages','positions','videos','honors','honors/:id','projects','projects/:id','splash','user/phone/:phone','inquiry','reset','upload/video','upload/cover','upload/avatar','upload/splash','upload/profile','upload/honors','upload/projects','upload/editor','business-modules','business-modules/:id','business-modules/:mid/cards','business-modules/:mid/cards/:cid','upload/business-module'] }))

// --- Company Infos (new multi-row table) ---
app.get('/api/company-infos', (req, res) => {
  const data = readData()
  if (!data.companyInfos) data.companyInfos = []
  res.json(data.companyInfos.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)))
})

app.get('/api/company-infos/:id', (req, res) => {
  const data = readData()
  const item = (data.companyInfos || []).find(ci => ci.id === parseInt(req.params.id))
  if (!item) return res.status(404).json({ error: 'Not found' })
  res.json(item)
})

app.post('/api/company-infos', (req, res) => {
  const data = readData()
  if ((data.companyInfos || []).length >= 1) {
    return res.status(400).json({ error: '仅允许创建一个企业信息，请编辑现有条目' })
  }
  if (!data.companyInfos) data.companyInfos = []
  if (!data.nextId.companyInfos) data.nextId.companyInfos = 1
  const item = {
    ...pick(req.body, 'name', 'legalPerson', 'phone', 'address', 'longitude', 'latitude', 'website', 'description', 'sortOrder', 'status'),
    id: data.nextId.companyInfos++,
    name: req.body.name || '',
    legalPerson: req.body.legalPerson || '',
    phone: req.body.phone || '',
    address: req.body.address || '',
    longitude: req.body.longitude || null,
    latitude: req.body.latitude || null,
    website: req.body.website || '',
    description: req.body.description || '',
    sortOrder: req.body.sortOrder || 0,
    status: req.body.status !== undefined ? req.body.status : true,
    createdAt: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString()
  }
  data.companyInfos.push(item)
  writeData(data)
  res.json(item)
})

app.put('/api/company-infos/:id', (req, res) => {
  const data = readData()
  const idx = (data.companyInfos || []).findIndex(ci => ci.id === parseInt(req.params.id))
  if (idx < 0) return res.status(404).json({ error: 'Not found' })
  data.companyInfos[idx] = { ...data.companyInfos[idx], ...pick(req.body, 'name', 'legalPerson', 'phone', 'address', 'longitude', 'latitude', 'website', 'description', 'sortOrder', 'status'), id: data.companyInfos[idx].id, updatedAt: new Date().toISOString() }
  writeData(data)
  res.json(data.companyInfos[idx])
})

app.delete('/api/company-infos/:id', (req, res) => {
  const data = readData()
  data.companyInfos = (data.companyInfos || []).filter(ci => ci.id !== parseInt(req.params.id))
  writeData(data)
  res.json({ ok: true })
})

app.get('/api/company/profile', (req, res) => {
  const data = readData()
  if (!data.companyProfiles) data.companyProfiles = []
  res.json(data.companyProfiles)
})

app.get('/api/company/profile/:id', (req, res) => {
  const data = readData()
  const profile = (data.companyProfiles || []).find(p => p.id === parseInt(req.params.id))
  if (!profile) return res.status(404).json({ error: 'Not found' })
  res.json(profile)
})

app.post('/api/company/profile', (req, res) => {
  const data = readData()
  if (!data.companyProfiles) data.companyProfiles = []
  if (!data.nextId.companyProfiles) data.nextId.companyProfiles = 1
  const ts = Date.now() + '_' + Math.random().toString(36).slice(2, 6)
  const newId = data.nextId.companyProfiles++
  const profile = {
    id: newId,
    title: req.body.title || '',
    sortOrder: req.body.sortOrder !== undefined ? req.body.sortOrder : newId,
    cover: req.body.cover || {
      backgroundImage: '',
      video: '',
      zones: {
        top: { textBoxes: [{ id: 'tb_' + ts + '_t0', text: req.body.title || '', fontFamily: 'sans-serif', fontSize: 'large', textAlign: 'center' }] },
        middle: { textBoxes: [{ id: 'tb_' + ts + '_m0', text: '', fontFamily: 'sans-serif', fontSize: 'medium', textAlign: 'left' }] },
        bottom: { textBoxes: [{ id: 'tb_' + ts + '_b0', text: '', fontFamily: 'sans-serif', fontSize: 'small', textAlign: 'left' }] }
      }
    },
    detail: req.body.detail || {
      title: req.body.title || '',
      body: '',
      images: [],
      video: '',
      detailEntry: true
    },
    createdAt: req.body.createdAt || new Date().toISOString().split('T')[0]
  }
  data.companyProfiles.unshift(profile)
  writeData(data)
  res.json(profile)
})

app.put('/api/company/profile/:id', (req, res) => {
  const data = readData()
  const idx = (data.companyProfiles || []).findIndex(p => p.id === parseInt(req.params.id))
  if (idx < 0) return res.status(404).json({ error: 'Not found' })
  const body = pick(req.body, 'title', 'sortOrder', 'cover', 'detail', 'status')
  if (typeof body.cover === 'string') {
    try { body.cover = JSON.parse(body.cover) } catch (e) { body.cover = { backgroundImage: '', video: '', zones: {} } }
  }
  if (typeof body.detail === 'string') {
    try { body.detail = JSON.parse(body.detail) } catch (e) { body.detail = { title: '', body: '', images: [], video: '', detailEntry: true } }
  }
  data.companyProfiles[idx] = { ...data.companyProfiles[idx], ...body, id: data.companyProfiles[idx].id }

  writeData(data)
  res.json(data.companyProfiles[idx])
})

app.delete('/api/company/profile/:id', (req, res) => {
  const data = readData()
  const id = parseInt(req.params.id)
  data.companyProfiles = (data.companyProfiles || []).filter(p => p.id !== id)
  // 清理展示方案中被删除卡片的引用
  const config = data.companyProfileConfig || { sections: [] };
  (config.sections || []).forEach(sec => {
    sec.selectedIds = (sec.selectedIds || []).filter(sid => sid !== id)
  })
  writeData(data)
  res.json({ ok: true })
})

// Company Profile Config
app.get('/api/company/profile-config', (req, res) => {
  const data = readData()
  if (!data.companyProfileConfig) data.companyProfileConfig = { sections: [] }
  const config = data.companyProfileConfig
  let sections = config.sections || []
  // Migration: assign sortOrder and status to sections that don't have them
  let migrated = false
  sections.forEach((sec, idx) => {
    if (sec.sortOrder === undefined) {
      sec.sortOrder = sec.displayLayout === 'hero' ? 0 : (idx + 1) * 10
      migrated = true
    }
    if (sec.status === undefined) {
      sec.status = true
      migrated = true
    }
  })
  // Migration: split merged single sections into one per card
  const splitSections = []
  sections.forEach(sec => {
    if (sec.displayLayout === 'single' && sec.selectedIds && sec.selectedIds.length > 1) {
      sec.selectedIds.forEach((id, i) => {
        splitSections.push({ ...sec, id: sec.id + '_' + i, selectedIds: [id], sortOrder: (sec.sortOrder || 0) + i * 10 })
      })
      migrated = true
    } else {
      splitSections.push(sec)
    }
  })
  sections = splitSections
  // Normalize hero sections to sortOrder 0
  sections.forEach(sec => {
    if (sec.displayLayout === 'hero' && sec.sortOrder !== 0) {
      sec.sortOrder = 0
      migrated = true
    }
  })
  // Always sort: hero sections first, then by sortOrder
  sections.sort((a, b) => {
    if (a.displayLayout === 'hero' && b.displayLayout !== 'hero') return -1
    if (a.displayLayout !== 'hero' && b.displayLayout === 'hero') return 1
    return (a.sortOrder || 0) - (b.sortOrder || 0)
  })
  if (migrated) {
    config.sections = sections
    writeData(data)
  }
  res.json(config)
})

app.put('/api/company/profile-config', (req, res) => {
  const data = readData()
  data.companyProfileConfig = { ...(data.companyProfileConfig || {}), ...req.body }
  writeData(data)
  res.json(data.companyProfileConfig)
})

// Reorder company profiles
app.post('/api/company/profile/reorder', (req, res) => {
  const data = readData()
  const { orders } = req.body
  if (!orders || !Array.isArray(orders)) return res.status(400).json({ error: 'orders array required' })
  const profiles = data.companyProfiles || []
  orders.forEach(({ id, sortOrder }) => {
    const p = profiles.find(p => p.id === id)
    if (p) p.sortOrder = sortOrder
  })
  writeData(data)
  res.json({ ok: true })
})

// Migrate old flat profiles to new card format
app.post('/api/company/profile/migrate', (req, res) => {
  const data = readData()
  if (!data.companyProfiles) data.companyProfiles = []
  let migrated = 0
  data.companyProfiles = data.companyProfiles.map(p => {
    if (p.cover && p.detail) return p
    const ts = Date.now() + '_' + Math.random().toString(36).slice(2, 6)
    const title = p.title || ''
    const intro = p.intro || ''
    const history = p.history || ''
    const culture = p.culture || ''
    const structure = p.structure || ''
    const team = p.team || ''
    const qualifications = p.qualifications || ''
    const images = p.images || []
    const video = p.video || ''
    const detailBody = [intro, history, culture, structure, team, qualifications].filter(Boolean).join('\n\n')

    return {
      id: p.id,
      title: title,
      sortOrder: p.sortOrder || p.id,
      cover: {
        backgroundImage: images[0] || '',
        video: video,
        zones: {
          top: { textBoxes: [{ id: 'tb_' + ts + '_t0', text: title, fontFamily: 'sans-serif', fontSize: 'large', textAlign: 'center' }] },
          middle: { textBoxes: [{ id: 'tb_' + ts + '_m0', text: intro, fontFamily: 'sans-serif', fontSize: 'medium', textAlign: 'left' }] },
          bottom: { textBoxes: [{ id: 'tb_' + ts + '_b0', text: '', fontFamily: 'sans-serif', fontSize: 'small', textAlign: 'left' }] }
        }
      },
      detail: {
        title: title,
        body: detailBody,
        images: images,
        video: video,
        detailEntry: true
      },
      createdAt: p.createdAt || new Date().toISOString().split('T')[0]
    }
  })
  migrated = data.companyProfiles.length
  writeData(data)
  res.json({ ok: true, migrated })
})

// --- Company Performance API ---
app.get('/api/company/performance', (req, res) => {
  const data = readData()
  if (!data.companyPerformances) data.companyPerformances = []
  res.json(data.companyPerformances)
})

app.get('/api/company/performance/:id', (req, res) => {
  const data = readData()
  const profile = (data.companyPerformances || []).find(p => p.id === parseInt(req.params.id))
  if (!profile) return res.status(404).json({ error: 'Not found' })
  res.json(profile)
})

app.post('/api/company/performance', (req, res) => {
  const data = readData()
  if (!data.companyPerformances) data.companyPerformances = []
  if (!data.nextId.companyPerformances) data.nextId.companyPerformances = 1
  const ts = Date.now() + '_' + Math.random().toString(36).slice(2, 6)
  const newId = data.nextId.companyPerformances++
  const profile = {
    id: newId,
    title: req.body.title || '',
    sortOrder: req.body.sortOrder !== undefined ? req.body.sortOrder : newId,
    cover: req.body.cover || {
      backgroundImage: '',
      video: '',
      zones: {
        top: { textBoxes: [{ id: 'tb_' + ts + '_t0', text: req.body.title || '', fontFamily: 'sans-serif', fontSize: 'large', textAlign: 'center' }] },
        middle: { textBoxes: [{ id: 'tb_' + ts + '_m0', text: '', fontFamily: 'sans-serif', fontSize: 'medium', textAlign: 'left' }] },
        bottom: { textBoxes: [{ id: 'tb_' + ts + '_b0', text: '', fontFamily: 'sans-serif', fontSize: 'small', textAlign: 'left' }] }
      }
    },
    detail: req.body.detail || {
      title: req.body.title || '',
      body: '',
      images: [],
      video: '',
      detailEntry: true
    },
    createdAt: req.body.createdAt || new Date().toISOString().split('T')[0]
  }
  data.companyPerformances.unshift(profile)
  writeData(data)
  res.json(profile)
})

app.put('/api/company/performance/:id', (req, res) => {
  const data = readData()
  const idx = (data.companyPerformances || []).findIndex(p => p.id === parseInt(req.params.id))
  if (idx < 0) return res.status(404).json({ error: 'Not found' })
  const body = pick(req.body, 'title', 'sortOrder', 'cover', 'detail', 'status')
  if (typeof body.cover === 'string') {
    try { body.cover = JSON.parse(body.cover) } catch (e) { body.cover = { backgroundImage: '', video: '', zones: {} } }
  }
  if (typeof body.detail === 'string') {
    try { body.detail = JSON.parse(body.detail) } catch (e) { body.detail = { title: '', body: '', images: [], video: '', detailEntry: true } }
  }
  data.companyPerformances[idx] = { ...data.companyPerformances[idx], ...body, id: data.companyPerformances[idx].id }
  writeData(data)
  res.json(data.companyPerformances[idx])
})

app.delete('/api/company/performance/:id', (req, res) => {
  const data = readData()
  const id = parseInt(req.params.id)
  data.companyPerformances = (data.companyPerformances || []).filter(p => p.id !== id)
  // 清理展示方案中被删除卡片的引用
  const config = data.companyPerformanceConfig || { sections: [] };
  (config.sections || []).forEach(sec => {
    sec.selectedIds = (sec.selectedIds || []).filter(sid => sid !== id)
  })
  writeData(data)
  res.json({ ok: true })
})

// Company Performance Config
app.get('/api/company/performance-config', (req, res) => {
  const data = readData()
  if (!data.companyPerformanceConfig) data.companyPerformanceConfig = { sections: [] }
  const config = data.companyPerformanceConfig
  let sections = config.sections || []
  let migrated = false
  sections.forEach((sec, idx) => {
    if (sec.sortOrder === undefined) {
      sec.sortOrder = sec.displayLayout === 'hero' ? 0 : (idx + 1) * 10
      migrated = true
    }
    if (sec.status === undefined) {
      sec.status = true
      migrated = true
    }
  })
  const splitSections = []
  sections.forEach(sec => {
    if (sec.displayLayout === 'single' && sec.selectedIds && sec.selectedIds.length > 1) {
      sec.selectedIds.forEach((id, i) => {
        splitSections.push({ ...sec, id: sec.id + '_' + i, selectedIds: [id], sortOrder: (sec.sortOrder || 0) + i * 10 })
      })
      migrated = true
    } else {
      splitSections.push(sec)
    }
  })
  sections = splitSections
  // Normalize hero sections to sortOrder 0
  sections.forEach(sec => {
    if (sec.displayLayout === 'hero' && sec.sortOrder !== 0) {
      sec.sortOrder = 0
      migrated = true
    }
  })
  sections.sort((a, b) => {
    if (a.displayLayout === 'hero' && b.displayLayout !== 'hero') return -1
    if (a.displayLayout !== 'hero' && b.displayLayout === 'hero') return 1
    return (a.sortOrder || 0) - (b.sortOrder || 0)
  })
  if (migrated) {
    config.sections = sections
    writeData(data)
  }
  res.json(config)
})

app.put('/api/company/performance-config', (req, res) => {
  const data = readData()
  data.companyPerformanceConfig = { ...(data.companyPerformanceConfig || {}), ...req.body }
  writeData(data)
  res.json(data.companyPerformanceConfig)
})

// Reorder company performances
app.post('/api/company/performance/reorder', (req, res) => {
  const data = readData()
  const { orders } = req.body
  if (!orders || !Array.isArray(orders)) return res.status(400).json({ error: 'orders array required' })
  const profiles = data.companyPerformances || []
  orders.forEach(({ id, sortOrder }) => {
    const p = profiles.find(p => p.id === id)
    if (p) p.sortOrder = sortOrder
  })
  writeData(data)
  res.json({ ok: true })
})

// Migrate old flat performances to new card format
app.post('/api/company/performance/migrate', (req, res) => {
  const data = readData()
  if (!data.companyPerformances) data.companyPerformances = []
  let migrated = 0
  data.companyPerformances = data.companyPerformances.map(p => {
    if (p.cover && p.detail) return p
    const ts = Date.now() + '_' + Math.random().toString(36).slice(2, 6)
    const title = p.title || ''
    const intro = p.intro || ''
    const history = p.history || ''
    const culture = p.culture || ''
    const structure = p.structure || ''
    const team = p.team || ''
    const qualifications = p.qualifications || ''
    const images = p.images || []
    const video = p.video || ''
    const detailBody = [intro, history, culture, structure, team, qualifications].filter(Boolean).join('\n\n')

    return {
      id: p.id,
      title: title,
      sortOrder: p.sortOrder || p.id,
      cover: {
        backgroundImage: images[0] || '',
        video: video,
        zones: {
          top: { textBoxes: [{ id: 'tb_' + ts + '_t0', text: title, fontFamily: 'sans-serif', fontSize: 'large', textAlign: 'center' }] },
          middle: { textBoxes: [{ id: 'tb_' + ts + '_m0', text: intro, fontFamily: 'sans-serif', fontSize: 'medium', textAlign: 'left' }] },
          bottom: { textBoxes: [{ id: 'tb_' + ts + '_b0', text: '', fontFamily: 'sans-serif', fontSize: 'small', textAlign: 'left' }] }
        }
      },
      detail: {
        title: title,
        body: detailBody,
        images: images,
        video: video,
        detailEntry: true
      },
      createdAt: p.createdAt || new Date().toISOString().split('T')[0]
    }
  })
  migrated = data.companyPerformances.length
  writeData(data)
  res.json({ ok: true, migrated })
})

app.post('/api/upload/performance', uploadPerformance.single('performance'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' })
  res.json({ url: '/uploads/performance/' + req.file.filename })
})

// --- Case Page Config ---
app.get('/api/company/case-page-config', (req, res) => {
  const data = readData()
  if (!data.casePageConfig) data.casePageConfig = { sections: [] }
  const config = data.casePageConfig
  let sections = config.sections || []
  let migrated = false
  sections.forEach((sec, idx) => {
    if (sec.sortOrder === undefined) {
      sec.sortOrder = (idx + 1) * 10
      migrated = true
    }
    if (sec.enabled === undefined) {
      sec.enabled = true
      migrated = true
    }
  })
  sections.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
  if (migrated) {
    config.sections = sections
    writeData(data)
  }
  res.json(config)
})

app.put('/api/company/case-page-config', (req, res) => {
  const data = readData()
  data.casePageConfig = { ...(data.casePageConfig || {}), ...req.body }
  writeData(data)
  res.json(data.casePageConfig)
})

// --- Card Page Config ---
app.get('/api/card-page-config', (req, res) => {
  const data = readData()
  if (!data.cardPageConfig) data.cardPageConfig = { sections: [] }
  const config = data.cardPageConfig
  let sections = config.sections || []
  let migrated = false
  sections.forEach((sec, idx) => {
    if (sec.sortOrder === undefined) {
      sec.sortOrder = (idx + 1) * 10
      migrated = true
    }
    if (sec.enabled === undefined) {
      sec.enabled = true
      migrated = true
    }
  })
  sections.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
  if (migrated) {
    config.sections = sections
    writeData(data)
  }
  res.json(config)
})

app.put('/api/card-page-config', (req, res) => {
  const data = readData()
  data.cardPageConfig = { ...(data.cardPageConfig || {}), ...req.body }
  writeData(data)
  res.json(data.cardPageConfig)
})

// --- Business Modules API ---
app.get('/api/business-modules', (req, res) => {
  const data = readData()
  if (!data.businessModules) data.businessModules = []
  res.json(data.businessModules)
})

// Business Module Page Config
app.get('/api/business-modules/page-config', (req, res) => {
  const data = readData()
  if (!data.businessModulePageConfig) data.businessModulePageConfig = { sections: [] }
  const config = data.businessModulePageConfig
  let sections = config.sections || []
  let migrated = false
  sections.forEach((sec, idx) => {
    if (sec.sortOrder === undefined) {
      sec.sortOrder = sec.displayLayout === 'hero' ? 0 : (idx + 1) * 10
      migrated = true
    }
    if (sec.status === undefined) {
      sec.status = true
      migrated = true
    }
  })
  const splitSections = []
  sections.forEach(sec => {
    if (sec.displayLayout === 'single' && sec.selectedIds && sec.selectedIds.length > 1) {
      sec.selectedIds.forEach((id, i) => {
        splitSections.push({ ...sec, id: sec.id + '_' + i, selectedIds: [id], sortOrder: (sec.sortOrder || 0) + i * 10 })
      })
      migrated = true
    } else {
      splitSections.push(sec)
    }
  })
  sections = splitSections
  // Normalize hero sections to sortOrder 0
  sections.forEach(sec => {
    if (sec.displayLayout === 'hero' && sec.sortOrder !== 0) {
      sec.sortOrder = 0
      migrated = true
    }
  })
  // Migrate legacy grid-6 to concrete format
  sections.forEach(sec => {
    if (sec.displayLayout === 'grid-6') {
      sec.displayLayout = 'grid-6-3x2'
      migrated = true
    }
  })
  sections.sort((a, b) => {
    if (a.displayLayout === 'hero' && b.displayLayout !== 'hero') return -1
    if (a.displayLayout !== 'hero' && b.displayLayout === 'hero') return 1
    return (a.sortOrder || 0) - (b.sortOrder || 0)
  })
  if (migrated) {
    config.sections = sections
    writeData(data)
  }
  res.json(config)
})

app.put('/api/business-modules/page-config', (req, res) => {
  const data = readData()
  data.businessModulePageConfig = { ...(data.businessModulePageConfig || {}), ...req.body }
  writeData(data)
  res.json(data.businessModulePageConfig)
})

app.get('/api/business-modules/:id', (req, res) => {
  const data = readData()
  const mod = (data.businessModules || []).find(m => m.id === parseInt(req.params.id))
  if (!mod) return res.status(404).json({ error: 'Not found' })
  let migrated = false
  if (mod.sections) {
    mod.sections.forEach(sec => {
      if (sec.displayLayout === 'grid-6') {
        sec.displayLayout = 'grid-6-3x2'
        migrated = true
      }
    })
  }
  if (migrated) {
    writeData(data)
  }
  res.json(mod)
})

app.post('/api/business-modules', (req, res) => {
  const data = readData()
  if (!data.businessModules) data.businessModules = []
  if (!data.nextId.businessModules) data.nextId.businessModules = 1
  const mod = {
    id: data.nextId.businessModules++,
    name: req.body.name || '',
    coverImage: req.body.coverImage || '',
    coverAspectRatio: req.body.coverAspectRatio || '16:9',
    layoutType: req.body.layoutType || 'carousel',
    sortOrder: req.body.sortOrder || 0,
    status: req.body.status !== undefined ? req.body.status : true,
    cards: req.body.cards || [],
    createdAt: req.body.createdAt || new Date().toISOString().split('T')[0]
  }
  data.businessModules.push(mod)
  writeData(data)
  res.json(mod)
})

app.put('/api/business-modules/:id', (req, res) => {
  const data = readData()
  const id = parseInt(req.params.id)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' })
  if (!data.businessModules) data.businessModules = []
  const idx = data.businessModules.findIndex(m => m.id === id)
  if (idx < 0) return res.status(404).json({ error: 'Not found' })
  data.businessModules[idx] = { ...data.businessModules[idx], ...pick(req.body, 'name', 'coverImage', 'coverAspectRatio', 'layoutType', 'sortOrder', 'status', 'sections', 'cards'), id: data.businessModules[idx].id }
  writeData(data)
  res.json(data.businessModules[idx])
})

app.delete('/api/business-modules/:id', (req, res) => {
  const data = readData()
  const id = parseInt(req.params.id)
  data.businessModules = (data.businessModules || []).filter(m => m.id !== id)
  // 清理展示方案中被删除模块的引用
  const pageConfig = data.businessModulePageConfig || { sections: [] };
  (pageConfig.sections || []).forEach(sec => {
    sec.selectedIds = (sec.selectedIds || []).filter(sid => sid !== id)
  })
  writeData(data)
  res.json({ ok: true })
})

// Business Module Cards
app.post('/api/business-modules/:mid/cards', (req, res) => {
  const data = readData()
  const mid = parseInt(req.params.mid)
  if (isNaN(mid)) return res.status(400).json({ error: 'Invalid module id' })
  if (!data.businessModules) data.businessModules = []
  const mod = data.businessModules.find(m => m.id === mid)
  if (!mod) return res.status(404).json({ error: 'Module not found' })
  if (!mod.cards) mod.cards = []
  const maxId = mod.cards.reduce((max, c) => Math.max(max, c.id || 0), 0)
  const card = {
    id: maxId + 1,
    title: req.body.title || '',
    sortOrder: req.body.sortOrder !== undefined ? req.body.sortOrder : (mod.cards.length + 1),
    cover: req.body.cover || { backgroundImage: '', video: '', aspectRatio: '16:9', body: '', zones: { top: { textBoxes: [] }, middle: { textBoxes: [] }, bottom: { textBoxes: [] } } },
    detail: req.body.detail || { title: '', body: '', images: [], video: '', detailEntry: true },
    createdAt: req.body.createdAt || new Date().toISOString().split('T')[0]
  }
  mod.cards.push(card)
  writeData(data)
  res.json(card)
})

app.put('/api/business-modules/:mid/cards/:cid', (req, res) => {
  const data = readData()
  const mid = parseInt(req.params.mid)
  const cid = parseInt(req.params.cid)
  if (isNaN(mid)) return res.status(400).json({ error: 'Invalid module id' })
  if (isNaN(cid)) return res.status(400).json({ error: 'Invalid card id' })
  if (!data.businessModules) data.businessModules = []
  const mod = data.businessModules.find(m => m.id === mid)
  if (!mod) return res.status(404).json({ error: 'Module not found' })
  if (!mod.cards) mod.cards = []
  const cidx = mod.cards.findIndex(c => c.id === cid)
  if (cidx < 0) return res.status(404).json({ error: 'Card not found' })
  mod.cards[cidx] = { ...mod.cards[cidx], ...pick(req.body, 'name', 'title', 'phone', 'department', 'company', 'email', 'address', 'avatar', 'bio', 'status', 'sortOrder', 'extra'), id: mod.cards[cidx].id }
  writeData(data)
  res.json(mod.cards[cidx])
})

app.get('/api/business-modules/:mid/cards/:cid', (req, res) => {
  const data = readData()
  const mid = parseInt(req.params.mid)
  const cid = parseInt(req.params.cid)
  if (isNaN(mid)) return res.status(400).json({ error: 'Invalid module id' })
  if (isNaN(cid)) return res.status(400).json({ error: 'Invalid card id' })
  const mod = (data.businessModules || []).find(m => m.id === mid)
  if (!mod) return res.status(404).json({ error: 'Module not found' })
  const card = (mod.cards || []).find(c => c.id === cid)
  if (!card) return res.status(404).json({ error: 'Card not found' })
  res.json(card)
})

app.delete('/api/business-modules/:mid/cards/:cid', (req, res) => {
  const data = readData()
  const mid = parseInt(req.params.mid)
  const cid = parseInt(req.params.cid)
  if (isNaN(mid)) return res.status(400).json({ error: 'Invalid module id' })
  if (isNaN(cid)) return res.status(400).json({ error: 'Invalid card id' })
  const mod = (data.businessModules || []).find(m => m.id === mid)
  if (!mod) return res.status(404).json({ error: 'Module not found' })
  if (!mod.cards) mod.cards = []
  mod.cards = mod.cards.filter(c => c.id !== cid)
  writeData(data)
  res.json({ ok: true })
})

app.post('/api/upload/business-module', uploadBusinessModule.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' })
  res.json({ url: '/uploads/business-modules/' + req.file.filename })
})

// --- Honors API ---
app.get('/api/honors', (req, res) => {
  const data = readData()
  res.json(data.honors || [])
})

app.get('/api/honors/:id', (req, res) => {
  const data = readData()
  const item = (data.honors || []).find(h => h.id === parseInt(req.params.id))
  if (!item) return res.status(404).json({ error: 'Not found' })
  res.json(item)
})

app.post('/api/honors', (req, res) => {
  const data = readData()
  if (!data.honors) data.honors = []
  if (!data.nextId.honors) data.nextId.honors = 1
  const item = {
    ...pick(req.body, 'image', 'name', 'description', 'sortOrder', 'status', 'createdAt'),
    id: data.nextId.honors++,
    image: req.body.image || '',
    createdAt: req.body.createdAt || new Date().toISOString().split('T')[0]
  }
  data.honors.push(item)
  writeData(data)
  res.json(item)
})

app.put('/api/honors/:id', (req, res) => {
  const data = readData()
  const idx = (data.honors || []).findIndex(h => h.id === parseInt(req.params.id))
  if (idx < 0) return res.status(404).json({ error: 'Not found' })
  data.honors[idx] = { ...data.honors[idx], ...pick(req.body, 'image', 'name', 'description', 'sortOrder', 'status', 'createdAt'), id: data.honors[idx].id }
  writeData(data)
  res.json(data.honors[idx])
})

app.delete('/api/honors/:id', (req, res) => {
  const data = readData()
  data.honors = (data.honors || []).filter(h => h.id !== parseInt(req.params.id))
  writeData(data)
  res.json({ ok: true })
})

app.post('/api/upload/honors', uploadHonors.single('honors'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' })
  res.json({ url: '/uploads/honors/' + req.file.filename })
})

// --- Projects API ---
app.get('/api/projects', (req, res) => {
  const data = readData()
  res.json(data.projects || [])
})

app.get('/api/projects/:id', (req, res) => {
  const data = readData()
  const project = (data.projects || []).find(p => p.id === parseInt(req.params.id))
  if (!project) return res.status(404).json({ error: 'Not found' })
  res.json(project)
})

app.post('/api/projects', (req, res) => {
  const data = readData()
  if (!data.projects) data.projects = []
  if (!data.nextId.projects) data.nextId.projects = 1
  const item = {
    ...pick(req.body, 'name', 'location', 'year', 'desc', 'scale', 'period', 'investment', 'address', 'image', 'images', 'tags', 'highlights', 'detail', 'detailImages', 'results', 'sortOrder', 'status', 'createdAt'),
    id: data.nextId.projects++,
    image: req.body.image || '',
    images: req.body.images || [],
    tags: req.body.tags || [],
    highlights: req.body.highlights || [],
    results: req.body.results || [],
    createdAt: req.body.createdAt || new Date().toISOString().split('T')[0]
  }
  data.projects.push(item)
  writeData(data)
  res.json(item)
})

app.put('/api/projects/:id', (req, res) => {
  const data = readData()
  const idx = (data.projects || []).findIndex(p => p.id === parseInt(req.params.id))
  if (idx < 0) return res.status(404).json({ error: 'Not found' })
  data.projects[idx] = { ...data.projects[idx], ...pick(req.body, 'name', 'location', 'year', 'desc', 'scale', 'period', 'investment', 'address', 'image', 'images', 'tags', 'highlights', 'detail', 'detailImages', 'results', 'sortOrder', 'status', 'createdAt'), id: data.projects[idx].id }
  writeData(data)
  res.json(data.projects[idx])
})

app.delete('/api/projects/:id', (req, res) => {
  const data = readData()
  data.projects = (data.projects || []).filter(p => p.id !== parseInt(req.params.id))
  writeData(data)
  res.json({ ok: true })
})

app.post('/api/upload/projects', uploadProjects.single('projects'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' })
  res.json({ url: '/uploads/projects/' + req.file.filename })
})

// --- File Upload ---
app.post('/api/upload/video', uploadVideo.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No video file' })
  res.json({ url: '/uploads/videos/' + req.file.filename })
})

app.post('/api/upload/cover', uploadCover.single('cover'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No cover file' })
  res.json({ url: '/uploads/covers/' + req.file.filename })
})

app.post('/api/upload/avatar', uploadAvatar.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No avatar file' })
  res.json({ url: '/uploads/avatars/' + req.file.filename })
})

app.post('/api/upload/splash', uploadSplash.single('splash'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No splash file' })
  res.json({ url: '/uploads/splash/' + req.file.filename })
})

app.post('/api/upload/profile', uploadProfile.single('profile'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No profile file' })
  res.json({ url: '/uploads/profile/' + req.file.filename })
})

app.post('/api/upload/editor', uploadEditor.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' })
  res.json({ url: '/uploads/editor/' + req.file.filename })
})

// --- Splash Images API ---
app.get('/api/splash', (req, res) => {
  const data = readData()
  if (!data.splashImages || data.splashImages.length === 0) {
    data.splashImages = [{id:1,url:'',sort:1},{id:2,url:'',sort:2},{id:3,url:'',sort:3}]
    data.nextId = data.nextId || {}
    data.nextId.splashImages = 4
    writeData(data)
  }
  res.json(data.splashImages)
})

app.put('/api/splash/:id', (req, res) => {
  const data = readData()
  if (!data.splashImages) data.splashImages = [{id:1,url:'',sort:1},{id:2,url:'',sort:2},{id:3,url:'',sort:3}]
  const idx = data.splashImages.findIndex(s => s.id === parseInt(req.params.id))
  if (idx < 0) return res.status(404).json({ error: 'Not found' })
  data.splashImages[idx] = { ...data.splashImages[idx], ...pick(req.body, 'url', 'sort'), id: data.splashImages[idx].id, updatedAt: new Date().toISOString() }
  writeData(data)
  res.json(data.splashImages[idx])
})

// --- Cards API ---
app.get('/api/cards', (req, res) => {
  const data = readData()
  res.json(data.cards)
})

app.get('/api/cards/:id', (req, res) => {
  const data = readData()
  const card = data.cards.find(c => c.id === parseInt(req.params.id))
  if (!card) return res.status(404).json({ error: 'Not found' })
  res.json(card)
})

// Lookup user by phone (for mini program login)
app.get('/api/user/phone/:phone', (req, res) => {
  const data = readData()
  const card = data.cards.find(c => c.phone === req.params.phone)
  if (!card) return res.status(404).json({ error: 'Not found' })
  res.json({ nickName: card.name, title: card.title, company: card.company, department: card.department, phone: card.phone, avatar: card.avatar })
})

app.post('/api/cards', (req, res) => {
  const data = readData()
  const card = req.body
  card.id = data.nextId.cards++
  card.createdAt = card.createdAt || new Date().toISOString().split('T')[0]
  card.status = card.status !== undefined ? card.status : true
  data.cards.unshift(card)
  writeData(data)
  res.json(card)
})

app.put('/api/cards/:id', (req, res) => {
  const data = readData()
  const idx = data.cards.findIndex(c => c.id === parseInt(req.params.id))
  if (idx < 0) return res.status(404).json({ error: 'Not found' })
  data.cards[idx] = { ...data.cards[idx], ...pick(req.body, 'name', 'phone', 'title', 'department', 'company', 'email', 'address', 'avatar', 'bio', 'status'), id: data.cards[idx].id }
  writeData(data)
  res.json(data.cards[idx])
})

app.delete('/api/cards/:id', (req, res) => {
  const data = readData()
  data.cards = data.cards.filter(c => c.id !== parseInt(req.params.id))
  writeData(data)
  res.json({ ok: true })
})

app.patch('/api/cards/:id/toggle', (req, res) => {
  const data = readData()
  const card = data.cards.find(c => c.id === parseInt(req.params.id))
  if (!card) return res.status(404).json({ error: 'Not found' })
  card.status = !card.status
  writeData(data)
  res.json(card)
})

app.post('/api/cards/batch-delete', (req, res) => {
  const data = readData()
  const { ids } = req.body
  data.cards = data.cards.filter(c => !ids.includes(c.id))
  writeData(data)
  res.json({ ok: true, deleted: ids.length })
})

// --- Messages API ---
app.get('/api/messages', (req, res) => {
  const data = readData()
  res.json(data.messages)
})

app.put('/api/messages/:id', (req, res) => {
  const data = readData()
  const idx = data.messages.findIndex(m => m.id === parseInt(req.params.id))
  if (idx < 0) return res.status(404).json({ error: 'Not found' })
  data.messages[idx] = { ...data.messages[idx], ...pick(req.body, 'status', 'remark'), id: data.messages[idx].id }
  writeData(data)
  res.json(data.messages[idx])
})

app.post('/api/messages/batch-delete', (req, res) => {
  const data = readData()
  const { ids } = req.body
  data.messages = data.messages.filter(m => !ids.includes(m.id))
  writeData(data)
  res.json({ ok: true, deleted: ids.length })
})

// --- Positions API ---
app.get('/api/positions', (req, res) => {
  const data = readData()
  res.json(data.positions)
})

app.post('/api/positions', (req, res) => {
  const data = readData()
  const pos = req.body
  pos.id = data.nextId.positions++
  pos.count = pos.count || 0
  data.positions.push(pos)
  writeData(data)
  res.json(pos)
})

app.put('/api/positions/:id', (req, res) => {
  const data = readData()
  const idx = data.positions.findIndex(p => p.id === parseInt(req.params.id))
  if (idx < 0) return res.status(404).json({ error: 'Not found' })
  data.positions[idx] = { ...data.positions[idx], ...pick(req.body, 'title', 'department', 'location', 'requirement', 'sortOrder', 'status', 'createdAt'), id: data.positions[idx].id }
  writeData(data)
  res.json(data.positions[idx])
})

app.post('/api/positions/batch-delete', (req, res) => {
  const data = readData()
  const { ids } = req.body
  data.positions = data.positions.filter(p => !ids.includes(p.id))
  writeData(data)
  res.json({ ok: true, deleted: ids.length })
})

// --- Videos API ---
app.get('/api/videos', (req, res) => {
  const data = readData()
  res.json(data.videos)
})

app.post('/api/videos', (req, res) => {
  const data = readData()
  const video = req.body
  video.id = data.nextId.videos++
  video.createdAt = video.createdAt || new Date().toISOString().split('T')[0]
  video.views = video.views || 0
  data.videos.push(video)
  writeData(data)
  res.json(video)
})

app.put('/api/videos/:id', (req, res) => {
  const data = readData()
  const idx = data.videos.findIndex(v => v.id === parseInt(req.params.id))
  if (idx < 0) return res.status(404).json({ error: 'Not found' })
  data.videos[idx] = { ...data.videos[idx], ...pick(req.body, 'url', 'title', 'description', 'sortOrder', 'status', 'createdAt'), id: data.videos[idx].id }
  writeData(data)
  res.json(data.videos[idx])
})

app.post('/api/videos/batch-delete', (req, res) => {
  const data = readData()
  const { ids } = req.body
  data.videos = data.videos.filter(v => !ids.includes(v.id))
  writeData(data)
  res.json({ ok: true, deleted: ids.length })
})

// --- Inquiry (from mini program) ---
app.post('/api/inquiry', (req, res) => {
  const data = readData()
  const msg = {
    id: data.nextId.messages++,
    ...pick(req.body, 'name', 'company', 'phone', 'title', 'areas', 'message'),
    status: 'new',
    remark: '',
    createdAt: new Date().toLocaleString('zh-CN', { hour12: false })
  }
  data.messages.push(msg)
  writeData(data)
  res.json({ ok: true, id: msg.id })
})

// Data reset
app.post('/api/reset', (req, res) => {
  var seedFile = path.join(__dirname, 'data-seed.json')
  try {
    if (fs.existsSync(seedFile)) {
      var seed = JSON.parse(fs.readFileSync(seedFile, 'utf-8'))
      writeData(seed)
    } else {
      writeData({ cards: [], messages: [], positions: [], videos: [], companyInfo: {}, companyInfos: [], honors: [], projects: [], splashImages: [{id:1,url:'',sort:1},{id:2,url:'',sort:2},{id:3,url:'',sort:3}], companyProfiles: [], companyProfileConfig: { sections: [] }, companyPerformances: [], companyPerformanceConfig: { sections: [] }, casePageConfig: { sections: [] }, businessModules: [], businessModulePageConfig: { sections: [] }, nextId: { cards: 1, messages: 1, positions: 1, videos: 1, honors: 1, projects: 1, splashImages: 4, companyProfiles: 1, companyPerformances: 1, businessModules: 1, companyInfos: 1 } })
    }
  } catch (e) {
    writeData({ cards: [], messages: [], positions: [], videos: [], companyInfo: {}, companyInfos: [], honors: [], projects: [], splashImages: [{id:1,url:'',sort:1},{id:2,url:'',sort:2},{id:3,url:'',sort:3}], companyProfiles: [], companyProfileConfig: { sections: [] }, companyPerformances: [], companyPerformanceConfig: { sections: [] }, casePageConfig: { sections: [] }, businessModules: [], businessModulePageConfig: { sections: [] }, nextId: { cards: 1, messages: 1, positions: 1, videos: 1, honors: 1, projects: 1, splashImages: 4, companyProfiles: 1, companyPerformances: 1, businessModules: 1, companyInfos: 1 } })
  }
  res.json({ ok: true })
})

// ADMIN_SECRET is intentionally NOT exported — it must stay private
module.exports = { app, generateCode, createToken, createUserToken, validateToken, getTokenType, TOKEN_TTL }

db.initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`)
    console.log(`Admin panel: http://localhost:${PORT}/index.html`)
    console.log(`API base:    http://localhost:${PORT}/api`)
  })
}).catch(err => {
  console.error('Failed to initialize database:', err)
  process.exit(1)
})
