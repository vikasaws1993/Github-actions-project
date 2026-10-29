import { z } from 'zod';
import { USER_ROLES, USER_STATUS } from '../constants/index.js';

const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

/**
 * Validation schema for creating / storing user data
 * Matches schema:
 * - full_name: VARCHAR(150)
 * - mobile: VARCHAR(15)
 * - email: VARCHAR(150)
 * - password / password_hash: TEXT
 * - role: VARCHAR(30) (ADMIN / CITIZEN / SEVAK)
 * - status: VARCHAR(30) (ACTIVE / INACTIVE / BLOCKED)
 */
export const createUserSchema = z.object({
  full_name: z
    .string({
      required_error: 'Full name is required',
      invalid_type_error: 'Full name must be a string',
    })
    .trim()
    .min(2, { message: 'Full name must be at least 2 characters' })
    .max(150, { message: 'Full name cannot exceed 150 characters' }),

  mobile: z.preprocess(
    (val) => (val !== undefined && val !== null ? String(val).trim() : val),
    z
      .string({
        required_error: 'Mobile number is required',
        invalid_type_error: 'Mobile number must be a string or number',
      })
      .min(1, { message: 'Mobile number is required' })
      .max(15, { message: 'Mobile number cannot exceed 15 characters' })
      .regex(INDIAN_MOBILE_REGEX, {
        message: 'Please provide a valid 10-digit Indian mobile number',
      })
  ),

  email: z
    .string()
    .trim()
    .email({ message: 'Please provide a valid email address' })
    .max(150, { message: 'Email cannot exceed 150 characters' })
    .optional()
    .nullable(),

  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters' })
    .optional()
    .nullable(),

  role: z
    .nativeEnum(USER_ROLES, {
      errorMap: () => ({ message: 'Role must be either ADMIN, CITIZEN, or SEVAK' }),
    })
    .optional()
    .default(USER_ROLES.CITIZEN),

  status: z
    .nativeEnum(USER_STATUS, {
      errorMap: () => ({ message: 'Status must be either ACTIVE, INACTIVE, or BLOCKED' }),
    })
    .optional()
    .default(USER_STATUS.ACTIVE),
});

/**
 * Validates request payload against createUserSchema
 * @param {Object} data - Request body
 * @returns {{ success: boolean, data?: Object, error?: string }}
 */
export const validateCreateUser = (data) => {
  const result = createUserSchema.safeParse(data || {});

  if (!result.success) {
    const firstErrorMessage = result.error.errors[0]?.message || 'Validation failed';
    return {
      success: false,
      error: firstErrorMessage,
      errors: result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    };
  }

  return {
    success: true,
    data: result.data,
  };
};
