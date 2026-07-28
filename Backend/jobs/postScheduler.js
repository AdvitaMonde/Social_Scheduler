const cron = require('node-cron');
const ScheduledPost = require('../models/ScheduledPost');
const { publishPost, REAUTH_REQUIRED } = require('../services/publishingService');

/**
 * Runs every minute, publishes any post whose `scheduledFor` has passed.
 * This is the "6. Posting Workflow" step: reads tokens from the DB,
 * publishes, and marks the post as published/failed/needs_reauth.
 */
function startPostScheduler() {
  cron.schedule('* * * * *', async () => {
    const due = await ScheduledPost.find({
      status: 'pending',
      scheduledFor: { $lte: new Date() }
    }).limit(50);

    for (const post of due) {
      post.status = 'publishing';
      await post.save();

      try {
        const result = await publishPost(post.userId, post.pageId, {
          targets: post.targets,
          message: post.message,
          imageUrl: post.imageUrl,
          link: post.link,
          videoUrl: post.videoUrl,
          isReel: post.isReel
        });

        const values = Object.values(result);
        const allSuccess = values.every((r) => r.success);
        const anySuccess = values.some((r) => r.success);

        post.status = allSuccess ? 'published' : anySuccess ? 'partial' : 'failed';
        post.result = result;
        post.error = null;
      } catch (err) {
        post.status = err.code === REAUTH_REQUIRED ? 'needs_reauth' : 'failed';
        post.result = err.results || null;
        post.error = err.message;
        // TODO: notify the user, especially for needs_reauth so they can
        // click "Connect Facebook & Instagram" again.
      }

      await post.save();
    }
  });
}

module.exports = startPostScheduler;










// const cron = require('node-cron');
// const ScheduledPost = require('../models/ScheduledPost');
// const { publishPost, REAUTH_REQUIRED } = require('../services/publishingService');

// /**
//  * Runs every minute, publishes any post whose `scheduledFor` has passed.
//  * This is the "6. Posting Workflow" step: reads tokens from the DB,
//  * publishes, and marks the post as published/failed/needs_reauth.
//  */
// function startPostScheduler() {
//   cron.schedule('* * * * *', async () => {
//     const due = await ScheduledPost.find({
//       status: 'pending',
//       scheduledFor: { $lte: new Date() }
//     }).limit(50);

//     for (const post of due) {
//       post.status = 'publishing';
//       await post.save();

//       try {
//         const result = await publishPost(post.userId, post.pageId, {
//           targets: post.targets,
//           message: post.message,
//           imageUrl: post.imageUrl,
//           link: post.link,
//           videoUrl: post.videoUrl,
//           isReel: post.isReel
//         });

//         post.status = 'published';
//         post.result = result;
//         post.error = null;
//       } catch (err) {
//         post.status = err.code === REAUTH_REQUIRED ? 'needs_reauth' : 'failed';
//         post.error = err.message;
//         // TODO: notify the user, especially for needs_reauth so they can
//         // click "Connect Facebook & Instagram" again.
//       }

//       await post.save();
//     }
//   });
// }

// module.exports = startPostScheduler;
