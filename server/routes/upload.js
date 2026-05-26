const express = require('express')
const router = express.Router()
const { compressImage } = require('../compress')
const { uploadVideo, uploadCover, uploadAvatar, uploadSplash, uploadProfile, uploadEditor, uploadBusinessModule, uploadPerformance, uploadHonors, uploadProjects } = require('../upload')

router.post('/video', uploadVideo.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No video file' })
  res.json({ url: '/uploads/videos/' + req.file.filename })
})

router.post('/cover', uploadCover.single('cover'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No cover file' })
  compressImage(req.file.path).catch(() => {})
  res.json({ url: '/uploads/covers/' + req.file.filename })
})

router.post('/avatar', uploadAvatar.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No avatar file' })
  compressImage(req.file.path).catch(() => {})
  res.json({ url: '/uploads/avatars/' + req.file.filename })
})

router.post('/splash', uploadSplash.single('splash'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No splash file' })
  compressImage(req.file.path).catch(() => {})
  res.json({ url: '/uploads/splash/' + req.file.filename })
})

router.post('/profile', uploadProfile.single('profile'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No profile file' })
  compressImage(req.file.path).catch(() => {})
  res.json({ url: '/uploads/profile/' + req.file.filename })
})

router.post('/editor', uploadEditor.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' })
  compressImage(req.file.path).catch(() => {})
  res.json({ url: '/uploads/editor/' + req.file.filename })
})

router.post('/business-module', uploadBusinessModule.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' })
  compressImage(req.file.path).catch(() => {})
  res.json({ url: '/uploads/business-modules/' + req.file.filename })
})

router.post('/performance', uploadPerformance.single('performance'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' })
  compressImage(req.file.path).catch(() => {})
  res.json({ url: '/uploads/performance/' + req.file.filename })
})

router.post('/honors', uploadHonors.single('honors'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' })
  compressImage(req.file.path).catch(() => {})
  res.json({ url: '/uploads/honors/' + req.file.filename })
})

router.post('/projects', uploadProjects.single('projects'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' })
  compressImage(req.file.path).catch(() => {})
  res.json({ url: '/uploads/projects/' + req.file.filename })
})

module.exports = router
