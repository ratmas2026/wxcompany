const express = require('express')
const cors = require('cors')
const compression = require('compression')
const path = require('path')
const db = require('./db')
const { globalLimiter, loginLimiter, smsLimiter, authMiddleware } = require('./auth')
const { UPLOADS_DIR, multerErrorHandler } = require('./upload')

const app = express()
const PORT = 3456

// Global middleware
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
app.use(multerErrorHandler)

// Rate limiting
app.use('/api', globalLimiter)
app.use('/api/login', loginLimiter)
app.use('/api/sms/send', smsLimiter)

// Auth middleware
app.use(authMiddleware)

// API health check
app.get('/api', (req, res) => res.json({ ok: true, endpoints: ['company/profile','company/profile/:id','cards','messages','positions','videos','honors','honors/:id','projects','projects/:id','splash','user/phone/:phone','inquiry','reset','upload/video','upload/cover','upload/avatar','upload/splash','upload/profile','upload/honors','upload/projects','upload/editor','business-modules','business-modules/:id','business-modules/:mid/cards','business-modules/:mid/cards/:cid','upload/business-module','templates','templates/:id/raw','templates/:id/render'] }))

// Routes — mounted at specific prefixes to match original paths
app.use('/api', require('./routes/auth'))                           // /api/login, /api/sms/send, /api/auth-check
app.use('/api', require('./routes/cards'))                          // /api/cards, /api/cards/:id, /api/user/phone/:phone
app.use('/api', require('./routes/card-config'))                    // /api/card-page-config
app.use('/api/company-infos', require('./routes/company-infos'))    // /api/company-infos, /api/company-infos/:id
app.use('/api/company', require('./routes/company-profile'))        // /api/company/profile, /api/company/profile-config, etc.
app.use('/api/company', require('./routes/company-performance'))    // /api/company/performance, /api/company/performance-config, etc.
app.use('/api/company', require('./routes/case-config'))            // /api/company/case-page-config
app.use('/api/business-modules', require('./routes/business-modules')) // /api/business-modules, /api/business-modules/:id, etc.
app.use('/api/honors', require('./routes/honors'))                  // /api/honors, /api/honors/:id
app.use('/api/projects', require('./routes/projects'))              // /api/projects, /api/projects/:id
app.use('/api/upload', require('./routes/upload'))                  // /api/upload/cover, /api/upload/avatar, etc.
app.use('/api/splash', require('./routes/splash'))                  // /api/splash, /api/splash/:id
app.use('/api/messages', require('./routes/messages'))              // /api/messages, /api/messages/:id
app.use('/api/positions', require('./routes/positions'))            // /api/positions, /api/positions/:id
app.use('/api/videos', require('./routes/videos'))                  // /api/videos, /api/videos/:id
app.use('/api/inquiry', require('./routes/inquiry'))                // /api/inquiry
app.use('/api/reset', require('./routes/reset'))                    // /api/reset
app.use('/api/templates', require('./routes/templates'))            // /api/templates, /api/templates/:id/raw, etc.

// Re-export for test compatibility
const { generateCode, createToken, createUserToken, validateToken, getTokenType, TOKEN_TTL } = require('./auth')
module.exports = { app, generateCode, createToken, createUserToken, validateToken, getTokenType, TOKEN_TTL }

// Start server (skip in tests — supertest manages its own listen)
if (!process.env.VITEST) {
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
}
