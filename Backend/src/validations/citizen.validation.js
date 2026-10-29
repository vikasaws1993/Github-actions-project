import { z } from 'zod';
import {
  toStandardDigits,
  normalizeGender,
  parseBirthDate,
} from '../utils/language.util.js';

// Unicode Regex that supports English, Marathi/Devanagari letters, matras, spaces, dots, and hyphens
const BILINGUAL_NAME_REGEX = /^[\p{L}\p{M}\s.'-]+$/u;

/**
 * Validation schema for Sending Citizen 6-digit OTP
 */
export const citizenSendOtpSchema = z.object({
  mobileNumber: z
    .string({ required_error: 'Mobile number is required / मोबाईल नंबर आवश्यक आहे' })
    .transform((val) => toStandardDigits(val).replace(/\D/g, ''))
    .refine((val) => /^\d{10}$/.test(val), {
      message: 'Please provide a valid 10-digit mobile number / कृपया वैध १० अंकी मोबाईल नंबर टाका',
    }),
});

/**
 * Validation schema for Verifying Citizen 6-digit OTP
 */
export const citizenVerifyOtpSchema = z.object({
  mobileNumber: z
    .string({ required_error: 'Mobile number is required / मोबाईल नंबर आवश्यक आहे' })
    .transform((val) => toStandardDigits(val).replace(/\D/g, ''))
    .refine((val) => /^\d{10}$/.test(val), {
      message: 'Please provide a valid 10-digit mobile number / कृपया वैध १० अंकी मोबाईल नंबर टाका',
    }),
  otp: z
    .string({ required_error: '6-digit OTP is required / ६ अंकी OTP आवश्यक आहे' })
    .transform((val) => toStandardDigits(val).trim())
    .refine((val) => /^\d{6}$/.test(val), {
      message: 'OTP must be exactly 6 digits / OTP ६ अंकी असावा',
    }),
});

/**
 * Validation schema for Citizen Registration matching the Marathi/English UI form.
 */
export const citizenRegistrationSchema = z.object({
  // user_id is optional in body when Authorization Bearer token is provided
  user_id: z
    .string()
    .uuid({ message: 'user_id must be a valid UUID' })
    .optional()
    .nullable(),

  // Optional mobile number if registering user simultaneously
  mobileNumber: z
    .string()
    .transform((val) => toStandardDigits(val).replace(/\D/g, ''))
    .refine((val) => !val || /^\d{10}$/.test(val), {
      message: 'Please provide a valid 10-digit mobile number / कृपया वैध १० अंकी मोबाईल नंबर टाका',
    })
    .optional()
    .nullable(),

  // पूर्ण नाव (Full Name) - Required
  full_name: z
    .string({
      required_error: 'Full name is required / पूर्ण नाव आवश्यक आहे',
    })
    .trim()
    .min(2, { message: 'Full name must be at least 2 characters / नाव किमान २ अक्षरांचे असावे' })
    .max(150, { message: 'Full name cannot exceed 150 characters / नाव १५० अक्षरांपेक्षा जास्त असू नये' })
    .refine((val) => BILINGUAL_NAME_REGEX.test(val), {
      message: 'Full name should only contain Marathi or English characters / नावात फक्त मराठी किंवा इंग्रजी अक्षरे असावीत',
    }),

  // जन्म तारीख (Date of Birth) - Required (Supports DD/MM/YYYY in English or Marathi digits)
  dob: z
    .string({
      required_error: 'Date of birth is required / जन्म तारीख आवश्यक आहे',
    })
    .trim()
    .refine((val) => Boolean(parseBirthDate(val)), {
      message: 'Please provide a valid Date of Birth in DD/MM/YYYY format / कृपया DD/MM/YYYY स्वरूपात वैध जन्म तारीख टाका',
    }),

  // लिंग (Gender) - Required (Supports 'पुरुष', 'स्त्री', 'इतर', 'MALE', 'FEMALE', 'OTHER')
  gender: z
    .string({
      required_error: 'Gender is required / लिंग निवडणे आवश्यक आहे',
    })
    .trim()
    .refine((val) => Boolean(normalizeGender(val)), {
      message: "Gender must be पुरुष (Male), स्त्री (Female), or इतर (Other) / लिंग पुरुष, स्त्री किंवा इतर असणे आवश्यक आहे",
    }),

  // पूर्ण पत्ता (Full Address) - Required
  address: z
    .string({
      required_error: 'Full address is required / पूर्ण पत्ता आवश्यक आहे',
    })
    .trim()
    .min(3, { message: 'Address must be at least 3 characters / पत्ता किमान ३ अक्षरांचा असावा' })
    .max(500, { message: 'Address cannot exceed 500 characters / पत्ता ५०० अक्षरांपेक्षा मोठा असू नये' }),

  // राज्य (State) - Optional / default 'Maharashtra'
  state: z
    .string()
    .trim()
    .default('Maharashtra'),

  // जिल्हा (District) - Required
  district: z
    .string({
      required_error: 'District is required / जिल्हा आवश्यक आहे',
    })
    .trim()
    .min(2, { message: 'District name must be at least 2 characters / जिल्ह्याचे नाव किमान २ अक्षरांचे असावे' })
    .max(100, { message: 'District name cannot exceed 100 characters' }),

  district_id: z.string().uuid().optional().nullable(),

  // तालुका (Taluka) - Required
  taluka: z
    .string({
      required_error: 'Taluka is required / तालुका आवश्यक आहे',
    })
    .trim()
    .min(2, { message: 'Taluka name must be at least 2 characters / तालुक्याचे नाव किमान २ अक्षरांचे असावे' })
    .max(100, { message: 'Taluka name cannot exceed 100 characters' }),

  taluka_id: z.string().uuid().optional().nullable(),

  // पिनकोड (Pincode) - Required (6 digits, Marathi or English numerals)
  pincode: z
    .string({
      required_error: 'Pincode is required / पिनकोड आवश्यक आहे',
    })
    .trim()
    .transform((val) => toStandardDigits(val))
    .refine((val) => /^\d{6}$/.test(val), {
      message: 'Pincode must be a 6-digit Indian PIN code / पिनकोड ६ अंकी असावा (उदा. 421301)',
    }),

  // ईमेल (ऐच्छिक) (Email - Optional)
  email: z
    .string()
    .trim()
    .email({ message: 'Please enter a valid email address / कृपया वैध ईमेल टाका' })
    .max(150, { message: 'Email cannot exceed 150 characters' })
    .optional()
    .nullable()
    .or(z.literal('')),

  // रेफरल कोड (ऐच्छिक) (Referral Code - Optional, e.g. AM-XXXXXX)
  referral_code: z
    .string()
    .trim()
    .max(50, { message: 'Referral code cannot exceed 50 characters' })
    .optional()
    .nullable()
    .or(z.literal('')),

  referralCode: z
    .string()
    .trim()
    .max(50, { message: 'Referral code cannot exceed 50 characters' })
    .optional()
    .nullable()
    .or(z.literal('')),
});

/**
 * Validates request payload against citizenRegistrationSchema
 * @param {Object} data - Request body
 */
export const validateCitizenRegistration = (data) => {
  const result = citizenRegistrationSchema.safeParse(data || {});
  if (!result.success) {
    return {
      success: false,
      error: result.error.errors[0]?.message || 'Validation failed',
      errors: result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    };
  }
  return { success: true, data: result.data };
};
