const { Conversation, Message } = require('../models/Chat');
const { AppError } = require('../utils/errors');
const { isObjectId } = require('../utils/validate');
const { emitToUsers } = require('./realtime');

const MAX_MESSAGE_LENGTH = 2000;

/** The single membership check used by REST routes and sockets. */
const isMember = (cid, uid) => Conversation.exists({ _id: cid, participants: uid });

/** Returns the conversation (participants only) or throws 403. */
async function requireMember(cid, uid) {
  if (!isObjectId(String(cid))) throw new AppError(400, 'Invalid id');
  const convo = await Conversation.findOne({ _id: cid, participants: uid }).select('participants');
  if (!convo) throw new AppError(403, 'You are not part of this conversation');
  return convo;
}

const normalizeContent = (content) => {
  if (typeof content !== 'string') throw new AppError(400, 'Message must be text');
  const text = content.trim();
  if (!text) throw new AppError(400, 'Message cannot be empty');
  if (text.length > MAX_MESSAGE_LENGTH) throw new AppError(400, `Message is limited to ${MAX_MESSAGE_LENGTH} characters`);
  return text;
};

/** Creates a message and delivers it to every participant's personal room. */
async function sendMessage(app, { conversationId, senderId, content, clientId }) {
  const text = normalizeContent(content);
  const convo = await requireMember(conversationId, senderId);
  const msg = await Message.create({ conversation: convo._id, sender: senderId, content: text });
  await Conversation.updateOne({ _id: convo._id }, { lastMessage: msg._id, lastMessageAt: msg.createdAt });
  const populated = await Message.findById(msg._id).populate('sender', 'name initials avatarColor');
  // The sender's temporary client id lets the sending UI swap its optimistic bubble in place.
  const live = populated.toJSON();
  if (typeof clientId === 'string' && clientId.length <= 64) live.clientId = clientId;
  emitToUsers(app, convo.participants, 'message:new', live);
  return populated;
}

/** Marks the other participants' messages as read and tells them. */
async function markRead(app, { conversationId, userId }) {
  const convo = await requireMember(conversationId, userId);
  const res = await Message.updateMany(
    { conversation: convo._id, sender: { $ne: userId }, read: false },
    { read: true, readAt: new Date() },
  );
  if (res.modifiedCount > 0) {
    emitToUsers(
      app,
      convo.participants.filter((p) => String(p) !== String(userId)),
      'messages:read',
      { conversationId: String(convo._id), by: String(userId) },
    );
  }
  return res.modifiedCount;
}

module.exports = { isMember, requireMember, sendMessage, markRead, MAX_MESSAGE_LENGTH };
