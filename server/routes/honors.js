const express = require('express')
const router = express.Router()
const { readData, writeData, pick, syncHonors, saveConfigs } = require('../utils')

router.get('/', (req, res) => {
  const data = readData()
  if (!data.honors) data.honors = []
  res.json(data.honors)
})

router.get('/:id', (req, res) => {
  const data = readData()
  const item = (data.honors || []).find(h => h.id === parseInt(req.params.id))
  if (!item) return res.status(404).json({ error: 'Not found' })
  res.json(item)
})

router.post('/', (req, res) => {
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
  syncHonors(data.honors)
  saveConfigs(data)
  res.json(item)
})

router.put('/:id', (req, res) => {
  const data = readData()
  const idx = (data.honors || []).findIndex(h => h.id === parseInt(req.params.id))
  if (idx < 0) return res.status(404).json({ error: 'Not found' })
  data.honors[idx] = { ...data.honors[idx], ...pick(req.body, 'image', 'name', 'description', 'sortOrder', 'status', 'createdAt'), id: data.honors[idx].id }
  syncHonors(data.honors)
  saveConfigs(data)
  res.json(data.honors[idx])
})

router.delete('/:id', (req, res) => {
  const data = readData()
  data.honors = (data.honors || []).filter(h => h.id !== parseInt(req.params.id))
  syncHonors(data.honors)
  saveConfigs(data)
  res.json({ ok: true })
})

module.exports = router
