import { z } from 'zod';

const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

/**
 * Validation schema for Admin creating a brand new Admin (User + Admin Profile)
 */
export const adminCreateNewAdminSchema = z.preprocess(
  (data) => {
    if (data && typeof data === 'object') {
      const copy = { ...data };
      if (!copy.full_name && copy.name) copy.full_name = copy.name;
      if (!copy.full_name && copy.fullname) copy.full_name = copy.fullname;
      if (!copy.address && copy.street_address) copy.address = copy.street_address;
      if (!copy.address && copy.streetAddress) copy.address = copy.streetAddress;
      if (!copy.address && copy.full_street_address) copy.address = copy.full_street_address;
      if (!copy.landmark && copy.nearest_landmark) copy.landmark = copy.nearest_landmark;
      if (!copy.landmark && copy.nearestLandmark) copy.landmark = copy.nearestLandmark;
      if (copy.email === '' || (typeof copy.email === 'string' && !copy.email.trim())) copy.email = undefined;
      return copy;
    }
    return data;
  },
  z.object({
    full_name: z
      .string({
        required_error: 'Full name is required',
      })
      .trim()
      .min(2, { message: 'Full name must be at least 2 characters long' })
      .max(150, { message: 'Full name cannot exceed 150 characters' }),

    email: z
      .string({
        required_error: 'Email address is required',
      })
      .trim()
      .email({ message: 'Please provide a valid email address' })
      .max(150, { message: 'Email cannot exceed 150 characters' }),

    mobile: z
      .string({
        required_error: 'Mobile number is required',
      })
      .trim()
      .regex(INDIAN_MOBILE_REGEX, {
        message: 'Please provide a valid 10-digit Indian mobile number',
      }),

    address: z
      .string()
      .trim()
      .max(300, { message: 'Full street address cannot exceed 300 characters' })
      .optional()
      .nullable(),

    city: z
      .string()
      .trim()
      .max(100, { message: 'City cannot exceed 100 characters' })
      .optional()
      .nullable(),

    taluka: z
      .string()
      .trim()
      .max(100, { message: 'Taluka cannot exceed 100 characters' })
      .optional()
      .nullable(),

    district: z
      .string()
      .trim()
      .max(100, { message: 'District cannot exceed 100 characters' })
      .optional()
      .nullable(),

    landmark: z
      .string()
      .trim()
      .max(150, { message: 'Nearest landmark cannot exceed 150 characters' })
      .optional()
      .nullable(),

    password: z
      .string()
      .min(6, { message: 'Password must be at least 6 characters long' })
      .optional()
      .nullable(),

    department: z
      .string()
      .trim()
      .max(100, { message: 'department cannot exceed 100 characters' })
      .optional()
      .default('HEALTH_ADMINISTRATION'),

    designation: z
      .string()
      .trim()
      .max(100, { message: 'designation cannot exceed 100 characters' })
      .optional()
      .default('ADMINISTRATOR'),
  })
);

/**
 * Validation schema for First-Time / Bootstrap Admin Creation (Unauthenticated setup)
 */
export const adminBootstrapSchema = z.preprocess(
  (data) => {
    if (data && typeof data === 'object') {
      const copy = { ...data };
      if (!copy.full_name && copy.name) copy.full_name = copy.name;
      if (!copy.full_name && copy.fullname) copy.full_name = copy.fullname;
      if (!copy.address && copy.street_address) copy.address = copy.street_address;
      if (!copy.address && copy.streetAddress) copy.address = copy.streetAddress;
      if (!copy.address && copy.full_street_address) copy.address = copy.full_street_address;
      if (!copy.landmark && copy.nearest_landmark) copy.landmark = copy.nearest_landmark;
      if (!copy.landmark && copy.nearestLandmark) copy.landmark = copy.nearestLandmark;
      if (copy.email === '' || (typeof copy.email === 'string' && !copy.email.trim())) copy.email = undefined;
      return copy;
    }
    return data;
  },
  z.object({
    full_name: z
      .string({
        required_error: 'Full name is required',
      })
      .trim()
      .min(2, { message: 'Full name must be at least 2 characters long' })
      .max(150, { message: 'Full name cannot exceed 150 characters' }),

    email: z
      .string()
      .trim()
      .email({ message: 'Please provide a valid email address' })
      .max(150, { message: 'Email cannot exceed 150 characters' })
      .optional()
      .nullable(),

    mobile: z
      .string({
        required_error: 'Mobile number is required',
      })
      .trim()
      .regex(INDIAN_MOBILE_REGEX, {
        message: 'Please provide a valid 10-digit Indian mobile number',
      }),

    password: z
      .string({
        required_error: 'Password is required',
      })
      .min(6, { message: 'Password must be at least 6 characters long' }),

    address: z
      .string()
      .trim()
      .max(300, { message: 'Full street address cannot exceed 300 characters' })
      .optional()
      .nullable(),

    city: z
      .string()
      .trim()
      .max(100, { message: 'City cannot exceed 100 characters' })
      .optional()
      .nullable(),

    taluka: z
      .string()
      .trim()
      .max(100, { message: 'Taluka cannot exceed 100 characters' })
      .optional()
      .nullable(),

    district: z
      .string()
      .trim()
      .max(100, { message: 'District cannot exceed 100 characters' })
      .optional()
      .nullable(),

    landmark: z
      .string()
      .trim()
      .max(150, { message: 'Nearest landmark cannot exceed 150 characters' })
      .optional()
      .nullable(),

    department: z
      .string()
      .trim()
      .max(100, { message: 'department cannot exceed 100 characters' })
      .optional()
      .default('HEALTH_ADMINISTRATION'),

    designation: z
      .string()
      .trim()
      .max(100, { message: 'designation cannot exceed 100 characters' })
      .optional()
      .default('SUPER_ADMIN'),
  })
);

/**
 * Validation schema for linking Admin profile to existing User ID
 */
export const createAdminSchema = z.object({
  user_id: z
    .string({
      required_error: 'user_id is required',
    })
    .uuid({ message: 'user_id must be a valid UUID' }),

  department: z
    .string()
    .trim()
    .max(100, { message: 'department cannot exceed 100 characters' })
    .optional()
    .default('HEALTH_ADMINISTRATION'),

  designation: z
    .string()
    .trim()
    .max(100, { message: 'designation cannot exceed 100 characters' })
    .optional()
    .default('ADMINISTRATOR'),
});

export const updateAdminSchema = createAdminSchema.omit({ user_id: true }).partial();

/**
 * Validation schema for Admin creating an Arogya Sevak
 * Supports both singular hospital_id and multiple hospital_ids
 */
export const adminAddArogyaSevakSchema = z.preprocess(
  (data) => {
    if (data && typeof data === 'object') {
      const copy = { ...data };
      if (!copy.full_name && copy.name) copy.full_name = copy.name;
      if (!copy.address && copy.street_address) copy.address = copy.street_address;
      if (!copy.landmark && copy.nearest_landmark) copy.landmark = copy.nearest_landmark;
      if (copy.email === '' || (typeof copy.email === 'string' && !copy.email.trim())) copy.email = undefined;
      return copy;
    }
    return data;
  },
  z.object({
    full_name: z
      .string({
        required_error: 'ArogyaSevak Full Name is required',
      })
      .trim()
      .min(2, { message: 'Full name must be at least 2 characters long' })
      .max(150, { message: 'Full name cannot exceed 150 characters' }),

    mobile: z
      .string({
        required_error: 'Mobile number is required',
      })
      .trim()
      .regex(INDIAN_MOBILE_REGEX, {
        message: 'Please provide a valid 10-digit Indian mobile number',
      }),

    address: z
      .string({
        required_error: 'Full Street Address is required',
      })
      .trim()
      .min(3, { message: 'Full street address must be at least 3 characters long' })
      .max(300, { message: 'Full street address cannot exceed 300 characters' }),

    city: z
      .string({
        required_error: 'City is required',
      })
      .trim()
      .min(2, { message: 'City must be at least 2 characters long' })
      .max(100, { message: 'City cannot exceed 100 characters' }),

    taluka: z
      .string({
        required_error: 'Taluka is required',
      })
      .trim()
      .min(2, { message: 'Taluka must be at least 2 characters long' })
      .max(100, { message: 'Taluka cannot exceed 100 characters' }),

    district: z
      .string({
        required_error: 'District is required',
      })
      .trim()
      .min(2, { message: 'District must be at least 2 characters long' })
      .max(100, { message: 'District cannot exceed 100 characters' }),

    landmark: z
      .string()
      .trim()
      .max(150, { message: 'Nearest landmark cannot exceed 150 characters' })
      .optional()
      .nullable(),

    email: z
      .string()
      .trim()
      .email({ message: 'Please provide a valid email address' })
      .max(150, { message: 'Email cannot exceed 150 characters' })
      .optional()
      .nullable(),

    password: z
      .string()
      .min(6, { message: 'Password must be at least 6 characters long' })
      .optional()
      .nullable(),

    employee_code: z
      .string()
      .trim()
      .min(2, { message: 'Employee code must be at least 2 characters' })
      .max(50, { message: 'Employee code cannot exceed 50 characters' })
      .optional()
      .nullable(),

    phone: z
      .string()
      .trim()
      .regex(INDIAN_MOBILE_REGEX, {
        message: 'Phone must be a valid 10-digit Indian mobile number',
      })
      .optional()
      .nullable(),

    joining_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'joining_date must be in YYYY-MM-DD format' })
      .optional()
      .nullable(),

    status: z
      .enum(['ACTIVE', 'INACTIVE'], {
        errorMap: () => ({ message: 'Status must be either ACTIVE or INACTIVE' }),
      })
      .optional()
      .default('ACTIVE'),

    // Single hospital assignment (optional)
    hospital_id: z
      .string()
      .uuid({ message: 'hospital_id must be a valid UUID' })
      .optional()
      .nullable(),

    // Multiple hospital assignments (optional)
    hospital_ids: z
      .array(z.string().uuid({ message: 'Each hospital_id must be a valid UUID' }))
      .optional()
      .default([]),

    remarks: z
      .string()
      .trim()
      .max(500, { message: 'Remarks cannot exceed 500 characters' })
      .optional()
      .nullable(),
  })
);

/**
 * Validation schema for assigning an existing Sevak to a Single Hospital (legacy)
 */
export const adminAssignHospitalSchema = z.object({
  sevak_id: z
    .string({
      required_error: 'sevak_id is required',
    })
    .uuid({ message: 'sevak_id must be a valid UUID' }),

  hospital_id: z
    .string({
      required_error: 'hospital_id is required',
    })
    .uuid({ message: 'hospital_id must be a valid UUID' }),

  remarks: z
    .string()
    .trim()
    .max(500, { message: 'Remarks cannot exceed 500 characters' })
    .optional()
    .nullable(),
});

/**
 * Validation schema for assigning an Arogya Sevak to Selected Hospitals (Multi-Hospital Selection)
 */
export const adminAssignHospitalsSchema = z.object({
  sevak_id: z
    .string()
    .uuid({ message: 'sevak_id must be a valid UUID' })
    .optional(),

  hospital_ids: z
    .array(z.string().uuid({ message: 'Each hospital_id must be a valid UUID' }))
    .min(1, { message: 'At least one hospital must be selected' }),

  mode: z
    .enum(['replace', 'append'], {
      errorMap: () => ({ message: "mode must be either 'replace' or 'append'" }),
    })
    .optional()
    .default('replace'),

  remarks: z
    .string()
    .trim()
    .max(500, { message: 'Remarks cannot exceed 500 characters' })
    .optional()
    .nullable(),
});

/**
 * Validation schema for assigning multiple Arogya Sevaks to a Hospital
 */
export const adminAssignSevaksToHospitalSchema = z.object({
  hospital_id: z
    .string()
    .uuid({ message: 'hospital_id must be a valid UUID' })
    .optional(),

  sevak_ids: z
    .array(z.string().uuid({ message: 'Each sevak_id must be a valid UUID' }))
    .min(1, { message: 'At least one sevak must be selected' }),

  remarks: z
    .string()
    .trim()
    .max(500, { message: 'Remarks cannot exceed 500 characters' })
    .optional()
    .nullable(),
});

// ==========================================
// Helper Validation Functions
// ==========================================

export const validateAdminCreateNewAdmin = (data) => {
  const result = adminCreateNewAdminSchema.safeParse(data || {});
  if (!result.success) {
    return {
      success: false,
      error: result.error.errors[0]?.message || 'Validation failed',
      errors: result.error.errors,
    };
  }
  return { success: true, data: result.data };
};

export const validateAdminBootstrap = (data) => {
  const result = adminBootstrapSchema.safeParse(data || {});
  if (!result.success) {
    return {
      success: false,
      error: result.error.errors[0]?.message || 'Validation failed',
      errors: result.error.errors,
    };
  }
  return { success: true, data: result.data };
};

export const validateCreateAdmin = (data) => {
  const result = createAdminSchema.safeParse(data || {});
  if (!result.success) {
    return {
      success: false,
      error: result.error.errors[0]?.message || 'Validation failed',
      errors: result.error.errors,
    };
  }
  return { success: true, data: result.data };
};

export const validateAdminAddArogyaSevak = (data) => {
  const result = adminAddArogyaSevakSchema.safeParse(data || {});
  if (!result.success) {
    return {
      success: false,
      error: result.error.errors[0]?.message || 'Validation failed',
      errors: result.error.errors,
    };
  }
  return { success: true, data: result.data };
};

export const validateAdminAssignHospital = (data) => {
  const result = adminAssignHospitalSchema.safeParse(data || {});
  if (!result.success) {
    return {
      success: false,
      error: result.error.errors[0]?.message || 'Validation failed',
      errors: result.error.errors,
    };
  }
  return { success: true, data: result.data };
};

export const validateAdminAssignHospitals = (data) => {
  const result = adminAssignHospitalsSchema.safeParse(data || {});
  if (!result.success) {
    return {
      success: false,
      error: result.error.errors[0]?.message || 'Validation failed',
      errors: result.error.errors,
    };
  }
  return { success: true, data: result.data };
};

export const validateAdminAssignSevaksToHospital = (data) => {
  const result = adminAssignSevaksToHospitalSchema.safeParse(data || {});
  if (!result.success) {
    return {
      success: false,
      error: result.error.errors[0]?.message || 'Validation failed',
      errors: result.error.errors,
    };
  }
  return { success: true, data: result.data };
};

/**
 * Validation schema for Admin editing/updating an existing Arogya Sevak
 */
export const adminUpdateArogyaSevakSchema = z.preprocess(
  (data) => {
    if (data && typeof data === 'object') {
      const copy = { ...data };
      if (!copy.full_name && copy.name) copy.full_name = copy.name;
      if (!copy.full_name && copy.arogya_sevak_name) copy.full_name = copy.arogya_sevak_name;
      if (!copy.full_name && copy.arogyaSevakName) copy.full_name = copy.arogyaSevakName;
      if (!copy.mobile && copy.phone) copy.mobile = copy.phone;
      if (!copy.mobile && copy.mobileNumber) copy.mobile = copy.mobileNumber;
      if (!copy.mobile && copy.mobile_number) copy.mobile = copy.mobile_number;
      if (!copy.address && copy.street_address) copy.address = copy.street_address;
      if (!copy.address && copy.full_street_address) copy.address = copy.full_street_address;
      if (!copy.address && copy.fullStreetAddress) copy.address = copy.fullStreetAddress;
      if (!copy.landmark && copy.nearest_landmark) copy.landmark = copy.nearest_landmark;
      if (!copy.landmark && copy.nearestLandmark) copy.landmark = copy.nearestLandmark;
      if (copy.email === '' || (typeof copy.email === 'string' && !copy.email.trim())) copy.email = undefined;
      if (typeof copy.status === 'string') {
        const upper = copy.status.trim().toUpperCase();
        if (upper === 'ACTIVE' || upper === 'INACTIVE') {
          copy.status = upper;
        }
      }
      return copy;
    }
    return data;
  },
  z.object({
    full_name: z
      .string()
      .trim()
      .min(2, { message: 'Full name must be at least 2 characters long' })
      .max(150, { message: 'Full name cannot exceed 150 characters' })
      .optional(),

    mobile: z
      .string()
      .trim()
      .regex(INDIAN_MOBILE_REGEX, {
        message: 'Please provide a valid 10-digit Indian mobile number',
      })
      .optional(),

    address: z
      .string()
      .trim()
      .min(3, { message: 'Full street address must be at least 3 characters long' })
      .max(300, { message: 'Full street address cannot exceed 300 characters' })
      .optional(),

    city: z
      .string()
      .trim()
      .min(2, { message: 'City must be at least 2 characters long' })
      .max(100, { message: 'City cannot exceed 100 characters' })
      .optional(),

    taluka: z
      .string()
      .trim()
      .min(2, { message: 'Taluka must be at least 2 characters long' })
      .max(100, { message: 'Taluka cannot exceed 100 characters' })
      .optional(),

    district: z
      .string()
      .trim()
      .min(2, { message: 'District must be at least 2 characters long' })
      .max(100, { message: 'District cannot exceed 100 characters' })
      .optional(),

    landmark: z
      .string()
      .trim()
      .max(150, { message: 'Nearest landmark cannot exceed 150 characters' })
      .optional()
      .nullable(),

    email: z
      .string()
      .trim()
      .email({ message: 'Please provide a valid email address' })
      .max(150, { message: 'Email cannot exceed 150 characters' })
      .optional()
      .nullable(),

    employee_code: z
      .string()
      .trim()
      .min(2, { message: 'Employee code must be at least 2 characters' })
      .max(50, { message: 'Employee code cannot exceed 50 characters' })
      .optional()
      .nullable(),

    phone: z
      .string()
      .trim()
      .regex(INDIAN_MOBILE_REGEX, {
        message: 'Phone must be a valid 10-digit Indian mobile number',
      })
      .optional()
      .nullable(),

    joining_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'joining_date must be in YYYY-MM-DD format' })
      .optional()
      .nullable(),

    status: z
      .enum(['ACTIVE', 'INACTIVE'], {
        errorMap: () => ({ message: 'Status must be either ACTIVE or INACTIVE' }),
      })
      .optional(),

    hospital_id: z
      .string()
      .uuid({ message: 'hospital_id must be a valid UUID' })
      .optional()
      .nullable(),

    hospital_ids: z
      .array(z.string().uuid({ message: 'Each hospital_id must be a valid UUID' }))
      .optional(),

    remarks: z
      .string()
      .trim()
      .max(500, { message: 'Remarks cannot exceed 500 characters' })
      .optional()
      .nullable(),
  })
);

export const validateAdminUpdateArogyaSevak = (data) => {
  const result = adminUpdateArogyaSevakSchema.safeParse(data || {});
  if (!result.success) {
    return {
      success: false,
      error: result.error.errors[0]?.message || 'Validation failed',
      errors: result.error.errors,
    };
  }
  return { success: true, data: result.data };
};

