const express = require('express')
const router = express.Router()
const { readData, writeData, pick } = require('../utils')

router.get('/', (req, res) => {
  const data = readData()
  res.json(data.positions)
})

router.post('/', (req, res) => {
  const data = readData()
  const pos = req.body
  pos.id = data.nextId.positions++
  pos.count = pos.count || 0
  data.positions.push(pos)
  writeData(data)
  res.json(pos)
})

router.put('/:id', (req, res) => {
  const data = readData()
  const idx = data.positions.findIndex(p => p.id === parseInt(req.params.id))
  if (idx < 0) return res.status(404).json({ error: 'Not found' })
  data.positions[idx] = { ...data.positions[idx], ...pick(req.body, 'title', 'department', 'location', 'requirement', 'sortOrder', 'status', 'createdAt'), id: data.positions[idx].id }
  writeData(data)
  res.json(data.positions[idx])
})

router.post('/batch-delete', (req, res) => {
  const data = readData()
  const { ids } = req.body
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be an array' })
  data.positions = data.positions.filter(p => !ids.includes(p.id))
  writeData(data)
  res.json({ ok: true, deleted: ids.length })
})

module.exports = router
