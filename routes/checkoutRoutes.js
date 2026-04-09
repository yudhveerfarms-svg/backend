const express = require('express');
const crypto = require('crypto');
const Order = require('../models/Order');
const Product = require('../models/Product');
const razorpay = require('../services/razorpay');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

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
  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');
  return expectedSignature === signature;
}

router.post('/create-order', optionalAuth, async (req, res) => {
  try {
    const { items, customer = {} } = req.body;
    const resolvedCustomer = {
      name: customer.name || req.user?.name || '',
      email: customer.email || req.user?.email || '',
      phone: customer.phone || req.user?.phone || '',
      address: customer.address || req.user?.address || '',
      city: customer.city || '',
      state: customer.state || '',
      pincode: customer.pincode || '',
      selectedSize: customer.selectedSize || '',
    };

    if (!resolvedCustomer.name || !resolvedCustomer.phone || !resolvedCustomer.address) {
      return res.status(400).json({ message: 'Customer name, phone and address are required' });
    }


    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items are required' });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ message: 'Razorpay is not configured' });
    }

    const productIds = items.map((item) => item.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map((product) => [String(product._id), product]));

    const normalizedItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = productMap.get(String(item.productId));
      if (!product) {
        return res.status(400).json({ message: `Invalid product ${item.productId}` });
      }

      const quantity = Number(item.quantity) || 0;
      if (quantity < 1) {
        return res.status(400).json({ message: 'Quantity must be at least 1' });
      }

      if (typeof product.price !== 'number' || product.price <= 0) {
        return res.status(400).json({ message: `Product ${product.name} has invalid price` });
      }

      const lineTotal = product.price * quantity;
      subtotal += lineTotal;

      normalizedItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity,
        lineTotal,
      });
    }

    const receipt = createOrderNumber().slice(0, 40);
    const razorpayOrder = await razorpay.orders.create({
      amount: toPaise(subtotal),
      currency: 'INR',
      receipt,
      payment_capture: 1,
    });

    const order = await Order.create({
      orderNumber: createOrderNumber(),
      user: req.user?._id || null,
      orderType: req.user ? 'authenticated' : 'guest',
      customer: resolvedCustomer,
      items: normalizedItems,
      subtotal,
      productId: normalizedItems[0].product,
      quantity: normalizedItems.reduce((sum, item) => sum + item.quantity, 0),
      totalPrice: subtotal,
      currency: 'INR',
      paymentStatus: 'pending',
      orderStatus: 'pending',
      paymentAttempts: [
        {
          razorpayOrderId: razorpayOrder.id,
          amount: subtotal,
          status: 'created',
          rawPayload: razorpayOrder,
        },
      ],
    });

    return res.status(201).json({
      message: 'Checkout order created',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        amount: toPaise(order.subtotal),
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID,
        razorpayOrderId: razorpayOrder.id,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to create checkout order', error: error.message });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const {
      orderId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      meta = {},
    } = req.body;

    if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ message: 'Missing payment verification fields' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.paymentStatus === 'paid') {
      return res.status(200).json({
        message: 'Payment already verified',
        data: { orderId: order._id, paymentStatus: order.paymentStatus },
      });
    }

    const isValid = validateSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!isValid) {
      order.paymentStatus = 'failed';
      order.orderStatus = 'failed';
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

      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    const payment = await razorpay.payments.fetch(razorpayPaymentId);

    order.paymentStatus = 'paid';
    order.orderStatus = 'paid';
    order.paymentId = razorpayPaymentId;
    order.paidAt = new Date();
    order.paymentAttempts.push({
      razorpayOrderId,
      razorpayPaymentId,
      amount: fromPaise(payment.amount),
      status: payment.status || 'captured',
      signatureVerified: true,
      rawPayload: payment,
    });

    await order.save();

    return res.status(200).json({
      message: 'Payment verified successfully',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
        paidAt: order.paidAt,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Payment verification failed', error: error.message });
  }
});

router.post('/mark-failed', async (req, res) => {
  try {
    const { orderId, razorpayOrderId, reason = 'Payment failed', meta = {} } = req.body;
    if (!orderId || !razorpayOrderId) {
      return res.status(400).json({ message: 'orderId and razorpayOrderId are required' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'Cannot mark paid order as failed' });
    }

    order.paymentStatus = 'failed';
    order.orderStatus = 'failed';
    order.paymentAttempts.push({
      razorpayOrderId,
      amount: order.subtotal,
      status: 'failed',
      signatureVerified: false,
      failureReason: reason,
      rawPayload: meta,
    });

    await order.save();
    return res.status(200).json({ message: 'Order marked as failed' });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to mark payment failed', error: error.message });
  }
});

router.post('/:orderId/retry', async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'Order already paid' });
    }

    const receipt = `${order.orderNumber}-R${order.paymentAttempts.length + 1}`.slice(0, 40);
    const razorpayOrder = await razorpay.orders.create({
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

    return res.status(200).json({
      message: 'Retry order created',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        amount: toPaise(order.subtotal),
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID,
        razorpayOrderId: razorpayOrder.id,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to create retry payment order', error: error.message });
  }
});

router.get('/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId).populate('items.product', 'name');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    return res.status(200).json({
      data: {
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
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch order status', error: error.message });
  }
});

module.exports = router;
