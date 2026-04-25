const Razorpay = require('razorpay');
const { AppError } = require('../utils/AppError');

let client = null;

/**
 * Lazily instantiate Razorpay so the API process can boot without payment keys
 * (e.g. local dev, health checks). Callers must handle missing configuration.
 */
function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new AppError('Razorpay is not configured', 503, { code: 'RAZORPAY_CONFIG' });
  }
  if (!client) {
    client = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }
  return client;
}

module.exports = { getRazorpay };
