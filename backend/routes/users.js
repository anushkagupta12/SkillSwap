const router = require('express').Router();
const User = require('../models/User');
const Rating = require('../models/Rating');
const { protect } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/errors');
const { validateIdParams } = require('../utils/validate');
const { optionalString, clampInt } = require('../utils/pick');
const { SKILL_CATEGORIES } = require('../utils/skills');
const { browse, matches } = require('../services/discovery');
const { relationshipMap } = require('../services/relationships');
const { overlapLists, scoreUsers } = require('../services/matching');

/** Adds `relationship` (none | pending_sent | pending_received | connected) to each user. */
async function withRelationships(me, users) {
  const { map } = await relationshipMap(
    me,
    users.map((u) => String(u._id)),
  );
  return users.map((u) => ({ ...u, relationship: map.get(String(u._id)) || 'none' }));
}

// GET /api/users - browse with search / category / pagination
router.get(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    const search = optionalString(req.query.search, { max: 80, label: 'search' });
    const category = optionalString(req.query.category, { max: 40, label: 'category' });
    if (category && category !== 'All' && !SKILL_CATEGORIES.includes(category)) {
      throw new AppError(400, 'Unknown category');
    }
    const limit = clampInt(req.query.limit, 12, 1, 50);
    const page = clampInt(req.query.page, 1, 1, 10000);

    const result = await browse(req.user, {
      search,
      category: category && category !== 'All' ? category : undefined,
      page,
      limit,
    });
    const users = await withRelationships(req.user, result.users);
    res.json({ success: true, users, total: result.total, pages: result.pages, page });
  }),
);

// GET /api/users/matches - BEFORE /:id so "matches" isn't treated as an id
router.get(
  '/matches',
  protect,
  asyncHandler(async (req, res) => {
    const list = await matches(req.user, 12);
    res.json({ success: true, matches: await withRelationships(req.user, list) });
  }),
);

// GET /api/users/:id - public profile + compatibility + relationship
router.get(
  '/:id',
  protect,
  validateIdParams('id'),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).select(User.PUBLIC_SELECT);
    if (!user) throw new AppError(404, 'User not found');

    const isMe = String(user._id) === String(req.user._id);
    const { map, requestIds } = await relationshipMap(req.user, [String(user._id)]);
    const reviews = await Rating.find({ to: user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('from', 'name initials avatarColor')
      .select('score comment createdAt from')
      .lean();

    res.json({
      success: true,
      user: {
        ...user.toPublic(),
        compatibilityScore: isMe ? 0 : scoreUsers(req.user, user),
        overlap: isMe ? { theyCanTeachMe: [], iCanTeachThem: [] } : overlapLists(req.user, user),
        relationship: map.get(String(user._id)) || 'none',
        requestId: requestIds.get(String(user._id)) || null,
        reviews: reviews.filter((r) => r.from),
      },
    });
  }),
);

// GET /api/users/:id/relationship - none | pending_sent | pending_received | connected
router.get(
  '/:id/relationship',
  protect,
  validateIdParams('id'),
  asyncHandler(async (req, res) => {
    const { map, requestIds } = await relationshipMap(req.user, [req.params.id]);
    res.json({
      success: true,
      relationship: map.get(req.params.id) || 'none',
      requestId: requestIds.get(req.params.id) || null,
    });
  }),
);

module.exports = router;
