const router = require('express').Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const score = (a, b) => {
  const at = a.skillsToTeach.map(s => s.name.toLowerCase());
  const al = a.skillsToLearn.map(s => s.name.toLowerCase());
  const bt = b.skillsToTeach.map(s => s.name.toLowerCase());
  const bl = b.skillsToLearn.map(s => s.name.toLowerCase());
  const match = at.filter(s => bl.includes(s)).length + bt.filter(s => al.includes(s)).length;
  return Math.min(Math.round((match / Math.max(al.length + bl.length, 1)) * 100), 99);
};

// GET /api/users — browse with search/filter/page
router.get('/', protect, async (req, res) => {
  try {
    const { search, category, page = 1, limit = 12 } = req.query;
    const q = { _id: { $ne: req.user._id } };
    if (search) q.$or = [
      { name: { $regex: search, $options: 'i' } },
      { 'skillsToTeach.name': { $regex: search, $options: 'i' } },
      { 'skillsToLearn.name': { $regex: search, $options: 'i' } },
      { location: { $regex: search, $options: 'i' } },
    ];
    if (category && category !== 'All') q['skillsToTeach.category'] = category;
    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      User.find(q).select('-password -swapRequests').skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
      User.countDocuments(q),
    ]);
    const withScores = users.map(u => ({ ...u.toJSON(), compatibilityScore: score(req.user, u) }))
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore);
    res.json({ success: true, users: withScores, total, pages: Math.ceil(total / limit) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET /api/users/matches — BEFORE /:id to avoid route conflict
router.get('/matches', protect, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } }).select('-password -swapRequests');
    const matches = users
      .map(u => ({ ...u.toJSON(), compatibilityScore: score(req.user, u) }))
      .filter(u => u.compatibilityScore > 0)
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
      .slice(0, 12);
    res.json({ success: true, matches });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET /api/users/requests/inbox — BEFORE /:id to avoid route conflict
router.get('/requests/inbox', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('swapRequests');
    if (!user) return res.json({ success: true, requests: [] });

    await User.populate(user, {
      path: 'swapRequests.from',
      select: 'name initials avatarColor location skillsToTeach skillsToLearn bio',
      model: 'User',
    });

    res.json({ success: true, requests: user.swapRequests || [] });
  } catch (e) {
    console.error('INBOX ROUTE ERROR:', e); // <-- add this
    res.status(500).json({ success: false, message: e.message });
  }
});

// PUT /api/users/requests/:reqId — BEFORE /:id to avoid route conflict
router.put('/requests/:reqId', protect, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['accepted', 'declined'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be accepted or declined' });
    }
    const user = await User.findById(req.user._id);
    const request = user.swapRequests.id(req.params.reqId);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Request already ${request.status}` });
    }
    request.status = status;
    if (status === 'accepted') {
      if (!user.connections.map(c => c.toString()).includes(request.from.toString())) {
        user.connections.push(request.from);
      }
      await User.findByIdAndUpdate(request.from, { $addToSet: { connections: user._id } });
      user.totalSwaps = (user.totalSwaps || 0) + 1;
      await User.findByIdAndUpdate(request.from, { $inc: { totalSwaps: 1 } });
    }
    await user.save();
    res.json({ success: true, message: `Request ${status}`, request });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET /api/users/:id — wildcard, must be AFTER all fixed routes above
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user: { ...user.toJSON(), compatibilityScore: score(req.user, user) } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST /api/users/:id/swap-request
router.post('/:id/swap-request', protect, async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: "You can't swap with yourself" });
    }
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ success: false, message: 'User not found' });
    const alreadyPending = target.swapRequests.some(
      r => r.from.toString() === req.user._id.toString() && r.status === 'pending'
    );
    if (alreadyPending) {
      return res.status(400).json({ success: false, message: 'You already have a pending request with this user' });
    }
    target.swapRequests.push({
      from: req.user._id,
      message: req.body.message || `Hi! I'd love to swap skills with you.`,
    });
    await target.save();
    res.json({ success: true, message: 'Swap request sent!' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST /api/users/:id/rate
router.post('/:id/rate', protect, async (req, res) => {
  try {
    const { score: s, comment } = req.body;
    if (!s || s < 1 || s > 5) return res.status(400).json({ success: false, message: 'Score must be 1–5' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Not found' });
    const existing = user.ratings.find(r => r.from.toString() === req.user._id.toString());
    if (existing) { existing.score = s; existing.comment = comment; }
    else user.ratings.push({ from: req.user._id, score: s, comment });
    await user.save();
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;