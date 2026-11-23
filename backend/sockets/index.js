const { Server } = require('socket.io');
const { verifyToken } = require('../services/tokens');
const { userFromToken } = require('../middleware/auth');
const { requireMember, sendMessage, markRead } = require('../services/chat');
const { userRoom, emitToUsers } = require('../services/realtime');
const { clientOrigins } = require('../config/env');
const { TokenBucket } = require('../utils/tokenBucket');
const { AppError } = require('../utils/errors');
const Presence = require('./presence');

const GRACE_MS = 10 * 1000; // allow a client a moment to send a refreshed token
const CONVO_CACHE_MS = 60 * 1000;

/** Generic, non-leaking error payload for acks. */
const failure = (e) => {
  if (e instanceof AppError) return { ok: false, code: e.code, status: e.status };
  return { ok: false, code: 'server_error', status: 500 };
};

function attachSockets(httpServer, app) {
  const io = new Server(httpServer, {
    cors: {
      origin: clientOrigins(),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Polling stays enabled as a fallback (corporate proxies, cold-starting hosts).
    maxHttpBufferSize: 16 * 1024,
  });
  const presence = new Presence(io);
  app.set('io', io);
  app.set('presence', presence);

  // ── Auth handshake ─────────────────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const decoded = verifyToken(String(socket.handshake.auth?.token || ''), 'access');
      const user = await userFromToken(decoded, 'name initials avatarColor tokenVersion');
      if (!user) throw new Error('unauthorized');
      // Keep only what's needed - never the full user document (no email etc.).
      socket.data.user = { _id: String(user._id), name: user.name, initials: user.initials, avatarColor: user.avatarColor };
      socket.data.exp = decoded.exp * 1000;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const me = socket.data.user;
    const uid = me._id;
    const msgBucket = new TokenBucket(10, 1); // 10 burst, then 1 msg/s
    const typingBucket = new TokenBucket(10, 4);
    const convoCache = new Map(); // conversationId -> { participants, at }

    // ── Token lifetime ───────────────────────────────────────────────────────
    let expiryTimer;
    const armExpiry = () => {
      clearTimeout(expiryTimer);
      const wait = Math.max(socket.data.exp - Date.now(), 0) + GRACE_MS;
      expiryTimer = setTimeout(() => {
        socket.emit('auth:expired');
        socket.disconnect(true);
      }, wait);
      expiryTimer.unref?.();
    };
    armExpiry();

    // Join the personal room synchronously so no event emitted right after connect can be missed.
    socket.join(userRoom(uid));







    const participantsOf = async (conversationId) => {
      const cached = convoCache.get(conversationId);
      if (cached && Date.now() - cached.at < CONVO_CACHE_MS) return cached.participants;
      const convo = await requireMember(conversationId, uid);
      const participants = convo.participants.map(String);
      convoCache.set(conversationId, { participants, at: Date.now() });
      if (convoCache.size > 100) convoCache.delete(convoCache.keys().next().value);
      return participants;
    };

    const guard = (handler, bucket) => async (payload, ack) => {
      const cb = typeof ack === 'function' ? ack : () => {};
      if (Date.now() > socket.data.exp + GRACE_MS) {
        socket.emit('auth:expired');
        return socket.disconnect(true);
      }
      if (bucket && !bucket.take()) return cb({ ok: false, code: 'rate_limited', status: 429 });
      if (!payload || typeof payload !== 'object') return cb({ ok: false, code: 'invalid', status: 400 });
      try {
        await handler(payload, cb);
      } catch (e) {
        if (!(e instanceof AppError)) console.error('[socket] handler error:', e.message);
        cb(failure(e));
      }
    };

    // The client sends a fresh access token after refreshing its session.
    socket.on('auth:refresh', async (payload, ack) => {
      const cb = typeof ack === 'function' ? ack : () => {};
      try {
        const decoded = verifyToken(String(payload?.token || ''), 'access');
        if (decoded.id !== uid) throw new Error('mismatch');
        if (!(await userFromToken(decoded, 'tokenVersion'))) throw new Error('revoked');
        socket.data.exp = decoded.exp * 1000;
        armExpiry();
        cb({ ok: true });
      } catch {
        cb({ ok: false, code: 'unauthorized', status: 401 });
        socket.disconnect(true);
      }
    });

    socket.on(
      'message:send',
      guard(async ({ conversationId, content, clientId }, cb) => {
        const message = await sendMessage(app, { conversationId: String(conversationId), senderId: uid, content, clientId });
        cb({ ok: true, message, clientId });
      }, msgBucket),
    );

    socket.on(
      'messages:read',
      guard(async ({ conversationId }, cb) => {
        await markRead(app, { conversationId: String(conversationId), userId: uid });
        cb({ ok: true });
      }, typingBucket),
    );

    const typing = (event) =>
      guard(async ({ conversationId }, cb) => {
        const others = (await participantsOf(String(conversationId))).filter((p) => p !== uid);
        emitToUsers(app, others, event, { conversationId: String(conversationId), userId: uid, name: me.name });
        cb({ ok: true });
      }, typingBucket);
    socket.on('typing:start', typing('typing:start'));
    socket.on('typing:stop', typing('typing:stop'));

    // Registered before any await: if the socket drops while presence is being set up, we still clean up.
    let presenceAdded = false;
    socket.on('disconnect', () => {
      clearTimeout(expiryTimer);
      if (presenceAdded) presence.remove(uid, socket.id);
    });

    // Async setup comes LAST, after every listener above is attached.
    try {
      const onlineFriends = await presence.add(uid, socket.id);
      presenceAdded = true;
      if (socket.connected) socket.emit('presence:init', { online: onlineFriends });
      else presence.remove(uid, socket.id); // disconnected while we were setting up
    } catch (e) {
      console.error('[socket] presence init failed:', e.message);
    }
  });

  return { io, presence };
}

module.exports = { attachSockets };
