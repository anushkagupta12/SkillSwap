const { validationResult } = require('express-validator');
const { AppError } = require('./errors');

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

/** Strict check (mongoose.isValidObjectId also accepts any 12 character string). */
const isObjectId = (v) => typeof v === 'string' && OBJECT_ID.test(v);

/** Express middleware: rejects the request if any named :param is not a valid ObjectId. */
const validateIdParams =
  (...names) =>
  (req, res, next) => {
    for (const n of names) {
      if (!isObjectId(req.params[n])) return next(new AppError(400, 'Invalid id'));
    }
    next();
  };

/** Express middleware: converts express-validator results into a consistent AppError. */
const runValidation = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const errors = result.array().map((e) => ({ field: e.path, message: e.msg }));
  next(new AppError(400, errors[0].message, { errors }));
};

module.exports = { isObjectId, validateIdParams, runValidation };
