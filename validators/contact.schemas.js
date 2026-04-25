const { z } = require('zod');

const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  message: z.string().trim().min(1).max(8000),
});

module.exports = { contactSchema };
