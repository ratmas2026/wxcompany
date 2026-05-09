const api = require('../../utils/api')

Page({
  data: {
    activeTab: 'digital_design',
    tabs: [],
    tabData: {},
    currentTab: { advantages: [], process: [], pricing: [] }
  },

  onLoad() {
    api.getBusiness().then(business => {
      const tabs = (business || []).map(b => ({ value: b.id, label: b.name, icon: b.icon }))
      const tabData = {}
      ;(business || []).forEach(b => { tabData[b.id] = b })
      this.setData({ tabs, tabData }, () => {
        this.updateCurrentTab()
      })
    }).catch(() => {})
  },

  onSwitchTab(e) {
    const { tab } = e.currentTarget.dataset
    this.setData({ activeTab: tab }, () => {
      this.updateCurrentTab()
    })
  },

  updateCurrentTab() {
    const currentTab = this.data.tabData[this.data.activeTab]
    this.setData({ currentTab })
  },

  onInquire(e) {
    wx.switchTab({ url: '/pages/inquiry/inquiry' })
  }
})
