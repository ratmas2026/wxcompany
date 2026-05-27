// CDN URL rewriter — replaces blocked/inaccessible CDN resources with local equivalents.
// This is needed because cdn.tailwindcss.com and other common CDNs are blocked or
// extremely slow in mainland China. At template upload time, we rewrite these URLs
// to point to self-hosted copies served from the Express server.

/**
 * Rewrite known blocked CDN URLs in HTML to local paths.
 * The rewritten HTML is saved to disk and used for all future renders.
 *
 * @param {string} html - The uploaded template HTML
 * @returns {string} HTML with CDN URLs rewritten to local paths
 */
function rewriteCdnUrls(html) {
  // Replace Tailwind CSS Play CDN script with self-hosted runtime
  // Handle forms: <script src="https://cdn.tailwindcss.com"></script>
  //   and: <script src="https://cdn.tailwindcss.com?plugins=forms,typography"></script>
  html = html.replace(
    /<script\b[^>]*\bsrc="https:\/\/cdn\.tailwindcss\.com(\?[^"]*)?"[^>]*><\/script>/gi,
    function (match, queryString) {
      var parts = ['<script src="/api/templates-runtime/tailwind.js"></script>']

      // If the original URL had plugin query params, inject them as tailwind.config
      if (queryString) {
        var pluginMatch = queryString.match(/plugins=([^&"]+)/)
        if (pluginMatch) {
          var plugins = pluginMatch[1].split(',').map(function (p) {
            return p.trim()
          })
          // Emit a comment noting that CDN plugin support requires additional setup
          parts.push(
            '\n<!-- [cdn-rewriter] Plugins originally loaded via CDN query (' +
              plugins.join(', ') +
              ') require separate plugin scripts. See docs. -->'
          )
        }
      }
      return parts.join('')
    }
  )

  return html
}

module.exports = { rewriteCdnUrls }
