const FONT_SIZE_MAP = {
  xs: '20rpx', small: '24rpx', medium: '28rpx',
  large: '32rpx', xl: '36rpx', xxl: '44rpx', huge: '48rpx'
}

function parseGridLayout(displayLayout) {
  const raw = (displayLayout || 'single').trim()
  if (raw === 'carousel') return { layout: 'horizontal-scroll', gridCols: 0, gridClass: '' }
  if (raw === 'tab' || raw === 'hero' || raw === 'single') return { layout: raw, gridCols: 0, gridClass: '' }

  if (raw === 'grid-6-2x3') return { layout: 'grid', gridCols: 2, gridClass: 'grid-6-2x3' }
  if (raw === 'grid-6-3x2') return { layout: 'grid', gridCols: 3, gridClass: 'grid-6-3x2' }

  var m = raw.match(/^grid[-_]?(\d+)$/)
  if (m || raw === 'grid') {
    var total = m ? parseInt(m[1]) : 4
    if (total === 6) {
      console.warn('[parseGridLayout] Legacy grid-6 data, defaulting to grid-6-3x2')
      return { layout: 'grid', gridCols: 3, gridClass: 'grid-6-3x2' }
    }
    console.log('[parseGridLayout] raw=' + raw + ' -> cols=2 class=grid-' + total)
    return { layout: 'grid', gridCols: 2, gridClass: 'grid-' + total }
  }

  console.warn('[parseGridLayout] Unknown layout: ' + raw + ' — defaulting to grid-4')
  return { layout: 'grid', gridCols: 2, gridClass: 'grid-4' }
}

module.exports = {
  FONT_SIZE_MAP,
  parseGridLayout
}
