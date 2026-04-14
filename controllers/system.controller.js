const { asyncHandler } = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');

const health = asyncHandler(async (req, res) => {
  return sendSuccess(res, {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  });
});

const test = asyncHandler(async (req, res) => {
  return sendSuccess(res, { message: 'Test endpoint is working!' });
});

module.exports = { health, test };
