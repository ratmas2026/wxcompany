const api = require('../../utils/api')

Page({
  data: {
    profile: null,
    currentVideo: null,
    previewImages: [],
    bodyNodes: '',
    bodyVideos: []
  },

  onLoad(options) {
    if (options.id) {
      this.fetchProfile(options.id)
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

    // Step 1: Convert relative image src to absolute URLs
    html = html.replace(/<img[^>]+src="([^"]+)"/gi, function(fullMatch, src) {
      if (src && !/^(https?:|data:|\/\/)/i.test(src)) {
        return fullMatch.replace(src, api.staticUrl(src))
      }
      return fullMatch
    })

    // Step 2: Extract video embed cards (before URL linking to avoid interference)
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

    // Step 3: Convert plain text URLs to <a> links
    // Protect ALL HTML tags with placeholders, then linkify remaining text,
    // then restore tags. This avoids lookbehind (not supported in mini program JS).
    var tagPlaceholders = []
    cleanHtml = cleanHtml.replace(/<[^>]+>/g, function(tag) {
      tagPlaceholders.push(tag)
      return '%%TAG_' + (tagPlaceholders.length - 1) + '%%'
    })

    // Now all remaining text is outside HTML tags — safe to linkify URLs
    cleanHtml = cleanHtml.replace(/(https?:\/\/[^\s<>]+)/g, '<a href="$1">$1</a>')

    // Restore all original HTML tags
    cleanHtml = cleanHtml.replace(/%%TAG_(\d+)%%/g, function(_, idx) {
      return tagPlaceholders[parseInt(idx)] || ''
    })

    return { cleanHtml, videos }
  },

  fetchProfile(id) {
    api.getCompanyPerformanceDetail(id).then(profile => {
      if (!profile || !profile.detail) {
        wx.showToast({ title: '暂无详情', icon: 'none' })
        return
      }
      const detail = profile.detail
      detail.images = (detail.images || []).map(img => api.staticUrl(img, { w: 750 }))
      detail.video = api.staticUrl(detail.video)
      const processed = this.processBodyHtml(detail.body || '')
      this.setData({
        profile, previewImages: detail.images,
        bodyNodes: processed.cleanHtml, bodyVideos: processed.videos
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
    const video = this.data.profile.detail.video
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
      title: this.data.profile ? (this.data.profile.detail.title || '企业详情') : '企业详情',
      path: '/pages/company-detail-performance/company-detail-performance?id=' + (this.data.profile ? this.data.profile.id : '')
    }
  }
})
