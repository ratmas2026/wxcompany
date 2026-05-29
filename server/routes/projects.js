const express = require('express')
const router = express.Router()
const { readData, writeData, pick, syncProjects, saveConfigs } = require('../utils')

// GET /api/company/performance-config (mounted under /api/company/performance by server)
// Performance config routes are already in company-performance.js

router.get('/', (req, res) => {
  const data = readData()
  if (!data.projects) data.projects = []
  res.json(data.projects)
})

router.get('/:id', (req, res) => {
  const data = readData()
  const project = (data.projects || []).find(p => p.id === parseInt(req.params.id))
  if (!project) return res.status(404).json({ error: 'Not found' })
  res.json(project)
})

router.post('/', (req, res) => {
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
  syncProjects(data.projects)
  saveConfigs(data)
  res.json(item)
})

router.put('/:id', (req, res) => {
  const data = readData()
  const idx = (data.projects || []).findIndex(p => p.id === parseInt(req.params.id))
  if (idx < 0) return res.status(404).json({ error: 'Not found' })
  data.projects[idx] = { ...data.projects[idx], ...pick(req.body, 'name', 'location', 'year', 'desc', 'scale', 'period', 'investment', 'address', 'image', 'images', 'tags', 'highlights', 'detail', 'detailImages', 'results', 'sortOrder', 'status', 'createdAt'), id: data.projects[idx].id }
  syncProjects(data.projects)
  saveConfigs(data)
  res.json(data.projects[idx])
})

router.delete('/:id', (req, res) => {
  const data = readData()
  data.projects = (data.projects || []).filter(p => p.id !== parseInt(req.params.id))
  syncProjects(data.projects)
  saveConfigs(data)
  res.json({ ok: true })
})

module.exports = router
