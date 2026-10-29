import { z } from 'zod';
import { SEVAK_STATUS } from '../constants/index.js';
import { toStandardDigits } from '../utils/language.util.js';

/**
 * Validation schema for Arogya Sevak Mobile OTP Request
 */
export const sevakSendOtpSchema = z.object({
  mobileNumber: z
    .string({ required_error: 'Mobile number is required / मोबाईल नंबर आवश्यक आहे' })
    .transform((val) => toStandardDigits(val).replace(/\D/g, ''))
    .refine((val) => /^[6-9]\d{9}$/.test(val), {
      message: 'Please provide a valid 10-digit Indian mobile number / कृपया वैध १० अंकी मोबाईल नंबर टाका',
    }),
});

/**
 * Validation schema for Arogya Sevak Mobile OTP Verification
 */
export const sevakVerifyOtpSchema = z.object({
  mobileNumber: z
    .string({ required_error: 'Mobile number is required / मोबाईल नंबर आवश्यक आहे' })
    .transform((val) => toStandardDigits(val).replace(/\D/g, ''))
    .refine((val) => /^[6-9]\d{9}$/.test(val), {
      message: 'Please provide a valid 10-digit Indian mobile number / कृपया वैध १० अंकी मोबाईल नंबर टाका',
    }),
  otp: z
    .string({ required_error: '6-digit OTP is required / ६ अंकी OTP आवश्यक आहे' })
    .transform((val) => toStandardDigits(val).trim())
    .refine((val) => /^\d{6}$/.test(val), {
      message: 'OTP must be exactly 6 digits / OTP ६ अंकी असावा',
    }),
});

export const createArogyaSevakSchema = z.object({
  user_id: z
    .string({
      required_error: 'user_id is required',
    })
    .uuid({ message: 'user_id must be a valid UUID' }),

  employee_code: z
    .string({
      required_error: 'employee_code is required',
    })
    .trim()
    .min(2, { message: 'employee_code must be at least 2 characters' })
    .max(50, { message: 'employee_code cannot exceed 50 characters' }),

  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, { message: 'Phone must be a valid 10-digit Indian mobile number' })
    .optional()
    .nullable(),

  joining_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'joining_date must be in YYYY-MM-DD format' })
    .optional()
    .nullable(),

  status: z
    .nativeEnum(SEVAK_STATUS, {
      errorMap: () => ({ message: 'Status must be either ACTIVE or INACTIVE' }),
    })
    .optional()
    .default(SEVAK_STATUS.ACTIVE),
});

export const updateArogyaSevakSchema = createArogyaSevakSchema.omit({ user_id: true }).partial();

export const validateCreateArogyaSevak = (data) => {
  const result = createArogyaSevakSchema.safeParse(data || {});
  if (!result.success) {
    return {
      success: false,
      error: result.error.errors[0]?.message || 'Validation failed',
      errors: result.error.errors,
    };
  }
  return { success: true, data: result.data };
};

export {
  adminUpdateArogyaSevakSchema as editArogyaSevakSchema,
  validateAdminUpdateArogyaSevak as validateUpdateArogyaSevak,
} from './admin.validation.js';

