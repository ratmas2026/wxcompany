// Template render cache — in-memory Map with 24h TTL
// Key format: "templateId:cardId"
// Invalidated when user profile is updated (card data changes)

const cache = new Map()
const TTL = 24 * 60 * 60 * 1000  // 24 hours in ms

/**
 * Build cache key from template ID and card/user ID.
 */
function getCacheKey(templateId, cardId) {
  return String(templateId) + ':' + String(cardId)
}

/**
 * Get cached render result. Returns null if missing or expired.
 */
function get(key) {
  if (!cache.has(key)) return null
  const entry = cache.get(key)
  if (Date.now() > entry.expiry) {
    cache.delete(key)
    return null
  }
  return entry.value
}

/**
 * Store render result in cache with 24h TTL.
 */
function set(key, value) {
  cache.set(key, { value, expiry: Date.now() + TTL })
}

/**
 * Invalidate all cached renders for a specific card/user.
 * Called when user profile is updated.
 */
function invalidateUser(cardId) {
  const suffix = ':' + String(cardId)
  for (const key of cache.keys()) {
    if (key.endsWith(suffix)) cache.delete(key)
  }
}

/** Get cache stats (for monitoring/debugging) */
function stats() {
  const now = Date.now()
  let active = 0
  let expired = 0
  for (const [, entry] of cache) {
    if (Date.now() > entry.expiry) expired++
    else active++
  }
  return { size: cache.size, active, expired }
}

module.exports = { get, set, invalidateUser, getCacheKey, stats }
