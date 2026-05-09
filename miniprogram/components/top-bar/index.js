Component({
  properties: {
    title: {
      type: String,
      value: ''
    },
    showBack: {
      type: Boolean,
      value: true
    },
    icon: {
      type: String,
      value: ''
    },
    titleAlign: {
      type: String,
      value: 'left'
    }
  },

  data: {
    statusBarHeight: 44
  },

  lifetimes: {
    attached() {
      const { statusBarHeight } = wx.getWindowInfo()
      this.setData({ statusBarHeight: statusBarHeight || 44 })
    }
  },

  methods: {
    onBack() {
      this.triggerEvent('back')
      wx.navigateBack()
    }
  }
})
