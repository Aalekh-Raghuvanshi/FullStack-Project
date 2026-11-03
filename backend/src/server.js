const app = require('./app');
const { port } = require('./config/env');
const prisma = require('./config/prisma');

const server = app.listen(port, () => {
  console.log(`MediCore AI API listening on port ${port}`);
});

async function shutdown(signal) {
  console.log(`${signal} received; shutting down`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
