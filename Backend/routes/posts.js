const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const ScheduledPost = require('../models/ScheduledPost');
const SocialAccount = require('../models/SocialAccount');

const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

/**
 * Shapes a ScheduledPost document for the frontend (Dashboard/PostCard),
 * which expects `content`/`scheduledTime` plus per-target `accounts` and
 * `results` arrays rather than the raw targets/message/result fields.
 */
function toClientPost(post) {
  const accounts = post.targets.map((platform) => ({
    _id: `${post.pageId}:${platform}`,
    platform,
    accountName: post.pageName || post.pageId
  }));

  let results = [];
  if (post.status === 'published') {
    results = post.targets.map((platform) => ({
      platform,
      success: true,
      postId: post.result?.[platform]?.id || post.result?.[platform]?.post_id || null
    }));
  } else if (post.status === 'failed' || post.status === 'needs_reauth') {
    results = post.targets.map((platform) => ({
      platform,
      success: false,
      error: post.error
    }));
  }

  return {
    _id: post._id,
    content: post.message,
    imageUrl: post.imageUrl,
    scheduledTime: post.scheduledFor,
    status: post.status,
    accounts,
    results
  };
}

/**
 * GET /api/posts
 * Lists the current user's scheduled posts, most recently scheduled first.
 */
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const posts = await ScheduledPost.find({ userId: req.user.id }).sort({ scheduledFor: -1 });
  res.json(posts.map(toClientPost));
}));

/**
 * POST /api/posts
 * body: { content, imageUrl, accounts: [SocialAccount _id, ...], scheduledTime }
 *
 * Creates one ScheduledPost per selected connected Page. Each post
 * targets Facebook, plus Instagram too if that Page has a linked
 * Instagram Business account — the scheduler (jobs/postScheduler.js)
 * picks these up and publishes via publishingService using the tokens
 * already stored on the SocialAccount.
 */
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { content, imageUrl, accounts, scheduledTime } = req.body;

  if (!content || !scheduledTime) {
    return res.status(400).json({ error: 'content and scheduledTime are required.' });
  }
  if (!Array.isArray(accounts) || accounts.length === 0) {
    return res.status(400).json({ error: 'Select at least one account to post to.' });
  }

  // const scheduledFor = new Date(scheduledTime);
  const scheduledFor = new Date(`${scheduledTime}:00+05:30`);
  if (Number.isNaN(scheduledFor.getTime())) {
    return res.status(400).json({ error: 'Invalid scheduledTime.' });
  }

  const socialAccounts = await SocialAccount.find({
    _id: { $in: accounts },
    userId: req.user.id
  });

  if (socialAccounts.length !== accounts.length) {
    return res.status(400).json({ error: 'One or more selected accounts were not found.' });
  }

  const created = await ScheduledPost.insertMany(
    socialAccounts.map((account) => ({
      userId: req.user.id,
      pageId: account.pageId,
      pageName: account.pageName,
      targets: account.instagramBusinessAccountId ? ['facebook', 'instagram'] : ['facebook'],
      message: content,
      imageUrl: imageUrl || null,
      scheduledFor,
      status: 'pending'
    }))
  );

  res.status(201).json(created.map(toClientPost));
}));

/**
 * DELETE /api/posts/:id
 */
router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const result = await ScheduledPost.deleteOne({ _id: req.params.id, userId: req.user.id });

  if (result.deletedCount === 0) {
    return res.status(404).json({ error: 'Post not found.' });
  }

  res.json({ deleted: true });
}));

module.exports = router;
