// 自定义底部导航栏
Component({
  properties: {
    active: {
      type: String,
      value: 'showcase'
    }
  },
  data: {
    tabs: [
      { key: 'showcase', text: '案例', icon: 'domain', pagePath: '/pages/company/company' },
      { key: 'partnership', text: '合作', icon: 'handshake', pagePath: '/pages/inquiry/inquiry' },
      { key: 'card', text: '名片', icon: 'contact_page', pagePath: '/pages/card/card' },
      { key: 'mine', text: '我的', icon: 'account_circle', pagePath: '/pages/mine/mine' }
    ]
  },
  methods: {
    switchTab(e) {
      const { path, key } = e.currentTarget.dataset
      if (key === this.properties.active) return
      wx.switchTab({ url: path })
    }
  }
})
