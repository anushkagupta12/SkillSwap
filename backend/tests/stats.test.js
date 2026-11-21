const { api, registerUser, connectUsers } = require('./helpers');

const statsRoute = require('../routes/stats');

beforeEach(() => statsRoute.resetCache());

describe('GET /api/stats', () => {
  test('is public and reports zeros on an empty database (no invented numbers)', async () => {
    const res = await api().get('/api/stats');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ users: 0, skills: 0, connections: 0 });
    expect(Object.values(res.body.categories).every((n) => n === 0)).toBe(true);
  });

  test('counts real users, distinct normalized skills, connections and categories', async () => {
    const a = await registerUser({
      skillsToTeach: [{ name: 'JS', category: 'Programming' }, { name: 'Figma', category: 'Design' }],
    });
    const b = await registerUser({ skillsToTeach: [{ name: 'JavaScript', category: 'Programming' }] });
    await connectUsers(a, b);
    statsRoute.resetCache();

    const res = await api().get('/api/stats');
    expect(res.body.users).toBe(2);
    expect(res.body.skills).toBe(2); // JS and JavaScript are the same skill
    expect(res.body.connections).toBe(1); // stored on both sides, counted once
    expect(res.body.categories.Programming).toBe(2);
    expect(res.body.categories.Design).toBe(1);
  });
});
