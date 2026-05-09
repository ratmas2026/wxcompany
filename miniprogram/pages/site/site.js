const api = require('../../utils/api')

Page({
  data: {
    activeFilter: 'all',
    filters: [
      { value: 'all', label: '全部' },
      { value: 'foundation', label: '基础施工' },
      { value: 'structure', label: '主体结构' },
      { value: 'decoration', label: '装饰装修' },
      { value: 'complete', label: '竣工交付' }
    ],
    sites: [],
    filteredSites: [],
    allImageUrls: []
  },

  onLoad() {
    api.getSites().then(sites => {
      const items = (sites || []).map(s => ({ ...s, image: api.staticUrl(s.image) }))
      this.setData({ sites: items }, () => {
        this.applyFilter()
      })
    }).catch(() => {
      this.applyFilter()
    })
  },

  onFilter(e) {
    const { filter } = e.currentTarget.dataset
    this.setData({ activeFilter: filter }, () => {
      this.applyFilter()
    })
  },

  applyFilter() {
    const { sites, activeFilter } = this.data
    const filteredSites = activeFilter === 'all'
      ? sites
      : sites.filter(s => s.stageValue === activeFilter)

    const allImageUrls = filteredSites.map(s => api.staticUrl(s.image))

    this.setData({ filteredSites, allImageUrls })
  },

  onPreviewImage(e) {
    const { index } = e.currentTarget.dataset
    wx.previewImage({
      urls: this.data.allImageUrls,
      current: this.data.allImageUrls[index]
    })
  },

  onLoadMore() {
    wx.showToast({ title: '加载更多施工现场', icon: 'none' })
  }
})
