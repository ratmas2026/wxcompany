const { ZodError } = require('zod')

function zValidate(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body)
      next()
    } catch (e) {
      if (e instanceof ZodError) {
        const errors = e.issues.map(err =>
          `${err.path.join('.')}: ${err.message}`
        ).join('; ')
        return res.status(400).json({ error: errors })
      }
      return res.status(400).json({ error: 'Invalid request' })
    }
  }
}

module.exports = { zValidate }
