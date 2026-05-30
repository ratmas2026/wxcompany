const express = require('express')
const router = express.Router()
const { readData, writeData, syncMessages, saveConfigs } = require('../utils')
const { required, isPhone } = require('../validate')

router.post('/', (req, res) => {
  const err = required(req.body, ['name', 'phone', 'message'])
  if (err) return res.status(400).json({ error: err })
  if (!isPhone(req.body.phone)) return res.status(400).json({ error: '手机号格式不正确' })
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
  syncMessages(data.messages)
  saveConfigs(data)
  res.json({ ok: true, id: msg.id })
})

module.exports = router
