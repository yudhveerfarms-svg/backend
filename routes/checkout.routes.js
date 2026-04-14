const express = require('express');
const { validate } = require('../middleware/validate');
const { optionalAuth } = require('../middleware/auth');
const { checkoutWriteLimiter } = require('../middleware/apiLimiter');
const {
  createOrderSchema,
  verifyPaymentSchema,
  markFailedSchema,
  orderIdParamSchema,
} = require('../validators/checkout.schemas');
const checkoutController = require('../controllers/checkout.controller');

const router = express.Router();

router.post(
  '/create-order',
  checkoutWriteLimiter,
  optionalAuth,
  validate(createOrderSchema),
  checkoutController.createOrder
);

router.post('/verify', checkoutWriteLimiter, validate(verifyPaymentSchema), checkoutController.verify);

router.post('/mark-failed', checkoutWriteLimiter, validate(markFailedSchema), checkoutController.markFailed);

router.post(
  '/:orderId/retry',
  checkoutWriteLimiter,
  validate(orderIdParamSchema, 'params'),
  checkoutController.retry
);

router.get(
  '/:orderId/status',
  validate(orderIdParamSchema, 'params'),
  checkoutController.orderStatus
);

module.exports = router;
