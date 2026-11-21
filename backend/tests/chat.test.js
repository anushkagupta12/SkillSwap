const { api, registerUser } = require('./helpers');
const { Conversation, Message } = require('../models/Chat');

async function makeConvo(a, b) {
  const res = await api().post('/api/chat/conversations').set(a.auth).send({ recipientId: b.id });
  expect(res.status).toBe(200);
  return res.body.conversation._id;
}

describe('chat authorization boundary (REST)', () => {
  let alice, bob, eve, cid;
  beforeEach(async () => {
    alice = await registerUser({ name: 'Alice A' });
    bob = await registerUser({ name: 'Bob B' });
    eve = await registerUser({ name: 'Eve E' });
    cid = await makeConvo(alice, bob);
    await api().post(`/api/chat/conversations/${cid}/messages`).set(alice.auth).send({ content: 'secret plans' });
  });

  test('a non-member cannot read messages (403)', async () => {
    const res = await api().get(`/api/chat/conversations/${cid}/messages`).set(eve.auth);
    expect(res.status).toBe(403);
    expect(JSON.stringify(res.body)).not.toMatch(/secret plans/);
  });

  test('a non-member cannot inject messages (403) and nothing is written', async () => {
    const res = await api().post(`/api/chat/conversations/${cid}/messages`).set(eve.auth).send({ content: 'pwned' });
    expect(res.status).toBe(403);
    expect(await Message.countDocuments({ content: 'pwned' })).toBe(0);
  });

  test('a non-member cannot mark messages as read (check happens before updateMany)', async () => {
    const res = await api().post(`/api/chat/conversations/${cid}/read`).set(eve.auth);
    expect(res.status).toBe(403);
    expect((await Message.findOne({ content: 'secret plans' })).read).toBe(false);
  });

  test('a non-member GET does not flip other people\'s messages to read', async () => {
    await api().get(`/api/chat/conversations/${cid}/messages`).set(eve.auth);
    expect((await Message.findOne({ content: 'secret plans' })).read).toBe(false);
  });

  test('members can read; opening the chat marks the other side\'s messages read', async () => {
    const res = await api().get(`/api/chat/conversations/${cid}/messages`).set(bob.auth);
    expect(res.status).toBe(200);
    expect(res.body.messages.map((m) => m.content)).toEqual(['secret plans']);
    expect((await Message.findOne({ content: 'secret plans' })).read).toBe(true);
  });

  test('your own messages are not marked read by opening your own chat', async () => {
    await api().get(`/api/chat/conversations/${cid}/messages`).set(alice.auth);
    expect((await Message.findOne({ content: 'secret plans' })).read).toBe(false);
  });

  test('invalid or unknown conversation ids: 400 / 403, never 500', async () => {
    expect((await api().get('/api/chat/conversations/abc/messages').set(alice.auth)).status).toBe(400);
    expect((await api().get('/api/chat/conversations/507f1f77bcf86cd799439011/messages').set(alice.auth)).status).toBe(403);
  });

  test('the conversation list only contains my conversations and carries unread counts', async () => {
    const mine = await api().get('/api/chat/conversations').set(bob.auth);
    expect(mine.body.conversations).toHaveLength(1);
    expect(mine.body.conversations[0].unreadCount).toBe(1);
    expect((await api().get('/api/chat/conversations').set(eve.auth)).body.conversations).toHaveLength(0);
    for (const p of mine.body.conversations[0].participants) {
      expect(p).not.toHaveProperty('email');
    }
  });

  test('endpoints require authentication', async () => {
    expect((await api().get(`/api/chat/conversations/${cid}/messages`)).status).toBe(401);
  });
});

describe('message validation', () => {
  test('empty, whitespace, non-string and over-long messages are rejected', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const cid = await makeConvo(a, b);
    const post = (content) => api().post(`/api/chat/conversations/${cid}/messages`).set(a.auth).send({ content });
    expect((await post('')).status).toBe(400);
    expect((await post('   ')).status).toBe(400);
    expect((await post({ $ne: 1 })).status).toBe(400);
    expect((await post('x'.repeat(2001))).status).toBe(400);
    expect((await post('x'.repeat(2000))).status).toBe(201);
  });
});

describe('conversation creation', () => {
  test('validates the recipient: invalid, own id, and nonexistent', async () => {
    const a = await registerUser();
    const post = (recipientId) => api().post('/api/chat/conversations').set(a.auth).send({ recipientId });
    expect((await post('nope')).status).toBe(400);
    expect((await post(undefined)).status).toBe(400);
    expect((await post(a.id)).status).toBe(400);
    expect((await post('507f1f77bcf86cd799439011')).status).toBe(404);
    expect(await Conversation.countDocuments()).toBe(0);
  });

  test('get-or-create is idempotent and order independent', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const one = await makeConvo(a, b);
    const two = await makeConvo(b, a);
    const three = await makeConvo(a, b);
    expect(new Set([one, two, three]).size).toBe(1);
    expect(await Conversation.countDocuments()).toBe(1);
  });

  test('concurrent creation never makes duplicates', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const results = await Promise.all(
      [a, b, a, b, a, b].map((u, i) =>
        api().post('/api/chat/conversations').set(u.auth).send({ recipientId: i % 2 === 0 ? b.id : a.id }),
      ),
    );
    expect(results.every((r) => r.status === 200)).toBe(true);
    expect(await Conversation.countDocuments()).toBe(1);
    expect(new Set(results.map((r) => r.body.conversation._id)).size).toBe(1);
  });
});

describe('cursor pagination', () => {
  test('pages backwards without gaps or duplicates and clamps the limit', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const cid = await makeConvo(a, b);
    const docs = Array.from({ length: 25 }, (_, i) => ({ conversation: cid, sender: a.id, content: `m${i}` }));
    for (const d of docs) await Message.create(d); // sequential => increasing ids

    const p1 = await api().get(`/api/chat/conversations/${cid}/messages?limit=10`).set(a.auth);
    expect(p1.body.messages.map((m) => m.content)).toEqual(Array.from({ length: 10 }, (_, i) => `m${i + 15}`));
    expect(p1.body.nextCursor).toBeTruthy();

    const p2 = await api().get(`/api/chat/conversations/${cid}/messages?limit=10&before=${p1.body.nextCursor}`).set(a.auth);
    expect(p2.body.messages.map((m) => m.content)).toEqual(Array.from({ length: 10 }, (_, i) => `m${i + 5}`));

    const p3 = await api().get(`/api/chat/conversations/${cid}/messages?limit=10&before=${p2.body.nextCursor}`).set(a.auth);
    expect(p3.body.messages.map((m) => m.content)).toEqual(['m0', 'm1', 'm2', 'm3', 'm4']);
    expect(p3.body.nextCursor).toBeNull();

    const huge = await api().get(`/api/chat/conversations/${cid}/messages?limit=100000`).set(a.auth);
    expect(huge.body.messages.length).toBe(25);
    expect((await api().get(`/api/chat/conversations/${cid}/messages?before=bad`).set(a.auth)).status).toBe(400);
  });

  test('loading older pages does not mark things read again (only the first page does)', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const cid = await makeConvo(a, b);
    await Message.create({ conversation: cid, sender: a.id, content: 'old' });
    const m = await Message.create({ conversation: cid, sender: a.id, content: 'new' });
    await api().get(`/api/chat/conversations/${cid}/messages?before=${m._id}`).set(b.auth);
    expect((await Message.findOne({ content: 'old' })).read).toBe(false);
  });
});
