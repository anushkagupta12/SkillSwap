const router = require('express').Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const SwapRequest = require('../models/SwapRequest');
const Rating = require('../models/Rating');
const { protect } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/errors');
const { validateIdParams } = require('../utils/validate');
const { pairKey } = require('../utils/pairKey');
const { withTransaction, transactionsSupported } = require('../utils/tx');
const { swapCooldownHours } = require('../config/env');
const { emitToUsers } = require('../services/realtime');

const HOUR = 60 * 60 * 1000;

// Mounted on /api/users BEFORE the users router: fixed paths must win over /:id.

const shape = (r, otherKey) => ({
  _id: r._id,
  status: r.status,
  message: r.message,
  createdAt: r.createdAt,
  respondedAt: r.respondedAt,
  [otherKey]: User.pickPublic(r[otherKey]),
});

// GET /api/users/requests/inbox - requests sent TO me
router.get(
  '/requests/inbox',
  protect,
  asyncHandler(async (req, res) => {
    const docs = await SwapRequest.find({ to: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('from', User.PUBLIC_SELECT)
      .lean();
    // Senders whose account no longer exists are dropped instead of crashing the client.
    res.json({ success: true, requests: docs.filter((r) => r.from).map((r) => shape(r, 'from')) });
  }),
);

// GET /api/users/requests/sent - requests I sent
router.get(
  '/requests/sent',
  protect,
  asyncHandler(async (req, res) => {
    const docs = await SwapRequest.find({ from: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('to', User.PUBLIC_SELECT)
      .lean();
    res.json({ success: true, requests: docs.filter((r) => r.to).map((r) => shape(r, 'to')) });
  }),
);

// PUT /api/users/requests/:reqId - accept / decline
router.put(
  '/requests/:reqId',
  protect,
  validateIdParams('reqId'),
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!['accepted', 'declined'].includes(status)) {
      throw new AppError(400, 'Status must be accepted or declined');
    }
    const me = req.user._id;
    const existing = await SwapRequest.findOne({ _id: req.params.reqId, to: me });
    if (!existing) throw new AppError(404, 'Request not found');
    if (existing.status !== 'pending') {
      throw new AppError(409, `Request already ${existing.status}`, { code: 'already_responded' });
    }

    const filter = { _id: existing._id, to: me, status: 'pending' };
    let claimed;
    try {
      claimed = await withTransaction(async (session) => {
        // Atomic claim: only one concurrent response can win.
        const r = await SwapRequest.findOneAndUpdate(
          filter,
          { status, respondedAt: new Date() },
          { new: true, session },
        );
        if (r && status === 'accepted') {
          // Idempotent: the count only moves when the connection is actually new.
          await User.updateOne(
            { _id: r.to, connections: { $ne: r.from } },
            { $addToSet: { connections: r.from }, $inc: { connectionsCount: 1 } },
            { session },
          );
          await User.updateOne(
            { _id: r.from, connections: { $ne: r.to } },
            { $addToSet: { connections: r.to }, $inc: { connectionsCount: 1 } },
            { session },
          );
        }
        return r;
      });
    } catch (e) {
      // Standalone MongoDB has no transactions: put the request back so the user can retry.
      if (!transactionsSupported()) {
        await SwapRequest.updateOne({ _id: existing._id }, { status: 'pending', $unset: { respondedAt: 1 } }).catch(() => {});
      }
      throw e;
    }
    if (!claimed) throw new AppError(409, 'Request already handled', { code: 'already_responded' });

    emitToUsers(req.app, claimed.from, 'swap:request:response', {
      requestId: String(claimed._id),
      from: req.user.toBrief(),
      status,
    });
    res.json({ success: true, message: `Request ${status}`, request: { _id: claimed._id, status: claimed.status } });
  }),
);

// POST /api/users/:id/swap-request
router.post(
  '/:id/swap-request',
  protect,
  validateIdParams('id'),
  asyncHandler(async (req, res) => {
    const me = req.user._id;
    const targetId = req.params.id;
    if (String(me) === targetId) throw new AppError(400, "You can't swap with yourself");

    const target = await User.findById(targetId).select('_id');
    if (!target) throw new AppError(404, 'User not found');

    let message = req.body?.message;
    if (message !== undefined && typeof message !== 'string') throw new AppError(400, 'Message must be text');
    message = (message || '').trim().slice(0, 300) || "Hi! I'd love to swap skills with you.";

    if (req.user.connections.some((c) => String(c) === targetId)) {
      throw new AppError(409, 'You are already connected with this user', { code: 'already_connected' });
    }

    const cooldownMs = swapCooldownHours() * HOUR;
    if (cooldownMs > 0) {
      const declined = await SwapRequest.findOne({
        from: me,
        to: targetId,
        status: 'declined',
        respondedAt: { $gt: new Date(Date.now() - cooldownMs) },
      }).select('respondedAt');
      if (declined) {
        throw new AppError(429, `Your last request was declined. You can try again in a few days.`, { code: 'cooldown' });
      }
    }

    let request;
    try {
      // The partial unique index (one pending request per pair) makes this check atomic.
      request = await SwapRequest.create({ from: me, to: targetId, message });
    } catch (e) {
      if (e?.code !== 11000) throw e;
      const pending = await SwapRequest.findOne({ pairKey: pairKey(me, targetId), status: 'pending' }).select('from');
      if (pending && String(pending.from) === targetId) {
        throw new AppError(409, 'This user already sent you a request - check your inbox', { code: 'incoming_pending' });
      }
      throw new AppError(409, 'You already have a pending request with this user', { code: 'already_pending' });
    }

    emitToUsers(req.app, targetId, 'swap:request:received', {
      requestId: String(request._id),
      from: req.user.toBrief(),
    });
    res.status(201).json({ success: true, message: 'Swap request sent!', requestId: request._id });
  }),
);

// POST /api/users/:id/rate - only between connected users, one rating per pair (editable)
router.post(
  '/:id/rate',
  protect,
  validateIdParams('id'),
  asyncHandler(async (req, res) => {
    const me = req.user._id;
    const targetId = req.params.id;
    if (String(me) === targetId) throw new AppError(400, "You can't rate yourself");

    const { score, comment } = req.body;
    if (typeof score !== 'number' || !Number.isInteger(score) || score < 1 || score > 5) {
      throw new AppError(400, 'Score must be a whole number from 1 to 5');
    }
    if (comment !== undefined && typeof comment !== 'string') throw new AppError(400, 'Comment must be text');
    if (comment && comment.length > 300) throw new AppError(400, 'Comment must be at most 300 characters');

    if (!(await User.exists({ _id: targetId }))) throw new AppError(404, 'User not found');
    if (!req.user.connections.some((c) => String(c) === targetId)) {
      throw new AppError(403, 'You can only rate people you have swapped with', { code: 'not_connected' });
    }

    await Rating.findOneAndUpdate(
      { from: me, to: targetId },
      { score, comment: (comment || '').trim() },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );

    const [agg] = await Rating.aggregate([

      { $match: { to: new mongoose.Types.ObjectId(targetId) } },
      { $group: { _id: '$to', avg: { $avg: '$score' }, count: { $sum: 1 } } },
    ]);
    await User.updateOne(
      { _id: targetId },
      { ratingAvg: agg ? Math.round(agg.avg * 10) / 10 : 0, ratingCount: agg ? agg.count : 0 },
    );
    res.json({ success: true });
  }),
);

module.exports = router;
