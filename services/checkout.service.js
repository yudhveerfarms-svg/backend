const crypto = require('crypto');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { getRazorpay } = require('./razorpay');
const { AppError } = require('../utils/AppError');

function createOrderNumber() {
  return `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function toPaise(amount) {
  return Math.round(amount * 100);
}

function fromPaise(amount) {
  return amount / 100;
}

function validateSignature(orderId, paymentId, signature) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return expectedSignature === signature;
}

async function createCheckoutOrder({ items, customer, user }) {
  const resolvedCustomer = {
    name: customer.name || user?.name || '',
    email: customer.email || user?.email || '',
    phone: customer.phone || user?.phone || '',
    address: customer.address || user?.address || '',
    city: customer.city || '',
    state: customer.state || '',
    pincode: customer.pincode || '',
    selectedSize: customer.selectedSize || '',
  };

  if (!resolvedCustomer.name || !resolvedCustomer.phone || !resolvedCustomer.address) {
    throw new AppError('Customer name, phone and address are required', 400);
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('Items are required', 400);
  }

  const productIds = items.map((item) => item.productId);
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map((product) => [String(product._id), product]));

  const normalizedItems = [];
  let subtotal = 0;

  for (const item of items) {
    const product = productMap.get(String(item.productId));
    if (!product) {
      throw new AppError(`Invalid product ${item.productId}`, 400);
    }

    const quantity = Number(item.quantity) || 0;
    if (quantity < 1) {
      throw new AppError('Quantity must be at least 1', 400);
    }

    const selectedSize = String(item.selectedSize || '').trim();
    let unitPrice = typeof product.price === 'number' ? product.price : 0;

    if (selectedSize && Array.isArray(product.variants) && product.variants.length) {
      const variant = product.variants.find((v) => String(v.size).trim() === selectedSize);
      if (!variant) {
        throw new AppError(`Invalid variant size for ${product.name}`, 400);
      }
      if (typeof variant.stock === 'number' && variant.stock < quantity) {
        throw new AppError(`Insufficient stock for ${product.name} (${selectedSize})`, 400);
      }
      unitPrice = Number(variant.price) || 0;
    } else if (Array.isArray(product.variants) && product.variants.length) {
      // Default to cheapest variant when no size provided
      const cheapest = [...product.variants].sort((a, b) => (a.price || 0) - (b.price || 0))[0];
      unitPrice = Number(cheapest?.price) || unitPrice;
    }

    if (typeof unitPrice !== 'number' || unitPrice <= 0) {
      throw new AppError(`Product ${product.name} has invalid price`, 400);
    }

    const lineTotal = unitPrice * quantity;
    subtotal += lineTotal;

    normalizedItems.push({
      product: product._id,
      name: product.name,
      price: unitPrice,
      quantity,
      lineTotal,
    });
  }

  const receipt = createOrderNumber().slice(0, 40);
  const razorpayOrder = await getRazorpay().orders.create({
    amount: toPaise(subtotal),
    currency: 'INR',
    receipt,
    payment_capture: 1,
  });

  const taxAmount = 0;
  const shippingAmount = 0;
  const grandTotal = subtotal + taxAmount + shippingAmount;

  const order = await Order.create({
    orderNumber: createOrderNumber(),
    user: user?._id || null,
    orderType: user ? 'authenticated' : 'guest',
    customer: resolvedCustomer,
    items: normalizedItems,
    subtotal,
    taxAmount,
    shippingAmount,
    productId: normalizedItems[0].product,
    quantity: normalizedItems.reduce((sum, item) => sum + item.quantity, 0),
    totalPrice: grandTotal,
    currency: 'INR',
    paymentStatus: 'pending',
    orderStatus: 'pending',
    paymentMethod: 'Razorpay',
    fulfillmentStatus: 'pending_payment',
    statusHistory: [
      {
        label: 'Order placed',
        detail: 'Awaiting payment',
        at: new Date(),
      },
    ],
    paymentAttempts: [
      {
        razorpayOrderId: razorpayOrder.id,
        amount: subtotal,
        status: 'created',
        rawPayload: razorpayOrder,
      },
    ],
  });

  return {
    orderId: order._id,
    orderNumber: order.orderNumber,
    amount: toPaise(order.subtotal),
    currency: order.currency,
    key: process.env.RAZORPAY_KEY_ID,
    razorpayOrderId: razorpayOrder.id,
  };
}

async function verifyCheckoutPayment({ orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature, meta }) {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  if (order.paymentStatus === 'paid') {
    return {
      alreadyVerified: true,
      orderId: order._id,
      paymentStatus: order.paymentStatus,
    };
  }

  const isValid = validateSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
  if (!isValid) {
    order.paymentStatus = 'failed';
    order.orderStatus = 'failed';
    order.fulfillmentStatus = 'cancelled';
    order.statusHistory.push({
      label: 'Payment failed',
      detail: 'Invalid payment signature',
      at: new Date(),
    });
    order.paymentAttempts.push({
      razorpayOrderId,
      razorpayPaymentId,
      amount: order.subtotal,
      status: 'failed',
      signatureVerified: false,
      failureReason: 'Invalid signature',
      rawPayload: meta,
    });
    await order.save();
    throw new AppError('Invalid payment signature', 400);
  }

  const payment = await getRazorpay().payments.fetch(razorpayPaymentId);

  order.paymentStatus = 'paid';
  order.orderStatus = 'paid';
  order.fulfillmentStatus = 'processing';
  order.paymentId = razorpayPaymentId;
  order.paidAt = new Date();
  order.statusHistory.push({
    label: 'Payment received',
    detail: 'Paid via Razorpay',
    at: new Date(),
  });
  order.statusHistory.push({
    label: 'Processing',
    detail: 'Order is being prepared',
    at: new Date(),
  });
  order.paymentAttempts.push({
    razorpayOrderId,
    razorpayPaymentId,
    amount: fromPaise(payment.amount),
    status: payment.status || 'captured',
    signatureVerified: true,
    rawPayload: payment,
  });

  await order.save();

  return {
    orderId: order._id,
    orderNumber: order.orderNumber,
    paymentStatus: order.paymentStatus,
    paidAt: order.paidAt,
  };
}

async function markCheckoutFailed({ orderId, razorpayOrderId, reason, meta }) {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  if (order.paymentStatus === 'paid') {
    throw new AppError('Cannot mark paid order as failed', 400);
  }

  order.paymentStatus = 'failed';
  order.orderStatus = 'failed';
  order.fulfillmentStatus = 'cancelled';
  order.statusHistory.push({
    label: 'Payment failed',
    detail: reason,
    at: new Date(),
  });
  order.paymentAttempts.push({
    razorpayOrderId,
    amount: order.subtotal,
    status: 'failed',
    signatureVerified: false,
    failureReason: reason,
    rawPayload: meta,
  });

  await order.save();
}

async function retryCheckoutPayment(orderId) {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  if (order.paymentStatus === 'paid') {
    throw new AppError('Order already paid', 400);
  }

  const receipt = `${order.orderNumber}-R${order.paymentAttempts.length + 1}`.slice(0, 40);
  const razorpayOrder = await getRazorpay().orders.create({
    amount: toPaise(order.subtotal),
    currency: order.currency,
    receipt,
    payment_capture: 1,
  });

  order.paymentStatus = 'pending';
  order.orderStatus = 'pending';
  order.paymentAttempts.push({
    razorpayOrderId: razorpayOrder.id,
    amount: order.subtotal,
    status: 'created',
    rawPayload: razorpayOrder,
  });
  await order.save();

  return {
    orderId: order._id,
    orderNumber: order.orderNumber,
    amount: toPaise(order.subtotal),
    currency: order.currency,
    key: process.env.RAZORPAY_KEY_ID,
    razorpayOrderId: razorpayOrder.id,
  };
}

async function getCheckoutOrderStatus(orderId) {
  const order = await Order.findById(orderId).populate('items.product', 'name');
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  return {
    orderId: order._id,
    orderNumber: order.orderNumber,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    paymentId: order.paymentId,
    productId: order.productId,
    quantity: order.quantity,
    totalPrice: order.totalPrice,
    subtotal: order.subtotal,
    currency: order.currency,
    paidAt: order.paidAt,
    items: order.items,
    latestAttempt: order.paymentAttempts[order.paymentAttempts.length - 1] || null,
  };
}

module.exports = {
  createCheckoutOrder,
  verifyCheckoutPayment,
  markCheckoutFailed,
  retryCheckoutPayment,
  getCheckoutOrderStatus,
};
