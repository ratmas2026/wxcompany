const { getUserByPhone } = require('../../utils/api')

Page({
  data: {
    countdown: 0,
    agreed: false,
    phone: '',
    sendingCode: false,
    loggingIn: false,
    autoFocus: false,
    inputFocused: { phone: false, code: false }
  },

  onReady() {
    // 延迟聚焦，确保页面渲染完成
    setTimeout(() => this.setData({ autoFocus: true }), 300)
  },

  onUnload() {
    if (this._timer) clearInterval(this._timer)
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value })
  },

  onInputFocus(e) {
    const field = e.currentTarget.dataset.field
    if (field) this.setData({ ['inputFocused.' + field]: true })
  },

  onInputBlur(e) {
    const field = e.currentTarget.dataset.field
    if (field) this.setData({ ['inputFocused.' + field]: false })
  },

  onToggleAgree() {
    this.setData({ agreed: !this.data.agreed })
  },

  onSendCode() {
    const phone = this._getPhone()
    if (!phone) return

    if (this.data.countdown > 0 || this.data.sendingCode) return

    this.setData({ sendingCode: true })
    this._startCountdown()
    wx.showLoading({ title: '发送中...' })
    wx.request({
      url: this._apiBase() + '/sms/send',
      method: 'POST',
      data: { phone },
      timeout: 15000,
      success: (res) => {
        wx.hideLoading()
        if (res.data && res.data.ok) {
          wx.showToast({ title: '验证码已发送', icon: 'success' })
        } else {
          this._resetCountdown()
          wx.showToast({ title: (res.data && res.data.error) || '发送失败', icon: 'none' })
        }
      },
      fail: () => {
        wx.hideLoading()
        this._resetCountdown()
        wx.showToast({ title: '网络错误，请重试', icon: 'none' })
      },
      complete: () => {
        this.setData({ sendingCode: false })
      }
    })
  },

  onPhoneLogin(e) {
    const { phone, code } = e.detail.value

    if (!phone || !/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '请输入正确的11位手机号', icon: 'none' })
      return
    }
    if (!code || code.length !== 6) {
      wx.showToast({ title: '请输入6位验证码', icon: 'none' })
      return
    }
    if (!this.data.agreed) {
      wx.showToast({ title: '请先阅读并同意用户协议和隐私政策', icon: 'none' })
      return
    }

    if (this.data.loggingIn) return
    this.setData({ loggingIn: true })
    wx.showLoading({ title: '登录中...' })
    wx.request({
      url: this._apiBase() + '/login',
      method: 'POST',
      data: { phone, code },
      timeout: 15000,
      success: (res) => {
        wx.hideLoading()
        if (!res.data || !res.data.ok) {
          wx.showToast({ title: (res.data && res.data.error) || '登录失败', icon: 'none' })
          return
        }
        const user = res.data.user
        if (!user) {
          wx.showToast({ title: '该手机号未注册', icon: 'none' })
          return
        }
        this.saveLoginState(user)
        wx.showToast({ title: `${user.nickName || phone}，欢迎回来`, icon: 'success' })
        setTimeout(() => this.navigateBack(), 800)
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({ title: '网络错误，请重试', icon: 'none' })
      },
      complete: () => {
        this.setData({ loggingIn: false })
      }
    })
  },

  _getPhone() {
    const phone = this.data.phone
    if (!phone || !/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '请先输入正确的手机号', icon: 'none' })
      return null
    }
    return phone
  },

  _apiBase() {
    const config = require('../../utils/config.js')
    return config.BASE_URL
  },

  _startCountdown() {
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

  _resetCountdown() {
    if (this._timer) clearInterval(this._timer)
    this.setData({ countdown: 0 })
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
