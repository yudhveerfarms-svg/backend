const express = require('express');
const router = express.Router();
const { authRequired } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { getUserOrders, getUserOrderById, getOrderStatusHistory } = require('../controllers/order.controller');

// Get all orders for the authenticated user
router.get('/', authRequired, getUserOrders);

// Get single order details
router.get('/:orderId', authRequired, getUserOrderById);

// Get order status history
router.get('/:orderId/status-history', authRequired, getOrderStatusHistory);

module.exports = router;
