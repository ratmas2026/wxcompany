const api = require('../../utils/api')
const app = getApp()

Page({
  data: {
    isLoggedIn: false,
    userInfo: {},
    stats: {
      cards: 0,
      inquiries: 0,
      collections: 0
    },
    menuGroup1: [
      { key: 'myCards', icon: '💳', title: '我的名片', desc: '管理个人企业名片' },
      { key: 'myInquiries', icon: '📋', title: '咨询记录', desc: '查看历史合作咨询' },
      { key: 'myCollections', icon: '⭐', title: '我的收藏', desc: '收藏的项目与案例' }
    ],
    menuGroup2: [
      { key: 'settings', icon: '⚙️', title: '设置' }
    ]
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 })
    }
    if (!getApp().globalData.isLogin) {
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }
    this.checkLoginState()
    this.fetchStats()
  },

  checkLoginState() {
    const { globalData } = getApp()
    if (globalData.isLogin && globalData.userInfo) {
      const userInfo = { ...globalData.userInfo }
      if (userInfo.avatar) {
        userInfo.avatar = api.staticUrl(userInfo.avatar)
      }
      this.setData({
        isLoggedIn: true,
        userInfo: userInfo
      })
      // 从后端拉取最新用户数据（名片信息）
      this.fetchUserProfile()
    }
  },

  fetchUserProfile() {
    const { globalData } = getApp()
    const phone = globalData.userInfo && globalData.userInfo.phone
    if (!phone) return
    api.getUserByPhone(phone).then(user => {
      if (user.avatar) user.avatar = api.staticUrl(user.avatar)
      const newInfo = { ...globalData.userInfo, ...user }
      this.setData({ userInfo: newInfo })
      // 同步回 globalData
      const app = getApp()
      app.globalData.userInfo = newInfo
    }).catch(() => {})
  },

  fetchStats() {
    Promise.all([
      api.getCards().catch(() => []),
      api.getProjects().catch(() => []),
      api.getHonors().catch(() => [])
    ]).then(([cards, projects, honors]) => {
      this.setData({
        stats: {
          cards: (cards || []).length,
          inquiries: (projects || []).length,
          collections: (honors || []).length
        }
      })
    }).catch(() => {})
  },

  onGoLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
  },

  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          const app = getApp()
          app.globalData.isLogin = false
          app.globalData.userInfo = null
          wx.removeStorageSync('userInfo')
          this.setData({
            isLoggedIn: false,
            userInfo: {},
            stats: { cards: 0, inquiries: 0, collections: 0 }
          })
          wx.showToast({ title: '已退出', icon: 'none' })
        }
      }
    })
  },

  onMenuTap(e) {
    const { key } = e.currentTarget.dataset
    const tabPages = ['myCards', 'myInquiries', 'myCollections']
    const routeMap = {
      myCards: '/pages/card/card',
      myInquiries: '/pages/inquiry/inquiry',
      myCollections: '/pages/company/company',
      settings: null
    }

    if (routeMap[key]) {
      if (tabPages.includes(key)) {
        wx.switchTab({ url: routeMap[key] })
      } else {
        wx.navigateTo({ url: routeMap[key] })
      }
    } else {
      wx.showToast({ title: '功能开发中', icon: 'none' })
    }
  }
})
