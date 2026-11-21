const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { AppError } = require('../utils/errors');
const { clientOrigins } = require('../config/env');

const FETCH_TIMEOUT_MS = 8000;

/** JSON request with a timeout. The error text never includes response bodies (they may hold tokens). */
async function request(url, options = {}) {
  const res = await fetch(url, { ...options, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${new URL(url).host} responded ${res.status}`);
  return res.json();
}

/**
 * Supported providers. Each one only has to say where to send the user, where to
 * swap the code for a token, and how to turn the token into { id, email, emailVerified, name }.
 * Adding a provider = adding an entry here (+ its env vars).
 */
const PROVIDERS = {
  google: {
    label: 'Google',
    envPrefix: 'GOOGLE',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scope: 'openid email profile',
    extraAuthParams: { prompt: 'select_account' },
    async profile(accessToken) {
      const p = await request('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return {
        id: String(p.sub),
        email: p.email,
        emailVerified: p.email_verified === true || p.email_verified === 'true',
        name: p.name,
      };
    },
  },
  github: {
    label: 'GitHub',
    envPrefix: 'GITHUB',
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scope: 'read:user user:email',
    extraAuthParams: {},
    async profile(accessToken) {
      const headers = {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'SkillSwap',
      };
      const [user, emails] = await Promise.all([
        request('https://api.github.com/user', { headers }),
        request('https://api.github.com/user/emails', { headers }),
      ]);
      // The public profile email is unverified and optional; only trust a verified address from /user/emails.
      const list = Array.isArray(emails) ? emails : [];
      const best = list.find((e) => e.primary && e.verified) || list.find((e) => e.verified);
      return {
        id: String(user.id),
        email: best?.email,
        emailVerified: !!best,
        name: user.name || user.login,
      };
    },
  },
};

const credentials = (name) => ({
  id: process.env[`${PROVIDERS[name].envPrefix}_CLIENT_ID`],
  secret: process.env[`${PROVIDERS[name].envPrefix}_CLIENT_SECRET`],
});

/** A provider is only offered when both its client id and secret are configured. */
const isEnabled = (name) => {
  if (typeof name !== 'string' || !Object.hasOwn(PROVIDERS, name)) return false;
  const { id, secret } = credentials(name);
  return !!(id && secret);
};

const enabledProviders = () => Object.keys(PROVIDERS).filter(isEnabled);

/** Where the browser lands after the provider. Must match the redirect URI registered with the provider. */
const redirectUri = (name) => {
  const base = (process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/+$/, '');
  return `${base}/api/auth/oauth/${name}/callback`;
};

/** First configured client origin: where we send the user back to after sign-in. */
const clientUrl = () => clientOrigins()[0];

// ── Authorization request (state + PKCE) ─────────────────────────────────────
/**
 * `stateToken` is a short-lived signed token holding the random `state` and PKCE verifier.
 * It goes into an httpOnly cookie; the callback must present both the cookie and a matching
 * `state` query value, which ties the callback to the browser that started the flow (CSRF).
 */
function startAuth(name) {
  const p = PROVIDERS[name];
  const state = crypto.randomBytes(16).toString('hex');
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');

  const url = new URL(p.authUrl);
  const params = {
    client_id: credentials(name).id,
    redirect_uri: redirectUri(name),
    response_type: 'code',
    scope: p.scope,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    ...p.extraAuthParams,
  };
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const stateToken = jwt.sign({ typ: 'oauth', p: name, s: state, v: verifier }, process.env.JWT_SECRET, {
    expiresIn: '10m',
  });
  return { url: url.toString(), stateToken };
}

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

async function exchangeCode(name, { code, verifier }) {
  const { id, secret } = credentials(name);
  const data = await request(PROVIDERS[name].tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      client_id: id,
      client_secret: secret,
      code,
      redirect_uri: redirectUri(name),
      grant_type: 'authorization_code',
      code_verifier: verifier,
    }),
  });
  if (!data?.access_token) throw new Error('provider returned no access token');
  return data.access_token;
}

const fetchProfile = (name, accessToken) => PROVIDERS[name].profile(accessToken);

// ── Account resolution ───────────────────────────────────────────────────────
const displayName = (profile, email) =>
  String(profile.name || email.split('@')[0] || '').trim().slice(0, 60) || 'New member';

/**
 * Returns the local user for a provider identity, creating or linking as needed.
 *
 *  1. Known provider id            -> that user.
 *  2. Provider email not verified  -> refuse (never trust an unverified address).
 *  3. A local account has the email -> link it. If that account's email was never verified,
 *     someone may have pre-registered it to hijack the real owner, so its password is removed
 *     and its sessions are revoked (the owner can sign in with the provider, or use "forgot password").
 *  4. Otherwise                    -> create a new account (email counts as verified).
 */
async function findOrCreateUser(name, profile, attempt = 0) {
  const key = `oauth.${name}`;

  const known = await User.findOne({ [key]: profile.id });
  if (known) return known;

  if (!profile.email || !profile.emailVerified) {
    throw new AppError(400, 'The provider did not return a verified email address', { code: 'email_unverified' });
  }
  const email = String(profile.email).trim().toLowerCase();

  const existing = await User.findOne({ email }).select('emailVerified oauth');
  if (existing) {
    // Same email but already tied to a different provider account: don't silently take it over.
    if (existing.oauth?.[name] && existing.oauth[name] !== profile.id) {
      throw new AppError(409, 'This email is linked to a different account', { code: 'account_conflict' });
    }
    const update = { $set: { [key]: profile.id, emailVerified: true } };
    if (!existing.emailVerified) {
      update.$unset = {
        password: 1,
        emailVerifyTokenHash: 1,
        emailVerifyExpires: 1,
        passwordResetTokenHash: 1,
        passwordResetExpires: 1,
      };
      update.$inc = { tokenVersion: 1 };
    }
    await User.updateOne({ _id: existing._id }, update);
    return User.findById(existing._id);
  }

  try {
    return await User.create({
      name: displayName(profile, email),
      email,
      emailVerified: true,
      avatarColor: User.AVATAR_COLORS[Math.floor(Math.random() * User.AVATAR_COLORS.length)],
      oauth: { [name]: profile.id },
    });
  } catch (e) {
    // Lost a race with a concurrent sign-in for the same person: take the winner's account.
    if (e?.code === 11000 && attempt < 1) return findOrCreateUser(name, profile, attempt + 1);
    throw e;
  }
}

module.exports = {
  PROVIDERS,
  isEnabled,
  enabledProviders,
  redirectUri,
  clientUrl,
  startAuth,
  safeEqual,
  exchangeCode,
  fetchProfile,
  findOrCreateUser,
};
