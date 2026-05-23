const api = require('../../utils/api')
const app = getApp()

Page({
  data: {
    cardData: {},
    companyInfo: {}
  },

  onLoad(options) {
    const cardId = options.cardId ? parseInt(options.cardId) : null
    const userPhone = (app.globalData.userInfo && app.globalData.userInfo.phone) || ''

    Promise.all([api.getCards(), api.getCompanyInfos()]).then(([cards, companyInfos]) => {
      let card
      if (cardId) {
        card = (cards || []).find(c => c.id === cardId) || {}
      } else {
        card = (cards || []).find(c => c.phone === userPhone && c.status === true) || {}
      }
      const fallbackCI = (companyInfos || []).find(ci => ci.status !== false) || {}
      this.setData({ cardData: card, companyInfo: fallbackCI })
    }).catch(() => {})
  },

  onBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
    } else {
      wx.switchTab({ url: '/pages/card/card' })
    }
  },

  onShareAppMessage() {
    return {
      title: `${this.data.cardData.name || '企业名片'}`,
      path: `/pages/card/card?cardId=${this.data.cardData.id}`
    }
  },

  onShareToGroup() {
    wx.showToast({ title: '请点击右上角菜单分享到群', icon: 'none' })
  },

  onShareToMoment() {
    wx.showToast({ title: '暂不支持直接分享到朋友圈', icon: 'none' })
  },

  onGeneratePoster() {
    wx.showLoading({ title: '生成海报中...' })
    setTimeout(() => {
      wx.hideLoading()
      wx.showToast({ title: '海报已生成，请保存', icon: 'success' })
    }, 1000)
  }
})
