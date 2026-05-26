// Image compression helper — sharp-based post-upload optimization
// Compresses JPEG/PNG to reduce file size by 50-70% before storage

const sharp = require('sharp')
const fs = require('fs')

const JPEG_QUALITY = 80
const PNG_QUALITY = 80
const MAX_WIDTH = 1920  // Cap width to reasonable max (Full HD)

/**
 * Compress an uploaded image in-place. Skips non-image files and GIFs.
 * On failure, silently keeps the original file (no data loss).
 *
 * @param {string} filePath - Absolute path to the uploaded file
 * @returns {Promise<{compressed: boolean, originalSize: number, newSize: number}>}
 */
async function compressImage(filePath) {
  const originalSize = fs.statSync(filePath).size
  const ext = filePath.split('.').pop().toLowerCase()

  // Skip unsupported formats and already-small files
  if (ext === 'gif' || ext === 'svg' || ext === 'webp') {
    return { compressed: false, originalSize, newSize: originalSize }
  }
  if (originalSize < 10240) {
    // Don't bother compressing files under 10KB
    return { compressed: false, originalSize, newSize: originalSize }
  }

  const tmpPath = filePath + '.tmp'

  try {
    const pipeline = sharp(filePath)
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })

    if (ext === 'png') {
      pipeline.png({ quality: PNG_QUALITY, progressive: true })
    } else {
      // Default to JPEG for jpg/jpeg and unknown formats
      pipeline.jpeg({ quality: JPEG_QUALITY, progressive: true })
    }

    await pipeline.toFile(tmpPath)
    const newSize = fs.statSync(tmpPath).size

    // Only replace if compression actually saved space
    if (newSize < originalSize) {
      fs.renameSync(tmpPath, filePath)
      return { compressed: true, originalSize, newSize }
    } else {
      fs.unlinkSync(tmpPath)
      return { compressed: false, originalSize, newSize: originalSize }
    }
  } catch (e) {
    // Clean up temp file on error, keep original intact
    try { fs.unlinkSync(tmpPath) } catch (_) {}
    console.error('[compress] Failed:', e.message)
    return { compressed: false, originalSize, newSize: originalSize }
  }
}

module.exports = { compressImage }
