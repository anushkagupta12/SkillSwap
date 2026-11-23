# SkillSwap

Trade what you know for what you want to learn. Members list the skills they can teach and the ones they want to learn, get ranked matches, send swap requests, and chat in real time.

Frontend: React + Vite + Tailwind, deployed on Vercel (`https://skill-swap-eight-beta.vercel.app`).
Backend: Node.js + Express + Socket.IO + MongoDB (Mongoose), deployed separately. The backend host is not recorded in this repository; set `VITE_API_URL` to yours (see [Deployment](#deployment)).

---

## Features

| Feature | How it works |
| --- | --- |
| Accounts | Register, sign in, edit profile, password reset, optional email verification |
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
git clone <your-repository-url>
cd SkillSwap
npm run install:all

cp backend/.env.example backend/.env      # then edit: set JWT_SECRET (32+ random characters)
cp frontend/.env.example frontend/.env    # leave VITE_API_URL empty for local dev

npm run seed     # optional: demo users. Prints a random password once, never stored anywhere
npm run dev
```

| Service | URL |
| --- | --- |
| Frontend | http://localhost:5173 |
| API | http://localhost:5000 |
| Health | http://localhost:5000/api/health (returns 503 if the database is down) |

With Docker instead of a local MongoDB:

```bash
JWT_SECRET=$(openssl rand -hex 32) docker compose up --build
```

The seed script refuses to run when `NODE_ENV=production` or when `MONGO_URI` does not look like a local/dev database (set `ALLOW_SEED=true` to override deliberately). It prints a freshly generated password on every run. Demo credentials are intentionally not documented.

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `MONGO_URI` | yes | | MongoDB connection string. The server refuses to start without it |
| `JWT_SECRET` | yes | | Token signing key. 32+ characters in production |
| `CLIENT_URLS` | no | `http://localhost:5173` | Comma-separated allowed browser origins (CORS and Socket.IO) |
| `PORT` | no | `5000` | |
| `NODE_ENV` | no | | `production` enables secure cookies, trust proxy, and blocks seeding |
| `JWT_ACCESS_EXPIRE` | no | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRE` | no | `7d` | Refresh cookie lifetime |
| `REQUIRE_EMAIL_VERIFICATION` | no | `false` | Block sign-in until the emailed link is used. Needs `SMTP_URL` in production |
| `API_PUBLIC_URL` | for social sign-in | `http://localhost:<PORT>` | Public URL of this API; the provider redirect URI is `<API_PUBLIC_URL>/api/auth/oauth/<provider>/callback` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | no | | Enables "Continue with Google" (needs both) |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | no | | Enables "Continue with GitHub" (needs both) |
| `SMTP_URL`, `MAIL_FROM` | no | | Outgoing mail. Without `SMTP_URL`, emails are printed to the server console in development |
| `SWAP_COOLDOWN_HOURS` | no | `72` | Wait after a declined request before asking the same person again |
| `PRESENCE_DEBOUNCE_MS` | no | `5000` | Grace period before a user is shown offline |

### Frontend (`frontend/.env`)

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Base URL of the API and Socket.IO server, no trailing slash. Leave empty in local dev (Vite proxies `/api` and `/socket.io`) |

`.env` files are gitignored; only `.env.example` files are committed. If this project was ever pushed with a real `.env`, rotate `JWT_SECRET` and the database password and purge the file from git history.

---

## Architecture

```
backend/
  app.js, server.js         Express app factory; boot, graceful shutdown
  config/                   env validation (fail fast), db connection
  routes/                   auth, users (browse/profile), swaps (requests/rating), chat, stats
  services/                 matching, discovery (DB-side ranking), chat, tokens, realtime helpers, mailer
  sockets/                  Socket.IO auth, handlers, presence
  models/                   User, SwapRequest, Rating, Conversation/Message
  middleware/               auth, rate limits, central error handler
  scripts/migrate-v2.js     one-off migration from the old embedded data model
  tests/                    Jest + Supertest + mongodb-memory-server
frontend/src/
  lib/api.js                axios client, in-memory access token, refresh-cookie rotation
  context/                  Auth, Socket (presence, typing, unread, notifications), Toast
  pages/, components/
```

### Data model

* `User`: profile, skills (each with a derived `nameNorm`), `connections`, `connectionsCount`, `ratingAvg/ratingCount`, `tokenVersion`. Also indexed derived arrays `teachNorm`, `learnNorm`, `searchTokens`.
* `SwapRequest` (own collection): `from`, `to`, `status`, `message`. A partial unique index on `pairKey` for `status: pending` makes "one pending request per pair" a database guarantee, so concurrent requests cannot both succeed.
* `Rating` (own collection): unique `{from, to}`.
* `Conversation`: sorted `pairKey` with a unique index, so duplicate conversations are impossible. `Message`: indexed on `{conversation, createdAt, _id}`.

Accepting a request claims it atomically (`findOneAndUpdate` on `status: pending`) and updates both users in a transaction when the database supports it (Atlas, replica sets). On a standalone `mongod` the writes are idempotent and the claim is rolled back on failure. `connectionsCount` counts accepted connections; it is not a count of completed sessions.

### Matching score

```
score(A, B) = ( |A.teaches ∩ B.wants| + |B.teaches ∩ A.wants| ) / ( |A.wants| + |B.wants| ) × 100
```

* Skills are compared by normalized name: lowercase, trimmed, whitespace collapsed, plus an alias map (`js` → `javascript`, `python3` → `python`, ...). Duplicates are removed when saved and counted once.
* Each overlap is bounded by the other side's number of wants, so the score is always 0-100 and needs no cap.
* Users with a score of 0 are left out of `/matches`.
* Ranking happens in MongoDB (aggregation) over all candidates before pagination, so page 1 always holds the best matches. Candidates are selected through the multikey indexes on `teachNorm` / `learnNorm`.
* Skill level and category are not part of the score (yet).
* Example (the one on the landing page): Alex teaches Figma, UI Design, Design Systems and wants Python, Data Visualization. Jordan teaches Python, Django, MongoDB and wants Figma, UI Design. Overlap is (Figma, UI Design) + (Python) = 3 out of 4 wanted skills, so the score is **75%**. The landing page computes this number with the same formula rather than hard-coding it.

---

## Security model

* **Sessions**: a 15-minute access token kept in memory only (never `localStorage`), plus a 7-day refresh token in an `httpOnly` cookie. Sessions can be revoked: password reset and "sign out everywhere" bump `tokenVersion`, which invalidates every token and drops live sockets.
* **Authorization**: one membership check is used by every chat REST route and socket event; non-members get 403 before anything is read or written. Swap responses and ratings are restricted to the right party. Other users only ever see an explicit public projection (no email, connections, or request history).
* **Input**: registration and profile updates whitelist fields; skills are validated and capped; browse parameters are type-checked, clamped (`limit` max 50) and regex-escaped; `express-mongo-sanitize` is a safety net; ObjectId params are validated (400, never 500).
* **Abuse**: `helmet`, rate limits on auth endpoints (10 / 15 min / IP) and on the whole API, bcrypt comparison against a dummy hash for unknown emails (no timing leak), per-socket token buckets, 50 kB body limit.
* **Errors**: a central handler returns `{ success: false, code, message, errors? }`. Internal messages are never sent to clients; sockets use short generic codes. After an `unhandledRejection` the process logs and exits so the host restarts it in a clean state.
* **Passwords**: 8-72 characters. Email verification and reset use hashed one-time tokens.

---

## Social sign-in

Google and GitHub, using the authorization-code flow with `state` and PKCE. Buttons appear on the login and register pages only for providers whose credentials are configured; with none configured the pages look and work exactly as before.

**Setup.** Create an OAuth app with each provider and register this redirect URI (local development shown):

| Provider | Redirect URI |
| --- | --- |
| Google | `http://localhost:5000/api/auth/oauth/google/callback` |
| GitHub | `http://localhost:5000/api/auth/oauth/github/callback` |

In production use your API's public URL and set `API_PUBLIC_URL` to match. Then set the `*_CLIENT_ID` / `*_CLIENT_SECRET` variables.

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
Public. `/stats` returns real counts (members, distinct skills, connections, members per category), cached for 60 s.

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
npm run dev          # API + frontend
npm run test         # backend tests (Jest, in-memory MongoDB replica set)
npm run lint         # ESLint for both apps
npm run build        # production frontend build
npm run seed         # demo data (local/dev databases only)
npm run migrate      # migrate a v1 database to the current model (back up first)
```

Node 18+ is supported everywhere (CI uses 20).

---

## Deployment

Frontend on Vercel, backend on any Node host (Render, Railway, Fly, ...), database on Atlas.

1. Backend: set `MONGO_URI`, `JWT_SECRET`, `NODE_ENV=production`, and `CLIENT_URLS=https://<your-vercel-domain>`. Use WebSocket-capable hosting; keep a single instance (see below).
2. Frontend: set `VITE_API_URL=https://<your-backend-host>` in the Vercel project.
3. If you are upgrading an existing database, run `npm run migrate` once.

Notes:

* **Cold starts.** Free-tier hosts sleep when idle, so the first sign-in or socket connection can take several seconds. The app shows a retry screen instead of signing you out if the server is slow to answer. Socket.IO keeps its long-polling fallback enabled for the same reason.
* **Cross-site cookies.** With the frontend and API on different domains, the refresh cookie is `SameSite=None; Secure`. Browsers that block third-party cookies (Safari by default, Chrome in some modes) will not keep the session across a reload; users then have to sign in again. Serving both under one domain (for example `app.example.com` and `api.example.com`) avoids this.
* **Existing sessions.** Moving from the old localStorage token to the new scheme signs everyone out once.

### Scaling beyond one instance

Presence state lives in process memory and Socket.IO rooms are per process, so run **one** instance. To scale out: add the Socket.IO Redis adapter, move presence (online sets and the offline debounce) into Redis, and use sticky sessions or WebSocket-only transport behind the load balancer. This is not implemented.

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

---

## Testing

`backend/tests` covers registration and login (including duplicate email in a different case and concurrent registration), mass-assignment protection, token types and revocation, the chat authorization boundary over REST and sockets, swap-request rules (including simultaneous requests and the cooldown), atomic accept, ratings, browse hardening (operator injection, regex metacharacters, clamping), global ranking, the matching score and normalization, presence, and rate limiting. CI runs lint, tests, the production build and `npm audit` on every push.
