const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_AUTH_MAX || 40),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later' },
});

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_CONTACT_MAX || 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many contact submissions, try again later' },
});

const checkoutWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_CHECKOUT_MAX || 30),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many checkout requests, slow down' },
});

module.exports = { authLimiter, contactLimiter, checkoutWriteLimiter };
