const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { apiPrefix, frontendUrl, nodeEnv } = require('./config/env');
const healthRoutes = require('./routes/health.routes');
const { notFound, errorHandler } = require('./middleware/error-handler');

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: frontendUrl }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(nodeEnv === 'production' ? 'combined' : 'dev'));

// Keep the basic liveness route independent of the database and available at
// both /health and the configured, versioned API prefix.
app.get('/health', require('./controllers/health.controller').health);
app.get('/ready', require('./controllers/health.controller').readiness);
app.use(apiPrefix, healthRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
