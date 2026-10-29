import { z } from 'zod';

export const updatePhotoSchema = z.object({
  photoUrl: z
    .string({ required_error: 'Photo URL is required' })
    .min(1, 'Photo URL cannot be empty')
    .refine(
      (val) => val.startsWith('http://') || val.startsWith('https://') || val.startsWith('/') || val.startsWith('data:image/'),
      { message: 'Invalid photo URL format' }
    ),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  nameMr: z.string().min(1).max(255).optional(),
  nameHi: z.string().min(1).max(255).optional(),
  designation: z.string().min(1).max(255).optional(),
  constituency: z.string().min(1).max(255).optional(),
  partyTitle: z.string().max(255).optional(),
  partyTitleMr: z.string().max(255).optional(),
  partyTitleHi: z.string().max(255).optional(),
  tagline: z.string().max(255).optional(),
  taglineMr: z.string().max(255).optional(),
  taglineHi: z.string().max(255).optional(),
  initiativeTitle: z.string().max(255).optional(),
  initiativeTitleMr: z.string().max(255).optional(),
  initiativeTitleHi: z.string().max(255).optional(),
  patronTitle: z.string().max(255).optional(),
  assemblyTerms: z.string().max(255).optional(),
  publicPortfolio: z.string().max(255).optional(),
  visionQuote: z.string().max(2000).optional(),
  officeAddress: z.string().max(500).optional(),
  officeContact: z.string().max(255).optional(),
  photoUrl: z.string().optional(),
});

export const validateUpdatePhoto = (data) => {
  const result = updatePhotoSchema.safeParse(data);
  if (!result.success) {
    return {
      success: false,
      error: result.error.errors[0]?.message || 'Validation failed',
      errors: result.error.errors,
    };
  }
  return { success: true, data: result.data };
};

export const validateUpdateProfile = (data) => {
  const result = updateProfileSchema.safeParse(data);
  if (!result.success) {
    return {
      success: false,
      error: result.error.errors[0]?.message || 'Validation failed',
      errors: result.error.errors,
    };
  }
  return { success: true, data: result.data };
};
