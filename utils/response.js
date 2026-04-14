function sendSuccess(res, data, options = {}) {
  const opts = typeof options === 'string' ? { message: options } : options;
  const { status = 200, message } = opts;
  const payload = { success: true };
  if (data !== undefined) payload.data = data;
  if (message) payload.message = message;
  return res.status(status).json(payload);
}

function sendCreated(res, data, message) {
  return sendSuccess(res, data, { status: 201, message });
}

module.exports = { sendSuccess, sendCreated };
