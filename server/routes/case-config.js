const express = require('express')
const router = express.Router()
const { readData, writeData } = require('../utils')

router.get('/case-page-config', (req, res) => {
  const data = readData()
  if (!data.casePageConfig) data.casePageConfig = { sections: [] }
  const config = data.casePageConfig
  let sections = config.sections || []
  let migrated = false
  sections.forEach((sec, idx) => {
    if (sec.sortOrder === undefined) {
      sec.sortOrder = (idx + 1) * 10
      migrated = true
    }
    if (sec.enabled === undefined) {
      sec.enabled = true
      migrated = true
    }
  })
  sections.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
  if (migrated) {
    config.sections = sections
    writeData(data)
  }
  res.json(config)
})

router.put('/case-page-config', (req, res) => {
  const data = readData()
  data.casePageConfig = { ...(data.casePageConfig || {}), ...req.body }
  writeData(data)
  res.json(data.casePageConfig)
})

module.exports = router
