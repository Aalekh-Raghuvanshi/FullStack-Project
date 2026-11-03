const { z } = require('zod');

const optionalText = (max) => z.string().trim().max(max).nullable().optional();
const emailField = z.string().trim().email().max(254).nullable().optional();
const dateOfBirthField = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD for date of birth.')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value && date <= new Date();
  }, 'Date of birth must be a valid date that is not in the future.')
  .nullable()
  .optional();

const patientCreateSchema = z.object({
  userId: z.string().uuid().nullable().optional(),
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().min(1).max(120).nullable().optional(),
  dateOfBirth: dateOfBirthField,
  // Free-form so new self-described values do not require a database enum migration.
  gender: optionalText(80),
  phone: optionalText(40),
  email: emailField,
  address: optionalText(500),
  emergencyContactName: optionalText(160),
  emergencyContactPhone: optionalText(40),
}).strict();

function nonEmptyPatch(schema) {
  return schema.refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update.');
}

const patientStaffUpdateSchema = nonEmptyPatch(z.object({
  firstName: z.string().trim().min(1).max(120).optional(),
  lastName: z.string().trim().min(1).max(120).nullable().optional(),
  dateOfBirth: dateOfBirthField,
  gender: optionalText(80),
  phone: optionalText(40),
  email: emailField,
  address: optionalText(500),
  emergencyContactName: optionalText(160),
  emergencyContactPhone: optionalText(40),
  isActive: z.boolean().optional(),
}).strict());

const patientSelfUpdateSchema = nonEmptyPatch(z.object({
  phone: optionalText(40),
  email: emailField,
  address: optionalText(500),
  emergencyContactName: optionalText(160),
  emergencyContactPhone: optionalText(40),
}).strict());

const patientParamsSchema = z.object({ patientId: z.string().uuid() }).strict();
const patientListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(100).optional(),
  gender: z.string().trim().min(1).max(80).optional(),
  isActive: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
}).strict();

module.exports = {
  patientCreateSchema,
  patientListQuerySchema,
  patientParamsSchema,
  patientSelfUpdateSchema,
  patientStaffUpdateSchema,
};
