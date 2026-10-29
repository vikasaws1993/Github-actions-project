import { ApiError } from '../utils/ApiError.js';
import { HTTP_STATUS, ENVIRONMENT } from '../constants/index.js';
import { config } from '../config/environment.js';
import { logger } from '../utils/logger.js';

/**
 * 404 Not Found Middleware
 * Triggered when no route matches the incoming request.
 */
export const notFoundHandler = (req, res, next) => {
  const error = new ApiError(
    HTTP_STATUS.NOT_FOUND,
    `Resource not found: [${req.method}] ${req.originalUrl}`
  );
  next(error);
};

/**
 * Centralized Global Error Handler Middleware
 * Normalizes all errors and ensures consistent error format across the entire API.
 */
export const errorHandler = (err, req, res, next) => {
  let error = err;

  // If error is not an instance of ApiError, convert it
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, error?.errors || [], err.stack);
  }

  // Log unhandled server errors (500s)
  if (error.statusCode >= 500) {
    logger.error(`[${req.method}] ${req.originalUrl} - ${error.message}`, error.stack);
  }

  const response = {
    success: false,
    statusCode: error.statusCode,
    message: error.message,
    errors: error.errors || [],
    ...(error.data ? { ...error.data, data: error.data } : {}),
    ...(config.env === ENVIRONMENT.DEVELOPMENT && { stack: error.stack }),
  };

  return res.status(error.statusCode).json(response);
};
