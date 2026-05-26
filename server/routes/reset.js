const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')
const { writeData } = require('../utils')

router.post('/', (req, res) => {
  const seedFile = path.join(__dirname, '..', 'data-seed.json')
  try {
    if (fs.existsSync(seedFile)) {
      const seed = JSON.parse(fs.readFileSync(seedFile, 'utf-8'))
      writeData(seed)
    } else {
      writeData({ cards: [], messages: [], positions: [], videos: [], companyInfo: {}, companyInfos: [], honors: [], projects: [], splashImages: [{id:1,url:'',sort:1},{id:2,url:'',sort:2},{id:3,url:'',sort:3}], companyProfiles: [], companyProfileConfig: { sections: [] }, companyPerformances: [], companyPerformanceConfig: { sections: [] }, casePageConfig: { sections: [] }, businessModules: [], businessModulePageConfig: { sections: [] }, templates: [], nextId: { cards: 1, messages: 1, positions: 1, videos: 1, honors: 1, projects: 1, splashImages: 4, companyProfiles: 1, companyPerformances: 1, businessModules: 1, companyInfos: 1, templates: 1 } })
    }
  } catch (e) {
    writeData({ cards: [], messages: [], positions: [], videos: [], companyInfo: {}, companyInfos: [], honors: [], projects: [], splashImages: [{id:1,url:'',sort:1},{id:2,url:'',sort:2},{id:3,url:'',sort:3}], companyProfiles: [], companyProfileConfig: { sections: [] }, companyPerformances: [], companyPerformanceConfig: { sections: [] }, casePageConfig: { sections: [] }, businessModules: [], businessModulePageConfig: { sections: [] }, templates: [], nextId: { cards: 1, messages: 1, positions: 1, videos: 1, honors: 1, projects: 1, splashImages: 4, companyProfiles: 1, companyPerformances: 1, businessModules: 1, companyInfos: 1, templates: 1 } })
  }
  res.json({ ok: true })
})

module.exports = router
