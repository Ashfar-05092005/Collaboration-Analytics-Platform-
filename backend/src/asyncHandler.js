/**
 * Async error handler wrapper for Express route handlers
 * Catches any errors thrown in async functions and passes to error middleware
 *
 * Usage: router.get('/api/users', asyncHandler(getUsersController))
 */
const asyncHandler = (fn) => (req, res, next) => {
  return Promise.resolve(fn(req, res, next)).catch((err) => {
    // Log the error with context
    console.error(
      `[asyncHandler] Error in ${req.method} ${req.path}:`,
      err.message || err
    );

    // Pass to error middleware
    next(err);
  });
};

module.exports = { asyncHandler };

