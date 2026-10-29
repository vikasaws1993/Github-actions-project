import { Router } from 'express';
import {
  registerFirstAdmin,
  createAdmin,
  getAllAdmins,
  getAdminById,
  getAdminByUserId,
  getMyProfile,
  updateMyProfile,
  changeAdminPassword,
  addArogyaSevak,
  getAllArogyaSevaks,
  getArogyaSevakById,
  updateArogyaSevak,
  assignSevakToHospitals,
  assignSevakToHospital,
  getSevakHospitals,
  unassignSevak,
  sendNotification,
  broadcastNotification,
  getAllNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearSeenNotifications,
  clearAllNotifications,
  deleteNotification,
} from '../controllers/admin.controller.js';
import {
  createHospital,
  bulkCreateHospitals,
  getAllHospitals,
  getHospitalById,
  getHospitalSevaks,
  updateHospital,
  deactivateHospital,
  deleteHospital,
} from '../controllers/hospital.controller.js';
import {
  getSchemeStats,
  createScheme,
  getAllSchemes,
  getSchemeById,
  updateScheme,
  toggleSchemeStatus,
  deleteScheme,
  getSchemeHospitals,
  empanelHospitals,
  deEmpanelHospital,
  getSchemeClaims,
} from '../controllers/scheme.controller.js';
import {
  getAllApplications,
  getApplicationStats,
  getApplicationById as getAdminApplicationById,
  updateApplicationStatus,
  requestDocument,
  verifyDocument,
  assignCase,
  addRemark,
  reopenApplication,
  claimCase,
  unclaimCase,
  assignReviewer,
} from '../controllers/application.controller.js';
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';
import { uploadCsvAny } from '../middlewares/upload.middleware.js';

const router = Router();


// ==========================================
// 1. Admin Account & Profile Management
// ==========================================

// POST /api/admins/bootstrap - First-Time Admin Setup (Public when 0 admins exist in system)
router.post('/bootstrap', registerFirstAdmin);
router.post('/first-admin', registerFirstAdmin);
router.post('/register-first-time', registerFirstAdmin);

// GET /api/admins/profile - Get currently authenticated admin profile
router.get('/profile', verifyJWT, authorizeRoles('ADMIN'), getMyProfile);

// PUT & PATCH /api/admins/profile - Update currently authenticated admin profile
router.put('/profile', verifyJWT, authorizeRoles('ADMIN'), updateMyProfile);
router.patch('/profile', verifyJWT, authorizeRoles('ADMIN'), updateMyProfile);

// POST /api/admins/change-password - Change password for authenticated Admin
router.post('/change-password', verifyJWT, authorizeRoles('ADMIN'), changeAdminPassword);

// GET /api/admins/me - Alias for profile
router.get('/me', verifyJWT, authorizeRoles('ADMIN'), getMyProfile);

// POST /api/admins - Admin creates a new Admin (Protected)
router.post('/', verifyJWT, authorizeRoles('ADMIN'), createAdmin);
router.post('/new', verifyJWT, authorizeRoles('ADMIN'), createAdmin);

// GET /api/admins - List all Admins (Protected)
router.get('/', verifyJWT, authorizeRoles('ADMIN'), getAllAdmins);

// ==========================================
// 2. Arogya Sevak Management by Admin
// ==========================================

// POST /api/admins/arogya-sevaks - Admin creates a new Arogya Sevak & assigns hospitals
router.post(
  '/arogya-sevaks',
  verifyJWT,
  authorizeRoles('ADMIN'),
  addArogyaSevak
);
router.post(
  '/sevaks',
  verifyJWT,
  authorizeRoles('ADMIN'),
  addArogyaSevak
);

// GET /api/admins/arogya-sevaks - Admin lists all Arogya Sevaks with assigned hospitals
router.get(
  '/arogya-sevaks',
  verifyJWT,
  authorizeRoles('ADMIN'),
  getAllArogyaSevaks
);
router.get(
  '/sevaks',
  verifyJWT,
  authorizeRoles('ADMIN'),
  getAllArogyaSevaks
);

// ==========================================
// 3. Multi-Hospital & Sevak Assignment Endpoints
// ==========================================

// POST /api/admins/arogya-sevaks/assign-hospitals - Assign Sevak to multiple selected hospitals
router.post(
  '/arogya-sevaks/assign-hospitals',
  verifyJWT,
  authorizeRoles('ADMIN'),
  assignSevakToHospitals
);
router.post(
  '/sevaks/assign-hospitals',
  verifyJWT,
  authorizeRoles('ADMIN'),
  assignSevakToHospitals
);

// POST /api/admins/arogya-sevaks/:id/assign-hospitals - Assign selected hospitals to Sevak by URL ID
router.post(
  '/arogya-sevaks/:id/assign-hospitals',
  verifyJWT,
  authorizeRoles('ADMIN'),
  assignSevakToHospitals
);
router.post(
  '/sevaks/:id/assign-hospitals',
  verifyJWT,
  authorizeRoles('ADMIN'),
  assignSevakToHospitals
);

// GET /api/admins/arogya-sevaks/:id/hospitals - Get all hospitals assigned to a Sevak (Admin & Sevak accessible)
router.get(
  '/arogya-sevaks/:id/hospitals',
  verifyJWT,
  authorizeRoles('ADMIN', 'AROGYA_SEVAK', 'SEVAK'),
  getSevakHospitals
);
router.get(
  '/sevaks/:id/hospitals',
  verifyJWT,
  authorizeRoles('ADMIN', 'AROGYA_SEVAK', 'SEVAK'),
  getSevakHospitals
);

// GET /api/admins/hospitals/:id/sevaks - Get all Arogya Sevaks assigned to a Hospital
router.get(
  ['/hospitals/:id/sevaks', '/hospitals/:id/arogya-sevaks'],
  verifyJWT,
  authorizeRoles('ADMIN', 'AROGYA_SEVAK', 'SEVAK'),
  getHospitalSevaks
);

// POST /api/admins/arogya-sevaks/assign-hospital - Single hospital assignment (legacy)
router.post(
  '/arogya-sevaks/assign-hospital',
  verifyJWT,
  authorizeRoles('ADMIN'),
  assignSevakToHospital
);
router.post(
  '/sevaks/assign-hospital',
  verifyJWT,
  authorizeRoles('ADMIN'),
  assignSevakToHospital
);

// POST /api/admins/arogya-sevaks/:id/unassign - Unassign Sevak from specific hospital or all
router.post(
  '/arogya-sevaks/:id/unassign',
  verifyJWT,
  authorizeRoles('ADMIN'),
  unassignSevak
);
router.post(
  '/sevaks/:id/unassign',
  verifyJWT,
  authorizeRoles('ADMIN'),
  unassignSevak
);

// GET /api/admins/arogya-sevaks/:id - Admin gets Sevak by UUID
router.get(
  '/arogya-sevaks/:id',
  verifyJWT,
  authorizeRoles('ADMIN'),
  getArogyaSevakById
);
router.get(
  '/sevaks/:id',
  verifyJWT,
  authorizeRoles('ADMIN'),
  getArogyaSevakById
);

// PUT & PATCH /api/admins/arogya-sevaks/:id - Admin edits/updates Arogya Sevak details
router.put(
  '/arogya-sevaks/:id',
  verifyJWT,
  authorizeRoles('ADMIN'),
  updateArogyaSevak
);
router.patch(
  '/arogya-sevaks/:id',
  verifyJWT,
  authorizeRoles('ADMIN'),
  updateArogyaSevak
);
router.put(
  '/sevaks/:id',
  verifyJWT,
  authorizeRoles('ADMIN'),
  updateArogyaSevak
);
router.patch(
  '/sevaks/:id',
  verifyJWT,
  authorizeRoles('ADMIN'),
  updateArogyaSevak
);


// ==========================================
// 4. Hospital Empanelment & Management by Admin
// ==========================================

// POST /api/admins/hospitals - Empanel a single Hospital
router.post('/hospitals', verifyJWT, authorizeRoles('ADMIN'), createHospital);

// POST /api/admins/hospitals/bulk - Bulk add hospitals via CSV file or JSON array
router.post('/hospitals/bulk', verifyJWT, authorizeRoles('ADMIN'), uploadCsvAny(), bulkCreateHospitals);

// POST /api/admins/hospitals/upload-csv - Bulk add hospitals via CSV upload
router.post('/hospitals/upload-csv', verifyJWT, authorizeRoles('ADMIN'), uploadCsvAny(), bulkCreateHospitals);

// GET /api/admins/hospitals - List all hospitals
router.get('/hospitals', verifyJWT, authorizeRoles('ADMIN'), getAllHospitals);

// GET /api/admins/hospitals/:id - Get hospital by ID
router.get('/hospitals/:id', verifyJWT, authorizeRoles('ADMIN'), getHospitalById);

// PUT & PATCH /api/admins/hospitals/:id - Update hospital record
router.put('/hospitals/:id', verifyJWT, authorizeRoles('ADMIN'), updateHospital);
router.patch('/hospitals/:id', verifyJWT, authorizeRoles('ADMIN'), updateHospital);

// PATCH /api/admins/hospitals/:id/deactivate - Deactivate hospital
router.patch('/hospitals/:id/deactivate', verifyJWT, authorizeRoles('ADMIN'), deactivateHospital);

// DELETE /api/admins/hospitals/:id - Delete hospital by ID
router.delete('/hospitals/:id', verifyJWT, authorizeRoles('ADMIN'), deleteHospital);

// ==========================================
// 5. Healthcare Scheme Management by Admin
// ==========================================

// GET /api/admins/schemes/stats - Scheme aggregate metrics & analytics (Must precede /:id)
router.get('/schemes/stats', verifyJWT, authorizeRoles('ADMIN'), getSchemeStats);

// GET /api/admins/schemes - List all schemes with search, category, status & pagination
router.get('/schemes', verifyJWT, authorizeRoles('ADMIN'), getAllSchemes);

// POST /api/admins/schemes - Register a new scheme with created_by_admin_id
router.post('/schemes', verifyJWT, authorizeRoles('ADMIN'), createScheme);

// GET /api/admins/schemes/:id/hospitals - List all hospitals empanelled for this scheme
router.get('/schemes/:id/hospitals', verifyJWT, authorizeRoles('ADMIN'), getSchemeHospitals);

// POST /api/admins/schemes/:id/hospitals - Empanel hospital(s) to this scheme
router.post('/schemes/:id/hospitals', verifyJWT, authorizeRoles('ADMIN'), empanelHospitals);

// DELETE /api/admins/schemes/:id/hospitals/:hospitalId - De-empanel hospital from this scheme
router.delete('/schemes/:id/hospitals/:hospitalId', verifyJWT, authorizeRoles('ADMIN'), deEmpanelHospital);

// GET /api/admins/schemes/:id/claims - View all claims submitted under this scheme
router.get('/schemes/:id/claims', verifyJWT, authorizeRoles('ADMIN'), getSchemeClaims);

// GET /api/admins/schemes/:id - Get scheme by ID or scheme code
router.get('/schemes/:id', verifyJWT, authorizeRoles('ADMIN'), getSchemeById);

// PUT /api/admins/schemes/:id - Update scheme details
router.put('/schemes/:id', verifyJWT, authorizeRoles('ADMIN'), updateScheme);

// PATCH /api/admins/schemes/:id/status - Toggle scheme active status
router.patch('/schemes/:id/status', verifyJWT, authorizeRoles('ADMIN'), toggleSchemeStatus);

// DELETE /api/admins/schemes/:id - Delete scheme
router.delete('/schemes/:id', verifyJWT, authorizeRoles('ADMIN'), deleteScheme);

// ==========================================
// 6. Case & Scheme Application Review by Admin
// ==========================================

// GET /api/admins/applications/stats - Application queue metrics & statistics (Must precede /:id)
router.get('/applications/stats', verifyJWT, authorizeRoles('ADMIN'), getApplicationStats);

// GET /api/admins/applications - List all scheme applications with filters & pagination
router.get('/applications', verifyJWT, authorizeRoles('ADMIN'), getAllApplications);

// GET /api/admins/applications/:id - Full case details by application_number or UUID
router.get('/applications/:id', verifyJWT, authorizeRoles('ADMIN'), getAdminApplicationById);

// PATCH /api/admins/applications/:id/status - Approve, reject, or update status & assign official scheme
router.patch('/applications/:id/status', verifyJWT, authorizeRoles('ADMIN'), updateApplicationStatus);

// POST /api/admins/applications/:id/request-doc - Request document (revert case) with reason to citizen
router.post('/applications/:id/request-doc', verifyJWT, authorizeRoles('ADMIN'), requestDocument);

// PATCH /api/admins/applications/:id/documents/:docId/verify - Verify or reject uploaded document
router.patch('/applications/:id/documents/:docId/verify', verifyJWT, authorizeRoles('ADMIN'), verifyDocument);

// POST /api/admins/applications/:id/assign - Assign hospital and/or Arogya Sevak to case
router.post('/applications/:id/assign', verifyJWT, authorizeRoles('ADMIN'), assignCase);

// POST /api/admins/applications/:id/remarks - Add case note / remark
router.post('/applications/:id/remarks', verifyJWT, authorizeRoles('ADMIN'), addRemark);

// POST /api/admins/applications/:id/reopen - Admin reopens rejected case within 60 days
router.post('/applications/:id/reopen', verifyJWT, authorizeRoles('ADMIN'), reopenApplication);

// POST /api/admins/applications/:id/claim - Admin claims case for review
router.post('/applications/:id/claim', verifyJWT, authorizeRoles('ADMIN'), claimCase);

// POST /api/admins/applications/:id/unclaim - Admin unclaims / releases case
router.post('/applications/:id/unclaim', verifyJWT, authorizeRoles('ADMIN'), unclaimCase);

// POST /api/admins/applications/:id/assign-reviewer - Assign case to specific Admin reviewer
router.post('/applications/:id/assign-reviewer', verifyJWT, authorizeRoles('ADMIN'), assignReviewer);

// ==========================================
// 7. Admin Direct Notification & Broadcast Endpoints
// ==========================================

// POST /api/admins/notifications/send - Send direct notification to citizen or case
router.post('/notifications/send', verifyJWT, authorizeRoles('ADMIN'), sendNotification);
router.post('/notifications', verifyJWT, authorizeRoles('ADMIN'), sendNotification);

// POST /api/admins/notifications/broadcast - Broadcast general announcement to all citizens
router.post('/notifications/broadcast', verifyJWT, authorizeRoles('ADMIN'), broadcastNotification);
router.post('/broadcast', verifyJWT, authorizeRoles('ADMIN'), broadcastNotification);

// GET /api/admins/notifications - List sent and received notifications
router.get('/notifications', verifyJWT, authorizeRoles('ADMIN'), getAllNotifications);

// PATCH /api/admins/notifications/read-all - Mark all notifications as read
router.patch('/notifications/read-all', verifyJWT, authorizeRoles('ADMIN'), markAllNotificationsRead);
router.put('/notifications/read-all', verifyJWT, authorizeRoles('ADMIN'), markAllNotificationsRead);

// PATCH /api/admins/notifications/:id/read - Mark single notification as read
router.patch('/notifications/:id/read', verifyJWT, authorizeRoles('ADMIN'), markNotificationRead);
router.put('/notifications/:id/read', verifyJWT, authorizeRoles('ADMIN'), markNotificationRead);

// DELETE /api/admins/notifications/seen - Clear all seen notifications
router.delete('/notifications/seen', verifyJWT, authorizeRoles('ADMIN'), clearSeenNotifications);

// DELETE /api/admins/notifications/all - Clear all notifications (full purge)
router.delete('/notifications/all', verifyJWT, authorizeRoles('ADMIN'), clearAllNotifications);

// DELETE /api/admins/notifications/:id - Delete single notification
router.delete('/notifications/:id', verifyJWT, authorizeRoles('ADMIN'), deleteNotification);

// ==========================================
// 8. Admin Profile Lookup by UUIDs (Keep at bottom)
// ==========================================

// GET /api/admins/user/:userId - Get profile by user_id
router.get('/user/:userId', verifyJWT, authorizeRoles('ADMIN'), getAdminByUserId);

// GET /api/admins/:id - Get profile by UUID
router.get('/:id', verifyJWT, authorizeRoles('ADMIN'), getAdminById);

export default router;

