const { z } = require('zod');

const optionalText = (max) => z.string().trim().max(max).nullable().optional();
const emailField = z.string().trim().email().max(254).nullable().optional();
const doctorAvailability = z.enum(['AVAILABLE', 'BUSY', 'OFF_DUTY', 'ON_LEAVE']);

const doctorCreateSchema = z.object({
  userId: z.string().uuid().nullable().optional(),
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().min(1).max(120),
  specialization: z.string().trim().min(1).max(160),
  department: z.string().trim().min(1).max(120),
  phone: optionalText(40),
  email: emailField,
  availability: doctorAvailability.optional(),
}).strict();

const doctorUpdateSchema = z.object({
  userId: z.string().uuid().nullable().optional(),
  firstName: z.string().trim().min(1).max(120).optional(),
  lastName: z.string().trim().min(1).max(120).optional(),
  specialization: z.string().trim().min(1).max(160).optional(),
  department: z.string().trim().min(1).max(120).optional(),
  phone: optionalText(40),
  email: emailField,
  availability: doctorAvailability.optional(),
  isActive: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update.');

const doctorParamsSchema = z.object({ doctorId: z.string().uuid() }).strict();
const doctorListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(100).optional(),
  department: z.string().trim().min(1).max(120).optional(),
  specialization: z.string().trim().min(1).max(160).optional(),
  availability: doctorAvailability.optional(),
  isActive: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
}).strict();

module.exports = { doctorCreateSchema, doctorListQuerySchema, doctorParamsSchema, doctorUpdateSchema };
