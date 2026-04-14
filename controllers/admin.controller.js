const { asyncHandler } = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const adminService = require('../services/admin.service');

const stats = asyncHandler(async (req, res) => {
  const data = await adminService.getDashboardStats();
  return sendSuccess(res, data);
});

const listOrders = asyncHandler(async (req, res) => {
  const data = await adminService.listOrders(req.validated);
  return sendSuccess(res, data);
});

const recentOrders = asyncHandler(async (req, res) => {
  const orders = await adminService.getRecentOrders(8);
  return sendSuccess(res, { orders });
});

const getOrder = asyncHandler(async (req, res) => {
  const data = await adminService.getOrderById(req.validated.orderId);
  return sendSuccess(res, data);
});

const patchOrder = asyncHandler(async (req, res) => {
  const { orderId, ...updates } = req.validated;
  const data = await adminService.updateOrder(orderId, updates);
  return sendSuccess(res, data, { message: 'Order updated' });
});

const invoice = asyncHandler(async (req, res) => {
  const data = await adminService.issueInvoiceForOrder(req.validated.orderId);
  return sendSuccess(res, data);
});

module.exports = { stats, listOrders, recentOrders, getOrder, patchOrder, invoice };
