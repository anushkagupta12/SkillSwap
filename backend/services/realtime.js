/** Room every connected socket of a user joins. */
const userRoom = (userId) => `user:${userId}`;

/**
 * Emits to one or many users. Safe to call when Socket.IO isn't attached (unit tests).
 * Always called AFTER the database write succeeded, so clients can't spoof events.
 */
function emitToUsers(app, userIds, event, payload) {
  const io = app?.get?.('io');
  if (!io) return;
  const rooms = [].concat(userIds).filter(Boolean).map((id) => userRoom(id));
  if (rooms.length) io.to(rooms).emit(event, payload);
}

function disconnectUser(app, userId) {
  app?.get?.('io')?.in(userRoom(userId)).disconnectSockets(true);
}

module.exports = { userRoom, emitToUsers, disconnectUser };
