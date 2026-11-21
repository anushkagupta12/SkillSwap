const router = require('express').Router();
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { SKILL_CATEGORIES } = require('../utils/skills');

const TTL_MS = 60 * 1000;
let cache = { at: 0, data: null };

async function compute() {
  const [users, skills, connections, categories] = await Promise.all([
    User.estimatedDocumentCount(),
    User.aggregate([{ $unwind: '$teachNorm' }, { $group: { _id: '$teachNorm' } }, { $count: 'n' }]),
    User.aggregate([{ $group: { _id: null, n: { $sum: '$connectionsCount' } } }]),
    // learners per category = users who teach at least one skill in it
    User.aggregate([
      { $project: { cats: { $setUnion: ['$skillsToTeach.category', []] } } },
      { $unwind: '$cats' },
      { $group: { _id: '$cats', n: { $sum: 1 } } },
    ]),
  ]);

  const byCategory = Object.fromEntries(SKILL_CATEGORIES.map((c) => [c, 0]));
  for (const c of categories) if (c._id in byCategory) byCategory[c._id] = c.n;

  return {
    users,
    skills: skills[0]?.n || 0,
    connections: Math.floor((connections[0]?.n || 0) / 2), // each connection is stored on both users
    categories: byCategory,
  };
}

// GET /api/stats - public, real numbers only, cached for a minute
router.get(
  '/',
  asyncHandler(async (req, res) => {
    if (!cache.data || Date.now() - cache.at > TTL_MS) cache = { at: Date.now(), data: await compute() };
    res.json({ success: true, ...cache.data });
  }),
);

/** Test helper. */
router.resetCache = () => {
  cache = { at: 0, data: null };
};

module.exports = router;
