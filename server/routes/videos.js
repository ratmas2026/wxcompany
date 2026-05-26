const express = require('express')
const router = express.Router()
const { readData, writeData, pick } = require('../utils')

router.get('/', (req, res) => {
  const data = readData()
  res.json(data.videos)
})

router.post('/', (req, res) => {
  const data = readData()
  const video = req.body
  video.id = data.nextId.videos++
  video.createdAt = video.createdAt || new Date().toISOString().split('T')[0]
  video.views = video.views || 0
  data.videos.push(video)
  writeData(data)
  res.json(video)
})

router.put('/:id', (req, res) => {
  const data = readData()
  const idx = data.videos.findIndex(v => v.id === parseInt(req.params.id))
  if (idx < 0) return res.status(404).json({ error: 'Not found' })
  data.videos[idx] = { ...data.videos[idx], ...pick(req.body, 'url', 'title', 'description', 'sortOrder', 'status', 'createdAt'), id: data.videos[idx].id }
  writeData(data)
  res.json(data.videos[idx])
})

router.post('/batch-delete', (req, res) => {
  const data = readData()
  const { ids } = req.body
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be an array' })
  data.videos = data.videos.filter(v => !ids.includes(v.id))
  writeData(data)
  res.json({ ok: true, deleted: ids.length })
})

module.exports = router
