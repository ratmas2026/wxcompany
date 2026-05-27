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
// GET /api/business-modules
// -----------------------------------------------------------------

describe('GET /api/business-modules', () => {
  it('returns empty array when no modules exist', async () => {
    const res = await request(app).get('/api/business-modules')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('returns stored modules', async () => {
    writeData(emptyPayload({
      businessModules: [
        { id: 1, name: 'Module A', coverImage: '', coverAspectRatio: '16:9',
          layoutType: 'carousel', sortOrder: 0, status: true,
          sections: [], cards: [], createdAt: '2024' }
      ]
    }))
    const res = await request(app).get('/api/business-modules')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].name).toBe('Module A')
  })
})

// -----------------------------------------------------------------
// GET /api/business-modules/page-config
// -----------------------------------------------------------------

describe('GET /api/business-modules/page-config', () => {
  it('returns default config', async () => {
    const res = await request(app).get('/api/business-modules/page-config')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('sections')
  })

  it('migrates grid-6 to grid-6-3x2', async () => {
    writeData(emptyPayload({
      businessModulePageConfig: {
        sections: [{ id: 'g', displayLayout: 'grid-6', sortOrder: 10, status: true }]
      }
    }))
    const res = await request(app).get('/api/business-modules/page-config')
    expect(res.body.sections[0].displayLayout).toBe('grid-6-3x2')
  })

  it('sorts hero to first position', async () => {
    writeData(emptyPayload({
      businessModulePageConfig: {
        sections: [
          { id: 'a', displayLayout: 'grid', sortOrder: 10, status: true },
          { id: 'b', displayLayout: 'hero', sortOrder: 20, status: true }
        ]
      }
    }))
    const res = await request(app).get('/api/business-modules/page-config')
    expect(res.body.sections[0].displayLayout).toBe('hero')
  })
})

// -----------------------------------------------------------------
// PUT /api/business-modules/page-config
// -----------------------------------------------------------------

describe('PUT /api/business-modules/page-config', () => {
  it('updates config with valid auth', async () => {
    const res = await request(app)
      .put('/api/business-modules/page-config')
      .set(adminHeaders())
      .send({ sections: [{ id: 'new-hero', displayLayout: 'hero' }] })
    expect(res.status).toBe(200)
    expect(res.body.sections[0].id).toBe('new-hero')
  })

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .put('/api/business-modules/page-config')
      .send({ sections: [] })
    expect(res.status).toBe(401)
  })
})

// -----------------------------------------------------------------
// GET /api/business-modules/:id
// -----------------------------------------------------------------

describe('GET /api/business-modules/:id', () => {
  it('returns module by ID', async () => {
    writeData(emptyPayload({
      businessModules: [
        { id: 1, name: 'Target', status: true, sections: [], cards: [], createdAt: '2024' }
      ]
    }))
    const res = await request(app).get('/api/business-modules/1')
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Target')
  })

  it('returns 404 for non-existent id', async () => {
    const res = await request(app).get('/api/business-modules/999')
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Not found')
  })

  it('migrates grid-6 in module sections', async () => {
    writeData(emptyPayload({
      businessModules: [
        { id: 1, name: 'M', sections: [{ displayLayout: 'grid-6' }], cards: [], createdAt: '2024' }
      ]
    }))
    const res = await request(app).get('/api/business-modules/1')
    expect(res.body.sections[0].displayLayout).toBe('grid-6-3x2')
  })
})

// -----------------------------------------------------------------
// POST /api/business-modules
// -----------------------------------------------------------------

describe('POST /api/business-modules', () => {
  it('creates a module with valid auth', async () => {
    const res = await request(app)
      .post('/api/business-modules')
      .set(adminHeaders())
      .send({ name: 'New Module' })
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('New Module')
    expect(res.body.id).toBe(1)
    expect(res.body.cards).toEqual([])
    expect(res.body.status).toBe(true)
  })

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/business-modules')
      .send({ name: 'NoAuth' })
    expect(res.status).toBe(401)
  })

  it('fills default values', async () => {
    const res = await request(app)
      .post('/api/business-modules')
      .set(adminHeaders())
      .send({ name: 'Defaults' })
    expect(res.body.coverImage).toBe('')
    expect(res.body.coverAspectRatio).toBe('16:9')
    expect(res.body.layoutType).toBe('carousel')
    expect(res.body.sortOrder).toBe(0)
    expect(res.body.status).toBe(true)
  })

  it('auto-increments IDs', async () => {
    const headers = adminHeaders()
    const r1 = await request(app).post('/api/business-modules').set(headers).send({ name: 'A' })
    const r2 = await request(app).post('/api/business-modules').set(headers).send({ name: 'B' })
    expect(r1.body.id).toBe(1)
    expect(r2.body.id).toBe(2)
  })
})

// -----------------------------------------------------------------
// PUT /api/business-modules/:id
// -----------------------------------------------------------------

describe('PUT /api/business-modules/:id', () => {
  it('updates an existing module', async () => {
    writeData(emptyPayload({
      businessModules: [
        { id: 1, name: 'Old', status: true, sections: [], cards: [], createdAt: '2024' }
      ]
    }))
    const res = await request(app)
      .put('/api/business-modules/1')
      .set(adminHeaders())
      .send({ name: 'Updated', layoutType: 'grid' })
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Updated')
    expect(res.body.layoutType).toBe('grid')
  })

  it('returns 400 for invalid id', async () => {
    const res = await request(app)
      .put('/api/business-modules/abc')
      .set(adminHeaders())
      .send({ name: 'X' })
    expect(res.status).toBe(400)
  })

  it('returns 404 for non-existent id', async () => {
    const res = await request(app)
      .put('/api/business-modules/999')
      .set(adminHeaders())
      .send({ name: 'Ghost' })
    expect(res.status).toBe(404)
  })

  it('preserves id on update (mass-assignment protection)', async () => {
    writeData(emptyPayload({
      businessModules: [
        { id: 1, name: 'Old', status: true, sections: [], cards: [], createdAt: '2024' }
      ]
    }))
    const res = await request(app)
      .put('/api/business-modules/1')
      .set(adminHeaders())
      .send({ name: 'Renamed', id: 999 })
    expect(res.status).toBe(200)
    expect(res.body.id).toBe(1)
  })
})

// -----------------------------------------------------------------
// DELETE /api/business-modules/:id
// -----------------------------------------------------------------

describe('DELETE /api/business-modules/:id', () => {
  it('deletes a module', async () => {
    writeData(emptyPayload({
      businessModules: [
        { id: 1, name: 'Del', status: true, sections: [], cards: [], createdAt: '2024' }
      ]
    }))
    const res = await request(app)
      .delete('/api/business-modules/1')
      .set(adminHeaders())
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)

    const data = readData()
    expect(data.businessModules).toHaveLength(0)
  })

  it('cleans selectedIds in page-config on delete', async () => {
    writeData(emptyPayload({
      businessModules: [
        { id: 1, name: 'Del', status: true, sections: [], cards: [], createdAt: '2024' }
      ],
      businessModulePageConfig: {
        sections: [{ id: 'sec', selectedIds: [1, 2], displayLayout: 'grid', sortOrder: 10, status: true }]
      }
    }))
    await request(app).delete('/api/business-modules/1').set(adminHeaders())
    const data = readData()
    expect(data.businessModulePageConfig.sections[0].selectedIds).toEqual([2])
  })

  it('returns 401 without auth', async () => {
    const res = await request(app).delete('/api/business-modules/1')
    expect(res.status).toBe(401)
  })
})

// -----------------------------------------------------------------
// POST /api/business-modules/:mid/cards
// -----------------------------------------------------------------

describe('POST /api/business-modules/:mid/cards', () => {
  it('creates a card inside a module', async () => {
    writeData(emptyPayload({
      businessModules: [
        { id: 1, name: 'M', status: true, sections: [], cards: [], createdAt: '2024' }
      ]
    }))
    const res = await request(app)
      .post('/api/business-modules/1/cards')
      .set(adminHeaders())
      .send({ title: 'Card 1' })
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Card 1')
    expect(res.body.id).toBe(1)
    expect(res.body.cover).toBeDefined()
    expect(res.body.detail).toBeDefined()
  })

  it('returns 400 for invalid module id', async () => {
    const res = await request(app)
      .post('/api/business-modules/abc/cards')
      .set(adminHeaders())
      .send({ title: 'X' })
    expect(res.status).toBe(400)
  })

  it('returns 404 for non-existent module', async () => {
    const res = await request(app)
      .post('/api/business-modules/999/cards')
      .set(adminHeaders())
      .send({ title: 'X' })
    expect(res.status).toBe(404)
  })

  it('auto-increments card IDs within a module', async () => {
    writeData(emptyPayload({
      businessModules: [
        { id: 1, name: 'M', status: true, sections: [], cards: [], createdAt: '2024' }
      ]
    }))
    const headers = adminHeaders()
    const r1 = await request(app).post('/api/business-modules/1/cards').set(headers).send({ title: 'A' })
    const r2 = await request(app).post('/api/business-modules/1/cards').set(headers).send({ title: 'B' })
    expect(r1.body.id).toBe(1)
    expect(r2.body.id).toBe(2)
  })
})

// -----------------------------------------------------------------
// GET /api/business-modules/:mid/cards/:cid
// -----------------------------------------------------------------

describe('GET /api/business-modules/:mid/cards/:cid', () => {
  it('returns a card by ID', async () => {
    writeData(emptyPayload({
      businessModules: [
        { id: 1, name: 'M', status: true, sections: [], cards: [
          { id: 1, title: 'Card One' }
        ], createdAt: '2024' }
      ]
    }))
    const res = await request(app).get('/api/business-modules/1/cards/1')
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Card One')
  })

  it('returns 404 for non-existent card', async () => {
    writeData(emptyPayload({
      businessModules: [
        { id: 1, name: 'M', status: true, sections: [], cards: [], createdAt: '2024' }
      ]
    }))
    const res = await request(app).get('/api/business-modules/1/cards/999')
    expect(res.status).toBe(404)
  })
})

// -----------------------------------------------------------------
// PUT /api/business-modules/:mid/cards/:cid
// -----------------------------------------------------------------

describe('PUT /api/business-modules/:mid/cards/:cid', () => {
  it('updates a card', async () => {
    writeData(emptyPayload({
      businessModules: [
        { id: 1, name: 'M', status: true, sections: [], cards: [
          { id: 1, title: 'Old Card' }
        ], createdAt: '2024' }
      ]
    }))
    const res = await request(app)
      .put('/api/business-modules/1/cards/1')
      .set(adminHeaders())
      .send({ title: 'Updated Card' })
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Updated Card')
  })

  it('returns 404 for non-existent card', async () => {
    writeData(emptyPayload({
      businessModules: [
        { id: 1, name: 'M', status: true, sections: [], cards: [], createdAt: '2024' }
      ]
    }))
    const res = await request(app)
      .put('/api/business-modules/1/cards/999')
      .set(adminHeaders())
      .send({ title: 'Ghost' })
    expect(res.status).toBe(404)
  })
})

// -----------------------------------------------------------------
// DELETE /api/business-modules/:mid/cards/:cid
// -----------------------------------------------------------------

describe('DELETE /api/business-modules/:mid/cards/:cid', () => {
  it('deletes a card from a module', async () => {
    writeData(emptyPayload({
      businessModules: [
        { id: 1, name: 'M', status: true, sections: [], cards: [
          { id: 1, title: 'Del' }
        ], createdAt: '2024' }
      ]
    }))
    const res = await request(app)
      .delete('/api/business-modules/1/cards/1')
      .set(adminHeaders())
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)

    const data = readData()
    expect(data.businessModules[0].cards).toHaveLength(0)
  })

  it('returns 400 for invalid ids', async () => {
    const res = await request(app)
      .delete('/api/business-modules/abc/cards/xyz')
      .set(adminHeaders())
    expect(res.status).toBe(400)
  })
})
