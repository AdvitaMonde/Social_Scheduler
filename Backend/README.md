# AI Social Scheduler — Meta OAuth Connection Flow

Replaces manual App ID / Access Token entry with a single **"Connect
Facebook & Instagram"** button, following the standard OAuth Authorization
Code flow used by Buffer/Hootsuite/Later.

## What's in here

```
config/index.js              env + scopes config
utils/crypto.js              AES-256-GCM encrypt/decrypt for tokens at rest
models/SocialAccount.js      permanent, per-user, per-Page connection record
models/PendingMetaConnection.js   short-lived bridge between callback and page-picker (TTL 10 min)
models/ScheduledPost.js      example scheduled-post document
services/metaGraphService.js all Graph API calls (OAuth exchange, page/IG discovery, publishing)
services/publishingService.js reads stored tokens, publishes, handles expired/revoked tokens
routes/metaAuth.js           /api/meta/connect, /callback, /pending/:state, /select-page, /status, /connections/:id
middleware/requireAuth.js    stub JWT auth — swap for your existing auth
jobs/postScheduler.js        cron that publishes due posts every minute
frontend-example/ConnectMetaButton.jsx   reference React UI
server.js                    Express app entrypoint
```

## 1. Create/configure the Meta App (one-time, by you — not the user)

1. Go to [developers.facebook.com](https://developers.facebook.com/apps) and
   create an app of type **Business**.
2. Add the **Facebook Login** and **Instagram Graph API** products.
3. Under Facebook Login settings, add a valid OAuth redirect URI matching
   `META_REDIRECT_URI` (e.g. `https://yourapp.com/api/meta/callback`).
4. Note your **App ID** and **App Secret** — these go in `.env` only, never
   in frontend code.

### Important: App Review is required for production

The scopes this flow requests —
`pages_show_list, pages_manage_posts, pages_read_engagement,
pages_manage_metadata, instagram_basic, instagram_content_publish,
business_management` — are all **Advanced Access** permissions. Until Meta
approves your app for them (via **App Review**, which requires a screencast
of this exact flow plus **Business Verification**), the integration only
works for people listed as Admins/Developers/Testers on your Meta App. Plan
for this review cycle before launch; it commonly takes 1-2+ weeks.

## 2. Configure environment

```bash
cp .env.example .env
```

Fill in `META_APP_ID`, `META_APP_SECRET`, `META_REDIRECT_URI`, `MONGO_URI`,
`JWT_SECRET`, and generate an encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
→ paste into `TOKEN_ENCRYPTION_KEY`.

## 3. Install & run

```bash
npm install
npm run dev
```

## How the flow maps to your spec

| Your step | Implementation |
|---|---|
| 1. Connect button | `frontend-example/ConnectMetaButton.jsx` → `GET /api/meta/connect` |
| 2. OAuth redirect w/ scopes | `metaGraphService.buildAuthUrl()` |
| 3. Callback exchanges code → short-lived → long-lived token | `routes/metaAuth.js` `/callback` |
| 4. Fetch Pages, Page tokens, IG Business ID | `metaGraphService.getManagedPagesWithInstagram()` (one call, uses field expansion) |
| 4.5 Multi-page picker | `PendingMetaConnection` + `GET /pending/:state` + `POST /select-page` |
| 5. Store encrypted, backend-only | `models/SocialAccount.js` — tokens encrypted via Mongoose setters, `select: false` by default, stripped in `toJSON` |
| 6. Posting workflow | `services/publishingService.js` + `jobs/postScheduler.js` |
| 7. Reauth on expiry | `publishingService` catches Graph error code `190` and any token past `userAccessTokenExpiresAt`, flips status to `expired`, surfaces a "Reconnect" button |

## Security notes

- App Secret and all tokens live only in the backend `.env` / database —
  never sent to the frontend (verify: `SocialAccount` tokens are
  `select: false` and stripped in `toJSON` as a second safety net).
- Tokens are encrypted at rest with AES-256-GCM (`utils/crypto.js`). Rotate
  `TOKEN_ENCRYPTION_KEY` via a re-encryption migration if it's ever
  compromised — don't just swap it live.
- The OAuth `state` parameter is a random value bound to the signed-in user
  via an httpOnly cookie and re-validated on callback (CSRF protection).
- Long-lived User Access Tokens last ~60 days; Page Access Tokens derived
  from them typically don't expire on their own but stop working if the
  user token is revoked or the user removes your app's permissions. There
  is no silent server-side "refresh" for Meta tokens — when a token is
  invalid, the only fix is the user clicking "Connect Facebook & Instagram"
  again. The scheduler surfaces this as `needs_reauth`.
- Use HTTPS in production (`secure: true` cookies assume it).

## Not included (left for you to wire up)

- Your actual user auth — `middleware/requireAuth.js` is a stub matching
  whatever `req.user.id` your app already sets.
- User-facing notifications when a connection needs reauth
  (`TODO` comments mark where to hook this in).
- Rate limiting / retry-with-backoff on Graph API calls.
