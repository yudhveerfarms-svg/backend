const { z } = require('zod');

const productStatus = z.enum(['public', 'draft']);

const variantSchema = z.object({
  size: z.string().trim().min(1).max(120),
  price: z.coerce.number().min(0),
  stock: z.coerce.number().int().min(0),
  sku: z.string().trim().max(80).optional().default(''),
});

const productBaseSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(8000),
  category: z.string().trim().min(1).max(120),
  sku: z.string().trim().min(1).max(80),
  status: productStatus.optional().default('draft'),
  price: z.coerce.number().min(0).optional().default(0),
  discount: z.coerce.number().min(0).max(100).optional().default(0),
  images: z.array(z.string().trim().min(1).max(2000)).optional().default([]),
  variants: z.array(variantSchema).optional().default([]),
});

const productUpdateSchema = productBaseSchema.partial().extend({
  images: z.array(z.string().trim().min(1).max(2000)).optional(),
  variants: z.array(variantSchema).optional(),
}).refine((b) => Object.keys(b).length > 0, {
  message: 'No updates provided',
});

module.exports = { productBaseSchema, productUpdateSchema, variantSchema, productStatus };

