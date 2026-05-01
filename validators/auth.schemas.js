const { z } = require('zod');

const signupSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  email: z.string().trim().email().max(254).transform((e) => e.toLowerCase()),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
  phone: z.union([z.string().max(30), z.literal('')]).optional().default(''),
  address: z.union([z.string().max(2000), z.literal('')]).optional().default(''),
});

const loginSchema = z.object({
  email: z.string().trim().email().transform((e) => e.toLowerCase()),
  password: z.string().min(1, 'Password is required').max(128),
});

const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    phone: z.string().trim().max(30).optional(),
    address: z.string().trim().max(2000).optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: 'At least one field is required' });

const firebaseLoginSchema = z.object({
  idToken: z.string().min(1, 'Firebase ID token is required'),
});

module.exports = { signupSchema, loginSchema, updateProfileSchema, firebaseLoginSchema };
