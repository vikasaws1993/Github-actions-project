import { z } from 'zod';

/**
 * Zod validation schema for Citizen Scheme Application Submission
 * Preprocesses camelCase fields from Mobile App / Web form and normalizes them.
 */
export const createApplicationSchema = z.preprocess(
  (data) => {
    if (data && typeof data === 'object') {
      const copy = { ...data };

      // Normalization of patient names and phones
      if (!copy.patientName && copy.name) copy.patientName = copy.name;
      if (!copy.patientName && copy.full_name) copy.patientName = copy.full_name;

      if (!copy.contactMobile && copy.patientPhone) copy.contactMobile = copy.patientPhone;
      if (!copy.contactMobile && copy.mobile) copy.contactMobile = copy.mobile;

      // Normalization of scheme
      if (!copy.suggested_scheme_id && copy.schemeId) copy.suggested_scheme_id = copy.schemeId;
      if (!copy.suggested_scheme_name && copy.schemeName) copy.suggested_scheme_name = copy.schemeName;

      // Age conversion
      if (copy.age !== undefined && copy.age !== null && copy.age !== '') {
        const parsedAge = parseInt(String(copy.age), 10);
        copy.age = !isNaN(parsedAge) ? parsedAge : undefined;
      }

      // Priority normalization (Emergency vs Regular)
      if (copy.priority) {
        let p = String(copy.priority).toUpperCase().trim();
        if (p === 'EMERGENCY' || p === 'CRITICAL' || p === 'HIGH') {
          p = 'EMERGENCY';
        } else if (p === 'REGULAR' || p === 'MEDIUM' || p === 'LOW' || p === 'NORMAL') {
          p = 'REGULAR';
        }
        copy.priority = p;
      }

      // Treatment type normalization
      if (copy.treatmentType) {
        copy.treatmentType = String(copy.treatmentType).toUpperCase();
      }

      // Referral name and type normalization
      const rawName = copy.referralName || copy.referralFullName || [copy.referralFirstName, copy.referralLastName].filter(Boolean).join(' ').trim();
      if (rawName && !copy.referralName) {
        copy.referralName = rawName;
      }
      if (!copy.referredBy) {
        const typeLabel = copy.referralCustomType || copy.referralType;
        if (typeLabel && rawName) {
          copy.referredBy = `[${typeLabel}] ${rawName}`;
        } else if (rawName) {
          copy.referredBy = rawName;
        } else if (typeLabel) {
          copy.referredBy = typeLabel;
        }
      }

      return copy;
    }
    return data;
  },
  z.object({
    patientName: z
      .string({ required_error: 'Patient name is required / रुग्णाचे नाव आवश्यक आहे' })
      .trim()
      .min(2, { message: 'Patient name must be at least 2 characters long' })
      .max(150),

    contactMobile: z
      .string()
      .trim()
      .max(20)
      .optional()
      .default('9876543210'),

    age: z.number().int().min(0).max(130).optional().nullable(),

    gender: z
      .string()
      .trim()
      .optional()
      .default('male'),

    applyingFor: z
      .enum(['self', 'relative', 'SELF', 'RELATIVE'])
      .optional()
      .default('self'),

    priority: z
      .enum(['EMERGENCY', 'REGULAR', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'NORMAL'])
      .optional()
      .default('REGULAR'),

    abhaNumber: z.string().trim().max(50).optional(),
    pmjayCardNumber: z.string().trim().max(50).optional(),

    address: z.string().trim().max(500).optional().default(''),
    villageCity: z.string().trim().max(100).optional(),
    taluka: z.string().trim().max(100).optional(),
    taluka_id: z.string().trim().max(100).optional(),
    talukaCode: z.string().trim().max(100).optional(),
    district: z.string().trim().max(100).optional().default('पुणे (Pune)'),
    district_id: z.string().trim().max(100).optional(),
    districtCode: z.string().trim().max(100).optional(),
    pincode: z.string().trim().max(10).optional(),

    relativeName: z.string().trim().max(150).optional(),
    relativePhone: z.string().trim().max(20).optional(),
    relativeRelation: z.string().trim().max(50).optional(),

    treatmentType: z
      .enum(['OPD', 'IPD'])
      .optional()
      .default('OPD'),

    hospitalName: z.string().trim().max(255).optional(),
    hospitalId: z.string().trim().optional(),

    suggested_scheme_id: z.string().trim().optional().default('mjpjay'),
    suggested_scheme_name: z.string().trim().optional(),

    medicalCauseNote: z.string().trim().max(2000).optional(),

    referralType: z.string().trim().max(100).optional(),
    referralCustomType: z.string().trim().max(100).optional(),
    referralName: z.string().trim().max(200).optional(),
    referralFullName: z.string().trim().max(200).optional(),
    referralFirstName: z.string().trim().max(100).optional(),
    referralLastName: z.string().trim().max(100).optional(),
    referredBy: z.string().trim().max(200).optional(),

    documents: z
      .array(
        z.object({
          id: z.string().optional(),
          name: z.string().optional(),
          file_name: z.string().optional(),
          size: z.string().optional(),
          file_size: z.string().optional(),
          category: z.string().optional(),
          source: z.string().optional(),
          uri: z.string().optional(),
          file_url: z.string().optional(),
          type: z.string().optional(),
        })
      )
      .optional()
      .default([]),

    remarks: z.string().trim().max(1000).optional(),
  })
);

/**
 * Validation schema for Admin status updates
 * Normalizes UI friendly strings to canonical CASE_STATUS enums
 */
export const updateStatusSchema = z.preprocess(
  (data) => {
    if (data && typeof data === 'object') {
      const copy = { ...data };
      if (!copy.assigned_scheme_id && copy.scheme_id) copy.assigned_scheme_id = copy.scheme_id;
      if (!copy.assigned_scheme_id && copy.schemeId) copy.assigned_scheme_id = copy.schemeId;
      if (!copy.assigned_scheme_name && copy.scheme_name) copy.assigned_scheme_name = copy.scheme_name;
      if (!copy.assigned_scheme_name && copy.schemeName) copy.assigned_scheme_name = copy.schemeName;
      if (copy.approved_amount !== undefined && copy.sanctioned_amount === undefined) {
        copy.sanctioned_amount = Number(copy.approved_amount);
      }
      if (copy.status) {
        let s = String(copy.status).trim().toUpperCase().replace(/[-\s/]+/g, '_');
        if (s === 'DOCUMENTS_VERIFIED' || s === 'DOCS_VERIFIED' || s === 'DOC_VERIFIED' || s === 'VERIFIED' || s === 'OPERATOR_REVIEW') s = 'DOCS_VERIFIED';
        if (s === 'HOSPITAL_SEVAK_ASSIGNED' || s === 'SEVAK_HOSPITAL_ASSIGNED' || s === 'HOSPITAL_ASSIGNED' || s === 'SEVAK_ASSIGNED' || s === 'ASSIGNED') s = 'COORDINATED';
        if (s === 'HOLD' || s === 'ONHOLD' || s === 'PAUSED') s = 'ON_HOLD';
        if (s === 'ACTIVE') s = 'TREATMENT_STARTED';
        if (s === 'DISCHARGED' || s === 'CASE_CLOSED' || s === 'RESOLVED' || s === 'CLOSED_DISCHARGED') s = 'CLOSED';
        copy.status = s;
      }
      if (!copy.remarks && copy.reason) copy.remarks = copy.reason;
      if (!copy.reason && copy.remarks) copy.reason = copy.remarks;
      return copy;
    }
    return data;
  },
  z.object({
    status: z.enum([
      'SUBMITTED',
      'UNDER_REVIEW',
      'IN_REVIEW',
      'DOCS_REQUIRED',
      'DOCS_VERIFIED',
      'REVERTED',
      'ON_HOLD',
      'APPROVED',
      'COORDINATED',
      'TREATMENT_STARTED',
      'REJECTED',
      'CLOSED',
    ]),
    assigned_scheme_id: z.string().optional().nullable(),
    assigned_scheme_name: z.string().optional().nullable(),
    scheme_id: z.string().optional().nullable(),
    scheme_name: z.string().optional().nullable(),
    sanctioned_amount: z.number().nonnegative().optional().nullable(),
    approved_amount: z.number().nonnegative().optional().nullable(),
    reason: z.string().trim().max(1000).optional().nullable(),
    remarks: z.string().trim().max(1000).optional().nullable(),
  }).passthrough()
);

/**
 * Validation schema for Admin requesting document / reverting application
 */
export const requestDocSchema = z.preprocess(
  (data) => {
    if (data && typeof data === 'object') {
      const copy = { ...data };
      if (!copy.requestedDocName && copy.requested_doc_name) copy.requestedDocName = copy.requested_doc_name;
      if (!copy.requestedDocType && copy.requested_doc_type) copy.requestedDocType = copy.requested_doc_type;
      if (copy.deadline_days !== undefined && copy.deadlineDays === undefined) copy.deadlineDays = copy.deadline_days;
      return copy;
    }
    return data;
  },
  z.object({
    requestedDocName: z
      .string({ required_error: 'Requested document name is required / आवश्यक कागदपत्राचे नाव प्रविष्ट करा' })
      .trim()
      .min(2),
    requestedDocType: z
      .string()
      .trim()
      .optional()
      .default('other'),
    reason: z
      .string({ required_error: 'Reason for requesting document is required / कारण आवश्यक आहे' })
      .trim()
      .min(3),
    deadlineDays: z.number().optional().default(3),
    deadline_days: z.number().optional().default(3),
  }).passthrough()
);

/**
 * Validation schema for Citizen resubmitting a requested document
 */
export const resubmitDocSchema = z.object({
  document: z.object({
    name: z.string().optional().default('Resubmitted_Doc.pdf'),
    file_url: z.string({ required_error: 'Document URL or path is required' }),
    category: z.string().optional().default('other'),
    size: z.string().optional().default('1.2 MB'),
    source: z.string().optional().default('device'),
  }),
  citizenRemark: z.string().trim().max(1000).optional(),
});

/**
 * Validation schema for assigning hospital and/or Arogya Sevak
 */
export const assignCaseSchema = z.object({
  hospital_id: z.string().optional().nullable(),
  hospitalId: z.string().optional().nullable(),
  hospital_name: z.string().optional().nullable(),
  hospitalName: z.string().optional().nullable(),
  hospital: z.string().optional().nullable(),
  arogya_sevak_id: z.string().optional().nullable(),
  arogyaSevakId: z.string().optional().nullable(),
  sevak_id: z.string().optional().nullable(),
  sevakId: z.string().optional().nullable(),
  sevak_name: z.string().optional().nullable(),
  sevakName: z.string().optional().nullable(),
  sevak_phone: z.string().optional().nullable(),
  sevakPhone: z.string().optional().nullable(),
  sevak: z.string().optional().nullable(),
  scheme: z.string().optional().nullable(),
  schemeName: z.string().optional().nullable(),
  scheme_id: z.string().optional().nullable(),
  schemeId: z.string().optional().nullable(),
  assigned_scheme_id: z.string().optional().nullable(),
  assigned_scheme_name: z.string().optional().nullable(),
  instructions: z.string().optional().nullable(),
  assignmentNotes: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  admissionDate: z.string().optional().nullable(),
  admission_date: z.string().optional().nullable(),
  remark: z.string().trim().max(2000).optional().nullable(),
  remarks: z.string().trim().max(2000).optional().nullable(),
}).passthrough();

/**
 * Validation schema for citizen SLA reminder to admin
 */
export const remindAdminSchema = z.object({
  reason: z.string().trim().max(1000).optional().nullable(),
  escalationNote: z.string().trim().max(1000).optional().nullable(),
}).passthrough();

/**
 * Validation schema for adding remark / case note
 */
export const addRemarkSchema = z.object({
  remark: z
    .string({ required_error: 'Remark text is required' })
    .trim()
    .min(1)
    .max(2000),
  remark_type: z
    .string()
    .trim()
    .optional()
    .default('ADMIN_NOTE'),
});

export const validateCreateApplication = (data) => {
  const result = createApplicationSchema.safeParse(data || {});
  if (!result.success) {
    return {
      success: false,
      error: result.error.errors[0]?.message || 'Validation failed',
      errors: result.error.errors,
    };
  }
  return { success: true, data: result.data };
};

export const validateUpdateStatus = (data) => {
  const result = updateStatusSchema.safeParse(data || {});
  if (!result.success) {
    return {
      success: false,
      error: result.error.errors[0]?.message || 'Validation failed',
      errors: result.error.errors,
    };
  }
  return { success: true, data: result.data };
};

export const validateRequestDoc = (data) => {
  const result = requestDocSchema.safeParse(data || {});
  if (!result.success) {
    return {
      success: false,
      error: result.error.errors[0]?.message || 'Validation failed',
      errors: result.error.errors,
    };
  }
  return { success: true, data: result.data };
};

export const validateResubmitDoc = (data) => {
  const result = resubmitDocSchema.safeParse(data || {});
  if (!result.success) {
    return {
      success: false,
      error: result.error.errors[0]?.message || 'Validation failed',
      errors: result.error.errors,
    };
  }
  return { success: true, data: result.data };
};

export const validateAssignCase = (data) => {
  const result = assignCaseSchema.safeParse(data || {});
  if (!result.success) {
    return {
      success: false,
      error: result.error.errors[0]?.message || 'Validation failed',
      errors: result.error.errors,
    };
  }
  return { success: true, data: result.data };
};

export const validateAddRemark = (data) => {
  const result = addRemarkSchema.safeParse(data || {});
  if (!result.success) {
    return {
      success: false,
      error: result.error.errors[0]?.message || 'Validation failed',
      errors: result.error.errors,
    };
  }
  return { success: true, data: result.data };
};

export const validateRemindAdmin = (data) => {
  const result = remindAdminSchema.safeParse(data || {});
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
  createApplicationSchema,
  updateStatusSchema,
  requestDocSchema,
  resubmitDocSchema,
  assignCaseSchema,
  remindAdminSchema,
  addRemarkSchema,
  validateCreateApplication,
  validateUpdateStatus,
  validateRequestDoc,
  validateResubmitDoc,
  validateAssignCase,
  validateRemindAdmin,
  validateAddRemark,
};
