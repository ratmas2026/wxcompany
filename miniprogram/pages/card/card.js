const api = require('../../utils/api')

Page({
  data: {
    cardData: {},
    companyInfo: {},
    companyInfos: [],
    matchedCI: null,
    honors: [],
    projects: [],
    missionVideo: null,
    currentVideo: null
  },

  onLoad() {
    this.fetchData()
    this.fetchHonors()
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }
  },

  fetchHonors() {
    api.getHonors().then(honors => {
      this.setData({ honors: (honors || []).map(h => ({ image: api.staticUrl(h.image), name: h.name, desc: h.desc })) })
    }).catch(() => {})
  },

  fetchData() {
    Promise.all([
      api.getCards(),
      api.getCompanyInfos(),
      api.getProjects(),
      api.getVideos()
    ]).then(([cards, companyInfos, projects, videos]) => {
      const card = (cards || []).find(c => c.status === true) || (cards && cards[0]) || {}
      if (card.avatar) card.avatar = api.staticUrl(card.avatar)
      const missionVideo = (videos || []).find(v => v.category === 'mission' && v.status === 'published') || null
      if (missionVideo) {
        missionVideo.url = api.staticUrl(missionVideo.url)
        missionVideo.cover = api.staticUrl(missionVideo.cover)
      }
      // Match company_info by company name, or use first entry
      const infos = (companyInfos || []).filter(ci => ci.status !== false)
      const matched = card.company ? infos.find(ci => ci.name === card.company) || null : null
      const matchedCI = matched || (infos.length > 0 ? infos[0] : null)
      const fallbackCI = infos.length > 0 ? infos[0] : {}
      this.setData({
        cardData: card,
        companyInfo: fallbackCI,
        companyInfos: infos,
        matchedCI: matchedCI,
        projects: (projects || []).slice(0, 2).map(p => ({ ...p, image: api.staticUrl(p.image) })),
        missionVideo: missionVideo
      })
    }).catch(() => {})
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

  openMap() {
    const ci = this.data.matchedCI
    if (ci && ci.longitude && ci.latitude) {
      wx.openLocation({
        latitude: ci.latitude,
        longitude: ci.longitude,
        name: ci.name || '',
        address: ci.address || '',
        scale: 16
      })
    } else {
      wx.showToast({ title: '暂无定位信息', icon: 'none' })
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

  previewVideo() {
    const vid = this.data.missionVideo
    if (vid && vid.url) {
      this.setData({ currentVideo: vid })
    }
  },

  closeVideo() {
    this.setData({ currentVideo: null })
  },

  onShareAppMessage() {
    return {
      title: `${this.data.cardData.name || '企业名片'} - 企业名片`,
      path: '/pages/card/card'
    }
  }
})
