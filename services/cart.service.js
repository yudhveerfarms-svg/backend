const Product = require('../models/Product');
const User = require('../models/User');
const { AppError } = require('../utils/AppError');

function normalizeCartItem(item) {
  const p = item.product;
  const productId =
    p && typeof p === 'object' && p._id != null ? String(p._id) : p != null ? String(p) : '';
  
  // Calculate variant-specific price
  let itemPrice = undefined;
  if (typeof p === 'object' && p) {
    if (p.variants && p.variants.length > 0 && item.selectedSize) {
      const variant = p.variants.find(v => v.size === item.selectedSize);
      if (variant && variant.price > 0) {
        itemPrice = Number(variant.price);
      } else {
        itemPrice = Number(p.price) || 0;
      }
    } else {
      itemPrice = Number(p.price) || 0;
    }
  }
  
  return {
    productId,
    name: typeof p === 'object' && p ? p.name : undefined,
    price: itemPrice,
    image: typeof p === 'object' && p && p.image ? String(p.image) : '',
    quantity: item.quantity,
    selectedSize: item.selectedSize || '',
  };
}

async function getCartItems(user) {
  await user.populate('cartItems.product');
  return user.cartItems.map(normalizeCartItem);
}

async function addToCart(user, { productId, quantity, selectedSize }) {
  const product = await Product.findById(productId);
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  const nextQuantity = Math.max(1, Number(quantity) || 1);
  const existingIndex = user.cartItems.findIndex(
    (item) => String(item.product) === String(productId) && String(item.selectedSize) === String(selectedSize)
  );

  if (existingIndex >= 0) {
    user.cartItems[existingIndex].quantity += nextQuantity;
  } else {
    user.cartItems.push({ product: productId, quantity: nextQuantity, selectedSize });
  }

  await user.save();
  return getCartItems(user);
}

async function updateCartItem(user, { productId, quantity, selectedSize }) {
  const nextQuantity = Number(quantity) || 0;
  const existingIndex = user.cartItems.findIndex(
    (item) => String(item.product) === String(productId) && String(item.selectedSize) === String(selectedSize)
  );

  if (existingIndex < 0) {
    throw new AppError('Cart item not found', 404);
  }

  if (nextQuantity <= 0) {
    user.cartItems.splice(existingIndex, 1);
  } else {
    user.cartItems[existingIndex].quantity = nextQuantity;
  }

  await user.save();
  return getCartItems(user);
}

async function removeCartItem(user, { productId, selectedSize }) {
  user.cartItems = user.cartItems.filter(
    (item) => !(String(item.product) === String(productId) && String(item.selectedSize) === String(selectedSize))
  );
  await user.save();
  return getCartItems(user);
}

async function mergeGuestCart(user, { items }) {
  for (const item of items) {
    if (!item?.productId) continue;
    const exists = await Product.exists({ _id: item.productId });
    if (!exists) continue;
    const quantity = Math.max(1, Number(item.quantity) || 1);
    const sel = item.selectedSize || '';

    const existingIndex = user.cartItems.findIndex(
      (cartItem) => String(cartItem.product) === String(item.productId) && String(cartItem.selectedSize) === String(sel)
    );

    if (existingIndex >= 0) user.cartItems[existingIndex].quantity += quantity;
    else user.cartItems.push({ product: item.productId, quantity, selectedSize: sel });
  }

  await user.save();
  const freshUser = await User.findById(user._id).populate('cartItems.product');
  return freshUser.cartItems.map(normalizeCartItem);
}

module.exports = {
  normalizeCartItem,
  getCartItems,
  addToCart,
  updateCartItem,
  removeCartItem,
  mergeGuestCart,
};
