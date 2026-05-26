const api = require('../../utils/api')

Page({
  data: {
    currentImage: 0,
    project: {},
    relatedProjects: []
  },

  onLoad(options) {
    if (options.id) {
      Promise.all([
        api.getProjectDetail(options.id),
        api.getProjects()
      ]).then(([project, projects]) => {
        wx.setNavigationBarTitle({ title: project.name || '项目详情' })
        if (project.image) project.image = api.staticUrl(project.image, { w: 320 })
        if (project.images) project.images = project.images.map(img => api.staticUrl(img, { w: 320 }))
        if (project.detailImages) project.detailImages = project.detailImages.map(img => api.staticUrl(img, { w: 750 }))
        this.setData({ project, relatedProjects: (projects || []).slice(0, 4) })
      }).catch(() => {})
    } else {
      api.getProjects().then(projects => {
        if (projects && projects.length > 0) {
          this.loadProject(projects[0])
        }
      }).catch(() => {})
    }
  },

  loadProject(project) {
    wx.setNavigationBarTitle({ title: project.name || '项目详情' })
    if (project.image) project.image = api.staticUrl(project.image, { w: 320 })
    if (project.images) project.images = project.images.map(img => api.staticUrl(img, { w: 320 }))
    if (project.detailImages) project.detailImages = project.detailImages.map(img => api.staticUrl(img, { w: 750 }))
    this.setData({ project })
    this.loadRelated()
  },

  loadRelated() {
    api.getProjects().then(projects => {
      this.setData({ relatedProjects: (projects || []).slice(0, 4) })
    }).catch(() => {})
  },

  onSwiperChange(e) {
    this.setData({ currentImage: e.detail.current })
  },

  onBack() {
    wx.navigateBack()
  },

  onOpenProject(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/project/project?id=${id}` })
  }
})
