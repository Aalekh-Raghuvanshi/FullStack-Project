const prisma = require('../config/prisma');
const { serviceName } = require('../utils/service');

function health(_req, res) {
  res.status(200).json({
    status: 'ok',
    service: serviceName,
    timestamp: new Date().toISOString(),
  });
}

async function readiness(_req, res) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.status(200).json({
      status: 'ready',
      service: serviceName,
      checks: { database: 'connected' },
      timestamp: new Date().toISOString(),
    });
  } catch (_error) {
    return res.status(503).json({
      status: 'not_ready',
      service: serviceName,
      checks: { database: 'unavailable' },
      timestamp: new Date().toISOString(),
    });
  }
}

module.exports = { health, readiness };
