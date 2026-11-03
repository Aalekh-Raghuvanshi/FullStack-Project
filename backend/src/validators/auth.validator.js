const { z } = require('zod');

const passwordSchema = z.string()
  .min(12, 'Password must be at least 12 characters long.')
  .max(72, 'Password must be at most 72 bytes long.')
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password must be at most 72 bytes long.');

const registerSchema = z.object({
  email: z.string().trim().email().max(254),
  password: passwordSchema,
  name: z.string().trim().min(1).max(120),
}).strict();

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(72)
    .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password must be at most 72 bytes long.'),
}).strict();

module.exports = { loginSchema, registerSchema };
