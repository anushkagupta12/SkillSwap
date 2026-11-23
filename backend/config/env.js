require('dotenv').config();

const REQUIRED = ['JWT_SECRET', 'MONGO_URI'];

/** Fail fast at boot if the app can't possibly work. */
function validateEnv() {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  if (isProd() && process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }
}

const isProd = () => process.env.NODE_ENV === 'production';

/**
 * Allowed browser origins. CLIENT_URLS is a comma separated list;
 * CLIENT_URL (single value) is still honoured for backwards compatibility.
 */
const clientOrigins = () =>
  (process.env.CLIENT_URLS || process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);

const num = (key, fallback) => {
  const n = Number(process.env[key]);
  return Number.isFinite(n) ? n : fallback;
};

module.exports = {
  validateEnv,
  isProd,
  clientOrigins,
  num,
  requireEmailVerification: () => process.env.REQUIRE_EMAIL_VERIFICATION === 'true',
  swapCooldownHours: () => num('SWAP_COOLDOWN_HOURS', 72),
  presenceDebounceMs: () => num('PRESENCE_DEBOUNCE_MS', 5000),
};
