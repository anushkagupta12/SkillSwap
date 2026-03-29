process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
});
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const connectDB = require('./config/db');
const User = require('./models/User');
const { Message, Conversation } = require('./models/Chat');

const app = express();
const server = http.createServer(app);
const allowedOrigins = [
  "http://localhost:5173",
  "https://skill-swap-eight-beta.vercel.app"
];
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
});

connectDB();


app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed"));
    }
  },
  credentials: true
}));
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/chat', require('./routes/chat'));
app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

// ─── Socket.IO ───────────────────────────────────────────────
const online = new Map(); // userId → socketId

io.use(async (socket, next) => {
  try {
    const decoded = jwt.verify(socket.handshake.auth.token, process.env.JWT_SECRET);
    socket.user = await User.findById(decoded.id).select('-password');
    if (!socket.user) throw new Error('Not found');
    next();
  } catch { next(new Error('Unauthorized')); }
});

io.on('connection', async (socket) => {
  const uid = socket.user._id.toString();
  online.set(uid, socket.id);
  await User.findByIdAndUpdate(uid, { isOnline: true });
  io.emit('user:status', { userId: uid, isOnline: true });

  socket.on('join:conversations', async () => {
    const convos = await Conversation.find({ participants: uid });
    convos.forEach(c => socket.join(c._id.toString()));
  });

  socket.on('join:room', (roomId) => socket.join(roomId));

  socket.on('message:send', async ({ conversationId, content }) => {
    if (!content?.trim()) return;
    try {
      const msg = await Message.create({ conversation: conversationId, sender: socket.user._id, content: content.trim() });
      await Conversation.findByIdAndUpdate(conversationId, { lastMessage: msg._id, lastMessageAt: new Date() });
      const populated = await Message.findById(msg._id).populate('sender', 'name initials avatarColor');
      io.to(conversationId).emit('message:new', populated);
    } catch (e) { socket.emit('error', { message: e.message }); }
  });

  socket.on('typing:start', ({ conversationId }) =>
    socket.to(conversationId).emit('typing:start', { userId: uid, name: socket.user.name }));
  socket.on('typing:stop', ({ conversationId }) =>
    socket.to(conversationId).emit('typing:stop', { userId: uid }));

  socket.on('disconnect', async () => {
    online.delete(uid);
    await User.findByIdAndUpdate(uid, { isOnline: false, lastSeen: new Date() });
    io.emit('user:status', { userId: uid, isOnline: false });
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server on http://localhost:${PORT}`));
