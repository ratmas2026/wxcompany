import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import request from 'supertest'

let app, createToken, writeData, readData

beforeAll(async () => {
  process.env.ADMIN_USER = 'testuser'
  process.env.ADMIN_PASS = 'testpass'

  const dbMod = require('../../db.js')
  await dbMod.initDatabase()
  writeData = dbMod.writeData
  readData = dbMod.readData

  const server = require('../../server.js')
  app = server.app
  createToken = server.createToken
})

function adminHeaders() {
  return { Authorization: 'Bearer ' + createToken() }
}

function emptyPayload(overrides = {}) {
  return {
    cards: [], messages: [], positions: [], videos: [],
    splashImages: [],
    companyProfiles: [], companyPerformances: [], businessModules: [],
    honors: [], projects: [], sites: [], companyInfos: [],
    companyProfileConfig: { sections: [] },
    companyPerformanceConfig: { sections: [] },
    casePageConfig: { sections: [] },
    businessModulePageConfig: { sections: [] },
    cardPageConfig: { sections: [] },
    nextId: {
      cards: 1, messages: 1, positions: 1, videos: 1,
      honors: 1, projects: 1, sites: 1, splashImages: 4,
      companyProfiles: 1, companyPerformances: 1, businessModules: 1,
      companyInfos: 1
    },
    ...overrides
  }
}

beforeEach(() => {
  writeData(emptyPayload())
})

// -----------------------------------------------------------------
// POST /api/reset
// -----------------------------------------------------------------

describe('POST /api/reset', () => {
  it('resets data to seed state', async () => {
    // First add some data
    writeData(emptyPayload({
      cards: [
        { id: 1, name: 'User', phone: '111', title: '', department: '',
          company: '', email: '', address: '', avatar: '', bio: '',
          status: true, createdAt: '2024' }
      ],
      companyInfos: [
        { id: 1, name: 'Co', status: true }
      ],
      nextId: {
        cards: 5, messages: 1, positions: 1, videos: 1,
        honors: 1, projects: 1, sites: 1, splashImages: 4,
        companyProfiles: 1, companyPerformances: 1, businessModules: 1,
        companyInfos: 1
      }
    }))

    const res = await request(app)
      .post('/api/reset')
      .set(adminHeaders())
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)

    // Verify data was reset (seed file mock returns {}, so DB is emptied)
    const data = readData()
    expect(data.cards).toHaveLength(0)
    expect(data.companyInfos).toHaveLength(0)
  })

  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/reset')
    expect(res.status).toBe(401)
  })

  it('resets to default splash images', async () => {
    writeData(emptyPayload({
      splashImages: [
        { id: 100, url: '/custom.jpg', sort: 1 }
      ]
    }))
    await request(app).post('/api/reset').set(adminHeaders())
    const data = readData()
    expect(data.splashImages).toHaveLength(3)
    expect(data.splashImages[0].id).toBe(1)
  })

  it('resets template list', async () => {
    writeData(emptyPayload({
      templates: [
        { id: 1, name: 'test', filename: 't.html', mime_type: 'text/html', size: 100 }
      ]
    }))
    await request(app).post('/api/reset').set(adminHeaders())
    const data = readData()
    expect(data.templates).toHaveLength(0)
  })
})
