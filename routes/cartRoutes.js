const express = require('express');
const Product = require('../models/Product');
const User = require('../models/User');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

function normalizeCartItem(item) {
  return {
    productId: item.product?._id || item.product,
    name: item.product?.name,
    price: item.product?.price,
    quantity: item.quantity,
    selectedSize: item.selectedSize || '',
  };
}

router.get('/', authRequired, async (req, res) => {
  await req.user.populate('cartItems.product');
  return res.status(200).json({
    data: {
      items: req.user.cartItems.map(normalizeCartItem),
    },
  });
});

router.post('/add', authRequired, async (req, res) => {
  const { productId, quantity = 1, selectedSize = '' } = req.body;
  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ message: 'Product not found' });

  const nextQuantity = Math.max(1, Number(quantity) || 1);
  const existingIndex = req.user.cartItems.findIndex(
    (item) => String(item.product) === String(productId) && String(item.selectedSize) === String(selectedSize)
  );

  if (existingIndex >= 0) {
    req.user.cartItems[existingIndex].quantity += nextQuantity;
  } else {
    req.user.cartItems.push({ product: productId, quantity: nextQuantity, selectedSize });
  }

  await req.user.save();
  await req.user.populate('cartItems.product');
  return res.status(200).json({ data: { items: req.user.cartItems.map(normalizeCartItem) } });
});

router.put('/item', authRequired, async (req, res) => {
  const { productId, quantity, selectedSize = '' } = req.body;
  const nextQuantity = Number(quantity) || 0;
  const existingIndex = req.user.cartItems.findIndex(
    (item) => String(item.product) === String(productId) && String(item.selectedSize) === String(selectedSize)
  );

  if (existingIndex < 0) return res.status(404).json({ message: 'Cart item not found' });

  if (nextQuantity <= 0) {
    req.user.cartItems.splice(existingIndex, 1);
  } else {
    req.user.cartItems[existingIndex].quantity = nextQuantity;
  }

  await req.user.save();
  await req.user.populate('cartItems.product');
  return res.status(200).json({ data: { items: req.user.cartItems.map(normalizeCartItem) } });
});

router.delete('/item', authRequired, async (req, res) => {
  const { productId, selectedSize = '' } = req.body;
  req.user.cartItems = req.user.cartItems.filter(
    (item) => !(String(item.product) === String(productId) && String(item.selectedSize) === String(selectedSize))
  );
  await req.user.save();
  await req.user.populate('cartItems.product');
  return res.status(200).json({ data: { items: req.user.cartItems.map(normalizeCartItem) } });
});

router.post('/merge', authRequired, async (req, res) => {
  const { items = [] } = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ message: 'items should be an array' });

  for (const item of items) {
    if (!item?.productId) continue;
    const exists = await Product.exists({ _id: item.productId });
    if (!exists) continue;
    const quantity = Math.max(1, Number(item.quantity) || 1);
    const selectedSize = item.selectedSize || '';

    const existingIndex = req.user.cartItems.findIndex(
      (cartItem) =>
        String(cartItem.product) === String(item.productId) &&
        String(cartItem.selectedSize) === String(selectedSize)
    );

    if (existingIndex >= 0) req.user.cartItems[existingIndex].quantity += quantity;
    else req.user.cartItems.push({ product: item.productId, quantity, selectedSize });
  }

  await req.user.save();
  const freshUser = await User.findById(req.user._id).populate('cartItems.product');
  return res.status(200).json({ data: { items: freshUser.cartItems.map(normalizeCartItem) } });
});

module.exports = router;
