/**
 * Same formula the API uses (see backend/services/matching.js). Only used for the
 * illustrative example on the landing page, so that the number shown there can
 * never drift away from what the real algorithm produces.
 *
 *   ( |A.teaches ∩ B.wants| + |B.teaches ∩ A.wants| ) / ( |A.wants| + |B.wants| )
 */
const norm = (s) => String(s).trim().toLowerCase()
const uniq = (arr) => [...new Set(arr.map(norm))]

export function scoreMatch(aTeach, aLearn, bTeach, bLearn) {
  const [at, al, bt, bl] = [aTeach, aLearn, bTeach, bLearn].map(uniq)
  const denom = al.length + bl.length
  if (!denom) return 0
  const overlap = at.filter((s) => bl.includes(s)).length + bt.filter((s) => al.includes(s)).length
  return Math.round((overlap / denom) * 100)
}
