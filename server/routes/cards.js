const express = require('express')
const router = express.Router()
const { readData, writeData, pick, parseId, syncCards, saveConfigs } = require('../utils')
const { required, allowed } = require('../validate')
const templateCache = require('../template-cache')

router.get('/cards', (req, res) => {
  const data = readData()
  res.json(data.cards)
})

// Lookup user by phone (for mini program login) — must be before /cards/:id
router.get('/user/phone/:phone', (req, res) => {
  const data = readData()
  const card = data.cards.find(c => c.phone === req.params.phone)
  if (!card) return res.status(404).json({ error: 'Not found' })
  res.json({ nickName: card.name, title: card.title, company: card.company, department: card.department, phone: card.phone, avatar: card.avatar })
})

router.get('/cards/:id', (req, res) => {
  const id = parseId(req.params.id)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' })
  const data = readData()
  const card = data.cards.find(c => c.id === id)
  if (!card) return res.status(404).json({ error: 'Not found' })
  res.json(card)
})

router.post('/cards', (req, res) => {
  const data = readData()
  const card = allowed(req.body, 'name', 'phone', 'title', 'department', 'company', 'email', 'address', 'avatar', 'bio', 'status', 'template')
  const err = required(card, ['name', 'phone'])
  if (err) return res.status(400).json({ error: err })
  card.id = data.nextId.cards++
  card.createdAt = card.createdAt || new Date().toISOString().split('T')[0]
  card.status = card.status !== undefined ? card.status : true
  data.cards.unshift(card)
  syncCards(data.cards)
  saveConfigs(data)
  res.json(card)
})

router.put('/cards/:id', (req, res) => {
  const data = readData()
  const idx = data.cards.findIndex(c => c.id === parseInt(req.params.id))
  if (idx < 0) return res.status(404).json({ error: 'Not found' })
  data.cards[idx] = { ...data.cards[idx], ...pick(req.body, 'name', 'phone', 'title', 'department', 'company', 'email', 'address', 'avatar', 'bio', 'status', 'template'), id: data.cards[idx].id }
  syncCards(data.cards)
  saveConfigs(data)
  templateCache.invalidateUser(req.params.id)
  res.json(data.cards[idx])
})

router.delete('/cards/:id', (req, res) => {
  const data = readData()
  data.cards = data.cards.filter(c => c.id !== parseInt(req.params.id))
  syncCards(data.cards)
  saveConfigs(data)
  res.json({ ok: true })
})

router.patch('/cards/:id/toggle', (req, res) => {
  const data = readData()
  const card = data.cards.find(c => c.id === parseInt(req.params.id))
  if (!card) return res.status(404).json({ error: 'Not found' })
  card.status = !card.status
  syncCards(data.cards)
  saveConfigs(data)
  res.json(card)
})

router.post('/cards/batch-delete', (req, res) => {
  const data = readData()
  const { ids } = req.body
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be an array' })
  data.cards = data.cards.filter(c => !ids.includes(c.id))
  syncCards(data.cards)
  saveConfigs(data)
  res.json({ ok: true, deleted: ids.length })
})

module.exports = router
