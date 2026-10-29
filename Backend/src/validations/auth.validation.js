import { z } from 'zod';

// Indian mobile numbers must be 10 digits and start with 6, 7, 8, or 9
const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

/**
 * Authentication Validation Schemas
 */
export const loginSchema = z.object({
  body: z.object({
    identifier: z.string().optional(),
    mobileNumber: z.string().optional(),
    mobile: z.string().optional(),
    email: z.string().optional(),
    password: z.string().min(1, 'Password is required'),
  }).refine(
    (data) => Boolean(data.identifier || data.mobileNumber || data.mobile || data.email),
    {
      message: 'Mobile number or email is required',
      path: ['mobileNumber'],
    }
  ),
});
const preprocessMobile = (data) => {
  if (data && typeof data === 'object') {
    const copy = { ...data };
    if (!copy.mobileNumber && copy.mobile) copy.mobileNumber = copy.mobile;
    if (!copy.mobileNumber && copy.phone) copy.mobileNumber = copy.phone;
    return copy;
  }
  return data;
};

export const sendOtpSchema = z.object({
  body: z.preprocess(
    preprocessMobile,
    z.object({
      mobileNumber: z
        .string({ required_error: 'Mobile number is required' })
        .transform((val) => val.replace(/\D/g, ''))
        .refine((val) => INDIAN_MOBILE_REGEX.test(val), {
          message: 'Please provide a valid 10-digit Indian mobile number',
        }),
    })
  ),
});

export const verifyOtpSchema = z.object({
  body: z.preprocess(
    preprocessMobile,
    z.object({
      mobileNumber: z
        .string({ required_error: 'Mobile number is required' })
        .transform((val) => val.replace(/\D/g, ''))
        .refine((val) => INDIAN_MOBILE_REGEX.test(val), {
          message: 'Please provide a valid 10-digit Indian mobile number',
        }),
      otp: z
        .string({ required_error: 'OTP is required' })
        .trim()
        .min(4, 'OTP must be 4 digits')
        .max(4, 'OTP must be 4 digits'),
    })
  ),
});

export const registerPasswordSchema = z.object({
  body: z.preprocess(
    preprocessMobile,
    z.object({
      mobileNumber: z
        .string({ required_error: 'Mobile number is required' })
        .transform((val) => val.replace(/\D/g, ''))
        .refine((val) => INDIAN_MOBILE_REGEX.test(val), {
          message: 'Please provide a valid 10-digit Indian mobile number',
        }),
      password: z
        .string({ required_error: 'Password is required' })
        .min(6, 'Password must be at least 6 characters long'),
      full_name: z.string().trim().min(2, 'Name must be at least 2 characters').optional(),
    })
  ),
});

export const initiateAuthSchema = z.object({
  body: z.preprocess(
    preprocessMobile,
    z.object({
      mobileNumber: z
        .string({ required_error: 'Mobile number is required' })
        .transform((val) => val.replace(/\D/g, ''))
        .refine((val) => INDIAN_MOBILE_REGEX.test(val), {
          message: 'Please provide a valid 10-digit Indian mobile number',
        }),
    })
  ),
});

export const setPasswordSchema = z.object({
  body: z.preprocess(
    preprocessMobile,
    z.object({
      mobileNumber: z
        .string({ required_error: 'Mobile number is required' })
        .transform((val) => val.replace(/\D/g, ''))
        .refine((val) => INDIAN_MOBILE_REGEX.test(val), {
          message: 'Please provide a valid 10-digit Indian mobile number',
        }),
      password: z
        .string({ required_error: 'Password is required' })
        .min(6, 'Password must be at least 6 characters long'),
    })
  ),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string({ required_error: 'Refresh token is required' }).min(1, 'Refresh token is required'),
  }),
});

export const logoutSchema = z.object({
  body: z.object({
    refreshToken: z.string().optional(),
  }).optional(),
});

export const changePasswordSchema = z.object({
  body: z.preprocess(
    (data) => {
      if (data && typeof data === 'object') {
        const copy = { ...data };
        if (!copy.currentPassword && copy.current_password) copy.currentPassword = copy.current_password;
        if (!copy.newPassword && copy.new_password) copy.newPassword = copy.new_password;
        if (!copy.confirmPassword && copy.confirm_password) copy.confirmPassword = copy.confirm_password;
        return copy;
      }
      return data;
    },
    z.object({
      currentPassword: z
        .string({ required_error: 'Current password is required' })
        .min(1, 'Current password is required'),
      newPassword: z
        .string({ required_error: 'New password is required' })
        .min(6, 'New password must be at least 6 characters long'),
      confirmPassword: z.string().optional(),
    })
  ),
});



