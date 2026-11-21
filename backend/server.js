const { validateEnv } = require('./config/env');

// Fail fast: a missing secret should stop the boot, not 500 on the first login.
try {
  validateEnv();
} catch (e) {
  console.error(`Configuration error: ${e.message}`);
  process.exit(1);
}

const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Presence = require('./sockets/presence');
const { createApp } = require('./app');

const { server, io, presence } = createApp();
const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  // Anyone marked online by a previous (crashed / restarted) process is not online now.
  await Presence.resetAll();
  // Make sure unique / partial indexes exist before accepting traffic.
  await mongoose.syncIndexes().catch((e) => console.error('[db] index sync failed:', e.message));
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`Server listening on http://localhost:${PORT}`);
}

let shuttingDown = false;
async function shutdown(reason, code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Shutting down (${reason})...`);
  const force = setTimeout(() => process.exit(1), 10000);
  force.unref();
  try {
    presence.shutdown();
    await new Promise((resolve) => io.close(resolve)); // also closes the HTTP server
    await mongoose.disconnect();
  } catch (e) {
    console.error('Error during shutdown:', e.message);
    code = 1;
  }
  process.exit(code);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
// After an unhandled rejection the process is in an unknown state: log it and let the host restart us.
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
  shutdown('unhandledRejection', 1);
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  shutdown('uncaughtException', 1);
});

start().catch((err) => {
  console.error('Failed to start:', err.message);
  process.exit(1);
});
