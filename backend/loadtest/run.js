/**
 * Load test for the SkillSwap API.
 *
 *   npm run loadtest                       # default: 2000 seeded users, 3 http stages
 *   npm run loadtest -- --users 5000 --stage-seconds 15 --sockets 500
 *
 * It starts the REAL server (server.js) as a child process against a dedicated
 * database, seeds it, then measures. It refuses to run against anything that isn't
 * a local database whose name contains "loadtest".
 */
const { fork } = require('child_process');
const path = require('path');
const net = require('net');
const fs = require('fs');
const os = require('os');
const mongoose = require('mongoose');
const autocannon = require('autocannon');
const { io: connect } = require('socket.io-client');
const { seed } = require('./seed');

// ── options ──────────────────────────────────────────────────────────────────
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : fallback;
};
const OPTS = {
  users: Number(arg('users', 2000)),
  stageSeconds: Number(arg('stage-seconds', 10)),
  connections: String(arg('connections', '10,50,150')).split(',').map(Number),
  sockets: Number(arg('sockets', 300)),
  loginAccounts: Number(arg('login-accounts', 40)),
  quick: process.argv.includes('--quick'),
};
if (OPTS.quick) Object.assign(OPTS, { users: 300, stageSeconds: 4, connections: [5, 20], sockets: 50, loginAccounts: 10 });

// Always a fixed local address + fixed database name. It is deliberately NOT derived from your
// .env, so the test can never be pointed at your real database by accident.
const DB_NAME = 'skillswap-loadtest';
const MONGO_URI = process.env.LOADTEST_MONGO_URI || `mongodb://127.0.0.1:27017/${DB_NAME}`;

/** The test wipes its database, so it must never be pointed at real data. */
function assertSafe(uri) {
  const host = (() => {
    try {
      return new URL(uri).hostname;
    } catch {
      return '';
    }
  })();
  if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(host)) {
    throw new Error(`Refusing to run: ${host || 'unknown host'} is not local. The load test deletes everything in its database.`);
  }
  if (!uri.includes('loadtest')) throw new Error('Refusing to run: the database name must contain "loadtest".');
}

// ── helpers ──────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fmt = (n, d = 0) => (Number.isFinite(n) ? n.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d }) : '–');
const pctile = (arr, p) => {
  if (!arr.length) return NaN;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

async function waitForHealth(base, ms = 30000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      const r = await fetch(`${base}/api/health`);
      if (r.ok) return;
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }
  throw new Error('server did not become healthy');
}

function startServer(port) {
  const child = fork(path.join(__dirname, '..', 'server.js'), [], {
    execArgv: ['--require', path.join(__dirname, 'probe.js')],
    env: {
      ...process.env,
      PORT: String(port),
      MONGO_URI,
      JWT_SECRET: 'loadtest-secret-loadtest-secret-loadtest-123',
      NODE_ENV: 'development', // dev logging off below; not production so no secure-cookie requirement
      CLIENT_URLS: 'http://localhost:5173',
      // Measure capacity, not the abuse limiters (they would answer 429 almost immediately).
      API_RATE_LIMIT_MAX: '100000000',
      AUTH_RATE_LIMIT_MAX: '100000000',
      PRESENCE_DEBOUNCE_MS: '0',
    },
    stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
  });
  const samples = [];
  let stderr = '';
  child.on('message', (m) => samples.push(m));
  child.stderr.on('data', (d) => {
    stderr = (stderr + d).slice(-2000);
  });
  child.on('exit', (code) => {
    if (code && !child.killedByRunner) console.error(`\n  !! server exited with code ${code}\n${stderr}`);
  });
  return { child, samples, errors: () => stderr };
}

/** Server-side CPU/memory/lag between two moments. */
function usage(samples, from, to) {
  const s = samples.filter((x) => x.t >= from && x.t <= to);
  if (!s.length) return { cpu: NaN, cpuMax: NaN, rss: NaN, lagP99: NaN, lagMax: NaN };
  const avg = (k) => s.reduce((a, x) => a + x[k], 0) / s.length;
  return {
    cpu: avg('cpuPct'),
    cpuMax: Math.max(...s.map((x) => x.cpuPct)),
    rss: Math.max(...s.map((x) => x.rssMb)),
    lagP99: Math.max(...s.map((x) => x.lagP99Ms)),
    lagMax: Math.max(...s.map((x) => x.lagMaxMs)),
  };
}

async function login(base, email, password) {
  const r = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error(`login failed (${r.status}) for ${email}`);
  return (await r.json()).accessToken;
}

/** Logs in many users with limited concurrency. */
async function loginMany(base, indexes, password, concurrency = 8) {
  const tokens = new Array(indexes.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (next < indexes.length) {
        const k = next++;
        tokens[k] = await login(base, `loaduser${indexes[k]}@loadtest.local`, password);
      }
    }),
  );
  return tokens;
}

// ── HTTP scenarios ───────────────────────────────────────────────────────────
function scenarios(ctx) {
  const { userIds, tokens, convoOwnerTokens, skillPrefixes } = ctx;
  const auth = (i) => ({ authorization: `Bearer ${tokens[i % tokens.length]}` });
  let n = 0;
  const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const categories = ['Programming', 'Design', 'Data & Analytics', 'Languages', 'Music & Arts', 'Business'];

  return [
    {
      name: 'GET /api/stats (public, cached)',
      requests: () => [{ method: 'GET', path: '/api/stats' }],
    },
    {
      name: 'GET /api/users (browse, ranked in DB)',
      requests: () => [
        { method: 'GET', setupRequest: (r) => ({ ...r, headers: auth(n++), path: `/api/users?page=${1 + (n % 5)}&limit=12` }) },
      ],
    },
    {
      name: 'GET /api/users?search= (prefix search)',
      requests: () => [
        { method: 'GET', setupRequest: (r) => ({ ...r, headers: auth(n++), path: `/api/users?search=${rnd(skillPrefixes)}&limit=12` }) },
      ],
    },
    {
      name: 'GET /api/users?category= (filter)',
      requests: () => [
        { method: 'GET', setupRequest: (r) => ({ ...r, headers: auth(n++), path: `/api/users?category=${encodeURIComponent(rnd(categories))}&limit=12` }) },
      ],
    },
    {
      name: 'GET /api/users/matches (match ranking)',
      requests: () => [{ method: 'GET', setupRequest: (r) => ({ ...r, headers: auth(n++), path: '/api/users/matches' }) }],
    },
    {
      name: 'GET /api/users/:id (profile + overlap)',
      requests: () => [{ method: 'GET', setupRequest: (r) => ({ ...r, headers: auth(n++), path: `/api/users/${rnd(userIds)}` }) }],
    },
    {
      name: 'GET /api/chat/conversations',
      requests: () => [{ method: 'GET', setupRequest: (r) => ({ ...r, headers: auth(n++), path: '/api/chat/conversations' }) }],
    },
    {
      name: 'GET messages (cursor page)',
      requests: () => [
        {
          method: 'GET',
          setupRequest: (r) => {
            const k = n++ % convoOwnerTokens.length;
            return { ...r, headers: { authorization: `Bearer ${convoOwnerTokens[k].token}` }, path: `/api/chat/conversations/${convoOwnerTokens[k].convoId}/messages?limit=30` };
          },
        },
      ],
    },
    {
      name: 'POST message (write path)',
      requests: () => [
        {
          method: 'POST',
          setupRequest: (r) => {
            const k = n++ % convoOwnerTokens.length;
            return {
              ...r,
              headers: { authorization: `Bearer ${convoOwnerTokens[k].token}`, 'content-type': 'application/json' },
              path: `/api/chat/conversations/${convoOwnerTokens[k].convoId}/messages`,
              body: JSON.stringify({ content: `load test message ${n}` }),
            };
          },
        },
      ],
    },
    {
      // Deliberately limited: bcrypt is meant to be slow, and this is the endpoint attackers hit first.
      name: 'POST /api/auth/login (bcrypt, CPU-bound)',
      loginOnly: true,
      requests: () => [
        {
          method: 'POST',
          setupRequest: (r) => ({
            ...r,
            headers: { 'content-type': 'application/json' },
            path: '/api/auth/login',
            body: JSON.stringify({ email: `loaduser${n++ % OPTS.loginAccounts}@loadtest.local`, password: ctx.password }),
          }),
        },
      ],
    },
  ];
}

function runAutocannon(url, scenario, connections, duration) {
  return new Promise((resolve, reject) => {
    const instance = autocannon(
      { url, connections, duration, pipelining: 1, requests: scenario.requests(), timeout: 20 },
      (err, result) => (err ? reject(err) : resolve(result)),
    );
    // swallow progress rendering; we print our own table
    instance.on('error', () => {});
  });
}

// ── WebSocket scenario ───────────────────────────────────────────────────────
async function socketTest(base, ctx, count, samples) {
  const sockets = [];
  const connectMs = [];
  let failed = 0;
  const t0 = Date.now();

  // Ramp in batches so we measure capacity, not a thundering herd on a single tick.
  const BATCH = 50;
  for (let i = 0; i < count; i += BATCH) {
    await Promise.all(
      Array.from({ length: Math.min(BATCH, count - i) }, (_, j) => {
        const k = (i + j) % ctx.tokens.length;
        return new Promise((resolve) => {
          const started = Date.now();
          const s = connect(base, { auth: { token: ctx.tokens[k] }, transports: ['websocket'], reconnection: false, timeout: 15000 });
          const done = setTimeout(() => {
            failed += 1;
            s.close();
            resolve();
          }, 15000);
          s.once('connect', () => {
            clearTimeout(done);
            connectMs.push(Date.now() - started);
            sockets.push({ s, k });
            resolve();
          });
          s.once('connect_error', () => {
            clearTimeout(done);
            failed += 1;
            resolve();
          });
        });
      }),
    );
  }
  const rampMs = Date.now() - t0;

  // Hold all connections open while messages flow between chat partners (users 2k and 2k+1).
  const holdFrom = Date.now();
  const latencies = [];
  let sent = 0;
  let acked = 0;
  let received = 0;
  for (const { s } of sockets) s.on('message:new', () => (received += 1));

  const HOLD_MS = Math.min(15000, Math.max(6000, OPTS.stageSeconds * 1000));
  const senders = sockets.filter(({ k }) => k % 2 === 0 && ctx.convoByUserIndex[k]);
  const end = Date.now() + HOLD_MS;
  await Promise.all(
    senders.map(async ({ s, k }) => {
      // each sender posts about one message every 2-3 seconds, like a busy chat
      while (Date.now() < end) {
        const started = Date.now();
        sent += 1;
        await new Promise((resolve) => {
          s.timeout(10000).emit('message:send', { conversationId: ctx.convoByUserIndex[k], content: 'socket load message' }, (err, res) => {
            if (!err && res?.ok) {
              acked += 1;
              latencies.push(Date.now() - started);
            }
            resolve();
          });
        });
        await sleep(1800 + Math.random() * 1200);
      }
    }),
  );
  await sleep(500); // let in-flight deliveries land
  const holdTo = Date.now();
  const stillConnected = sockets.filter(({ s }) => s.connected).length;

  for (const { s } of sockets) s.close();
  await sleep(500);

  return {
    requested: count,
    connected: sockets.length,
    failed,
    stillConnected,
    rampMs,
    connectP50: pctile(connectMs, 50),
    connectP99: pctile(connectMs, 99),
    sent,
    acked,
    received,
    ackP50: pctile(latencies, 50),
    ackP99: pctile(latencies, 99),
    server: usage(samples, holdFrom, holdTo),
  };
}

// ── reporting ────────────────────────────────────────────────────────────────
const pad = (s, n, right = false) => (right ? String(s).padStart(n) : String(s).padEnd(n));

function printTable(title, header, rows) {
  console.log(`\n${title}`);
  console.log(header.map(([h, w, r]) => pad(h, w, r)).join('  '));
  console.log(header.map(([, w]) => '-'.repeat(w)).join('  '));
  for (const row of rows) console.log(row.map((c, i) => pad(c, header[i][1], header[i][2])).join('  '));
}

/** The highest stage that still met the targets. */
function verdict(stages) {
  let best = null;
  for (const s of stages) {
    const total = s.requests.total || 1;
    const errPct = ((s.non2xx + s.errors + s.timeouts) / total) * 100;
    if (errPct <= 1 && s.latency.p99 <= 1000) best = s;
  }
  return best;
}

async function main() {
  assertSafe(MONGO_URI);
  console.log('SkillSwap load test');
  console.log(`  machine : ${os.cpus().length} logical CPUs (${os.cpus()[0].model.trim()}), ${(os.totalmem() / 2 ** 30).toFixed(1)} GB RAM, ${process.platform}`);
  console.log(`  node    : ${process.version}`);
  console.log(`  database: ${DB_NAME} (local, wiped on every run)`);
  console.log(`  dataset : ${fmt(OPTS.users)} users, ${fmt(Math.floor(OPTS.users / 2))} conversations`);
  console.log(`  plan    : ${OPTS.connections.join(' / ')} concurrent connections, ${OPTS.stageSeconds}s each, plus ${OPTS.sockets} websockets${OPTS.quick ? '  [quick mode]' : ''}`);

  // 1) fresh database + data
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 8000 });
  await mongoose.connection.dropDatabase();
  process.stdout.write('\nSeeding… ');
  const t0 = Date.now();
  await Promise.all(Object.values(mongoose.models).map((m) => m.init())); // build indexes first, like production
  const data = await seed({ users: OPTS.users });
  console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)}s (${fmt(data.messageCount)} messages)`);
  await mongoose.disconnect();

  // 2) real server
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const { child, samples } = startServer(port);
  const shutdown = async () => {
    child.killedByRunner = true;
    child.kill('SIGTERM');
    await sleep(500);
    if (!child.killed) child.kill('SIGKILL');
  };
  process.on('SIGINT', async () => {
    await shutdown();
    process.exit(130);
  });

  try {
    await waitForHealth(base);
    console.log(`Server up on :${port}`);

    // 3) tokens (spread across users so requests hit different accounts)
    process.stdout.write('Logging in test users… ');
    const idxs = Array.from({ length: Math.min(OPTS.users, Math.max(60, OPTS.sockets)) }, (_, i) => i);
    const tokens = await loginMany(base, idxs, data.password);
    console.log(`${tokens.length} sessions (access tokens last 15 minutes; this run is shorter)`);

    const convoByUserIndex = {};
    const convoOwnerTokens = [];
    for (let i = 0; i < idxs.length; i += 2) {
      const cid = data.convoIds[i / 2];
      if (!cid) continue;
      convoByUserIndex[i] = cid;
      convoOwnerTokens.push({ token: tokens[i], convoId: cid });
    }
    const ctx = { ...data, tokens, convoOwnerTokens, convoByUserIndex };

    // 4) HTTP stages
    const results = [];
    for (const sc of scenarios(ctx)) {
      // Login is bcrypt (deliberately slow), so it is measured at realistic concurrency instead of the full ramp.
      const stages = sc.loginOnly ? [1, 5, 20] : OPTS.connections;
      const out = [];
      for (const c of stages) {
        process.stdout.write(`  ${sc.name} @ ${c} connections… `);
        await sleep(400); // let the server settle between stages
        const from = Date.now();
        const r = await runAutocannon(base, sc, c, sc.loginOnly ? Math.min(OPTS.stageSeconds, 8) : OPTS.stageSeconds);
        const to = Date.now();
        const u = usage(samples, from, to);
        out.push({ c, ...r, usage: u });
        console.log(`${fmt(r.requests.average)} req/s, p99 ${fmt(r.latency.p99)}ms`);
      }
      results.push({ sc, stages: out });
    }

    printTable(
      'HTTP RESULTS (each row = highest concurrency stage that stayed under 1% errors and p99 <= 1s)',
      [['Endpoint', 44], ['Conns', 5, true], ['Req/s', 8, true], ['p50 ms', 7, true], ['p99 ms', 7, true], ['Err %', 6, true], ['CPU %', 6, true], ['Verdict', 22]],
      results.map(({ sc, stages }) => {
        const ok = verdict(stages);
        const s = ok || stages[0];
        const total = s.requests.total || 1;
        const err = ((s.non2xx + s.errors + s.timeouts) / total) * 100;
        return [sc.name.slice(0, 44), s.c, fmt(s.requests.average), fmt(s.latency.p50), fmt(s.latency.p99), fmt(err, 1), fmt(s.usage.cpu), ok ? (ok === stages[stages.length - 1] ? 'holds at top stage' : `breaks above ${ok.c}`) : 'FAILS even at lowest'];
      }),
    );

    // 5) websockets
    console.log(`\n  WebSockets: connecting ${OPTS.sockets} clients and chatting…`);
    const w = await socketTest(base, ctx, Math.min(OPTS.sockets, tokens.length * 20), samples);
    printTable('WEBSOCKET RESULTS', [['Metric', 36], ['Value', 18, true]], [
      ['Clients requested / connected', `${w.requested} / ${w.connected}`],
      ['Failed to connect', w.failed],
      ['Still connected after chatting', w.stillConnected],
      ['Connect time p50 / p99 (ms)', `${fmt(w.connectP50)} / ${fmt(w.connectP99)}`],
      ['Messages sent / acked', `${w.sent} / ${w.acked}`],
      ['Live deliveries received', w.received],
      ['Send->ack latency p50 / p99 (ms)', `${fmt(w.ackP50)} / ${fmt(w.ackP99)}`],
      ['Server CPU avg / peak (%)', `${fmt(w.server.cpu)} / ${fmt(w.server.cpuMax)}`],
      ['Server memory peak (MB)', fmt(w.server.rss)],
      ['Event-loop lag p99 (ms)', fmt(w.server.lagP99, 1)],
    ]);

    // 6) summary
    const all = results.map(({ stages }) => verdict(stages)).filter(Boolean);
    const readHeavy = results.filter(({ sc }) => /^GET/.test(sc.name) && !/stats/.test(sc.name));
    const readRps = readHeavy.map(({ stages }) => (verdict(stages) || stages[0]).requests.average);
    const worstRead = Math.min(...readRps);
    const medianRead = pctile(readRps, 50);
    const peakRss = Math.max(...samples.map((s) => s.rssMb));
    const peakLag = Math.max(...samples.map((s) => s.lagMaxMs));
    const loginRow = results.find(({ sc }) => sc.loginOnly);
    const loginRps = loginRow ? Math.max(...loginRow.stages.map((s) => s.requests.average)) : NaN;

    // A person clicking around makes roughly one API call every ~5 s while active.
    const SECS_PER_REQ = 5;
    console.log('\n──────────────────────────────── SUMMARY ────────────────────────────────');
    console.log(`  Peak server memory      : ${fmt(peakRss)} MB      Worst event-loop stall: ${fmt(peakLag)} ms`);
    console.log(`  Sustained read capacity : ~${fmt(worstRead)} req/s (slowest read endpoint), ~${fmt(medianRead)} req/s (median)`);
    console.log(`  Login capacity          : ~${fmt(loginRps)} logins/s (bcrypt, by design)`);
    console.log(`  WebSockets              : ${w.stillConnected}/${w.requested} held open, ack p99 ${fmt(w.ackP99)} ms`);
    console.log(`\n  Rough user estimate (assumes an active person makes ~1 API call per ${SECS_PER_REQ}s):`);
    console.log(`    concurrently ACTIVE users  ~ ${fmt(worstRead * SECS_PER_REQ)} (slowest endpoint) to ${fmt(medianRead * SECS_PER_REQ)} (typical)`);
    console.log(`    registered users behind that (assuming ~10% active at once) ~ ${fmt(worstRead * SECS_PER_REQ * 10)}+`);
    console.log('\n  Read this with care:');
    console.log('   - Load generator, server and MongoDB shared this one machine, so real hosting will differ.');
    console.log('   - The estimate is a model, not a measurement of real user behaviour.');
    console.log('   - Rate limiters were raised for the test; in production they cap each IP.');
    console.log('   - Single Node process: it can use one CPU core for JavaScript. See README "Scaling".');
    if (all.length < results.length) console.log('   - At least one endpoint failed the targets even at the lowest stage: see the table above.');

    // machine-readable copy
    const out = path.join(__dirname, 'last-result.json');
    fs.writeFileSync(
      out,
      JSON.stringify(
        {
          when: new Date().toISOString(),
          options: OPTS,
          machine: { cpus: os.cpus().length, memGb: +(os.totalmem() / 2 ** 30).toFixed(1) },
          http: results.map(({ sc, stages }) => ({
            name: sc.name,
            stages: stages.map((s) => ({ connections: s.c, rps: s.requests.average, p50: s.latency.p50, p99: s.latency.p99, non2xx: s.non2xx, errors: s.errors, timeouts: s.timeouts, cpu: s.usage.cpu })),
          })),
          websockets: w,
        },
        null,
        2,
      ),
    );
    console.log(`\n  Full numbers saved to ${path.relative(process.cwd(), out)}`);
  } finally {
    await shutdown();
    // leave the throwaway database behind only until the next run drops it
  }
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(`\nLoad test failed: ${e.message}`);
    process.exit(1);
  },
);
