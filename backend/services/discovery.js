const User = require('../models/User');
const { normalizeSkillName } = require('../utils/skills');
const { escapeRegex } = require('../utils/pick');

const uniqNorm = (skills) => [...new Set((skills || []).map((s) => normalizeSkillName(s.name)))];

// Explicit public projection (nameNorm, email, connections ... are never included).
const PUBLIC_PROJECTION = {
  name: 1,
  initials: 1,
  avatarColor: 1,
  bio: 1,
  location: 1,
  'skillsToTeach.name': 1,
  'skillsToTeach.category': 1,
  'skillsToTeach.level': 1,
  'skillsToLearn.name': 1,
  'skillsToLearn.category': 1,
  'skillsToLearn.level': 1,
  connectionsCount: 1,
  ratingAvg: 1,
  ratingCount: 1,
  isOnline: 1,
  lastSeen: 1,
  createdAt: 1,
  compatibilityScore: 1,
};

/**
 * Aggregation stages computing the same score as services/matching.scoreMatch
 * inside MongoDB, so we can sort and paginate by score at the database level.
 */
function scoreStages(myTeach, myLearn) {
  return [
    {
      $addFields: {
        _overlap: {
          $add: [
            { $size: { $setIntersection: [{ $ifNull: ['$teachNorm', []] }, { $literal: myLearn }] } },
            { $size: { $setIntersection: [{ $ifNull: ['$learnNorm', []] }, { $literal: myTeach }] } },
          ],
        },
        _denom: { $add: [myLearn.length, { $size: { $ifNull: ['$learnNorm', []] } }] },
      },
    },
    {
      $addFields: {
        compatibilityScore: {
          $cond: [
            { $gt: ['$_denom', 0] },
            { $round: [{ $multiply: [{ $divide: ['$_overlap', '$_denom'] }, 100] }, 0] },
            0,
          ],
        },
      },
    },
  ];
}

const SORT = { compatibilityScore: -1, createdAt: -1, _id: -1 };

/** Browse with search / category filter. Ranked by score across ALL results, then paginated. */
async function browse(me, { search, category, page, limit }) {
  const match = { _id: { $ne: me._id } };
  if (category) match['skillsToTeach.category'] = category;

  const words = (search || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5);
  if (words.length) {
    // Prefix match on indexed tokens (name, location, skill names) - no unanchored regex scans.
    match.$and = words.map((w) => ({ searchTokens: { $regex: `^${escapeRegex(w)}` } }));
  }

  const myTeach = uniqNorm(me.skillsToTeach);
  const myLearn = uniqNorm(me.skillsToLearn);

  const [result] = await User.aggregate([
    { $match: match },
    ...scoreStages(myTeach, myLearn),
    { $sort: SORT },
    {
      $facet: {
        items: [{ $skip: (page - 1) * limit }, { $limit: limit }, { $project: PUBLIC_PROJECTION }],
        total: [{ $count: 'n' }],
      },
    },
  ]);
  const total = result?.total?.[0]?.n || 0;
  return { users: result?.items || [], total, pages: Math.max(Math.ceil(total / limit), 1) };
}

/** Users with at least one complementary skill. Candidates come from the indexed multikey fields. */
async function matches(me, limit = 12) {
  const myTeach = uniqNorm(me.skillsToTeach);
  const myLearn = uniqNorm(me.skillsToLearn);
  const or = [];
  if (myLearn.length) or.push({ teachNorm: { $in: myLearn } });
  if (myTeach.length) or.push({ learnNorm: { $in: myTeach } });
  if (!or.length) return [];

  return User.aggregate([
    { $match: { _id: { $ne: me._id }, $or: or } },
    ...scoreStages(myTeach, myLearn),
    { $match: { compatibilityScore: { $gt: 0 } } },
    { $sort: SORT },
    { $limit: limit },
    { $project: PUBLIC_PROJECTION },
  ]);
}

module.exports = { browse, matches, PUBLIC_PROJECTION };
