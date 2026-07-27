# Deploying AI Social Scheduler (Render + MongoDB Atlas)

## 0. Before you deploy — rotate secrets

`Backend/.env` in this project has real credentials in it (Meta App
Secret, JWT secret, token-encryption key). Since they've been shared
outside your machine, treat them as burned:

- Meta App Secret: developers.facebook.com -> Your App -> Settings -> Basic -> reset
- JWT_SECRET / TOKEN_ENCRYPTION_KEY: regenerate with
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

Never commit `.env` — it's already in `.gitignore`. Set real values only
in Render's dashboard (Environment tab), not in the repo.

## 1. Database — MongoDB Atlas

1. Create a free cluster at mongodb.com/atlas.
2. Database Access -> add a user with a strong password.
3. Network Access -> allow access from anywhere (`0.0.0.0/0`) — Render's
   outbound IPs aren't static on the free tier.
4. Copy the connection string (`mongodb+srv://...`) for `MONGO_URI` below.

## 2. Firebase Admin credentials

The backend verifies the frontend's Firebase ID tokens via the Firebase
Admin SDK, so it needs a service account key:

1. Firebase Console -> Project Settings -> Service Accounts -> **Generate
   new private key** (downloads a JSON file).
2. Base64-encode it: `base64 -i serviceAccountKey.json | tr -d '\n'`
3. Paste the result as `FIREBASE_SERVICE_ACCOUNT_BASE64` in Render.

## 3. Backend — Render Web Service

1. New -> Web Service -> connect this repo, root directory `Backend`.
2. Build command: `npm install`. Start command: `npm start`.
3. Environment variables:
   - `PORT` — Render sets this automatically, no need to set it.
   - `BASE_URL` — your Render URL, e.g. `https://your-app.onrender.com`
   - `FRONTEND_URL` — your deployed frontend URL (set after step 4)
   - `MONGO_URI` — from step 1
   - `JWT_SECRET` — new random value (see step 0)
   - `FIREBASE_SERVICE_ACCOUNT_BASE64` — from step 2
   - `META_APP_ID`, `META_APP_SECRET` — from developers.facebook.com
   - `META_REDIRECT_URI` — `https://your-app.onrender.com/api/meta/callback`
     (must exactly match a Valid OAuth Redirect URI configured in your
     Meta App's Facebook Login settings — the ngrok URL currently in
     `.env` is a local dev tunnel and won't work in production)
   - `META_GRAPH_VERSION` — e.g. `v20.0`
   - `TOKEN_ENCRYPTION_KEY` — new random 32-byte hex value (see step 0)
4. Deploy, confirm `GET /health` returns `{"ok":true}`.

## 4. Frontend — static hosting (Render Static Site, Vercel, or Netlify)

1. Root directory `Frontend`. Build command: `npm run build`. Publish
   directory: `dist`.
2. Environment variables (all `VITE_`-prefixed ones are baked in at
   build time, so set these before building):
   - `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
     `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`,
     `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` —
     from Firebase Console -> Project Settings -> General -> Your apps
   - `VITE_API_URL` — `https://your-app.onrender.com/api`
   - `VITE_API_BASE` — `https://your-app.onrender.com`
   - `VITE_META_APP_ID` — same as backend's `META_APP_ID`
3. Deploy, then go back to the backend service on Render and set
   `FRONTEND_URL` to this frontend's real URL (needed for CORS and for
   the OAuth callback redirect to land on the right page).

## 5. Meta App setup

In developers.facebook.com -> Your App:
- Facebook Login -> Settings -> **Valid OAuth Redirect URIs**: add
  `https://your-app.onrender.com/api/meta/callback`
- App Domains: add your Render backend domain.
- Anything beyond `pages_show_list`/basic profile (posting, Instagram
  publishing) requires **App Review** and **Business Verification**
  before it works for anyone other than your own test users — expect
  that process to take time before real users can connect their Pages.

## 6. Smoke test after deploying

- Sign up / log in on the deployed frontend.
- Accounts page -> Connect Facebook & Instagram -> should redirect to
  Facebook and back with a connected Page.
- Create a post scheduled 2 minutes out -> confirm it flips to
  `published` on the Dashboard (the cron job in
  `Backend/jobs/postScheduler.js` runs every minute).

## Known limitations to be aware of post-launch

- `publishingService.publishPost` doesn't currently track *partial*
  success (e.g. Facebook succeeds, Instagram fails) — a failure partway
  through marks the whole post `failed` even if one platform went out.
  Fine to ship as-is, worth revisiting later.
- No automated tests exist yet for the new `/api/accounts` and
  `/api/posts` routes.
