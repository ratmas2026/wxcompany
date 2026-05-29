const express = require('express')
const router = express.Router()
const { readData, writeData, pick, syncMessages, saveConfigs } = require('../utils')

router.get('/', (req, res) => {
  const data = readData()
  res.json(data.messages)
})

router.put('/:id', (req, res) => {
  const data = readData()
  const idx = data.messages.findIndex(m => m.id === parseInt(req.params.id))
  if (idx < 0) return res.status(404).json({ error: 'Not found' })
  data.messages[idx] = { ...data.messages[idx], ...pick(req.body, 'status', 'remark'), id: data.messages[idx].id }
  syncMessages(data.messages)
  saveConfigs(data)
  res.json(data.messages[idx])
})

router.post('/batch-delete', (req, res) => {
  const data = readData()
  const { ids } = req.body
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be an array' })
  data.messages = data.messages.filter(m => !ids.includes(m.id))
  syncMessages(data.messages)
  saveConfigs(data)
  res.json({ ok: true, deleted: ids.length })
})

module.exports = router
