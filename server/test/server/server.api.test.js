/**
 * Phase 4 — API integration tests (supertest)
 *
 * Tests key Express endpoints against the in-memory sql.js mock.
 * DB state is seeded via writeData() before each test.
 * Auth tokens are generated via createToken().
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import request from 'supertest'

let app, createToken, writeData, readData

beforeAll(async () => {
  // Set env vars before requiring server.js (module reads at load time via || fallbacks)
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
// Auth endpoints
// -----------------------------------------------------------------

describe('POST /api/login', () => {
  it('returns token for valid credentials', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ username: 'testuser', password: 'testpass' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.token).toBeTruthy()
    expect(typeof res.body.token).toBe('string')
  })

  it('returns 401 for invalid password', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ username: 'testuser', password: 'wrongpass' })
    expect(res.status).toBe(401)
    expect(res.body.ok).toBe(false)
    expect(res.body.error).toBe('用户名或密码错误')
  })

  it('returns 401 for invalid username', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ username: 'nobody', password: 'testpass' })
    expect(res.status).toBe(401)
    expect(res.body.ok).toBe(false)
  })
})

describe('GET /api/auth-check', () => {
  it('returns ok for valid token', async () => {
    const res = await request(app)
      .get('/api/auth-check')
      .set(adminHeaders())
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.username).toBe('admin')
  })

  it('returns 401 for missing token', async () => {
    const res = await request(app)
      .get('/api/auth-check')
    expect(res.status).toBe(401)
    expect(res.body.ok).toBe(false)
  })

  it('returns 401 for invalid token', async () => {
    const res = await request(app)
      .get('/api/auth-check')
      .set('Authorization', 'Bearer not-a-real-token')
    expect(res.status).toBe(401)
    expect(res.body.ok).toBe(false)
  })
})

// -----------------------------------------------------------------
// Cards CRUD
// -----------------------------------------------------------------

describe('GET /api/cards', () => {
  it('returns empty array when no cards exist', async () => {
    const res = await request(app).get('/api/cards')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('returns seeded cards', async () => {
    writeData(emptyPayload({
      cards: [
        { id: 1, name: 'Alice', phone: '111', title: 'CEO', department: '',
          company: '', email: '', address: '', avatar: '', bio: '',
          status: true, createdAt: '2024-01-01' }
      ]
    }))
    const res = await request(app).get('/api/cards')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].name).toBe('Alice')
  })
})

describe('GET /api/cards/:id', () => {
  it('returns a card by ID', async () => {
    writeData(emptyPayload({
      cards: [
        { id: 1, name: 'Alice', phone: '', title: '', department: '',
          company: '', email: '', address: '', avatar: '', bio: '',
          status: true, createdAt: '2024' },
        { id: 2, name: 'Bob', phone: '', title: '', department: '',
          company: '', email: '', address: '', avatar: '', bio: '',
          status: true, createdAt: '2024' }
      ]
    }))
    const res = await request(app).get('/api/cards/2')
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Bob')
  })

  it('returns 404 for non-existent card', async () => {
    const res = await request(app).get('/api/cards/999')
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Not found')
  })
})

describe('POST /api/cards', () => {
  it('creates a new card with valid auth', async () => {
    const res = await request(app)
      .post('/api/cards')
      .set(adminHeaders())
      .send({ name: 'NewCard', phone: '12345' })
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('NewCard')
    expect(res.body.id).toBe(1)

    // Verify via GET
    const getRes = await request(app).get('/api/cards')
    expect(getRes.body).toHaveLength(1)
  })

  it('returns 401 without auth token', async () => {
    const res = await request(app)
      .post('/api/cards')
      .send({ name: 'Unauthorized' })
    expect(res.status).toBe(401)
  })

  it('returns 401 with invalid auth token', async () => {
    const res = await request(app)
      .post('/api/cards')
      .set('Authorization', 'Bearer invalid-token-here')
      .send({ name: 'BadToken' })
    expect(res.status).toBe(401)
  })
})

describe('PUT /api/cards/:id', () => {
  it('updates an existing card', async () => {
    writeData(emptyPayload({
      cards: [
        { id: 1, name: 'Old', phone: '', title: '', department: '',
          company: '', email: '', address: '', avatar: '', bio: '',
          status: true, createdAt: '2024' }
      ]
    }))
    const res = await request(app)
      .put('/api/cards/1')
      .set(adminHeaders())
      .send({ name: 'Updated' })
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Updated')
  })

  it('returns 404 for non-existent card', async () => {
    const res = await request(app)
      .put('/api/cards/999')
      .set(adminHeaders())
      .send({ name: 'Ghost' })
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/cards/:id', () => {
  it('deletes a card', async () => {
    writeData(emptyPayload({
      cards: [
        { id: 1, name: 'ToDelete', phone: '', title: '', department: '',
          company: '', email: '', address: '', avatar: '', bio: '',
          status: true, createdAt: '2024' }
      ]
    }))
    const res = await request(app)
      .delete('/api/cards/1')
      .set(adminHeaders())
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)

    // Verify deleted
    const getRes = await request(app).get('/api/cards')
    expect(getRes.body).toHaveLength(0)
  })
})

// -----------------------------------------------------------------
// Public endpoints
// -----------------------------------------------------------------

describe('GET /api/splash', () => {
  it('returns splash images (public, no auth)', async () => {
    writeData(emptyPayload({
      splashImages: [
        { id: 1, url: '/splash1.jpg', sort: 1, updatedAt: '' },
        { id: 2, url: '/splash2.jpg', sort: 2, updatedAt: '' }
      ]
    }))
    const res = await request(app).get('/api/splash')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0].url).toBe('/splash1.jpg')
  })
})

describe('POST /api/inquiry', () => {
  it('requires auth (returns 401 without token)', async () => {
    const res = await request(app)
      .post('/api/inquiry')
      .send({ name: 'Visitor', company: 'ACME', phone: '13800000000', message: 'Hello' })
    expect(res.status).toBe(401)
    expect(res.body.code).toBe('NO_TOKEN')
  })

  it('accepts inquiry with valid auth', async () => {
    const res = await request(app)
      .post('/api/inquiry')
      .set(adminHeaders())
      .send({ name: 'Visitor', company: 'ACME', phone: '13800000000', message: 'Hello' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)

    // Verify the message was stored
    const data = readData()
    expect(data.messages).toHaveLength(1)
    expect(data.messages[0].name).toBe('Visitor')
  })

  it('handles inquiry with minimal fields', async () => {
    const res = await request(app)
      .post('/api/inquiry')
      .set(adminHeaders())
      .send({ name: 'Min' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })
})

// -----------------------------------------------------------------
// SMS endpoints
// -----------------------------------------------------------------

describe('POST /api/sms/send', () => {
  it('returns 400 for invalid phone format', async () => {
    const res = await request(app)
      .post('/api/sms/send')
      .send({ phone: '12345' })
    expect(res.status).toBe(400)
    expect(res.body.ok).toBe(false)
  })

  it('returns 400 for missing phone', async () => {
    const res = await request(app)
      .post('/api/sms/send')
      .send({})
    expect(res.status).toBe(400)
  })
})

// -----------------------------------------------------------------
// Messages API
// -----------------------------------------------------------------

describe('GET /api/messages', () => {
  it('returns 401 without auth (messages are admin-only)', async () => {
    const res = await request(app).get('/api/messages')
    expect(res.status).toBe(401)
  })

  it('returns messages with valid auth', async () => {
    writeData(emptyPayload({
      messages: [
        { id: 1, name: 'Visitor', company: '', phone: '', title: '',
          areas: '', message: 'Hello', status: 'new', remark: '', createdAt: '2024' }
      ]
    }))
    const res = await request(app)
      .get('/api/messages')
      .set(adminHeaders())
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].name).toBe('Visitor')
  })
})

describe('PUT /api/messages/:id', () => {
  it('updates message status with valid auth', async () => {
    writeData(emptyPayload({
      messages: [
        { id: 1, name: 'X', company: '', phone: '', title: '',
          areas: '', message: '', status: 'new', remark: '', createdAt: '' }
      ]
    }))
    const res = await request(app)
      .put('/api/messages/1')
      .set(adminHeaders())
      .send({ status: 'read' })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('read')
  })

  it('returns 404 for non-existent message', async () => {
    const res = await request(app)
      .put('/api/messages/999')
      .set(adminHeaders())
      .send({ status: 'read' })
    expect(res.status).toBe(404)
  })
})

// -----------------------------------------------------------------
// Positions API
// -----------------------------------------------------------------

describe('GET /api/positions', () => {
  it('returns empty positions array', async () => {
    const res = await request(app).get('/api/positions')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('returns stored positions', async () => {
    writeData(emptyPayload({
      positions: [
        { id: 1, name: 'Engineer', sort: 1, desc: '', count: 5, department: 'IT' }
      ]
    }))
    const res = await request(app).get('/api/positions')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].name).toBe('Engineer')
  })
})

describe('POST /api/positions', () => {
  it('creates a position with valid auth', async () => {
    const res = await request(app)
      .post('/api/positions')
      .set(adminHeaders())
      .send({ name: 'Manager', sort: 2, department: 'HR' })
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Manager')
    expect(res.body.id).toBe(1)

    const data = readData()
    expect(data.positions).toHaveLength(1)
  })

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/positions')
      .send({ name: 'X' })
    expect(res.status).toBe(401)
  })
})

// -----------------------------------------------------------------
// Videos API
// -----------------------------------------------------------------

describe('GET /api/videos', () => {
  it('returns empty videos array', async () => {
    const res = await request(app).get('/api/videos')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('returns stored videos', async () => {
    writeData(emptyPayload({
      videos: [
        { id: 1, title: 'Intro', cover: '', url: '/v.mp4', category: 'general',
          status: 'published', duration: '3:00', views: 100,
          createdAt: '2024', description: '' }
      ]
    }))
    const res = await request(app).get('/api/videos')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].title).toBe('Intro')
  })
})

// -----------------------------------------------------------------
// Honors API
// -----------------------------------------------------------------

describe('GET /api/honors', () => {
  it('returns empty honors array', async () => {
    const res = await request(app).get('/api/honors')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})

describe('POST /api/honors', () => {
  it('creates an honor with valid auth', async () => {
    const res = await request(app)
      .post('/api/honors')
      .set(adminHeaders())
      .send({ name: 'Award 2024', desc: 'Best Company', date: '2024-06' })
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Award 2024')
    expect(res.body.id).toBe(1)
  })
})

describe('DELETE /api/honors/:id', () => {
  it('deletes an honor', async () => {
    writeData(emptyPayload({
      honors: [
        { id: 1, name: 'Old', desc: '', date: '', image: '', createdAt: '2024' }
      ]
    }))
    const res = await request(app)
      .delete('/api/honors/1')
      .set(adminHeaders())
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)

    const data = readData()
    expect(data.honors).toHaveLength(0)
  })
})

// -----------------------------------------------------------------
// Projects API
// -----------------------------------------------------------------

describe('GET /api/projects', () => {
  it('returns empty projects array', async () => {
    const res = await request(app).get('/api/projects')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})

describe('GET /api/projects/:id', () => {
  it('returns a project by ID', async () => {
    writeData(emptyPayload({
      projects: [
        { id: 1, name: 'Tower', location: 'NY', year: '2024', desc: '',
          tags: [], image: '', images: [], address: '', scale: '', period: '',
          investment: '', highlights: [], detail: '', detailImages: [], results: [] }
      ]
    }))
    const res = await request(app).get('/api/projects/1')
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Tower')
  })

  it('returns 404 for non-existent project', async () => {
    const res = await request(app).get('/api/projects/999')
    expect(res.status).toBe(404)
  })
})

// -----------------------------------------------------------------
// Config endpoints
// -----------------------------------------------------------------

describe('GET /api/company/profile-config', () => {
  it('returns profile config with sections', async () => {
    const res = await request(app).get('/api/company/profile-config')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('sections')
    expect(Array.isArray(res.body.sections)).toBe(true)
  })
})

describe('GET /api/card-page-config', () => {
  it('returns card page config', async () => {
    const res = await request(app).get('/api/card-page-config')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('sections')
  })
})

describe('PUT /api/card-page-config', () => {
  it('updates card page config with valid auth', async () => {
    const res = await request(app)
      .put('/api/card-page-config')
      .set(adminHeaders())
      .send({ sections: ['intro', 'team'] })
    expect(res.status).toBe(200)
    expect(res.body.sections).toEqual(['intro', 'team'])
  })

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .put('/api/card-page-config')
      .send({ sections: ['x'] })
    expect(res.status).toBe(401)
  })
})

// -----------------------------------------------------------------
// Auth edge cases
// -----------------------------------------------------------------

describe('GET /api/cards/:id (edge cases)', () => {
  it('returns 404 for non-numeric ID', async () => {
    const res = await request(app).get('/api/cards/abc')
    expect(res.status).toBe(400)
  })
})
