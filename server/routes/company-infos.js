const express = require('express')
const router = express.Router()
const { readData, writeData, pick, syncCompanyInfos, saveConfigs } = require('../utils')

router.get('/', (req, res) => {
  const data = readData()
  if (!data.companyInfos) data.companyInfos = []
  res.json(data.companyInfos.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)))
})

router.get('/:id', (req, res) => {
  const data = readData()
  const item = (data.companyInfos || []).find(ci => ci.id === parseInt(req.params.id))
  if (!item) return res.status(404).json({ error: 'Not found' })
  res.json(item)
})

router.post('/', (req, res) => {
  const data = readData()
  if ((data.companyInfos || []).length >= 1) {
    return res.status(400).json({ error: '仅允许创建一个企业信息，请编辑现有条目' })
  }
  if (!data.companyInfos) data.companyInfos = []
  if (!data.nextId.companyInfos) data.nextId.companyInfos = 1
  const item = {
    ...pick(req.body, 'name', 'legalPerson', 'phone', 'address', 'longitude', 'latitude', 'website', 'description', 'sortOrder', 'status'),
    id: data.nextId.companyInfos++,
    name: req.body.name || '',
    legalPerson: req.body.legalPerson || '',
    phone: req.body.phone || '',
    address: req.body.address || '',
    longitude: req.body.longitude || null,
    latitude: req.body.latitude || null,
    website: req.body.website || '',
    description: req.body.description || '',
    sortOrder: req.body.sortOrder || 0,
    status: req.body.status !== undefined ? req.body.status : true,
    createdAt: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString()
  }
  data.companyInfos.push(item)
  syncCompanyInfos(data.companyInfos)
  saveConfigs(data)
  res.json(item)
})

router.put('/:id', (req, res) => {
  const data = readData()
  const idx = (data.companyInfos || []).findIndex(ci => ci.id === parseInt(req.params.id))
  if (idx < 0) return res.status(404).json({ error: 'Not found' })
  data.companyInfos[idx] = { ...data.companyInfos[idx], ...pick(req.body, 'name', 'legalPerson', 'phone', 'address', 'longitude', 'latitude', 'website', 'description', 'sortOrder', 'status'), id: data.companyInfos[idx].id, updatedAt: new Date().toISOString() }
  syncCompanyInfos(data.companyInfos)
  saveConfigs(data)
  res.json(data.companyInfos[idx])
})

router.delete('/:id', (req, res) => {
  const data = readData()
  data.companyInfos = (data.companyInfos || []).filter(ci => ci.id !== parseInt(req.params.id))
  syncCompanyInfos(data.companyInfos)
  saveConfigs(data)
  res.json({ ok: true })
})

module.exports = router
