const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')
const { readData, writeData } = require('../utils')
const sanitizer = require('../sanitizer')
const templateEngine = require('../template-engine')
const templateCache = require('../template-cache')
const { uploadTemplate } = require('../upload')

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates')

router.get('/', (req, res) => {
  const data = readData()
  res.json({ ok: true, templates: data.templates || [] })
})

// Upload template
router.post('/', uploadTemplate.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: '请选择文件' })

    const ext = path.extname(req.file.originalname).toLowerCase()
    if (ext !== '.html' && ext !== '.htm' && ext !== '.txt') {
      try { fs.unlinkSync(req.file.path) } catch (_) {}
      return res.status(400).json({ ok: false, error: '仅支持 HTML/TXT 文件' })
    }

    let content
    try {
      content = fs.readFileSync(req.file.path, 'utf-8')
    } catch (e) {
      return res.status(500).json({ ok: false, error: '文件读取失败' })
    }

    const isHtml = ext === '.html' || ext === '.htm'
    if (isHtml) {
      content = await sanitizer.sanitize(content)
      try { fs.writeFileSync(req.file.path, content, 'utf-8') } catch (_) {}
    }

    const data = readData()
    if (!data.templates) data.templates = []
    if (!data.nextId.templates) data.nextId.templates = 1

    const name = path.basename(req.file.originalname, ext)
    const template = {
      id: data.nextId.templates++,
      name: name,
      filename: req.file.filename,
      mime_type: isHtml ? 'text/html' : 'text/plain',
      size: req.file.size,
      created_at: new Date().toISOString()
    }
    data.templates.push(template)
    writeData(data)

    res.json({ ok: true, template: template })
  } catch (e) {
    console.error('[templates] Upload error:', e)
    if (req.file) {
      try { fs.unlinkSync(req.file.path) } catch (_) {}
    }
    res.status(500).json({ ok: false, error: '模板上传处理失败' })
  }
})

// Delete template by ID
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id)
  if (isNaN(id)) return res.status(400).json({ ok: false, error: 'Invalid id' })

  const data = readData()
  const idx = (data.templates || []).findIndex(t => t.id === id)
  if (idx < 0) return res.status(404).json({ ok: false, error: 'Template not found' })

  const template = data.templates[idx]

  const filePath = path.join(TEMPLATES_DIR, template.filename)
  try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath) } catch (_) {}

  data.templates.splice(idx, 1)

  const templateIdStr = String(id)
  let changed = false
  data.cards.forEach(c => {
    if (c.template === templateIdStr) { c.template = ''; changed = true }
  })
  writeData(data)
  res.json({ ok: true })
})

// Get raw template content
router.get('/:id/raw', (req, res) => {
  const id = parseInt(req.params.id)
  if (isNaN(id)) return res.status(400).json({ ok: false, error: 'Invalid id' })

  const data = readData()
  const template = (data.templates || []).find(t => t.id === id)
  if (!template) return res.status(404).json({ ok: false, error: 'Template not found' })

  const filePath = path.join(TEMPLATES_DIR, template.filename)
  if (!fs.existsSync(filePath)) return res.status(404).json({ ok: false, error: 'Template file not found' })

  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    res.json({ ok: true, content: content, mime_type: template.mime_type, name: template.name })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Failed to read template' })
  }
})

// Render template with card data
router.get('/:id/render', async (req, res) => {
  const id = parseInt(req.params.id)
  const cardId = parseInt(req.query.cardId)
  if (isNaN(id)) return res.status(400).send('Invalid template id')

  const cacheKey = templateCache.getCacheKey(id, cardId || 0)

  const cached = templateCache.get(cacheKey)
  if (cached) {
    res.setHeader('X-Cache', 'HIT')
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    return res.send(cached)
  }

  const data = readData()
  const template = (data.templates || []).find(t => t.id === id)
  if (!template) return res.status(404).send('Template not found')

  const filePath = path.join(TEMPLATES_DIR, template.filename)
  if (!fs.existsSync(filePath)) return res.status(404).send('Template file not found')

  try {
    let content = fs.readFileSync(filePath, 'utf-8')

    let card = null
    if (cardId) {
      card = data.cards.find(c => c.id === cardId)
    }

    const companyInfo = (data.companyInfos || []).find(ci => ci.status !== false) || {}

    const renderData = {
      user: card ? {
        name: card.name || '',
        phone: card.phone || '',
        title: card.title || '',
        department: card.department || '',
        email: card.email || '',
        address: card.address || '',
        avatar: card.avatar || '',
        bio: card.bio || ''
      } : { name: '', phone: '', title: '', department: '', email: '', address: '', avatar: '', bio: '' },
      company: {
        name: card ? card.company : (companyInfo.name || ''),
        logo: companyInfo.logo || ''
      },
      qr_code: card ? (card.qr_code || '') : ''
    }

    let result
    if (template.mime_type === 'text/plain') {
      result = templateEngine.wrapTxtAsHtml(templateEngine.renderTemplateRaw(content, renderData))
    } else {
      result = await sanitizer.sanitize(templateEngine.renderTemplate(content, renderData))
    }

    if (!/<html/i.test(result)) {
      result = templateEngine.wrapHtmlDocument(result)
    }

    templateCache.set(cacheKey, result)

    res.setHeader('X-Cache', 'MISS')
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(result)
  } catch (e) {
    res.status(500).send('Render error')
  }
})

module.exports = router
