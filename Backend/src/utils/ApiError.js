/**
 * Custom Operational Error Class
 * Standardizes API error responses across controllers, services, and middlewares.
 */
export class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Descriptive error message
   * @param {Array} errors - Optional detailed validation or sub-errors
   * @param {string} stack - Optional error stack trace
   */
  constructor(
    statusCode,
    message = 'Something went wrong',
    errors = [],
    stack = '',
    data = null
  ) {
    super(message);
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = false;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
