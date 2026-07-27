const admin = require('firebase-admin');
const config = require('../config');

/**
 * The frontend authenticates users with Firebase Auth and sends the
 * resulting Firebase ID token as `Authorization: Bearer <token>` on every
 * API request (see Frontend/src/api/axios.js). The backend needs the
 * Firebase Admin SDK to verify those tokens are genuine and unexpired —
 * it can't do this with a plain shared secret, since Firebase signs ID
 * tokens itself (RS256) using keys only Google holds.
 *
 * Set FIREBASE_SERVICE_ACCOUNT_BASE64 to a base64-encoded copy of the
 * service account JSON downloaded from:
 * Firebase Console -> Project Settings -> Service Accounts -> Generate new private key
 *
 *   base64 -i serviceAccountKey.json | tr -d '\n'
 */
if (!admin.apps.length) {
  const decoded = Buffer.from(config.firebase.serviceAccountBase64(), 'base64').toString('utf8');
  const serviceAccount = JSON.parse(decoded);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

module.exports = admin;
