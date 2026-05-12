const { getUserByPhone } = require('../../utils/api')

Page({
  data: {
    countdown: 0,
    agreed: false
  },

  onUnload() {
    if (this._timer) clearInterval(this._timer)
  },

  onToggleAgree() {
    this.setData({ agreed: !this.data.agreed })
  },

  onSendCode() {
    if (this.data.countdown > 0) return

    wx.showToast({ title: '验证码：123456', icon: 'none' })

    let countdown = 60
    this.setData({ countdown })
    this._timer = setInterval(() => {
      countdown--
      if (countdown <= 0) {
        clearInterval(this._timer)
        this.setData({ countdown: 0 })
      } else {
        this.setData({ countdown })
      }
    }, 1000)
  },

  onPhoneLogin(e) {
    const { phone, code } = e.detail.value

    if (!phone || !/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '请输入正确的11位手机号', icon: 'none' })
      return
    }
    if (!code) {
      wx.showToast({ title: '请输入验证码', icon: 'none' })
      return
    }
    if (code !== '123456') {
      wx.showToast({ title: '验证码错误', icon: 'none' })
      return
    }
    if (!this.data.agreed) {
      wx.showToast({ title: '请先阅读并同意用户协议和隐私政策', icon: 'none' })
      return
    }

    wx.showLoading({ title: '登录中...' })
    getUserByPhone(phone).then(user => {
      wx.hideLoading()
      if (!user) {
        wx.showToast({ title: '该手机号未注册', icon: 'none' })
        return
      }
      this.saveLoginState(user)
      wx.showToast({ title: `${user.nickName || phone}，欢迎回来`, icon: 'success' })
      this.navigateBack()
    }).catch(() => {
      wx.hideLoading()
      wx.showToast({ title: '该手机号未注册', icon: 'none' })
    })
  },

  saveLoginState(userInfo) {
    const app = getApp()
    app.globalData.isLogin = true
    app.globalData.userInfo = userInfo
    wx.setStorageSync('userInfo', userInfo)
  },

  onViewPrivacy() {
    wx.showToast({ title: '隐私政策页面', icon: 'none' })
  },

  onViewTerms() {
    wx.showToast({ title: '服务条款页面', icon: 'none' })
  },

  navigateBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
    } else {
      wx.switchTab({ url: '/pages/company/company' })
    }
  }
})
