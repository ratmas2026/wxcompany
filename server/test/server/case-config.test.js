import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
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
// GET /api/company/case-page-config
// -----------------------------------------------------------------

describe('GET /api/company/case-page-config', () => {
  it('returns default config when none stored', async () => {
    const res = await request(app).get('/api/company/case-page-config')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('sections')
    expect(Array.isArray(res.body.sections)).toBe(true)
  })

  it('returns persisted config', async () => {
    writeData(emptyPayload({
      casePageConfig: { sections: [{ id: 'hero', sortOrder: 0, enabled: true }] }
    }))
    const res = await request(app).get('/api/company/case-page-config')
    expect(res.status).toBe(200)
    expect(res.body.sections).toHaveLength(1)
    expect(res.body.sections[0].id).toBe('hero')
  })

  it('migrates sections missing sortOrder', async () => {
    writeData(emptyPayload({
      casePageConfig: { sections: [{ id: 'sec1' }, { id: 'sec2' }] }
    }))
    const res = await request(app).get('/api/company/case-page-config')
    expect(res.status).toBe(200)
    expect(res.body.sections[0].sortOrder).toBeDefined()
    expect(res.body.sections[1].sortOrder).toBeDefined()
  })

  it('migrates sections missing enabled flag', async () => {
    writeData(emptyPayload({
      casePageConfig: { sections: [{ id: 'sec1', sortOrder: 10 }] }
    }))
    const res = await request(app).get('/api/company/case-page-config')
    expect(res.status).toBe(200)
    expect(res.body.sections[0].enabled).toBe(true)
  })

  it('sorts sections by sortOrder', async () => {
    writeData(emptyPayload({
      casePageConfig: {
        sections: [
          { id: 'b', sortOrder: 20, enabled: true },
          { id: 'a', sortOrder: 10, enabled: true }
        ]
      }
    }))
    const res = await request(app).get('/api/company/case-page-config')
    expect(res.status).toBe(200)
    expect(res.body.sections[0].id).toBe('a')
    expect(res.body.sections[1].id).toBe('b')
  })
})

// -----------------------------------------------------------------
// PUT /api/company/case-page-config
// -----------------------------------------------------------------

describe('PUT /api/company/case-page-config', () => {
  it('updates case page config with valid auth', async () => {
    const res = await request(app)
      .put('/api/company/case-page-config')
      .set(adminHeaders())
      .send({ sections: [{ id: 'new-section' }] })
    expect(res.status).toBe(200)
    expect(res.body.sections).toHaveLength(1)
    expect(res.body.sections[0].id).toBe('new-section')
  })

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .put('/api/company/case-page-config')
      .send({ sections: [] })
    expect(res.status).toBe(401)
  })

  it('persists changes across reads', async () => {
    await request(app)
      .put('/api/company/case-page-config')
      .set(adminHeaders())
      .send({ sections: [{ id: 'custom' }] })

    const res = await request(app).get('/api/company/case-page-config')
    expect(res.body.sections[0].id).toBe('custom')
  })
})
