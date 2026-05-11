const api = require('../../utils/api')

Page({
  data: {
    companyInfo: {}
  },

  onLoad() {
    api.getCompanyInfos().then(list => {
      const activeCI = (list || []).find(ci => ci.status !== false)
      const info = activeCI ? activeCI : {}
      this.setData({ companyInfo: info })
    }).catch(() => {})
  },

  onCallPhone() {
    const phone = this.data.companyInfo.phone || '4008888888'
    wx.makePhoneCall({ phoneNumber: phone })
  }
})
