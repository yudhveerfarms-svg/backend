const { asyncHandler } = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const cartService = require('../services/cart.service');

const getCart = asyncHandler(async (req, res) => {
  const items = await cartService.getCartItems(req.user);
  return sendSuccess(res, { items });
});

const addItem = asyncHandler(async (req, res) => {
  const items = await cartService.addToCart(req.user, req.validated);
  return sendSuccess(res, { items });
});

const updateItem = asyncHandler(async (req, res) => {
  const items = await cartService.updateCartItem(req.user, req.validated);
  return sendSuccess(res, { items });
});

const removeItem = asyncHandler(async (req, res) => {
  const items = await cartService.removeCartItem(req.user, req.validated);
  return sendSuccess(res, { items });
});

const merge = asyncHandler(async (req, res) => {
  const items = await cartService.mergeGuestCart(req.user, req.validated);
  return sendSuccess(res, { items });
});

module.exports = { getCart, addItem, updateItem, removeItem, merge };
