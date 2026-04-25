const { asyncHandler } = require('../utils/asyncHandler');
const { sendSuccess, sendCreated } = require('../utils/response');
const authService = require('../services/auth.service');

const signup = asyncHandler(async (req, res) => {
  const data = await authService.signup(req.validated);
  return sendCreated(res, data, 'Signup successful');
});

const login = asyncHandler(async (req, res) => {
  const data = await authService.login(req.validated);
  return sendSuccess(res, data, { message: 'Login successful' });
});

const adminLogin = asyncHandler(async (req, res) => {
  const data = await authService.adminLogin(req.validated);
  return sendSuccess(res, data, { message: 'Admin login successful' });
});

const me = asyncHandler(async (req, res) => {
  return sendSuccess(res, { user: req.user });
});

const updateMe = asyncHandler(async (req, res) => {
  const result = await authService.updateProfile(req.user, req.validated);
  return sendSuccess(res, result, { message: 'Profile updated' });
});

module.exports = { signup, login, adminLogin, me, updateMe };
