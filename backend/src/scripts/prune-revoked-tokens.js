require('../config/env');
const prisma = require('../config/prisma');

async function main() {
  const result = await prisma.revokedToken.deleteMany({ where: { expiresAt: { lte: new Date() } } });
  console.log(`Removed ${result.count} expired token revocation records.`);
}

main()
  .catch(() => {
    console.error('Expired token cleanup failed.');
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
