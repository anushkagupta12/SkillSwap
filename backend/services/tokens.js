const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { isProd } = require('../config/env');

const REFRESH_COOKIE = 'ss_refresh';
const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const accessExpire = () => process.env.JWT_ACCESS_EXPIRE || '15m';
const refreshExpire = () => process.env.JWT_REFRESH_EXPIRE || '7d';

/** Short lived token, sent as `Authorization: Bearer`. Kept in memory by the client. */
const signAccess = (user) =>
  jwt.sign({ id: String(user._id), tv: user.tokenVersion || 0, typ: 'access' }, process.env.JWT_SECRET, {
    expiresIn: accessExpire(),
  });

/** Longer lived token, only ever stored in an httpOnly cookie. */
const signRefresh = (user) =>
  jwt.sign({ id: String(user._id), tv: user.tokenVersion || 0, typ: 'refresh' }, process.env.JWT_SECRET, {
    expiresIn: refreshExpire(),
  });

/** Verifies signature, expiry and token type. Throws on any problem. */
const verifyToken = (token, typ) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (decoded.typ !== typ) throw new Error('Wrong token type');
  return decoded;
};

const cookieOptions = () => ({
  httpOnly: true,
  secure: isProd(),
  // Frontend (Vercel) and API live on different sites in production.
  sameSite: isProd() ? 'none' : 'lax',
  path: '/api/auth',
});

const setRefreshCookie = (res, user) =>
  res.cookie(REFRESH_COOKIE, signRefresh(user), { ...cookieOptions(), maxAge: REFRESH_MAX_AGE_MS });

const clearRefreshCookie = (res) => res.clearCookie(REFRESH_COOKIE, cookieOptions());

/** Random one-time token (sent to the user) + its sha256 (stored in the DB). */
const makeOneTimeToken = () => {
  const raw = crypto.randomBytes(32).toString('hex');
  return { raw, hash: hashToken(raw) };
};
const hashToken = (raw) => crypto.createHash('sha256').update(String(raw)).digest('hex');

module.exports = {
  REFRESH_COOKIE,
  signAccess,
  signRefresh,
  verifyToken,
  setRefreshCookie,
  clearRefreshCookie,
  makeOneTimeToken,
  hashToken,
};
