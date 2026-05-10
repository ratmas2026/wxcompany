// Common Admin Framework
const Admin = {
  currentPage: '',

  init(page) {
    this.currentPage = page
    this.injectLayout()
    this.setActiveNav(page)
    this.bindSearch()
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
      { page: 'index', icon: '&#x1F4C7;', label: '名片管理' },
      { page: 'position', icon: '&#x1F4CB;', label: '职位管理' },
      { page: 'splash', icon: '&#x1F3A8;', label: '启动页' },
      { page: 'company-profile', icon: '&#x1F3E2;', label: '企业动态' },
      { page: 'company-performance', icon: '&#x1F4CA;', label: '公司业绩' },
      { page: 'business-module', icon: '&#x1F4E6;', label: '核心业务' },
      { page: 'honors', icon: '&#x1F3C6;', label: '企业荣誉' },
      { page: 'projects', icon: '&#x1F3D7;', label: '企业项目' },
      { page: 'sites', icon: '&#x1F6A7;', label: '施工现场' },
      { page: 'case-custom', icon: '&#x1F39B;', label: '案例自定义' },
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
    return `
      <header class="topbar">
        <div class="topbar-search">
          <span>&#x1F50D;</span>
          <input type="text" id="globalSearch" placeholder="全局搜索...">
        </div>
        <div class="topbar-right">
          <div class="topbar-icon" title="通知">&#x1F514;</div>
          <div class="topbar-icon" title="设置">&#x2699;</div>
          <div class="topbar-user">
            <div class="topbar-avatar">A</div>
            <span class="topbar-name">Admin</span>
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
  }
}
