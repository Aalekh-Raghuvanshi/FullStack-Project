const AppError = require('../utils/app-error');

function notFound(req, res, _next) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
      path: req.originalUrl,
    },
  });
}

function errorHandler(error, _req, res, _next) {
  let normalized = error;
  if (error?.code === 'P2002') {
    normalized = new AppError(409, 'CONFLICT', 'A record with these details already exists.');
  } else if (error?.code === 'P2025') {
    normalized = new AppError(404, 'NOT_FOUND', 'The requested record was not found.');
  } else if (error?.code === 'P2003') {
    normalized = new AppError(400, 'INVALID_REFERENCE', 'A referenced record is invalid.');
  }

  const status = Number.isInteger(normalized.status) ? normalized.status : 500;
  const body = {
    error: {
      code: status >= 500 ? 'INTERNAL_SERVER_ERROR' : normalized.code || 'REQUEST_ERROR',
      message: status >= 500 ? 'Internal server error' : normalized.message,
    },
  };
  if (status < 500 && normalized.details) body.error.details = normalized.details;
  res.status(status).json(body);
}

module.exports = { notFound, errorHandler };
