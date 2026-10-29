import { Router } from 'express';
import {
  admitPatientToIpd,
  getIpdAdmissionByApplication,
  getIpdAdmissionById,
  transitionIpdStatus,
  dischargeIpdPatient,
  getIpdTimeline,
} from '../controllers/ipd.controller.js';
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = Router();

const STAFF_ROLES = ['ADMIN', 'AROGYA_SEVAK', 'SEVAK', 'DOCTOR'];
const ALL_ROLES = [...STAFF_ROLES, 'CITIZEN'];

// 1. Admission Lifecycle
// POST /api/ipd/admissions - Admit patient to IPD (1:1 per application)
router.post(
  '/admissions',
  verifyJWT,
  authorizeRoles(...STAFF_ROLES),
  admitPatientToIpd
);

// GET /api/ipd/admissions/application/:applicationId - Get admission details by application
router.get(
  '/admissions/application/:applicationId',
  verifyJWT,
  authorizeRoles(...ALL_ROLES),
  getIpdAdmissionByApplication
);

// GET /api/ipd/admissions/:id - Get admission details by ID
router.get(
  '/admissions/:id',
  verifyJWT,
  authorizeRoles(...ALL_ROLES),
  getIpdAdmissionById
);

// 2. Status Transitions & Timestamped Updates
// POST /api/ipd/admissions/:id/status - Status change (ADMITTED_WARD -> IN_ICU -> SURGERY_PLANNED -> TREATMENT_ONGOING -> DISCHARGED)
router.post(
  '/admissions/:id/status',
  verifyJWT,
  authorizeRoles(...STAFF_ROLES),
  transitionIpdStatus
);

// POST /api/ipd/admissions/:id/discharge - Discharge patient with discharge summary URL
router.post(
  '/admissions/:id/discharge',
  verifyJWT,
  authorizeRoles(...STAFF_ROLES),
  dischargeIpdPatient
);

// 3. Chronological Status History Timeline
// GET /api/ipd/admissions/:id/timeline - Timeline by admission ID
router.get(
  '/admissions/:id/timeline',
  verifyJWT,
  authorizeRoles(...ALL_ROLES),
  getIpdTimeline
);

// GET /api/ipd/admissions/application/:applicationId/timeline - Timeline by application ID
router.get(
  '/admissions/application/:applicationId/timeline',
  verifyJWT,
  authorizeRoles(...ALL_ROLES),
  getIpdTimeline
);

export default router;
