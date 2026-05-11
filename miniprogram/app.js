App({
  globalData: {
    userInfo: null,
    isLogin: false,
    apiBase: 'https://api.example.com'
  },

  onLaunch() {
    // 检查登录状态
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.globalData.userInfo = userInfo
      this.globalData.isLogin = true
    }
  },

  checkLogin() {
    return new Promise((resolve, reject) => {
      if (this.globalData.isLogin) {
        resolve(true)
      } else {
        wx.navigateTo({ url: '/pages/login/login' })
        reject(false)
      }
    })
  }
})
