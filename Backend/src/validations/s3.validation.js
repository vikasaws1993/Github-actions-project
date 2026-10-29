import { z } from 'zod';
import crypto from 'crypto';

/**
 * Whitelist of allowed MIME types and their canonical extensions
 */
export const ALLOWED_MIME_TYPES = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
  'application/pdf': ['pdf'],
  'application/msword': ['doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  'text/csv': ['csv'],
};

export const ALLOWED_CATEGORIES = [
  'identity',
  'income_proof',
  'ration_card',
  'aadhaar',
  'clinical_records',
  'medical_documents',
  'diagnostic_reports',
  'discharge_summaries',
  'opd_prescriptions',
  'prescriptions',
  'facility_surveys',
  'mla_leadership_photo',
  'scheme_documents',
  'patient_profile',
  'other',
];

export const ALLOWED_MODULES = [
  'applications',
  'profiles',
  'leadership',
  'hospitals',
  'schemes',
  'opd',
  'general',
];

/**
 * Validation schema for requesting an S3 presigned upload URL
 */
export const presignUploadSchema = z.object({
  fileName: z
    .string({ required_error: 'fileName is required' })
    .trim()
    .min(1, { message: 'fileName cannot be empty' })
    .max(255, { message: 'fileName is too long' })
    .refine((val) => !val.includes('..') && !val.includes('/') && !val.includes('\\'), {
      message: 'Invalid file name. Path traversal characters are forbidden.',
    }),
  fileType: z
    .string({ required_error: 'fileType (MIME type) is required' })
    .trim()
    .refine((type) => Object.keys(ALLOWED_MIME_TYPES).includes(type.toLowerCase()), {
      message: 'Unsupported file MIME type. Allowed types: PDF, JPG, PNG, WEBP, DOC, DOCX, CSV.',
    }),
  fileSize: z
    .number()
    .int()
    .positive()
    .max(25 * 1024 * 1024, { message: 'Maximum allowed file size is 25MB' })
    .optional(),
  module: z
    .enum(ALLOWED_MODULES)
    .default('applications'),
  category: z
    .string()
    .trim()
    .toLowerCase()
    .default('other')
    .refine((cat) => ALLOWED_CATEGORIES.includes(cat) || /^[a-z0-9_-]+$/.test(cat), {
      message: 'Invalid category format',
    }),
  applicationId: z
    .string()
    .trim()
    .optional(),
  applicationNumber: z
    .string()
    .trim()
    .optional(),
  hospitalId: z
    .string()
    .trim()
    .optional(),
});

/**
 * Validation schema for confirming an upload and attaching to database
 */
export const confirmUploadSchema = z.object({
  key: z
    .string({ required_error: 'S3 object key is required' })
    .trim()
    .min(1)
    .startsWith('arogyamitra/', { message: 'Invalid S3 key namespace' })
    .refine((val) => !val.includes('..'), { message: 'Path traversal is forbidden in S3 key' }),
  fileName: z
    .string()
    .trim()
    .optional(),
  fileType: z
    .string()
    .trim()
    .optional(),
  fileSize: z
    .union([z.string(), z.number()])
    .optional(),
  docTitle: z
    .string()
    .trim()
    .optional(),
  category: z
    .string()
    .trim()
    .optional(),
  applicationId: z
    .string()
    .trim()
    .optional(),
  reqDocId: z
    .string()
    .trim()
    .optional(),
  note: z
    .string()
    .trim()
    .optional(),
});

/**
 * Validation schema for deleting an S3 asset
 */
export const deleteS3Schema = z.object({
  key: z
    .string({ required_error: 'S3 object key is required' })
    .trim()
    .min(1)
    .startsWith('arogyamitra/', { message: 'Invalid S3 key namespace' })
    .refine((val) => !val.includes('..'), { message: 'Invalid S3 key format' }),
});

/**
 * 100% Backend-Controlled S3 Key Generator
 * Guarantees clients cannot dictate arbitrary S3 paths or overwrite existing assets.
 */
export const generateSystematicS3Key = ({
  module = 'applications',
  category = 'other',
  fileName = 'file.pdf',
  fileType = 'application/pdf',
  applicationId = null,
  applicationNumber = null,
  userId = null,
  userRole = 'citizen',
  hospitalId = null,
}) => {
  // Sanitize filename and extract clean extension
  const cleanCategory = (category || 'other').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const rawBaseName = (fileName || 'file')
    .replace(/\.[^/.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .slice(0, 30);

  // Validate and resolve file extension
  const extMatch = (fileName || '').match(/\.([0-9a-z]+)$/i);
  let resolvedExt = extMatch ? extMatch[1].toLowerCase() : '';
  if (!resolvedExt && ALLOWED_MIME_TYPES[fileType]) {
    resolvedExt = ALLOWED_MIME_TYPES[fileType][0];
  }
  if (!resolvedExt) resolvedExt = 'bin';

  const timestamp = Date.now();
  const randomHex = crypto.randomBytes(4).toString('hex');
  const uniqueFileSlug = `${rawBaseName}_${timestamp}_${randomHex}.${resolvedExt}`;
  const currentYear = new Date().getFullYear().toString();

  // 1. Application-bound uploads
  if (module === 'applications') {
    const scopeIdentifier = (applicationNumber || applicationId || (userId ? `user_${userId}` : 'draft')).toUpperCase();
    return `arogyamitra/applications/${currentYear}/${scopeIdentifier}/${cleanCategory}/${uniqueFileSlug}`;
  }

  // 2. Leadership profile photos (e.g. MLA)
  if (module === 'leadership') {
    return `arogyamitra/leadership/mla/mla_profile_${timestamp}_${randomHex}.${resolvedExt}`;
  }

  // 3. OPD visit documents & prescriptions
  if (module === 'opd') {
    const hosp = (hospitalId || 'general').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    return `arogyamitra/opd/${hosp}/${currentYear}/${cleanCategory}/${uniqueFileSlug}`;
  }

  // 4. Hospital facility survey photos
  if (module === 'hospitals') {
    const hosp = (hospitalId || 'facility').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    return `arogyamitra/hospitals/${hosp}/${cleanCategory}/${uniqueFileSlug}`;
  }

  // 5. User Profiles
  if (module === 'profiles') {
    const roleSlug = (userRole || 'citizen').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const uId = (userId || 'anon').replace(/[^a-z0-9_-]/g, '_');
    return `arogyamitra/profiles/${roleSlug}/${uId}_${timestamp}_${randomHex}.${resolvedExt}`;
  }

  // 6. Schemes
  if (module === 'schemes') {
    return `arogyamitra/schemes/${cleanCategory}/${uniqueFileSlug}`;
  }

  return `arogyamitra/general/${cleanCategory}/${uniqueFileSlug}`;
};
