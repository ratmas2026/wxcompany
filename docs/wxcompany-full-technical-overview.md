# wxcompany 项目技术全览

> 生成日期：2026-05-29 | 分支：master | 服务器：阿里云 121.199.31.53 / www.flow-rhythm.com

---

## 一、项目定位

微信小程序"企业展示"系统。一套集名片管理、公司展示、模板渲染、后台管理的轻量 CMS。
纯 JavaScript 全栈，无框架（无 React/Vue/TypeScript），单体架构，SQLite 数据库。

```
miniprogram（微信小程序）  ←→  server（Express API :3456）  ←→  admin（静态 HTML 后台）
                                        ↕
                                   Nginx（:443 反代 + SSL）
                                        ↕
                                   SQLite（sql.js 内存数据库）
```

---

## 二、服务端（server/）

### 2.1 入口：server.js

- **端口**：3456
- **中间件栈**：`cors()` → `compression()` → `express.json(10MB)` → 静态文件 → 限流 → 鉴权 → 路由 → 错误处理
- **静态文件**：`admin/`（no-cache），`uploads/`（图片/视频 7 天不可变缓存）
- **限流**：全局 200次/分，登录 10次/分，短信 3次/分（测试环境自动跳过）
- **测试保护**：`process.env.VITEST` 时跳过 `app.listen()`

### 2.2 鉴权系统（auth.js）

- **两套 Token**：
  - Admin Token：`HMAC-SHA256("admin:<expiry>", ADMIN_SECRET)` → 后台管理用
  - User Token：`HMAC-SHA256("user:<phone>:<expiry>", USER_SECRET)` → 小程序用户用，仅允许 POST /api/inquiry
- **Token TTL**：24 小时
- **短信**：阿里云 dysmsapi20170525 SDK，内存验证码（Map，60s 自动清理）
- **鉴权中间件**：跳过 `/api/login`、`/api/auth-check`、`/api/sms/send`；GET 请求除 `/api/messages` 外免鉴权

### 2.3 数据库（db.js）

- **引擎**：sql.js（纯 JavaScript SQLite，WASM 实现，无原生依赖）
- **文件**：`server/data.db`（~86KB）
- **模式**：WAL 日志，`readData()` 全量读取 → 内存操作 → `writeData()` 事务写回
- **首次启动**：从 `data.json` 迁移到 SQLite

#### 15 张表

| 表 | 说明 | 关键字段 |
|----|------|---------|
| cards | 名片 | name, phone, title, department, company, email, address, avatar, bio, template, status |
| company_infos | 公司信息 | name, legal_person, phone, address, longitude, latitude, website, description |
| company_profiles | 公司简介 | cover(JSON), detail(JSON), sort_order |
| company_performances | 公司业绩 | cover(JSON), detail(JSON), sort_order |
| business_modules | 业务模块 | name, cover_image, layout_type, cards(JSON), sections(JSON), status |
| honors | 荣誉资质 | name, description, image, date |
| projects | 项目案例 | name, location, year, description, tags(JSON), images(JSON), highlights(JSON), detail_images(JSON), results(JSON) |
| messages | 咨询留言 | name, company, phone, title, areas, message, status(new/converted/trashed) |
| positions | 招聘岗位 | name, department, description, count, sort |
| videos | 视频库 | title, cover, url, category, status(draft/published), duration, views |
| splash_images | 启动页 | url, sort |
| sites | 工地 | project_name, stage, stage_value, location |
| templates | 名片模板 | name, filename, mime_type, size |
| config | 配置 | key/value 键值对 |
| users | 管理员 | username, password_hash, phone, email |

### 2.4 模板渲染系统

**上传流程**：HTML/TXT 文件 → Multer(uuid文件名) → 检测 Tailwind CDN → 编译为内联 CSS → DOMPurify 净化 → 存入 templates/ 目录

**渲染流程**（`GET /api/templates/:id/render?cardId=X`）：
1. 查缓存（24h TTL，5000条上限，key=`templateId:cardId`）
2. 缓存未命中→读模板文件→读名片数据→读公司信息
3. 白名单占位符替换：`{{user.name}}` `{{user.title}}` `{{user.phone}}` `{{user.email}}` `{{user.address}}` `{{user.avatar}}` `{{user.department}}` `{{user.bio}}` `{{company.name}}` `{{company.logo}}` `{{qr_code}}`
4. DOMPurify 再次净化→包裹 HTML 文档骨架→写缓存→返回

**白名单之外的占位符**：静默替换为空字符串

### 2.5 文件上传（upload.js）

11 个 Multer 实例，分目录存储，时间戳+随机数前缀：

| 类型 | 目录 | 大小限制 | 格式限制 |
|------|------|---------|---------|
| avatar | uploads/avatars | 1MB | 图片 |
| cover | uploads/covers | 5MB | 图片 |
| splash | uploads/splash | 5MB | 图片 |
| profile | uploads/profile | 5MB | 图片 |
| honors | uploads/honors | 5MB | 图片 |
| projects | uploads/projects | 5MB | 图片 |
| business-module | uploads/business-modules | 5MB | 图片 |
| performance | uploads/performance | 5MB | 图片 |
| editor | uploads/editor | 50MB | 图片 |
| video | uploads/videos | 50MB | MP4/WebM |
| template | uploads/templates/../templates | 500KB | HTML/TXT |

图片上传后异步压缩（sharp，JPEG/PNG quality 80，max 1920px，压缩后体积更小才替换）。视频不压缩。

### 2.6 安全

- **sanitizer.js**：DOMPurify + jsdom，白名单标签（含 SVG 全套：path/circle/rect/line/filter/feGaussianBlur 等），白名单属性（含 style/d/stroke-dasharray），禁止 on* 事件/javascript: 协议/iframe/embed/object
- **utils.js**：`pick()` 批量赋值保护，`parseId()` 安全整数解析
- **template-engine.js**：白名单占位符替换 + HTML 转义
- **所有 `/api/*` 路由**：鉴权中间件 + 限流

### 2.7 全部 API 端点（80+）

| 路由文件 | 端点前缀 | 方法 | 说明 |
|---------|---------|------|------|
| auth | /api/login | POST | 后台登录/小程序手机验证码登录 |
| auth | /api/sms/send | POST | 发送短信验证码 |
| auth | /api/auth-check | GET | 验证 Token 有效性 |
| cards | /api/cards | GET/POST | 列表/创建名片 |
| cards | /api/cards/:id | GET/PUT/DELETE | 单名片 CRUD |
| cards | /api/cards/:id/toggle | PATCH | 切换启用/停用 |
| cards | /api/cards/batch-delete | POST | 批量删除 |
| cards | /api/user/phone/:phone | GET | 按手机号查名片 |
| card-config | /api/card-page-config | GET/PUT | 名片页布局配置 |
| company-infos | /api/company-infos | GET/POST | 公司信息 |
| company-infos | /api/company-infos/:id | GET/PUT/DELETE | 单条 CRUD |
| company-profile | /api/company/profile | GET/POST | 公司简介列表/创建 |
| company-profile | /api/company/profile/:id | GET/PUT/DELETE | 单条 CRUD |
| company-profile | /api/company/profile-config | GET/PUT | 简介页配置 |
| company-profile | /api/company/profile/reorder | POST | 排序 |
| company-profile | /api/company/profile/migrate | POST | 旧格式迁移 |
| company-performance | /api/company/performance | GET/POST | 业绩 CRUD |
| company-performance | /api/company/performance-config | GET/PUT | 业绩页配置 |
| company-performance | /api/company/performance/reorder | POST | 排序 |
| case-config | /api/company/case-page-config | GET/PUT | 案例页配置 |
| business-modules | /api/business-modules | GET/POST | 业务模块 CRUD |
| business-modules | /api/business-modules/page-config | GET/PUT | 模块页配置 |
| business-modules | /api/business-modules/:mid/cards | POST | 模块内新建子卡片 |
| business-modules | /api/business-modules/:mid/cards/:cid | GET/PUT/DELETE | 子卡片 CRUD |
| honors | /api/honors | GET/POST | 荣誉 CRUD |
| projects | /api/projects | GET/POST | 项目 CRUD |
| upload | /api/upload/* | POST | 10 种文件上传 |
| splash | /api/splash | GET | 启动页图片 |
| splash | /api/splash/:id | PUT | 更新 |
| messages | /api/messages | GET | 留言列表（admin-only） |
| messages | /api/messages/:id | PUT | 更新状态/备注 |
| messages | /api/messages/batch-delete | POST | 批量删除 |
| positions | /api/positions | GET/POST | 岗位 CRUD |
| videos | /api/videos | GET/POST | 视频 CRUD |
| inquiry | /api/inquiry | POST | 提交咨询（user-token 可访问） |
| reset | /api/reset | POST | 数据重置 |
| templates | /api/templates | GET/POST | 模板列表/上传 |
| templates | /api/templates/:id | DELETE | 删除模板 |
| templates | /api/templates/:id/raw | GET | 获取模板源码 |
| templates | /api/templates/:id/render | GET | 渲染模板+名片数据 |
| user | /api/user/password | PUT | 修改密码 |
| user | /api/user/bind-phone | POST | 发送绑定手机验证码 |
| user | /api/user/bind-phone/verify | POST | 验证绑定手机 |
| user | /api/user/bind-email | POST | 发送绑定邮箱验证码 |
| user | /api/user/bind-email/verify | POST | 验证绑定邮箱 |
| user | /api/user/bindings | GET | 查看绑定状态 |
| user | /api/user/profile | GET | 查看个人信息 |

### 2.8 测试

- **框架**：Vitest v4.1.7 + supertest v7.2.2
- **配置文件**：`vitest.config.js`（server）、`vitest.admin.config.js`（admin/jsdom）、`vitest.miniprogram.config.js`（小程序）
- **22 个测试文件**，跨越 3 套件
- **当前**：307 tests 通过（16 test files）

### 2.9 依赖

| 包 | 版本 | 用途 |
|----|------|------|
| express | ^4.21.0 | Web 框架 |
| cors | ^2.8.6 | 跨域 |
| compression | ^1.8.1 | gzip/brotli 压缩 |
| multer | ^2.1.1 | 文件上传 |
| sql.js | ^1.14.1 | SQLite（WASM） |
| sharp | ^0.34.5 | 图片压缩 |
| dompurify | ^3.4.5 | XSS 净化 |
| jsdom | ^29.1.1 | 服务端 DOM |
| tailwindcss | ^3.4.19 | CSS 编译 |
| postcss | ^8.5.15 | CSS 后处理 |
| autoprefixer | ^10.5.0 | CSS 前缀 |
| express-rate-limit | ^8.5.2 | 限流 |
| @alicloud/dysmsapi20170525 | ^2.0.0 | 阿里云短信 |
| @alicloud/pop-core | ^1.7.0 | 阿里云 SDK |

---

## 三、管理后台（admin/）

### 3.1 技术栈

- **纯静态 HTML**（30+ 页面），无 SPA 框架
- **共享 JS**：`js/data.js`（874行 API 层）+ `js/common.js`（451行 UI 框架）
- **共享 CSS**：`css/common.css`（1146行设计系统，CSS 自定义属性）

### 3.2 架构模式

- **离线优先**：DataStore 先写 localStorage 再异步同步服务端
- **预加载**：`DataStore.preload()` 首次加载 18 个并发请求批量获取所有数据
- **乐观更新**：界面即时响应，后台静默提交

### 3.3 页面清单

| 页面 | 功能 |
|------|------|
| login.html | 后台登录 |
| index.html | 控制台仪表盘（名片管理主页） |
| card-edit.html | 名片编辑器（字段编辑+模板选择） |
| card-preview.html | 名片预览（拖拽互动，赛博朋克主题） |
| card-custom.html | 名片自定义 |
| card-templates.html | 模板管理器（上传/预览/删除/查看源码） |
| company-info.html | 公司信息编辑 |
| company-profile.html | 公司简介管理 |
| company-profile-edit.html | 简介编辑（cover/detail 结构） |
| company-performance.html | 公司业绩管理 |
| company-performance-edit.html | 业绩编辑 |
| business-modules.html | 业务模块管理 |
| case-custom.html | 案例页定制 |
| honors.html | 荣誉资质管理 |
| projects.html | 项目案例管理 |
| videos.html | 视频库管理 |
| splash.html | 启动页图片管理 |
| messages.html | 咨询留言管理 |
| positions.html | 招聘岗位管理 |
| display-custom.html | 展示定制 |
| user-profile.html | 用户个人信息 |
| account-settings.html | 账户设置（密码/绑定） |

### 3.4 DataStore API（js/data.js）

提供所有实体的 CRUD 方法，统一通过 `authFetch()` 请求，自动处理 Token、缓存、错误：
`getCards()` `saveCard()` `deleteCard()` `getCompanyInfos()` `getCompanyProfiles()` `getCompanyPerformances()` `getBusinessModules()` `getHonors()` `getProjects()` `getVideos()` `getSplashImages()` `getMessages()` `getPositions()` `getTemplates()` `getTemplateRender()` `uploadTemplate()` `deleteTemplate()` 等。

### 3.5 Admin UI 框架（js/common.js）

- `Admin.init()`：注入顶栏+侧边栏+导航，启动通知轮询
- 全局组件：toast 提示、modal 弹窗、confirm 确认框、pagination 分页
- 通知系统：30 秒轮询新留言，侧边栏角标

---

## 四、微信小程序（miniprogram/）

### 4.1 技术规格

- **AppID**：`wx55caf10db8f623c7`
- **SDK**：3.15.2
- **域名**：`www.flow-rhythm.com`（已备案白名单）

### 4.2 页面结构（15 页）

**底部导航页（4 个 Tab）：**

| Tab | 页面 | 功能 |
|-----|------|------|
| 案例 | pages/company/company | 公司展示首页，配置驱动的卡片布局（hero/single/grid/horizontal-scroll/tabs），展示简介/业绩/荣誉/项目/业务模块/视频 |
| 合作 | pages/inquiry/inquiry | 合作咨询表单，4字段(姓名/电话/公司/职位)+多选合作领域，localStorage 缓存草稿 |
| 名片 | pages/card/card | 数字名片展示，扫描动画，配置驱动的内容区（公司信息/简介/业绩/荣誉/业务模块） |
| 我的 | pages/mine/mine | 个人中心，登录状态/统计数/菜单(我的名片/咨询记录/收藏/设置) |

**子页面（11 个）：**

| 页面 | 功能 |
|------|------|
| pages/splash/splash | 启动页，随机服务端图片+本地回退，"跳过"按钮对齐胶囊 |
| pages/login/login | 手机号+短信验证码登录，60s 倒计时，协议勾选 |
| pages/company-detail/company-detail | 公司简介详情 |
| pages/company-detail-performance/company-detail-performance | 业绩详情 |
| pages/project/project | 项目详情 |
| pages/contact/contact | 联系方式 |
| pages/card-share/card-share | 名片分享页 |
| pages/business-module-detail/business-module-detail | 业务模块详情（含全部子卡片） |
| pages/business-card-detail/business-card-detail | 业务模块内单卡片详情 |

### 4.3 组件

- **bottom-nav**：毛玻璃自定义底部导航，4 Tab + emoji 图标
- **top-bar**：粘性顶栏，返回按钮+标题+右侧插槽，自适应状态栏高度

### 4.4 设计系统（app.wxss）

- 主色 `#3a5f94`（海军蓝），背景 `#f8f9fa`（浅灰），文字 `#2b3437`（深炭色）
- 工具类：颜色/背景/毛玻璃面板/排版/圆角/弹性布局/卡片/按钮/输入框/隐藏滚动条/安全区

### 4.5 网络层（utils/api.js）

- **双重缓存**：飞行中请求去重（共享 Promise）+ GET 响应缓存（30s TTL，200 条上限 LRU 淘汰）
- **定期清理**：60s 清理过期缓存
- **超时**：15 秒
- **图片处理**：`staticUrl()` 追加 CDN 参数（resize/WebP 转换）
- **25+ API 函数**：覆盖所有数据端点

### 4.6 布局引擎（utils/layout.js）

`parseGridLayout()` 解析服务端返回的布局字符串，支持：
`single` `hero` `tab` `carousel` `horizontal-scroll` `grid-N` `grid-6-2x3` `grid-6-3x2`

---

## 五、部署架构

### 5.1 服务器

- **提供商**：阿里云轻量服务器（香港，免备案）
- **IP**：121.199.31.53
- **域名**：www.flow-rhythm.com
- **SSL**：Nginx 终结，证书在 `certs/` 和 `/opt/wxcompany/certs/`

### 5.2 进程管理（PM2）

```
名称: wxcompany
模式: fork（单实例）
脚本: server/server.js
工作目录: /opt/wxcompany/server
最大内存: 300MB
日志: /opt/wxcompany/logs/
重启次数: 70（截至 2026-05-29）
```

### 5.3 Nginx

- HTTPS → Node.js :3456 反向代理
- 静态文件直出（admin/ 目录）
- `/api/` `/uploads/` 代理到 Node.js

### 5.4 CI/CD（GitHub Actions）

- **触发**：push/PR 到 master
- **矩阵测试**：3 个并行 job（server/admin/miniprogram），各跑 `npm ci` + vitest
- **部署**：测试全过 + push master → SSH 到服务器 → `git pull` → `npm install --production` → `pm2 restart` → 健康检查 curl
- **双 Remote**：origin（GitHub）+ aliyun（直推部署）

### 5.5 部署流程（手动）

1. 本地改代码 → 跑测试 `npx vitest run`
2. Git commit
3. SCP 文件到服务器（模板文件、静态资源等）
4. `ssh aliyun "pm2 restart wxcompany"`（清缓存）

---

## 六、关键设计决策

1. **单体架构**：所有数据在单文件 SQLite 中，`readData()` 全量读取到内存，`writeData()` 事务写回
2. **纯 JavaScript**：无 TypeScript，无 React/Vue，无微服务，无 Redis
3. **模板系统**：服务端 HTML 渲染 + 24h 内存缓存，白名单占位符替换，上传时 Tailwind 预编译
4. **离线优先后台**：localStorage 缓存 + 异步服务端同步
5. **配置驱动布局**：小程序通过服务端返回的布局配置动态渲染页面结构
6. **双 Token 鉴权**：后台用 HMAC-SHA256 admin token，小程序用 user token（仅允许提交咨询）
7. **sql.js 而非 better-sqlite3**：纯 JavaScript 实现，无需编译原生模块，跨平台部署简单
8. **名片为核心**：Card 是中心实体，模板、公司信息、业绩、荣誉、业务模块都围绕名片展示
