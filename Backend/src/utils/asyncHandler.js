/**
 * Async Handler Wrapper
 * Wraps asynchronous Express route handlers and forwards any rejected promise to the next error middleware.
 * Eliminates boilerplate try/catch blocks in controllers.
 *
 * @param {Function} requestHandler - Async route handler function (req, res, next)
 * @returns {Function} Express middleware handler
 */
export const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};
