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
// GET /api/company-infos
// -----------------------------------------------------------------

describe('GET /api/company-infos', () => {
  it('returns empty array when no company info exists', async () => {
    const res = await request(app).get('/api/company-infos')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('returns stored company infos sorted by sortOrder', async () => {
    writeData(emptyPayload({
      companyInfos: [
        { id: 1, name: 'Beta Corp', sortOrder: 20, status: true },
        { id: 2, name: 'Alpha Inc', sortOrder: 10, status: true }
      ]
    }))
    const res = await request(app).get('/api/company-infos')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0].name).toBe('Alpha Inc')
  })
})

// -----------------------------------------------------------------
// GET /api/company-infos/:id
// -----------------------------------------------------------------

describe('GET /api/company-infos/:id', () => {
  it('returns company info by ID', async () => {
    writeData(emptyPayload({
      companyInfos: [
        { id: 1, name: 'Test Co', legalPerson: 'John', phone: '13800000000' }
      ]
    }))
    const res = await request(app).get('/api/company-infos/1')
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Test Co')
  })

  it('returns 404 for non-existent id', async () => {
    const res = await request(app).get('/api/company-infos/999')
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Not found')
  })
})

// -----------------------------------------------------------------
// POST /api/company-infos
// -----------------------------------------------------------------

describe('POST /api/company-infos', () => {
  it('creates a company info with valid auth', async () => {
    const res = await request(app)
      .post('/api/company-infos')
      .set(adminHeaders())
      .send({ name: 'New Company', phone: '13800000000' })
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('New Company')
    expect(res.body.id).toBe(1)
    expect(res.body.status).toBe(true)
  })

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/company-infos')
      .send({ name: 'Ghost' })
    expect(res.status).toBe(401)
  })

  it('returns 400 when company info already exists (limit 1)', async () => {
    writeData(emptyPayload({
      companyInfos: [
        { id: 1, name: 'Existing', status: true }
      ]
    }))
    const res = await request(app)
      .post('/api/company-infos')
      .set(adminHeaders())
      .send({ name: 'Second' })
    expect(res.status).toBe(400)
  })

  it('fills defaults for missing fields', async () => {
    const res = await request(app)
      .post('/api/company-infos')
      .set(adminHeaders())
      .send({ name: 'Minimal' })
    expect(res.status).toBe(200)
    expect(res.body.address).toBe('')
    expect(res.body.website).toBe('')
    expect(res.body.description).toBe('')
    expect(res.body.sortOrder).toBe(0)
    expect(res.body.status).toBe(true)
  })
})

// -----------------------------------------------------------------
// PUT /api/company-infos/:id
// -----------------------------------------------------------------

describe('PUT /api/company-infos/:id', () => {
  it('updates an existing company info', async () => {
    writeData(emptyPayload({
      companyInfos: [
        { id: 1, name: 'Old', status: true }
      ]
    }))
    const res = await request(app)
      .put('/api/company-infos/1')
      .set(adminHeaders())
      .send({ name: 'Updated', phone: '13900000000' })
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Updated')
    expect(res.body.phone).toBe('13900000000')
  })

  it('returns 404 for non-existent id', async () => {
    const res = await request(app)
      .put('/api/company-infos/999')
      .set(adminHeaders())
      .send({ name: 'Ghost' })
    expect(res.status).toBe(404)
  })

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .put('/api/company-infos/1')
      .send({ name: 'Hack' })
    expect(res.status).toBe(401)
  })

  it('preserves id on update', async () => {
    writeData(emptyPayload({
      companyInfos: [
        { id: 1, name: 'Old', status: true }
      ]
    }))
    const res = await request(app)
      .put('/api/company-infos/1')
      .set(adminHeaders())
      .send({ name: 'Renamed', id: 999 })
    expect(res.status).toBe(200)
    expect(res.body.id).toBe(1)
  })
})

// -----------------------------------------------------------------
// DELETE /api/company-infos/:id
// -----------------------------------------------------------------

describe('DELETE /api/company-infos/:id', () => {
  it('deletes a company info', async () => {
    writeData(emptyPayload({
      companyInfos: [
        { id: 1, name: 'ToDelete' }
      ]
    }))
    const res = await request(app)
      .delete('/api/company-infos/1')
      .set(adminHeaders())
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)

    const getRes = await request(app).get('/api/company-infos')
    expect(getRes.body).toHaveLength(0)
  })

  it('returns 401 without auth', async () => {
    const res = await request(app).delete('/api/company-infos/1')
    expect(res.status).toBe(401)
  })
})
