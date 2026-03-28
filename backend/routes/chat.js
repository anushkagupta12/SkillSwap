const router = require('express').Router();
const { Conversation, Message } = require('../models/Chat');
const { protect } = require('../middleware/auth');

router.get('/conversations', protect, async (req, res) => {
  try {
    const convos = await Conversation.find({ participants: req.user._id })
      .populate('participants', 'name initials avatarColor isOnline lastSeen')
      .populate('lastMessage')
      .sort({ lastMessageAt: -1 });
    res.json({ success: true, conversations: convos });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/conversations', protect, async (req, res) => {
  try {
    const { recipientId, teachSkill, learnSkill } = req.body;
    let convo = await Conversation.findOne({ participants: { $all: [req.user._id, recipientId] } })
      .populate('participants', 'name initials avatarColor isOnline');
    if (!convo) {
      convo = await Conversation.create({ participants: [req.user._id, recipientId], skillSwapContext: { teachSkill, learnSkill } });
      convo = await convo.populate('participants', 'name initials avatarColor isOnline');
    }
    res.json({ success: true, conversation: convo });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/conversations/:id/messages', protect, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const messages = await Message.find({ conversation: req.params.id })
      .populate('sender', 'name initials avatarColor')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));
    await Message.updateMany({ conversation: req.params.id, sender: { $ne: req.user._id }, read: false }, { read: true });
    res.json({ success: true, messages: messages.reverse() });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/conversations/:id/messages', protect, async (req, res) => {
  try {
    const msg = await Message.create({ conversation: req.params.id, sender: req.user._id, content: req.body.content });
    await Conversation.findByIdAndUpdate(req.params.id, { lastMessage: msg._id, lastMessageAt: new Date() });
    const populated = await msg.populate('sender', 'name initials avatarColor');
    res.json({ success: true, message: populated });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
