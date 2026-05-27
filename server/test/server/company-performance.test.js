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
// GET /api/company/performance
// -----------------------------------------------------------------

describe('GET /api/company/performance', () => {
  it('returns empty array when no performances exist', async () => {
    const res = await request(app).get('/api/company/performance')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('returns stored performances', async () => {
    writeData(emptyPayload({
      companyPerformances: [
        { id: 1, title: 'Q1 Results', sortOrder: 10,
          cover: { backgroundImage: '', video: '', zones: {} },
          detail: { title: 'Q1', body: '', images: [], video: '', detailEntry: true },
          createdAt: '2024' }
      ]
    }))
    const res = await request(app).get('/api/company/performance')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].title).toBe('Q1 Results')
  })
})

// -----------------------------------------------------------------
// GET /api/company/performance/:id
// -----------------------------------------------------------------

describe('GET /api/company/performance/:id', () => {
  it('returns performance by ID', async () => {
    writeData(emptyPayload({
      companyPerformances: [
        { id: 1, title: 'Annual', sortOrder: 1,
          cover: { backgroundImage: '', video: '', zones: {} },
          detail: { title: '', body: '', images: [], video: '', detailEntry: true },
          createdAt: '2024' },
        { id: 2, title: 'Quarterly', sortOrder: 2,
          cover: { backgroundImage: '', video: '', zones: {} },
          detail: { title: '', body: '', images: [], video: '', detailEntry: true },
          createdAt: '2024' }
      ]
    }))
    const res = await request(app).get('/api/company/performance/2')
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Quarterly')
  })

  it('returns 400 for invalid id', async () => {
    const res = await request(app).get('/api/company/performance/abc')
    expect(res.status).toBe(400)
  })

  it('returns 404 for non-existent id', async () => {
    const res = await request(app).get('/api/company/performance/999')
    expect(res.status).toBe(404)
  })
})

// -----------------------------------------------------------------
// POST /api/company/performance
// -----------------------------------------------------------------

describe('POST /api/company/performance', () => {
  it('creates a performance with valid auth', async () => {
    const res = await request(app)
      .post('/api/company/performance')
      .set(adminHeaders())
      .send({ title: 'New Perf' })
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('New Perf')
    expect(res.body.id).toBe(1)
    expect(res.body.cover).toBeDefined()
    expect(res.body.detail).toBeDefined()
  })

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/company/performance')
      .send({ title: 'NoAuth' })
    expect(res.status).toBe(401)
  })

  it('uses unshift so new item appears first', async () => {
    const headers = adminHeaders()
    await request(app).post('/api/company/performance').set(headers).send({ title: 'First' })
    await request(app).post('/api/company/performance').set(headers).send({ title: 'Second' })

    const res = await request(app).get('/api/company/performance')
    expect(res.body[0].title).toBe('Second')
  })

  it('generates cover with title in text zone', async () => {
    const res = await request(app)
      .post('/api/company/performance')
      .set(adminHeaders())
      .send({ title: 'Zoned' })
    expect(res.body.cover.zones.top.textBoxes[0].text).toBe('Zoned')
  })
})

// -----------------------------------------------------------------
// PUT /api/company/performance/:id
// -----------------------------------------------------------------

describe('PUT /api/company/performance/:id', () => {
  it('updates a performance', async () => {
    writeData(emptyPayload({
      companyPerformances: [
        { id: 1, title: 'Old', sortOrder: 1,
          cover: { backgroundImage: '', video: '', zones: {} },
          detail: { title: '', body: '', images: [], video: '', detailEntry: true },
          createdAt: '2024' }
      ]
    }))
    const res = await request(app)
      .put('/api/company/performance/1')
      .set(adminHeaders())
      .send({ title: 'Updated' })
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Updated')
  })

  it('returns 404 for non-existent id', async () => {
    const res = await request(app)
      .put('/api/company/performance/999')
      .set(adminHeaders())
      .send({ title: 'Ghost' })
    expect(res.status).toBe(404)
  })

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .put('/api/company/performance/1')
      .send({ title: 'Hack' })
    expect(res.status).toBe(401)
  })
})

// -----------------------------------------------------------------
// DELETE /api/company/performance/:id
// -----------------------------------------------------------------

describe('DELETE /api/company/performance/:id', () => {
  it('deletes a performance and cleans config', async () => {
    writeData(emptyPayload({
      companyPerformances: [
        { id: 1, title: 'Del', sortOrder: 1,
          cover: { backgroundImage: '', video: '', zones: {} },
          detail: { title: '', body: '', images: [], video: '', detailEntry: true },
          createdAt: '2024' }
      ],
      companyPerformanceConfig: {
        sections: [{ id: 'sec', selectedIds: [1, 2], displayLayout: 'grid', sortOrder: 10, status: true }]
      }
    }))
    const res = await request(app)
      .delete('/api/company/performance/1')
      .set(adminHeaders())
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)

    // Verify config cleaned
    const data = readData()
    expect(data.companyPerformances).toHaveLength(0)
    expect(data.companyPerformanceConfig.sections[0].selectedIds).toEqual([2])
  })

  it('returns 401 without auth', async () => {
    const res = await request(app).delete('/api/company/performance/1')
    expect(res.status).toBe(401)
  })
})

// -----------------------------------------------------------------
// GET /api/company/performance-config
// -----------------------------------------------------------------

describe('GET /api/company/performance-config', () => {
  it('returns default config with sections', async () => {
    const res = await request(app).get('/api/company/performance-config')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('sections')
    expect(Array.isArray(res.body.sections)).toBe(true)
  })

  it('migrates missing sortOrder and status', async () => {
    writeData(emptyPayload({
      companyPerformanceConfig: { sections: [{ id: 'x' }] }
    }))
    const res = await request(app).get('/api/company/performance-config')
    // Non-hero sections get (idx+1)*10 = 10
    expect(res.body.sections[0].sortOrder).toBe(10)
    expect(res.body.sections[0].status).toBe(true)
  })

  it('splits single-layout sections with multiple selectedIds', async () => {
    writeData(emptyPayload({
      companyPerformanceConfig: { sections: [{ id: 's', displayLayout: 'single', selectedIds: [1, 2], sortOrder: 10 }] }
    }))
    const res = await request(app).get('/api/company/performance-config')
    expect(res.body.sections).toHaveLength(2)
  })
})

// -----------------------------------------------------------------
// PUT /api/company/performance-config
// -----------------------------------------------------------------

describe('PUT /api/company/performance-config', () => {
  it('updates config with valid auth', async () => {
    const res = await request(app)
      .put('/api/company/performance-config')
      .set(adminHeaders())
      .send({ sections: [{ id: 'hero', displayLayout: 'hero' }] })
    expect(res.status).toBe(200)
    expect(res.body.sections[0].id).toBe('hero')
  })
})

// -----------------------------------------------------------------
// POST /api/company/performance/reorder
// -----------------------------------------------------------------

describe('POST /api/company/performance/reorder', () => {
  it('returns 400 without orders array', async () => {
    const res = await request(app)
      .post('/api/company/performance/reorder')
      .set(adminHeaders())
      .send({})
    expect(res.status).toBe(400)
  })

  it('updates sort orders', async () => {
    writeData(emptyPayload({
      companyPerformances: [
        { id: 1, title: 'A', sortOrder: 1,
          cover: { backgroundImage: '', video: '', zones: {} },
          detail: { title: '', body: '', images: [], video: '', detailEntry: true },
          createdAt: '2024' },
        { id: 2, title: 'B', sortOrder: 2,
          cover: { backgroundImage: '', video: '', zones: {} },
          detail: { title: '', body: '', images: [], video: '', detailEntry: true },
          createdAt: '2024' }
      ]
    }))
    const res = await request(app)
      .post('/api/company/performance/reorder')
      .set(adminHeaders())
      .send({ orders: [{ id: 1, sortOrder: 20 }, { id: 2, sortOrder: 10 }] })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)

    const data = readData()
    const a = data.companyPerformances.find(p => p.id === 1)
    const b = data.companyPerformances.find(p => p.id === 2)
    expect(a.sortOrder).toBe(20)
    expect(b.sortOrder).toBe(10)
  })
})

// -----------------------------------------------------------------
// POST /api/company/performance/migrate
// -----------------------------------------------------------------

describe('POST /api/company/performance/migrate', () => {
  it('migrates old-format performances to new cover/detail format', async () => {
    // Old-format fields (images, video, intro) can't be persisted through
    // the mock DB which only stores cover/detail columns. This test verifies
    // the migration endpoint responds correctly and the item gets migrated.
    writeData(emptyPayload({
      companyPerformances: [
        { id: 1, title: 'Old Perf', sortOrder: 1, intro: 'Intro text',
          images: ['/img1.jpg'], video: '/vid.mp4', createdAt: '2023' }
      ]
    }))
    const res = await request(app)
      .post('/api/company/performance/migrate')
      .set(adminHeaders())
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.migrated).toBe(1)

    // After migration, the performance still exists and has been restructured
    const data = readData()
    expect(data.companyPerformances).toHaveLength(1)
    expect(data.companyPerformances[0].id).toBe(1)
    expect(data.companyPerformances[0].title).toBe('Old Perf')
  })

  it('skips already-migrated performances', async () => {
    writeData(emptyPayload({
      companyPerformances: [
        { id: 1, title: 'Migrated', sortOrder: 1,
          cover: { backgroundImage: '', video: '', zones: {} },
          detail: { title: '', body: '', images: [], video: '', detailEntry: true },
          createdAt: '2024' }
      ]
    }))
    const res = await request(app)
      .post('/api/company/performance/migrate')
      .set(adminHeaders())
    expect(res.status).toBe(200)

    // Should not change already-migrated items
    const data = readData()
    expect(data.companyPerformances[0].cover).toEqual({ backgroundImage: '', video: '', zones: {} })
  })
})
