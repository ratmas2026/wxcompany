const express = require('express')
const router = express.Router()
const { readData, writeData, pick, parseId, syncCompanyProfiles, saveConfigs } = require('../utils')

// GET /api/company/profile
router.get('/profile', (req, res) => {
  const data = readData()
  if (!data.companyProfiles) data.companyProfiles = []
  res.json(data.companyProfiles)
})

router.get('/profile/:id', (req, res) => {
  const id = parseId(req.params.id)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' })
  const data = readData()
  const profile = (data.companyProfiles || []).find(p => p.id === id)
  if (!profile) return res.status(404).json({ error: 'Not found' })
  res.json(profile)
})

router.post('/profile', (req, res) => {
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
  syncCompanyProfiles(data.companyProfiles)
  saveConfigs(data)
  res.json(profile)
})

router.put('/profile/:id', (req, res) => {
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
  syncCompanyProfiles(data.companyProfiles)
  saveConfigs(data)
  res.json(data.companyProfiles[idx])
})

router.delete('/profile/:id', (req, res) => {
  const data = readData()
  const id = parseInt(req.params.id)
  data.companyProfiles = (data.companyProfiles || []).filter(p => p.id !== id)
  const config = data.companyProfileConfig || { sections: [] };
  (config.sections || []).forEach(sec => {
    sec.selectedIds = (sec.selectedIds || []).filter(sid => sid !== id)
  })
  syncCompanyProfiles(data.companyProfiles)
  saveConfigs(data)
  res.json({ ok: true })
})

// Profile Config
router.get('/profile-config', (req, res) => {
  const data = readData()
  if (!data.companyProfileConfig) data.companyProfileConfig = { sections: [] }
  const config = data.companyProfileConfig
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
    syncCompanyProfiles(data.companyProfiles)
  saveConfigs(data)
  }
  res.json(config)
})

router.put('/profile-config', (req, res) => {
  const data = readData()
  data.companyProfileConfig = { ...(data.companyProfileConfig || {}), ...req.body }
  syncCompanyProfiles(data.companyProfiles)
  saveConfigs(data)
  res.json(data.companyProfileConfig)
})

// Reorder
router.post('/profile/reorder', (req, res) => {
  const data = readData()
  const { orders } = req.body
  if (!orders || !Array.isArray(orders)) return res.status(400).json({ error: 'orders array required' })
  const profiles = data.companyProfiles || []
  orders.forEach(({ id, sortOrder }) => {
    const p = profiles.find(p => p.id === id)
    if (p) p.sortOrder = sortOrder
  })
  syncCompanyProfiles(data.companyProfiles)
  saveConfigs(data)
  res.json({ ok: true })
})

// Migrate old flat profiles
router.post('/profile/migrate', (req, res) => {
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
  syncCompanyProfiles(data.companyProfiles)
  saveConfigs(data)
  res.json({ ok: true, migrated })
})

module.exports = router
