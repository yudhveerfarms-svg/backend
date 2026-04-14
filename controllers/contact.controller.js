const { asyncHandler } = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const { sendContactEmail } = require('../services/email.service');

const submitContact = asyncHandler(async (req, res) => {
  await sendContactEmail(req.validated);
  return sendSuccess(res, {}, { message: 'Message received and email sent successfully' });
});

module.exports = { submitContact };
