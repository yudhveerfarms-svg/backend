const mongoose = require('mongoose');

const orderItemSchema = mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const paymentAttemptSchema = mongoose.Schema(
  {
    razorpayOrderId: {
      type: String,
      required: true,
    },
    razorpayPaymentId: {
      type: String,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['created', 'authorized', 'captured', 'failed', 'refunded'],
      default: 'created',
    },
    signatureVerified: {
      type: Boolean,
      default: false,
    },
    failureReason: {
      type: String,
      default: null,
    },
    rawPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

const orderSchema = mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    orderType: {
      type: String,
      enum: ['guest', 'authenticated'],
      default: 'guest',
      index: true,
    },
    customer: {
      name: String,
      email: String,
      phone: String,
      address: String,
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      pincode: { type: String, default: '' },
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: function validator(items) {
          return Array.isArray(items) && items.length > 0;
        },
        message: 'At least one order item is required',
      },
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    shippingAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // GST Fields
    cgst: {
      type: Number,
      default: 0,
      min: 0,
    },
    sgst: {
      type: Number,
      default: 0,
      min: 0,
    },
    igst: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalGST: {
      type: Number,
      default: 0,
      min: 0,
    },
    gstRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    isInterState: {
      type: Boolean,
      default: false,
    },
    paymentMethod: {
      type: String,
      default: 'Razorpay',
    },
    invoiceNumber: {
      type: String,
      default: null,
      index: true,
      sparse: true,
    },
    fulfillmentStatus: {
      type: String,
      enum: ['pending_payment', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending_payment',
      index: true,
    },
    statusHistory: {
      type: [
        {
          label: String,
          detail: String,
          at: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    paymentStatus: {
      type: String,
      enum: ['created', 'pending', 'paid', 'failed', 'cancelled', 'refunded'],
      default: 'created',
      index: true,
    },
    paymentAttempts: {
      type: [paymentAttemptSchema],
      default: [],
    },
    paidAt: {
      type: Date,
      default: null,
    },
    paymentId: {
      type: String,
      default: null,
    },
    orderStatus: {
      type: String,
      enum: ['created', 'pending', 'paid', 'failed', 'cancelled', 'refunded'],
      default: 'created',
      index: true,
    },
  },
  { timestamps: true }
);

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
