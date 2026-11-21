const User = require('../models/User');
const { userRoom } = require('../services/realtime');
const { presenceDebounceMs } = require('../config/env');

/**
 * Tracks which users are online. A user is online while they have at least one
 * socket (so several tabs work); going offline is debounced to absorb reconnects.
 * Status changes are only sent to the user's connections, not broadcast to everyone.
 *
 * This state lives in process memory - with several server instances it would
 * move to Redis (see README "Scaling").
 */
class Presence {
  constructor(io) {
    this.io = io;
    this.sockets = new Map(); // userId -> Set<socketId>
    this.offlineTimers = new Map(); // userId -> Timeout
  }

  isOnline(uid) {
    return (this.sockets.get(uid)?.size || 0) > 0;
  }

  async connectionsOf(uid) {
    const u = await User.findById(uid).select('connections').lean();
    return (u?.connections || []).map(String);
  }

  async notify(uid, isOnline, lastSeen) {
    const friends = await this.connectionsOf(uid);
    if (!friends.length) return;
    this.io.to(friends.map(userRoom)).emit('user:status', { userId: uid, isOnline, lastSeen });
  }

  /** Called when a socket connects. Returns the connections that are online right now. */
  async add(uid, socketId) {
    const wasOnline = this.isOnline(uid);
    if (!this.sockets.has(uid)) this.sockets.set(uid, new Set());
    this.sockets.get(uid).add(socketId);

    const pending = this.offlineTimers.get(uid);
    if (pending) {
      // Quick reconnect: they never really went offline.
      clearTimeout(pending);
      this.offlineTimers.delete(uid);
    } else if (!wasOnline) {
      await User.updateOne({ _id: uid }, { isOnline: true });
      this.notify(uid, true).catch(() => {});
    }
    const friends = await this.connectionsOf(uid);
    return friends.filter((f) => this.isOnline(f));
  }

  remove(uid, socketId) {
    const set = this.sockets.get(uid);
    if (!set) return;
    set.delete(socketId);
    if (set.size > 0) return; // another tab is still open
    this.sockets.delete(uid);

    const ms = presenceDebounceMs();
    const finish = async () => {
      this.offlineTimers.delete(uid);
      if (this.isOnline(uid)) return;
      const lastSeen = new Date();
      await User.updateOne({ _id: uid }, { isOnline: false, lastSeen }).catch(() => {});
      this.notify(uid, false, lastSeen).catch(() => {});
    };
    if (ms <= 0) finish();
    else {
      const t = setTimeout(finish, ms);
      t.unref?.();
      this.offlineTimers.set(uid, t);
    }
  }

  /** After a crash/restart nobody is really online, whatever the DB says. */
  static resetAll() {
    return User.updateMany({ isOnline: true }, { isOnline: false });
  }

  shutdown() {
    for (const t of this.offlineTimers.values()) clearTimeout(t);
    this.offlineTimers.clear();
  }
}

module.exports = Presence;
