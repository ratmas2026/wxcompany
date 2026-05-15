Page({
  data: {},

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
      title: '企业名片',
      path: '/pages/card/card',
      imageUrl: '/images/hero-bg.jpg'
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
