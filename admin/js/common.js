// Common Admin Framework
const Admin = {
  currentPage: '',
  currentUser: null,
  unreadCount: 0,

  init(page) {
    if (!sessionStorage.getItem('admin_token')) {
      window.location.href = 'login.html'
      return
    }
    this.currentPage = page
    this.injectLayout()
    this.setActiveNav(page)
    this.bindSearch()
    this.loadUserInfo()
    this.fetchUnreadCount()
    if (!this._dropdownBound) {
      this._dropdownBound = true
      document.addEventListener('click', function(e) {
        var dd = document.getElementById('userDropdown')
        var np = document.getElementById('notifyPanel')
        var user = document.getElementById('topbarUser')
        var bell = document.getElementById('notifyBell')
        if (dd && dd.classList.contains('show') && (!user || !user.contains(e.target))) {
          dd.classList.remove('show')
        }
        if (np && np.classList.contains('show') && (!bell || !bell.contains(e.target))) {
          np.classList.remove('show')
        }
      })
    }
  },

  injectLayout() {
    const app = document.getElementById('app')
    if (!app) return

    app.innerHTML = `
      <div class="app-layout">
        ${this.sidebarHTML()}
        <div class="main-content">
          ${this.topbarHTML()}
          <div class="page-content" id="pageContent"></div>
        </div>
      </div>
      <div id="modalContainer"></div>
      <div id="toastContainer"></div>
    `
  },

  sidebarHTML() {
    const navItems = [
      { page: 'company-info', icon: '&#x1F3F7;', label: '企业信息' },
      { page: 'index', icon: '&#x1F4C7;', label: '名片管理' },
      { page: 'position', icon: '&#x1F4CB;', label: '职位管理' },
      { page: 'splash', icon: '&#x1F3A8;', label: '启动页' },
      { page: 'company-profile', icon: '&#x1F3E2;', label: '企业动态' },
      { page: 'company-performance', icon: '&#x1F4CA;', label: '公司业绩' },
      { page: 'business-module', icon: '&#x1F4E6;', label: '核心业务' },
      { page: 'honors', icon: '&#x1F3C6;', label: '企业荣誉' },
      { page: 'projects', icon: '&#x1F3D7;', label: '企业项目' },

      { page: 'display-custom', icon: '&#x1F39B;', label: '展示自定义' },
      { page: 'message', icon: '&#x1F4E9;', label: '留言管理' }
    ]

    const links = navItems.map(item => `
      <a href="${item.page}.html" class="nav-item" data-page="${item.page}">
        <span class="nav-icon">${item.icon}</span>
        <span>${item.label}</span>
      </a>
    `).join('')

    return `
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-brand">
          <h2>Admin Panel</h2>
          <span>Enterprise Suite</span>
        </div>
        <nav class="sidebar-nav">${links}</nav>
      </aside>
    `
  },

  topbarHTML() {
    const avatar = (this.currentUser && this.currentUser.avatar)
      ? `<img src="${this.currentUser.avatar}" class="topbar-avatar-img" alt="">`
      : (this.currentUser ? (this.currentUser.nickName || 'A')[0] : 'A')
    const name = (this.currentUser && this.currentUser.nickName) || 'Admin'
    const avatarTag = (this.currentUser && this.currentUser.avatar)
      ? avatar
      : `<div class="topbar-avatar">${avatar}</div>`

    return `
      <header class="topbar">
        <div class="topbar-search">
          <span>&#x1F50D;</span>
          <input type="text" id="globalSearch" placeholder="全局搜索...">
        </div>
        <div class="topbar-right">
          <div class="notify-wrap" id="notifyBell" onclick="Admin.toggleNotify(event)">
            <span class="notify-icon">&#x1F514;</span>
            <span class="notify-badge" id="notifyBadge" style="display:${this.unreadCount > 0 ? '' : 'none'}">${this.unreadCount > 99 ? '99+' : this.unreadCount}</span>
            <div class="notify-panel" id="notifyPanel">
              <div class="notify-panel-header">
                <span>消息通知</span>
                <span class="notify-mark-all" onclick="Admin.markAllRead();event.stopPropagation()">全部已读</span>
              </div>
              <div class="notify-list" id="notifyList">
                <div class="notify-empty">加载中...</div>
              </div>
            </div>
          </div>
          <div class="topbar-user" id="topbarUser" onclick="Admin.toggleUserMenu(event)">
            ${avatarTag}
            <span class="topbar-name">${name}</span>
            <span class="topbar-arrow">&#x25BC;</span>
            <div class="user-dropdown" id="userDropdown">
              <a class="user-dropdown-item" href="profile.html"><span class="dropdown-icon">&#x1F464;</span>个人中心</a>
              <a class="user-dropdown-item" href="settings.html"><span class="dropdown-icon">&#x2699;</span>账号设置</a>
              <div class="user-dropdown-divider"></div>
              <div class="user-dropdown-item user-dropdown-item--danger" onclick="Admin.logout();event.stopPropagation()"><span class="dropdown-icon">&#x1F6AA;</span>退出登录</div>
            </div>
          </div>
        </div>
      </header>
    `
  },

  setActiveNav(page) {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page)
    })
  },

  bindSearch() {
    const input = document.getElementById('globalSearch')
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && typeof window.onGlobalSearch === 'function') {
          window.onGlobalSearch(input.value)
        }
      })
    }
  },

  // Page content helpers
  getPageContent() {
    return document.getElementById('pageContent')
  },

  setPageContent(html) {
    const el = document.getElementById('pageContent')
    if (el) el.innerHTML = html
  },

  // Modal
  showModal(title, bodyHTML, onConfirm, confirmText = '确定', danger = false) {
    const container = document.getElementById('modalContainer')
    if (!container) return

    container.innerHTML = `
      <div class="modal-overlay" id="modalOverlay">
        <div class="modal">
          <h3>${title}</h3>
          <div>${bodyHTML}</div>
          <div class="modal-actions">
            <button class="btn btn-secondary" id="modalCancel">取消</button>
            <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="modalConfirm">${confirmText}</button>
          </div>
        </div>
      </div>
    `

    document.getElementById('modalCancel').addEventListener('click', () => this.closeModal())
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.closeModal()
    })
    document.getElementById('modalConfirm').addEventListener('click', async () => {
      if (onConfirm) {
        try {
          await onConfirm()
        } catch (e) {
          console.error('Modal confirm error:', e)
          Admin.showToast('操作失败: ' + (e.message || '未知错误'), 'error')
        }
      }
      this.closeModal()
    })
  },

  closeModal() {
    const container = document.getElementById('modalContainer')
    if (container) container.innerHTML = ''
  },

  // Toast
  showToast(msg, type = 'info') {
    const container = document.getElementById('toastContainer')
    if (!container) return

    const toast = document.createElement('div')
    toast.className = `toast toast-${type}`
    toast.textContent = msg
    container.appendChild(toast)

    setTimeout(() => {
      toast.style.opacity = '0'
      toast.style.transition = 'opacity 0.3s'
      setTimeout(() => toast.remove(), 300)
    }, 2500)
  },

  // Pagination
  renderPagination(total, page, pageSize, onChange) {
    const totalPages = Math.ceil(total / pageSize)
    if (totalPages <= 1) return ''

    let btnsHTML = ''
    for (let i = 1; i <= totalPages; i++) {
      btnsHTML += `<button class="page-btn ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`
    }

    const start = (page - 1) * pageSize + 1
    const end = Math.min(page * pageSize, total)

    // Wrap in a container so we can bind events
    const id = 'pagination-' + Date.now()
    setTimeout(() => {
      const el = document.getElementById(id)
      if (el) {
        el.querySelectorAll('.page-btn').forEach(btn => {
          btn.addEventListener('click', () => onChange(parseInt(btn.dataset.page)))
        })
      }
    }, 0)

    return `
      <div class="pagination">
        <span>显示 ${start}-${end}，共 ${total} 条</span>
        <div class="pagination-btns" id="${id}">${btnsHTML}</div>
      </div>
    `
  },

  // Status label
  statusLabel(status) {
    const map = {
      'new': '<span class="badge badge-info">新咨询</span>',
      'contacted': '<span class="badge badge-warning">已联系</span>',
      'converted': '<span class="badge badge-success">已转化</span>',
      'invalid': '<span class="badge badge-danger">无效</span>'
    }
    return map[status] || `<span class="badge badge-neutral">${status}</span>`
  },

  // Confirm delete
  confirmDelete(msg, onConfirm) {
    this.showModal('确认删除', `<p>${msg || '确定要删除选中项吗？此操作不可恢复。'}</p>`, onConfirm, '删除', true)
  },

  // Export CSV helper
  exportCSV(data, filename) {
    if (!data.length) return
    const headers = Object.keys(data[0])
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${(row[h] ?? '')}"`).join(','))
    ].join('\n')

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.csv`
    a.click()
    URL.revokeObjectURL(url)
  },

  logout() {
    this.track('logout')
    sessionStorage.removeItem('admin_token')
    sessionStorage.removeItem('admin_user')
    window.location.href = 'login.html'
  },

  toggleUserMenu(e) {
    e && e.stopPropagation && e.stopPropagation()
    const dd = document.getElementById('userDropdown')
    const np = document.getElementById('notifyPanel')
    if (np) np.classList.remove('show')
    if (dd) dd.classList.toggle('show')
  },

  // --- Notification ---
  toggleNotify(e) {
    e.stopPropagation()
    const np = document.getElementById('notifyPanel')
    const dd = document.getElementById('userDropdown')
    if (dd) dd.classList.remove('show')
    if (np) {
      const opening = !np.classList.contains('show')
      np.classList.toggle('show')
      if (opening) {
        this.track('notify_open')
        this._loadNotifyList()
      }
    }
  },

  async _loadNotifyList() {
    const list = document.getElementById('notifyList')
    if (!list) return
    list.innerHTML = '<div class="skeleton-item"><div class="skeleton skeleton-avatar"></div><div class="skeleton-body"><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line"></div></div></div><div class="skeleton-item"><div class="skeleton skeleton-avatar"></div><div class="skeleton-body"><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line"></div></div></div><div class="skeleton-item"><div class="skeleton skeleton-avatar"></div><div class="skeleton-body"><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line"></div></div></div>'
    try {
      const res = await authFetch(API_BASE + '/notifications?limit=5')
      if (!res.ok) throw new Error('HTTP ' + res.status)
      const data = await res.json()
      const items = (data && data.list) || []
      if (items.length === 0) {
        list.innerHTML = '<div class="notify-empty">暂无新通知</div>'
        return
      }
      list.innerHTML = items.map(item => `
        <div class="notify-item ${item.isRead ? '' : 'notify-item--unread'}" onclick="Admin.markRead(${item.id}, event)">
          <div class="notify-item-icon">${this._notifyIcon(item.type)}</div>
          <div class="notify-item-body">
            <div class="notify-item-title">${this._escapeHTML(item.title)}</div>
            <div class="notify-item-time">${this._timeAgo(item.createdAt)}</div>
          </div>
          ${item.isRead ? '' : '<span class="notify-dot"></span>'}
        </div>
      `).join('')
    } catch (e) {
      list.innerHTML = '<div class="notify-empty">加载失败</div>'
    }
  },

  async markRead(id, e) {
    e && e.stopPropagation()
    // Optimistic update
    if (this.unreadCount > 0) {
      this.unreadCount--
      this.updateBadge()
    }
    try {
      await authFetch(API_BASE + '/notifications/' + id + '/read', { method: 'PUT' })
    } catch (e) { /* silent */ }
    this._loadNotifyList()
  },

  async markAllRead() {
    this.unreadCount = 0
    this.updateBadge()
    try {
      await authFetch(API_BASE + '/notifications/read-all', { method: 'PUT' })
    } catch (e) { /* silent */ }
    this._loadNotifyList()
  },

  async fetchUnreadCount() {
    try {
      const res = await authFetch(API_BASE + '/notifications/unread-count')
      if (res.ok) {
        const data = await res.json()
        if (data && typeof data.count === 'number') {
          this.unreadCount = data.count
          this.updateBadge()
        }
      }
    } catch (e) { /* silent */ }
  },

  updateBadge() {
    const badge = document.getElementById('notifyBadge')
    if (!badge) return
    if (this.unreadCount <= 0) {
      badge.style.display = 'none'
    } else {
      badge.style.display = ''
      badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount
    }
  },

  // --- User info ---
  async loadUserInfo() {
    const cached = sessionStorage.getItem('admin_user')
    if (cached) {
      try { this.currentUser = JSON.parse(cached) } catch (e) { /* ignore */ }
    }
    try {
      const res = await authFetch(API_BASE + '/user/profile')
      if (res.ok) {
        const data = await res.json()
        if (data && data.ok && data.user) {
          this.currentUser = data.user
          sessionStorage.setItem('admin_user', JSON.stringify(data.user))
        }
      }
    } catch (e) { /* silent */ }
  },

  // --- Analytics ---
  track(eventName, data) {
    try {
      const payload = JSON.stringify({ event: eventName, data: data || {}, ts: Date.now(), page: this.currentPage })
      if (navigator.sendBeacon) {
        navigator.sendBeacon(API_BASE + '/analytics', payload)
      } else {
        authFetch(API_BASE + '/analytics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload }).catch(() => {})
      }
    } catch (e) { /* silent */ }
  },

  // --- Helpers ---
  _notifyIcon(type) {
    const map = { system: '&#x2699;', message: '&#x1F4AC;', alert: '&#x26A0;' }
    return map[type] || '&#x1F514;'
  },

  _timeAgo(iso) {
    if (!iso) return ''
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return '刚刚'
    if (mins < 60) return mins + '分钟前'
    const hours = Math.floor(mins / 60)
    if (hours < 24) return hours + '小时前'
    return Math.floor(hours / 24) + '天前'
  },

  _escapeHTML(str) {
    if (!str) return ''
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }
}
