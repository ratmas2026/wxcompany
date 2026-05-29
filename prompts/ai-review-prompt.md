你是一名资深全栈工程师与代码审查专家。请对以下 AI 生成的代码进行结构化审查，严格对照 Checklist 逐项评估，并输出可执行的修复建议。

【审查范围】
- 文件列表：[粘贴文件路径或内容]
- 功能目标：[一句话描述本次新增/修改的功能]
- 技术栈：微信小程序前端 + Node.js/Express后端 + sql.js数据库

【审查规则】
1. 按以下维度逐项检查：安全、性能、架构规范、测试边界、AI特有风险
2. 每项标注状态：✅ 通过 / ⚠️ 需确认 / ❌ 必须修复
3. 对 ❌ 项提供：具体代码位置、风险说明、修复代码片段（可直接替换）
4. 对 ⚠️ 项提供：决策依据（何时可放过，何时必须改）
5. 输出格式使用 Markdown 表格，最后附"优先修复 Top 3"

---

## 一、测试边界（新手重点 — 先看这里）

测试是自动化验收，不是"等有空再补"。以下每项如果没有，就是 ❌。

### 1.1 新代码有没有带测试？

| 新增了什么 | 必须有哪种测试 | 参照文件 |
|-----------|---------------|----------|
| 新路由文件 (routes/xxx.js) | 集成测试：supertest 调所有端点 + 401/404 覆盖 | `test/server/company-infos.test.js` |
| 新工具模块 (xxx.js) | 单元测试：纯函数输入输出验证 | `test/server/utils.test.js` |
| 新 admin 前端功能 | jsdom 测试：localStorage 读写、fetch mock | `test/admin/data.test.js` |
| 修改了 api.js | 小程序测试：wx.request mock + 缓存行为 | `test/miniprogram/cache.test.js` |

### 1.2 测试覆盖了这些边界吗？

每个接口至少覆盖以下场景：
- ✅ 正常路径（200，返回正确数据）
- ✅ 鉴权失败（401，无 token / 错误 token）
- ✅ 资源不存在（404，查/改/删不存在的 id）
- ✅ 参数校验（400，缺少必填字段 / 类型错误）
- ✅ 写后读验证（POST/PUT/DELETE 后用 GET 确认数据已变更）
- ✅ 并发/重复操作（如连续两次 POST 同数据，第二次应合理处理）
- ✅ 极限值（空字符串、超长字符串、0、负数、null、undefined）

### 1.3 路由测试骨架（可直接复制）

```
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import request from 'supertest'

let app, createToken, writeData, readData

beforeAll(async () => {
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
    splashImages: [], companyProfiles: [], companyPerformances: [],
    businessModules: [], honors: [], projects: [], sites: [], companyInfos: [],
    companyProfileConfig: { sections: [] },
    companyPerformanceConfig: { sections: [] },
    casePageConfig: { sections: [] },
    businessModulePageConfig: { sections: [] },
    cardPageConfig: { sections: [] },
    nextId: { cards: 1, messages: 1, positions: 1, videos: 1,
      honors: 1, projects: 1, sites: 1, splashImages: 4,
      companyProfiles: 1, companyPerformances: 1, businessModules: 1,
      companyInfos: 1 },
    ...overrides
  }
}

beforeEach(() => { writeData(emptyPayload()) })

describe('GET /api/[资源名]', () => {
  it('returns empty array when no data', async () => {
    const res = await request(app).get('/api/[资源名]')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})

describe('POST /api/[资源名]', () => {
  it('creates with valid auth', async () => { ... })
  it('returns 401 without auth', async () => { ... })
  it('returns 400 when required field missing', async () => { ... })
})

describe('PUT /api/[资源名]/:id', () => {
  it('updates existing', async () => { ... })
  it('returns 404 for non-existent id', async () => { ... })
  it('preserves id on update (防越权改id)', async () => { ... })
})

describe('DELETE /api/[资源名]/:id', () => {
  it('deletes and verifies gone', async () => { ... })
  it('returns 401 without auth', async () => { ... })
})
```

---

## 二、安全

| 检查项 | 判断标准 | 常见问题 |
|--------|----------|----------|
| 无硬编码密钥 | 代码/配置文件中不能有真实密钥，必须走环境变量或 ecosystem.config.js | ADMIN_SECRET、SMS_ACCESS_KEY 写死在代码里 |
| 输入校验 | 所有 req.body / req.params 在写入前做了校验 | 缺少 parseId()、缺少 pick() 白名单 |
| 越权防护 | PUT 时 id 不被覆写，POST 时不接受客户端传的 id | `Object.assign` 被用户传入覆盖 |
| XSS 防护 | 用户输入的 HTML 经过 sanitizer.js 处理 | 模板内容直接渲染未过滤 |
| SQL 注入防护 | 动态表名必须过 validateTable() 白名单，用参数化查询 | 字符串拼接 SQL |
| 上传安全 | 文件类型过滤、大小限制、随机文件名 | 允许 .php/.exe 上传 |
| 限流 | 登录/短信接口有限流器 | 无限制可暴力破解 |

## 三、性能

| 检查项 | 判断标准 | 常见问题 |
|--------|----------|----------|
| 图片压缩 | 上传的图片应走 compress.js 异步压缩 | 原图 > 2MB 直接返回 |
| 缓存头 | 静态资源有 Cache-Control，媒体文件 immutable | 每次请求重新下载 |
| 数据库读写 | 单次请求只做一次 readData，修改后只一次 writeData | 循环内多次读写 |
| 模板渲染 | 重复渲染走 template-cache（24h TTL） | 每次请求重新渲染 |
| npm install | 服务器只装 production 依赖（--production） | 装了 vitest/supertest 等测试工具 |

## 四、架构规范

| 检查项 | 判断标准 | 常见问题 |
|--------|----------|----------|
| 路由文件一致性 | 新路由是否遵循 cards.js 的 CRUD 骨架 | 自定义路径、不统一的错误格式 |
| 模块职责 | 路由只管 HTTP，业务逻辑在独立模块 | 路由文件里写数据库迁移逻辑 |
| 环境变量 | 开发/生产差异通过环境变量控制 | 本地路径硬编码，push 到生产 |
| server.js 副作用 | 不要在模块顶层执行 app.listen() | 测试时多 worker 端口冲突 |
| package.json | 新依赖已声明，dev vs production 正确分类 | 运行时包放 devDependencies |

## 五、AI 特有风险

| 检查项 | 判断标准 | 常见问题 |
|--------|----------|----------|
| 幻觉 API | 代码中引用的函数/方法确实存在 | 调用了不存在的库方法 |
| 过时语法 | 代码符合项目现有风格 | ESM/CJS 混用不当 |
| 过度工程 | 没有为"未来可能的需求"加抽象层 | 3 行能解决的写了一个类 |
| 注释诚实度 | 注释说的是 WHY 而非 WHAT，没有过时注释 | 注释和代码行为不一致 |
| 依赖版本 | 新加的包版本与现有技术栈兼容 | 装了个需要 Node 20 的包但服务器是 Node 18 |

---

【输出示例格式】
| 维度 | 检查项 | 状态 | 位置/说明 | 修复建议 |
|------|--------|------|-----------|----------|
| 安全 | 无硬编码密钥 | ❌ | cloud/login/index.js 第 12 行 | 改为 process.env.DB_PASS |
| 测试 | 缺少 401 鉴权测试 | ❌ | 新路由 POST 端点 | 参照下方测试骨架补充 |
| 性能 | 图片未压缩 | ⚠️ | upload.js:56 | 加 compressImage() 异步调用 |

---

现在请开始审查。
