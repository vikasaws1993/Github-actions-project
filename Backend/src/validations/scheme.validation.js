import { z } from 'zod';

/**
 * Zod validation schema for Add / Create Healthcare Scheme
 * Preprocesses camelCase fields from UI form and normalizes them.
 */
export const createSchemeSchema = z.preprocess(
  (data) => {
    if (data && typeof data === 'object') {
      const copy = { ...data };

      // Aliases & fallbacks
      if (!copy.code && copy.scheme_code) copy.code = copy.scheme_code;
      if (!copy.scheme_code && copy.code) copy.scheme_code = copy.code;
      if (copy.code) copy.code = String(copy.code).trim().toUpperCase();
      if (copy.scheme_code) copy.scheme_code = String(copy.scheme_code).trim().toUpperCase();

      if (!copy.coverageAmount && copy.coverage_amount_text) copy.coverageAmount = copy.coverage_amount_text;
      if (!copy.coverage_amount_text && copy.coverageAmount) copy.coverage_amount_text = copy.coverageAmount;

      if (!copy.maxCoverageVal && copy.maximum_coverage_amount) copy.maxCoverageVal = copy.maximum_coverage_amount;
      if (!copy.maximum_coverage_amount && copy.maxCoverageVal) copy.maximum_coverage_amount = copy.maxCoverageVal;

      if (copy.maxCoverageVal !== undefined && copy.maxCoverageVal !== null) {
        copy.maxCoverageVal = Number(copy.maxCoverageVal);
      }
      if (copy.maximum_coverage_amount !== undefined && copy.maximum_coverage_amount !== null) {
        copy.maximum_coverage_amount = Number(copy.maximum_coverage_amount);
      }

      if (!copy.eligibility && copy.eligibility_description) copy.eligibility = copy.eligibility_description;
      if (!copy.eligibility_description && copy.eligibility) copy.eligibility_description = copy.eligibility;

      if (!copy.requiredDocuments && copy.required_documents) copy.requiredDocuments = copy.required_documents;
      if (!copy.required_documents && copy.requiredDocuments) copy.required_documents = copy.requiredDocuments;

      if (typeof copy.requiredDocuments === 'string') {
        copy.requiredDocuments = copy.requiredDocuments.split(/[,|;]/).map((s) => s.trim()).filter(Boolean);
      }

      // Status mapping
      if (copy.is_active === undefined && copy.status) {
        copy.is_active = String(copy.status).toLowerCase() === 'active';
      }

      return copy;
    }
    return data;
  },
  z.object({
    code: z
      .string({
        required_error: 'Scheme code / abbreviation is required',
      })
      .trim()
      .min(2, { message: 'Scheme code must be at least 2 characters long' })
      .max(50, { message: 'Scheme code cannot exceed 50 characters' }),

    scheme_code: z
      .string()
      .trim()
      .max(50)
      .optional(),

    name: z
      .string({
        required_error: 'Full official scheme name is required',
      })
      .trim()
      .min(2, { message: 'Scheme name must be at least 2 characters long' })
      .max(255, { message: 'Scheme name cannot exceed 255 characters' }),

    category: z
      .string()
      .trim()
      .max(100, { message: 'Category cannot exceed 100 characters' })
      .optional()
      .default('State Flagship Scheme'),

    coverageAmount: z
      .string()
      .trim()
      .max(150, { message: 'Coverage display text cannot exceed 150 characters' })
      .optional()
      .default('₹1,50,000 / family / year'),

    coverage_amount_text: z
      .string()
      .trim()
      .max(150)
      .optional(),

    maxCoverageVal: z
      .number()
      .nonnegative({ message: 'Coverage value must be a positive number' })
      .optional()
      .default(150000),

    maximum_coverage_amount: z
      .number()
      .nonnegative()
      .optional(),

    description: z
      .string()
      .trim()
      .max(2000, { message: 'Description cannot exceed 2000 characters' })
      .optional()
      .default('Healthcare assistance scheme for eligible beneficiaries.'),

    eligibility: z
      .string()
      .trim()
      .max(1000, { message: 'Eligibility description cannot exceed 1000 characters' })
      .optional()
      .default('Empanelled card holders and eligible Maharashtrian citizens.'),

    eligibility_description: z
      .string()
      .trim()
      .max(1000)
      .optional(),

    hotline: z
      .string()
      .trim()
      .max(50, { message: 'Hotline number cannot exceed 50 characters' })
      .optional()
      .default('1800-111-222'),

    requiredDocuments: z
      .array(z.string())
      .optional()
      .default([
        'Aadhaar Card',
        'Ration Card (Orange / Yellow / Antyodaya)',
        'Doctor Consultation / Referral Note',
      ]),

    required_documents: z
      .array(z.string())
      .optional(),

    status: z
      .string()
      .optional()
      .default('Active'),

    is_active: z
      .boolean()
      .optional()
      .default(true),
  })
);

/**
 * Zod validation schema for updating an existing scheme
 */
export const updateSchemeSchema = z.preprocess(
  (data) => {
    if (data && typeof data === 'object') {
      const copy = { ...data };

      if (copy.code) copy.code = String(copy.code).trim().toUpperCase();
      if (copy.scheme_code) copy.scheme_code = String(copy.scheme_code).trim().toUpperCase();
      if (!copy.code && copy.scheme_code) copy.code = copy.scheme_code;
      if (!copy.scheme_code && copy.code) copy.scheme_code = copy.code;

      if (!copy.coverageAmount && copy.coverage_amount_text) copy.coverageAmount = copy.coverage_amount_text;
      if (!copy.coverage_amount_text && copy.coverageAmount) copy.coverage_amount_text = copy.coverageAmount;

      if (!copy.maxCoverageVal && copy.maximum_coverage_amount !== undefined) copy.maxCoverageVal = copy.maximum_coverage_amount;
      if (!copy.maximum_coverage_amount && copy.maxCoverageVal !== undefined) copy.maximum_coverage_amount = copy.maxCoverageVal;

      if (copy.maxCoverageVal !== undefined && copy.maxCoverageVal !== null) {
        copy.maxCoverageVal = Number(copy.maxCoverageVal);
      }
      if (copy.maximum_coverage_amount !== undefined && copy.maximum_coverage_amount !== null) {
        copy.maximum_coverage_amount = Number(copy.maximum_coverage_amount);
      }

      if (!copy.eligibility && copy.eligibility_description) copy.eligibility = copy.eligibility_description;
      if (!copy.eligibility_description && copy.eligibility) copy.eligibility_description = copy.eligibility;

      if (!copy.requiredDocuments && copy.required_documents) copy.requiredDocuments = copy.required_documents;
      if (!copy.required_documents && copy.requiredDocuments) copy.required_documents = copy.requiredDocuments;

      if (typeof copy.requiredDocuments === 'string') {
        copy.requiredDocuments = copy.requiredDocuments.split(/[,|;]/).map((s) => s.trim()).filter(Boolean);
      }

      if (copy.is_active === undefined && copy.status) {
        copy.is_active = String(copy.status).toLowerCase() === 'active';
      }

      return copy;
    }
    return data;
  },
  z.object({
    code: z.string().trim().min(2).max(50).optional(),
    scheme_code: z.string().trim().max(50).optional(),
    name: z.string().trim().min(2).max(255).optional(),
    category: z.string().trim().max(100).optional(),
    coverageAmount: z.string().trim().max(150).optional(),
    coverage_amount_text: z.string().trim().max(150).optional(),
    maxCoverageVal: z.number().nonnegative().optional(),
    maximum_coverage_amount: z.number().nonnegative().optional(),
    description: z.string().trim().max(2000).optional(),
    eligibility: z.string().trim().max(1000).optional(),
    eligibility_description: z.string().trim().max(1000).optional(),
    hotline: z.string().trim().max(50).optional(),
    requiredDocuments: z.array(z.string()).optional(),
    required_documents: z.array(z.string()).optional(),
    status: z.string().optional(),
    is_active: z.boolean().optional(),
  })
);

/**
 * Validation schema for empanelling hospital(s) to a scheme
 */
export const empanelHospitalSchema = z.preprocess(
  (data) => {
    if (data && typeof data === 'object') {
      const copy = { ...data };
      if (!copy.hospital_ids && copy.hospital_id) {
        copy.hospital_ids = [copy.hospital_id];
      }
      return copy;
    }
    return data;
  },
  z.object({
    hospital_id: z.string().optional(),
    hospital_ids: z
      .array(z.string({ required_error: 'Hospital ID must be a string UUID' }))
      .min(1, { message: 'At least one hospital ID must be provided' }),
    alignment_status: z
      .enum(['EMPANELLED', 'SUSPENDED', 'DE_EMPANELLED'])
      .optional()
      .default('EMPANELLED'),
    alignment_start_date: z.string().optional(),
    alignment_end_date: z.string().nullable().optional(),
  })
);

export const validateCreateScheme = (data) => {
  const result = createSchemeSchema.safeParse(data || {});
  if (!result.success) {
    return {
      success: false,
      error: result.error.errors[0]?.message || 'Validation failed',
      errors: result.error.errors,
    };
  }
  return { success: true, data: result.data };
};

export const validateUpdateScheme = (data) => {
  const result = updateSchemeSchema.safeParse(data || {});
  if (!result.success) {
    return {
      success: false,
      error: result.error.errors[0]?.message || 'Validation failed',
      errors: result.error.errors,
    };
  }
  return { success: true, data: result.data };
};

export const validateEmpanelHospital = (data) => {
  const result = empanelHospitalSchema.safeParse(data || {});
  if (!result.success) {
    return {
      success: false,
      error: result.error.errors[0]?.message || 'Validation failed',
      errors: result.error.errors,
    };
  }
  return { success: true, data: result.data };
};

export default {
  createSchemeSchema,
  updateSchemeSchema,
  empanelHospitalSchema,
  validateCreateScheme,
  validateUpdateScheme,
  validateEmpanelHospital,
};
