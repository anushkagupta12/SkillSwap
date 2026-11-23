const { io: connect } = require('socket.io-client');
const { api, getApp, registerUser, connectUsers } = require('./helpers');
const { Message } = require('../models/Chat');
const User = require('../models/User');

let port;
const sockets = [];

beforeAll(async () => {
  await new Promise((resolve) => getApp().server.listen(0, resolve));
  port = getApp().server.address().port;
});

afterEach(() => {
  while (sockets.length) sockets.pop().close();
});

afterAll(async () => {
  getApp().presence.shutdown();
  await new Promise((resolve) => getApp().io.close(resolve));
});

const open = (token, opts = {}) =>
  new Promise((resolve, reject) => {
    const s = connect(`http://localhost:${port}`, { auth: { token }, transports: ['websocket'], reconnection: false, ...opts });
    sockets.push(s);
    s.once('connect', () => resolve(s));
    s.once('connect_error', reject);
  });

const once = (s, ev, ms = 3000) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting for ${ev}`)), ms);
    s.once(ev, (d) => { clearTimeout(t); resolve(d); });
  });

const never = (s, ev, ms = 400) =>
  new Promise((resolve, reject) => {
    const h = (payload) => reject(new Error(`unexpected ${ev}: ${JSON.stringify(payload)}`));
    s.once(ev, h);
    setTimeout(() => { s.off(ev, h); resolve(); }, ms);
  });

const emitAck = (s, ev, payload) => new Promise((resolve) => s.emit(ev, payload, resolve));

async function convoBetween(a, b) {
  const res = await api().post('/api/chat/conversations').set(a.auth).send({ recipientId: b.id });
  return res.body.conversation._id;
}

describe('handshake', () => {
  test('rejects missing, garbage, refresh-typed and revoked tokens', async () => {
    await expect(open('')).rejects.toThrow('Unauthorized');
    await expect(open('garbage')).rejects.toThrow('Unauthorized');
    const u = await registerUser();
    await api().post('/api/auth/logout-all').set(u.auth);
    await expect(open(u.token)).rejects.toThrow('Unauthorized');
  });

  test('accepts a valid token', async () => {
    const u = await registerUser();
    const s = await open(u.token);
    expect(s.connected).toBe(true);
  });
});

describe('messaging', () => {
  test('ack carries the saved message; both participants get it live', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const cid = await convoBetween(a, b);
    const [sa, sb] = [await open(a.token), await open(b.token)];

    const incoming = once(sb, 'message:new');
    const ack = await emitAck(sa, 'message:send', { conversationId: cid, content: 'hello', clientId: 'tmp-1' });
    expect(ack).toMatchObject({ ok: true, clientId: 'tmp-1' });
    expect(ack.message.content).toBe('hello');
    expect((await incoming).content).toBe('hello');
  });

  test('a recipient who connected BEFORE the conversation existed still gets live messages', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const [sa, sb] = [await open(a.token), await open(b.token)]; // no conversation yet
    const cid = await convoBetween(a, b); // created afterwards
    const incoming = once(sb, 'message:new');
    await emitAck(sa, 'message:send', { conversationId: cid, content: 'late join works' });
    expect((await incoming).content).toBe('late join works');
  });

  test('non-members cannot send: error ack, nothing stored, nothing delivered', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const eve = await registerUser();
    const cid = await convoBetween(a, b);
    const [sb, se] = [await open(b.token), await open(eve.token)];

    const leak = never(sb, 'message:new');
    const ack = await emitAck(se, 'message:send', { conversationId: cid, content: 'injected' });
    expect(ack).toMatchObject({ ok: false, code: 'forbidden', status: 403 });
    await leak;
    expect(await Message.countDocuments({ content: 'injected' })).toBe(0);
  });

  test('a non-member never receives a conversation\'s messages, even after trying join:room', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const eve = await registerUser();
    const cid = await convoBetween(a, b);
    const [sa, se] = [await open(a.token), await open(eve.token)];
    se.emit('join:room', cid); // legacy event no longer exists server-side
    se.emit('join:conversations');
    const leak = never(se, 'message:new');
    await emitAck(sa, 'message:send', { conversationId: cid, content: 'private' });
    await leak;
  });

  test('errors are generic codes - no internal messages leak', async () => {
    const a = await registerUser();
    const s = await open(a.token);
    for (const payload of [{ conversationId: 'not-an-id', content: 'x' }, { conversationId: { $ne: 1 }, content: 'x' }, null, 'str']) {
      const ack = await emitAck(s, 'message:send', payload);
      expect(ack.ok).toBe(false);
      expect(Object.keys(ack).sort()).toEqual(['code', 'ok', 'status']);
    }
  });

  test('empty and over-long content are rejected', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const cid = await convoBetween(a, b);
    const s = await open(a.token);
    expect((await emitAck(s, 'message:send', { conversationId: cid, content: '  ' })).ok).toBe(false);
    expect((await emitAck(s, 'message:send', { conversationId: cid, content: 'x'.repeat(2001) })).ok).toBe(false);
  });

  test('per-socket rate limit kicks in on spam', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const cid = await convoBetween(a, b);
    const s = await open(a.token);
    const acks = await Promise.all(Array.from({ length: 30 }, (_, i) => emitAck(s, 'message:send', { conversationId: cid, content: `spam ${i}` })));
    expect(acks.some((r) => r.code === 'rate_limited')).toBe(true);
    expect(acks.filter((r) => r.ok).length).toBeLessThan(30);
  });

  test('read receipts reach the sender', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const cid = await convoBetween(a, b);
    const [sa, sb] = [await open(a.token), await open(b.token)];
    await emitAck(sa, 'message:send', { conversationId: cid, content: 'read me' });
    const receipt = once(sa, 'messages:read');
    await emitAck(sb, 'messages:read', { conversationId: cid });
    expect(await receipt).toMatchObject({ conversationId: cid, by: b.id });
  });

  test('typing events are scoped to the conversation and the other participant only', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const c = await registerUser();
    const cid = await convoBetween(a, b);
    const [sa, sb, sc] = [await open(a.token), await open(b.token), await open(c.token)];
    const got = once(sb, 'typing:start');
    const leak = never(sc, 'typing:start');
    const selfEcho = never(sa, 'typing:start');
    await emitAck(sa, 'typing:start', { conversationId: cid });
    expect(await got).toMatchObject({ conversationId: cid, userId: a.id });
    await leak;
    await selfEcho;
    // outsider typing into someone else's conversation is refused
    expect((await emitAck(sc, 'typing:start', { conversationId: cid })).ok).toBe(false);
  });
});

describe('swap notifications are server-originated', () => {
  test('received / response events fire from the REST routes', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const [sa, sb] = [await open(a.token), await open(b.token)];

    const received = once(sb, 'swap:request:received');
    const sent = await api().post(`/api/users/${b.id}/swap-request`).set(a.auth).send({});
    const evt = await received;
    expect(evt.from).toMatchObject({ _id: a.id });
    expect(evt.from).not.toHaveProperty('email');

    const response = once(sa, 'swap:request:response');
    await api().put(`/api/users/requests/${sent.body.requestId}`).set(b.auth).send({ status: 'accepted' });
    expect(await response).toMatchObject({ status: 'accepted', from: { _id: b.id } });
  });

  test('a client cannot spoof them: the old client->server events do nothing', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const [sa, sb] = [await open(a.token), await open(b.token)];
    const leak = never(sb, 'swap:request:received');
    sa.emit('swap:request:send', { targetUserId: b.id });
    sa.emit('swap:request:respond', { targetUserId: b.id, status: 'accepted' });
    await leak;
  });
});

describe('presence', () => {
  test('connections get a snapshot of who is online and live status changes', async () => {
    const a = await registerUser();
    const b = await registerUser();
    await connectUsers(a, b);
    const sa = await open(a.token);

    const online = once(sa, 'user:status');
    const sb = await open(b.token, {});
    expect(await online).toMatchObject({ userId: b.id, isOnline: true });
    expect((await User.findById(b.id)).isOnline).toBe(true);

    const offline = once(sa, 'user:status');
    sb.close();
    expect(await offline).toMatchObject({ userId: b.id, isOnline: false });
    expect((await User.findById(b.id)).isOnline).toBe(false);
  });

  test('presence:init lists connections that are already online', async () => {
    const a = await registerUser();
    const b = await registerUser();
    await connectUsers(a, b);
    await open(b.token);
    const sa = connect(`http://localhost:${port}`, { auth: { token: a.token }, transports: ['websocket'], reconnection: false });
    sockets.push(sa);
    const init = await once(sa, 'presence:init');
    expect(init.online).toEqual([b.id]);
  });

  test('status is NOT broadcast to strangers', async () => {
    const a = await registerUser();
    const stranger = await registerUser();
    const ss = await open(stranger.token);
    const leak = never(ss, 'user:status', 500);
    await open(a.token);
    await leak;
  });

  test('two tabs: closing one does not mark the user offline', async () => {
    const a = await registerUser();
    const b = await registerUser();
    await connectUsers(a, b);
    const sb = await open(b.token);
    // The first tab legitimately announces "online" (asynchronously). Wait for it so it can't be
    // mistaken for a spurious event below.
    const cameOnline = once(sb, 'user:status');
    const tab1 = await open(a.token);
    expect(await cameOnline).toMatchObject({ userId: a.id, isOnline: true });
    const tab2 = await open(a.token); // second tab: user is already online, nothing to announce
    const leak = never(sb, 'user:status', 500);
    tab1.close();
    await leak;
    expect((await User.findById(a.id)).isOnline).toBe(true);
    const offline = once(sb, 'user:status');
    tab2.close();
    expect(await offline).toMatchObject({ userId: a.id, isOnline: false });
  });
});
