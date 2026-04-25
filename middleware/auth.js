const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getJwtSecret } = require('../services/token.service');
const { AppError } = require('../utils/AppError');
const { asyncHandler } = require('../utils/asyncHandler');

const authRequired = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    throw new AppError('Authentication required', 401);
  }

  let decoded;
  try {
    decoded = jwt.verify(token, getJwtSecret());
  } catch {
    throw new AppError('Invalid or expired token', 401);
  }

  const user = await User.findById(decoded.userId).select('-password');
  if (!user) {
    throw new AppError('Invalid token user', 401);
  }

  req.user = user;
  return next();
});

const optionalAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) return next();

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    const user = await User.findById(decoded.userId).select('-password');
    if (user) req.user = user;
  } catch {
    // ignore invalid token for optional auth
  }
  return next();
});

const adminRequired = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    throw new AppError('Authentication required', 401);
  }

  let decoded;
  try {
    decoded = jwt.verify(token, getJwtSecret());
  } catch {
    throw new AppError('Invalid or expired token', 401);
  }

  const user = await User.findById(decoded.userId).select('-password');
  if (!user) {
    throw new AppError('Invalid token user', 401);
  }
  if (user.role !== 'admin') {
    throw new AppError('Admin access required', 403);
  }

  req.user = user;
  return next();
});

module.exports = { authRequired, optionalAuth, adminRequired };
