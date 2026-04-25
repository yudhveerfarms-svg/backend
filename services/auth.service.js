const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { AppError } = require('../utils/AppError');
const { signToken } = require('./token.service');

function sanitizeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    address: user.address,
    role: user.role || 'user',
  };
}

async function signup({ name, email, password, phone, address }) {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('Email already registered', 409);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    phone: phone || '',
    address: address || '',
  });

  return {
    token: signToken(user._id),
    user: sanitizeUser(user),
  };
}

async function login({ email, password }) {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) {
    throw new AppError('Invalid credentials', 401);
  }

  return {
    token: signToken(user._id),
    user: sanitizeUser(user),
  };
}

async function adminLogin({ email, password }) {
  const user = await User.findOne({ email });
  if (!user || user.role !== 'admin') {
    throw new AppError('Invalid admin credentials', 401);
  }

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) {
    throw new AppError('Invalid admin credentials', 401);
  }

  return {
    token: signToken(user._id),
    user: sanitizeUser(user),
  };
}

async function updateProfile(user, { name, phone, address }) {
  if (typeof name === 'string') user.name = name.trim();
  if (typeof phone === 'string') user.phone = phone.trim();
  if (typeof address === 'string') user.address = address.trim();
  await user.save();
  return { user: sanitizeUser(user) };
}

module.exports = {
  sanitizeUser,
  signup,
  login,
  adminLogin,
  updateProfile,
};
