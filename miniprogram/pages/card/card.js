const api = require('../../utils/api')
const { FONT_SIZE_MAP, parseGridLayout } = require('../../utils/layout')
const app = getApp()

Page({
  data: {
    animationStage: 'scanning',
    isDataReady: false,
    cardData: {},
    companyInfo: {},
    companyInfos: [],
    matchedCI: null,
    sections: [],
    heroCard: null,
    playingCardId: null,
    honors: [],
    awards: [],
    projects: [],
    performanceSections: [],
    performanceHeroCard: null,
    businessModules: [],
    businessSections: [],
    businessHeroCards: [],

    pageSections: [],
    isOwnCard: false,
    isSharedCard: false,
    canAddContact: false
  },

  onLoad(options) {
    this._cardId = options.cardId ? parseInt(options.cardId) : null
    this._configLoaded = true
    this._animationPlayed = false
    if (wx.canIUse && wx.canIUse('addPhoneContact')) {
      this.setData({ canAddContact: true })
    }
    this._startScanAnimation()
    this.fetchCardConfig()
    this.fetchData()
  },

  _startScanAnimation() {
    if (this._animationPlayed) return
    this._animationPlayed = true
    this.setData({ animationStage: 'scanning' })
    this._scanTimer = setTimeout(() => {
      this.setData({ animationStage: 'revealing' })
      this._revealTimer = setTimeout(() => {
        this.setData({ animationStage: 'done' })
      }, 450)
    }, 1200)
  },

  onUnload() {
    if (this._scanTimer) clearTimeout(this._scanTimer)
    if (this._revealTimer) clearTimeout(this._revealTimer)
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }
    const userPhone = (getApp().globalData.userInfo && getApp().globalData.userInfo.phone) || ''
    if (!this._cardId && !userPhone) {
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }
    if (!this._configLoaded) {
      this._configLoaded = true
      this.fetchCardConfig()
    }
    this.fetchData()
  },

  fetchCardConfig() {
    api.getCardPageConfig().then(config => {
      const sections = (config.sections || []).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      const enabled = sections.filter(sec => sec.enabled !== false)
      const types = new Set(enabled.map(sec => sec.type))

      const tasks = []
      if (types.has('profiles')) tasks.push(this.fetchAll())
      if (types.has('performance')) tasks.push(this.fetchPerformance())
      if (types.has('honors')) tasks.push(this.fetchHonors())
      if (types.has('projects')) tasks.push(this.fetchProjects())
      if (types.has('business')) tasks.push(this.fetchBusinessModules())

      const pageSections = enabled.map(sec => ({ id: sec.id, type: sec.type, name: sec.name }))

      Promise.all(tasks).then(() => {
        this.setData({ pageSections, isDataReady: true })
      })
    }).catch(() => {
      this.setData({ isDataReady: true })
    })
  },

  fetchAll() {
    return Promise.all([
      api.getCompanyProfileConfig().catch(() => ({ sections: [] })),
      api.getCompanyProfile().catch(() => []),
      api.getCompanyInfos().catch(() => [])
    ]).then(([config, profiles, companyInfos]) => {
      const activeCI = (companyInfos || []).find(ci => ci.status !== false)
      const companyInfo = activeCI ? {
        name: activeCI.name || '',
        description: activeCI.description || '',
        headquarters: '',
        phone: activeCI.phone || '',
        address: activeCI.address || '',
        email: '',
        stats: {},
        leaderQuote: '', leaderName: '', leaderTitle: '', leaderAvatar: ''
      } : {}
      const allProfiles = (profiles || []).sort((a, b) => (a.sortOrder || a.id) - (b.sortOrder || b.id)).map(p => {
        // 防御性解析：服务器可能返回 JSON 字符串
        if (typeof p.cover === 'string') {
          try { p.cover = JSON.parse(p.cover) } catch (e) { p.cover = { backgroundImage: '', video: '', zones: {} } }
        }
        if (typeof p.detail === 'string') {
          try { p.detail = JSON.parse(p.detail) } catch (e) { p.detail = { title: '', body: '', images: [], video: '', detailEntry: true } }
        }
        if (p.cover) {
          const zones = p.cover.zones || {}
          p.cover.zones = {
            top: { textBoxes: (zones.top && zones.top.textBoxes) || [] },
            middle: { textBoxes: (zones.middle && zones.middle.textBoxes) || [] },
            bottom: { textBoxes: (zones.bottom && zones.bottom.textBoxes) || [] }
          }
          p.cover.backgroundImage = api.staticUrl(p.cover.backgroundImage, { w: 720 })
          p.cover.video = api.staticUrl(p.cover.video)
        }
        if (p.detail) {
          p.detail.images = (p.detail.images || []).map(img => api.staticUrl(img, { w: 750 }))
          p.detail.video = api.staticUrl(p.detail.video)
        }
        if (p.cover && p.cover.zones) {
          Object.keys(p.cover.zones).forEach(zoneKey => {
            p.cover.zones[zoneKey].textBoxes = p.cover.zones[zoneKey].textBoxes.map(tb => {
              const result = {
                ...tb,
                fontSizeRpx: FONT_SIZE_MAP[tb.fontSize] || '32rpx'
              }
              if (result.role && result.role.avatar) {
                result.role = { ...result.role, avatar: api.staticUrl(result.role.avatar, { w: 144, h: 144 }) }
              }
              return result
            })
          })
        }
        if (p.cover && p.cover.body) {
          p.cover.body = p.cover.body.replace(/<img[^>]+src="([^"]+)"/gi, function(fullMatch, src) {
            if (src && !/^(https?:|data:|\/\/)/i.test(src)) {
              return fullMatch.replace(src, api.staticUrl(src))
            }
            return fullMatch
          })
          p.cover.body = p.cover.body.replace(/style="text-align:\s*center;?"/gi, 'style="text-align:left"')
        }
        return p
      })

      const sections = (config.sections || [])
        .filter(sec => sec.status !== false)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))

      const heroSection = sections.find(sec => sec.displayLayout === 'hero')
      const heroCard = heroSection
        ? allProfiles.find(p => p.id === (heroSection.selectedIds || [])[0]) || null
        : null
      if (heroCard) {
        const is43 = heroCard.cover && heroCard.cover.aspectRatio === '4:3'
        heroCard._height = is43 ? 515 : 386
      }

      // All sections (hero excluded if standalone heroCard renders)
      const heroSectionId = heroSection ? heroSection.id : null
      const sectionData = sections
        .filter(sec => !heroCard || sec.id !== heroSectionId)
        .map(sec => {
          const parsed = parseGridLayout(sec.displayLayout)
          const cards = (sec.selectedIds || []).map(id => allProfiles.find(p => p.id === id)).filter(Boolean)
          cards.forEach(card => {
            const is43 = card.cover && card.cover.aspectRatio === '4:3'
            if (parsed.layout === 'grid') {
              card._height = is43 ? 250 : 187
            } else if (parsed.layout === 'horizontal-scroll') {
              card._height = is43 ? 450 : 338
            } else if (parsed.layout === 'tab') {
              const perPage = sec.tabPerPage || 1
              card._height = perPage === 1 ? (is43 ? 515 : 386) : (is43 ? 250 : 187)
            } else {
              card._height = is43 ? 515 : 386
            }
          })
          if (parsed.layout === 'tab') {
            const perPage = sec.tabPerPage || 1
            const tabs = []
            for (let i = 0; i < Math.ceil(cards.length / perPage); i++) {
              const pageCards = cards.slice(i * perPage, (i + 1) * perPage)
              let title = ''
              if (sec.tabTitleSource === 'custom' && sec.tabLabels && sec.tabLabels[i]) {
                title = sec.tabLabels[i]
              } else {
                title = pageCards[0] ? (pageCards[0].title || '') : ('标签' + (i + 1))
              }
              tabs.push({ title, cards: pageCards })
            }
            return {
              id: sec.id,
              displayLayout: 'tab',
              tabLayout: sec.tabLayout || 'scroll',
              tabPerPage: perPage,
              activeTab: 0,
              tabs,
              currentTabCards: tabs.length > 0 ? tabs[0].cards : [],
              gridCols: parsed.gridCols,
              gridClass: parsed.gridClass
            }
          }
          return { id: sec.id, displayLayout: parsed.layout, cards, gridCols: parsed.gridCols, gridClass: parsed.gridClass }
        })

      this.setData({ sections: sectionData, heroCard, companyInfo: companyInfo || {} })
    }).catch(err => {
      console.error('[card.fetchAll] 企业动态数据加载失败:', err)
    })
  },

  fetchHonors() {
    return api.getHonors().then(honors => {
      const awards = (honors || []).map(h => ({
        ...h,
        image: api.staticUrl(h.image, { w: 320 })
      }))
      this.setData({ awards })
    }).catch(() => {})
  },

  fetchProjects() {
    return api.getProjects().then(projects => {
      const items = (projects || []).map(p => ({
        ...p,
        image: api.staticUrl(p.image, { w: 320 }),
        images: (p.images || []).map(img => api.staticUrl(img, { w: 320 }))
      }))
      this.setData({ projects: items })
    }).catch(() => {})
  },

  fetchPerformance() {
    return Promise.all([
      api.getCompanyPerformanceConfig().catch(() => ({ sections: [] })),
      api.getCompanyPerformance().catch(() => [])
    ]).then(([config, profiles]) => {
      const allProfiles = (profiles || []).sort((a, b) => (a.sortOrder || a.id) - (b.sortOrder || b.id)).map(p => {
        if (typeof p.cover === 'string') {
          try { p.cover = JSON.parse(p.cover) } catch (e) { p.cover = { backgroundImage: '', video: '', zones: {} } }
        }
        if (typeof p.detail === 'string') {
          try { p.detail = JSON.parse(p.detail) } catch (e) { p.detail = { title: '', body: '', images: [], video: '', detailEntry: true } }
        }
        if (p.cover) {
          const zones = p.cover.zones || {}
          p.cover.zones = {
            top: { textBoxes: (zones.top && zones.top.textBoxes) || [] },
            middle: { textBoxes: (zones.middle && zones.middle.textBoxes) || [] },
            bottom: { textBoxes: (zones.bottom && zones.bottom.textBoxes) || [] }
          }
          p.cover.backgroundImage = api.staticUrl(p.cover.backgroundImage, { w: 720 })
          p.cover.video = api.staticUrl(p.cover.video)
        }
        if (p.detail) {
          p.detail.images = (p.detail.images || []).map(img => api.staticUrl(img, { w: 750 }))
          p.detail.video = api.staticUrl(p.detail.video)
        }
        if (p.cover && p.cover.zones) {
          Object.keys(p.cover.zones).forEach(zoneKey => {
            p.cover.zones[zoneKey].textBoxes = p.cover.zones[zoneKey].textBoxes.map(tb => {
              const result = {
                ...tb,
                fontSizeRpx: FONT_SIZE_MAP[tb.fontSize] || '32rpx'
              }
              if (result.role && result.role.avatar) {
                result.role = { ...result.role, avatar: api.staticUrl(result.role.avatar, { w: 144, h: 144 }) }
              }
              return result
            })
          })
        }
        if (p.cover && p.cover.body) {
          p.cover.body = p.cover.body.replace(/<img[^>]+src="([^"]+)"/gi, function(fullMatch, src) {
            if (src && !/^(https?:|data:|\/\/)/i.test(src)) {
              return fullMatch.replace(src, api.staticUrl(src))
            }
            return fullMatch
          })
          p.cover.body = p.cover.body.replace(/style="text-align:\s*center;?"/gi, 'style="text-align:left"')
        }
        return p
      })

      const sections = (config.sections || [])
        .filter(sec => sec.status !== false)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))

      const heroSection = sections.find(sec => sec.displayLayout === 'hero')
      const heroCard = heroSection
        ? allProfiles.find(p => p.id === (heroSection.selectedIds || [])[0]) || null
        : null
      if (heroCard) {
        const is43 = heroCard.cover && heroCard.cover.aspectRatio === '4:3'
        heroCard._height = is43 ? 515 : 386
      }

      const sectionData = sections
        .filter(sec => sec.displayLayout !== 'hero')
        .map(sec => {
          const parsed = parseGridLayout(sec.displayLayout)
          const cards = (sec.selectedIds || []).map(id => allProfiles.find(p => p.id === id)).filter(Boolean)
          cards.forEach(card => {
            const is43 = card.cover && card.cover.aspectRatio === '4:3'
            if (parsed.layout === 'grid') {
              card._height = is43 ? 250 : 187
            } else if (parsed.layout === 'horizontal-scroll') {
              card._height = is43 ? 450 : 338
            } else if (parsed.layout === 'tab') {
              const perPage = sec.tabPerPage || 1
              card._height = perPage === 1 ? (is43 ? 515 : 386) : (is43 ? 250 : 187)
            } else {
              card._height = is43 ? 515 : 386
            }
          })
          if (parsed.layout === 'tab') {
            const perPage = sec.tabPerPage || 1
            const tabs = []
            for (let i = 0; i < Math.ceil(cards.length / perPage); i++) {
              const pageCards = cards.slice(i * perPage, (i + 1) * perPage)
              let title = ''
              if (sec.tabTitleSource === 'custom' && sec.tabLabels && sec.tabLabels[i]) {
                title = sec.tabLabels[i]
              } else {
                title = pageCards[0] ? (pageCards[0].title || '') : ('标签' + (i + 1))
              }
              tabs.push({ title, cards: pageCards })
            }
            return {
              id: sec.id,
              displayLayout: 'tab',
              tabLayout: sec.tabLayout || 'scroll',
              tabPerPage: perPage,
              activeTab: 0,
              tabs,
              currentTabCards: tabs.length > 0 ? tabs[0].cards : [],
              gridCols: parsed.gridCols,
              gridClass: parsed.gridClass
            }
          }
          return { id: sec.id, displayLayout: parsed.layout, cards, gridCols: parsed.gridCols, gridClass: parsed.gridClass }
        })

      this.setData({ performanceSections: sectionData, performanceHeroCard: heroCard })
    }).catch(err => {
      console.error('[card.fetchPerformance] 公司业绩数据加载失败:', err)
    })
  },

  fetchBusinessModules() {
    return Promise.all([
      api.getBusinessModules().catch(() => []),
      api.getBusinessModulePageConfig().catch(() => ({ sections: [] }))
    ]).then(([modules, config]) => {
      const allModules = (modules || []).filter(m => m.status !== false).map(m => ({
        ...m,
        coverImage: api.staticUrl(m.coverImage, { w: 720 })
      }))
      const configSections = (config.sections || [])
        .filter(sec => sec.status !== false)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))

      const heroSections = configSections.filter(sec => sec.displayLayout === 'hero')
      const businessHeroCards = heroSections.map(sec => {
        const mod = allModules.find(m => m.id === (sec.selectedIds || [])[0])
        if (mod) {
          const is43 = mod.coverAspectRatio === '4:3'
          mod._height = is43 ? 515 : 386
        }
        return mod
      }).filter(Boolean)

      const sections = configSections
        .filter(sec => sec.displayLayout !== 'hero')
        .map(sec => {
          const parsed = parseGridLayout(sec.displayLayout)
          const cards = (sec.selectedIds || [])
            .map(id => allModules.find(m => m.id === id))
            .filter(Boolean)
          cards.forEach(card => {
            const is43 = card.coverAspectRatio === '4:3'
            if (parsed.layout === 'grid') {
              card._height = is43 ? 250 : 187
            } else if (parsed.layout === 'horizontal-scroll') {
              card._height = is43 ? 450 : 338
            } else {
              card._height = is43 ? 515 : 386
            }
          })
          return { id: sec.id, displayLayout: parsed.layout, cards, gridCols: parsed.gridCols, gridClass: parsed.gridClass }
        })
      this.setData({ businessModules: allModules, businessSections: sections, businessHeroCards: businessHeroCards })
    }).catch(() => {})
  },

  fetchData() {
    const userPhone = (app.globalData.userInfo && app.globalData.userInfo.phone) || ''

    Promise.all([
      api.getCards(),
      api.getCompanyInfos()
    ]).then(([cards, companyInfos]) => {
      let card
      if (this._cardId) {
        card = (cards || []).find(c => c.id === this._cardId) || {}
      } else {
        card = (cards || []).find(c => c.phone === userPhone && c.status === true) || {}
      }
      if (card.avatar) card.avatar = api.staticUrl(card.avatar, { w: 144, h: 144 })
      const infos = (companyInfos || []).filter(ci => ci.status !== false)
      const matched = card.company ? infos.find(ci => ci.name === card.company) || null : null
      const matchedCI = matched || (infos.length > 0 ? infos[0] : null)
      const fallbackCI = infos.length > 0 ? infos[0] : {}
      const isOwnCard = !!(userPhone && card.phone && userPhone === card.phone)
      const isSharedCard = !!(this._cardId && !isOwnCard)
      this.setData({
        cardData: card,
        companyInfo: fallbackCI,
        companyInfos: infos,
        matchedCI: matchedCI,
        isOwnCard: isOwnCard,
        isSharedCard: isSharedCard
      })
    }).catch(() => {})
  },

  onCoverCardTap(e) {
    const profile = e.currentTarget.dataset.profile
    if (!profile) return
    if (!profile.detail || !profile.detail.detailEntry) return
    wx.navigateTo({ url: '/pages/company-detail/company-detail?id=' + profile.id })
  },

  onTabSwitch(e) {
    const sectionId = e.currentTarget.dataset.sectionId
    const tabIndex = e.currentTarget.dataset.tabIndex
    const idx = this.data.sections.findIndex(sec => sec.id === sectionId)
    if (idx < 0) return
    const sec = this.data.sections[idx]
    this.setData({
      ['sections[' + idx + '].activeTab']: tabIndex,
      ['sections[' + idx + '].currentTabCards']: sec.tabs[tabIndex] ? sec.tabs[tabIndex].cards : []
    })
  },

  onPerformanceCardTap(e) {
    const profile = e.currentTarget.dataset.profile
    if (!profile) return
    if (!profile.detail || !profile.detail.detailEntry) return
    wx.navigateTo({ url: '/pages/company-detail-performance/company-detail-performance?id=' + profile.id })
  },

  onBizCardTap(e) {
    const moduleId = e.currentTarget.dataset.moduleId
    if (!moduleId) return
    wx.navigateTo({ url: '/pages/business-module-detail/business-module-detail?moduleId=' + moduleId })
  },

  onCoverVideoTap(e) {
    const profile = e.currentTarget.dataset.profile
    if (!profile || !profile.cover || !profile.cover.video) return
    if (this.data.playingCardId) {
      const oldCtx = wx.createVideoContext('vid-' + this.data.playingCardId)
      if (oldCtx) oldCtx.pause()
    }
    this.setData({ playingCardId: profile.id }, () => {
      wx.nextTick(() => {
        const ctx = wx.createVideoContext('vid-' + profile.id)
        if (ctx) ctx.play()
      })
    })
  },

  closeInlineVideo() {
    if (this.data.playingCardId) {
      const ctx = wx.createVideoContext('vid-' + this.data.playingCardId)
      if (ctx) ctx.pause()
    }
    this.setData({ playingCardId: null })
  },

  callPhone() {
    const phone = this.data.cardData.phone || this.data.companyInfo.phone
    if (phone) wx.makePhoneCall({ phoneNumber: phone })
  },

  sendEmail() {
    const email = this.data.cardData.email || this.data.companyInfo.email
    if (email) {
      wx.setClipboardData({ data: email })
      wx.showToast({ title: '邮箱已复制', icon: 'none' })
    }
  },

  saveContact() {
    const card = this.data.cardData
    const ci = this.data.matchedCI || this.data.companyInfo
    if (!card.phone) return
    wx.addPhoneContact({
      firstName: card.name || '',
      mobilePhoneNumber: card.phone,
      organization: ci.name || card.company || '',
      title: card.title || '',
      success: () => wx.showToast({ title: '已打开通讯录', icon: 'success' }),
      fail: () => wx.showToast({ title: '添加失败', icon: 'none' })
    })
  },

  openMap() {
    const ci = this.data.matchedCI || this.data.companyInfo
    if (ci && ci.longitude && ci.latitude) {
      wx.openLocation({
        latitude: ci.latitude,
        longitude: ci.longitude,
        name: ci.name || '',
        address: ci.address || '',
        scale: 16
      })
    } else {
      const addr = ci && ci.address
      if (addr) {
        wx.setClipboardData({ data: addr })
        wx.showToast({ title: '地址已复制', icon: 'none' })
      } else {
        wx.showToast({ title: '暂无定位信息', icon: 'none' })
      }
    }
  },

  shareCard() {
    wx.showToast({ title: '分享功能', icon: 'none' })
  },

  generatePoster() {
    wx.showToast({ title: '生成海报', icon: 'none' })
  },

  collectCard() {
    wx.showToast({ title: '已收藏', icon: 'success' })
  },

  onShareAppMessage() {
    return {
      title: `${this.data.cardData.name || '企业名片'} - 企业名片`,
      path: `/pages/card/card?cardId=${this.data.cardData.id}`
    }
  }
})
