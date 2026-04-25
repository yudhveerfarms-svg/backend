const { z } = require('zod');
const { objectId } = require('./common.schemas');

const checkoutItemSchema = z.object({
  productId: objectId,
  quantity: z.coerce.number().int().min(1).max(999),
  selectedSize: z.string().max(120).optional().default(''),
});

const customerSchema = z.object({
  name: z.string().trim().max(200).optional(),
  email: z.union([z.string().trim().email().max(254), z.literal('')]).optional(),
  phone: z.string().trim().max(30).optional(),
  address: z.string().trim().max(2000).optional(),
  city: z.string().trim().max(120).optional(),
  state: z.string().trim().max(120).optional(),
  pincode: z.string().trim().max(20).optional(),
  selectedSize: z.string().max(120).optional(),
});

const createOrderSchema = z.object({
  items: z.array(checkoutItemSchema).min(1, 'At least one item is required').max(50),
  customer: customerSchema.optional().default({}),
});

const verifyPaymentSchema = z.object({
  orderId: objectId,
  razorpayOrderId: z.string().min(1).max(200),
  razorpayPaymentId: z.string().min(1).max(200),
  razorpaySignature: z.string().min(1).max(500),
  meta: z.record(z.string(), z.any()).optional().default({}),
});

const markFailedSchema = z.object({
  orderId: objectId,
  razorpayOrderId: z.string().min(1).max(200),
  reason: z.string().max(500).optional().default('Payment failed'),
  meta: z.record(z.string(), z.any()).optional().default({}),
});

const orderIdParamSchema = z.object({
  orderId: objectId,
});

module.exports = {
  createOrderSchema,
  verifyPaymentSchema,
  markFailedSchema,
  orderIdParamSchema,
};
