import { vi, beforeEach } from 'vitest'
import { createRequire } from 'module'

// Set test environment variables (NEVER hardcode production credentials)
process.env.ADMIN_SECRET = 'test-secret-key-12345'
process.env.ADMIN_USER = 'testuser'
process.env.ADMIN_PASS = 'testpass'

// In-memory table store bridge
if (!globalThis.__wxcompany_test_tables) {
  globalThis.__wxcompany_test_tables = new Map()
}

// ----- sql.js mock helpers -----
function _parseCols(sql) {
  const m = sql.match(/INSERT INTO \w+\s*\(([^)]+)\)/i)
  return m ? m[1].split(',').map(s => s.trim().replace(/["`]/g, '')) : []
}
function _tbl(sql) {
  const m = sql.match(/(?:FROM|INTO|TABLE IF NOT EXISTS|TABLE)\s+["`]?(\w+)["`]?/i)
  return m ? m[1] : null
}
function _exec(sql) {
  const tables = globalThis.__wxcompany_test_tables
  const upper = sql.trim().toUpperCase()
  if (upper.startsWith('SELECT')) {
    const table = _tbl(sql)
    const rows = tables.get(table) || []
    if (rows.length === 0) return []
    const columns = Object.keys(rows[0])
    return [{ columns, values: rows.map(r => columns.map(c => r[c])) }]
  }
  if (upper.startsWith('DELETE')) { tables.set(_tbl(sql), []); return [] }
  if (upper.startsWith('CREATE TABLE')) { const t = _tbl(sql); if (!tables.has(t)) tables.set(t, []); return [] }
  return []
}

function _makeDbMock() {
  const tables = globalThis.__wxcompany_test_tables
  return {
    exec: vi.fn((sql) => _exec(sql)),
    run: vi.fn((sql) => _exec(sql)),
    prepare: vi.fn((sql) => {
      const columns = _parseCols(sql)
      const table = _tbl(sql)
      if (!tables.has(table)) tables.set(table, [])
      return {
        run: vi.fn((params) => {
          if (columns.length > 0) {
            const row = {}
            columns.forEach((col, i) => { row[col] = params[i] })
            tables.get(table).push(row)
          }
        }),
        get: vi.fn((params) => {
          const rows = tables.get(table) || []
          if (params && params.length > 0 && columns.length > 0) {
            return rows.find(r => r[columns[0]] === params[0]) || undefined
          }
          return rows[0]
        }),
        all: vi.fn(() => tables.get(table) || []),
        free: vi.fn()
      }
    }),
    export: vi.fn(() => new Uint8Array([1, 2, 3])),
    close: vi.fn()
  }
}

// ----- Inject mocks into Node.js require.cache (vitest 4.x vi.mock is broken) -----
const localRequire = createRequire(import.meta.url)

function _injectMock(moduleName, exports) {
  const key = localRequire.resolve(moduleName)
  if (!require.cache[key]) {
    require.cache[key] = { id: key, filename: key, loaded: true, exports }
  }
}

// Inject sql.js mock
const _mockDb = _makeDbMock()
const _sqlMock = vi.fn().mockResolvedValue({
  Database: vi.fn(function() { return _mockDb })
})
_sqlMock.default = _sqlMock
_injectMock('sql.js', _sqlMock)

// Inject fs mock
_injectMock('fs', {
  writeFileSync: vi.fn(),
  readFileSync: vi.fn(() => Buffer.from('{}')),
  existsSync: vi.fn(() => true),
  mkdirSync: vi.fn(),
  unlinkSync: vi.fn(),
  renameSync: vi.fn(),
  stat: vi.fn((_path, cb) => {
    const err = new Error('ENOENT: no such file or directory, stat')
    err.code = 'ENOENT'
    cb(err)
  }),
  statSync: vi.fn(() => {
    const err = new Error('ENOENT: no such file or directory, stat')
    err.code = 'ENOENT'
    throw err
  })
})

// Clean up in-memory tables between tests
beforeEach(() => {
  globalThis.__wxcompany_test_tables.clear()
})
