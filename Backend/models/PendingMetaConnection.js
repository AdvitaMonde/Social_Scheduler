const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/crypto');

const { Schema } = mongoose;

/**
 * Bridges the gap between the OAuth callback (where we fetch the user's
 * Pages) and the "pick a Page" step in the UI, without ever sending tokens
 * to the frontend. The frontend only ever sees `state` + a list of
 * {pageId, pageName, hasInstagram} options.
 *
 * TTL-indexed so abandoned connection attempts clean themselves up.
 */
const PendingMetaConnectionSchema = new Schema({
  state: { type: String, required: true, unique: true, index: true },
  // Firebase UID — see note in models/SocialAccount.js.
  userId: { type: String, required: true },

  facebookUserId: { type: String, required: true },
  userAccessToken: { type: String, required: true, set: encrypt, select: false },
  userAccessTokenExpiresAt: { type: Date },

  // Candidate pages fetched right after OAuth, awaiting the user's pick.
  pages: [
    {
      pageId: String,
      pageName: String,
      pageAccessToken: { type: String, set: encrypt },
      instagramBusinessAccountId: { type: String, default: null },
      instagramUsername: { type: String, default: null }
    }
  ],

  createdAt: { type: Date, default: Date.now, expires: 600 } // 10 minutes
});

PendingMetaConnectionSchema.methods.getUserAccessToken = function () {
  return decrypt(this.userAccessToken);
};
PendingMetaConnectionSchema.methods.getPageAccessToken = function (pageEntry) {
  return decrypt(pageEntry.pageAccessToken);
};

module.exports = mongoose.model('PendingMetaConnection', PendingMetaConnectionSchema);
