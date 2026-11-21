const rateLimit = require('express-rate-limit');

const make = ({ windowMs, max, message }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    // Tests hammer the same endpoints from one IP.
    skip: () => process.env.NODE_ENV === 'test' && process.env.RATE_LIMIT_IN_TEST !== 'true',
    handler: (req, res) => res.status(429).json({ success: false, code: 'rate_limited', message }),
  });

/** Credential endpoints: login, register, forgot/reset password, email verification. */
const authLimiter = make({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 10,
  message: 'Too many attempts. Please try again in a few minutes.',
});

/** OAuth start/callback: browser redirects, so a bounce to the login page is the only sensible answer. */
const oauthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test' && process.env.RATE_LIMIT_IN_TEST !== 'true',
  handler: (req, res) => {
    const base = (process.env.CLIENT_URLS || process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();
    res.redirect(`${base.replace(/\/+$/, '')}/login?oauth_error=rate_limited`);
  },
});

/** Cheap session endpoints (me, refresh, logout). */
const sessionLimiter = make({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: 'Too many requests. Please slow down.',
});

/** Whole API safety net. */
const apiLimiter = make({
  windowMs: 60 * 1000,
  max: Number(process.env.API_RATE_LIMIT_MAX) || 300,
  message: 'Too many requests. Please slow down.',
});

module.exports = { authLimiter, oauthLimiter, sessionLimiter, apiLimiter };
