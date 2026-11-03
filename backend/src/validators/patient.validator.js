const { z } = require('zod');

const patientParamsSchema = z.object({ patientId: z.string().uuid() }).strict();

module.exports = { patientParamsSchema };
