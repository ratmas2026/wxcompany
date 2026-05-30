const express = require('express')
const router = express.Router()
const { readData, writeData, pick, syncBusinessModules, saveConfigs } = require('../utils')

router.get('/', (req, res) => {
  const data = readData()
  if (!data.businessModules) data.businessModules = []
  res.json(data.businessModules)
})

// Page Config
router.get('/page-config', (req, res) => {
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
  sections.forEach(sec => {
    if (sec.displayLayout === 'hero' && sec.sortOrder !== 0) {
      sec.sortOrder = 0
      migrated = true
    }
  })
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
    syncBusinessModules(data.businessModules)
  saveConfigs(data)
  }
  res.json(config)
})

router.put('/page-config', (req, res) => {
  const data = readData()
  data.businessModulePageConfig = { ...(data.businessModulePageConfig || {}), ...pick(req.body, 'sections') }
  syncBusinessModules(data.businessModules)
  saveConfigs(data)
  res.json(data.businessModulePageConfig)
})

// Single module
router.get('/:id', (req, res) => {
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
    syncBusinessModules(data.businessModules)
  saveConfigs(data)
  }
  res.json(mod)
})

router.post('/', (req, res) => {
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
  syncBusinessModules(data.businessModules)
  saveConfigs(data)
  res.json(mod)
})

router.put('/:id', (req, res) => {
  const data = readData()
  const id = parseInt(req.params.id)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' })
  if (!data.businessModules) data.businessModules = []
  const idx = data.businessModules.findIndex(m => m.id === id)
  if (idx < 0) return res.status(404).json({ error: 'Not found' })
  data.businessModules[idx] = { ...data.businessModules[idx], ...pick(req.body, 'name', 'coverImage', 'coverAspectRatio', 'layoutType', 'sortOrder', 'status', 'sections', 'cards'), id: data.businessModules[idx].id }
  syncBusinessModules(data.businessModules)
  saveConfigs(data)
  res.json(data.businessModules[idx])
})

router.delete('/:id', (req, res) => {
  const data = readData()
  const id = parseInt(req.params.id)
  data.businessModules = (data.businessModules || []).filter(m => m.id !== id)
  const pageConfig = data.businessModulePageConfig || { sections: [] };
  (pageConfig.sections || []).forEach(sec => {
    sec.selectedIds = (sec.selectedIds || []).filter(sid => sid !== id)
  })
  syncBusinessModules(data.businessModules)
  saveConfigs(data)
  res.json({ ok: true })
})

// Nested cards
router.post('/:mid/cards', (req, res) => {
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
  syncBusinessModules(data.businessModules)
  saveConfigs(data)
  res.json(card)
})

router.put('/:mid/cards/:cid', (req, res) => {
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
  syncBusinessModules(data.businessModules)
  saveConfigs(data)
  res.json(mod.cards[cidx])
})

router.get('/:mid/cards/:cid', (req, res) => {
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

router.delete('/:mid/cards/:cid', (req, res) => {
  const data = readData()
  const mid = parseInt(req.params.mid)
  const cid = parseInt(req.params.cid)
  if (isNaN(mid)) return res.status(400).json({ error: 'Invalid module id' })
  if (isNaN(cid)) return res.status(400).json({ error: 'Invalid card id' })
  const mod = (data.businessModules || []).find(m => m.id === mid)
  if (!mod) return res.status(404).json({ error: 'Module not found' })
  if (!mod.cards) mod.cards = []
  mod.cards = mod.cards.filter(c => c.id !== cid)
  syncBusinessModules(data.businessModules)
  saveConfigs(data)
  res.json({ ok: true })
})

module.exports = router
