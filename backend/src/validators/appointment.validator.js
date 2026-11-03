const { z } = require('zod');

const appointmentStatus = z.enum([
  'SCHEDULED',
  'CONFIRMED',
  'CHECKED_IN',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
]);

const utcTimestamp = z.string()
  .datetime({ offset: true, message: 'Use an ISO 8601 timestamp with a timezone offset.' })
  .transform((value) => new Date(value));

function requireEndAfterStart(schema) {
  return schema.superRefine((value, context) => {
    if (value.scheduledStart && value.scheduledEnd && value.scheduledEnd <= value.scheduledStart) {
      context.addIssue({
        code: 'custom',
        path: ['scheduledEnd'],
        message: 'Appointment end time must be after its start time.',
      });
    }
  });
}

const appointmentCreateSchema = requireEndAfterStart(z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  scheduledStart: utcTimestamp,
  scheduledEnd: utcTimestamp,
  visitCategory: z.string().trim().min(1).max(120),
}).strict());

const appointmentRescheduleSchema = requireEndAfterStart(z.object({
  scheduledStart: utcTimestamp,
  scheduledEnd: utcTimestamp,
}).strict());

const appointmentUpdateSchema = z.object({
  status: appointmentStatus,
}).strict();

const appointmentParamsSchema = z.object({ appointmentId: z.string().uuid() }).strict();

const appointmentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: appointmentStatus.optional(),
  from: utcTimestamp.optional(),
  to: utcTimestamp.optional(),
  patientId: z.string().uuid().optional(),
  doctorId: z.string().uuid().optional(),
}).strict().superRefine((value, context) => {
  if (value.from && value.to && value.from >= value.to) {
    context.addIssue({
      code: 'custom',
      path: ['to'],
      message: 'The to timestamp must be later than the from timestamp.',
    });
  }
});

module.exports = {
  appointmentCreateSchema,
  appointmentListQuerySchema,
  appointmentParamsSchema,
  appointmentRescheduleSchema,
  appointmentUpdateSchema,
};
