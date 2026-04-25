const express = require('express');
const { validate } = require('../middleware/validate');
const { adminRequired } = require('../middleware/auth');
const { uploadProductImages } = require('../middleware/upload');
const {
  listOrdersQuerySchema,
  patchOrderSchema,
  orderIdParamSchema,
} = require('../validators/admin.schemas');
const adminController = require('../controllers/admin.controller');
const adminProductController = require('../controllers/admin.product.controller');

const router = express.Router();

router.use(adminRequired);

router.get('/stats', adminController.stats);

router.get('/orders/recent', adminController.recentOrders);

router.get('/orders', validate(listOrdersQuerySchema, 'query'), adminController.listOrders);

router.get('/orders/:orderId', validate(orderIdParamSchema, 'params'), adminController.getOrder);

router.patch(
  '/orders/:orderId',
  validate(orderIdParamSchema, 'params'),
  validate(patchOrderSchema),
  adminController.patchOrder
);

router.post(
  '/orders/:orderId/invoice',
  validate(orderIdParamSchema, 'params'),
  adminController.invoice
);

// Product management
router.get('/products', adminProductController.list);
router.get('/products/:productId', adminProductController.getOne);
router.post('/products', uploadProductImages, adminProductController.create);
router.patch('/products/:productId', uploadProductImages, adminProductController.update);
router.delete('/products/:productId', adminProductController.remove);

module.exports = router;
