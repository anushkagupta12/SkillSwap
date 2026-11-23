const request = require('supertest');
const { createApp } = require('../app');

// Make sure every model is registered before tests query them.
require('../models/User');
require('../models/SwapRequest');
require('../models/Rating');
require('../models/Chat');

let built;
/** One shared app per test file. */
const getApp = () => {
  if (!built) built = createApp();
  return built;
};

let counter = 0;

/** Registers a user through the real endpoint. Returns { user, token, id, agent-ready headers }. */
async function registerUser(overrides = {}) {
  counter += 1;
  const body = {
    name: `Test User ${counter}`,
    email: `user${counter}@example.com`,
    password: 'password123',
    skillsToTeach: [],
    skillsToLearn: [],
    ...overrides,
  };
  const res = await request(getApp().app).post('/api/auth/register').send(body);
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return {
    user: res.body.user,
    id: res.body.user._id,
    token: res.body.accessToken,
    auth: { Authorization: `Bearer ${res.body.accessToken}` },
    password: body.password,
    email: body.email.toLowerCase(),
  };
}

const api = () => request(getApp().app);

/** Makes two users connected through the real request/accept flow. */
async function connectUsers(a, b) {
  const sent = await api().post(`/api/users/${b.id}/swap-request`).set(a.auth).send({});
  if (sent.status !== 201) throw new Error(`swap-request failed: ${sent.status}`);
  const res = await api().put(`/api/users/requests/${sent.body.requestId}`).set(b.auth).send({ status: 'accepted' });
  if (res.status !== 200) throw new Error(`accept failed: ${res.status}`);
  return sent.body.requestId;
}

module.exports = { getApp, api, registerUser, connectUsers };
