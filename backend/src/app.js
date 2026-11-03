const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const prisma = require('./config/prisma');
const { apiPrefix, frontendUrl, nodeEnv } = require('./config/env');
const healthRoutes = require('./routes/health.routes');
const createAdminRouter = require('./routes/admin.routes');
const createAuthRouter = require('./routes/auth.routes');
const createPatientRouter = require('./routes/patient.routes');
const { notFound, errorHandler } = require('./middleware/error-handler');

function createApp({
  prismaClient = prisma,
  jwtSecret,
  passwordRounds,
  tokenLifetimeSeconds,
  apiPrefix: prefix = apiPrefix,
  logging = true,
} = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: frontendUrl }));
  app.use(express.json({ limit: '1mb' }));
  if (logging) app.use(morgan(nodeEnv === 'production' ? 'combined' : 'dev'));

  // Keep liveness independent of database availability.
  app.get('/health', require('./controllers/health.controller').health);
  app.get('/ready', require('./controllers/health.controller').readiness);
  app.use(prefix, healthRoutes);
  app.use(`${prefix}/auth`, createAuthRouter({ prismaClient, jwtSecret, passwordRounds, tokenLifetimeSeconds }));
  app.use(`${prefix}/admin`, createAdminRouter({ prismaClient, jwtSecret }));
  app.use(`${prefix}/patients`, createPatientRouter({ prismaClient, jwtSecret }));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

const app = createApp();
app.createApp = createApp;

module.exports = app;
