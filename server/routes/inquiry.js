const express = require('express')
const router = express.Router()
const { readData, writeData } = require('../utils')

router.post('/', (req, res) => {
  const data = readData()
  const msg = {
    id: data.nextId.messages++,
    name: req.body.name || '',
    company: req.body.company || '',
    phone: req.body.phone || '',
    title: req.body.title || '',
    areas: req.body.areas || '',
    message: req.body.message || '',
    status: 'new',
    remark: '',
    createdAt: new Date().toLocaleString('zh-CN', { hour12: false })
  }
  data.messages.push(msg)
  writeData(data)
  res.json({ ok: true, id: msg.id })
})

module.exports = router
