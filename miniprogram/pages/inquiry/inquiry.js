const api = require('../../utils/api')

Page({
  data: {
    showSuccess: false,
    formName: '',
    formPhone: '',
    formCompany: '',
    formTitle: '',
    cooperationAreas: [
      { value: 'digital_design', label: '数字设计', checked: false },
      { value: 'smart_production', label: '智能生产', checked: false },
      { value: 'smart_construction', label: '智能施工', checked: false },
      { value: 'smart_om', label: '智能运维', checked: false }
    ]
  },

  onLoad() {
    const cache = wx.getStorageSync('inquiry_form')
    if (cache) {
      this.setData({
        formName: cache.name || '',
        formPhone: cache.phone || '',
        formCompany: cache.company || '',
        formTitle: cache.title || '',
        cooperationAreas: cache.cooperationAreas || this.data.cooperationAreas
      })
    }
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
  },

  onInput(e) {
    const { field } = e.currentTarget.dataset
    this.setData({ [field]: e.detail.value })
  },

  onSubmit(e) {
    const { name, phone, company, title } = e.detail.value

    if (!name || name.length < 2) {
      wx.showToast({ title: '请输入正确的姓名', icon: 'none' })
      return
    }
    if (!phone || !/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '请输入正确的11位手机号', icon: 'none' })
      return
    }
    if (!company || company.length < 2) {
      wx.showToast({ title: '请输入企业名称', icon: 'none' })
      return
    }

    const areas = this.data.cooperationAreas
      .filter(a => a.checked)
      .map(a => a.label)

    if (areas.length === 0) {
      wx.showToast({ title: '请至少选择一个合作方面', icon: 'none' })
      return
    }

    wx.setStorageSync('inquiry_form', {
      name, phone, company, title,
      cooperationAreas: this.data.cooperationAreas
    })

    wx.showLoading({ title: '提交中...' })
    api.submitInquiry({ name, phone, company, title, areas: areas.join(',') }).then(() => {
      wx.hideLoading()
      this.setData({ showSuccess: true })
      wx.removeStorageSync('inquiry_form')
    }).catch(() => {
      wx.hideLoading()
      wx.showToast({ title: '提交失败，请稍后重试', icon: 'none' })
    })
  },

  checkboxChange(e) {
    const values = e.detail.value
    const areas = this.data.cooperationAreas.map(a => ({
      ...a,
      checked: values.includes(a.value)
    }))
    this.setData({ cooperationAreas: areas })
  },

  closeSuccess() {
    this.setData({
      showSuccess: false,
      formName: '',
      formPhone: '',
      formCompany: '',
      formTitle: '',
      cooperationAreas: [
        { value: 'digital_design', label: '数字设计', checked: false },
        { value: 'smart_production', label: '智能生产', checked: false },
        { value: 'smart_construction', label: '智能施工', checked: false },
        { value: 'smart_om', label: '智能运维', checked: false }
      ]
    })
  }
})
