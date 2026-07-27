# 📅 AI Social Media Scheduler

A beginner-friendly, ready-to-deploy MERN + Firebase app that lets you:

- Schedule posts in advance
- Automatically publish them to **Facebook Pages** and **Instagram Business Accounts** via the Meta Graph API
- Manage multiple connected social accounts from one dashboard

---

## 🧱 Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React (Vite) + Tailwind (CDN) + React Router |
| Auth | Firebase Authentication (Email/Password) |
| Backend | Node.js + Express |
| Database | MongoDB (Mongoose) |
| Scheduling | `node-cron` (checks every minute for due posts) |
| Publishing | Meta Graph API (Facebook & Instagram) |

---

## 📁 Project Structure

```
social-media-scheduler/
├── backend/
│   ├── config/          # DB + Firebase Admin setup
│   ├── middleware/       # Firebase token verification
│   ├── models/           # Post, SocialAccount schemas
│   ├── routes/           # /api/accounts, /api/posts
│   ├── services/         # metaService.js (Graph API calls)
│   ├── utils/             # scheduler.js (cron job)
│   └── server.js
└── frontend/
    └── src/
        ├── pages/         # Login, Signup, Dashboard, Accounts, CreatePost
        ├── components/    # Navbar, PostCard, AccountCard, ProtectedRoute
        ├── context/       # AuthContext (Firebase auth state)
        └── api/axios.js   # Auto-attaches Firebase ID token
```

---

## 🚀 Local Setup

### 1. Prerequisites
- Node.js 18+
- A free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) cluster
- A [Firebase project](https://console.firebase.google.com/) with **Email/Password Authentication** enabled
- A [Meta Developer App](https://developers.facebook.com/) with a Facebook Page (and optionally an Instagram Business account linked to it)

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Fill in `.env`:
- `MONGO_URI` — your MongoDB Atlas connection string
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` — from Firebase Console → Project Settings → Service Accounts → **Generate new private key** (copy the 3 fields from the downloaded JSON)
- `CLIENT_URL` — your frontend URL (e.g. `http://localhost:5173`)

Run it:
```bash
npm run dev
```
Backend runs at `http://localhost:5000`.

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
```

Fill in `.env` with your Firebase **Web App** config (Firebase Console → Project Settings → General → Your apps → Web app) and `VITE_API_URL=http://localhost:5000/api`.

Run it:
```bash
npm run dev
```
Frontend runs at `http://localhost:5173`.

---

## 🔑 Connecting Facebook/Instagram Accounts (Beginner Method)

This project uses a simple, beginner-friendly way to connect accounts — no complex OAuth flow to build yourself:

1. Go to the [Meta Graph API Explorer](https://developers.facebook.com/tools/explorer/).
2. Select your app, then select your Page from the "User or Page" dropdown to get a **Page Access Token**.
3. Click "Extend Access Token" (or use the Access Token Debugger) to get a **long-lived token** (~60 days).
4. Get your **Page ID** from your Facebook Page's "About" section.
5. For Instagram, get your **Instagram Business Account ID** via:
   `GET /{page-id}?fields=instagram_business_account&access_token={token}`
6. In the app's **Accounts** page, paste these values in to connect the account.

> ⚠️ Required Graph API permissions: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`. Your Meta app must complete **App Review** for these permissions before publishing to accounts you don't personally manage/test with.

---

## ☁️ Deployment

### Backend → Render (free tier)
1. Push this repo to GitHub.
2. On [Render](https://render.com), create a new **Web Service** pointing at `backend/`.
3. Build command: `npm install` — Start command: `npm start`.
4. Add all `.env` variables in Render's Environment settings.

### Frontend → Vercel or Netlify
1. Create a new project pointing at `frontend/`.
2. Build command: `npm run build` — Output directory: `dist`.
3. Add the `VITE_*` environment variables in the project settings, with `VITE_API_URL` pointing to your deployed Render backend (e.g. `https://your-app.onrender.com/api`).

### Database → MongoDB Atlas
Already cloud-hosted — just make sure to whitelist `0.0.0.0/0` (or Render's IPs) in Atlas Network Access.

---

## 🛠 How It Works

1. User signs up/logs in via Firebase Auth in the React app.
2. Every API request from the frontend includes the Firebase ID token; the backend verifies it with `firebase-admin`.
3. User connects Facebook/Instagram accounts (stored in MongoDB, linked to their Firebase UID).
4. User creates a post with content, optional image URL, target accounts, and a scheduled date/time.
5. A `node-cron` job runs every minute on the backend, checks for posts whose `scheduledTime` has passed, and calls the Meta Graph API to publish them — updating each post's status (`published`, `failed`, or `partial`).

---

## 📌 Notes for Beginners

- This is intentionally kept simple: authentication is Firebase email/password (you can add Google sign-in easily), and account connection is manual token entry rather than a full OAuth redirect flow.
- Instagram posts **require** an image URL (Meta's API doesn't support text-only IG posts).
- The image must be a **public URL** (e.g. hosted on Imgur, Cloudinary, or Firebase Storage) — the Graph API needs to fetch it directly.
- Access tokens expire (~60 days for long-lived tokens) — you'll need to reconnect accounts periodically unless you build a token-refresh flow later.
