const config = require('./config.js')
const BASE_URL = config.BASE_URL
const STATIC_BASE = config.STATIC_BASE

// 防重缓存：第一层 inflight（并发去重），第二层 response（短时缓存）
const _inflight = new Map()
const _cache = new Map()
const CACHE_TTL = 30000 // GET 响应缓存 30 秒
const MAX_CACHE_SIZE = 200  // 防止无限增长

// 定期清理过期缓存（每 60 秒）
function _cleanExpiredCache() {
  const now = Date.now()
  for (const [key, entry] of _cache) {
    if (now - entry.ts >= CACHE_TTL) _cache.delete(key)
  }
}
setInterval(_cleanExpiredCache, 60000)

function _cacheKey(url, options) {
  try {
    const method = (options.method || 'GET').toUpperCase()
    return method + ':' + url + ':' + JSON.stringify(options.data || {})
  } catch (e) {
    // If data contains circular references, fall back to a non-cacheable key
    return method + ':' + url + ':__unstringifiable__'
  }
}

function request(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase()
  const key = _cacheKey(url, options)

  // 第一层：in-flight 去重
  if (_inflight.has(key)) return _inflight.get(key)

  // 第二层：GET 响应缓存（带 TTL）
  if (method === 'GET' && _cache.has(key)) {
    const entry = _cache.get(key)
    if (Date.now() - entry.ts < CACHE_TTL) return Promise.resolve(entry.data)
    _cache.delete(key)
  }

  const p = new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + url,
      method: method,
      data: options.data || {},
      timeout: 15000,
      header: { 'Content-Type': 'application/json', ...options.header },
      success: (res) => {
        if (res.statusCode === 200) {
          if (method === 'GET') {
            if (_cache.size >= MAX_CACHE_SIZE) {
              // Evict the oldest entry
              let oldestKey = null
              let oldestTs = Infinity
              for (const [k, entry] of _cache) {
                if (entry.ts < oldestTs) { oldestTs = entry.ts; oldestKey = k }
              }
              if (oldestKey) _cache.delete(oldestKey)
            }
            _cache.set(key, { data: res.data, ts: Date.now() })
          }
          resolve(res.data)
        } else {
          reject(res)
        }
      },
      fail: (err) => {
        // 失败不清缓存，下次可能恢复；但清除 inflight 让后续请求重试
        reject(err)
      },
      complete: () => {
        _inflight.delete(key)
      }
    })
  })

  _inflight.set(key, p)
  return p
}

// 获取企业信息列表（含经纬度坐标）
const getCompanyInfos = () => request('/company-infos')

// 获取名片列表
const getCards = (params) => request('/cards', { data: params })

// 提交留言
const submitInquiry = (data) => request('/inquiry', { method: 'POST', data })

// 获取视频列表
const getVideos = () => request('/videos')

// 获取项目列表
const getProjects = () => request('/projects')

// 获取项目详情
const getProjectDetail = (id) => request('/projects/' + id)


// 获取启动页图片
const getSplashImages = () => request('/splash')

// 获取企业简介（6个板块 + 图片/视频）
const getCompanyProfile = () => request('/company/profile')

// 获取企业介绍展示配置
const getCompanyProfileConfig = () => request('/company/profile-config')

// 获取单张企业介绍卡片详情
const getCompanyProfileDetail = (id) => request('/company/profile/' + id)

// 获取公司业绩列表
const getCompanyPerformance = () => request('/company/performance')

// 获取公司业绩展示配置
const getCompanyPerformanceConfig = () => request('/company/performance-config')

// 获取单张公司业绩卡片详情
const getCompanyPerformanceDetail = (id) => request('/company/performance/' + id)

// 获取企业荣誉列表
const getHonors = () => request('/honors')

// 获取案例页配置
const getCasePageConfig = () => request('/company/case-page-config')

// 获取名片页配置
const getCardPageConfig = () => request('/card-page-config')

// 获取核心业务模块列表
const getBusinessModules = () => request('/business-modules')

// 获取核心业务模块展示方案配置
const getBusinessModulePageConfig = () => request('/business-modules/page-config')

// 获取单个业务模块详情（含所有卡片）
const getBusinessModuleDetail = (id) => request('/business-modules/' + id)

// 获取业务模块内单张卡片详情
const getBusinessModuleCard = (moduleId, cardId) => request('/business-modules/' + moduleId + '/cards/' + cardId)

// 手机号查用户（用于登录匹配）
const getUserByPhone = (phone) => request('/user/phone/' + phone)

// 将服务器相对路径转为完整URL（用于图片/视频等静态资源）
// 支持可选的图片处理参数，对接 OSS/CDN 的实时转换能力
// 示例: staticUrl('/uploads/a.jpg', { w: 300, h: 300 }) → 裁剪为300x300
// 当 STATIC_BASE 指向 OSS 时自动追加 x-oss-process 参数
// 当 STATIC_BASE 为普通服务器时参数被忽略（无副作用）
const staticUrl = (path, options) => {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path
  if (!path.startsWith('/')) path = '/' + path

  var url = STATIC_BASE + path

  // 图片处理参数（对接 OSS/CDN 时生效）
  if (options) {
    var params = []
    // 尺寸裁剪：仅指定宽或高时等比缩放，同时指定时裁剪填充
    if (options.w || options.h) {
      if (options.w && options.h) {
        params.push('x-oss-process=image/resize,m_fill,w_' + options.w + ',h_' + options.h + ',limit_0')
      } else if (options.w) {
        params.push('x-oss-process=image/resize,w_' + options.w)
      } else {
        params.push('x-oss-process=image/resize,h_' + options.h)
      }
    }
    // WebP 格式转换（微信小程序全面支持）
    if (options.webp !== false) {
      params.push('x-oss-process=image/format,webp')
    }
    if (params.length) url = url + '?' + params.join('|')
  }

  return url
}

module.exports = {
  request,
  staticUrl,
  getCompanyInfos,
  getCards,
  getVideos,
  getProjects,
  getProjectDetail,

  getSplashImages,
  getCompanyProfile,
  getCompanyProfileConfig,
  getCompanyProfileDetail,
  getCompanyPerformance,
  getCompanyPerformanceConfig,
  getCompanyPerformanceDetail,
  getHonors,
  getCasePageConfig,
  getCardPageConfig,
  getBusinessModules,
  getBusinessModulePageConfig,
  getBusinessModuleDetail,
  getBusinessModuleCard,
  submitInquiry,
  getUserByPhone
}
