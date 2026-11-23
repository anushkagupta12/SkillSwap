const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const mongoose = require('mongoose');
const { clientOrigins, isProd } = require('./config/env');
const { apiLimiter } = require('./middleware/rateLimit');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { attachSockets } = require('./sockets');

/** Builds the Express app + HTTP server (+ Socket.IO). Does not listen or connect to the DB. */
function createApp() {
  const app = express();
  const server = http.createServer(app);

  if (isProd()) app.set('trust proxy', 1); // correct client IPs behind Render/Railway/etc.
  app.disable('x-powered-by');

  const origins = clientOrigins();
  app.use(helmet());
  app.use(
    cors({
      origin(origin, cb) {
        // No Origin header = same-origin / curl / server-to-server.
        if (!origin || origins.includes(origin)) return cb(null, true);
        cb(new Error('CORS not allowed'));
      },
      credentials: true,
    }),
  );
  if (process.env.NODE_ENV !== 'test') app.use(morgan(isProd() ? 'combined' : 'dev'));
  app.use(express.json({ limit: '50kb' }));
  app.use(cookieParser());
  // Strips keys starting with "$" or containing "." from body/query/params (NoSQL injection safety net).
  app.use(mongoSanitize());

  app.get('/api/health', (req, res) => {
    const dbUp = mongoose.connection.readyState === 1;
    res.status(dbUp ? 200 : 503).json({ status: dbUp ? 'ok' : 'degraded', db: dbUp ? 'up' : 'down' });
  });

  app.use('/api', apiLimiter);
  app.use('/api/auth/oauth', require('./routes/oauth')); // before /api/auth so it is matched first
  app.use('/api/auth', require('./routes/auth'));
  // swaps first: its fixed paths (/requests/inbox ...) must win over users' /:id
  app.use('/api/users', require('./routes/swaps'));
  app.use('/api/users', require('./routes/users'));
  app.use('/api/chat', require('./routes/chat'));
  app.use('/api/stats', require('./routes/stats'));

  app.use('/api', notFound);
  app.use(errorHandler);

  const sockets = attachSockets(server, app);
  return { app, server, ...sockets };
}

module.exports = { createApp };
