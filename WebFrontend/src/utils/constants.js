/**
 * Application-wide constants and configurations
 */

export const APP_CONFIG = {
  NAME: 'ArogyaMitra',
  TAGLINE: 'ArogyaSevak Portal - City Care Hospital',
  HOSPITAL: 'City Care Hospital, Pune',
  VERSION: '1.0.0',
};

export const ROUTES = {
  AROGYASEVAK: '/arogyasevak',
  DASHBOARD: '/arogyasevak/portal',
  PATIENTS: '/arogyasevak/patients',
  CASES: '/arogyasevak/patients',
  URGENT_REQUEST: '/arogyasevak/urgent-request',
  PATIENT_DETAILS: '/arogyasevak/patient/:id',
  UPDATES: '/arogyasevak/updates',
  DOCUMENTS: '/arogyasevak/documents',
  OPD_LOGS: '/arogyasevak/opd-logs',
  DOCTORS: '/arogyasevak/doctors',
  NOTIFICATIONS: '/arogyasevak/notifications',
  PROFILE: '/arogyasevak/profile',
  INFRASTRUCTURE_INFO: '/arogyasevak/infrastructure-info',
  LOGIN: '/login',
  ADMIN: {
    ROOT: '/admin',
    DASHBOARD: '/admin',
    CASES: '/admin/cases',
    CASE_DETAIL: (id) => `/admin/cases/${id}`,
    CASE_REVIEW: (id) => `/admin/cases/review/${id}`,
    HOSPITALS: '/admin/hospitals',
    FOLLOW_UPS: '/admin/follow-ups',
    SEVAKS: '/admin/sevaks',
    USERS: '/admin/users',
    REPORTS: '/admin/reports',
  },
};

export const PATIENT_STATUS = {
  ALL: 'all',
  ICU: 'icu',
  SURGERY: 'surgery',
  ONGOING: 'ongoing',
  DISCHARGED: 'discharged',
};

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    ME: '/auth/me',
    LOGOUT: '/auth/logout',
  },
  PATIENTS: {
    BASE: '/patients',
    DETAILS: (id) => `/patients/${id}`,
  },
};

