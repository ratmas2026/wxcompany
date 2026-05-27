================================================================================
  wxcompany 系统架构图 — 模块边界 / 数据流向 / 依赖关系
  生成日期: 2026-05-27
================================================================================


一、模块边界图
================================================================================

┌─────────────────────────────────────────────────────────────────────────┐
│                          微信小程序 (miniprogram/)                        │
│                                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ company  │  │  card    │  │  mine    │  │ inquiry  │  │  splash  │ │
│  │  (首页)  │  │ (名片页) │  │ (我的)   │  │ (合作)   │  │ (启动页) │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘ │
│       │              │              │              │              │      │
│  ┌────┴─────┐  ┌────┴─────┐  ┌────┴─────┐  ┌────┴─────┐        │      │
│  │company-  │  │project   │  │card-share│  │contact   │        │      │
│  │detail    │  │          │  │          │  │          │        │      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │      │
│                                                                 │      │
│  ┌──────────────────────────────────────────────────────────────┘      │
│  │                    utils/api.js                                     │
│  │   . request(path)  → wx.request                                    │
│  │   . staticUrl(url) → OSS 图片处理                                   │
│  │   . 两层缓存: 并发去重 + GET 响应缓存(30s TTL)                       │
│  └──────────────────────────────┬──────────────────────────────────────┘
│                                 │ HTTPS
│                    BASE_URL = https://www.flow-rhythm.com/api
└─────────────────────────────────┼────────────────────────────────────────
                                  │
                    ┌─────────────┴──────────────┐
                    │         Nginx :443          │
                    │  . SSL 终止                 │
                    │  . 静态文件 /uploads/       │
                    │  . 反向代理 → :3456          │
                    └─────────────┬──────────────┘
                                  │
┌─────────────────────────────────┼────────────────────────────────────────┐
│                         server/ (Express :3456)                           │
│                                                                          │
│  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐     │
│  │  server.js (76行) │  │    Middleware      │  │   Rate Limiters   │     │
│  │  . 20个路由挂载   │  │  . cors           │  │  . globalLimiter  │     │
│  │  . 静态文件服务   │  │  . compression    │  │  . loginLimiter   │     │
│  │  . /api 健康检查  │  │  . express.json   │  │  . smsLimiter     │     │
│  └───────┬───────────┘  │  . authMiddleware │  │                    │     │
│          │              └───────────────────┘  └────────────────────┘     │
│          │                                                               │
│  ┌───────┴──────────────────────────────────────────────────────────┐    │
│  │                     17 Route Files (routes/)                      │    │
│  │                                                                   │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │    │
│  │  │  cards   │ │company-  │ │company-  │ │ business │  ...共17个 │    │
│  │  │  (CRUD)  │ │profile   │ │performance│ │ -modules │            │    │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘            │    │
│  │       └─────────────┴────────────┴────────────┘                  │    │
│  │                         │                                        │    │
│  └─────────────────────────┼────────────────────────────────────────┘    │
│                            │                                             │
│  ┌─────────────────────────┼────────────────────────────────────────┐    │
│  │               Shared Modules (server/)                            │    │
│  │                                                                   │    │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────────┐  │    │
│  │  │ auth.js   │  │ upload.js │  │compress.js│  │ sanitizer.js  │  │    │
│  │  │ . tokens  │  │ . multer  │  │ . sharp   │  │ . DOMPurify   │  │    │
│  │  │ . SMS     │  │ . 12实例  │  │   (JPEG/  │  │   + jsdom     │  │    │
│  │  │ . 速率    │  │ . filters │  │    PNG)   │  │               │  │    │
│  │  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └───────┬───────┘  │    │
│  │        │              │              │                │          │    │
│  │  ┌─────┴──────┐ ┌─────┴─────┐ ┌──────┴───────┐ ┌──────┴───────┐ │    │
│  │  │template-   │ │template-  │ │   utils.js   │ │     db.js    │ │    │
│  │  │engine.js   │ │cache.js   │ │ . pick       │ │ . sql.js     │ │    │
│  │  │{{...}}渲染 │ │Map TTL    │ │ . parseId    │ │ . SQLite     │ │    │
│  │  │            │ │24h/5000条 │ │ . readData   │ │ . 13 tables  │ │    │
│  │  └────────────┘ └───────────┘ │ . writeData  │ │ . WAL mode   │ │    │
│  │                               └──────────────┘ └──────┬───────┘ │    │
│  └───────────────────────────────────────────────────────┼─────────┘    │
│                                                          │              │
│                                              ┌───────────┴──────────┐   │
│                                              │    data.db (SQLite)  │   │
│                                              │    (内存中运行)      │   │
│                                              └──────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                          admin/ (后台管理)                                │
│                                                                          │
│  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐     │
│  │  login.html       │  │  index.html       │  │  card-edit.html   │     │
│  │  (独立登录页)     │→ │  (名片管理列表)   │  │  (名片编辑)       │     │
│  └────────┬──────────┘  └────────┬──────────┘  └────────┬──────────┘     │
│           │                      │                       │               │
│  ┌────────┴──────────────────────┴───────────────────────┴──────────┐    │
│  │                     js/data.js                                    │    │
│  │   . authFetch() — 自动注入 Bearer token                          │    │
│  │   . DataStore.init() — 18个并发fetch预加载到 localStorage        │    │
│  │   . 离线优先: 本地写 → 异步服务器同步                            │    │
│  └──────────────────────────────┬───────────────────────────────────┘    │
│                                 │                                        │
│  ┌──────────────────────────────┴───────────────────────────────────┐    │
│  │                     js/common.js                                  │    │
│  │   . Admin.init() — 注入侧边栏+顶栏+导航                          │    │
│  │   . 通知轮询、用户信息、Toast/Modal/确认框                       │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│           同一组 /api/* 端点 (与小程序共享后端)                            │
└──────────────────────────────────────────────────────────────────────────┘


二、数据流向图
================================================================================

2.1 数据写入流 (Write Path)
────────────────────────────────────────────────────────────────────────────────

  用户操作                    前端                  服务器
  ────────               ──────────              ──────────

  [保存名片]
      │
      ▼
  card-edit.html ───→ DataStore.saveCard()
                           │
                    ┌──────┴──────┐
                    │ 1. 乐观更新  │  ← cache.cards[idx] = card
                    │ localStorage │  ← 页面立即刷新
                    └──────┬──────┘
                           │
                           ▼
                    authFetch() PUT ───→  authMiddleware
                    /api/cards/:id             │
                                              ├─ 令牌验证
                                              ├─ Admin/User 权限
                                              ▼
                                        routes/cards.js
                                              │
                                              ├─ readData()  ← db.js
                                              ├─ 更新 cards 数组
                                              ├─ writeData() → db.js
                                              │    ┌──────────────────┐
                                              │    │ BEGIN TRANSACTION│
                                              │    │ DELETE FROM cards│
                                              │    │ INSERT 所有行    │
                                              │    │ COMMIT → save()  │
                                              │    └──────────────────┘
                                              ▼
                                        template-cache
                                        .invalidateUser(id)
                                              │
                                              ▼
                                        res.json(updatedCard)
                                              │
                    ◄──────────────────────────┘
              DataStore 确认数据已保存


2.2 数据读取流 (Read Path)
────────────────────────────────────────────────────────────────────────────────

  页面加载                    前端                  服务器
  ────────               ──────────              ──────────

  [进入首页]
      │
      ▼
  index.html ──→ DataStore.init()
                      │
                      ├─ authFetch(/api/cards) ───→ routes/cards.js
                      │                              └─ readData()
                      │                                 └─ SELECT * FROM
                      │                                    所有13张表
                      │
                      ├─ authFetch(/api/messages) ─→ routes/messages.js
                      │                                    │
                      ├─ ...(共18个并发请求)...          │
                      │                                    ▼
                      ├─ authFetch(/api/company-infos)→ 全部返回JSON
                      │
                      ▼
              localStorage.setItem(
                'admin_data_cache',
                JSON.stringify({cards, messages, ...})
              )
                      │
                      ▼
              DataStore.getCards()  ← 从 localStorage 读取
                      │
                      ▼
              render() → 页面显示

  ───────────────────────────────────────────────────────────────────
  后续操作: DataStore 直接用 localStorage 数据渲染，
  无需再次请求服务器 (直到下次 init() 或页面刷新)


2.3 模板渲染流 (Template Render)
────────────────────────────────────────────────────────────────────────────────

  小程序访问名片 ──→ wx.request ──→ /api/templates/:id/render?cardId=X
                                          │
                                          ├─ 检查 template-cache (Map)
                                          │   ┌─ HIT → 返回缓存HTML
                                          │   └─ MISS ↓
                                          │
                                          ├─ readData() 读模板+名片+公司
                                          ├─ fs.readFileSync(模板.html)
                                          │
                                          ├─ template-engine
                                          │   . 解析 {{name}} {{phone}}
                                          │   . HTML 转义防 XSS
                                          │
                                          ├─ sanitizer (DOMPurify+jsdom)
                                          │   . 移除 script (保留CDN)
                                          │   . 移除 event handlers
                                          │
                                          ├─ 写入 template-cache
                                          └─ res.send(Sanitized HTML)

  缓存失效: card 更新时 → template-cache.invalidateUser(cardId)
            清除该用户的所有模板渲染缓存


2.4 鉴权流 (Auth Flow)
────────────────────────────────────────────────────────────────────────────────

  后台登录:
  ┌──────────┐    username+password     ┌──────────────┐
  │login.html│ ──────────────────────→  │POST /api/login│
  └──────────┘                          └──────┬───────┘
                                               │
                                          auth.js 验证
                                          (env: ADMIN_USER/PASS)
                                               │
                                          createToken()
                                          = HMAC-SHA256(admin_secret)
                                               │
                                          res.json({token})
  ┌──────────┐ ◄──────────────────────────────┘
  │sessionStorage.setItem('admin_token')
  │window.location → index.html
  └──────────┘

  后续请求:
  ┌──────────┐  Authorization: Bearer xxx  ┌──────────────┐
  │authFetch │ ──────────────────────────→ │authMiddleware│
  └──────────┘                             └──────┬───────┘
                                                   │
                                              validateToken()
                                              . Base64解码
                                              . HMAC校验
                                              . 过期检查
                                              . Admin/User路由隔离
                                                   │
                                              next() → 路由处理

  小程序登录:
  ┌──────────┐    手机号+验证码       ┌──────────────┐
  │  login   │ ────────────────────→  │POST /api/login│
  │  (小程序)│                        │ (phone+code)  │
  └──────────┘                        └──────┬───────┘
                                             │
                                        codeStore.get(phone)
                                        . 验证码匹配+过期检查
                                             │
                                        createUserToken(phone)
                                        = HMAC-SHA256(user_secret)
                                             │
                                        res.json({token, user})
  ┌──────────┐ ◄────────────────────────────┘
  │wx.setStorageSync('userInfo')
  │后续请求带 token (同 admin 模式)
  └──────────┘


三、模块依赖关系图
================================================================================

                        ┌──────────────┐
                        │  server.js   │
                        │  (入口,76行) │
                        └──────┬───────┘
                               │ 挂载
          ┌────────────────────┼────────────────────────┐
          │                    │                        │
    ┌─────┴─────┐        ┌────┴────┐            ┌──────┴──────┐
    │  Middleware│        │ 17 路由 │            │  静态文件    │
    │  . cors   │        │ 文件    │            │  . admin/   │
    │  . compr  │        └───┬─────┘            │  . /uploads │
    │  . auth   │            │                  └─────────────┘
    │  . rate   │            │
    └───────────┘    ┌───────┼───────────────────────┐
                     │       │                       │
                     ▼       ▼                       ▼
              ┌─────────┐ ┌──────────┐ ┌──────────────────┐
              │ utils.js│ │template- │ │  upload.js        │
              │ pick    │ │engine.js │ │  (12 multer实例)  │
              │ parseId │ │{{ }}}    │ │  每个路由1-2个    │
              │readData │ └────┬─────┘ └────────┬─────────┘
              │writeData │     │               │
              └────┬─────┘     │               │
                   │           ▼               ▼
                   │    ┌──────────┐   ┌──────────────┐
                   │    │sanitizer │   │ compress.js  │
                   │    │DOMPurify │   │  sharp       │
                   │    └──────────┘   └──────────────┘
                   │
                   ▼
            ┌────────────┐
            │   db.js    │
            │  sql.js    │
            │ SQLite     │
            │ 13张表     │
            └────────────┘


四、路由表 (共80+个端点)
================================================================================

  挂载前缀                  路由文件                    路径示例
  ─────────────────────────────────────────────────────────────────
  /api              routes/auth.js              /api/login, /api/sms/send
  /api              routes/cards.js             /api/cards, /api/cards/:id
  /api              routes/card-config.js       /api/card-page-config
  /api/company-infos  routes/company-infos.js   /api/company-infos
  /api/company      routes/company-profile.js   /api/company/profile
  /api/company      routes/company-performance.js  /api/company/performance
  /api/company      routes/case-config.js       /api/company/case-page-config
  /api/business-modules  routes/business-modules.js  /api/business-modules
  /api/honors       routes/honors.js            /api/honors
  /api/projects     routes/projects.js          /api/projects
  /api/upload       routes/upload.js            /api/upload/cover 等10个
  /api/splash       routes/splash.js            /api/splash
  /api/messages     routes/messages.js          /api/messages
  /api/positions    routes/positions.js         /api/positions
  /api/videos       routes/videos.js            /api/videos
  /api/inquiry      routes/inquiry.js           /api/inquiry
  /api/reset        routes/reset.js             /api/reset
  /api/templates    routes/templates.js         /api/templates


五、数据存储结构 (SQLite 13张表)
================================================================================

  ┌─────────────────────┐  ┌───────────────────┐  ┌──────────────────┐
  │ cards               │  │ messages           │  │ positions        │
  │ . id, name, phone   │  │ . id, name, phone  │  │ . id, name, sort │
  │ . title, department │  │ . company, title   │  │ . desc, count    │
  │ . company, email    │  │ . message, status  │  │ . department     │
  │ . avatar, bio       │  │ . created_at       │  └──────────────────┘
  │ . status, template  │  └───────────────────┘
  └─────────────────────┘                        ┌──────────────────┐
  ┌─────────────────────┐  ┌───────────────────┐  │ splash_images    │
  │ company_profiles    │  │ company_performances│ │ . id, url, sort │
  │ . id, title         │  │ . id, title        │  └──────────────────┘
  │ . cover(JSON)       │  │ . cover(JSON)      │
  │ . detail(JSON)      │  │ . detail(JSON)     │  ┌──────────────────┐
  │ . sort_order        │  │ . sort_order       │  │ business_modules │
  └─────────────────────┘  └───────────────────┘  │ . id, name       │
  ┌─────────────────────┐  ┌───────────────────┐  │ . sections(JSON) │
  │ honors              │  │ projects           │  │ . cards(JSON)    │
  │ . id, name, desc    │  │ . id, name, location│  └──────────────────┘
  │ . date, image       │  │ . tags, images      │
  └─────────────────────┘  │ . detail(JSON)      │  ┌──────────────────┐
  ┌─────────────────────┐  └───────────────────┘  │ templates        │
  │ company_infos       │  ┌───────────────────┐  │ . id, name       │
  │ . id, name, phone   │  │ config             │  │ . filename       │
  │ . address, website  │  │ . key TEXT PK      │  │ . mime_type      │
  │ . longitude, latitude│  │ . value TEXT       │  │ . size           │
  └─────────────────────┘  └───────────────────┘  └──────────────────┘
  ┌─────────────────────┐
  │ videos              │    注: config 表存储6个key:
  │ . id, title, cover  │    companyProfileConfig, companyPerformanceConfig,
  │ . url, category     │    casePageConfig, businessModulePageConfig,
  │ . status, duration  │    cardPageConfig, nextId
  │ . views, description│
  └─────────────────────┘


六、关键设计决策
================================================================================

  1. 乐观更新 + 离线优先 (admin)
     前端先写 localStorage, 再异步 sync 到服务器。网络故障时数据不丢。

  2. 全量读写 (server)
     readData() 一次读 13 张表全部数据, writeData() 事务内全删全插。
     简单粗暴, 数据量小时足够。数据量大后需考虑增量更新。

  3. sql.js 内存模式 (server)
     SQLite 整个加载到内存, 修改后 save() 写回磁盘。
     SCP 替换 data.db 后必须 PM2 restart, 否则进程内是旧数据。

  4. localStorage 缓存 (admin)
     DataStore.init() 一次拉取全部数据存本地, 后续页面渲染不走网络。
     切换页面秒开, 但需手动刷新数据(或重载页面)。

  5. 模板渲染缓存 (server)
     template-cache (Map, 24h TTL) 缓存渲染后的 HTML。
     卡片更新时通过 invalidateUser 精确清除, 避免全量刷新。

  6. 两层请求缓存 (miniprogram)
     api.js: 并发去重(同请求共享Promise) + GET响应缓存(30s TTL)。
     减少重复网络请求, 页面切换流畅。
