const multer = require('multer')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

const UPLOADS_DIR = path.join(__dirname, 'uploads')
const VIDEOS_DIR = path.join(UPLOADS_DIR, 'videos')
const COVERS_DIR = path.join(UPLOADS_DIR, 'covers')
const AVATARS_DIR = path.join(UPLOADS_DIR, 'avatars')
const SPLASH_DIR = path.join(UPLOADS_DIR, 'splash')
const PROFILE_DIR = path.join(UPLOADS_DIR, 'profile')
const HONORS_DIR = path.join(UPLOADS_DIR, 'honors')
const PROJECTS_DIR = path.join(UPLOADS_DIR, 'projects')
const EDITOR_DIR = path.join(UPLOADS_DIR, 'editor')
const BUSINESS_MODULES_DIR = path.join(UPLOADS_DIR, 'business-modules')
const PERFORMANCE_DIR = path.join(UPLOADS_DIR, 'performance')
const TEMPLATES_DIR = path.join(__dirname, 'templates')

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
if (!fs.existsSync(TEMPLATES_DIR)) fs.mkdirSync(TEMPLATES_DIR, { recursive: true })

const imageMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const videoMimes = ['video/mp4', 'video/webm']

function imageFilter(req, file, cb) {
  if (imageMimes.includes(file.mimetype)) { cb(null, true) }
  else { cb(new Error('仅支持 JPEG/PNG/GIF/WebP 图片格式'), false) }
}

function videoFilter(req, file, cb) {
  if (videoMimes.includes(file.mimetype)) { cb(null, true) }
  else { cb(new Error('仅支持 MP4/WebM 视频格式'), false) }
}

function templateFilter(req, file, cb) {
  if (file.mimetype === 'text/html' || file.mimetype === 'text/plain') { cb(null, true) }
  else { cb(new Error('仅支持 HTML/TXT 文件'), false) }
}

// Video storage
const videoStorage = multer.diskStorage({
  destination: function(req, file, cb) { cb(null, VIDEOS_DIR) },
  filename: function(req, file, cb) {
    const ext = path.extname(file.originalname) || '.mp4'
    cb(null, 'video_' + Date.now() + '_' + Math.round(Math.random() * 1000) + ext)
  }
})

// Cover storage
const coverStorage = multer.diskStorage({
  destination: function(req, file, cb) { cb(null, COVERS_DIR) },
  filename: function(req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg'
    cb(null, 'cover_' + Date.now() + '_' + Math.round(Math.random() * 1000) + ext)
  }
})

// Avatar storage
const avatarStorage = multer.diskStorage({
  destination: function(req, file, cb) { cb(null, AVATARS_DIR) },
  filename: function(req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg'
    cb(null, 'avatar_' + Date.now() + '_' + Math.round(Math.random() * 1000) + ext)
  }
})

// Splash storage
const splashStorage = multer.diskStorage({
  destination: function(req, file, cb) { cb(null, SPLASH_DIR) },
  filename: function(req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg'
    cb(null, 'splash_' + Date.now() + '_' + Math.round(Math.random() * 1000) + ext)
  }
})

// Profile storage
const profileStorage = multer.diskStorage({
  destination: function(req, file, cb) { cb(null, PROFILE_DIR) },
  filename: function(req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg'
    cb(null, 'profile_' + Date.now() + '_' + Math.round(Math.random() * 1000) + ext)
  }
})

// Honors storage
const honorsStorage = multer.diskStorage({
  destination: function(req, file, cb) { cb(null, HONORS_DIR) },
  filename: function(req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg'
    cb(null, 'honor_' + Date.now() + '_' + Math.round(Math.random() * 1000) + ext)
  }
})

// Projects storage
const projectsStorage = multer.diskStorage({
  destination: function(req, file, cb) { cb(null, PROJECTS_DIR) },
  filename: function(req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg'
    cb(null, 'project_' + Date.now() + '_' + Math.round(Math.random() * 1000) + ext)
  }
})

// Editor storage
const editorStorage = multer.diskStorage({
  destination: function(req, file, cb) { cb(null, EDITOR_DIR) },
  filename: function(req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg'
    cb(null, 'editor_' + Date.now() + '_' + Math.round(Math.random() * 1000) + ext)
  }
})

// Business Module storage
const businessModuleStorage = multer.diskStorage({
  destination: function(req, file, cb) { cb(null, BUSINESS_MODULES_DIR) },
  filename: function(req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg'
    cb(null, 'bm_' + Date.now() + '_' + Math.round(Math.random() * 1000) + ext)
  }
})

// Performance storage
const performanceStorage = multer.diskStorage({
  destination: function(req, file, cb) { cb(null, PERFORMANCE_DIR) },
  filename: function(req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg'
    cb(null, 'performance_' + Date.now() + '_' + Math.round(Math.random() * 1000) + ext)
  }
})

// Template storage
const templateStorage = multer.diskStorage({
  destination: function(req, file, cb) { cb(null, TEMPLATES_DIR) },
  filename: function(req, file, cb) {
    const ext = path.extname(file.originalname) || '.html'
    cb(null, crypto.randomUUID() + ext)
  }
})

// Multer instances
const uploadVideo = multer({ storage: videoStorage, limits: { fileSize: 50 * 1048576 }, fileFilter: videoFilter })
const uploadCover = multer({ storage: coverStorage, limits: { fileSize: 5 * 1048576 }, fileFilter: imageFilter })
const uploadAvatar = multer({ storage: avatarStorage, limits: { fileSize: 1 * 1048576 }, fileFilter: imageFilter })
const uploadSplash = multer({ storage: splashStorage, limits: { fileSize: 5 * 1048576 }, fileFilter: imageFilter })
const uploadProfile = multer({ storage: profileStorage, limits: { fileSize: 5 * 1048576 }, fileFilter: imageFilter })
const uploadHonors = multer({ storage: honorsStorage, limits: { fileSize: 5 * 1048576 }, fileFilter: imageFilter })
const uploadProjects = multer({ storage: projectsStorage, limits: { fileSize: 5 * 1048576 }, fileFilter: imageFilter })
const uploadEditor = multer({ storage: editorStorage, limits: { fileSize: 50 * 1048576 }, fileFilter: imageFilter })
const uploadBusinessModule = multer({ storage: businessModuleStorage, limits: { fileSize: 5 * 1048576 }, fileFilter: imageFilter })
const uploadPerformance = multer({ storage: performanceStorage, limits: { fileSize: 5 * 1048576 }, fileFilter: imageFilter })
const uploadTemplate = multer({ storage: templateStorage, limits: { fileSize: 500 * 1024 }, fileFilter: templateFilter })

// Multer error handling middleware
function multerErrorHandler(err, req, res, next) {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large' })
  }
  if (err.name === 'MulterError') {
    return res.status(400).json({ error: err.message })
  }
  next(err)
}

module.exports = {
  UPLOADS_DIR,
  TEMPLATES_DIR,
  uploadVideo,
  uploadCover,
  uploadAvatar,
  uploadSplash,
  uploadProfile,
  uploadHonors,
  uploadProjects,
  uploadEditor,
  uploadBusinessModule,
  uploadPerformance,
  uploadTemplate,
  multerErrorHandler
}
