import { ApiError } from '../utils/ApiError.js';
import { HTTP_STATUS } from '../constants/index.js';

/**
 * Request Validation Middleware using Zod
 * @param {import('zod').ZodSchema} schema - Zod validation schema
 */
export const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    // Replace req properties with sanitized/parsed values
    if (parsed.body) req.body = parsed.body;
    if (parsed.query) req.query = parsed.query;
    if (parsed.params) req.params = parsed.params;

    next();
  } catch (err) {
    // Format Zod errors
    const errorMessages = err.errors
      ? err.errors.map((e) => ({
          field: e.path.slice(1).join('.') || e.path.join('.'),
          message: e.message,
        }))
      : [err.message];

    next(new ApiError(HTTP_STATUS.BAD_REQUEST, 'Validation failed', errorMessages));
  }
};
