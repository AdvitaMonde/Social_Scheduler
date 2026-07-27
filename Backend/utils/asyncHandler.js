/**
 * Wraps an async Express route handler so a thrown error or rejected
 * promise is passed to next(err) instead of becoming an unhandled
 * rejection. In Express 4, async handlers don't do this automatically —
 * and on modern Node, an unhandled rejection crashes the whole process,
 * not just the request. Wrap every async route with this.
 */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = asyncHandler;
