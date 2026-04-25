const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { calculateGST } = require('../services/gst.service');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/farms';

async function createDummyOrder() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find or create a dummy product
    let product = await Product.findOne({ name: /ghee/i });
    if (!product) {
      product = await Product.create({
        name: 'Pure Desi Ghee',
        price: 450,
        description: 'Fresh pure desi ghee from Punjab farms',
        status: 'public',
        category: 'dairy',
        variants: [
          { size: '500ml', price: 450, stock: 100 },
          { size: '1ltr', price: 850, stock: 50 }
        ]
      });
      console.log('Created dummy product:', product.name);
    }

    // Calculate GST for Punjab
    const subtotal = 450;
    const gstCalculation = calculateGST(subtotal, 'punjab');

    // Create dummy order with GST
    const order = await Order.create({
      orderNumber: `TEST-${Date.now()}`,
      user: null,
      orderType: 'guest',
      customer: {
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '+919876543210',
        address: '123 Test Street, Model Town',
        city: 'Ludhiana',
        state: 'Punjab',
        pincode: '141001'
      },
      items: [{
        product: product._id,
        name: product.name,
        price: 450,
        quantity: 2,
        lineTotal: 900
      }],
      subtotal: 900,
      taxAmount: 0, // Legacy field
      shippingAmount: 0,
      // GST Fields
      cgst: gstCalculation.cgst,
      sgst: gstCalculation.sgst,
      igst: gstCalculation.igst,
      totalGST: gstCalculation.totalGST * 2, // For 2 items
      gstRate: gstCalculation.gstRate,
      isInterState: gstCalculation.isInterState,
      productId: product._id,
      quantity: 2,
      totalPrice: 900 + (gstCalculation.totalGST * 2),
      currency: 'INR',
      paymentStatus: 'paid',
      orderStatus: 'paid',
      paymentMethod: 'Razorpay',
      fulfillmentStatus: 'processing',
      invoiceNumber: `INV-${Date.now()}`,
      paidAt: new Date(),
      paymentId: 'pay_test_dummy_' + Date.now(),
      statusHistory: [
        {
          label: 'Order placed',
          detail: 'Test order created',
          at: new Date(),
        },
        {
          label: 'Payment received',
          detail: 'Test payment completed',
          at: new Date(),
        }
      ],
      paymentAttempts: [{
        razorpayOrderId: 'order_test_' + Date.now(),
        amount: 900 + (gstCalculation.totalGST * 2),
        status: 'captured',
        signatureVerified: true,
        rawPayload: { test: true }
      }]
    });

    console.log('Dummy order created successfully!');
    console.log('Order ID:', order._id);
    console.log('Order Number:', order.orderNumber);
    console.log('Invoice Number:', order.invoiceNumber);
    console.log('Total GST:', order.totalGST);
    console.log('CGST:', order.cgst);
    console.log('SGST:', order.sgst);
    console.log('Total Amount:', order.totalPrice);

    // Create another order for inter-state (IGST) testing
    const gstCalculationIGST = calculateGST(450, 'maharashtra');
    
    const orderIGST = await Order.create({
      orderNumber: `TEST-IGST-${Date.now()}`,
      user: null,
      orderType: 'guest',
      customer: {
        name: 'Mumbai Customer',
        email: 'mumbai@example.com',
        phone: '+919876543211',
        address: '456 Market Street, Bandra',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400050'
      },
      items: [{
        product: product._id,
        name: product.name,
        price: 450,
        quantity: 1,
        lineTotal: 450
      }],
      subtotal: 450,
      taxAmount: 0,
      shippingAmount: 0,
      // GST Fields - IGST for inter-state
      cgst: 0,
      sgst: 0,
      igst: gstCalculationIGST.totalGST,
      totalGST: gstCalculationIGST.totalGST,
      gstRate: gstCalculationIGST.gstRate,
      isInterState: gstCalculationIGST.isInterState,
      productId: product._id,
      quantity: 1,
      totalPrice: 450 + gstCalculationIGST.totalGST,
      currency: 'INR',
      paymentStatus: 'paid',
      orderStatus: 'paid',
      paymentMethod: 'Razorpay',
      fulfillmentStatus: 'processing',
      invoiceNumber: `INV-IGST-${Date.now()}`,
      paidAt: new Date(),
      paymentId: 'pay_test_igst_' + Date.now(),
      statusHistory: [
        {
          label: 'Order placed',
          detail: 'IGST test order created',
          at: new Date(),
        },
        {
          label: 'Payment received',
          detail: 'IGST test payment completed',
          at: new Date(),
        }
      ],
      paymentAttempts: [{
        razorpayOrderId: 'order_test_igst_' + Date.now(),
        amount: 450 + gstCalculationIGST.totalGST,
        status: 'captured',
        signatureVerified: true,
        rawPayload: { test: true }
      }]
    });

    console.log('\nIGST order created successfully!');
    console.log('Order ID:', orderIGST._id);
    console.log('Order Number:', orderIGST.orderNumber);
    console.log('Invoice Number:', orderIGST.invoiceNumber);
    console.log('Total GST (IGST):', orderIGST.totalGST);
    console.log('Total Amount:', orderIGST.totalPrice);

    console.log('\nYou can now test invoices at:');
    console.log(`Punjab (CGST+SGST): http://localhost:3000/api/invoice/view/${order._id}`);
    console.log(`Maharashtra (IGST): http://localhost:3000/api/invoice/view/${orderIGST._id}`);

  } catch (error) {
    console.error('Error creating dummy order:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
createDummyOrder();
