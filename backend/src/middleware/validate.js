const AppError = require('../utils/app-error');

function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(new AppError(
        400,
        'VALIDATION_ERROR',
        'Request validation failed.',
        result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
      ));
    }
    if (source === 'body') {
      req.body = result.data;
    } else {
      req.validated = { ...req.validated, [source]: result.data };
    }
    return next();
  };
}

module.exports = validate;
