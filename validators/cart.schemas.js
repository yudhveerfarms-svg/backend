const { z } = require('zod');
const { objectId } = require('./common.schemas');

const addCartSchema = z.object({
  productId: objectId,
  quantity: z.coerce.number().int().min(1).max(999).optional().default(1),
  selectedSize: z.string().max(120).optional().default(''),
});

const updateCartItemSchema = z.object({
  productId: objectId,
  quantity: z.coerce.number().int().min(0).max(999),
  selectedSize: z.string().max(120).optional().default(''),
});

const deleteCartItemSchema = z.object({
  productId: objectId,
  selectedSize: z.string().max(120).optional().default(''),
});

const mergeCartSchema = z.object({
  items: z
    .array(
      z.object({
        productId: objectId,
        quantity: z.coerce.number().int().min(1).max(999).optional().default(1),
        selectedSize: z.string().max(120).optional().default(''),
      })
    )
    .max(100),
});

module.exports = { addCartSchema, updateCartItemSchema, deleteCartItemSchema, mergeCartSchema };
