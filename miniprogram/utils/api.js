const config = require('./config.js')
const BASE_URL = config.BASE_URL
const STATIC_BASE = config.STATIC_BASE

// 防重缓存：第一层 inflight（并发去重），第二层 response（短时缓存）
const _inflight = new Map()
const _cache = new Map()
const CACHE_TTL = 30000 // GET 响应缓存 30 秒

function _cacheKey(url, options) {
  const method = (options.method || 'GET').toUpperCase()
  return method + ':' + url + ':' + JSON.stringify(options.data || {})
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
          if (method === 'GET') _cache.set(key, { data: res.data, ts: Date.now() })
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
const staticUrl = (path) => {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path
  if (!path.startsWith('/')) path = '/' + path
  return STATIC_BASE + path
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
