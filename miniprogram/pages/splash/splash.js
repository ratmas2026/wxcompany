const api = require('../../utils/api')

Page({
  data: {
    currentImage: '',
    skipTop: 80,
    skipLeft: 0,
    skipWidth: 87
  },

  onLoad() {
    // 获取右上角胶囊按钮位置，跳过按钮对齐其正下方
    const capsule = wx.getMenuButtonBoundingClientRect()
    if (capsule) {
      this.setData({
        skipTop: capsule.bottom + 8,      // 胶囊底部 + 间距
        skipLeft: capsule.left,            // 与胶囊左边缘对齐
        skipWidth: capsule.width           // 与胶囊同宽
      })
    }

    // 从后台图库随机选一张
    api.getSplashImages().then(images => {
      if (images && images.length) {
        const valid = images.filter(img => img.url && img.url.length > 0)
        if (valid.length) {
          const random = valid[Math.floor(Math.random() * valid.length)]
          this.setData({ currentImage: api.staticUrl(random.url) })
        }
      }
    }).catch(err => {
      console.warn('启动图加载失败，使用兜底背景', err)
    })
  },

  goHome() {
    wx.reLaunch({ url: '/pages/company/company' })
  }
})
