const { asyncHandler } = require('../utils/asyncHandler');
const { sendSuccess, sendCreated } = require('../utils/response');
const checkoutService = require('../services/checkout.service');

const createOrder = asyncHandler(async (req, res) => {
  const { items, customer } = req.validated;
  const payload = await checkoutService.createCheckoutOrder({
    items,
    customer,
    user: req.user,
  });
  return sendCreated(res, payload, 'Checkout order created');
});

const verify = asyncHandler(async (req, res) => {
  const result = await checkoutService.verifyCheckoutPayment(req.validated);
  if (result.alreadyVerified) {
    return sendSuccess(
      res,
      { orderId: result.orderId, paymentStatus: result.paymentStatus },
      { message: 'Payment already verified' }
    );
  }
  return sendSuccess(res, result, { message: 'Payment verified successfully' });
});

const markFailed = asyncHandler(async (req, res) => {
  await checkoutService.markCheckoutFailed(req.validated);
  return sendSuccess(res, {}, { message: 'Order marked as failed' });
});

const retry = asyncHandler(async (req, res) => {
  const payload = await checkoutService.retryCheckoutPayment(req.validated.orderId);
  return sendSuccess(res, payload, { message: 'Retry order created' });
});

const orderStatus = asyncHandler(async (req, res) => {
  const data = await checkoutService.getCheckoutOrderStatus(req.validated.orderId);
  return sendSuccess(res, data);
});

module.exports = { createOrder, verify, markFailed, retry, orderStatus };
