const { z } = require('zod');

const createCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  role: z.enum(['user', 'admin']).default('user'),
});

const updateCustomerSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').trim().optional(),
  email: z.string().email('Invalid email address').trim().toLowerCase().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  role: z.enum(['user', 'admin']).optional(),
});

module.exports = {
  createCustomerSchema,
  updateCustomerSchema,
};
