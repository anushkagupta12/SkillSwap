<div align="center">

# 🔄 SkillSwap

### Trade what you know for what you want to learn

A full-stack real-time skill exchange platform where users connect, chat, and swap expertise — no money, just knowledge.

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://reactjs.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3-38BDF8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-8-47A248?style=flat-square&logo=mongodb)](https://mongodb.com)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4-010101?style=flat-square&logo=socket.io)](https://socket.io)

[Features](#-features) · [Tech Stack](#-tech-stack) · [Quick Start](#-quick-start) · [API Reference](#-api-reference) · [Screenshots](#-screenshots)

</div>

---

## 📌 What is SkillSwap?

SkillSwap connects people who want to exchange skills — if you know **Figma** and want to learn **Python**, you can find someone who knows Python and wants to learn Figma, and teach each other. No courses, no fees — just two people helping each other grow.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔐 **JWT Authentication** | Secure register, login, and protected routes |
| 🎯 **Smart Matching** | Compatibility algorithm ranks users by mutual skill overlap |
| 💬 **Real-time Chat** | Socket.IO powered messaging with typing indicators |
| 🔔 **Live Notifications** | Bell icon with inline accept/decline swap requests |
| 🤝 **Swap Requests** | Send, accept, and decline skill swap requests |
| 👤 **Rich Profiles** | Bio, location, skills to teach, skills to learn |
| 🌐 **Browse & Search** | Filter by category, search by name/skill/location |
| 📶 **Online Presence** | Real-time online/offline status indicators |
| 📱 **Fully Responsive** | Works on desktop, tablet, and mobile |
<!--| ⭐ **Rating System** | Rate swap partners after sessions |-->

---

## 🛠 Tech Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18 | UI library |
| Vite | 5 | Build tool & dev server |
| Tailwind CSS | 3 | Utility-first styling |
| React Router | 6 | Client-side routing |
| Socket.IO Client | 4 | Real-time communication |
| Axios | 1.6 | HTTP requests with interceptors |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | 18+ | Runtime |
| Express | 4 | REST API framework |
| MongoDB | - | Database |
| Mongoose | 8 | ODM / schema validation |
| Socket.IO | 4 | WebSocket server |
| bcryptjs | 2.4 | Password hashing |
| jsonwebtoken | 9 | JWT auth tokens |
| express-validator | 7 | Request validation |

---

## 📁 Project Structure

```
skillswap/
│
├── 📂 backend/
│   ├── 📂 config/
│   │   └── db.js                  # MongoDB connection
│   ├── 📂 middleware/
│   │   └── auth.js                # JWT protect middleware
│   ├── 📂 models/
│   │   ├── User.js                # User schema (skills, requests, ratings)
│   │   └── Chat.js                # Conversation + Message schemas
│   ├── 📂 routes/
│   │   ├── auth.js                # Register / Login / Profile
│   │   ├── users.js               # Browse / Match / Swap / Rate
│   │   └── chat.js                # Conversations & Messages
│   ├── server.js                  # Express + Socket.IO server entry
│   ├── seed.js                    # Database seeder (6 sample users)
│   ├── .env.example               # Environment variable template
│   └── package.json
│
├── 📂 frontend/
│   ├── 📂 src/
│   │   ├── 📂 components/
│   │   │   ├── Navbar.jsx         # Sticky nav with bell notification
│   │   │   ├── Avatar.jsx         # Color-coded user avatar
│   │   │   ├── UserCard.jsx       # Browse card with match score
│   │   │   ├── SkillInput.jsx     # Add / remove skill tags
│   │   │   └── Spinner.jsx        # Loading spinner
│   │   ├── 📂 context/
│   │   │   ├── AuthContext.jsx    # Auth state + Axios instance
│   │   │   ├── SocketContext.jsx  # Socket.IO connection + presence
│   │   │   └── ToastContext.jsx   # Toast notification system
│   │   ├── 📂 pages/
│   │   │   ├── Home.jsx           # Landing page
│   │   │   ├── Login.jsx          # Sign in
│   │   │   ├── Register.jsx       # 2-step registration
│   │   │   ├── Browse.jsx         # Search & filter users
│   │   │   ├── Matches.jsx        # Smart match rankings
│   │   │   ├── Chat.jsx           # Real-time messaging
│   │   │   ├── UserProfile.jsx    # View any user's profile
│   │   │   └── Profile.jsx        # Edit profile + swap inbox
│   │   ├── App.jsx                # Router + context providers
│   │   ├── main.jsx               # Vite entry point
│   │   └── index.css              # Tailwind directives + custom tokens
│   ├── index.html
│   ├── vite.config.js             # Dev proxy config
│   ├── tailwind.config.js         # Custom design tokens
│   └── package.json
│
└── package.json                   # Root scripts (concurrently)
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18 or higher
- **MongoDB** running locally **or** a [MongoDB Atlas](https://www.mongodb.com/atlas) URI
- **npm** v9+

---

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/skillswap.git
cd skillswap
```

### 2. Install all dependencies

```bash
npm run install:all
```

This installs packages for the root, backend, and frontend in one command.

### 3. Configure environment variables

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/skillswap
JWT_SECRET=your_super_secret_key_change_this
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

> **Using MongoDB Atlas?** Replace `MONGO_URI` with your Atlas connection string:
> `mongodb+srv://<user>:<password>@cluster.mongodb.net/skillswap`

### 4. Seed the database (optional but recommended)

```bash
npm run seed
```

Creates 6 sample users with complementary skills:

| Name | Email | Password | Teaches | Wants to Learn |
|------|-------|----------|---------|----------------|
| Kavya Patel | kavya@example.com | password123 | Figma, UI Design | Python |
| Arjun Rao | arjun@example.com | password123 | Python, Django | Figma |
| Shreya Mehta | shreya@example.com | password123 | Tableau, SQL | React |
| Rohan Verma | rohan@example.com | password123 | React, JavaScript | ML |
| Priya Kumar | priya@example.com | password123 | Spanish, French | HTML/CSS |
| Neha Joshi | neha@example.com | password123 | SEO, Marketing | SQL |

### 5. Start the development servers

```bash
npm run dev
```

| Service | URL |
|---------|-----|
| 🌐 Frontend | http://localhost:5173 |
| ⚙️ Backend API | http://localhost:5000 |
| 🏥 Health Check | http://localhost:5000/api/health |

---

## 🔌 API Reference

### Authentication `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/register` | ❌ | Create a new account |
| `POST` | `/login` | ❌ | Sign in, returns JWT token |
| `GET` | `/me` | ✅ | Get current authenticated user |
| `PUT` | `/profile` | ✅ | Update profile, bio, skills |

### Users `/api/users`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/` | ✅ | Browse users with search, category filter, pagination |
| `GET` | `/matches` | ✅ | Get top compatibility matches for current user |
| `GET` | `/requests/inbox` | ✅ | Get all incoming swap requests |
| `PUT` | `/requests/:id` | ✅ | Accept or decline a swap request |
| `GET` | `/:id` | ✅ | Get a user profile with compatibility score |
| `POST` | `/:id/swap-request` | ✅ | Send a swap request to a user |
| `POST` | `/:id/rate` | ✅ | Rate a user 1–5 stars after a swap |

### Chat `/api/chat`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/conversations` | ✅ | Get all conversations for current user |
| `POST` | `/conversations` | ✅ | Start a new conversation |
| `GET` | `/conversations/:id/messages` | ✅ | Fetch message history (paginated) |
| `POST` | `/conversations/:id/messages` | ✅ | Send a message (REST fallback) |

> **Auth** column: ✅ requires `Authorization: Bearer <token>` header

---

## ⚡ Socket.IO Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join:conversations` | — | Join all conversation rooms on connect |
| `join:room` | `{ roomId }` | Join a specific conversation room |
| `message:send` | `{ conversationId, content }` | Send a chat message |
| `typing:start` | `{ conversationId }` | Start typing indicator |
| `typing:stop` | `{ conversationId }` | Stop typing indicator |
| `swap:request:send` | `{ targetUserId }` | Notify recipient of new swap request |
| `swap:request:respond` | `{ targetUserId, status }` | Notify sender of accept/decline |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `message:new` | Message object | New message received in room |
| `typing:start` | `{ userId, name }` | Someone started typing |
| `typing:stop` | `{ userId }` | Someone stopped typing |
| `user:status` | `{ userId, isOnline }` | Online presence update |
| `swap:request:received` | `{ from }` | You received a swap request |
| `swap:request:response` | `{ from, status }` | Your request was accepted/declined |

---

## 🧠 Compatibility Algorithm

The matching score between users A and B is calculated as:

```
score(A, B) = 
  ( |A.teaches ∩ B.wants| + |B.teaches ∩ A.wants| )
  ─────────────────────────────────────────────────  × 100
            max( |A.wants| + |B.wants|, 1 )
```

- All skill comparisons are **case-insensitive**
- Score is **capped at 99%**
- Users with **0% score are excluded** from the `/matches` endpoint
- Results are **sorted descending** by score

**Example:**
- Kavya teaches `Figma` and wants `Python`
- Arjun teaches `Python` and wants `Figma`
- Both skills overlap in both directions → **93% match**

---

## 🎨 Design System

### Typography
| Font | Usage |
|------|-------|
| DM Serif Display | Headings, display text |
| DM Sans | Body, UI elements |

### Color Palette
| Token | Hex | Usage |
|-------|-----|-------|
| `ink` | `#0d1117` | Primary text, dark backgrounds |
| `canvas` | `#f6f4ef` | Page background |
| `sage` | `#1a7f5a` | Primary accent, success states |
| `sage-light` | `#3fb885` | Buttons, tags, highlights |
| `amber` | `#b45309` | Learning skill tags |
| `violet` | `#5b21b6` | Match tags, badges |
| `rose-light` | `#f43f5e` | Notifications, alerts |

### Component Classes
```css
/* Buttons */
.btn  .btn-primary  .btn-dark  .btn-outline  .btn-ghost  .btn-sm  .btn-lg

/* Cards */
.card  .card-hover

/* Form */
.input  .input-dark

/* Tags */
.tag-teach  .tag-learn  .tag-match

/* Avatars */
.avatar-emerald  .avatar-violet  .avatar-amber
.avatar-rose     .avatar-sky     .avatar-orange

/* Utilities */
.section-label  .animate-fade-up  .animate-slide-in
```

---

## 🗄️ Database Schema

### User
```js
{
  name, email, password,       // core auth fields
  initials, avatarColor,       // display fields
  bio, location,               // profile info
  skillsToTeach: [{ name, category, level }],
  skillsToLearn: [{ name, category, level }],
  isOnline, lastSeen,          // presence
  connections: [ObjectId],     // accepted swaps
  swapRequests: [{             // incoming requests
    from, to, status, message, createdAt
  }],
  ratings: [{                  // peer ratings
    from, score, comment
  }],
  totalSwaps                   // completed swap count
}
```

### Conversation
```js
{
  participants: [ObjectId, ObjectId],
  lastMessage: ObjectId,
  lastMessageAt: Date,
  skillSwapContext: { teachSkill, learnSkill }
}
```

### Message
```js
{
  conversation: ObjectId,
  sender: ObjectId,
  content: String,
  read: Boolean,
  createdAt: Date
}
```

---

## 📜 Available Scripts

### Root
```bash
npm run install:all   # Install all dependencies (root + backend + frontend)
npm run dev           # Start both backend and frontend concurrently
npm run seed          # Seed the database with 6 sample users
npm run build         # Build frontend for production
```

### Backend only
```bash
cd backend
npm run dev           # Start backend with nodemon (auto-restart)
npm start             # Start backend without nodemon
node seed.js          # Run seeder directly
```

### Frontend only
```bash
cd frontend
npm run dev           # Start Vite dev server on :5173
npm run build         # Build for production
npm run preview       # Preview production build locally
```

---

## 🚢 Production Deployment

### 1. Build the frontend
```bash
npm run build
# Output: frontend/dist/
```

### 2. Serve static files from Express

Add to the bottom of `backend/server.js`:
```js
const path = require('path')
app.use(express.static(path.join(__dirname, '../frontend/dist')))
app.get('*', (_, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'))
})
```

### 3. Set production environment variables
```env
NODE_ENV=production
MONGO_URI=mongodb+srv://...        # Atlas URI
JWT_SECRET=a_very_strong_secret    # 32+ character random string
CLIENT_URL=https://yourdomain.com
```

### 4. Deploy options
| Platform | Notes |
|----------|-------|
| **Railway** | Deploy both backend and frontend together |
| **Render** | Free tier available, auto-deploys from GitHub |
| **Vercel** | Frontend only (pair with Railway for backend) |
| **DigitalOcean** | Full control, use PM2 for process management |

---

## 🐛 Known Issues & Fixes

### Routes must be ordered correctly
Express matches routes top-to-bottom. Always register specific paths **before** wildcard paths:

```js
// ✅ Correct order
router.get('/matches', ...)           // specific
router.get('/requests/inbox', ...)    // specific
router.get('/requests/:id', ...)      // semi-specific
router.get('/:id', ...)               // wildcard — always last
```

### Mongoose virtuals on subdocuments
If a virtual getter accesses a field that doesn't exist on subdocuments, it crashes when `toJSON` serializes the whole document. Always guard virtual getters:

```js
// ✅ Safe virtual
userSchema.virtual('avgRating').get(function () {
  if (!this.ratings || !this.ratings.length) return 0
  return (this.ratings.reduce((s, r) => s + r.score, 0) / this.ratings.length).toFixed(1)
})
```

### `findByIdAndUpdate` bypasses Mongoose hooks
Use `findById()` + `doc.save()` when you need `pre('save')` hooks to run (e.g. recomputing initials from name changes).

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch — `git checkout -b feature/video-calls`
3. Commit your changes — `git commit -m 'Add WebRTC video call support'`
4. Push to the branch — `git push origin feature/video-calls`
5. Open a Pull Request

---

<div align="center">

Built with ❤️ using **React + Vite + Tailwind + Node.js + MongoDB + Socket.IO**

</div>
