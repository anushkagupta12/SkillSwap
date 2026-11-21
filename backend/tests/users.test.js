const { api, registerUser, connectUsers } = require('./helpers');

const skills = (names, category = 'Programming') => names.map((name) => ({ name, category }));

describe('privacy: public projection', () => {
  test('/users, /matches and /:id never expose private fields', async () => {
    const me = await registerUser({ skillsToTeach: skills(['Figma']), skillsToLearn: skills(['Python']) });
    const other = await registerUser({ skillsToTeach: skills(['Python']), skillsToLearn: skills(['Figma']) });
    await connectUsers(me, other);

    const FORBIDDEN = ['email', 'password', 'connections', 'swapRequests', 'ratings', 'tokenVersion', 'teachNorm', 'learnNorm', 'searchTokens', 'emailVerified'];
    const list = await api().get('/api/users').set(me.auth);
    const matches = await api().get('/api/users/matches').set(me.auth);
    const one = await api().get(`/api/users/${other.id}`).set(me.auth);

    for (const u of [...list.body.users, ...matches.body.matches, one.body.user]) {
      for (const k of FORBIDDEN) expect(u).not.toHaveProperty(k);
      for (const s of [...u.skillsToTeach, ...u.skillsToLearn]) expect(s).not.toHaveProperty('nameNorm');
    }
  });

  test('requires authentication', async () => {
    expect((await api().get('/api/users')).status).toBe(401);
    expect((await api().get('/api/users/matches')).status).toBe(401);
  });
});

describe('browse: input hardening', () => {
  let me;
  beforeEach(async () => {
    me = await registerUser();
    await registerUser({ name: 'Alice Wonder', location: 'Paris', skillsToTeach: skills(['C++']) });
  });

  test('operator objects in query params are rejected (NoSQL injection)', async () => {
    expect((await api().get('/api/users?search[$ne]=x').set(me.auth)).status).toBe(400);
    expect((await api().get('/api/users?category[$ne]=x').set(me.auth)).status).toBe(400);
  });

  test('regex metacharacters are treated literally (no ReDoS / injection)', async () => {
    const res = await api().get('/api/users').query({ search: '(a+)+$' }).set(me.auth);
    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(0);
    expect((await api().get('/api/users').query({ search: '.*' }).set(me.auth)).body.users).toHaveLength(0);
  });

  test('search is case-insensitive and finds by name, skill and location', async () => {
    for (const q of ['alice', 'ALICE', 'paris', 'c++']) {
      const res = await api().get('/api/users').query({ search: q }).set(me.auth);
      expect(res.body.users.map((u) => u.name)).toContain('Alice Wonder');
    }
  });

  test('unknown category is rejected, known category and "All" work', async () => {
    expect((await api().get('/api/users?category=Hacking').set(me.auth)).status).toBe(400);
    expect((await api().get('/api/users?category=Programming').set(me.auth)).status).toBe(200);
    expect((await api().get('/api/users?category=All').set(me.auth)).status).toBe(200);
  });

  test('limit is clamped to 50 and junk page/limit never reach Mongo as NaN', async () => {
    for (let i = 0; i < 3; i++) await registerUser();
    const big = await api().get('/api/users?limit=100000').set(me.auth);
    expect(big.status).toBe(200);
    expect(big.body.users.length).toBeLessThanOrEqual(50);
    const junk = await api().get('/api/users?page=abc&limit=xyz').set(me.auth);
    expect(junk.status).toBe(200);
    expect(junk.body.page).toBe(1);
  });

  test('does not list the caller', async () => {
    const res = await api().get('/api/users').set(me.auth);
    expect(res.body.users.map((u) => u._id)).not.toContain(me.id);
  });
});

describe('browse: ranking is global, not per page', () => {
  test('best match appears on page 1 even if it was the oldest account', async () => {
    const best = await registerUser({ name: 'Best Match', skillsToTeach: skills(['Python']), skillsToLearn: skills(['Figma']) });
    for (let i = 0; i < 4; i++) await registerUser({ name: `Filler ${i}` });
    const me = await registerUser({ skillsToTeach: skills(['Figma']), skillsToLearn: skills(['Python']) });

    const res = await api().get('/api/users?limit=2&page=1').set(me.auth);
    expect(res.body.users[0]._id).toBe(best.id);
    expect(res.body.users[0].compatibilityScore).toBe(100);
    expect(res.body.total).toBe(5);
    expect(res.body.pages).toBe(3);
  });
});

describe('matches', () => {
  test('uses normalized skills (JS == JavaScript) and excludes zero scores', async () => {
    const js = await registerUser({ name: 'JS Teacher', skillsToTeach: skills(['JS']) });
    await registerUser({ name: 'Unrelated', skillsToTeach: skills(['Cooking']), skillsToLearn: skills(['Golf']) });
    const me = await registerUser({ skillsToLearn: skills(['JavaScript']) });

    const res = await api().get('/api/users/matches').set(me.auth);
    expect(res.body.matches.map((m) => m._id)).toEqual([js.id]);
    expect(res.body.matches[0].compatibilityScore).toBeGreaterThan(0);
  });

  test('a user with no skills has no matches', async () => {
    const me = await registerUser();
    await registerUser({ skillsToTeach: skills(['Python']) });
    expect((await api().get('/api/users/matches').set(me.auth)).body.matches).toEqual([]);
  });
});

describe('GET /users/:id', () => {
  test('invalid ObjectId is 400, unknown id is 404 (never 500)', async () => {
    const me = await registerUser();
    expect((await api().get('/api/users/abc').set(me.auth)).status).toBe(400);
    expect((await api().get('/api/users/507f1f77bcf86cd799439011').set(me.auth)).status).toBe(404);
  });

  test('returns relationship, overlap lists and reviews from the server', async () => {
    const me = await registerUser({ skillsToTeach: skills(['Figma']), skillsToLearn: skills(['Python']) });
    const other = await registerUser({ skillsToTeach: skills(['Python']), skillsToLearn: skills(['Figma']) });

    let res = await api().get(`/api/users/${other.id}`).set(me.auth);
    expect(res.body.user.relationship).toBe('none');
    expect(res.body.user.overlap.theyCanTeachMe.map((s) => s.name)).toEqual(['Python']);
    expect(res.body.user.overlap.iCanTeachThem.map((s) => s.name)).toEqual(['Figma']);

    await api().post(`/api/users/${other.id}/swap-request`).set(me.auth).send({});
    res = await api().get(`/api/users/${other.id}`).set(me.auth);
    expect(res.body.user.relationship).toBe('pending_sent');
    res = await api().get(`/api/users/${me.id}`).set(other.auth);
    expect(res.body.user.relationship).toBe('pending_received');
  });

  test('relationship endpoint', async () => {
    const a = await registerUser();
    const b = await registerUser();
    expect((await api().get(`/api/users/${b.id}/relationship`).set(a.auth)).body.relationship).toBe('none');
    await connectUsers(a, b);
    expect((await api().get(`/api/users/${b.id}/relationship`).set(a.auth)).body.relationship).toBe('connected');
    expect((await api().get(`/api/users/${a.id}/relationship`).set(b.auth)).body.relationship).toBe('connected');
  });
});
