import { Router } from 'express';
import {
  recordOpdVisit,
  getAllOpdVisits,
  getOpdStats,
  getOpdVisitsByApplication,
  getOpdVisitsByCase,
  resolveFollowUp,
  getOpdVisitById,
  updateOpdVisit,
  deleteOpdVisit,
} from '../controllers/opdVisit.controller.js';
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = Router();

// Staff roles authorized to manage outpatient visits
const ALLOWED_STAFF_ROLES = ['ADMIN', 'AROGYA_SEVAK', 'SEVAK', 'DOCTOR'];

// GET /api/opd-visits - Get all OPD visits with filter/search and stats
router.get(
  '/',
  verifyJWT,
  authorizeRoles(...ALLOWED_STAFF_ROLES),
  getAllOpdVisits
);

// GET /api/opd-visits/stats - Get aggregate OPD statistics
router.get(
  '/stats',
  verifyJWT,
  authorizeRoles(...ALLOWED_STAFF_ROLES),
  getOpdStats
);

// POST /api/opd-visits - Record OPD visit outcome against a case
router.post(
  '/',
  verifyJWT,
  authorizeRoles(...ALLOWED_STAFF_ROLES),
  recordOpdVisit
);

// GET /api/opd-visits/application/:applicationId - Get all OPD visits recorded against an application UUID
router.get(
  '/application/:applicationId',
  verifyJWT,
  authorizeRoles(...ALLOWED_STAFF_ROLES, 'CITIZEN'),
  getOpdVisitsByApplication
);

// GET /api/opd-visits/case/:caseId - Get all OPD visits recorded against a case identifier/number
router.get(
  '/case/:caseId',
  verifyJWT,
  authorizeRoles(...ALLOWED_STAFF_ROLES, 'CITIZEN'),
  getOpdVisitsByCase
);

// PATCH /api/opd-visits/:id/resolve-follow-up - Resolve follow up
router.patch(
  '/:id/resolve-follow-up',
  verifyJWT,
  authorizeRoles(...ALLOWED_STAFF_ROLES),
  resolveFollowUp
);

// GET /api/opd-visits/:id - Get specific OPD visit details
router.get(
  '/:id',
  verifyJWT,
  authorizeRoles(...ALLOWED_STAFF_ROLES, 'CITIZEN'),
  getOpdVisitById
);

// PATCH /api/opd-visits/:id - Update visit details
router.patch(
  '/:id',
  verifyJWT,
  authorizeRoles(...ALLOWED_STAFF_ROLES),
  updateOpdVisit
);

// DELETE /api/opd-visits/:id - Remove visit
router.delete(
  '/:id',
  verifyJWT,
  authorizeRoles('ADMIN'),
  deleteOpdVisit
);

export default router;
