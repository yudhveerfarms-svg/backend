const { ZodError } = require('zod');

/**
 * @param {import('zod').ZodTypeAny} schema
 * @param {'body'|'query'|'params'} source
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      req.validated = { ...(req.validated || {}), ...parsed };
      return next();
    } catch (e) {
      if (e instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: e.flatten(),
        });
      }
      return next(e);
    }
  };
}

module.exports = { validate };
