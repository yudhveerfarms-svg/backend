const mongoose = require('mongoose');
const { ZodError } = require('zod');
const { AppError } = require('../utils/AppError');

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function errorHandler(err, req, res, _next) {
  if (res.headersSent) {
    return;
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.code ? { code: err.code } : {}),
      ...(err.details ? { details: err.details } : {}),
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.flatten(),
    });
  }

  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({
      success: false,
      message: 'Invalid identifier',
    });
  }

  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.errors,
    });
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }

  if (err.message && err.message.startsWith('CORS policy')) {
    return res.status(403).json({
      success: false,
      message: 'Origin not allowed',
    });
  }

  console.error('[api]', err);

  return res.status(500).json({
    success: false,
    message: isProduction() ? 'Internal server error' : err.message || 'Internal server error',
  });
}

module.exports = { errorHandler };
