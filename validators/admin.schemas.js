const { z } = require('zod');
const { objectId } = require('./common.schemas');

const fulfillmentEnum = z.enum(['pending_payment', 'processing', 'shipped', 'delivered', 'cancelled']);

const customerPatchSchema = z.object({
  name: z.string().trim().max(200).optional(),
  email: z.union([z.string().trim().email().max(254), z.literal('')]).optional(),
  phone: z.string().trim().max(30).optional(),
  address: z.string().trim().max(2000).optional(),
  city: z.string().trim().max(120).optional(),
  state: z.string().trim().max(120).optional(),
  pincode: z.string().trim().max(20).optional(),
});

const patchOrderSchema = z.object({
  customer: customerPatchSchema.optional(),
  fulfillmentStatus: fulfillmentEnum.optional(),
  taxAmount: z.coerce.number().min(0).optional(),
  shippingAmount: z.coerce.number().min(0).optional(),
});

const listOrdersQuerySchema = z.object({
  q: z.string().max(200).optional().default(''),
  payment: z.union([z.literal(''), z.enum(['Paid', 'Pending', 'Failed'])]).optional().default(''),
  status: z
    .union([z.literal(''), z.enum(['Processing', 'Shipped', 'Delivered', 'Cancelled'])])
    .optional()
    .default(''),
  dateFrom: z.string().max(32).optional().default(''),
  dateTo: z.string().max(32).optional().default(''),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

const orderIdParamSchema = z.object({
  orderId: objectId,
});

module.exports = {
  patchOrderSchema,
  listOrdersQuerySchema,
  orderIdParamSchema,
};
