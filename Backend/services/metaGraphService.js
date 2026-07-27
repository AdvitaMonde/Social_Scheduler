const axios = require('axios');
const config = require('../config');

const GRAPH_VERSION = config.meta.graphVersion;
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

/**
 * Build the Meta OAuth "dialog" URL the user is redirected to.
 * `state` must be a random, unguessable, per-attempt value stored
 * server-side and checked on callback (CSRF protection).
 */
function buildAuthUrl(state) {
  console.log("GRAPH BASE:", GRAPH_BASE);
  console.log("REDIRECT URI:", config.meta.redirectUri());
  const params = new URLSearchParams({
    client_id: config.meta.appId(),
    redirect_uri: config.meta.redirectUri(),
    state,
    response_type: 'code',
    scope: config.meta.scopes.join(',')
  });
  // return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
  return `https://www.facebook.com/dialog/oauth?${params.toString()}`;
}

/**
 * Step 1: exchange the authorization code from the callback for a
 * short-lived User Access Token.
 */
async function exchangeCodeForUserToken(code) {
  const { data } = await axios.get(`${GRAPH_BASE}/oauth/access_token`, {
    timeout: 10000,
    params: {
      client_id: config.meta.appId(),
      client_secret: config.meta.appSecret(),
      redirect_uri: config.meta.redirectUri(),
      code
    }
  });
  // { access_token, token_type, expires_in }
  return data;
}

/**
 * Step 2: exchange a short-lived User Access Token for a long-lived one
 * (~60 days). Meta's "recommended" step from the spec.
 */
async function getLongLivedUserToken(shortLivedToken) {
  const { data } = await axios.get(`${GRAPH_BASE}/oauth/access_token`, {
    params: {
      grant_type: 'fb_exchange_token',
      client_id: config.meta.appId(),
      client_secret: config.meta.appSecret(),
      fb_exchange_token: shortLivedToken
    }
  });
  // { access_token, token_type, expires_in } — expires_in is in seconds (~5184000 = 60 days)
  return data;
}

/**
 * Fetch the Facebook user's own profile id (for storage/reference).
 */
async function getFacebookUserId(userAccessToken) {
  const { data } = await axios.get(`${GRAPH_BASE}/me`, {
    params: { access_token: userAccessToken, fields: 'id,name' }
  });
  return data; // { id, name }
}

/**
 * Fetch every Facebook Page the user manages, along with each Page's own
 * (long-lived, non-expiring-by-default) Page Access Token, and detect any
 * linked Instagram Business Account — all in one call using field expansion.
 */
async function getManagedPagesWithInstagram(userAccessToken) {
  const { data } = await axios.get(`${GRAPH_BASE}/me/accounts`, {
    params: {
      access_token: userAccessToken,
      fields: 'id,name,access_token,instagram_business_account{id,username}'
    }
  });

  return (data.data || []).map((page) => ({
    pageId: page.id,
    pageName: page.name,
    pageAccessToken: page.access_token,
    instagramBusinessAccountId: page.instagram_business_account
      ? page.instagram_business_account.id
      : null,
    instagramUsername: page.instagram_business_account
      ? page.instagram_business_account.username
      : null
  }));
}

/**
 * Publish a text/link/photo post to a Facebook Page.
 * `payload` can include: message, link, and/or a photo `url`.
 */
async function publishFacebookPost(pageId, pageAccessToken, payload) {
  const { message, link, imageUrl } = payload;

  console.log("APP ID:", config.meta.appId());
console.log("APP SECRET EXISTS:", !!config.meta.appSecret());

  if (imageUrl) {
    const { data } = await axios.post(`${GRAPH_BASE}/${pageId}/photos`, null, {
      params: {
        access_token: pageAccessToken,
        url: imageUrl,
        caption: message || ''
      }
    });
    return data; // { id, post_id }
  }

  const { data } = await axios.post(`${GRAPH_BASE}/${pageId}/feed`, null, {
    params: {
      access_token: pageAccessToken,
      message: message || '',
      ...(link ? { link } : {})
    }
  });
  return data; // { id }
}

/**
 * Publish an image (or reel/video) to Instagram: create a media container,
 * then publish it. Instagram Graph API requires a two-step process.
 */
async function publishInstagramPost(igBusinessAccountId, pageAccessToken, payload) {
  const { caption, imageUrl, videoUrl, isReel } = payload;

  const containerParams = {
    access_token: pageAccessToken,
    caption: caption || ''
  };

  if (videoUrl) {
    containerParams.media_type = isReel ? 'REELS' : 'VIDEO';
    containerParams.video_url = videoUrl;
  } else if (imageUrl) {
    containerParams.image_url = imageUrl;
  } else {
    throw new Error('publishInstagramPost requires imageUrl or videoUrl.');
  }

  const { data: container } = await axios.post(
    `${GRAPH_BASE}/${igBusinessAccountId}/media`,
    null,
    { params: containerParams }
  );

  const { data: published } = await axios.post(
    `${GRAPH_BASE}/${igBusinessAccountId}/media_publish`,
    null,
    { params: { access_token: pageAccessToken, creation_id: container.id } }
  );

  return published; // { id }
}

/**
 * Check whether a stored token is still valid and how much time is left.
 */
async function debugToken(inputToken) {
  const { data } = await axios.get(`${GRAPH_BASE}/debug_token`, {
    params: {
      input_token: inputToken,
      access_token: `${config.meta.appId()}|${config.meta.appSecret()}` // app token
    }
  });
  return data.data; // { is_valid, expires_at, scopes, ... }
}

module.exports = {
  buildAuthUrl,
  exchangeCodeForUserToken,
  getLongLivedUserToken,
  getFacebookUserId,
  getManagedPagesWithInstagram,
  publishFacebookPost,
  publishInstagramPost,
  debugToken
};
