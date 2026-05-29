const express = require('express')
const router = express.Router()
const { readData, writeData, syncSplashImages, saveConfigs } = require('../utils')

router.get('/', (req, res) => {
  const data = readData()
  if (!data.splashImages || data.splashImages.length === 0) {
    data.splashImages = [{id:1,url:'',sort:1},{id:2,url:'',sort:2},{id:3,url:'',sort:3}]
    data.nextId = data.nextId || {}
    data.nextId.splashImages = 4
    syncSplashImages(data.splashImages)
  saveConfigs(data)
  }
  res.json(data.splashImages)
})

router.put('/:id', (req, res) => {
  const data = readData()
  if (!data.splashImages) data.splashImages = [{id:1,url:'',sort:1},{id:2,url:'',sort:2},{id:3,url:'',sort:3}]
  const idx = data.splashImages.findIndex(s => s.id === parseInt(req.params.id))
  if (idx < 0) return res.status(404).json({ error: 'Not found' })
  const { pick } = require('../utils')
  data.splashImages[idx] = { ...data.splashImages[idx], ...pick(req.body, 'url', 'sort'), id: data.splashImages[idx].id, updatedAt: new Date().toISOString() }
  syncSplashImages(data.splashImages)
  saveConfigs(data)
  res.json(data.splashImages[idx])
})

module.exports = router
