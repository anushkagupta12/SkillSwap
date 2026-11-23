const { api, registerUser } = require('./helpers');
const User = require('../models/User');

describe('register', () => {
  test('creates an account, returns an access token and sets an httpOnly refresh cookie', async () => {
    const res = await api().post('/api/auth/register').send({ name: 'Ada Lovelace', email: 'ada@example.com', password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user.initials).toBe('AL');
    const cookie = res.headers['set-cookie'].join(';');
    expect(cookie).toMatch(/ss_refresh=/);
    expect(cookie).toMatch(/HttpOnly/i);
  });

  test('duplicate email in a different case is a clean 400, not a 500', async () => {
    await registerUser({ email: 'dup@example.com' });
    const res = await api().post('/api/auth/register').send({ name: 'Dup', email: 'DUP@Example.com', password: 'password123' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Email already registered');
  });

  test('concurrent registrations of the same email: one wins, the other gets 400 (never 500)', async () => {
    const send = () => api().post('/api/auth/register').send({ name: 'Race', email: 'race@example.com', password: 'password123' });
    const results = await Promise.all([send(), send(), send()]);
    const codes = results.map((r) => r.status).sort();
    expect(codes.filter((c) => c === 201)).toHaveLength(1);
    expect(codes.every((c) => c === 201 || c === 400)).toBe(true);
  });

  test('mass assignment: privileged fields in the body are ignored', async () => {
    const res = await api().post('/api/auth/register').send({
      name: 'Mallory',
      email: 'mallory@example.com',
      password: 'password123',
      connectionsCount: 999,
      ratingAvg: 5,
      ratingCount: 100,
      isOnline: true,
      emailVerified: true,
      tokenVersion: 50,
      connections: ['507f1f77bcf86cd799439011'],
    });
    expect(res.status).toBe(201);
    const u = await User.findById(res.body.user._id);
    expect(u.connectionsCount).toBe(0);
    expect(u.ratingAvg).toBe(0);
    expect(u.ratingCount).toBe(0);
    expect(u.isOnline).toBe(false);
    expect(u.emailVerified).toBe(false);
    expect(u.tokenVersion).toBe(0);
    expect(u.connections).toHaveLength(0);
  });

  test('rejects short passwords with a consistent { message, errors } shape', async () => {
    const res = await api().post('/api/auth/register').send({ name: 'Short', email: 's@example.com', password: '1234567' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/8/);
    expect(res.body.errors[0]).toMatchObject({ field: 'password' });
  });

  test('stores normalized skills (deduped, aliased)', async () => {
    const res = await api().post('/api/auth/register').send({
      name: 'Skilled', email: 'skilled@example.com', password: 'password123',
      skillsToTeach: [{ name: 'JS', category: 'Programming' }, { name: 'javascript' }],
    });
    expect(res.body.user.skillsToTeach).toHaveLength(1);
    const u = await User.findById(res.body.user._id).select('+teachNorm');
    expect(u.teachNorm).toEqual(['javascript']);
  });
});

describe('login', () => {
  test('works regardless of email case', async () => {
    const u = await registerUser({ email: 'case@example.com' });
    const res = await api().post('/api/auth/login').send({ email: 'CASE@example.com', password: u.password });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });

  test('wrong password and unknown email give the same 401 message', async () => {
    const u = await registerUser();
    const a = await api().post('/api/auth/login').send({ email: u.email, password: 'wrong-password' });
    const b = await api().post('/api/auth/login').send({ email: 'nobody@example.com', password: 'wrong-password' });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.message).toBe(b.body.message);
  });

  test('NoSQL injection through the body is rejected', async () => {
    await registerUser({ email: 'victim@example.com' });
    const res = await api().post('/api/auth/login').send({ email: { $ne: '' }, password: { $ne: '' } });
    expect(res.status).toBe(400);
  });

  test('never exposes password hash or internal fields', async () => {
    const u = await registerUser();
    const res = await api().get('/api/auth/me').set(u.auth);
    expect(res.status).toBe(200);
    for (const k of ['password', 'tokenVersion', 'teachNorm', 'learnNorm', 'searchTokens', 'connections', '__v']) {
      expect(res.body.user).not.toHaveProperty(k);
    }
  });
});

describe('session', () => {
  test('refresh cookie yields a new access token; logout clears it', async () => {
    const agent = require('supertest').agent(require('./helpers').getApp().app);
    await agent.post('/api/auth/register').send({ name: 'Cookie', email: 'cookie@example.com', password: 'password123' });
    const refreshed = await agent.post('/api/auth/refresh');
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.accessToken).toBeDefined();
    await agent.post('/api/auth/logout');
    const after = await agent.post('/api/auth/refresh');
    expect(after.status).toBe(401);
  });

  test('refresh without a cookie is 401', async () => {
    expect((await api().post('/api/auth/refresh')).status).toBe(401);
  });

  test('a refresh token cannot be used as an access token', async () => {
    const agent = require('supertest').agent(require('./helpers').getApp().app);
    const reg = await agent.post('/api/auth/register').send({ name: 'Typed', email: 'typed@example.com', password: 'password123' });
    const refreshCookie = reg.headers['set-cookie'][0].split(';')[0].split('=')[1];
    const res = await api().get('/api/auth/me').set('Authorization', `Bearer ${refreshCookie}`);
    expect(res.status).toBe(401);
  });

  test('logout-all revokes existing access tokens (tokenVersion)', async () => {
    const u = await registerUser();
    expect((await api().get('/api/auth/me').set(u.auth)).status).toBe(200);
    await api().post('/api/auth/logout-all').set(u.auth).expect(200);
    expect((await api().get('/api/auth/me').set(u.auth)).status).toBe(401);
  });

  test('no token and garbage token are 401', async () => {
    expect((await api().get('/api/auth/me')).status).toBe(401);
    expect((await api().get('/api/auth/me').set('Authorization', 'Bearer garbage')).status).toBe(401);
  });
});

describe('profile update', () => {
  test('only whitelisted fields change; initials follow the name', async () => {
    const u = await registerUser();
    const res = await api().put('/api/auth/profile').set(u.auth).send({
      name: 'New Name', bio: 'hi', connectionsCount: 50, isOnline: true, email: 'hacker@example.com', ratingAvg: 5,
    });
    expect(res.status).toBe(200);
    expect(res.body.user.initials).toBe('NN');
    const doc = await User.findById(u.id);
    expect(doc.connectionsCount).toBe(0);
    expect(doc.ratingAvg).toBe(0);
    expect(doc.email).toBe(u.email);
  });

  test('omitted fields are left untouched (no undefined $set)', async () => {
    const u = await registerUser({ bio: 'keep me', location: 'Paris' });
    await api().put('/api/auth/profile').set(u.auth).send({ name: 'Renamed' }).expect(200);
    const doc = await User.findById(u.id);
    expect(doc.bio).toBe('keep me');
    expect(doc.location).toBe('Paris');
  });

  test('an empty name cannot produce "UNDEFINED" initials', async () => {
    const u = await registerUser();
    const res = await api().put('/api/auth/profile').set(u.auth).send({ name: '   ' });
    expect(res.status).toBe(400);
  });
});

describe('password reset', () => {
  test('forgot-password answers identically for unknown emails', async () => {
    const u = await registerUser();
    const a = await api().post('/api/auth/forgot-password').send({ email: u.email });
    const b = await api().post('/api/auth/forgot-password').send({ email: 'ghost@example.com' });
    expect(a.status).toBe(200);
    expect(b.body).toEqual(a.body);
  });

  test('reset changes the password and revokes old sessions', async () => {
    const u = await registerUser();
    const { makeOneTimeToken } = require('../services/tokens');
    const t = makeOneTimeToken();
    await User.updateOne({ _id: u.id }, { passwordResetTokenHash: t.hash, passwordResetExpires: new Date(Date.now() + 60000) });

    const res = await api().post('/api/auth/reset-password').send({ token: t.raw, password: 'brand-new-pass' });
    expect(res.status).toBe(200);
    expect((await api().get('/api/auth/me').set(u.auth)).status).toBe(401); // old token revoked
    expect((await api().post('/api/auth/login').send({ email: u.email, password: 'brand-new-pass' })).status).toBe(200);
    // single use
    expect((await api().post('/api/auth/reset-password').send({ token: t.raw, password: 'another-pass-1' })).status).toBe(400);
  });
});

describe('email verification', () => {
  test('a valid token verifies the address; an invalid one is rejected', async () => {
    const u = await registerUser();
    const { makeOneTimeToken } = require('../services/tokens');
    const t = makeOneTimeToken();
    await User.updateOne({ _id: u.id }, { emailVerifyTokenHash: t.hash, emailVerifyExpires: new Date(Date.now() + 60000) });
    expect((await api().post('/api/auth/verify-email').send({ token: 'x'.repeat(40) })).status).toBe(400);
    expect((await api().post('/api/auth/verify-email').send({ token: t.raw })).status).toBe(200);
    expect((await User.findById(u.id)).emailVerified).toBe(true);
  });

  test('when REQUIRE_EMAIL_VERIFICATION=true, unverified users cannot sign in', async () => {
    process.env.REQUIRE_EMAIL_VERIFICATION = 'true';
    try {
      const res = await api().post('/api/auth/register').send({ name: 'Needs Verify', email: 'nv@example.com', password: 'password123' });
      expect(res.status).toBe(201);
      expect(res.body.requiresVerification).toBe(true);
      expect(res.body.accessToken).toBeUndefined();
      const login = await api().post('/api/auth/login').send({ email: 'nv@example.com', password: 'password123' });
      expect(login.status).toBe(403);
      expect(login.body.code).toBe('email_not_verified');
    } finally {
      delete process.env.REQUIRE_EMAIL_VERIFICATION;
    }
  });
});

describe('platform', () => {
  test('health reports DB status', async () => {
    const res = await api().get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', db: 'up' });
  });

  test('unknown /api route is a JSON 404', async () => {
    const res = await api().get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('malformed JSON is a 400, not a 500', async () => {
    const res = await api().post('/api/auth/login').set('Content-Type', 'application/json').send('{bad');
    expect(res.status).toBe(400);
  });

  test('security headers are set (helmet) and x-powered-by is hidden', async () => {
    const res = await api().get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  test('CORS only allows configured origins', async () => {
    const ok = await api().get('/api/health').set('Origin', 'http://localhost:5173');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    const bad = await api().get('/api/health').set('Origin', 'https://evil.example');
    expect(bad.status).toBe(403);
  });
});
