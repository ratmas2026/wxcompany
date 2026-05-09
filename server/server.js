const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const multer = require('multer')

const app = express()
const PORT = 3456
const DATA_FILE = path.join(__dirname, 'data.json')
const UPLOADS_DIR = path.join(__dirname, 'uploads')
var VIDEOS_DIR = path.join(UPLOADS_DIR, 'videos')
var COVERS_DIR = path.join(UPLOADS_DIR, 'covers')
var AVATARS_DIR = path.join(UPLOADS_DIR, 'avatars')
var SPLASH_DIR = path.join(UPLOADS_DIR, 'splash')
var PROFILE_DIR = path.join(UPLOADS_DIR, 'profile')
var BUSINESS_DIR = path.join(UPLOADS_DIR, 'business')
var HONORS_DIR = path.join(UPLOADS_DIR, 'honors')
var PROJECTS_DIR = path.join(UPLOADS_DIR, 'projects')
var SITES_DIR = path.join(UPLOADS_DIR, 'sites')
var EDITOR_DIR = path.join(UPLOADS_DIR, 'editor')
var BUSINESS_MODULES_DIR = path.join(UPLOADS_DIR, 'business-modules')
var PERFORMANCE_DIR = path.join(UPLOADS_DIR, 'performance')

// Ensure upload directories exist
if (!fs.existsSync(VIDEOS_DIR)) fs.mkdirSync(VIDEOS_DIR, { recursive: true })
if (!fs.existsSync(COVERS_DIR)) fs.mkdirSync(COVERS_DIR, { recursive: true })
if (!fs.existsSync(AVATARS_DIR)) fs.mkdirSync(AVATARS_DIR, { recursive: true })
if (!fs.existsSync(SPLASH_DIR)) fs.mkdirSync(SPLASH_DIR, { recursive: true })
if (!fs.existsSync(PROFILE_DIR)) fs.mkdirSync(PROFILE_DIR, { recursive: true })
if (!fs.existsSync(BUSINESS_DIR)) fs.mkdirSync(BUSINESS_DIR, { recursive: true })
if (!fs.existsSync(HONORS_DIR)) fs.mkdirSync(HONORS_DIR, { recursive: true })
if (!fs.existsSync(PROJECTS_DIR)) fs.mkdirSync(PROJECTS_DIR, { recursive: true })
if (!fs.existsSync(SITES_DIR)) fs.mkdirSync(SITES_DIR, { recursive: true })
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
var uploadVideo = multer({ storage: videoStorage, limits: { fileSize: 50 * 1048576 } })
var uploadCover = multer({ storage: coverStorage, limits: { fileSize: 5 * 1048576 } })

var avatarStorage = multer.diskStorage({
  destination: function(req, file, cb) { cb(null, AVATARS_DIR) },
  filename: function(req, file, cb) {
    var ext = path.extname(file.originalname) || '.jpg'
    cb(null, 'avatar_' + Date.now() + '_' + Math.round(Math.random() * 1000) + ext)
  }
})
var uploadAvatar = multer({ storage: avatarStorage, limits: { fileSize: 1 * 1048576 } })

var splashStorage = multer.diskStorage({
  destination: function(req, file, cb) { cb(null, SPLASH_DIR) },
  filename: function(req, file, cb) {
    var ext = path.extname(file.originalname) || '.jpg'
    cb(null, 'splash_' + Date.now() + '_' + Math.round(Math.random() * 1000) + ext)
  }
})
var uploadSplash = multer({ storage: splashStorage, limits: { fileSize: 5 * 1048576 } })

var profileStorage = multer.diskStorage({
  destination: function(req, file, cb) { cb(null, PROFILE_DIR) },
  filename: function(req, file, cb) {
    var ext = path.extname(file.originalname) || '.jpg'
    cb(null, 'profile_' + Date.now() + '_' + Math.round(Math.random() * 1000) + ext)
  }
})
var uploadProfile = multer({ storage: profileStorage, limits: { fileSize: 5 * 1048576 } })

var businessStorage = multer.diskStorage({
  destination: function(req, file, cb) { cb(null, BUSINESS_DIR) },
  filename: function(req, file, cb) {
    var ext = path.extname(file.originalname) || '.jpg'
    cb(null, 'business_' + Date.now() + '_' + Math.round(Math.random() * 1000) + ext)
  }
})
var uploadBusiness = multer({ storage: businessStorage, limits: { fileSize: 5 * 1048576 } })

var honorsStorage = multer.diskStorage({
  destination: function(req, file, cb) { cb(null, HONORS_DIR) },
  filename: function(req, file, cb) {
    var ext = path.extname(file.originalname) || '.jpg'
    cb(null, 'honor_' + Date.now() + '_' + Math.round(Math.random() * 1000) + ext)
  }
})
var uploadHonors = multer({ storage: honorsStorage, limits: { fileSize: 5 * 1048576 } })

var projectsStorage = multer.diskStorage({
  destination: function(req, file, cb) { cb(null, PROJECTS_DIR) },
  filename: function(req, file, cb) {
    var ext = path.extname(file.originalname) || '.jpg'
    cb(null, 'project_' + Date.now() + '_' + Math.round(Math.random() * 1000) + ext)
  }
})
var uploadProjects = multer({ storage: projectsStorage, limits: { fileSize: 5 * 1048576 } })

var sitesStorage = multer.diskStorage({
  destination: function(req, file, cb) { cb(null, SITES_DIR) },
  filename: function(req, file, cb) {
    var ext = path.extname(file.originalname) || '.jpg'
    cb(null, 'site_' + Date.now() + '_' + Math.round(Math.random() * 1000) + ext)
  }
})
var uploadSites = multer({ storage: sitesStorage, limits: { fileSize: 5 * 1048576 } })

var editorStorage = multer.diskStorage({
  destination: function(req, file, cb) { cb(null, EDITOR_DIR) },
  filename: function(req, file, cb) {
    var ext = path.extname(file.originalname) || '.jpg'
    cb(null, 'editor_' + Date.now() + '_' + Math.round(Math.random() * 1000) + ext)
  }
})
var uploadEditor = multer({ storage: editorStorage, limits: { fileSize: 50 * 1048576 } })

var businessModuleStorage = multer.diskStorage({
  destination: function(req, file, cb) { cb(null, BUSINESS_MODULES_DIR) },
  filename: function(req, file, cb) {
    var ext = path.extname(file.originalname) || '.jpg'
    cb(null, 'bm_' + Date.now() + '_' + Math.round(Math.random() * 1000) + ext)
  }
})
var uploadBusinessModule = multer({ storage: businessModuleStorage, limits: { fileSize: 5 * 1048576 } })

var performanceStorage = multer.diskStorage({
  destination: function(req, file, cb) { cb(null, PERFORMANCE_DIR) },
  filename: function(req, file, cb) {
    var ext = path.extname(file.originalname) || '.jpg'
    cb(null, 'performance_' + Date.now() + '_' + Math.round(Math.random() * 1000) + ext)
  }
})
var uploadPerformance = multer({ storage: performanceStorage, limits: { fileSize: 5 * 1048576 } })

app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'admin')))
app.use('/uploads', express.static(UPLOADS_DIR))

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

// --- Helpers ---
function readData() {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
    if (!data.businessModules) data.businessModules = []
    if (!data.nextId.businessModules) data.nextId.businessModules = 1
    if (!data.businessModulePageConfig) data.businessModulePageConfig = { sections: [] }
    if (!data.companyPerformances) data.companyPerformances = []
    if (!data.companyPerformanceConfig) data.companyPerformanceConfig = { sections: [] }
    if (!data.casePageConfig) data.casePageConfig = { sections: [] }
    return data
  } catch (e) {
    return { cards: [], messages: [], positions: [], videos: [], companyInfo: {}, business: [], honors: [], projects: [], sites: [], splashImages: [{id:1,url:'',sort:1},{id:2,url:'',sort:2},{id:3,url:'',sort:3}], companyProfiles: [], companyProfileConfig: { sections: [] }, companyPerformances: [], companyPerformanceConfig: { sections: [] }, casePageConfig: { sections: [] }, businessModules: [], businessModulePageConfig: { sections: [] }, nextId: { cards: 1, messages: 1, positions: 1, videos: 1, business: 1, honors: 1, projects: 1, sites: 1, splashImages: 4, companyProfiles: 1, companyPerformances: 1, businessModules: 1 } }
  }
}

function writeData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
  } catch (e) {
    console.error('Failed to write data file:', e.message)
    throw e
  }
}

// API health
app.get('/api', (req, res) => res.json({ ok: true, endpoints: ['company/info','company/profile','company/profile/:id','cards','messages','positions','videos','business','business/:id','honors','honors/:id','projects','projects/:id','sites','sites/:id','splash','user/phone/:phone','inquiry','reset','upload/video','upload/cover','upload/avatar','upload/splash','upload/profile','upload/business','upload/honors','upload/projects','upload/sites','upload/editor','business-modules','business-modules/:id','business-modules/:mid/cards','business-modules/:mid/cards/:cid','upload/business-module'] }))

// --- Company Info ---
app.get('/api/company/info', (req, res) => {
  const data = readData()
  res.json(data.companyInfo || {})
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
  data.companyProfiles[idx] = { ...data.companyProfiles[idx], ...req.body, id: data.companyProfiles[idx].id }

  // 同步公司名称和地址到所有名片
  const profile = data.companyProfiles[idx]
  if (profile.title || profile.address) {
    data.cards = (data.cards || []).map(card => ({
      ...card,
      company: profile.title || card.company,
      address: profile.address !== undefined ? profile.address : card.address
    }))
  }

  writeData(data)
  res.json(data.companyProfiles[idx])
})

app.delete('/api/company/profile/:id', (req, res) => {
  const data = readData()
  data.companyProfiles = (data.companyProfiles || []).filter(p => p.id !== parseInt(req.params.id))
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
  data.companyPerformances[idx] = { ...data.companyPerformances[idx], ...req.body, id: data.companyPerformances[idx].id }
  writeData(data)
  res.json(data.companyPerformances[idx])
})

app.delete('/api/company/performance/:id', (req, res) => {
  const data = readData()
  data.companyPerformances = (data.companyPerformances || []).filter(p => p.id !== parseInt(req.params.id))
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

// --- Business API ---
app.get('/api/business', (req, res) => {
  const data = readData()
  res.json(data.business || [])
})

app.get('/api/business/:id', (req, res) => {
  const data = readData()
  const item = (data.business || []).find(b => b.id === parseInt(req.params.id))
  if (!item) return res.status(404).json({ error: 'Not found' })
  res.json(item)
})

app.post('/api/business', (req, res) => {
  const data = readData()
  if (!data.business) data.business = []
  if (!data.nextId.business) data.nextId.business = 1
  const item = {
    ...req.body,
    id: data.nextId.business++,
    images: req.body.images || [],
    advantages: req.body.advantages || [],
    process: req.body.process || [],
    pricing: req.body.pricing || [],
    createdAt: req.body.createdAt || new Date().toISOString().split('T')[0]
  }
  data.business.push(item)
  writeData(data)
  res.json(item)
})

app.put('/api/business/:id', (req, res) => {
  const data = readData()
  const idx = (data.business || []).findIndex(b => b.id === parseInt(req.params.id))
  if (idx < 0) return res.status(404).json({ error: 'Not found' })
  data.business[idx] = { ...data.business[idx], ...req.body, id: data.business[idx].id }
  writeData(data)
  res.json(data.business[idx])
})

app.delete('/api/business/:id', (req, res) => {
  const data = readData()
  data.business = (data.business || []).filter(b => b.id !== parseInt(req.params.id))
  writeData(data)
  res.json({ ok: true })
})

app.post('/api/upload/business', uploadBusiness.single('business'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' })
  res.json({ url: '/uploads/business/' + req.file.filename })
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
  data.businessModules[idx] = { ...data.businessModules[idx], ...req.body, id: data.businessModules[idx].id }
  writeData(data)
  res.json(data.businessModules[idx])
})

app.delete('/api/business-modules/:id', (req, res) => {
  const data = readData()
  data.businessModules = (data.businessModules || []).filter(m => m.id !== parseInt(req.params.id))
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
  mod.cards[cidx] = { ...mod.cards[cidx], ...req.body, id: mod.cards[cidx].id }
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
    ...req.body,
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
  data.honors[idx] = { ...data.honors[idx], ...req.body, id: data.honors[idx].id }
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
    ...req.body,
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
  data.projects[idx] = { ...data.projects[idx], ...req.body, id: data.projects[idx].id }
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

// --- Sites API ---
app.get('/api/sites', (req, res) => {
  const data = readData()
  res.json(data.sites || [])
})

app.get('/api/sites/:id', (req, res) => {
  const data = readData()
  const item = (data.sites || []).find(s => s.id === parseInt(req.params.id))
  if (!item) return res.status(404).json({ error: 'Not found' })
  res.json(item)
})

app.post('/api/sites', (req, res) => {
  const data = readData()
  if (!data.sites) data.sites = []
  if (!data.nextId.sites) data.nextId.sites = 1
  const item = {
    ...req.body,
    id: data.nextId.sites++,
    projectName: req.body.projectName || '',
    stage: req.body.stage || '',
    stageValue: req.body.stageValue || '',
    location: req.body.location || '',
    desc: req.body.desc || '',
    image: req.body.image || '',
    createdAt: req.body.createdAt || new Date().toISOString().split('T')[0]
  }
  data.sites.push(item)
  writeData(data)
  res.json(item)
})

app.put('/api/sites/:id', (req, res) => {
  const data = readData()
  const idx = (data.sites || []).findIndex(s => s.id === parseInt(req.params.id))
  if (idx < 0) return res.status(404).json({ error: 'Not found' })
  data.sites[idx] = { ...data.sites[idx], ...req.body, id: data.sites[idx].id }
  writeData(data)
  res.json(data.sites[idx])
})

app.delete('/api/sites/:id', (req, res) => {
  const data = readData()
  data.sites = (data.sites || []).filter(s => s.id !== parseInt(req.params.id))
  writeData(data)
  res.json({ ok: true })
})

app.post('/api/upload/sites', uploadSites.single('sites'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' })
  res.json({ url: '/uploads/sites/' + req.file.filename })
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
  data.splashImages[idx] = { ...data.splashImages[idx], ...req.body, id: data.splashImages[idx].id, updatedAt: new Date().toISOString() }
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
  data.cards[idx] = { ...data.cards[idx], ...req.body, id: data.cards[idx].id }
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
  data.messages[idx] = { ...data.messages[idx], ...req.body, id: data.messages[idx].id }
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
  data.positions[idx] = { ...data.positions[idx], ...req.body, id: data.positions[idx].id }
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
  data.videos[idx] = { ...data.videos[idx], ...req.body, id: data.videos[idx].id }
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
    ...req.body,
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
  try {
    const seed = JSON.parse(fs.readFileSync(DATA_FILE.replace('.json', '-seed.json'), 'utf-8'))
    writeData(seed)
  } catch (e) {
    writeData({ cards: [], messages: [], positions: [], videos: [], companyInfo: {}, business: [], honors: [], projects: [], sites: [], splashImages: [{id:1,url:'',sort:1},{id:2,url:'',sort:2},{id:3,url:'',sort:3}], companyProfiles: [], companyProfileConfig: { sections: [] }, companyPerformances: [], companyPerformanceConfig: { sections: [] }, casePageConfig: { sections: [] }, businessModules: [], nextId: { cards: 1, messages: 1, positions: 1, videos: 1, business: 1, honors: 1, projects: 1, sites: 1, splashImages: 4, companyProfiles: 1, companyPerformances: 1, businessModules: 1 } })
  }
  res.json({ ok: true })
})

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
  console.log(`Admin panel: http://localhost:${PORT}/index.html`)
  console.log(`API base:    http://localhost:${PORT}/api`)
})
