// Data Store - localStorage cache synced with API server
const API_BASE = '/api'

function authFetch(url, options = {}) {
  const token = sessionStorage.getItem('admin_token')
  const headers = { ...options.headers }
  if (token) headers['Authorization'] = 'Bearer ' + token

  const controller = new AbortController()
  const signal = controller.signal
  const timeout = setTimeout(() => controller.abort(), 15000)

  return fetch(url, { ...options, headers, signal })
    .then(res => {
      clearTimeout(timeout)
      if (res.status === 401) {
        sessionStorage.removeItem('admin_token')
        sessionStorage.removeItem('admin_user')
        window.location.href = 'login.html'
        throw new Error('Unauthorized')
      }
      if (res.status >= 500) {
        if (typeof Admin !== 'undefined' && Admin.showToast) {
          Admin.showToast('服务器繁忙，稍后重试', 'error')
        }
      }
      return res
    })
    .catch(err => {
      clearTimeout(timeout)
      if (err.name === 'AbortError') {
        if (typeof Admin !== 'undefined' && Admin.showToast) {
          Admin.showToast('请求超时，请检查网络', 'error')
        }
        throw new Error('Request timeout')
      }
      if (err.message === 'Unauthorized') throw err
      if (err.message !== 'Request timeout' && typeof Admin !== 'undefined' && Admin.showToast) {
        Admin.showToast('网络异常，请检查连接', 'error')
      }
      throw err
    })
}

const DataStore = {
  _storageKey: 'admin_data_cache',
  _ready: false,
  _mutex: Promise.resolve(),

  // Serialize mutations to prevent read-modify-write races
  _lock(fn) {
    const p = this._mutex.then(() => fn())
    this._mutex = p.catch(() => {})
    return p
  },

  async init() {
    try {
      const res = await authFetch(API_BASE + '/cards')
      const cards = await res.json()
      const res2 = await authFetch(API_BASE + '/messages')
      const messages = await res2.json()
      const res3 = await authFetch(API_BASE + '/positions')
      const positions = await res3.json()
      const res4 = await authFetch(API_BASE + '/videos')
      const videos = await res4.json()
      const res5 = await authFetch(API_BASE + '/splash')
      const splashImages = await res5.json()
      const res6 = await authFetch(API_BASE + '/company/profile')
      const companyProfiles = await res6.json()
      const res7 = await authFetch(API_BASE + '/honors')
      const honors = await res7.json()
      const res9 = await authFetch(API_BASE + '/projects')
      const projects = await res9.json()
      const res11 = await authFetch(API_BASE + '/company/profile-config')
      const companyProfileConfig = await res11.json()
      const res12 = await authFetch(API_BASE + '/business-modules')
      const businessModules = await res12.json()
      const res13 = await authFetch(API_BASE + '/company/performance')
      const companyPerformances = await res13.json()
      const res14 = await authFetch(API_BASE + '/company/performance-config')
      const companyPerformanceConfig = await res14.json()
      const res15 = await authFetch(API_BASE + '/company/case-page-config')
      const casePageConfig = await res15.json()

      const res16 = await authFetch(API_BASE + '/business-modules/page-config')
      const businessModulePageConfig = await res16.json()
      const res17 = await authFetch(API_BASE + '/card-page-config')
      const cardPageConfig = await res17.json()
      const res18 = await authFetch(API_BASE + '/company-infos')
      const companyInfos = await res18.json()

      localStorage.setItem(this._storageKey, JSON.stringify({ cards, messages, positions, videos, splashImages, companyProfiles, companyProfileConfig, companyPerformances, companyPerformanceConfig, casePageConfig, cardPageConfig, honors, projects, businessModules, businessModulePageConfig, companyInfos }))
      this._ready = true
      return true
    } catch (e) {
      console.warn('Server unavailable, using localStorage cache:', e.message)
      if (!localStorage.getItem(this._storageKey)) {
        // First-time fallback: use embedded seed data
        const seed = {
          cards: [],
          messages: [],
          positions: [],
          videos: [],
          splashImages: [{id:1,url:'',sort:1},{id:2,url:'',sort:2},{id:3,url:'',sort:3}],
          companyProfiles: [],
          companyProfileConfig: { sections: [] },
          companyPerformances: [],
          companyPerformanceConfig: { sections: [] },
          casePageConfig: { sections: [] },
          cardPageConfig: { sections: [] },
          honors: [],
          projects: [],
          businessModules: [],
          businessModulePageConfig: { sections: [] },
          companyInfos: []
        }
        localStorage.setItem(this._storageKey, JSON.stringify(seed))
      }
      this._ready = true
      return false
    }
  },

  _getCache() {
    const raw = localStorage.getItem(this._storageKey)
    if (!raw) {
      return { cards: [], messages: [], positions: [], videos: [], splashImages: [{id:1,url:'',sort:1},{id:2,url:'',sort:2},{id:3,url:'',sort:3}], companyProfiles: [], companyProfileConfig: { sections: [] }, companyPerformances: [], companyPerformanceConfig: { sections: [] }, casePageConfig: { sections: [] }, cardPageConfig: { sections: [] }, honors: [], projects: [], businessModules: [], businessModulePageConfig: { sections: [] }, companyInfos: [] }
    }
    try {
      return JSON.parse(raw)
    } catch (e) {
      console.warn('Local cache corrupted, resetting to defaults')
      localStorage.removeItem(this._storageKey)
      return { cards: [], messages: [], positions: [], videos: [], splashImages: [{id:1,url:'',sort:1},{id:2,url:'',sort:2},{id:3,url:'',sort:3}], companyProfiles: [], companyProfileConfig: { sections: [] }, companyPerformances: [], companyPerformanceConfig: { sections: [] }, casePageConfig: { sections: [] }, cardPageConfig: { sections: [] }, honors: [], projects: [], businessModules: [], businessModulePageConfig: { sections: [] }, companyInfos: [] }
    }
  },

  _setCache(data) {
    localStorage.setItem(this._storageKey, JSON.stringify(data))
  },

  async _sync(type, method, url, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } }
    if (body) opts.body = JSON.stringify(body)
    const res = await authFetch(API_BASE + url, opts)
    if (!res.ok) throw new Error('Server responded with ' + res.status)
  },

  // Cards
  getCards() { return this._getCache().cards },

  async saveCard(card) {
    const cache = this._getCache()
    if (card.id) {
      const idx = cache.cards.findIndex(c => c.id === card.id)
      if (idx >= 0) { cache.cards[idx] = card; this._setCache(cache); await this._sync('cards', 'PUT', '/cards/' + card.id, card) }
    } else {
      try {
        const res = await authFetch(API_BASE + '/cards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(card) })
        const saved = await res.json()
        cache.cards.unshift(saved)
        this._setCache(cache)
      } catch (e) {
        // Offline: save locally
        card.id = Date.now()
        cache.cards.unshift(card)
        this._setCache(cache)
      }
    }
  },

  async deleteCard(id) {
    return this._lock(async () => {
      const cache = this._getCache()
      cache.cards = cache.cards.filter(c => c.id !== id)
      this._setCache(cache)
      await this._sync('cards', 'DELETE', '/cards/' + id)
    })
  },

  async toggleCardStatus(id) {
    return this._lock(async () => {
      const cache = this._getCache()
      const card = cache.cards.find(c => c.id === id)
      if (card) { card.status = !card.status; this._setCache(cache) }
      await this._sync('cards', 'PATCH', '/cards/' + id + '/toggle')
    })
  },

  async batchDeleteCards(ids) {
    return this._lock(async () => {
      const cache = this._getCache()
      cache.cards = cache.cards.filter(c => !ids.includes(c.id))
      this._setCache(cache)
      await this._sync('cards', 'POST', '/cards/batch-delete', { ids })
    })
  },

  // Messages
  getMessages() { return this._getCache().messages },

  async updateMessage(id, updates) {
    const cache = this._getCache()
    const msg = cache.messages.find(m => m.id === id)
    if (msg) Object.assign(msg, updates)
    this._setCache(cache)
    await this._sync('messages', 'PUT', '/messages/' + id, updates)
  },

  async deleteMessages(ids) {
    const cache = this._getCache()
    cache.messages = cache.messages.filter(m => !ids.includes(m.id))
    this._setCache(cache)
    await this._sync('messages', 'POST', '/messages/batch-delete', { ids })
  },

  // Positions
  getPositions() { return this._getCache().positions },

  async savePosition(pos) {
    const cache = this._getCache()
    if (pos.id) {
      const idx = cache.positions.findIndex(p => p.id === pos.id)
      if (idx >= 0) { cache.positions[idx] = pos; this._setCache(cache); await this._sync('positions', 'PUT', '/positions/' + pos.id, pos) }
    } else {
      try {
        const res = await authFetch(API_BASE + '/positions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pos) })
        const saved = await res.json()
        cache.positions.push(saved)
        this._setCache(cache)
      } catch (e) {
        pos.id = Date.now()
        cache.positions.push(pos)
        this._setCache(cache)
      }
    }
  },

  async deletePositions(ids) {
    const cache = this._getCache()
    cache.positions = cache.positions.filter(p => !ids.includes(p.id))
    this._setCache(cache)
    await this._sync('positions', 'POST', '/positions/batch-delete', { ids })
  },

  // File upload helpers
  async uploadVideo(file) {
    const fd = new FormData()
    fd.append('video', file)
    const res = await authFetch(API_BASE + '/upload/video', { method: 'POST', body: fd })
    const data = await res.json()
    return data.url
  },

  async uploadCover(file) {
    const fd = new FormData()
    fd.append('cover', file)
    const res = await authFetch(API_BASE + '/upload/cover', { method: 'POST', body: fd })
    const data = await res.json()
    return data.url
  },

  async uploadAvatar(file) {
    const fd = new FormData()
    fd.append('avatar', file)
    const res = await authFetch(API_BASE + '/upload/avatar', { method: 'POST', body: fd })
    const data = await res.json()
    return data.url
  },

  // Videos
  getVideos() { return this._getCache().videos },

  async saveVideo(video) {
    const cache = this._getCache()
    if (video.id) {
      const idx = cache.videos.findIndex(v => v.id === video.id)
      if (idx >= 0) { cache.videos[idx] = video; this._setCache(cache); await this._sync('videos', 'PUT', '/videos/' + video.id, video) }
    } else {
      try {
        const res = await authFetch(API_BASE + '/videos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(video) })
        const saved = await res.json()
        cache.videos.push(saved)
        this._setCache(cache)
      } catch (e) {
        video.id = Date.now()
        cache.videos.push(video)
        this._setCache(cache)
      }
    }
  },

  async deleteVideos(ids) {
    const cache = this._getCache()
    cache.videos = cache.videos.filter(v => !ids.includes(v.id))
    this._setCache(cache)
    await this._sync('videos', 'POST', '/videos/batch-delete', { ids })
  },

  async reset() {
    try {
      await authFetch(API_BASE + '/reset', { method: 'POST' })
    } catch (e) { /* ignore */ }
    localStorage.removeItem(this._storageKey)
    await this.init()
  },

  // Splash Images
  getSplashImages() { return this._getCache().splashImages },

  async uploadSplash(file) {
    const fd = new FormData()
    fd.append('splash', file)
    const res = await authFetch(API_BASE + '/upload/splash', { method: 'POST', body: fd })
    const data = await res.json()
    return data.url
  },

  async saveSplashImage(id, data) {
    const cache = this._getCache()
    const idx = cache.splashImages.findIndex(s => s.id === id)
    if (idx >= 0) { cache.splashImages[idx] = { ...cache.splashImages[idx], ...data }; this._setCache(cache) }
    await this._sync('splashImages', 'PUT', '/splash/' + id, data)
  },

  // Company Profiles (array-based)
  getCompanyProfiles() { return this._getCache().companyProfiles || [] },

  getCompanyProfile(id) { return (this._getCache().companyProfiles || []).find(p => p.id === id) },

  async saveCompanyProfile(profile) {
    const cache = this._getCache()
    if (!cache.companyProfiles) cache.companyProfiles = []
    if (profile.id) {
      const idx = cache.companyProfiles.findIndex(p => p.id === profile.id)
      if (idx >= 0) { await this._sync('companyProfiles', 'PUT', '/company/profile/' + profile.id, profile); cache.companyProfiles[idx] = profile; this._setCache(cache) }
    } else {
      try {
        const res = await authFetch(API_BASE + '/company/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profile) })
        const saved = await res.json()
        cache.companyProfiles.unshift(saved)
        this._setCache(cache)
      } catch (e) {
        profile.id = Date.now()
        cache.companyProfiles.unshift(profile)
        this._setCache(cache)
      }
    }
  },

  async deleteCompanyProfile(id) {
    const cache = this._getCache()
    cache.companyProfiles = (cache.companyProfiles || []).filter(p => p.id !== id)
    // 清理展示方案中被删除卡片的引用，防止 selectedIds 残留
    const config = cache.companyProfileConfig || { sections: [] }
    const sections = config.sections || []
    let cleaned = false
    sections.forEach(sec => {
      const before = (sec.selectedIds || []).length
      sec.selectedIds = (sec.selectedIds || []).filter(sid => sid !== id)
      if (sec.selectedIds.length !== before) cleaned = true
    })
    this._setCache(cache)
    await this._sync('companyProfiles', 'DELETE', '/company/profile/' + id)
    if (cleaned) await this.updateCompanyProfileConfig(config)
  },

  async uploadProfileImage(file) {
    const fd = new FormData()
    fd.append('profile', file)
    const res = await authFetch(API_BASE + '/upload/profile', { method: 'POST', body: fd })
    const data = await res.json()
    return data.url
  },

  async uploadEditorFile(file) {
    const fd = new FormData()
    fd.append('file', file)
    const res = await authFetch(API_BASE + '/upload/editor', { method: 'POST', body: fd })
    const data = await res.json()
    return data.url
  },

  // Company Profile Config
  getCompanyProfileConfig() { return this._getCache().companyProfileConfig || { sections: [] } },

  async updateCompanyProfileConfig(config) {
    const cache = this._getCache()
    cache.companyProfileConfig = config
    this._setCache(cache)
    await this._sync('companyProfileConfig', 'PUT', '/company/profile-config', config)
  },

  async reorderCompanyProfiles(orders) {
    const cache = this._getCache()
    const profiles = cache.companyProfiles || []
    orders.forEach(({ id, sortOrder }) => {
      const p = profiles.find(p => p.id === id)
      if (p) p.sortOrder = sortOrder
    })
    profiles.sort((a, b) => (a.sortOrder || a.id) - (b.sortOrder || b.id))
    this._setCache(cache)
    await this._sync('companyProfiles', 'POST', '/company/profile/reorder', { orders })
  },

  async migrateCompanyProfiles() {
    const res = await authFetch(API_BASE + '/company/profile/migrate', { method: 'POST' })
    const result = await res.json()
    await this.init()
    return result
  },

  // Company Performances (array-based)
  getCompanyPerformances() { return this._getCache().companyPerformances || [] },

  getCompanyPerformance(id) { return (this._getCache().companyPerformances || []).find(p => p.id === id) },

  async saveCompanyPerformance(profile) {
    const cache = this._getCache()
    if (!cache.companyPerformances) cache.companyPerformances = []
    if (profile.id) {
      const idx = cache.companyPerformances.findIndex(p => p.id === profile.id)
      if (idx >= 0) { await this._sync('companyPerformances', 'PUT', '/company/performance/' + profile.id, profile); cache.companyPerformances[idx] = profile; this._setCache(cache) }
    } else {
      try {
        const res = await authFetch(API_BASE + '/company/performance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profile) })
        const saved = await res.json()
        cache.companyPerformances.unshift(saved)
        this._setCache(cache)
      } catch (e) {
        profile.id = Date.now()
        cache.companyPerformances.unshift(profile)
        this._setCache(cache)
      }
    }
  },

  async deleteCompanyPerformance(id) {
    const cache = this._getCache()
    cache.companyPerformances = (cache.companyPerformances || []).filter(p => p.id !== id)
    // 清理展示方案中被删除卡片的引用
    const config = cache.companyPerformanceConfig || { sections: [] }
    const sections = config.sections || []
    let cleaned = false
    sections.forEach(sec => {
      const before = (sec.selectedIds || []).length
      sec.selectedIds = (sec.selectedIds || []).filter(sid => sid !== id)
      if (sec.selectedIds.length !== before) cleaned = true
    })
    this._setCache(cache)
    await this._sync('companyPerformances', 'DELETE', '/company/performance/' + id)
    if (cleaned) await this.updateCompanyPerformanceConfig(config)
  },

  async uploadPerformanceImage(file) {
    const fd = new FormData()
    fd.append('performance', file)
    const res = await authFetch(API_BASE + '/upload/performance', { method: 'POST', body: fd })
    const data = await res.json()
    return data.url
  },

  // Company Performance Config
  getCompanyPerformanceConfig() { return this._getCache().companyPerformanceConfig || { sections: [] } },

  async updateCompanyPerformanceConfig(config) {
    const cache = this._getCache()
    cache.companyPerformanceConfig = config
    this._setCache(cache)
    await this._sync('companyPerformanceConfig', 'PUT', '/company/performance-config', config)
  },

  async reorderCompanyPerformances(orders) {
    const cache = this._getCache()
    const profiles = cache.companyPerformances || []
    orders.forEach(({ id, sortOrder }) => {
      const p = profiles.find(p => p.id === id)
      if (p) p.sortOrder = sortOrder
    })
    profiles.sort((a, b) => (a.sortOrder || a.id) - (b.sortOrder || b.id))
    this._setCache(cache)
    await this._sync('companyPerformances', 'POST', '/company/performance/reorder', { orders })
  },

  async migrateCompanyPerformances() {
    const res = await authFetch(API_BASE + '/company/performance/migrate', { method: 'POST' })
    const result = await res.json()
    await this.init()
    return result
  },

  // Case Page Config
  getCasePageConfig() { return this._getCache().casePageConfig || { sections: [] } },

  async updateCasePageConfig(config) {
    const cache = this._getCache()
    cache.casePageConfig = config
    this._setCache(cache)
    await this._sync('casePageConfig', 'PUT', '/company/case-page-config', config)
  },

  // Card Page Config
  getCardPageConfig() { return this._getCache().cardPageConfig || { sections: [] } },

  async updateCardPageConfig(config) {
    const cache = this._getCache()
    cache.cardPageConfig = config
    this._setCache(cache)
    await this._sync('cardPageConfig', 'PUT', '/card-page-config', config)
  },

  // Business Modules
  getBusinessModules() { return this._getCache().businessModules || [] },

  getBusinessModule(id) { return (this._getCache().businessModules || []).find(m => m.id === id) },

  async saveBusinessModule(item) {
    const cache = this._getCache()
    if (!cache.businessModules) cache.businessModules = []
    if (item.id) {
      const idx = cache.businessModules.findIndex(m => m.id === item.id)
      if (idx >= 0) {
        await this._sync('businessModules', 'PUT', '/business-modules/' + item.id, item)
        cache.businessModules[idx] = { ...cache.businessModules[idx], ...item }
      } else {
        // Item exists on server but not in local cache; sync to server and add locally
        await this._sync('businessModules', 'PUT', '/business-modules/' + item.id, item)
        cache.businessModules.push(item)
      }
      this._setCache(cache)
    } else {
      try {
        const res = await authFetch(API_BASE + '/business-modules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) })
        const saved = await res.json()
        cache.businessModules.push(saved)
        this._setCache(cache)
      } catch (e) {
        item.id = Date.now()
        cache.businessModules.push(item)
        this._setCache(cache)
      }
    }
  },

  async deleteBusinessModule(id) {
    const cache = this._getCache()
    cache.businessModules = (cache.businessModules || []).filter(m => m.id !== id)
    // 清理展示方案中被删除模块的引用
    const config = cache.businessModulePageConfig || { sections: [] }
    const sections = config.sections || []
    let cleaned = false
    sections.forEach(sec => {
      const before = (sec.selectedIds || []).length
      sec.selectedIds = (sec.selectedIds || []).filter(sid => sid !== id)
      if (sec.selectedIds.length !== before) cleaned = true
    })
    this._setCache(cache)
    await this._sync('businessModules', 'DELETE', '/business-modules/' + id)
    if (cleaned) await this.updateBusinessModulePageConfig(config)
  },

  async saveBusinessModuleCard(moduleId, card) {
    const cache = this._getCache()
    const mod = (cache.businessModules || []).find(m => m.id === moduleId)
    if (!mod) throw new Error('Module not found')
    if (!mod.cards) mod.cards = []
    if (card.id) {
      const cidx = mod.cards.findIndex(c => c.id === card.id)
      if (cidx >= 0) {
        await this._sync('businessModuleCards', 'PUT', '/business-modules/' + moduleId + '/cards/' + card.id, card)
        mod.cards[cidx] = card
        this._setCache(cache)
      } else {
        throw new Error('Card not found in module')
      }
    } else {
      try {
        const res = await authFetch(API_BASE + '/business-modules/' + moduleId + '/cards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(card) })
        const saved = await res.json()
        mod.cards.push(saved)
        this._setCache(cache)
        return saved
      } catch (e) {
        card.id = Date.now()
        mod.cards.push(card)
        this._setCache(cache)
        return card
      }
    }
  },

  async deleteBusinessModuleCard(moduleId, cardId) {
    const cache = this._getCache()
    const mod = (cache.businessModules || []).find(m => m.id === moduleId)
    if (!mod) throw new Error('Module not found')
    mod.cards = (mod.cards || []).filter(c => c.id !== cardId)
    this._setCache(cache)
    await this._sync('businessModuleCards', 'DELETE', '/business-modules/' + moduleId + '/cards/' + cardId)
  },

  async reorderBusinessModuleCards(moduleId, orders) {
    const cache = this._getCache()
    const mod = (cache.businessModules || []).find(m => m.id === moduleId)
    if (!mod || !mod.cards) return
    orders.forEach(({ id, sortOrder }) => {
      const card = mod.cards.find(c => c.id === id)
      if (card) card.sortOrder = sortOrder
    })
    mod.cards.sort((a, b) => (a.sortOrder || a.id) - (b.sortOrder || b.id))
    this._setCache(cache)
    await this._sync('businessModules', 'PUT', '/business-modules/' + moduleId, mod)
  },

  async uploadBusinessModuleImage(file) {
    const fd = new FormData()
    fd.append('file', file)
    const res = await authFetch(API_BASE + '/upload/business-module', { method: 'POST', body: fd })
    const data = await res.json()
    return data.url
  },

  // Business Module Page Config
  getBusinessModulePageConfig() { return this._getCache().businessModulePageConfig || { sections: [] } },

  async updateBusinessModulePageConfig(config) {
    const cache = this._getCache()
    cache.businessModulePageConfig = config
    this._setCache(cache)
    await this._sync('businessModulePageConfig', 'PUT', '/business-modules/page-config', config)
  },

  // Honors
  getHonorsList() { return this._getCache().honors || [] },

  getHonor(id) { return (this._getCache().honors || []).find(h => h.id === id) },

  async saveHonor(item) {
    const cache = this._getCache()
    if (!cache.honors) cache.honors = []
    if (item.id) {
      const idx = cache.honors.findIndex(h => h.id === item.id)
      if (idx >= 0) { cache.honors[idx] = item; this._setCache(cache); await this._sync('honors', 'PUT', '/honors/' + item.id, item) }
    } else {
      try {
        const res = await authFetch(API_BASE + '/honors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) })
        const saved = await res.json()
        cache.honors.push(saved)
        this._setCache(cache)
      } catch (e) {
        item.id = Date.now()
        cache.honors.push(item)
        this._setCache(cache)
      }
    }
  },

  async deleteHonor(id) {
    const cache = this._getCache()
    cache.honors = (cache.honors || []).filter(h => h.id !== id)
    this._setCache(cache)
    await this._sync('honors', 'DELETE', '/honors/' + id)
  },

  async uploadHonorImage(file) {
    const fd = new FormData()
    fd.append('honors', file)
    const res = await authFetch(API_BASE + '/upload/honors', { method: 'POST', body: fd })
    const data = await res.json()
    return data.url
  },

  // Projects
  getProjectsList() { return this._getCache().projects || [] },

  getProject(id) { return (this._getCache().projects || []).find(p => p.id === id) },

  async saveProject(item) {
    const cache = this._getCache()
    if (!cache.projects) cache.projects = []
    if (item.id) {
      const idx = cache.projects.findIndex(p => p.id === item.id)
      if (idx >= 0) { cache.projects[idx] = item; this._setCache(cache); await this._sync('projects', 'PUT', '/projects/' + item.id, item) }
    } else {
      try {
        const res = await authFetch(API_BASE + '/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) })
        const saved = await res.json()
        cache.projects.push(saved)
        this._setCache(cache)
      } catch (e) {
        item.id = Date.now()
        cache.projects.push(item)
        this._setCache(cache)
      }
    }
  },

  async deleteProject(id) {
    const cache = this._getCache()
    cache.projects = (cache.projects || []).filter(p => p.id !== id)
    this._setCache(cache)
    await this._sync('projects', 'DELETE', '/projects/' + id)
  },

  async uploadProjectImage(file) {
    const fd = new FormData()
    fd.append('projects', file)
    const res = await authFetch(API_BASE + '/upload/projects', { method: 'POST', body: fd })
    const data = await res.json()
    return data.url
  },

  // Company Infos
  getCompanyInfos() { return this._getCache().companyInfos || [] },

  getCompanyInfo(id) { return (this._getCache().companyInfos || []).find(ci => ci.id === id) },

  async saveCompanyInfo(item) {
    const cache = this._getCache()
    if (!cache.companyInfos) cache.companyInfos = []
    if (item.id) {
      const idx = cache.companyInfos.findIndex(ci => ci.id === item.id)
      if (idx >= 0) {
        await this._sync('companyInfos', 'PUT', '/company-infos/' + item.id, item)
        cache.companyInfos[idx] = item
        this._setCache(cache)
      }
    } else {
      try {
        const res = await authFetch(API_BASE + '/company-infos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) })
        const saved = await res.json()
        cache.companyInfos.push(saved)
        this._setCache(cache)
      } catch (e) {
        item.id = Date.now()
        cache.companyInfos.push(item)
        this._setCache(cache)
      }
    }
  },

  async deleteCompanyInfo(id) {
    const cache = this._getCache()
    cache.companyInfos = (cache.companyInfos || []).filter(ci => ci.id !== id)
    this._setCache(cache)
    await this._sync('companyInfos', 'DELETE', '/company-infos/' + id)
  },

  // --- User Profile APIs ---
  async getUserProfile() {
    const res = await authFetch(API_BASE + '/user/profile')
    return res.json()
  },

  async updateUserProfile(field, value) {
    const res = await authFetch(API_BASE + '/user/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field, value })
    })
    return res.json()
  },

  async uploadUserAvatar(file) {
    const form = new FormData()
    form.append('file', file)
    const res = await authFetch(API_BASE + '/user/avatar', {
      method: 'POST',
      body: form
    })
    return res.json()
  },

  async checkUserField(field, value) {
    const res = await authFetch(API_BASE + '/user/check?field=' + encodeURIComponent(field) + '&value=' + encodeURIComponent(value))
    return res.json()
  },

  // --- Password & Sessions ---
  async changePassword(oldPassword, newPassword) {
    const res = await authFetch(API_BASE + '/user/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword, newPassword })
    })
    return res.json()
  },

  async getUserSessions() {
    const res = await authFetch(API_BASE + '/user/sessions')
    return res.json()
  },

  async deleteSession(id) {
    const res = await authFetch(API_BASE + '/user/sessions/' + id, { method: 'DELETE' })
    return res.json()
  },

  // --- Bindings ---
  async getUserBindings() {
    const res = await authFetch(API_BASE + '/user/bindings')
    return res.json()
  },

  // --- Notifications ---
  async getNotifications(limit = 5) {
    const res = await authFetch(API_BASE + '/notifications?limit=' + limit)
    return res.json()
  },

  async getUnreadCount() {
    const res = await authFetch(API_BASE + '/notifications/unread-count')
    return res.json()
  },

  async markNotificationRead(id) {
    const res = await authFetch(API_BASE + '/notifications/' + id + '/read', { method: 'PUT' })
    return res.json()
  },

  async markAllNotificationsRead() {
    const res = await authFetch(API_BASE + '/notifications/read-all', { method: 'PUT' })
    return res.json()
  },

  // --- Card Templates (V2) ---
  async getTemplates() {
    const res = await authFetch(API_BASE + '/templates')
    return res.json()
  },

  async uploadTemplate(file) {
    const fd = new FormData()
    fd.append('file', file)
    const res = await authFetch(API_BASE + '/templates', { method: 'POST', body: fd })
    return res.json()
  },

  async deleteTemplate(id) {
    const res = await authFetch(API_BASE + '/templates/' + id, { method: 'DELETE' })
    return res.json()
  },

  async getTemplateRaw(id) {
    const res = await authFetch(API_BASE + '/templates/' + id + '/raw')
    return res.json()
  },

  async getTemplateRender(id, cardId) {
    const res = await authFetch(API_BASE + '/templates/' + id + '/render?cardId=' + (cardId || 0))
    return res.text()
  }

}
