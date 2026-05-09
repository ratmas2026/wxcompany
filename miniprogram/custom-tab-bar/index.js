Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/company/company', text: '案例' },
      { pagePath: '/pages/inquiry/inquiry', text: '合作' },
      { pagePath: '/pages/card/card', text: '名片' },
      { pagePath: '/pages/mine/mine', text: '我的' }
    ]
  },

  methods: {
    switchTab(e) {
      const { path, index } = e.currentTarget.dataset
      wx.switchTab({ url: path })
    }
  }
})
