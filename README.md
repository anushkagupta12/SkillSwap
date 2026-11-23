# SkillSwap

Trade what you know for what you want to learn. Members list the skills they can teach and the ones they want to learn, get ranked matches, send swap requests, and chat in real time.

**Live demo:** https://skill-swap-eight-beta.vercel.app

| Layer | Stack | Hosting |
| --- | --- | --- |
| Frontend | React 18, Vite, Tailwind CSS, React Router, Axios, socket.io-client | Vercel |
| Backend | Node.js, Express, Socket.IO, Mongoose | Render (any Node host with WebSocket support works) |
| Database | MongoDB | MongoDB Atlas |

The first request after a quiet period can take up to a minute on free-tier hosting, because the backend sleeps when idle.

---

## Features

| Feature | How it works |
| --- | --- |
| Accounts | Register, sign in, edit profile, password reset, optional email verification |
| Social sign-in | Google and GitHub (authorization code flow with `state` and PKCE). Buttons only appear for providers that are configured |
| Skill matching | A transparent score from what each side teaches and wants ([formula](#matching-score)) |
| Browse and search | Prefix search over name, location and skills; category filter; filters live in the URL |
| Swap requests | Send, accept, decline. One pending request per pair, cooldown after a decline |
| Notifications | Live toast and bell badge, emitted by the server after the database write |
| Real-time chat | Per-conversation typing indicators, delivery acks with retry, read receipts, unread badges, load-older paging |
| Presence | Online status shown to your connections only, multi-tab aware |
| Ratings | 1-5 stars with a short comment, only between connected members |
| Responsive layouts | Grids and the chat sidebar use breakpoints and stack on small screens (not yet tested on real devices) |

Not built (so not claimed): AI matching, availability/scheduling, video calls.

---

## Quick start

Requirements: Node.js 18+, and MongoDB (local, Docker, or Atlas).

```bash
git clone https://github.com/anushkagupta12/SkillSwap.git
cd SkillSwap
npm run install:all

cp backend/.env.example backend/.env      # then edit: set MONGO_URI and JWT_SECRET (32+ random characters)
cp frontend/.env.example frontend/.env    # leave VITE_API_URL empty for local dev

npm run seed     # optional: demo users. Prints a random password once, never stored anywhere
npm run dev
```

On Windows PowerShell, use `Copy-Item` instead of `cp`.

| Service | URL |
| --- | --- |
| Frontend | http://localhost:5173 |
| API | http://localhost:5000 |
| Health | http://localhost:5000/api/health (returns 503 if the database is down) |

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### With Docker

Docker Compose starts the API and a single-node MongoDB replica set (so transactions behave like Atlas). It does not start the frontend; run `npm run dev:frontend` for that.

```bash
JWT_SECRET=$(openssl rand -hex 32) docker compose up --build
```

### Seeding

The seed script refuses to run when `NODE_ENV=production` or when `MONGO_URI` does not look like a local/dev database (set `ALLOW_SEED=true` to override deliberately). It prints a freshly generated password on every run, or uses `SEED_PASSWORD` if you set one. Demo credentials are intentionally not documented.

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `MONGO_URI` | yes | | MongoDB connection string, including the database name. The server refuses to start without it |
| `JWT_SECRET` | yes | | Token signing key. The server refuses to start in production if it is shorter than 32 characters |
| `CLIENT_URLS` | no | `http://localhost:5173` | Comma-separated allowed browser origins (CORS and Socket.IO). **The first entry is where OAuth sends users back to**. No trailing slashes |
| `PORT` | no | `5000` | |
| `NODE_ENV` | no | | `production` enables secure cross-site cookies, `trust proxy`, and blocks seeding. Set it on any deployed server |
| `JWT_ACCESS_EXPIRE` | no | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRE` | no | `7d` | Refresh cookie lifetime |
| `REQUIRE_EMAIL_VERIFICATION` | no | `false` | Block sign-in until the emailed link is used. Needs `SMTP_URL` in production |
| `API_PUBLIC_URL` | for social sign-in | `http://localhost:<PORT>` | Public URL of this API. The provider redirect URI is `<API_PUBLIC_URL>/api/auth/oauth/<provider>/callback`. If it is missing in production, the redirect URI falls back to `localhost` and the provider rejects it |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | no | | Enables "Continue with Google" (needs both) |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | no | | Enables "Continue with GitHub" (needs both) |
| `SMTP_URL`, `MAIL_FROM` | no | | Outgoing mail. Without `SMTP_URL`, emails are printed to the server console in development |
| `SWAP_COOLDOWN_HOURS` | no | `72` | Wait after a declined request before asking the same person again |
| `PRESENCE_DEBOUNCE_MS` | no | `5000` | Grace period before a user is shown offline |
| `API_RATE_LIMIT_MAX` | no | `300` | Requests per minute per IP across the whole API |
| `AUTH_RATE_LIMIT_MAX` | no | `10` | Credential attempts per 15 minutes per IP |

### Frontend (`frontend/.env`)

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Base URL of the API and Socket.IO server, no trailing slash. Leave empty in local dev (Vite proxies `/api` and `/socket.io`). Changing it requires a new frontend build |

`.env` files are gitignored; only the `.env.example` files are committed. Never commit real secrets. If a real `.env` was ever pushed, rotate `JWT_SECRET` and the database password, and remove the file from git history.

---

## Architecture

```
backend/
  app.js, server.js         Express app factory; boot and graceful shutdown
  config/                   env validation (fail fast), db connection
  routes/                   auth, oauth, users (browse/profile), swaps (requests/rating), chat, stats
  services/                 matching, discovery (DB-side ranking), chat, tokens, oauth, realtime helpers, mailer
  sockets/                  Socket.IO auth, handlers, presence
  models/                   User, SwapRequest, Rating, Conversation/Message
  middleware/               auth, rate limits, central error handler
  scripts/migrate-v2.js     one-off migration from the old embedded data model
  loadtest/                 autocannon + WebSocket load test (local only)
  tests/                    Jest + Supertest + mongodb-memory-server
frontend/src/
  lib/api.js                axios client, in-memory access token, refresh-cookie rotation
  context/                  Auth, Socket (presence, typing, unread, notifications), Toast
  pages/, components/
```

### Data model

* `User`: profile, skills (each with a derived `nameNorm`), `connections`, `connectionsCount`, `ratingAvg/ratingCount`, `tokenVersion`, linked `oauth` identities. Also indexed derived arrays `teachNorm`, `learnNorm`, `searchTokens`.
* `SwapRequest` (own collection): `from`, `to`, `status`, `message`. A partial unique index on `pairKey` for `status: pending` makes "one pending request per pair" a database guarantee, so concurrent requests cannot both succeed.
* `Rating` (own collection): unique `{from, to}`.
* `Conversation`: sorted `pairKey` with a unique index, so duplicate conversations are impossible. `Message`: indexed on `{conversation, createdAt, _id}`.

Accepting a request claims it atomically (`findOneAndUpdate` on `status: pending`) and updates both users in a transaction when the database supports it (Atlas, replica sets). On a standalone `mongod` the writes are idempotent and the claim is rolled back on failure. `connectionsCount` counts accepted connections; it is not a count of completed sessions.

The server runs `syncIndexes()` at boot so the unique and partial indexes exist before it accepts traffic. The database user therefore needs `readWrite` on the whole database (including index creation), not on a hand-picked list of collections.

### Matching score

```
score(A, B) = ( |A.teaches ∩ B.wants| + |B.teaches ∩ A.wants| ) / ( |A.wants| + |B.wants| ) × 100
```

* Skills are compared by normalized name: lowercase, trimmed, whitespace collapsed, plus an alias map (`js` → `javascript`, `python3` → `python`, ...). Duplicates are removed when saved and counted once.
* Each overlap is bounded by the other side's number of wants, so the score is always 0-100 and needs no cap.
* Users with a score of 0 are left out of `/matches`. If your own "want to learn" list is empty, every score is 0 and Matches is empty.
* Ranking happens in MongoDB (aggregation) over all candidates before pagination, so page 1 always holds the best matches. Candidates are selected through the multikey indexes on `teachNorm` / `learnNorm`.
* Skill level and category are not part of the score (yet).
* Example (the one on the landing page): Alex teaches Figma, UI Design, Design Systems and wants Python, Data Visualization. Jordan teaches Python, Django, MongoDB and wants Figma, UI Design. Overlap is (Figma, UI Design) + (Python) = 3 out of 4 wanted skills, so the score is **75%**. The landing page computes this number with the same formula rather than hard-coding it.

---

## Security model

* **Sessions**: a 15-minute access token kept in memory only (never `localStorage`), plus a 7-day refresh token in an `httpOnly` cookie. Sessions can be revoked: password reset and "sign out everywhere" bump `tokenVersion`, which invalidates every token and drops live sockets.
* **Authorization**: one membership check is used by every chat REST route and socket event; non-members get 403 before anything is read or written. Swap responses and ratings are restricted to the right party. Other users only ever see an explicit public projection (no email, connections, or request history).
* **Input**: registration and profile updates whitelist fields; skills are validated and capped; browse parameters are type-checked, clamped (`limit` max 50) and regex-escaped; `express-mongo-sanitize` is a safety net; ObjectId params are validated (400, never 500).
* **Abuse**: `helmet`, rate limits (auth endpoints 10 / 15 min / IP, OAuth 60 / 15 min / IP, whole API 300 / min / IP), bcrypt comparison against a dummy hash for unknown emails (no timing leak), per-socket token buckets, 50 kB body limit.
* **Errors**: a central handler returns `{ success: false, code, message, errors? }`. Internal messages are never sent to clients; sockets use short generic codes. After an `unhandledRejection` the process logs and exits so the host restarts it in a clean state.
* **Passwords**: 8-72 characters. Email verification and reset use hashed one-time tokens.

---

## Social sign-in

Google and GitHub, using the authorization-code flow with `state` and PKCE. Buttons appear on the login and register pages only for providers whose credentials are configured; with none configured the pages look and work exactly as before.

**Setup.** Create an OAuth app with each provider and register the redirect URI, which is `<API_PUBLIC_URL>/api/auth/oauth/<provider>/callback`:

| Provider | Create it at | Redirect URI (local) | Redirect URI (production) |
| --- | --- | --- | --- |
| Google | https://console.cloud.google.com/apis/credentials (client type **Web application**, add under *Authorized redirect URIs*) | `http://localhost:5000/api/auth/oauth/google/callback` | `https://<your-api-host>/api/auth/oauth/google/callback` |
| GitHub | https://github.com/settings/developers (OAuth Apps) | `http://localhost:5000/api/auth/oauth/github/callback` | `https://<your-api-host>/api/auth/oauth/github/callback` |

In production set `API_PUBLIC_URL` to your API's public URL (`https://`, no trailing slash), then set the `*_CLIENT_ID` / `*_CLIENT_SECRET` variables. While a Google app is in *Testing* mode, only listed test users can sign in; publish the app to open it up.

**How accounts are matched**
1. A provider identity already linked to an account signs into that account.
2. Otherwise the provider must report a **verified** email. Unverified addresses are refused (GitHub's public profile email is never used; only verified addresses from its email list).
3. If a local account has that email, the provider is linked to it and the existing password keeps working.
4. If that local account's email was **never verified**, someone may have pre-registered it hoping to take over the real owner's account later. Linking therefore removes its password and revokes its sessions; the owner can use "Forgot password" to set a new one.
5. Otherwise a new account is created with a verified email and no password. Skills and bio can be added on the profile page.

Accounts created this way have no password until they use "Forgot password". A provider identity can only be linked to one account, and an email already tied to a *different* identity from the same provider is refused rather than taken over.

Security notes: the random `state` and the PKCE verifier travel in a signed, 10-minute, httpOnly cookie and are single use; the client secret never leaves the server; sessions use the same httpOnly refresh cookie as password sign-in.

---

## API

All responses use `{ success, ... }`; errors use `{ success: false, code, message, errors? }`.

### `/api/auth`
`POST /register`, `POST /login`, `POST /refresh`, `POST /logout`, `POST /logout-all`, `GET /me`, `PUT /profile`, `POST /verify-email`, `POST /resend-verification`, `POST /forgot-password`, `POST /reset-password`

### Social sign-in `/api/auth/oauth`
`GET /providers` lists the configured providers. `GET /:provider` (`google` or `github`) starts the flow and `GET /:provider/callback` finishes it; both are browser redirects, not JSON. See [Social sign-in](#social-sign-in).

### `/api/users` (auth required)
| Method | Path | Notes |
| --- | --- | --- |
| GET | `/` | `search`, `category`, `page`, `limit`. Each user carries `compatibilityScore` and `relationship` |
| GET | `/matches` | Top matches, ranked in the database |
| GET | `/requests/inbox`, `/requests/sent` | Swap requests to / from me |
| PUT | `/requests/:id` | `{ status: accepted \| declined }`, recipient only |
| GET | `/:id` | Public profile + `compatibilityScore`, `overlap`, `relationship`, `reviews` |
| GET | `/:id/relationship` | `none \| pending_sent \| pending_received \| connected` |
| POST | `/:id/swap-request` | Rejects self, duplicates, existing connections, and requests during the cooldown |
| POST | `/:id/rate` | Whole number 1-5, optional comment (300 chars), connected users only |

### `/api/chat` (auth required)
`GET /conversations` (with `unreadCount`), `POST /conversations` (get-or-create), `GET /conversations/:id/messages?before=<id>&limit=30` (cursor paging), `POST /conversations/:id/messages`, `POST /conversations/:id/read`

### `/api/stats`, `/api/health`
Public. `/stats` returns real counts (members, distinct skills, connections, members per category), cached for 60 s. `/health` returns `{ "status": "ok", "db": "up" }`, or 503 with `"degraded"` when the database is down.

### Socket.IO
Handshake: `auth: { token: <access token> }`. Every socket joins a personal room `user:<id>`; messages and notifications are delivered there, so recipients receive them even for conversations created after they connected.

| Direction | Event | Payload |
| --- | --- | --- |
| client → server | `message:send` (with ack) | `{ conversationId, content, clientId }` → ack `{ ok, message }` or `{ ok:false, code }` |
| client → server | `messages:read`, `typing:start`, `typing:stop` | `{ conversationId }` |
| client → server | `auth:refresh` | `{ token }` after the access token rotates |
| server → client | `message:new`, `messages:read` | message / `{ conversationId, by }` |
| server → client | `typing:start`, `typing:stop` | `{ conversationId, userId, name }` |
| server → client | `swap:request:received`, `swap:request:response` | emitted by the REST routes after the database write; clients cannot send these |
| server → client | `presence:init`, `user:status` | online connections snapshot / live changes |
| server → client | `conversation:new`, `auth:expired` | |

---

## Scripts

```bash
npm run install:all  # install root, backend and frontend dependencies
npm run dev          # API + frontend
npm run test         # backend tests (Jest, in-memory MongoDB)
npm run lint         # ESLint for both apps
npm run build        # production frontend build
npm run seed         # demo data (local/dev databases only)
npm run migrate      # migrate a v1 database to the current model (back up first)

npm --prefix backend run loadtest              # load test (needs a local MongoDB)
npm --prefix backend run loadtest -- --quick   # shorter run
```

Node 18+ is supported everywhere (CI uses 20).

---

## Testing and CI

`backend/tests` covers registration and login (including duplicate email in a different case and concurrent registration), mass-assignment protection, token types and revocation, the chat authorization boundary over REST and sockets, swap-request rules (including simultaneous requests and the cooldown), atomic accept, ratings, browse hardening (operator injection, regex metacharacters, clamping), global ranking, the matching score and normalization, social sign-in (including the pre-hijacking case), presence, and rate limiting.

GitHub Actions (`.github/workflows/ci.yml`) runs on pushes to `main` and on every pull request:
* **backend**: `npm ci`, lint, tests, `npm audit --omit=dev --audit-level=high`
* **frontend**: `npm ci`, lint, production build, `npm audit --omit=dev --audit-level=high`

The frontend has no automated tests.

### Load test

`backend/loadtest/run.js` starts the real server against a throwaway local database (`skillswap-loadtest`, wiped on every run), seeds it, and measures HTTP endpoints with autocannon plus a WebSocket scenario. It refuses to run against anything that is not a local database whose name contains `loadtest`. Rate limiters are raised for the run so it measures capacity, not the abuse limits.

One run with 2,000 users and 30,000 messages, on a 12-thread laptop with 7.6 GB of RAM (the load generator, server and MongoDB all shared that machine):

| Scenario | Result |
| --- | --- |
| `GET /api/stats` (cached) | ~4,800 req/s, p99 57 ms at 150 connections |
| `GET /api/users/matches` | ~450 req/s, p99 460 ms at 150 connections |
| `GET /api/users` (browse, ranked in DB) | ~175 req/s; stays under 1 s p99 up to 50 connections, p99 1.3 s at 150 |
| `POST` chat message (write path) | ~280 req/s, p99 697 ms at 150 connections |
| `POST /api/auth/login` | ~16 logins/s (bcrypt is deliberately slow) |
| WebSockets | 300 of 300 clients connected and stayed connected; send-to-ack latency p50 13 ms, p99 290 ms |

Treat these numbers as a rough local baseline. Real hosting will differ, and the server is a single Node process.

---

## Deployment

Frontend on Vercel, backend on any Node host (Render, Railway, Fly, ...), database on Atlas.

### Backend (for example Render)

| Setting | Value |
| --- | --- |
| Root directory | `backend` |
| Build command | `npm install` |
| Start command | `npm start` |

Environment variables:

```
NODE_ENV=production
MONGO_URI=<atlas connection string ending in /<database>>
JWT_SECRET=<32+ random characters>
CLIENT_URLS=https://<your-frontend-domain>
API_PUBLIC_URL=https://<your-api-host>
GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET   (optional)
```

Use WebSocket-capable hosting and keep a single instance (see below). Give the Atlas database user `readWrite` on the database, and allow the host's IP in Atlas network access.

### Frontend (Vercel)

Set `VITE_API_URL=https://<your-api-host>` (no trailing slash) in the Vercel project and redeploy. `frontend/vercel.json` rewrites all paths to `index.html` so client-side routes work on refresh.

### Upgrading an existing database

If the database still uses the v1 model (swap requests and ratings embedded in users), run the migration once. **It is one-way**: it removes `swapRequests`, `ratings` and `totalSwaps` from users. Back up first.

```bash
cd backend
MONGO_URI='<connection string ending in /<database>>' npm run migrate
```

It moves requests and ratings into their own collections, fills the derived skill fields, merges duplicate conversations, and is safe to re-run. Switching from the old `localStorage` token to the current scheme signs everyone out once.

### Notes

* **Cold starts.** Free-tier hosts sleep when idle, so the first sign-in or socket connection can take several seconds. The app shows a retry screen instead of signing you out if the server is slow to answer. Socket.IO keeps its long-polling fallback enabled for the same reason.
* **Cross-site cookies.** With the frontend and API on different domains, the refresh cookie is `SameSite=None; Secure` (this needs `NODE_ENV=production`). Browsers that block third-party cookies (Safari by default, Chrome in some modes) will not keep the session across a reload; users then have to sign in again. Serving both under one parent domain (for example `app.example.com` and `api.example.com`) avoids this.
* **Browser safety warnings.** Brand-new sign-in pages on shared hosting domains (`*.onrender.com`, `*.vercel.app`) are sometimes flagged by Chrome Safe Browsing, especially on the OAuth redirect. You can report a false positive at https://safebrowsing.google.com/safebrowsing/report_error/. A custom domain is the lasting fix.

### Scaling beyond one instance

Presence state lives in process memory and Socket.IO rooms are per process, so run **one** instance. To scale out: add the Socket.IO Redis adapter, move presence (online sets and the offline debounce) into Redis, and use sticky sessions or WebSocket-only transport behind the load balancer. This is not implemented.

---

## Troubleshooting

| Symptom | Likely cause and fix |
| --- | --- |
| Server exits with `JWT_SECRET must be at least 32 characters in production` | Set a longer `JWT_SECRET` (see Quick start for a generator) |
| No "Continue with Google/GitHub" buttons | The API reports no configured provider. Check `GET /api/auth/oauth/providers`: a 404 means the API is an old version; an empty list means `*_CLIENT_ID` / `*_CLIENT_SECRET` are missing on the API host; a CORS error means `CLIENT_URLS` does not include your frontend origin |
| Google `redirect_uri_mismatch` | The URI the API sends must be registered on the exact OAuth client your `GOOGLE_CLIENT_ID` belongs to. Check `API_PUBLIC_URL`, then add `<API_PUBLIC_URL>/api/auth/oauth/google/callback` under *Authorized redirect URIs* and wait a few minutes |
| OAuth finishes but you land back on the login page | The refresh cookie was not kept. Make sure `NODE_ENV=production` on the API, `CLIENT_URLS` lists your frontend first, and third-party cookies are not blocked (see Cross-site cookies) |
| Log: `X-Forwarded-For header is set but the Express 'trust proxy' setting is false` | `NODE_ENV` is not `production` on a host behind a proxy |
| Browse / Matches / Chat return 500 with `user is not allowed to do action [find]` in the log | The Atlas database user lacks `readWrite` on the database. Edit it in Atlas under *Database Access* |
| Matches is empty but Browse works | Matches only lists people with a score above 0. Add skills to both your "teach" and "want to learn" lists, using the same names as the other member |
| `querySrv ECONNREFUSED` when running a script against a `mongodb+srv://` URI | A DNS problem on your machine. Try a public DNS server, or use the non-SRV connection string from Atlas |
| Chrome "Dangerous site" page on the API host | See Browser safety warnings above |

---

## Known limitations

* Single-instance realtime (above).
* No screenshots are included yet.
* The frontend has no automated tests, and responsive layouts have not been checked on real devices.
* Email delivery needs your own SMTP credentials; without them verification and reset links are only printed to the server log in development.
* Matching ignores skill level and category, and aliases come from a small built-in map.
* Swap "completion" is not tracked; a swap counts as a connection once accepted, and ratings are allowed between any connected members.
* Browse search matches word prefixes (`pyth` finds `Python`), not arbitrary substrings.
* Message history only supports loading older messages (no search).
* The landing page shows labelled *Example* profiles and a mock conversation; they are illustrations, not real members.
