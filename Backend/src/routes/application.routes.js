import { Router } from 'express';
import {
  submitApplication,
  getMyApplications,
  getApplicationById,
  getApplicationDocuments,
  resubmitDocument,
  remindAdmin,
  requestCaseReopen,
  reopenApplication,
  getAllApplications,
  getApplicationStats,
  updateApplicationStatus,
  requestDocument,
  verifyDocument,
  assignCase,
  addRemark,
  getSevakAssignedApplications,
  updateTreatmentProgress,
  uploadApplicationDocument,
  uploadSevakDocument,
} from '../controllers/application.controller.js';
import { verifyJWT, optionalJWT, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = Router();

// Optional JWT extraction: allows requests with or without Bearer token
const optionalAuth = (req, res, next) => {
  next();
};

// ==========================================
// 1. Citizen Routes (/api/applications)
// ==========================================

// Submit new application
router.post('/', verifyJWT, submitApplication);

// List current citizen's applications
router.get('/my', verifyJWT, getMyApplications);

// Citizen resubmit requested document
router.post('/:id/resubmit-doc', verifyJWT, resubmitDocument);

// Citizen request to reopen rejected application within 60-day eligibility window
router.post('/:id/request-reopen', verifyJWT, requestCaseReopen);

// Reopen rejected application within 60-day eligibility window (Admin only)
router.post('/:id/reopen', verifyJWT, reopenApplication);

// Citizen send urgent SLA reminder to Admin
router.post('/:id/remind-admin', verifyJWT, remindAdmin);
router.post('/:id/escalate', verifyJWT, remindAdmin);

// ==========================================
// 2. Arogya Sevak Routes
// ==========================================

// Arogya Sevak get assigned applications
router.get('/sevak/assigned', optionalJWT, getSevakAssignedApplications);
router.get('/sevak/my-cases', optionalJWT, getSevakAssignedApplications);

// Arogya Sevak upload requested clinical record / document (legacy/alternate)
router.post('/:id/sevak-upload-doc', uploadSevakDocument);

// Arogya Sevak / Admin update clinical treatment progress and live ward status
router.put('/:id/treatment-progress', updateTreatmentProgress);
router.patch('/:id/treatment-progress', updateTreatmentProgress);

// ==========================================
// 3. Application Details & Documents
// ==========================================

// Upload & Attach new document to an application (by Case ID or UUID)
router.post('/:id/documents', verifyJWT, authorizeRoles('ADMIN', 'AROGYA_SEVAK', 'SEVAK', 'CITIZEN'), uploadApplicationDocument);
router.post('/case/:caseId/documents', verifyJWT, authorizeRoles('ADMIN', 'AROGYA_SEVAK', 'SEVAK', 'CITIZEN'), uploadApplicationDocument);

// Get documents for an application (by Case ID or UUID)
router.get('/:id/documents', getApplicationDocuments);
router.get('/case/:caseId/documents', getApplicationDocuments);

// Get single application details by Case ID or UUID
router.get('/track/:id', optionalJWT, getApplicationById);
router.get('/:id', optionalJWT, getApplicationById);

export default router;
