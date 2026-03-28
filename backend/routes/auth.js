const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const token = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });
const send = (user, code, res) => {
  const u = user.toJSON(); delete u.password;
  res.status(code).json({ success: true, token: token(user._id), user: u });
};

router.post('/register', [
  body('name').trim().notEmpty(),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
], async (req, res) => {
  const errs = validationResult(req);
  if (!errs.isEmpty()) return res.status(400).json({ success: false, errors: errs.array() });
  try {
    if (await User.findOne({ email: req.body.email }))
      return res.status(400).json({ success: false, message: 'Email already registered' });
    const colors = ['emerald', 'violet', 'amber', 'rose', 'sky', 'orange'];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];
    const user = await User.create({ ...req.body, avatarColor });
    send(user, 201, res);
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/login', [body('email').isEmail(), body('password').notEmpty()], async (req, res) => {
  const errs = validationResult(req);
  if (!errs.isEmpty()) return res.status(400).json({ success: false, errors: errs.array() });
  try {
    const user = await User.findOne({ email: req.body.email }).select('+password');
    if (!user || !(await user.matchPassword(req.body.password)))
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    send(user, 200, res);
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/me', protect, (req, res) => res.json({ success: true, user: req.user }));

router.put('/profile', protect, async (req, res) => {
  try {
    const { name, bio, location, skillsToTeach, skillsToLearn } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id,
      { name, bio, location, skillsToTeach, skillsToLearn }, { new: true, runValidators: true });
    if (name) {
      const p = name.trim().split(' ');
      user.initials = (p[0][0] + (p[1] ? p[1][0] : '')).toUpperCase();
      await user.save();
    }
    res.json({ success: true, user });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
