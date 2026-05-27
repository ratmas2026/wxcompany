import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import request from 'supertest'

let app, createToken, writeData

beforeAll(async () => {
  process.env.ADMIN_USER = 'testuser'
  process.env.ADMIN_PASS = 'testpass'

  const dbMod = require('../../db.js')
  await dbMod.initDatabase()
  writeData = dbMod.writeData

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
// Upload endpoints — test auth and input validation (no file = 400)
// -----------------------------------------------------------------

describe('POST /api/upload/video', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/upload/video')
    expect(res.status).toBe(401)
  })
})

describe('POST /api/upload/cover', () => {
  it('returns 400 without file', async () => {
    const res = await request(app)
      .post('/api/upload/cover')
      .set(adminHeaders())
    expect(res.status).toBe(400)
  })

  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/upload/cover')
    expect(res.status).toBe(401)
  })
})

describe('POST /api/upload/avatar', () => {
  it('returns 400 without file', async () => {
    const res = await request(app)
      .post('/api/upload/avatar')
      .set(adminHeaders())
    expect(res.status).toBe(400)
  })

  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/upload/avatar')
    expect(res.status).toBe(401)
  })
})

describe('POST /api/upload/splash', () => {
  it('returns 400 without file', async () => {
    const res = await request(app)
      .post('/api/upload/splash')
      .set(adminHeaders())
    expect(res.status).toBe(400)
  })

  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/upload/splash')
    expect(res.status).toBe(401)
  })
})

describe('POST /api/upload/profile', () => {
  it('returns 400 without file', async () => {
    const res = await request(app)
      .post('/api/upload/profile')
      .set(adminHeaders())
    expect(res.status).toBe(400)
  })

  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/upload/profile')
    expect(res.status).toBe(401)
  })
})

describe('POST /api/upload/editor', () => {
  it('returns 400 without file', async () => {
    const res = await request(app)
      .post('/api/upload/editor')
      .set(adminHeaders())
    expect(res.status).toBe(400)
  })

  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/upload/editor')
    expect(res.status).toBe(401)
  })
})

describe('POST /api/upload/business-module', () => {
  it('returns 400 without file', async () => {
    const res = await request(app)
      .post('/api/upload/business-module')
      .set(adminHeaders())
    expect(res.status).toBe(400)
  })

  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/upload/business-module')
    expect(res.status).toBe(401)
  })
})

describe('POST /api/upload/performance', () => {
  it('returns 400 without file', async () => {
    const res = await request(app)
      .post('/api/upload/performance')
      .set(adminHeaders())
    expect(res.status).toBe(400)
  })

  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/upload/performance')
    expect(res.status).toBe(401)
  })
})

describe('POST /api/upload/honors', () => {
  it('returns 400 without file', async () => {
    const res = await request(app)
      .post('/api/upload/honors')
      .set(adminHeaders())
    expect(res.status).toBe(400)
  })

  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/upload/honors')
    expect(res.status).toBe(401)
  })
})

describe('POST /api/upload/projects', () => {
  it('returns 400 without file', async () => {
    const res = await request(app)
      .post('/api/upload/projects')
      .set(adminHeaders())
    expect(res.status).toBe(400)
  })

  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/upload/projects')
    expect(res.status).toBe(401)
  })
})
