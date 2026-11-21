const SwapRequest = require('../models/SwapRequest');
const { pairKey } = require('../utils/pairKey');

/**
 * Relationship of `me` towards each id in `ids`:
 *   none | pending_sent | pending_received | connected
 * Returns { map: Map<idString, status>, requestIds: Map<idString, requestId> }.
 */
async function relationshipMap(me, ids) {
  const myId = String(me._id);
  const connected = new Set((me.connections || []).map(String));
  const keys = ids.map((id) => pairKey(myId, id));
  const pending = keys.length
    ? await SwapRequest.find({ pairKey: { $in: keys }, status: 'pending' }).select('from to').lean()
    : [];

  const map = new Map();
  const requestIds = new Map();
  for (const p of pending) {
    const other = String(p.from) === myId ? String(p.to) : String(p.from);
    map.set(other, String(p.from) === myId ? 'pending_sent' : 'pending_received');
    requestIds.set(other, String(p._id));
  }
  for (const id of ids) {
    const s = String(id);
    if (connected.has(s)) map.set(s, 'connected');
    else if (!map.has(s)) map.set(s, s === myId ? 'self' : 'none');
  }
  return { map, requestIds };
}

module.exports = { relationshipMap };
