/**
 * Application-wide Constants & Enums
 */

export const HTTP_STATUS = Object.freeze({
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
});

export const USER_ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  CITIZEN: 'CITIZEN',
  SEVAK: 'SEVAK',
  AROGYA_SEVAK: 'AROGYA_SEVAK',
  OPERATOR: 'AROGYA_SEVAK',
  // Backward compatibility
  PATIENT: 'CITIZEN',
  DOCTOR: 'SEVAK',
  WARD_ADMIN: 'ADMIN',
  SUPER_ADMIN: 'ADMIN',
});

export const USER_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  BLOCKED: 'BLOCKED',
});

export const SEVAK_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
});

export const HOSPITAL_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
});

export const CASE_STATUS = Object.freeze({
  SUBMITTED: 'SUBMITTED',                 // 1. Application Received
  DOCS_VERIFIED: 'DOCS_VERIFIED',         // 2. Documents Verified
  COORDINATED: 'COORDINATED',             // 3. Hospital & Sevak Assigned
  TREATMENT_STARTED: 'TREATMENT_STARTED', // 4. Treatment Started
  ON_HOLD: 'ON_HOLD',                     // On Hold ⏳
  CLOSED: 'CLOSED',                       // 5. Closed / Discharged
  REJECTED: 'REJECTED',                   // Rejected ✕
});

export const ENVIRONMENT = Object.freeze({
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test',
});
