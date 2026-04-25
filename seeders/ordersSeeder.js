/**
 * Seeds dummy orders for testing the admin panel.
 *
 * Env:
 *  - ORDERS_SEED_COUNT (default: 35)
 *  - ORDERS_SEED_CLEAR=1 (optional) - deletes existing orders before seeding
 *  - ORDERS_SEED_ATTACH_USERS=1 (optional) - creates a few dummy users and links orders
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(list) {
  return list[randInt(0, list.length - 1)];
}

function sample(list, n) {
  const copy = [...list];
  const out = [];
  while (copy.length && out.length < n) {
    out.push(copy.splice(randInt(0, copy.length - 1), 1)[0]);
  }
  return out;
}

function createOrderNumber(i) {
  return `ORD-SEED-${Date.now()}-${i}-${randInt(1000, 9999)}`;
}

function fakeRazorpayId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 12)}`;
}

async function ensureProducts() {
  const existing = await Product.find({}).lean();
  if (existing.length) return existing;

  const seeded = await Product.insertMany([
    {
      name: 'Traditional Bilona A2 Desi Ghee',
      type: 'Dairy Product',
      weight: '1 Kg',
      price: 1299,
      description: 'Authentic traditional ghee made from A2 desi cow milk using the bilona method.',
      image:
        'https://images.unsplash.com/photo-1601050690597-df0568f70950?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    },
    {
      name: 'Stone-Ground Aata',
      type: 'Flour',
      weight: '5 Kg',
      price: 500,
      description: 'Stone-ground whole wheat aata that preserves natural fiber and taste.',
      image:
        'https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    },
    {
      name: 'Premium Quality Natural Honey',
      type: 'Honey',
      weight: '500g',
      price: 399,
      description: 'Raw, unprocessed honey rich in natural enzymes.',
      image:
        'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    },
    {
      name: 'Cold-Pressed Mustard Oil',
      type: 'Oil',
      weight: '1 Litre',
      price: 299,
      description: 'Pure cold-pressed mustard oil extracted without heat.',
      image:
        'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    },
    {
      name: 'Organic Desi Gur (Jaggery)',
      type: 'Pantry',
      weight: '1 Kg',
      price: 250,
      description: 'Natural jaggery made from pure sugarcane juice.',
      image:
        'https://images.unsplash.com/photo-1604335399105-0f3b1d0ffed2?auto=format&fit=crop&w=1000&q=80',
    },
  ]);
  return seeded.map((p) => (p.toObject ? p.toObject() : p));
}

async function ensureDummyUsers() {
  const password = await bcrypt.hash('password123', 10);
  const emails = ['demo1@yudhveerfarms.com', 'demo2@yudhveerfarms.com', 'demo3@yudhveerfarms.com'];
  const users = [];
  for (const email of emails) {
    let u = await User.findOne({ email });
    if (!u) {
      u = await User.create({
        name: `Demo ${email.split('@')[0]}`,
        email,
        password,
        role: 'user',
        phone: `98${randInt(10000000, 99999999)}`,
        address: 'Muktsar, Punjab',
      });
    }
    users.push(u);
  }
  return users;
}

function buildTimeline({ createdAt, paymentStatus, fulfillmentStatus, invoiceNumber }) {
  const base = [{ label: 'Order placed', detail: 'Created via seed data', at: createdAt }];
  if (paymentStatus === 'paid') {
    base.push({ label: 'Payment received', detail: 'Paid via Razorpay (seed)', at: new Date(createdAt.getTime() + 25e5) });
    base.push({ label: 'Processing', detail: 'Order is being prepared', at: new Date(createdAt.getTime() + 30e5) });
  }
  if (fulfillmentStatus === 'shipped') {
    base.push({ label: 'Shipped', detail: 'Handed over to courier', at: new Date(createdAt.getTime() + 60e5) });
  }
  if (fulfillmentStatus === 'delivered') {
    base.push({ label: 'Delivered', detail: 'Delivered to customer', at: new Date(createdAt.getTime() + 120e5) });
  }
  if (fulfillmentStatus === 'cancelled' || paymentStatus === 'failed' || paymentStatus === 'cancelled') {
    base.push({ label: 'Cancelled', detail: 'Cancelled / failed payment', at: new Date(createdAt.getTime() + 15e5) });
  }
  if (invoiceNumber) {
    base.push({ label: 'Invoice issued', detail: invoiceNumber, at: new Date(createdAt.getTime() + 35e5) });
  }
  return base;
}

function mapFulfillment(paymentStatus) {
  if (paymentStatus === 'paid') {
    return pick(['processing', 'shipped', 'delivered']);
  }
  if (paymentStatus === 'failed' || paymentStatus === 'cancelled') return 'cancelled';
  return 'pending_payment';
}

function mapPaymentAttempt(paymentStatus, amount) {
  const base = {
    razorpayOrderId: fakeRazorpayId('order'),
    amount,
    status: 'created',
    signatureVerified: false,
    rawPayload: { seeded: true },
  };

  if (paymentStatus === 'paid') {
    return [
      {
        ...base,
        razorpayPaymentId: fakeRazorpayId('pay'),
        status: 'captured',
        signatureVerified: true,
      },
    ];
  }

  if (paymentStatus === 'failed' || paymentStatus === 'cancelled') {
    return [
      {
        ...base,
        razorpayPaymentId: fakeRazorpayId('pay'),
        status: 'failed',
        signatureVerified: false,
        failureReason: 'Seeded failure',
      },
    ];
  }

  return [base];
}

async function seedOrders() {
  const count = Math.max(1, Number(process.env.ORDERS_SEED_COUNT || 35));
  const clear = ['1', 'true', 'yes'].includes(String(process.env.ORDERS_SEED_CLEAR || '').toLowerCase());
  const attachUsers = ['1', 'true', 'yes'].includes(String(process.env.ORDERS_SEED_ATTACH_USERS || '').toLowerCase());

  await connectDB();

  if (clear) {
    await Order.deleteMany({});
    console.log('[orders-seeder] Cleared existing orders');
  }

  const products = await ensureProducts();
  const users = attachUsers ? await ensureDummyUsers() : [];

  const names = ['Aman Singh', 'Simran Kaur', 'Rohit Sharma', 'Neha Verma', 'Harpreet Singh', 'Priya Gupta'];
  const cities = ['Muktsar', 'Bathinda', 'Ludhiana', 'Chandigarh', 'Patiala'];
  const states = ['Punjab', 'Haryana', 'Delhi'];

  const orders = [];

  for (let i = 0; i < count; i += 1) {
    const paymentStatus = pick(['paid', 'paid', 'paid', 'pending', 'failed']); // bias towards paid
    const fulfillmentStatus = mapFulfillment(paymentStatus);

    const selectedProducts = sample(products, randInt(1, Math.min(3, products.length)));
    const items = selectedProducts.map((p) => {
      const quantity = randInt(1, 4);
      const lineTotal = Number(p.price) * quantity;
      return {
        product: p._id,
        name: p.name,
        price: Number(p.price),
        quantity,
        lineTotal,
      };
    });

    const subtotal = items.reduce((s, it) => s + it.lineTotal, 0);
    const taxAmount = Math.round(subtotal * 0.02);
    const shippingAmount = subtotal >= 2000 ? 0 : 70;
    const totalPrice = subtotal + taxAmount + shippingAmount;

    const createdAt = new Date(Date.now() - randInt(0, 45) * 24 * 60 * 60 * 1000 - randInt(0, 10) * 60 * 60 * 1000);
    const paidAt = paymentStatus === 'paid' ? new Date(createdAt.getTime() + randInt(10, 120) * 60 * 1000) : null;

    const attachUser = users.length && Math.random() < 0.5;
    const user = attachUser ? pick(users) : null;

    const customerName = user?.name || pick(names);
    const customerEmail = user?.email || `customer${randInt(1000, 9999)}@mail.com`;
    const customerPhone = user?.phone || `9${randInt(100000000, 999999999)}`;
    const city = pick(cities);
    const state = pick(states);
    const pincode = String(randInt(140000, 160000));
    const address = `House ${randInt(1, 200)}, ${city}`;

    const invoiceNumber = paymentStatus === 'paid' && Math.random() < 0.55 ? `INV-${new Date().getFullYear()}-${String(1000 + i).padStart(4, '0')}` : null;

    const timeline = buildTimeline({ createdAt, paymentStatus, fulfillmentStatus, invoiceNumber });
    const paymentAttempts = mapPaymentAttempt(paymentStatus, subtotal);

    orders.push({
      orderNumber: createOrderNumber(i),
      user: user?._id || null,
      orderType: user ? 'authenticated' : 'guest',
      customer: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        address,
        city,
        state,
        pincode,
      },
      items,
      subtotal,
      taxAmount,
      shippingAmount,
      paymentMethod: 'Razorpay',
      invoiceNumber,
      fulfillmentStatus,
      statusHistory: timeline,
      productId: items[0].product,
      quantity: items.reduce((s, it) => s + it.quantity, 0),
      totalPrice,
      currency: 'INR',
      paymentStatus,
      orderStatus: paymentStatus,
      paymentAttempts,
      paidAt,
      paymentId: paymentStatus === 'paid' ? paymentAttempts[0].razorpayPaymentId : null,
      createdAt,
      updatedAt: new Date(createdAt.getTime() + randInt(1, 6) * 60 * 60 * 1000),
    });
  }

  await Order.insertMany(orders, { ordered: true });
  console.log(`[orders-seeder] Seeded ${orders.length} orders`);
}

async function run() {
  await seedOrders();
}

if (require.main === module) {
  run()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error('[orders-seeder]', e);
      process.exit(1);
    });
}

module.exports = { seedOrders, run };

