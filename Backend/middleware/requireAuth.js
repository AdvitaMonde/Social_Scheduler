const admin = require('../utils/firebaseAdmin');

/**
 * Verifies the Firebase ID token the frontend attaches to every request
 * (see Frontend/src/api/axios.js) and sets req.user = { id, email }.
 * `id` is the Firebase UID — used as the userId on every document owned
 * by this user (SocialAccount, ScheduledPost, PendingMetaConnection all
 * store userId as a plain String for this reason, not a Mongo ObjectId).
 */
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = { id: decoded.uid, email: decoded.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }
}

module.exports = requireAuth;
