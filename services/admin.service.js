const Order = require('../models/Order');
const { AppError } = require('../utils/AppError');

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function resolveFulfillment(order) {
  if (order.fulfillmentStatus) return order.fulfillmentStatus;
  if (order.paymentStatus === 'paid') return 'processing';
  if (order.paymentStatus === 'failed' || order.paymentStatus === 'cancelled') return 'cancelled';
  return 'pending_payment';
}

function mapPaymentUi(db) {
  if (db === 'paid') return 'Paid';
  if (db === 'failed' || db === 'cancelled' || db === 'refunded') return 'Failed';
  return 'Pending';
}

function mapFulfillmentUi(fs) {
  const map = {
    pending_payment: 'Awaiting payment',
    processing: 'Processing',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };
  return map[fs] || 'Processing';
}

function serializeOrder(orderDoc) {
  const order = orderDoc.toObject ? orderDoc.toObject({ virtuals: true }) : { ...orderDoc };
  order.customer = order.customer || {};
  const fulfillment = resolveFulfillment(order);
  return {
    ...order,
    fulfillmentStatus: fulfillment,
    paymentLabel: mapPaymentUi(order.paymentStatus),
    fulfillmentLabel: mapFulfillmentUi(fulfillment),
  };
}

async function ensureInvoiceNumber(order) {
  if (order.invoiceNumber) return order.invoiceNumber;
  const year = new Date().getFullYear();
  const count = await Order.countDocuments({
    invoiceNumber: { $regex: new RegExp(`^INV-${year}-`) },
  });
  order.invoiceNumber = `INV-${year}-${String(count + 1).padStart(4, '0')}`;
  order.statusHistory.push({
    label: 'Invoice issued',
    detail: order.invoiceNumber,
    at: new Date(),
  });
  await order.save();
  return order.invoiceNumber;
}

async function getDashboardStats() {
  const now = new Date();
  const dayStart = startOfDay(now);
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const paidMatch = { paymentStatus: 'paid' };

  const [totalsAgg] = await Order.aggregate([
    { $match: paidMatch },
    {
      $group: {
        _id: null,
        revenue: { $sum: '$totalPrice' },
        orders: { $sum: 1 },
      },
    },
  ]);

  const [dailyAgg] = await Order.aggregate([
    { $match: { ...paidMatch, paidAt: { $gte: dayStart } } },
    { $group: { _id: null, revenue: { $sum: '$totalPrice' }, orders: { $sum: 1 } } },
  ]);

  const [weeklyAgg] = await Order.aggregate([
    { $match: { ...paidMatch, paidAt: { $gte: weekStart } } },
    { $group: { _id: null, revenue: { $sum: '$totalPrice' }, orders: { $sum: 1 } } },
  ]);

  const [monthlyAgg] = await Order.aggregate([
    { $match: { ...paidMatch, paidAt: { $gte: monthStart } } },
    { $group: { _id: null, revenue: { $sum: '$totalPrice' }, orders: { $sum: 1 } } },
  ]);

  const [customerAgg] = await Order.aggregate([
    {
      $addFields: {
        key: {
          $cond: [
            {
              $and: [{ $ne: ['$customer.email', null] }, { $ne: ['$customer.email', ''] }],
            },
            { $toLower: '$customer.email' },
            { $ifNull: ['$customer.phone', ''] },
          ],
        },
      },
    },
    { $match: { key: { $nin: ['', null] } } },
    { $group: { _id: '$key' } },
    { $count: 'n' },
  ]);

  const last30 = new Date(now);
  last30.setDate(last30.getDate() - 30);
  const series = await Order.aggregate([
    { $match: { ...paidMatch, paidAt: { $gte: last30 } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt' } },
        revenue: { $sum: '$totalPrice' },
        orders: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return {
    totals: {
      revenue: totalsAgg?.revenue || 0,
      orders: totalsAgg?.orders || 0,
      customers: customerAgg?.n || 0,
    },
    daily: {
      revenue: dailyAgg?.revenue || 0,
      orders: dailyAgg?.orders || 0,
    },
    weekly: {
      revenue: weeklyAgg?.revenue || 0,
      orders: weeklyAgg?.orders || 0,
    },
    monthly: {
      revenue: monthlyAgg?.revenue || 0,
      orders: monthlyAgg?.orders || 0,
    },
    series,
  };
}

function buildOrderListFilter({ q, payment, status, dateFrom, dateTo }) {
  const clauses = [];

  if (payment === 'Paid') clauses.push({ paymentStatus: 'paid' });
  if (payment === 'Pending') clauses.push({ paymentStatus: { $in: ['pending', 'created'] } });
  if (payment === 'Failed') clauses.push({ paymentStatus: { $in: ['failed', 'cancelled'] } });

  if (status === 'Processing') {
    clauses.push({
      $or: [
        { fulfillmentStatus: { $in: ['processing', 'pending_payment'] } },
        {
          $and: [
            { $or: [{ fulfillmentStatus: { $exists: false } }, { fulfillmentStatus: null }] },
            { paymentStatus: { $nin: ['failed', 'cancelled'] } },
          ],
        },
      ],
    });
  }
  if (status === 'Shipped') clauses.push({ fulfillmentStatus: 'shipped' });
  if (status === 'Delivered') clauses.push({ fulfillmentStatus: 'delivered' });
  if (status === 'Cancelled') {
    clauses.push({
      $or: [{ fulfillmentStatus: 'cancelled' }, { paymentStatus: { $in: ['failed', 'cancelled'] } }],
    });
  }

  if (dateFrom || dateTo) {
    const range = {};
    if (dateFrom) range.$gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      range.$lte = end;
    }
    clauses.push({ createdAt: range });
  }

  if (q) {
    const rx = new RegExp(String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    clauses.push({
      $or: [
        { orderNumber: rx },
        { 'customer.name': rx },
        { 'customer.email': rx },
        { 'customer.phone': rx },
        { 'items.name': rx },
      ],
    });
  }

  return clauses.length ? { $and: clauses } : {};
}

async function listOrders(query) {
  const filter = buildOrderListFilter(query);
  const pageNum = Math.max(1, Number(query.page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('items.product', 'name image price variants')
      .lean(),
    Order.countDocuments(filter),
  ]);

  return {
    orders: orders.map((o) => serializeOrder(o)),
    page: pageNum,
    limit: limitNum,
    total,
    pages: Math.ceil(total / limitNum) || 1,
  };
}

async function getRecentOrders(limit = 8) {
  const orders = await Order.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('items.product', 'name image variants')
    .lean();
  return orders.map((o) => serializeOrder(o));
}

async function getOrderById(orderId) {
  const order = await Order.findById(orderId)
    .populate('items.product', 'name image price description type weight variants')
    .populate('user', 'name email phone address')
    .lean();
  if (!order) throw new AppError('Order not found', 404);
  return serializeOrder(order);
}

async function updateOrder(orderId, body) {
  const order = await Order.findById(orderId);
  if (!order) throw new AppError('Order not found', 404);

  const { customer, fulfillmentStatus, taxAmount, shippingAmount } = body;

  if (customer && typeof customer === 'object') {
    order.customer = order.customer || {};
    ['name', 'email', 'phone', 'address', 'city', 'state', 'pincode'].forEach((k) => {
      if (typeof customer[k] === 'string') order.customer[k] = customer[k].trim();
    });
    order.statusHistory.push({
      label: 'Order updated',
      detail: 'Customer details revised',
      at: new Date(),
    });
  }

  if (typeof taxAmount === 'number' && taxAmount >= 0) order.taxAmount = taxAmount;
  if (typeof shippingAmount === 'number' && shippingAmount >= 0) order.shippingAmount = shippingAmount;
  if (typeof taxAmount === 'number' || typeof shippingAmount === 'number') {
    order.totalPrice = order.subtotal + (order.taxAmount || 0) + (order.shippingAmount || 0);
  }

  if (fulfillmentStatus) {
    const allowed = ['pending_payment', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!allowed.includes(fulfillmentStatus)) {
      throw new AppError('Invalid fulfillment status', 400);
    }
    if (order.fulfillmentStatus !== fulfillmentStatus) {
      order.fulfillmentStatus = fulfillmentStatus;
      const labels = {
        pending_payment: 'Awaiting payment',
        processing: 'Processing',
        shipped: 'Shipped',
        delivered: 'Delivered',
        cancelled: 'Cancelled',
      };
      order.statusHistory.push({
        label: 'Status updated',
        detail: labels[fulfillmentStatus] || fulfillmentStatus,
        at: new Date(),
      });
    }
  }

  await order.save();
  const fresh = await Order.findById(order._id)
    .populate('items.product', 'name image price description type weight variants')
    .populate('user', 'name email phone address')
    .lean();

  return serializeOrder(fresh);
}

async function issueInvoiceForOrder(orderId) {
  const order = await Order.findById(orderId)
    .populate('items.product', 'name image price variants')
    .populate('user', 'name email phone address');
  if (!order) throw new AppError('Order not found', 404);
  await ensureInvoiceNumber(order);
  const fresh = await Order.findById(order._id)
    .populate('items.product', 'name image price variants')
    .populate('user', 'name email phone address')
    .lean();
  return serializeOrder(fresh);
}

module.exports = {
  serializeOrder,
  getDashboardStats,
  listOrders,
  getRecentOrders,
  getOrderById,
  updateOrder,
  issueInvoiceForOrder,
};
