const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Minimal representation of a scheduled post — your AI Social Scheduler
 * likely already has a richer version of this. Shown here just so
 * jobs/postScheduler.js has something real to query.
 */
const ScheduledPostSchema = new Schema(
  {
    // Firebase UID — see note in models/SocialAccount.js.
    userId: { type: String, required: true, index: true },
    pageId: { type: String, required: true },
    // Denormalized for display so the dashboard doesn't need to join
    // against SocialAccount (and still shows a name if the account is
    // later disconnected).
    pageName: { type: String, default: null },
    targets: [{ type: String, enum: ['facebook', 'instagram'] }],
    message: String,
    imageUrl: String,
    link: String,
    videoUrl: String,
    isReel: { type: Boolean, default: false },
    scheduledFor: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'publishing', 'published', 'failed', 'needs_reauth'],
      default: 'pending'
    },
    result: Schema.Types.Mixed,
    error: String
  },
  { timestamps: true }
);

module.exports = mongoose.model('ScheduledPost', ScheduledPostSchema);
