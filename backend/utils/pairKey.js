/** Order-independent key for a pair of ids: pairKey(a, b) === pairKey(b, a). */
const pairKey = (a, b) => [String(a), String(b)].sort().join('_');

module.exports = { pairKey };
