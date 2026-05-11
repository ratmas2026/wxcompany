const api = require('../../utils/api')
const { FONT_SIZE_MAP, parseGridLayout } = require('../../utils/layout')

Page({
  data: {
    isDataReady: false,
    hasProfiles: false,
    companyInfo: {},
    sections: [],
    heroCard: null,
    videos: [],
    currentVideo: null,
    honors: [],
    awards: [],
    projects: [],
    performanceSections: [],
    performanceHeroCard: null,
    businessModules: [],
    businessSections: [],
    businessHeroCards: [],
    sitesList: [],

    showProfiles: false,
    showBusiness: false,
    showPerformance: false,
    showHonors: false,
    showProjects: false,
    showSites: false,
    profilesModuleName: '',
    businessModuleName: '',
    performanceModuleName: '',
    honorsModuleName: '',
    projectsModuleName: '',
    sitesModuleName: ''
  },

  onLoad() {
    this._configLoaded = true
    this.fetchCaseConfig()
    this.fetchVideos()
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }
    if (!this._configLoaded) {
      this._configLoaded = true
      this.fetchCaseConfig()
      this.fetchVideos()
    }
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
      // Process all profiles
      const allProfiles = (profiles || []).sort((a, b) => (a.sortOrder || a.id) - (b.sortOrder || b.id)).map(p => {
        if (p.cover) {
          p.cover.backgroundImage = api.staticUrl(p.cover.backgroundImage)
          p.cover.video = api.staticUrl(p.cover.video)
        }
        if (p.detail) {
          p.detail.images = (p.detail.images || []).map(img => api.staticUrl(img))
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
                result.role = { ...result.role, avatar: api.staticUrl(result.role.avatar) }
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
          // WeChat rich-text doesn't inherit CSS from parent, so parent's
          // text-align:left can't override inline text-align:center.
          // Normalize centering to left alignment.
          p.cover.body = p.cover.body.replace(/style="text-align:\s*center;?"/gi, 'style="text-align:left"')
        }
        return p
      })

      // Build sections from config (sorted by sortOrder, filter disabled)
      const sections = (config.sections || [])
        .filter(sec => sec.status !== false)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))

      // Extract hero card (first hero section's first card)
      const heroSection = sections.find(sec => sec.displayLayout === 'hero')
      const heroCard = heroSection
        ? allProfiles.find(p => p.id === heroSection.selectedIds[0]) || null
        : null
      if (heroCard) {
        const is43 = heroCard.cover && heroCard.cover.aspectRatio === '4:3'
        heroCard._height = is43 ? 515 : 386
      }

      // Non-hero sections
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

      sectionData.forEach(s => {
        if (s.displayLayout === 'grid') {
          console.log('[fetchAll] section', s.id, 'gridCols=', s.gridCols, 'gridClass=', s.gridClass)
        }
      })
      this.setData({ sections: sectionData, heroCard, companyInfo: companyInfo || {} })
    }).catch(() => {})
  },

  fetchCompanyInfo() {
    api.getCompanyInfos().then(list => {
      const activeCI = (list || []).find(ci => ci.status !== false)
      const info = activeCI ? {
        name: activeCI.name || '',
        description: activeCI.description || '',
        headquarters: '',
        phone: activeCI.phone || '',
        address: activeCI.address || '',
        email: '',
        stats: {},
        leaderQuote: '', leaderName: '', leaderTitle: '', leaderAvatar: ''
      } : {}
      this.setData({ companyInfo: info })
    }).catch(() => {})
  },

  fetchHonors() {
    return api.getHonors().then(honors => {
      const awards = (honors || []).map(h => ({
        ...h,
        image: api.staticUrl(h.image)
      }))
      this.setData({ awards })
    }).catch(() => {})
  },

  fetchVideos() {
    api.getVideos().then(videos => {
      const published = (videos || []).filter(v => v.status === 'published').map(v => ({
        ...v,
        url: api.staticUrl(v.url),
        cover: api.staticUrl(v.cover)
      }))
      this.setData({ videos: published })
    }).catch(() => {})
  },

  fetchProjects() {
    return api.getProjects().then(projects => {
      const items = (projects || []).map(p => ({
        ...p,
        image: api.staticUrl(p.image),
        images: (p.images || []).map(img => api.staticUrl(img))
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
        if (p.cover) {
          p.cover.backgroundImage = api.staticUrl(p.cover.backgroundImage)
          p.cover.video = api.staticUrl(p.cover.video)
        }
        if (p.detail) {
          p.detail.images = (p.detail.images || []).map(img => api.staticUrl(img))
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
                result.role = { ...result.role, avatar: api.staticUrl(result.role.avatar) }
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
        ? allProfiles.find(p => p.id === heroSection.selectedIds[0]) || null
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
            } else {
              card._height = is43 ? 515 : 386
            }
          })
          return { id: sec.id, displayLayout: parsed.layout, cards, gridCols: parsed.gridCols, gridClass: parsed.gridClass }
        })

      sectionData.forEach(s => {
        if (s.displayLayout === 'grid') {
          console.log('[fetchPerformance] section', s.id, 'gridCols=', s.gridCols, 'gridClass=', s.gridClass)
        }
      })
      this.setData({ performanceSections: sectionData, performanceHeroCard: heroCard })
    }).catch(() => {})
  },

  fetchCaseConfig() {
    console.time('isDataReady')
    api.getCasePageConfig().then(config => {
      const sections = (config.sections || []).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      const enabled = sections.filter(sec => sec.enabled !== false)
      const types = new Set(enabled.map(sec => sec.type))
      const moduleNames = {}
      enabled.forEach(sec => { moduleNames[sec.type] = sec.name })

      const tasks = []
      if (types.has('profiles')) tasks.push(this.fetchAll())
      if (types.has('performance')) tasks.push(this.fetchPerformance())
      if (types.has('honors')) tasks.push(this.fetchHonors())
      if (types.has('projects')) tasks.push(this.fetchProjects())
      if (types.has('business')) tasks.push(this.fetchBusinessModules())
      if (types.has('sites')) tasks.push(this.fetchSitesData())

      this.setData({
        hasProfiles: types.has('profiles'),
        showProfiles: types.has('profiles'),
        showBusiness: types.has('business'),
        showPerformance: types.has('performance'),
        showHonors: types.has('honors'),
        showProjects: types.has('projects'),
        showSites: types.has('sites'),
        profilesModuleName: moduleNames.profiles || '企业动态',
        businessModuleName: moduleNames.business || '核心业务',
        performanceModuleName: moduleNames.performance || '企业业绩',
        honorsModuleName: moduleNames.honors || '企业荣誉',
        projectsModuleName: moduleNames.projects || '企业项目',
        sitesModuleName: moduleNames.sites || '施工现场'
      })

      Promise.all(tasks).then(() => {
        console.timeEnd('isDataReady')
        this.setData({ isDataReady: true })
      })
    }).catch(() => {
      this.setData({ isDataReady: true })
    })
  },

  fetchBusinessModules() {
    return Promise.all([
      api.getBusinessModules().catch(() => []),
      api.getBusinessModulePageConfig().catch(() => ({ sections: [] }))
    ]).then(([modules, config]) => {
      const allModules = (modules || []).filter(m => m.status !== false).map(m => ({
        ...m,
        coverImage: api.staticUrl(m.coverImage)
      }))
      const configSections = (config.sections || [])
        .filter(sec => sec.status !== false)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))

      const heroSections = configSections.filter(sec => sec.displayLayout === 'hero')
      const businessHeroCards = heroSections.map(sec => {
        const mod = allModules.find(m => m.id === sec.selectedIds[0])
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
      sections.forEach(s => {
        if (s.displayLayout === 'grid') {
          console.log('[fetchBusinessModules] section', s.id, 'gridCols=', s.gridCols, 'gridClass=', s.gridClass)
        }
      })
      this.setData({ businessModules: allModules, businessSections: sections, businessHeroCards: businessHeroCards })
    }).catch(() => {})
  },

  fetchSitesData() {
    return api.getSites().then(sites => {
      const items = (sites || []).map(s => ({
        ...s,
        image: api.staticUrl(s.image)
      }))
      this.setData({ sitesList: items })
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
    const sections = this.data.sections.map(sec => {
      if (sec.id === sectionId) {
        return {
          ...sec,
          activeTab: tabIndex,
          currentTabCards: sec.tabs[tabIndex] ? sec.tabs[tabIndex].cards : []
        }
      }
      return sec
    })
    this.setData({ sections })
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
    this.setData({ currentVideo: { url: profile.cover.video, cover: profile.cover.backgroundImage } })
  },

  previewVideo(e) {
    const vid = e.currentTarget.dataset.video
    if (vid) {
      this.setData({ currentVideo: vid })
    }
  },

  closeVideo() {
    this.setData({ currentVideo: null })
  },

  onShareAppMessage() {
    return {
      title: '执行官组合 - 企业展示',
      path: '/pages/company/company'
    }
  }
})
