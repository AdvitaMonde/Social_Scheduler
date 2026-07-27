const express = require('express');
const crypto = require('crypto');

const config = require('../config');
const requireAuth = require('../middleware/requireAuth');
const meta = require('../services/metaGraphService');
const SocialAccount = require('../models/SocialAccount');
const PendingMetaConnection = require('../models/PendingMetaConnection');

const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

/**
 * GET /api/meta/connect
 * Step 1 of the desired flow: user clicks "Connect Facebook & Instagram".
 * We generate a CSRF-safe `state`, remember which app-user it belongs to
 * (signed into a short cookie, not trusted alone), and hand the frontend
 * the Meta auth URL to redirect to.
 *
 * This must be called via an authenticated XHR/fetch (so the Firebase ID
 * token is attached) rather than a plain top-level navigation — a real
 * `window.location.href = <this route>` can't carry an Authorization
 * header. The frontend calls this first, then does the top-level
 * redirect itself using the URL returned here.
 */
router.get('/connect', requireAuth, (req, res) => {
  const state = crypto.randomBytes(24).toString('hex');

  // Bind state -> our internal userId via a short-lived, httpOnly cookie.
  // (We also never trust the state's mapping until we look it up again in
  // the callback, so a forged cookie alone can't hijack another account.)
  // res.cookie('meta_oauth_state', state, {
  //   httpOnly: true,
  //   secure: false,
  //   sameSite: 'lax',
  //   maxAge: 10 * 60 * 1000
  // });
  // res.cookie('meta_oauth_state_user', String(req.user.id), {
  //   httpOnly: true,
  //   secure: false,
  //   sameSite: 'lax',
  //   maxAge: 10 * 60 * 1000
  // });



res.cookie('meta_oauth_state', state, {
  httpOnly: true,
  secure: true,
  sameSite: 'none',
  maxAge: 10 * 60 * 1000,
  domain: 'founder-spied-freestyle.ngrok-free.dev'
});

res.cookie('meta_oauth_state_user', String(req.user.id), {
  httpOnly: true,
  secure: true,
  sameSite: 'none',
  maxAge: 10 * 60 * 1000,
  domain: 'founder-spied-freestyle.ngrok-free.dev'
});



  const authUrl = meta.buildAuthUrl(state);
  res.json({ url: authUrl });
});

/**
 * GET /api/meta/callback
 * Step 3 of the desired flow. Meta redirects here with `code` + `state`.
 * We: exchange code -> user token -> long-lived token, fetch the user's
 * Pages (+ linked Instagram Business accounts), and stash them in a
 * short-lived PendingMetaConnection so the frontend can present a picker
 * if there's more than one Page. No token ever touches the frontend.
 */

// router.get('/callback', (req, res) => {
//   console.log("🔥 META CALLBACK HIT");
//   console.log(req.query);

//   res.send("Callback reached");
// });


router.get('/callback', asyncHandler(async (req, res) => {
   
  const { code, state, error, error_description: errorDescription } = req.query;
 
 

  if (error) {
    return redirectWithStatus(res, 'error', errorDescription || error);
  }

     console.log("CALLBACK STARTED");
    console.log("CODE:", !!code);
    console.log("STATE:", state);

  const cookieState = req.cookies?.meta_oauth_state;
  const cookieUserId = req.cookies?.meta_oauth_state_user;

  console.log("COOKIE STATE:", cookieState);
  console.log("COOKIE USER:", cookieUserId);
  // console.log("COOKIE SET FOR STATE:", state);
  // console.log("USER:", req.user.id);
  // console.log("USER FROM COOKIE:", cookieUserId);

  if (!code || !state || !cookieState || state !== cookieState || !cookieUserId) {
    return redirectWithStatus(res, 'error', 'Invalid or expired OAuth state.');
  }


  
   console.log("BEFORE TRY BLOCK");
  try {
     console.log("INSIDE TRY BLOCK");

    // 1) code -> short-lived user token
    const shortLived = await meta.exchangeCodeForUserToken(code);

    console.log("SHORT TOKEN RECEIVED");

    // 2) short-lived -> long-lived user token (recommended)
    const longLived = await meta.getLongLivedUserToken(shortLived.access_token);

    console.log("LONG TOKEN RECEIVED");

    const userAccessToken = longLived.access_token;
    const expiresAt = longLived.expires_in
      ? new Date(Date.now() + longLived.expires_in * 1000)
      : null;

    // 3) who is this on Facebook
    // const fbUser = await meta.getFacebookUserId(userAccessToken);

    // console.log("FB USER:", fbUser);

    const fbUser = await meta.getFacebookUserId(userAccessToken);

        console.log("FB USER RAW:");
        console.log(JSON.stringify(fbUser, null, 2));

        if (!fbUser || !fbUser.id) {
         throw new Error("Facebook user id missing");
        }

    // 4) fetch every managed Page + its Page token + linked IG account
    const pages = await meta.getManagedPagesWithInstagram(userAccessToken);

    console.log("PAGES:", pages.length);

    if (pages.length === 0) {
      return redirectWithStatus(
        res,
        'error',
        'No Facebook Pages found for this account. Create or get admin access to a Page first.'
      );
    }

    const pendingState = crypto.randomBytes(24).toString('hex');
    await PendingMetaConnection.create({
      state: pendingState,
      userId: cookieUserId,
      facebookUserId: fbUser.id,
      userAccessToken,
      userAccessTokenExpiresAt: expiresAt,
      pages
    });


    res.clearCookie('meta_oauth_state');
    res.clearCookie('meta_oauth_state_user'); 

    console.log("PENDING SAVED");

    // Hand the frontend only a state token + non-sensitive page summaries.
    // If there's exactly one Page, the frontend can auto-select it.
    return res.redirect(
      `${config.frontendUrl}/settings/connections?meta_pending=${pendingState}`
    );
  } catch (err) {
  console.log("META ERROR FULL:");
  console.log(JSON.stringify(err.response?.data, null, 2));

  console.log("REQUEST URL:");
  console.log(err.config?.url);

  console.log("REQUEST PARAMS:");
  console.log(err.config?.params);

  const message = err.response?.data?.error?.message || err.message;
  return redirectWithStatus(res, 'error', message);
  }
}));










function redirectWithStatus(res, status, message) {
  const params = new URLSearchParams({ meta_status: status, meta_message: message || '' });
  res.redirect(`${config.frontendUrl}/settings/connections?${params.toString()}`);
}

/**
 * GET /api/meta/pending/:state
 * Frontend calls this to render the "select a Page" step. Returns only
 * non-sensitive fields — no tokens.
 */
router.get('/pending/:state', requireAuth, asyncHandler(async (req, res) => {
  const pending = await PendingMetaConnection.findOne({
    state: req.params.state,
    userId: req.user.id
  });

  if (!pending) {
    return res.status(404).json({ error: 'No pending connection found (it may have expired).' });
  }

  res.json({
    pages: pending.pages.map((p) => ({
      pageId: p.pageId,
      pageName: p.pageName,
      hasInstagram: Boolean(p.instagramBusinessAccountId),
      instagramUsername: p.instagramUsername
    }))
  });
}));

/**
 * POST /api/meta/select-page  { state, pageId }
 * Step 5 of the desired flow. Finalizes the chosen Page (and its linked
 * IG account, if any) into a permanent, encrypted SocialAccount record.
 */
router.post('/select-page', requireAuth, asyncHandler(async (req, res) => {
  const { state, pageId } = req.body;
  if (!state || !pageId) {
    return res.status(400).json({ error: 'state and pageId are required.' });
  }

  const pending = await PendingMetaConnection.findOne({ state, userId: req.user.id });
  if (!pending) {
    return res.status(404).json({ error: 'No pending connection found (it may have expired).' });
  }

  const chosen = pending.pages.find((p) => p.pageId === pageId);
  if (!chosen) {
    return res.status(400).json({ error: 'That Page was not part of this connection attempt.' });
  }

  const account = await SocialAccount.findOneAndUpdate(
    { userId: req.user.id, pageId: chosen.pageId },
    {
      userId: req.user.id,
      provider: 'meta',
      facebookUserId: pending.facebookUserId,
      userAccessToken: pending.getUserAccessToken(),
      userAccessTokenExpiresAt: pending.userAccessTokenExpiresAt,
      pageId: chosen.pageId,
      pageName: chosen.pageName,
      pageAccessToken: pending.getPageAccessToken(chosen),
      instagramBusinessAccountId: chosen.instagramBusinessAccountId,
      instagramUsername: chosen.instagramUsername,
      status: 'connected',
      lastError: null
    },
    { upsert: true, new: true }
  );

  await PendingMetaConnection.deleteOne({ _id: pending._id });

  res.json({
    connected: true,
    pageName: account.pageName,
    instagramConnected: Boolean(account.instagramBusinessAccountId),
    instagramUsername: account.instagramUsername
  });
}));

/**
 * GET /api/meta/status
 * Frontend uses this to render connection state on the dashboard —
 * page names/status only, never tokens.
 */
router.get('/status', requireAuth, asyncHandler(async (req, res) => {
  const accounts = await SocialAccount.find({ userId: req.user.id }).select(
    'pageId pageName instagramBusinessAccountId instagramUsername status createdAt'
  );

  res.json({
    connections: accounts.map((a) => ({
      pageId: a.pageId,
      pageName: a.pageName,
      instagramConnected: Boolean(a.instagramBusinessAccountId),
      instagramUsername: a.instagramUsername,
      status: a.status,
      connectedAt: a.createdAt
    }))
  });
}));

/**
 * DELETE /api/meta/connections/:pageId
 * Disconnects a Page (and stops the scheduler from posting to it).
 */
router.delete('/connections/:pageId', requireAuth, asyncHandler(async (req, res) => {
  const result = await SocialAccount.deleteOne({
    userId: req.user.id,
    pageId: req.params.pageId
  });

  if (result.deletedCount === 0) {
    return res.status(404).json({ error: 'Connection not found.' });
  }

  res.json({ disconnected: true });
}));

module.exports = router;
