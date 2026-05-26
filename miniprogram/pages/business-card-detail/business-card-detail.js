const api = require('../../utils/api')

Page({
  data: {
    card: null,
    bodyNodes: '',
    bodyVideos: [],
    previewImages: [],
    currentVideo: null
  },

  onLoad(options) {
    if (options.moduleId && options.cardId) {
      this.fetchCardDetail(options.moduleId, options.cardId)
    }
  },

  processBodyHtml(html) {
    if (!html) return { cleanHtml: '', videos: [] }
    const isHtmlStr = /<[a-z][\s\S]*>/i.test(html)
    if (!isHtmlStr) {
      const paragraphs = html.split(/\n\n+/)
      const wrapped = paragraphs.map(p => {
        const trimmed = p.trim()
        if (!trimmed) return ''
        const linked = trimmed.replace(/(https?:\/\/[^\s<>]+)/g, '<a href="$1">$1</a>')
        return '<p>' + linked.split('\n').join('<br>') + '</p>'
      }).join('')
      return { cleanHtml: wrapped, videos: [] }
    }

    html = html.replace(/<img[^>]+src="([^"]+)"/gi, function(fullMatch, src) {
      if (src && !/^(https?:|data:|\/\/)/i.test(src)) {
        return fullMatch.replace(src, api.staticUrl(src))
      }
      return fullMatch
    })

    const videoRegex = /<div[^>]*class="[^"]*editor-video-card[^"]*"[^>]*data-platform="([^"]*)"[^>]*data-video-id="([^"]*)"[^>]*>[\s\S]*?<\/div>/gi
    const videos = []
    var match
    while ((match = videoRegex.exec(html)) !== null) {
      const platform = match[1]
      const videoId = match[2]
      var url = ''
      if (platform === 'bilibili') url = 'https://www.bilibili.com/video/' + videoId
      else if (platform === 'youtube') url = 'https://www.youtube.com/watch?v=' + videoId
      else url = videoId
      videos.push({ platform, videoId, url })
    }
    var cleanHtml = html.replace(videoRegex, '')

    var tagPlaceholders = []
    cleanHtml = cleanHtml.replace(/<[^>]+>/g, function(tag) {
      tagPlaceholders.push(tag)
      return '%%TAG_' + (tagPlaceholders.length - 1) + '%%'
    })
    cleanHtml = cleanHtml.replace(/(https?:\/\/[^\s<>]+)/g, '<a href="$1">$1</a>')
    cleanHtml = cleanHtml.replace(/%%TAG_(\d+)%%/g, function(_, idx) {
      return tagPlaceholders[parseInt(idx)] || ''
    })

    return { cleanHtml, videos }
  },

  fetchCardDetail(moduleId, cardId) {
    api.getBusinessModuleCard(moduleId, cardId).then(card => {
      if (!card) { wx.showToast({ title: '卡片不存在', icon: 'none' }); return }

      const detail = card.detail || {}
      detail.images = (detail.images || []).map(img => api.staticUrl(img, { w: 750 }))
      detail.video = api.staticUrl(detail.video)
      card.detail = detail

      const processed = this.processBodyHtml(detail.body || '')
      this.setData({
        card,
        previewImages: detail.images,
        bodyNodes: processed.cleanHtml,
        bodyVideos: processed.videos
      })
    }).catch(() => {
      wx.showToast({ title: '加载失败', icon: 'none' })
    })
  },

  onPreviewImage(e) {
    const url = e.currentTarget.dataset.url
    wx.previewImage({ urls: this.data.previewImages, current: url })
  },

  onPlayVideo() {
    const video = this.data.card ? this.data.card.detail.video : null
    if (video) {
      this.setData({ currentVideo: { url: video } })
    }
  },

  onOpenVideoUrl(e) {
    const url = e.currentTarget.dataset.url
    if (!url) return
    wx.setClipboardData({ data: url, success: () => { wx.showToast({ title: '视频链接已复制', icon: 'success' }) } })
  },

  closeVideo() {
    this.setData({ currentVideo: null })
  },

  onBack() {
    if (this.data.currentVideo) {
      this.closeVideo()
      return
    }
    wx.navigateBack()
  },

  onShareAppMessage() {
    return {
      title: this.data.card ? (this.data.card.detail.title || this.data.card.title || '卡片详情') : '卡片详情',
      path: '/pages/business-card-detail/business-card-detail?moduleId=' +
        (getCurrentPages().slice(-1)[0].options.moduleId || '') +
        '&cardId=' + (getCurrentPages().slice(-1)[0].options.cardId || '')
    }
  }
})
