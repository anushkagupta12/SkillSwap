const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/errors');
const { isProd } = require('../config/env');
const { oauthLimiter } = require('../middleware/rateLimit');
const { verifyToken, setRefreshCookie } = require('../services/tokens');
const oauth = require('../services/oauth');

const STATE_COOKIE = 'ss_oauth_state';

// Lax (not Strict): the provider sends the browser back with a top-level GET, which Lax still allows.
const stateCookieOptions = () => ({
  httpOnly: true,
  secure: isProd(),
  sameSite: 'lax',
  path: '/api/auth/oauth',
});

/** Browser flows can't show JSON, so every failure bounces to the login page with a short code. */
const failTo = (res, code) => {
  res.clearCookie(STATE_COOKIE, stateCookieOptions());
  return res.redirect(`${oauth.clientUrl()}/login?oauth_error=${encodeURIComponent(code)}`);
};

// GET /api/auth/oauth/providers - which buttons the frontend should show
router.get('/providers', (req, res) => {
  res.json({ success: true, providers: oauth.enabledProviders() });
});

// GET /api/auth/oauth/:provider - start: redirect the browser to the provider
router.get('/:provider', oauthLimiter, (req, res) => {
  const name = req.params.provider;
  if (!oauth.isEnabled(name)) return failTo(res, 'unavailable');
  const { url, stateToken } = oauth.startAuth(name);
  res.cookie(STATE_COOKIE, stateToken, { ...stateCookieOptions(), maxAge: 10 * 60 * 1000 });
  res.redirect(url);
});

// GET /api/auth/oauth/:provider/callback - the provider sends the browser back here
router.get(
  '/:provider/callback',
  oauthLimiter,
  asyncHandler(async (req, res) => {
    const name = req.params.provider;
    if (!oauth.isEnabled(name)) return failTo(res, 'unavailable');
    if (typeof req.query.error === 'string') return failTo(res, 'access_denied'); // user pressed "Cancel"

    const { code, state } = req.query;
    if (typeof code !== 'string' || typeof state !== 'string') return failTo(res, 'failed');

    // The cookie proves this browser started the flow; the signed token carries the PKCE verifier.
    let saved;
    try {
      saved = verifyToken(req.cookies?.[STATE_COOKIE] || '', 'oauth');
    } catch {
      return failTo(res, 'failed');
    }
    if (saved.p !== name || !oauth.safeEqual(saved.s, state)) return failTo(res, 'failed');

    try {
      const accessToken = await oauth.exchangeCode(name, { code, verifier: saved.v });
      const profile = await oauth.fetchProfile(name, accessToken);
      const user = await oauth.findOrCreateUser(name, profile);

      res.clearCookie(STATE_COOKIE, stateCookieOptions());
      setRefreshCookie(res, user); // same httpOnly session cookie as password login
      return res.redirect(`${oauth.clientUrl()}/oauth/callback`);
    } catch (e) {
      if (e instanceof AppError) return failTo(res, e.code);
      // Log the message only: provider responses and tokens must never reach the logs.
      console.error(`[oauth] ${name} sign-in failed:`, e.message);
      return failTo(res, 'failed');
    }
  }),
);

module.exports = router;
