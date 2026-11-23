const { api, registerUser, connectUsers } = require('./helpers');
const User = require('../models/User');
const SwapRequest = require('../models/SwapRequest');
const Rating = require('../models/Rating');

const send = (from, to, body = {}) => api().post(`/api/users/${to.id}/swap-request`).set(from.auth).send(body);
const respond = (who, id, status) => api().put(`/api/users/requests/${id}`).set(who.auth).send({ status });

describe('swap request rules', () => {
  test('cannot request yourself, an unknown user, or use an invalid id', async () => {
    const a = await registerUser();
    expect((await send(a, a)).status).toBe(400);
    expect((await api().post('/api/users/507f1f77bcf86cd799439011/swap-request').set(a.auth).send({})).status).toBe(404);
    expect((await api().post('/api/users/not-an-id/swap-request').set(a.auth).send({})).status).toBe(400);
  });

  test('duplicate pending request is rejected', async () => {
    const a = await registerUser();
    const b = await registerUser();
    expect((await send(a, b)).status).toBe(201);
    const dup = await send(a, b);
    expect(dup.status).toBe(409);
    expect(dup.body.code).toBe('already_pending');
  });

  test('if the target already requested you, you are told to check your inbox (no crossed requests)', async () => {
    const a = await registerUser();
    const b = await registerUser();
    await send(b, a);
    const res = await send(a, b);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('incoming_pending');
    expect(await SwapRequest.countDocuments({ status: 'pending' })).toBe(1);
  });

  test('simultaneous requests: exactly one pending request exists (database-enforced)', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const results = await Promise.all([1, 2, 3, 4, 5].map(() => send(a, b)));
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(4);
    expect(await SwapRequest.countDocuments({ from: a.id, to: b.id })).toBe(1);
  });

  test('cannot request someone you are already connected with', async () => {
    const a = await registerUser();
    const b = await registerUser();
    await connectUsers(a, b);
    const res = await send(b, a);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('already_connected');
  });

  test('cooldown after a decline blocks immediate re-requests, and expires', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const first = (await send(a, b)).body.requestId;
    await respond(b, first, 'declined').then((r) => expect(r.status).toBe(200));

    const again = await send(a, b);
    expect(again.status).toBe(429);
    expect(again.body.code).toBe('cooldown');

    // Pretend the decline happened 4 days ago.
    await SwapRequest.updateOne({ _id: first }, { respondedAt: new Date(Date.now() - 4 * 24 * 3600 * 1000) });
    expect((await send(a, b)).status).toBe(201);
  });

  test('stores the target in `to` and clips/defaults the message', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const id = (await send(a, b, { message: 'x'.repeat(1000) })).body.requestId;
    const doc = await SwapRequest.findById(id);
    expect(String(doc.to)).toBe(b.id);
    expect(doc.message).toHaveLength(300);
    expect((await send(b, a)).status).toBe(409);
  });

  test('non-string message is rejected', async () => {
    const a = await registerUser();
    const b = await registerUser();
    expect((await send(a, b, { message: { $gt: '' } })).status).toBe(400);
  });
});

describe('inbox', () => {
  test('lists public sender info only, newest first, and drops requests whose sender was deleted', async () => {
    const me = await registerUser();
    const s1 = await registerUser();
    const s2 = await registerUser();
    const ghost = await registerUser();
    await send(s1, me);
    await send(s2, me);
    await send(ghost, me);
    await User.deleteOne({ _id: ghost.id });

    const res = await api().get('/api/users/requests/inbox').set(me.auth);
    expect(res.status).toBe(200);
    expect(res.body.requests).toHaveLength(2);
    for (const r of res.body.requests) {
      expect(r.from).toBeDefined();
      expect(r.from).not.toHaveProperty('email');
      expect(r.from).not.toHaveProperty('connections');
    }
  });

  test('only shows requests addressed to the caller', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const c = await registerUser();
    await send(a, b);
    expect((await api().get('/api/users/requests/inbox').set(c.auth)).body.requests).toHaveLength(0);
    expect((await api().get('/api/users/requests/inbox').set(b.auth)).body.requests).toHaveLength(1);
    expect((await api().get('/api/users/requests/sent').set(a.auth)).body.requests).toHaveLength(1);
  });
});

describe('responding', () => {
  test('accept connects both users, updates counters once, and cannot be repeated', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const id = (await send(a, b)).body.requestId;

    expect((await respond(b, id, 'accepted')).status).toBe(200);
    const [ua, ub] = await Promise.all([User.findById(a.id), User.findById(b.id)]);
    expect(ua.connections.map(String)).toEqual([b.id]);
    expect(ub.connections.map(String)).toEqual([a.id]);
    expect(ua.connectionsCount).toBe(1);
    expect(ub.connectionsCount).toBe(1);

    expect((await respond(b, id, 'accepted')).status).toBe(409);
    expect((await User.findById(a.id)).connectionsCount).toBe(1);
  });

  test('concurrent accepts count the connection exactly once', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const id = (await send(a, b)).body.requestId;
    const results = await Promise.all([1, 2, 3].map(() => respond(b, id, 'accepted')));
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect((await User.findById(b.id)).connectionsCount).toBe(1);
  });

  test('only the recipient can respond; the sender and strangers get 404', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const c = await registerUser();
    const id = (await send(a, b)).body.requestId;
    expect((await respond(a, id, 'accepted')).status).toBe(404);
    expect((await respond(c, id, 'accepted')).status).toBe(404);
    expect((await SwapRequest.findById(id)).status).toBe('pending');
  });

  test('decline does not connect anyone; invalid status / id are 400', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const id = (await send(a, b)).body.requestId;
    expect((await respond(b, id, 'maybe')).status).toBe(400);
    expect((await respond(b, 'nope', 'accepted')).status).toBe(400);
    expect((await respond(b, id, 'declined')).status).toBe(200);
    expect((await User.findById(a.id)).connections).toHaveLength(0);
  });
});

describe('ratings', () => {
  test('cannot rate yourself or someone you have not swapped with', async () => {
    const a = await registerUser();
    const b = await registerUser();
    expect((await api().post(`/api/users/${a.id}/rate`).set(a.auth).send({ score: 5 })).status).toBe(400);
    const res = await api().post(`/api/users/${b.id}/rate`).set(a.auth).send({ score: 5 });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('not_connected');
  });

  test('validates score (integer 1-5) and comment length', async () => {
    const a = await registerUser();
    const b = await registerUser();
    await connectUsers(a, b);
    const rate = (body) => api().post(`/api/users/${b.id}/rate`).set(a.auth).send(body);
    for (const bad of [4.5, 0, 6, '5', null, undefined, NaN]) {
      expect((await rate({ score: bad })).status).toBe(400);
    }
    expect((await rate({ score: 5, comment: 'x'.repeat(301) })).status).toBe(400);
    expect((await rate({ score: 5, comment: 'x'.repeat(300) })).status).toBe(200);
  });

  test('one rating per pair: re-rating updates it and the aggregates', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const c = await registerUser();
    await connectUsers(a, b);
    await connectUsers(c, b);

    await api().post(`/api/users/${b.id}/rate`).set(a.auth).send({ score: 5 });
    await api().post(`/api/users/${b.id}/rate`).set(c.auth).send({ score: 2 });
    let ub = await User.findById(b.id);
    expect(ub.ratingCount).toBe(2);
    expect(ub.ratingAvg).toBe(3.5);

    await api().post(`/api/users/${b.id}/rate`).set(a.auth).send({ score: 1, comment: 'changed my mind' });
    ub = await User.findById(b.id);
    expect(await Rating.countDocuments({ to: b.id })).toBe(2);
    expect(ub.ratingAvg).toBe(1.5);

    const profile = await api().get(`/api/users/${b.id}`).set(a.auth);
    expect(profile.body.user.reviews).toHaveLength(2);
    expect(profile.body.user.reviews[0].from).not.toHaveProperty('email');
  });

  test('the database enforces a unique {from, to}', async () => {
    const a = await registerUser();
    const b = await registerUser();
    await Rating.create({ from: a.id, to: b.id, score: 4 });
    await expect(Rating.create({ from: a.id, to: b.id, score: 5 })).rejects.toMatchObject({ code: 11000 });
  });
});
