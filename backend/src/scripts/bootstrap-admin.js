require('../config/env');
const bcrypt = require('bcrypt');
const { z } = require('zod');
const prisma = require('../config/prisma');
const { getPasswordRounds } = require('../utils/password');
const { writeAuditLog } = require('../services/audit.service');

const bootstrapSchema = z.object({
  email: z.string().trim().email().max(254),
  name: z.string().trim().min(1).max(120),
  password: z.string().min(12).max(72)
    .refine((password) => Buffer.byteLength(password, 'utf8') <= 72),
});

async function main() {
  const input = bootstrapSchema.safeParse({
    email: process.env.BOOTSTRAP_ADMIN_EMAIL,
    name: process.env.BOOTSTRAP_ADMIN_NAME,
    password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
  });
  if (!input.success) {
    throw new Error('Set a valid bootstrap admin email, name, and 12–72 byte password in the local backend environment.');
  }

  const email = input.data.email.toLowerCase();
  const rounds = getPasswordRounds();
  const passwordHash = await bcrypt.hash(input.data.password, rounds);

  await prisma.$transaction(async (transaction) => {
    const existingAdmin = await transaction.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } });
    if (existingAdmin) throw new Error('An administrator already exists; use the protected admin API to manage roles.');

    const user = await transaction.user.create({
      data: {
        email,
        name: input.data.name.trim(),
        passwordHash,
        role: 'ADMIN',
      },
      select: { id: true },
    });
    await writeAuditLog(transaction, {
      actorId: user.id,
      action: 'admin.bootstrap_created',
      targetType: 'User',
      targetId: user.id,
    });
  }, { isolationLevel: 'Serializable' });

  console.log('Initial administrator created. Remove the BOOTSTRAP_ADMIN_* values from the environment.');
}

main()
  .catch((error) => {
    console.error(error.message.startsWith('Set a valid') || error.message.startsWith('An administrator already exists')
      ? error.message
      : 'Administrator bootstrap failed. Check the database connection and local environment configuration.');
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
