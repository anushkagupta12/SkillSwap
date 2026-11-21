/**
 * One-off migration from the v1 data model to v2. Safe to re-run.
 *
 *  - moves embedded user.swapRequests -> `swaprequests` collection
 *  - moves embedded user.ratings      -> `ratings` collection (+ ratingAvg/ratingCount)
 *  - renames totalSwaps -> connectionsCount
 *  - fills nameNorm / teachNorm / learnNorm / searchTokens
 *  - fills conversation.pairKey (merges duplicate conversations first)
 *  - resets stale isOnline flags
 *
 * Usage:  npm run migrate        (back up your database first)
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const SwapRequest = require('../models/SwapRequest');
const Rating = require('../models/Rating');
const { Conversation, Message } = require('../models/Chat');
const { pairKey } = require('../utils/pairKey');
const { normalizeSkillName, deriveFields } = require('../utils/skills');

async function migrateUsers() {
  const users = mongoose.connection.collection('users');
  let n = 0;
  for await (const u of users.find({})) {
    const $set = { isOnline: false };

    const fix = (list) =>
      (list || []).map((s) => ({ ...s, nameNorm: normalizeSkillName(s.name) }));
    const skillsToTeach = fix(u.skillsToTeach);
    const skillsToLearn = fix(u.skillsToLearn);
    Object.assign($set, { skillsToTeach, skillsToLearn }, deriveFields({ ...u, skillsToTeach, skillsToLearn }));

    // swapRequests -> collection
    for (const r of u.swapRequests || []) {
      if (!r.from) continue;
      const doc = {
        from: r.from,
        to: u._id,
        pairKey: pairKey(r.from, u._id),
        status: r.status || 'pending',
        message: (r.message || '').slice(0, 300),
        createdAt: r.createdAt || new Date(),
        updatedAt: r.createdAt || new Date(),
        ...(r.status && r.status !== 'pending' ? { respondedAt: r.createdAt || new Date() } : {}),
      };
      // Keep only one pending request per pair (the unique index requires it).
      if (doc.status === 'pending' && (await SwapRequest.exists({ pairKey: doc.pairKey, status: 'pending' }))) continue;
      await SwapRequest.collection.insertOne(doc).catch((e) => {
        if (e.code !== 11000) throw e;
      });
    }

    // ratings -> collection
    const seen = new Set();
    for (const r of u.ratings || []) {
      if (!r.from || String(r.from) === String(u._id) || seen.has(String(r.from))) continue;
      if (!Number.isInteger(r.score) || r.score < 1 || r.score > 5) continue;
      seen.add(String(r.from));
      await Rating.updateOne(
        { from: r.from, to: u._id },
        { $setOnInsert: { score: r.score, comment: (r.comment || '').slice(0, 300), createdAt: r.createdAt || new Date() } },
        { upsert: true },
      );
    }

    $set.connectionsCount = (u.connections || []).length;
    const agg = await Rating.aggregate([
      { $match: { to: u._id } },
      { $group: { _id: null, avg: { $avg: '$score' }, count: { $sum: 1 } } },
    ]);
    $set.ratingAvg = agg[0] ? Math.round(agg[0].avg * 10) / 10 : 0;
    $set.ratingCount = agg[0] ? agg[0].count : 0;
    $set.emailVerified = u.emailVerified ?? true; // existing accounts are grandfathered in
    $set.tokenVersion = u.tokenVersion ?? 0;

    await users.updateOne(
      { _id: u._id },
      { $set, $unset: { swapRequests: '', ratings: '', totalSwaps: '' } },
    );
    n += 1;
  }
  console.log(`users migrated: ${n}`);
}

async function migrateConversations() {
  const col = Conversation.collection;
  const groups = new Map();
  for await (const c of col.find({})) {
    if (!c.participants || c.participants.length !== 2) continue;
    const key = pairKey(c.participants[0], c.participants[1]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(c);
  }
  let merged = 0;
  for (const [key, list] of groups) {
    list.sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
    const [keep, ...dupes] = list;
    for (const d of dupes) {
      await Message.updateMany({ conversation: d._id }, { conversation: keep._id });
      await col.deleteOne({ _id: d._id });
      merged += 1;
    }
    await col.updateOne({ _id: keep._id }, { $set: { pairKey: key } });
  }
  console.log(`conversations keyed: ${groups.size}, duplicates merged: ${merged}`);
}

(async () => {
  try {
    await connectDB();
    await migrateUsers();
    await migrateConversations();
    await mongoose.syncIndexes();
    console.log('Migration complete.');
  } catch (e) {
    console.error('Migration failed:', e);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
