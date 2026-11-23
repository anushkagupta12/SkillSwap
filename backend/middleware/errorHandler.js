const { AppError } = require('../utils/errors');
const { isProd } = require('../config/env');

/** Unknown /api/* route. */
const notFound = (req, res, next) => next(new AppError(404, 'Route not found'));

/**
 * Central error middleware. Known errors map to 4xx with safe messages;
 * everything else becomes a generic 500 (details only go to the server log).
 */
// Express identifies error middleware by its 4-argument signature, so `next` must stay.
const errorHandler = (err, req, res, next) => {
  let status = 500;
  let message = 'Something went wrong';
  let code = 'server_error';
  let errors;

  if (err instanceof AppError) {
    ({ status, message, code, errors } = err);
  } else if (err?.name === 'ValidationError' && err.errors) {
    status = 400;
    code = 'invalid';
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    message = errors[0]?.message || 'Invalid data';
  } else if (err?.name === 'CastError') {
    status = 400;
    code = 'invalid';
    message = 'Invalid id';
  } else if (err?.code === 11000) {
    status = 409;
    code = 'conflict';
    message = 'That already exists';
  } else if (err?.type === 'entity.parse.failed') {
    status = 400;
    code = 'invalid';
    message = 'Malformed JSON body';
  } else if (err?.type === 'entity.too.large') {
    status = 413;
    code = 'too_large';
    message = 'Request body too large';
  } else if (err?.message === 'CORS not allowed') {
    status = 403;
    code = 'forbidden';
    message = 'Origin not allowed';
  }

  if (status >= 500 && process.env.NODE_ENV !== 'test') {
    console.error('[error]', req.method, req.originalUrl, err);
  }

  const body = { success: false, code, message };
  if (errors) body.errors = errors;
  if (!isProd() && status >= 500 && process.env.NODE_ENV !== 'test') body.debug = err?.message;
  res.status(status).json(body);
};

module.exports = { notFound, errorHandler };
