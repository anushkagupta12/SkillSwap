const DEFAULT_CODES = {
  400: 'invalid',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  429: 'rate_limited',
};

/** An error that is safe to show to the client. */
class AppError extends Error {
  constructor(status, message, { code, errors } = {}) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code || DEFAULT_CODES[status] || 'error';
    this.errors = errors;
  }
}

module.exports = { AppError };
