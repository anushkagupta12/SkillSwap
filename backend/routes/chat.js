const router = require('express').Router();
const { Conversation, Message } = require('../models/Chat');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/errors');
const { isObjectId, validateIdParams } = require('../utils/validate');
const { clampInt, optionalString } = require('../utils/pick');
const { pairKey } = require('../utils/pairKey');
const { requireMember, sendMessage, markRead } = require('../services/chat');
const { emitToUsers } = require('../services/realtime');

const PARTICIPANT_SELECT = 'name initials avatarColor isOnline lastSeen';

/** Conversations for the current user, each with an `unreadCount`. */
router.get(
  '/conversations',
  protect,
  asyncHandler(async (req, res) => {
    const convos = await Conversation.find({ participants: req.user._id })
      .populate('participants', PARTICIPANT_SELECT)
      .populate({ path: 'lastMessage', select: 'content sender createdAt read' })
      .sort({ lastMessageAt: -1 })
      .limit(200)
      .lean();

    const unread = await Message.aggregate([
      { $match: { conversation: { $in: convos.map((c) => c._id) }, sender: { $ne: req.user._id }, read: false } },
      { $group: { _id: '$conversation', n: { $sum: 1 } } },
    ]);
    const unreadBy = new Map(unread.map((u) => [String(u._id), u.n]));

    res.json({
      success: true,
      conversations: convos.map((c) => ({ ...c, unreadCount: unreadBy.get(String(c._id)) || 0 })),
    });
  }),
);

/** Get-or-create the 1:1 conversation with `recipientId` (race free via unique pairKey). */
router.post(
  '/conversations',
  protect,
  asyncHandler(async (req, res) => {
    const { recipientId } = req.body;
    if (!isObjectId(recipientId)) throw new AppError(400, 'Invalid recipient');
    if (String(recipientId) === String(req.user._id)) throw new AppError(400, "You can't message yourself");
    if (!(await User.exists({ _id: recipientId }))) throw new AppError(404, 'User not found');

    const clip = (v) => optionalString(typeof v === 'string' ? v : undefined, { max: 60 });
    const key = pairKey(req.user._id, recipientId);

    let convo;
    try {
      convo = await Conversation.findOneAndUpdate(
        { pairKey: key },
        {
          $setOnInsert: {
            pairKey: key,
            participants: [req.user._id, recipientId],
            skillSwapContext: { teachSkill: clip(req.body.teachSkill), learnSkill: clip(req.body.learnSkill) },
          },
        },
        { upsert: true, new: true },
      );
    } catch (e) {
      // Two concurrent upserts: the loser re-reads the winner's document.
      if (e?.code !== 11000) throw e;
      convo = await Conversation.findOne({ pairKey: key });
    }
    await convo.populate('participants', PARTICIPANT_SELECT);

    // Make sure the recipient's live UI knows about it immediately.
    emitToUsers(req.app, [recipientId], 'conversation:new', { conversationId: String(convo._id) });
    res.json({ success: true, conversation: convo });
  }),
);

/**
 * Cursor pagination, newest first:  ?before=<messageId>&limit=30
 * Returns messages oldest->newest plus `nextCursor` (null when there is nothing older).
 */
router.get(
  '/conversations/:id/messages',
  protect,
  validateIdParams('id'),
  asyncHandler(async (req, res) => {
    // Authorization BEFORE any read or write.
    await requireMember(req.params.id, req.user._id);

    const limit = clampInt(req.query.limit, 30, 1, 100);
    const query = { conversation: req.params.id };
    if (req.query.before !== undefined) {
      if (!isObjectId(req.query.before)) throw new AppError(400, 'Invalid cursor');
      query._id = { $lt: req.query.before };
    }
    const docs = await Message.find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .populate('sender', 'name initials avatarColor');
    const hasMore = docs.length > limit;
    const page = docs.slice(0, limit).reverse();

    // Only the first page (no cursor) counts as "opening" the chat.
    if (req.query.before === undefined) {
      await markRead(req.app, { conversationId: req.params.id, userId: req.user._id });
    }
    res.json({ success: true, messages: page, nextCursor: hasMore ? String(page[0]._id) : null });
  }),
);

router.post(
  '/conversations/:id/messages',
  protect,
  validateIdParams('id'),
  asyncHandler(async (req, res) => {
    const message = await sendMessage(req.app, {
      conversationId: req.params.id,
      senderId: req.user._id,
      content: req.body.content,
    });
    res.status(201).json({ success: true, message });
  }),
);

router.post(
  '/conversations/:id/read',
  protect,
  validateIdParams('id'),
  asyncHandler(async (req, res) => {
    const updated = await markRead(req.app, { conversationId: req.params.id, userId: req.user._id });
    res.json({ success: true, updated });
  }),
);

module.exports = router;
