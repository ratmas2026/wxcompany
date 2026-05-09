const api = require('../../utils/api')

Page({
  data: {
    cardData: {},
    companyInfo: {},
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
      api.getCompanyInfo(),
      api.getProjects(),
      api.getVideos()
    ]).then(([cards, info, projects, videos]) => {
      const card = (cards || []).find(c => c.status === true) || (cards && cards[0]) || {}
      if (card.avatar) card.avatar = api.staticUrl(card.avatar)
      const missionVideo = (videos || []).find(v => v.category === 'mission' && v.status === 'published') || null
      if (missionVideo) {
        missionVideo.url = api.staticUrl(missionVideo.url)
        missionVideo.cover = api.staticUrl(missionVideo.cover)
      }
      this.setData({
        cardData: card,
        companyInfo: info || {},
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
    wx.showToast({ title: '打开地图', icon: 'none' })
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
