const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const SocialAccount = require('../models/SocialAccount');

const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

/**
 * GET /api/accounts
 * Lists the current user's connected Pages (+ linked Instagram, if any)
 * for the Accounts page and the post-composer's target picker. One
 * connected Facebook Page = one entry here (Instagram is shown as a
 * secondary badge on the same entry, since a Page and its linked IG
 * Business account share a single OAuth connection, not two).
 */
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const accounts = await SocialAccount.find({ userId: req.user.id }).sort({ createdAt: -1 });

  res.json(
    accounts.map((a) => ({
      _id: a._id,
      pageId: a.pageId,
      pageName: a.pageName,
      hasInstagram: Boolean(a.instagramBusinessAccountId),
      instagramUsername: a.instagramUsername,
      status: a.status,
      connectedAt: a.createdAt
    }))
  );
}));

/**
 * DELETE /api/accounts/:id
 * Disconnects a Page (and its linked Instagram, since they share one
 * connection) by SocialAccount _id.
 */
router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const result = await SocialAccount.deleteOne({ _id: req.params.id, userId: req.user.id });

  if (result.deletedCount === 0) {
    return res.status(404).json({ error: 'Account not found.' });
  }

  res.json({ disconnected: true });
}));

module.exports = router;
