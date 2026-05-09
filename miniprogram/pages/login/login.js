const { getUserByPhone } = require('../../utils/api')

Page({
  data: {
    countdown: 0
  },

  onUnload() {
    if (this._timer) clearInterval(this._timer)
  },

  onWechatLogin() {
    wx.showLoading({ title: '登录中...' })
    wx.login({
      success: (res) => {
        if (res.code) {
          setTimeout(() => {
            wx.hideLoading()
            this.saveLoginState({ nickName: '微信用户', phone: '' })
            wx.showToast({ title: '登录成功', icon: 'success' })
            this.navigateBack()
          }, 800)
        } else {
          wx.hideLoading()
          wx.showToast({ title: '登录失败，请重试', icon: 'none' })
        }
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({ title: '登录失败，请重试', icon: 'none' })
      }
    })
  },

  onSendCode() {
    if (this.data.countdown > 0) return

    // 默认验证码
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

    wx.showLoading({ title: '登录中...' })
    getUserByPhone(phone).then(user => {
      wx.hideLoading()
      this.saveLoginState(user)
      wx.showToast({ title: `${user.nickName}，欢迎回来`, icon: 'success' })
      this.navigateBack()
    }).catch(() => {
      wx.hideLoading()
      this.saveLoginState({ nickName: phone, phone })
      wx.showToast({ title: '登录成功', icon: 'success' })
      this.navigateBack()
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
