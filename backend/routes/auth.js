const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const User = require('../models/User');
const { protect, userFromToken } = require('../middleware/auth');
const { authLimiter, sessionLimiter } = require('../middleware/rateLimit');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/errors');
const { runValidation } = require('../utils/validate');
const { definedOnly } = require('../utils/pick');
const { sanitizeSkills } = require('../utils/skills');
const { requireEmailVerification } = require('../config/env');
const {
  REFRESH_COOKIE,
  signAccess,
  verifyToken,
  setRefreshCookie,
  clearRefreshCookie,
  makeOneTimeToken,
  hashToken,
} = require('../services/tokens');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/mailer');
const { disconnectUser } = require('../services/realtime');

// Compared against when the email is unknown so response time doesn't reveal whether an account exists.
const DUMMY_HASH = bcrypt.hashSync('timing-equalizer-password', 10);

const HOUR = 60 * 60 * 1000;

const emailRule = () =>
  body('email')
    .isString()
    .withMessage('Email is required')
    .bail()
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage('Enter a valid email address')
    .isLength({ max: 254 })
    .withMessage('Email is too long');

const passwordRule = (field = 'password') =>
  body(field)
    .isString()
    .withMessage('Password is required')
    .bail()
    .isLength({ min: 8, max: 72 })
    .withMessage('Password must be 8-72 characters');

const session = (res, user, status = 200) => {
  setRefreshCookie(res, user);
  res.status(status).json({ success: true, accessToken: signAccess(user), user: user.toJSON() });
};

// ── Register ─────────────────────────────────────────────────────────────────
router.post(
  '/register',
  authLimiter,
  [
    body('name').isString().withMessage('Name is required').bail().trim().isLength({ min: 1, max: 60 }).withMessage('Name must be 1-60 characters'),
    emailRule(),
    passwordRule(),
    body('location').optional().isString().trim().isLength({ max: 100 }).withMessage('Location is too long'),
    body('bio').optional().isString().trim().isLength({ max: 300 }).withMessage('Bio must be at most 300 characters'),
  ],
  runValidation,
  asyncHandler(async (req, res) => {
    // Explicit whitelist: a client can never set ratings, connections, isOnline, etc.
    const { name, email, password, location, bio } = req.body;
    const skillsToTeach = sanitizeSkills(req.body.skillsToTeach, 'skillsToTeach');
    const skillsToLearn = sanitizeSkills(req.body.skillsToLearn, 'skillsToLearn');

    if (await User.exists({ email })) {
      throw new AppError(400, 'Email already registered', { code: 'email_taken' });
    }

    const verify = makeOneTimeToken();
    let user;
    try {
      user = await User.create({
        name,
        email,
        password,
        avatarColor: User.AVATAR_COLORS[Math.floor(Math.random() * User.AVATAR_COLORS.length)],
        emailVerifyTokenHash: verify.hash,
        emailVerifyExpires: new Date(Date.now() + 24 * HOUR),
        ...definedOnly({ location, bio, skillsToTeach, skillsToLearn }),
      });
    } catch (e) {
      // Lost a race with a concurrent registration of the same address.
      if (e?.code === 11000) throw new AppError(400, 'Email already registered', { code: 'email_taken' });
      throw e;
    }

    sendVerificationEmail(user, verify.raw).catch((e) => console.error('[mail] verification failed:', e.message));

    if (requireEmailVerification()) {
      return res.status(201).json({
        success: true,
        requiresVerification: true,
        message: 'Account created. Check your email to verify your address before signing in.',
      });
    }
    session(res, user, 201);
  }),
);

// ── Login ────────────────────────────────────────────────────────────────────
router.post(
  '/login',
  authLimiter,
  [emailRule(), body('password').isString().notEmpty().withMessage('Password is required')],
  runValidation,
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email }).select('+password');
    // Always run bcrypt, even for unknown emails and for OAuth-only accounts (which have no password),
    // so response time reveals nothing and bcrypt is never handed `undefined`.
    const hasPassword = !!user?.password;
    const matched = await bcrypt.compare(req.body.password, hasPassword ? user.password : DUMMY_HASH);
    if (!user || !hasPassword || !matched) {
      throw new AppError(401, 'Invalid email or password', { code: 'invalid_credentials' });
    }
    if (requireEmailVerification() && !user.emailVerified) {
      throw new AppError(403, 'Please verify your email address first', { code: 'email_not_verified' });
    }
    user.password = undefined;
    session(res, user);
  }),
);

// ── Session: refresh / logout ────────────────────────────────────────────────
router.post(
  '/refresh',
  sessionLimiter,
  asyncHandler(async (req, res) => {
    const raw = req.cookies?.[REFRESH_COOKIE];
    if (!raw) throw new AppError(401, 'No session', { code: 'no_session' });
    let user = null;
    try {
      user = await userFromToken(verifyToken(raw, 'refresh'));
    } catch {
      user = null;
    }
    if (!user) {
      clearRefreshCookie(res);
      throw new AppError(401, 'Session expired', { code: 'no_session' });
    }
    session(res, user); // rotates the cookie (sliding session)
  }),
);

router.post('/logout', sessionLimiter, (req, res) => {
  clearRefreshCookie(res);
  res.json({ success: true });
});

// Revokes every access + refresh token of this user and drops their sockets.
router.post(
  '/logout-all',
  protect,
  asyncHandler(async (req, res) => {
    await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
    clearRefreshCookie(res);
    disconnectUser(req.app, req.user._id);
    res.json({ success: true });
  }),
);

router.get('/me', protect, sessionLimiter, (req, res) => res.json({ success: true, user: req.user.toJSON() }));

// ── Profile ──────────────────────────────────────────────────────────────────
router.put(
  '/profile',
  protect,
  [
    body('name').optional().isString().withMessage('Name must be text').bail().trim().isLength({ min: 1, max: 60 }).withMessage('Name must be 1-60 characters'),
    body('bio').optional().isString().trim().isLength({ max: 300 }).withMessage('Bio must be at most 300 characters'),
    body('location').optional().isString().trim().isLength({ max: 100 }).withMessage('Location is too long'),
  ],
  runValidation,
  asyncHandler(async (req, res) => {
    const { name, bio, location } = req.body;
    const updates = definedOnly({
      name,
      bio,
      location,
      skillsToTeach: sanitizeSkills(req.body.skillsToTeach, 'skillsToTeach'),
      skillsToLearn: sanitizeSkills(req.body.skillsToLearn, 'skillsToLearn'),
    });
    // Load + save (not findByIdAndUpdate) so pre-save hooks keep initials and search fields in sync.
    const user = await User.findById(req.user._id);
    user.set(updates);
    await user.save();
    res.json({ success: true, user: user.toJSON() });
  }),
);

// ── Email verification ───────────────────────────────────────────────────────
router.post(
  '/verify-email',
  authLimiter,
  [body('token').isString().isLength({ min: 20, max: 200 }).withMessage('Invalid verification link')],
  runValidation,
  asyncHandler(async (req, res) => {
    const user = await User.findOne({
      emailVerifyTokenHash: hashToken(req.body.token),
      emailVerifyExpires: { $gt: new Date() },
    }).select('_id');
    if (!user) throw new AppError(400, 'This verification link is invalid or has expired', { code: 'invalid_token' });
    await User.updateOne(
      { _id: user._id },
      { $set: { emailVerified: true }, $unset: { emailVerifyTokenHash: 1, emailVerifyExpires: 1 } },
    );
    res.json({ success: true, message: 'Email verified' });
  }),
);

router.post(
  '/resend-verification',
  protect,
  authLimiter,
  asyncHandler(async (req, res) => {
    if (req.user.emailVerified) return res.json({ success: true, message: 'Already verified' });
    const verify = makeOneTimeToken();
    await User.updateOne(
      { _id: req.user._id },
      { emailVerifyTokenHash: verify.hash, emailVerifyExpires: new Date(Date.now() + 24 * HOUR) },
    );
    await sendVerificationEmail(req.user, verify.raw).catch((e) => console.error('[mail] verification failed:', e.message));
    res.json({ success: true, message: 'Verification email sent' });
  }),
);

// ── Password reset ───────────────────────────────────────────────────────────
router.post(
  '/forgot-password',
  authLimiter,
  [emailRule()],
  runValidation,
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email });
    if (user) {
      const reset = makeOneTimeToken();
      await User.updateOne(
        { _id: user._id },
        { passwordResetTokenHash: reset.hash, passwordResetExpires: new Date(Date.now() + HOUR) },
      );
      sendPasswordResetEmail(user, reset.raw).catch((e) => console.error('[mail] reset failed:', e.message));
    }
    // Same answer whether or not the account exists.
    res.json({ success: true, message: 'If that email is registered, a reset link is on its way.' });
  }),
);

router.post(
  '/reset-password',
  authLimiter,
  [body('token').isString().isLength({ min: 20, max: 200 }).withMessage('Invalid reset link'), passwordRule('password')],
  runValidation,
  asyncHandler(async (req, res) => {
    const user = await User.findOne({
      passwordResetTokenHash: hashToken(req.body.token),
      passwordResetExpires: { $gt: new Date() },
    });
    if (!user) throw new AppError(400, 'This reset link is invalid or has expired', { code: 'invalid_token' });
    user.password = req.body.password;
    user.tokenVersion = (user.tokenVersion || 0) + 1; // signs out every existing session
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    disconnectUser(req.app, user._id);
    clearRefreshCookie(res);
    res.json({ success: true, message: 'Password updated. Please sign in.' });
  }),
);

module.exports = router;
