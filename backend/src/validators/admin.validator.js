const { z } = require('zod');

const userRoleSchema = z.object({ role: z.enum(['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PATIENT']) }).strict();
const userStatusSchema = z.object({ isActive: z.boolean() }).strict();
const patientAccessSchema = z.object({
  patientId: z.string().uuid(),
  userId: z.string().uuid(),
}).strict();
const uuidParamsSchema = z.object({ userId: z.string().uuid().optional(), accessId: z.string().uuid().optional() }).strict();
const listUsersQuerySchema = z.object({
  take: z.coerce.number().int().min(1).max(100).default(50),
  skip: z.coerce.number().int().min(0).max(100000).default(0),
}).strict();

module.exports = {
  listUsersQuerySchema,
  patientAccessSchema,
  userRoleSchema,
  userStatusSchema,
  uuidParamsSchema,
};
