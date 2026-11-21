/** Returns a copy of `obj` without keys whose value is undefined (so they never reach $set / create). */
const definedOnly = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

/** Reads a query/body value that must be a plain string. Objects/arrays (NoSQL injection) are rejected. */
const optionalString = (value, { max = 100, label = 'parameter' } = {}) => {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    const { AppError } = require('./errors');
    throw new AppError(400, `Invalid ${label}`);
  }
  return value.trim().slice(0, max);
};

/** Escapes a string for literal use inside a RegExp. */
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Parses an integer query value and clamps it into [min, max]. */
const clampInt = (value, fallback, min, max) => {
  const n = Math.trunc(Number(value));
  return Math.min(Math.max(Number.isFinite(n) && n !== 0 ? n : fallback, min), max);
};

module.exports = { definedOnly, optionalString, escapeRegex, clampInt };
