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

    // 本地兜底图片
    const localImages = [
      '/images/splash-1.jpg',
      '/images/splash-2.jpg',
      '/images/splash-3.jpg'
    ]

    const pickLocalFallback = () => {
      const random = localImages[Math.floor(Math.random() * localImages.length)]
      this.setData({ currentImage: random })
    }

    // 首帧立即加载本地兜底图，避免蓝底"企业展示"文字闪现
    pickLocalFallback()

    // 异步获取后台图库，有则替换为服务器图片
    api.getSplashImages().then(images => {
      if (images && images.length) {
        const valid = images.filter(img => img.url && img.url.length > 0)
        if (valid.length) {
          const random = valid[Math.floor(Math.random() * valid.length)]
          this.setData({ currentImage: api.staticUrl(random.url, { w: 750 }) })
        }
      }
    }).catch(err => {
      console.warn('启动图加载失败，继续使用本地兜底', err)
    })
  },

  goHome() {
    const app = getApp()
    if (app.globalData.isLogin) {
      wx.reLaunch({ url: '/pages/company/company' })
    } else {
      wx.reLaunch({ url: '/pages/login/login' })
    }
  }
})
