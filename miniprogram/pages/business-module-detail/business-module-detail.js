const api = require('../../utils/api')
const { FONT_SIZE_MAP, parseGridLayout } = require('../../utils/layout')

Page({
  data: {
    moduleName: '',
    heroCard: null,
    sections: [],
    currentVideo: null
  },

  onLoad(options) {
    if (options.moduleId) {
      this.fetchModuleDetail(options.moduleId)
    }
  },

  fetchModuleDetail(moduleId) {
    api.getBusinessModuleDetail(moduleId).then(mod => {
      if (!mod) { wx.showToast({ title: '模块不存在', icon: 'none' }); return }
      this.setData({ moduleName: mod.name || '' })

      const allCards = (mod.cards || []).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map(card => {
        if (typeof card.cover === 'string') {
          try { card.cover = JSON.parse(card.cover) } catch (e) { card.cover = { backgroundImage: '', video: '', zones: {} } }
        }
        if (typeof card.detail === 'string') {
          try { card.detail = JSON.parse(card.detail) } catch (e) { card.detail = { title: '', body: '', images: [], video: '', detailEntry: true } }
        }
        if (card.cover) {
          const zones = card.cover.zones || {}
          card.cover.zones = {
            top: { textBoxes: (zones.top && zones.top.textBoxes) || [] },
            middle: { textBoxes: (zones.middle && zones.middle.textBoxes) || [] },
            bottom: { textBoxes: (zones.bottom && zones.bottom.textBoxes) || [] }
          }
          card.cover.backgroundImage = api.staticUrl(card.cover.backgroundImage)
          card.cover.video = api.staticUrl(card.cover.video)
        }
        if (card.detail) {
          card.detail.images = (card.detail.images || []).map(img => api.staticUrl(img))
          card.detail.video = api.staticUrl(card.detail.video)
        }
        if (card.cover && card.cover.zones) {
          Object.keys(card.cover.zones).forEach(zoneKey => {
            card.cover.zones[zoneKey].textBoxes = (card.cover.zones[zoneKey].textBoxes || []).map(tb => {
              const result = { ...tb, fontSizeRpx: FONT_SIZE_MAP[tb.fontSize] || '32rpx' }
              if (result.role && result.role.avatar) {
                result.role = { ...result.role, avatar: api.staticUrl(result.role.avatar) }
              }
              return result
            })
          })
        }
        if (card.cover && card.cover.body) {
          card.cover.body = card.cover.body.replace(/<img[^>]+src="([^"]+)"/gi, function(fullMatch, src) {
            if (src && !/^(https?:|data:|\/\/)/i.test(src)) {
              return fullMatch.replace(src, api.staticUrl(src))
            }
            return fullMatch
          })
          card.cover.body = card.cover.body.replace(/style="text-align:\s*center;?"/gi, 'style="text-align:left"')
        }
        return card
      })

      const sections = (mod.sections || [])
        .filter(sec => sec.status !== false)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))

      const heroSection = sections.find(sec => sec.displayLayout === 'hero')
      const heroCard = heroSection
        ? allCards.find(c => c.id === (heroSection.selectedIds || [])[0]) || null
        : null
      if (heroCard) {
        const is43 = heroCard.cover && heroCard.cover.aspectRatio === '4:3'
        heroCard._height = is43 ? 515 : 386
      }

      const sectionData = sections
        .filter(sec => sec.displayLayout !== 'hero')
        .map(sec => {
          const parsed = parseGridLayout(sec.displayLayout)
          const cards = (sec.selectedIds || [])
            .map(id => allCards.find(c => c.id === id))
            .filter(Boolean)
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
          if (sec.displayLayout === 'tab') {
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
          console.log('[fetchModuleDetail] section', s.id, 'gridCols=', s.gridCols, 'gridClass=', s.gridClass)
        }
      })
      this.setData({ heroCard, sections: sectionData })
    }).catch(() => {
      wx.showToast({ title: '加载失败', icon: 'none' })
    })
  },

  onCardTap(e) {
    const card = e.currentTarget.dataset.card
    if (!card) return
    if (!card.detail || !card.detail.detailEntry) return
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1]
    const moduleId = currentPage.options.moduleId
    wx.navigateTo({ url: '/pages/business-card-detail/business-card-detail?moduleId=' + moduleId + '&cardId=' + card.id })
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

  onCoverVideoTap(e) {
    const card = e.currentTarget.dataset.card
    if (!card || !card.cover || !card.cover.video) return
    this.setData({ currentVideo: { url: card.cover.video, cover: card.cover.backgroundImage } })
  },

  closeVideo() {
    this.setData({ currentVideo: null })
  },

  onShareAppMessage() {
    return {
      title: this.data.moduleName || '业务模块',
      path: '/pages/business-module-detail/business-module-detail?moduleId=' + (getCurrentPages().slice(-1)[0].options.moduleId || '')
    }
  }
})
