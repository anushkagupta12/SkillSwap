const request = require('supertest');
const { api, getApp, registerUser } = require('./helpers');
const User = require('../models/User');
const { makeOneTimeToken } = require('../services/tokens');

const CLIENT = 'http://localhost:5173';
const ENV_KEYS = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'API_PUBLIC_URL'];

let google;
let github;
let fetchMock;

beforeEach(() => {
  Object.assign(process.env, {
    GOOGLE_CLIENT_ID: 'gid',
    GOOGLE_CLIENT_SECRET: 'gsecret',
    GITHUB_CLIENT_ID: 'hid',
    GITHUB_CLIENT_SECRET: 'hsecret',
    API_PUBLIC_URL: 'http://localhost:5000',
  });
  google = { sub: 'g-1', email: 'new@example.com', email_verified: true, name: 'Gina Google' };
  github = {
    user: { id: 42, login: 'octo', name: 'Octo Cat' },
    emails: [
      { email: 'secondary@example.com', primary: false, verified: true },
      { email: 'primary@example.com', primary: true, verified: true },
      { email: 'unverified@example.com', primary: false, verified: false },
    ],
  };
  const ok = (data) => ({ ok: true, status: 200, json: async () => data });
  fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async (url) => {
    const u = String(url);
    if (u.startsWith('https://oauth2.googleapis.com/token')) return ok({ access_token: 'g-token' });
    if (u.startsWith('https://openidconnect.googleapis.com')) return ok(google);
    if (u.startsWith('https://github.com/login/oauth/access_token')) return ok({ access_token: 'gh-token' });
    if (u === 'https://api.github.com/user') return ok(github.user);
    if (u === 'https://api.github.com/user/emails') return ok(github.emails);
    return { ok: false, status: 500, json: async () => ({}) };
  });
});

afterEach(() => {
  fetchMock.mockRestore();
  ENV_KEYS.forEach((k) => delete process.env[k]);
});

/** Runs the whole browser flow: start (state cookie) -> provider -> callback. */
async function signIn(provider = 'google', agent = request.agent(getApp().app)) {
  const start = await agent.get(`/api/auth/oauth/${provider}`);
  const state = new URL(start.headers.location).searchParams.get('state');
  const cb = await agent.get(`/api/auth/oauth/${provider}/callback`).query({ code: 'abc', state });
  return { agent, start, cb, state };
}

const errorOf = (res) => new URL(res.headers.location).searchParams.get('oauth_error');
const setsSession = (res) => (res.headers['set-cookie'] || []).some((c) => c.startsWith('ss_refresh=') && !/ss_refresh=;/.test(c));

describe('provider discovery', () => {
  test('only providers with both id and secret configured are offered', async () => {
    expect((await api().get('/api/auth/oauth/providers')).body.providers).toEqual(['google', 'github']);
    delete process.env.GITHUB_CLIENT_SECRET;
    expect((await api().get('/api/auth/oauth/providers')).body.providers).toEqual(['google']);
    delete process.env.GOOGLE_CLIENT_ID;
    expect((await api().get('/api/auth/oauth/providers')).body.providers).toEqual([]);
  });

  test('unknown or unconfigured providers bounce to the login page', async () => {
    delete process.env.GITHUB_CLIENT_ID;
    for (const name of ['github', 'facebook', 'constructor', '__proto__']) {
      const res = await api().get(`/api/auth/oauth/${name}`);
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe(`${CLIENT}/login?oauth_error=unavailable`);
    }
  });
});

describe('start', () => {
  test('redirects to the provider with state + PKCE and sets an httpOnly state cookie', async () => {
    const res = await api().get('/api/auth/oauth/google');
    expect(res.status).toBe(302);
    const url = new URL(res.headers.location);
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    const q = url.searchParams;
    expect(q.get('client_id')).toBe('gid');
    expect(q.get('response_type')).toBe('code');
    expect(q.get('redirect_uri')).toBe('http://localhost:5000/api/auth/oauth/google/callback');
    expect(q.get('code_challenge_method')).toBe('S256');
    expect(q.get('code_challenge')).toBeTruthy();
    expect(q.get('state')).toHaveLength(32);
    expect(q.get('scope')).toContain('email');
    const cookie = res.headers['set-cookie'].join(';');
    expect(cookie).toMatch(/ss_oauth_state=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(JSON.stringify(res.headers)).not.toMatch(/gsecret/); // the client secret never leaves the server
  });

  test('every start uses a fresh state', async () => {
    const a = new URL((await api().get('/api/auth/oauth/google')).headers.location).searchParams.get('state');
    const b = new URL((await api().get('/api/auth/oauth/google')).headers.location).searchParams.get('state');
    expect(a).not.toBe(b);
  });
});

describe('callback: CSRF and failure handling', () => {
  test('a wrong state is rejected before anything is sent to the provider', async () => {
    const agent = request.agent(getApp().app);
    await agent.get('/api/auth/oauth/google');
    const cb = await agent.get('/api/auth/oauth/google/callback').query({ code: 'abc', state: 'f'.repeat(32) });
    expect(errorOf(cb)).toBe('failed');
    expect(setsSession(cb)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await User.countDocuments()).toBe(0);
  });

  test('a callback from a browser that never started the flow is rejected', async () => {
    const cb = await api().get('/api/auth/oauth/google/callback').query({ code: 'abc', state: 'a'.repeat(32) });
    expect(errorOf(cb)).toBe('failed');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('missing code or state is rejected', async () => {
    const agent = request.agent(getApp().app);
    await agent.get('/api/auth/oauth/google');
    expect(errorOf(await agent.get('/api/auth/oauth/google/callback'))).toBe('failed');
    expect(errorOf(await agent.get('/api/auth/oauth/google/callback').query({ code: ['a', 'b'], state: 'x' }))).toBe('failed');
  });

  test('state started for one provider cannot be replayed on another', async () => {
    const agent = request.agent(getApp().app);
    const start = await agent.get('/api/auth/oauth/google');
    const state = new URL(start.headers.location).searchParams.get('state');
    const cb = await agent.get('/api/auth/oauth/github/callback').query({ code: 'abc', state });
    expect(errorOf(cb)).toBe('failed');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('the provider reporting an error (user pressed Cancel) shows access_denied', async () => {
    const cb = await api().get('/api/auth/oauth/google/callback').query({ error: 'access_denied' });
    expect(errorOf(cb)).toBe('access_denied');
    expect(setsSession(cb)).toBe(false);
  });

  test('a provider outage fails cleanly: no session, no account, no crash', async () => {
    fetchMock.mockImplementationOnce(async () => {
      throw new Error('boom');
    });
    const logSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { cb } = await signIn();
    expect(logSpy).toHaveBeenCalledWith('[oauth] google sign-in failed:', 'boom'); // message only, never tokens
    logSpy.mockRestore();
    expect(errorOf(cb)).toBe('failed');
    expect(setsSession(cb)).toBe(false);
    expect(await User.countDocuments()).toBe(0);
  });

  test('the state is single use: replaying the same callback fails', async () => {
    const { agent, state } = await signIn();
    const replay = await agent.get('/api/auth/oauth/google/callback').query({ code: 'abc', state });
    expect(errorOf(replay)).toBe('failed');
  });
});

describe('sign up and sign in', () => {
  test('a new Google user gets an account and a session', async () => {
    const { agent, cb } = await signIn();
    expect(cb.status).toBe(302);
    expect(cb.headers.location).toBe(`${CLIENT}/oauth/callback`);
    expect(setsSession(cb)).toBe(true);
    expect(cb.headers['set-cookie'].join(';')).toMatch(/HttpOnly/i);

    const user = await User.findOne({ email: 'new@example.com' }).select('+password');
    expect(user.name).toBe('Gina Google');
    expect(user.initials).toBe('GG');
    expect(user.emailVerified).toBe(true);
    expect(user.password).toBeUndefined();
    expect(user.oauth.google).toBe('g-1');

    // The frontend picks the session up through the normal refresh endpoint.
    const refreshed = await agent.post('/api/auth/refresh');
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.user.email).toBe('new@example.com');
    expect(refreshed.body.accessToken).toBeDefined();
    expect(refreshed.body.user).not.toHaveProperty('oauth');
    expect(refreshed.body.user).not.toHaveProperty('password');
  });

  test('signing in again uses the same account', async () => {
    await signIn();
    const { cb } = await signIn();
    expect(setsSession(cb)).toBe(true);
    expect(await User.countDocuments()).toBe(1);
  });

  test('the account follows the provider id, not the email', async () => {
    await signIn();
    google.email = 'changed@example.com'; // same Google account, new address
    await signIn();
    expect(await User.countDocuments()).toBe(1);
  });

  test('concurrent first sign-ins create exactly one account', async () => {
    const results = await Promise.all([signIn(), signIn(), signIn()]);
    expect(results.every((r) => setsSession(r.cb))).toBe(true);
    expect(await User.countDocuments()).toBe(1);
  });

  test('a very long or missing provider name is handled', async () => {
    google.name = 'x'.repeat(200);
    await signIn();
    expect((await User.findOne()).name).toHaveLength(60);
    await User.deleteMany({});
    google = { sub: 'g-2', email: 'noname@example.com', email_verified: true };
    await signIn();
    expect((await User.findOne()).name).toBe('noname');
  });

  test('GitHub: uses the primary VERIFIED email from /user/emails', async () => {
    const { cb } = await signIn('github');
    expect(setsSession(cb)).toBe(true);
    const user = await User.findOne();
    expect(user.email).toBe('primary@example.com');
    expect(user.oauth.github).toBe('42');
    expect(user.name).toBe('Octo Cat');
  });

  test('GitHub: an account with no verified email is refused', async () => {
    github.emails = [{ email: 'unverified@example.com', primary: true, verified: false }];
    const { cb } = await signIn('github');
    expect(errorOf(cb)).toBe('email_unverified');
    expect(setsSession(cb)).toBe(false);
    expect(await User.countDocuments()).toBe(0);
  });
});

describe('email verification and account linking', () => {
  test('an unverified provider email is never trusted', async () => {
    google.email_verified = false;
    const { cb } = await signIn();
    expect(errorOf(cb)).toBe('email_unverified');
    expect(setsSession(cb)).toBe(false);
    expect(await User.countDocuments()).toBe(0);
  });

  test('a string "false" is not treated as verified', async () => {
    google.email_verified = 'false';
    expect(errorOf((await signIn()).cb)).toBe('email_unverified');
  });

  test('links to an existing verified account with the same email, keeping the password', async () => {
    const u = await registerUser({ email: 'both@example.com' });
    await User.updateOne({ _id: u.id }, { emailVerified: true });
    google.email = 'BOTH@example.com'; // case differences must not create a second account

    const { cb } = await signIn();
    expect(setsSession(cb)).toBe(true);
    expect(await User.countDocuments()).toBe(1);
    expect((await User.findById(u.id)).oauth.google).toBe('g-1');
    expect((await api().post('/api/auth/login').send({ email: u.email, password: u.password })).status).toBe(200);
  });

  test('PRE-HIJACKING: linking an UNVERIFIED local account wipes its password and revokes its sessions', async () => {
    // An attacker registers the victim's address first (never verified) and knows the password.
    const attacker = await registerUser({ email: 'victim@example.com', password: 'attacker-knows-this' });
    expect((await api().get('/api/auth/me').set(attacker.auth)).status).toBe(200);

    // The real owner later signs in with Google.
    google.email = 'victim@example.com';
    const { agent, cb } = await signIn();
    expect(setsSession(cb)).toBe(true);
    expect(await User.countDocuments()).toBe(1);

    const doc = await User.findOne({ email: 'victim@example.com' }).select('+password');
    expect(doc.password).toBeUndefined();
    expect(doc.emailVerified).toBe(true);

    // The attacker's password and already-issued token are dead...
    const login = await api().post('/api/auth/login').send({ email: 'victim@example.com', password: 'attacker-knows-this' });
    expect(login.status).toBe(401);
    expect((await api().get('/api/auth/me').set(attacker.auth)).status).toBe(401);
    // ...while the owner's new Google session works.
    expect((await agent.post('/api/auth/refresh')).status).toBe(200);
  });

  test('the same email linked to a DIFFERENT provider account is refused', async () => {
    await signIn();
    google = { sub: 'g-OTHER', email: 'new@example.com', email_verified: true, name: 'Someone Else' };
    const { cb } = await signIn();
    expect(errorOf(cb)).toBe('account_conflict');
    expect(setsSession(cb)).toBe(false);
    expect(await User.countDocuments()).toBe(1);
  });

  test('Google and GitHub can both be linked to one account', async () => {
    github.emails = [{ email: 'new@example.com', primary: true, verified: true }];
    await signIn('google');
    await signIn('github');
    expect(await User.countDocuments()).toBe(1);
    const u = await User.findOne();
    expect(u.oauth.google).toBe('g-1');
    expect(u.oauth.github).toBe('42');
  });
});

describe('accounts without a password', () => {
  test('cannot sign in with a password: 401, never a 500 or a bypass', async () => {
    await signIn();
    for (const password of ['whatever-password', 'timing-equalizer-password', 'undefined']) {
      const res = await api().post('/api/auth/login').send({ email: 'new@example.com', password });
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid email or password');
    }
  });

  test('"forgot password" lets them add a password later', async () => {
    await signIn();
    const user = await User.findOne();
    const t = makeOneTimeToken();
    await User.updateOne({ _id: user._id }, { passwordResetTokenHash: t.hash, passwordResetExpires: new Date(Date.now() + 60000) });
    expect((await api().post('/api/auth/reset-password').send({ token: t.raw, password: 'my-new-password' })).status).toBe(200);
    expect((await api().post('/api/auth/login').send({ email: 'new@example.com', password: 'my-new-password' })).status).toBe(200);
  });

  test('profile updates still work for them', async () => {
    const { agent } = await signIn();
    const { accessToken } = (await agent.post('/api/auth/refresh')).body;
    const res = await api().put('/api/auth/profile').set('Authorization', `Bearer ${accessToken}`).send({ bio: 'hello', name: 'Gina G' });
    expect(res.status).toBe(200);
    expect(res.body.user.initials).toBe('GG');
  });

  test('password registration is unaffected: the password is still required', async () => {
    const res = await api().post('/api/auth/register').send({ name: 'No Pass', email: 'nopass@example.com' });
    expect(res.status).toBe(400);
  });
});
