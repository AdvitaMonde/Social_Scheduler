const SocialAccount = require('../models/SocialAccount');
const meta = require('./metaGraphService');

const REAUTH_REQUIRED = 'REAUTH_REQUIRED';

/**
 * Publishes one scheduled post to Facebook and/or Instagram for a given
 * connected Page, using the tokens stored in the DB — never anything the
 * frontend supplies at post-time.
 *
 * `post` shape: { targets: ['facebook','instagram'], message, imageUrl,
 *                  link, videoUrl, isReel }
 */
async function publishPost(userId, pageId, post) {
  const account = await SocialAccount.findOne({ userId, pageId }).select(
    '+pageAccessToken +userAccessToken'
  );

  if (!account) {
    throw new Error('No connected account found for this Page.');
  }

  if (account.status === 'revoked') {
    const err = new Error('This connection was revoked. Reconnect via OAuth.');
    err.code = REAUTH_REQUIRED;
    throw err;
  }

  // Proactively check expiry before spending a Graph API call.
  if (account.userAccessTokenExpiresAt && account.userAccessTokenExpiresAt < new Date()) {
    await markNeedsReauth(account, 'User access token expired.');
    const err = new Error('Token expired. User must reconnect via OAuth.');
    err.code = REAUTH_REQUIRED;
    throw err;
  }

  const pageAccessToken = account.getPageAccessToken();
  const results = {};

  try {
    if (post.targets.includes('facebook')) {
      results.facebook = await meta.publishFacebookPost(account.pageId, pageAccessToken, {
        message: post.message,
        link: post.link,
        imageUrl: post.imageUrl
      });
    }

    if (post.targets.includes('instagram')) {
      if (!account.instagramBusinessAccountId) {
        throw new Error('No Instagram Business account linked to this Page.');
      }
      results.instagram = await meta.publishInstagramPost(
        account.instagramBusinessAccountId,
        pageAccessToken,
        {
          caption: post.message,
          imageUrl: post.imageUrl,
          videoUrl: post.videoUrl,
          isReel: post.isReel
        }
      );
    }
  } catch (err) {
    const graphError = err.response?.data?.error;
    // Meta's standard signal for "token no longer valid" is code 190.
    if (graphError?.code === 190) {
      await markNeedsReauth(account, graphError.message);
      const reauthErr = new Error('Token invalid or revoked. User must reconnect via OAuth.');
      reauthErr.code = REAUTH_REQUIRED;
      throw reauthErr;
    }
    account.status = 'error';
    account.lastError = graphError?.message || err.message;
    await account.save();
    throw err;
  }

  if (account.status !== 'connected') {
    account.status = 'connected';
    account.lastError = null;
    await account.save();
  }

  return results;
}

async function markNeedsReauth(account, message) {
  account.status = 'expired';
  account.lastError = message || 'Token expired or revoked.';
  await account.save();
}

/**
 * Periodic maintenance: Page Access Tokens derived from a long-lived User
 * Access Token generally don't expire on their own, but the underlying
 * User Access Token does (~60 days). Call this on a schedule (see
 * jobs/tokenMaintenance.js) to catch tokens nearing expiry and flag them
 * for reauth before a scheduled post fails.
 */
async function flagExpiringSoon(withinDays = 7) {
  const cutoff = new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000);
  const expiring = await SocialAccount.find({
    userAccessTokenExpiresAt: { $lte: cutoff, $gte: new Date() },
    status: 'connected'
  });

  for (const account of expiring) {
    account.status = 'expired';
    account.lastError = 'User access token expiring soon — reconnect required.';
    await account.save();
    // TODO: notify the user (email/in-app) that they need to reconnect.
  }

  return expiring.length;
}

module.exports = { publishPost, flagExpiringSoon, REAUTH_REQUIRED };
