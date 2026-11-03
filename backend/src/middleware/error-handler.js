function notFound(req, res, _next) {
  res.status(404).json({
    error: {
      message: 'Route not found',
      path: req.originalUrl,
    },
  });
}

function errorHandler(error, _req, res, _next) {
  const status = Number.isInteger(error.status) ? error.status : 500;
  res.status(status).json({
    error: {
      message: status >= 500 ? 'Internal server error' : error.message,
    },
  });
}

module.exports = { notFound, errorHandler };
