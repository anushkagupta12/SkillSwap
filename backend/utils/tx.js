const mongoose = require('mongoose');

/** True when the connected deployment supports multi-document transactions (replica set / mongos). */
function transactionsSupported() {
  try {
    const type = mongoose.connection.getClient().topology?.description?.type;
    return !!type && type !== 'Single' && type !== 'Unknown';
  } catch {
    return false;
  }
}

/**
 * Runs `fn(session)` in a transaction when supported (Atlas, replica sets).
 * On a standalone mongod (local dev) it runs `fn(null)` - callers must keep
 * their writes idempotent so that case is still safe to retry.
 */
async function withTransaction(fn) {
  if (!transactionsSupported()) return fn(null);
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

module.exports = { withTransaction, transactionsSupported };
