# 🔄 SkillSwap — React Vite + Tailwind CSS

A full-stack skill exchange platform built with **React + Vite + Tailwind CSS** on the frontend
and **Node.js + Express + MongoDB + Socket.IO** on the backend.

---

## 📁 Project Structure

```
skillswap/
├── backend/
│   ├── config/db.js            # MongoDB connection
│   ├── middleware/auth.js       # JWT protection middleware
│   ├── models/
│   │   ├── User.js             # User schema (skills, ratings, swaps)
│   │   └── Chat.js             # Conversation + Message schemas
│   ├── routes/
│   │   ├── auth.js             # Register, login, profile
│   │   ├── users.js            # Browse, match, swap requests
│   │   └── chat.js             # Conversations & messages
│   ├── server.js               # Express + Socket.IO server
│   ├── seed.js                 # Seed 6 sample users
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Avatar.jsx       # Color-coded avatar component
│   │   │   ├── Navbar.jsx       # Sticky nav with auth state
│   │   │   ├── SkillInput.jsx   # Add/remove skill tags
│   │   │   ├── Spinner.jsx      # Loading spinner
│   │   │   └── UserCard.jsx     # Skill-swap user card
│   │   ├── context/
│   │   │   ├── AuthContext.jsx  # Auth state + axios instance
│   │   │   ├── SocketContext.jsx # Socket.IO real-time layer
│   │   │   └── ToastContext.jsx  # Toast notifications
│   │   ├── pages/
│   │   │   ├── Home.jsx         # Landing page with animated hero
│   │   │   ├── Login.jsx        # Sign in page
│   │   │   ├── Register.jsx     # 2-step registration
│   │   │   ├── Browse.jsx       # Search + filter users
│   │   │   ├── Matches.jsx      # Compatibility-ranked matches
│   │   │   ├── Chat.jsx         # Real-time Socket.IO chat
│   │   │   ├── UserProfile.jsx  # Public user profile
│   │   │   └── Profile.jsx      # Edit own profile
│   │   ├── App.jsx             # Router + providers
│   │   ├── main.jsx            # Entry point
│   │   └── index.css           # Tailwind + custom design tokens
│   ├── index.html
│   ├── vite.config.js          # Vite config with API proxy
│   ├── tailwind.config.js      # Custom design system tokens
│   └── postcss.config.js
│
└── package.json                 # Root concurrently scripts
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18+
- **MongoDB** running locally, or a MongoDB Atlas URI
- **npm** v9+

### 1 — Install dependencies

```bash
npm run install:all
# Installs root + backend + frontend packages
```

### 2 — Configure environment

```bash
cd backend
cp .env.example .env
# Edit .env and set your MONGO_URI and JWT_SECRET
```

`backend/.env`:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/skillswap
JWT_SECRET=change_me_in_production
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

### 3 — Seed the database (optional)

```bash
npm run seed
```

Creates 6 complementary sample users:

| Email | Password | Skills |
|---|---|---|
| kavya@example.com   | password123 | Teaches: Figma, UI Design → Learns: Python |
| arjun@example.com   | password123 | Teaches: Python, Django → Learns: Figma |
| shreya@example.com  | password123 | Teaches: Tableau, SQL → Learns: React |
| rohan@example.com   | password123 | Teaches: React, JS → Learns: ML |
| priya@example.com   | password123 | Teaches: Spanish → Learns: HTML/CSS |
| neha@example.com    | password123 | Teaches: SEO, Marketing → Learns: SQL |

### 4 — Run development servers

```bash
npm run dev
# Starts backend on :5000 and frontend (Vite) on :5173
```

Open **http://localhost:5173**

---

## 🎨 Frontend Stack

| Tool | Purpose |
|---|---|
| **Vite 5** | Lightning-fast dev server + HMR |
| **React 18** | UI library |
| **React Router 6** | Client-side routing |
| **Tailwind CSS 3** | Utility-first styling with custom design tokens |
| **Socket.IO Client** | Real-time chat |
| **Axios** | HTTP client with interceptors |
| **clsx** | Conditional class merging |

### Tailwind Design Tokens (tailwind.config.js)

```
Colors:   ink, canvas, sage, amber, violet, rose, sky
Fonts:    DM Serif Display (display), DM Sans (body)
Shadows:  card, lift, glow
Anims:    fade-up, slide-in, float-slow/mid/fast, pulse-dot, typing
```

### Custom Tailwind Component Classes (index.css)

```
.btn, .btn-primary, .btn-dark, .btn-outline, .btn-ghost, .btn-sm, .btn-lg
.card, .card-hover
.input, .input-dark
.tag-teach, .tag-learn, .tag-match
.section-label
.avatar-{color}  (emerald | violet | amber | rose | sky | orange)
```

---

## ⚡ Backend Stack

| Tool | Purpose |
|---|---|
| **Node.js + Express** | REST API server |
| **MongoDB + Mongoose** | Database + ODM |
| **Socket.IO 4** | Real-time bidirectional events |
| **bcryptjs** | Password hashing |
| **jsonwebtoken** | JWT auth tokens |
| **express-validator** | Request validation |

---

## 🔌 API Reference

### Auth — `/api/auth`
| Method | Path | Description |
|---|---|---|
| POST | `/register` | Create account |
| POST | `/login` | Sign in, returns JWT |
| GET  | `/me` | Current user (protected) |
| PUT  | `/profile` | Update profile + skills |

### Users — `/api/users`
| Method | Path | Description |
|---|---|---|
| GET  | `/` | Browse users (search, category, page) |
| GET  | `/matches` | Compatibility-ranked matches |
| GET  | `/:id` | User profile + score |
| POST | `/:id/swap-request` | Send swap request |
| PUT  | `/swap-request/:id` | Accept / decline |
| POST | `/:id/rate` | Rate a user (1–5 ⭐) |

### Chat — `/api/chat`
| Method | Path | Description |
|---|---|---|
| GET  | `/conversations` | All conversations |
| POST | `/conversations` | Start conversation |
| GET  | `/conversations/:id/messages` | Fetch messages |
| POST | `/conversations/:id/messages` | Send (REST fallback) |

---

## ⚡ Socket.IO Events

**Client → Server**
```
join:conversations         Join all your rooms on connect
join:room  { roomId }      Join a single conversation room
message:send  { conversationId, content }
typing:start  { conversationId }
typing:stop   { conversationId }
```

**Server → Client**
```
message:new    { ...populated message }
typing:start   { userId, name }
typing:stop    { userId }
user:status    { userId, isOnline }
```

---

## 🧠 Compatibility Algorithm

```
score(A, B) = (A.teaches ∩ B.learns + B.teaches ∩ A.learns) / max(len(A.learns + B.learns), 1) × 100
```
Capped at 99%. Zero-score users excluded from `/matches`.

---

## 📦 Production Build

```bash
# Build the React frontend
npm run build
# Output: frontend/dist/

# Serve static files from Express — add to server.js:
# import path from 'path'
# app.use(express.static(path.join(__dirname, '../frontend/dist')))
# app.get('*', (_, res) => res.sendFile(path.join(__dirname, '../frontend/dist/index.html')))
```

---

## 📝 License
MIT — free to use, modify, and distribute.
