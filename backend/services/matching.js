const { normalizeSkillName } = require('../utils/skills');

const uniq = (arr) => [...new Set(arr || [])];

/**
 * Pure compatibility score between users A and B, 0..100.
 *
 *   ( |A.teaches ∩ B.wants| + |B.teaches ∩ A.wants| ) / ( |A.wants| + |B.wants| )
 *
 * All four inputs are arrays of NORMALIZED skill names and are treated as sets, so
 * duplicates can't inflate the score. Each overlap is bounded by the other side's
 * number of wants, therefore the result can never exceed 100 and no cap is needed.
 */
function scoreMatch(aTeach, aLearn, bTeach, bLearn) {
  const at = uniq(aTeach);
  const al = uniq(aLearn);
  const bt = uniq(bTeach);
  const bl = uniq(bLearn);
  const denom = al.length + bl.length;
  if (!denom) return 0;
  const blSet = new Set(bl);
  const alSet = new Set(al);
  const overlap = at.filter((s) => blSet.has(s)).length + bt.filter((s) => alSet.has(s)).length;
  return Math.round((overlap / denom) * 100);
}

const norms = (skills) => uniq((skills || []).map((s) => normalizeSkillName(s.name)));
const brief = (s) => ({ name: s.name, category: s.category, level: s.level });

/** Score between two users given as documents or plain objects with skill arrays. */
const scoreUsers = (a, b) =>
  scoreMatch(norms(a.skillsToTeach), norms(a.skillsToLearn), norms(b.skillsToTeach), norms(b.skillsToLearn));

/** The concrete skills behind the score, from `me`'s point of view. */
function overlapLists(me, other) {
  const myLearn = new Set(norms(me.skillsToLearn));
  const myTeach = new Set(norms(me.skillsToTeach));
  return {
    theyCanTeachMe: (other.skillsToTeach || []).filter((s) => myLearn.has(normalizeSkillName(s.name))).map(brief),
    iCanTeachThem: (other.skillsToLearn || []).filter((s) => myTeach.has(normalizeSkillName(s.name))).map(brief),
  };
}

module.exports = { scoreMatch, scoreUsers, overlapLists };
