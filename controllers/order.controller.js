const { asyncHandler } = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const Order = require('../models/Order');

/**
 * Get all orders for the authenticated user
 */
const getUserOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  const userId = req.user._id;

  // Build query
  const query = { user: userId };
  
  // Filter by status if provided
  if (status) {
    query.fulfillmentStatus = status;
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Fetch orders with pagination
  const orders = await Order.find(query)
    .populate('items.product', 'name images')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Get total count for pagination
  const totalOrders = await Order.countDocuments(query);

  return sendSuccess(res, {
    orders,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalOrders / limit),
      totalOrders,
      hasMore: skip + orders.length < totalOrders
    }
  });
});

/**
 * Get single order details for the authenticated user
 */
const getUserOrderById = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user._id;

  const order = await Order.findOne({ 
    _id: orderId, 
    user: userId 
  }).populate('items.product', 'name images');

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found'
    });
  }

  return sendSuccess(res, { order });
});

/**
 * Get order status history
 */
const getOrderStatusHistory = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user._id;

  const order = await Order.findOne({ 
    _id: orderId, 
    user: userId 
  }).select('statusHistory fulfillmentStatus paymentStatus orderStatus createdAt');

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found'
    });
  }

  return sendSuccess(res, { 
    statusHistory: order.statusHistory,
    currentStatus: {
      fulfillment: order.fulfillmentStatus,
      payment: order.paymentStatus,
      order: order.orderStatus
    },
    orderDate: order.createdAt
  });
});

module.exports = {
  getUserOrders,
  getUserOrderById,
  getOrderStatusHistory
};
