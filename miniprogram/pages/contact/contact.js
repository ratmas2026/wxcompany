const api = require('../../utils/api')

Page({
  data: {
    companyInfo: {}
  },

  onLoad() {
    api.getCompanyInfo().then(info => {
      this.setData({ companyInfo: info || {} })
    }).catch(() => {})
  },

  onCallPhone() {
    const phone = this.data.companyInfo.phone || '4008888888'
    wx.makePhoneCall({ phoneNumber: phone })
  }
})
