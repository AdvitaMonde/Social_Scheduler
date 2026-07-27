const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/crypto');

const { Schema } = mongoose;

/**
 * One document per connected Facebook Page (+ its linked Instagram Business
 * account, if any) per application user. A user who manages multiple Pages
 * and connects more than one will have multiple documents.
 *
 * All token fields are stored encrypted (AES-256-GCM) via setters, and
 * decrypted transparently via the instance methods below. They are also
 * excluded from toJSON so a stray `res.json(account)` can never leak them
 * to the frontend.
 */
const SocialAccountSchema = new Schema(
  {
    // Firebase UID (see Backend/middleware/requireAuth.js) — not a Mongo
    // ObjectId, since users are managed by Firebase Auth, not a local
    // 'User' collection.
    userId: {
      type: String,
      required: true,
      index: true
    },

    provider: {
      type: String,
      enum: ['meta'],
      default: 'meta',
      required: true
    },

    // --- Facebook user-level identity ---
    facebookUserId: { type: String, required: true },

    userAccessToken: {
      type: String,
      required: true,
      set: encrypt,
      select: false // never returned unless explicitly requested with +userAccessToken
    },
    userAccessTokenExpiresAt: { type: Date },

    // --- Page-level ---
    pageId: { type: String, required: true },
    pageName: { type: String, required: true },
    pageAccessToken: {
      type: String,
      required: true,
      set: encrypt,
      select: false
    },

    // --- Instagram Business account linked to this Page, if any ---
    instagramBusinessAccountId: { type: String, default: null },
    instagramUsername: { type: String, default: null },

    status: {
      type: String,
      enum: ['connected', 'expired', 'revoked', 'error'],
      default: 'connected'
    },

    lastError: { type: String, default: null }
  },
  { timestamps: true }
);

SocialAccountSchema.index({ userId: 1, pageId: 1 }, { unique: true });

// Decrypt helpers — call these instead of reading the raw field.
SocialAccountSchema.methods.getUserAccessToken = function () {
  return decrypt(this.userAccessToken);
};
SocialAccountSchema.methods.getPageAccessToken = function () {
  return decrypt(this.pageAccessToken);
};

// Belt-and-suspenders: strip sensitive fields even if someone forgets
// `.select('-pageAccessToken -userAccessToken')` upstream.
SocialAccountSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.userAccessToken;
    delete ret.pageAccessToken;
    return ret;
  }
});

module.exports = mongoose.model('SocialAccount', SocialAccountSchema);
