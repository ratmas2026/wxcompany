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
      companyInfos: 1, templates: 1
    },
    ...overrides
  }
}

beforeEach(() => {
  writeData(emptyPayload())
})

// -----------------------------------------------------------------
// GET /api/templates
// -----------------------------------------------------------------

describe('GET /api/templates', () => {
  it('returns empty templates array initially', async () => {
    const res = await request(app).get('/api/templates')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.templates).toEqual([])
  })

  it('returns stored templates', async () => {
    writeData(emptyPayload({
      templates: [
        { id: 1, name: 'Cyberpunk', filename: 'cyberpunk.html', mime_type: 'text/html', size: 5000, created_at: '2024' },
        { id: 2, name: 'Minimal', filename: 'minimal.html', mime_type: 'text/html', size: 3000, created_at: '2024' }
      ]
    }))
    const res = await request(app).get('/api/templates')
    expect(res.status).toBe(200)
    expect(res.body.templates).toHaveLength(2)
    expect(res.body.templates[0].name).toBe('Cyberpunk')
  })
})

// -----------------------------------------------------------------
// POST /api/templates (without file — validates input errors)
// -----------------------------------------------------------------

describe('POST /api/templates', () => {
  it('returns 400 when no file is provided', async () => {
    const res = await request(app)
      .post('/api/templates')
      .set(adminHeaders())
    expect(res.status).toBe(400)
    expect(res.body.ok).toBe(false)
    expect(res.body.error).toBe('请选择文件')
  })

  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/templates')
    expect(res.status).toBe(401)
  })
})

// -----------------------------------------------------------------
// DELETE /api/templates/:id
// -----------------------------------------------------------------

describe('DELETE /api/templates/:id', () => {
  it('returns 400 for invalid id', async () => {
    const res = await request(app)
      .delete('/api/templates/abc')
      .set(adminHeaders())
    expect(res.status).toBe(400)
  })

  it('returns 404 for non-existent template', async () => {
    const res = await request(app)
      .delete('/api/templates/999')
      .set(adminHeaders())
    expect(res.status).toBe(404)
  })

  it('deletes a template and clears card references by ID', async () => {
    writeData(emptyPayload({
      templates: [
        { id: 1, name: 'Temp', filename: 't.html', mime_type: 'text/html', size: 100, created_at: '2024' }
      ],
      cards: [
        { id: 1, name: 'User', phone: '111', title: '', department: '',
          company: '', email: '', address: '', avatar: '', bio: '',
          status: true, createdAt: '2024', template: '1' }
      ]
    }))
    const res = await request(app)
      .delete('/api/templates/1')
      .set(adminHeaders())
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)

    const data = readData()
    expect(data.templates).toHaveLength(0)
    expect(data.cards[0].template).toBe('')
  })

  it('clears card references by V1 filename too', async () => {
    writeData(emptyPayload({
      templates: [
        { id: 1, name: 'Old', filename: 'old_template.html', mime_type: 'text/html', size: 100, created_at: '2024' }
      ],
      cards: [
        { id: 1, name: 'User', phone: '111', title: '', department: '',
          company: '', email: '', address: '', avatar: '', bio: '',
          status: true, createdAt: '2024', template: 'old_template.html' }
      ]
    }))
    const res = await request(app)
      .delete('/api/templates/1')
      .set(adminHeaders())
    expect(res.status).toBe(200)

    const data = readData()
    expect(data.cards[0].template).toBe('')
  })

  it('returns 401 without auth', async () => {
    const res = await request(app).delete('/api/templates/1')
    expect(res.status).toBe(401)
  })
})

// -----------------------------------------------------------------
// GET /api/templates/:id/raw
// -----------------------------------------------------------------

describe('GET /api/templates/:id/raw', () => {
  it('returns 400 for invalid id', async () => {
    const res = await request(app).get('/api/templates/abc/raw')
    expect(res.status).toBe(400)
  })

  it('returns 404 for non-existent template', async () => {
    const res = await request(app).get('/api/templates/999/raw')
    expect(res.status).toBe(404)
  })
})

// -----------------------------------------------------------------
// GET /api/templates/:id/render
// -----------------------------------------------------------------

describe('GET /api/templates/:id/render', () => {
  it('returns 400 for invalid id', async () => {
    const res = await request(app).get('/api/templates/abc/render')
    expect(res.status).toBe(400)
  })

  it('returns 404 for non-existent template', async () => {
    const res = await request(app).get('/api/templates/999/render')
    expect(res.status).toBe(404)
  })
})
