import { Router } from 'express';
import {
  createArogyaSevak,
  getArogyaSevakById,
  getArogyaSevakByUserId,
  getArogyaSevakByCode,
  updateArogyaSevak,
  sendSevakOtp,
  verifySevakOtp,
  assignBackupSevak,
  getActiveBackupSevak,
  removeBackupSevak,
} from '../controllers/arogyaSevak.controller.js';
import { getSevakHospitals } from '../controllers/admin.controller.js';
import { getHospitalById, getAssignedHospitalDetails } from '../controllers/hospital.controller.js';
import {
  getSevakNotifications,
  getSevakUnreadNotificationCount,
  markAllSevakNotificationsRead,
  clearSeenSevakNotifications,
  markNotificationRead,
} from '../controllers/notification.controller.js';
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = Router();

// =======================================================
// Arogya Sevak Notifications Endpoints
// =======================================================

// GET /api/arogya-sevaks/notifications - Get all notifications for logged in Arogya Sevak
router.get(
  '/notifications',
  verifyJWT,
  authorizeRoles('ADMIN', 'AROGYA_SEVAK', 'SEVAK'),
  getSevakNotifications
);

// GET /api/arogya-sevaks/notifications/unread-count - Get unread count
router.get(
  '/notifications/unread-count',
  verifyJWT,
  authorizeRoles('ADMIN', 'AROGYA_SEVAK', 'SEVAK'),
  getSevakUnreadNotificationCount
);

// PATCH & POST /api/arogya-sevaks/notifications/read-all - Mark all notifications as read
router.patch(
  '/notifications/read-all',
  verifyJWT,
  authorizeRoles('ADMIN', 'AROGYA_SEVAK', 'SEVAK'),
  markAllSevakNotificationsRead
);
router.post(
  '/notifications/read-all',
  verifyJWT,
  authorizeRoles('ADMIN', 'AROGYA_SEVAK', 'SEVAK'),
  markAllSevakNotificationsRead
);

// DELETE & POST /api/arogya-sevaks/notifications/seen - Clear all seen/read notifications
router.delete(
  ['/notifications/seen', '/notifications/read', '/notifications/clear-seen'],
  verifyJWT,
  authorizeRoles('ADMIN', 'AROGYA_SEVAK', 'SEVAK'),
  clearSeenSevakNotifications
);
router.post(
  ['/notifications/seen/clear', '/notifications/clear-seen'],
  verifyJWT,
  authorizeRoles('ADMIN', 'AROGYA_SEVAK', 'SEVAK'),
  clearSeenSevakNotifications
);

// PATCH & POST /api/arogya-sevaks/notifications/:id/read - Mark single notification as read
router.patch(
  '/notifications/:id/read',
  verifyJWT,
  authorizeRoles('ADMIN', 'AROGYA_SEVAK', 'SEVAK'),
  markNotificationRead
);
router.post(
  '/notifications/:id/read',
  verifyJWT,
  authorizeRoles('ADMIN', 'AROGYA_SEVAK', 'SEVAK'),
  markNotificationRead
);

// =======================================================
// Arogya Sevak Mobile App Authentication (6-Digit OTP Login)
// =======================================================

// POST /api/arogya-sevaks/auth/send-otp - Mobile Sevak sends mobile number, receives 6-digit OTP
router.post('/auth/send-otp', sendSevakOtp);

// POST /api/arogya-sevaks/auth/verify-otp - Verify 6-digit OTP and login to Sevak Dashboard
router.post('/auth/verify-otp', verifySevakOtp);

// POST /api/arogya-sevaks/auth/login - Direct alias for OTP Login
router.post('/auth/login', verifySevakOtp);

// =======================================================
// Profile & Management Endpoints
// =======================================================

// GET /api/arogya-sevaks/me or /profile - Get currently authenticated Sevak's full profile
router.get(
  ['/me', '/profile', '/my-profile'],
  verifyJWT,
  authorizeRoles('ADMIN', 'AROGYA_SEVAK', 'SEVAK'),
  getArogyaSevakById
);

// PUT/PATCH /api/arogya-sevaks/me or /profile - Update currently authenticated Sevak's profile
router.put(
  ['/me', '/profile', '/my-profile'],
  verifyJWT,
  authorizeRoles('ADMIN', 'AROGYA_SEVAK', 'SEVAK'),
  updateArogyaSevak
);

router.patch(
  ['/me', '/profile', '/my-profile'],
  verifyJWT,
  authorizeRoles('ADMIN', 'AROGYA_SEVAK', 'SEVAK'),
  updateArogyaSevak
);

// GET /api/arogya-sevaks/me/hospitals - Get assigned hospitals for currently logged-in Sevak
router.get(
  ['/me/hospitals', '/assigned-hospitals', '/assigned-hospital'],
  verifyJWT,
  authorizeRoles('ADMIN', 'AROGYA_SEVAK', 'SEVAK'),
  getSevakHospitals
);

// GET /api/arogya-sevaks/assigned-hospital/details - Complete details of Sevak's assigned hospital
router.get(
  ['/assigned-hospital/details', '/assigned-hospitals/details'],
  verifyJWT,
  authorizeRoles('ADMIN', 'AROGYA_SEVAK', 'SEVAK'),
  getAssignedHospitalDetails
);

// GET /api/arogya-sevaks/hospitals/:id - Get complete hospital details by Hospital UUID or Code
router.get(
  '/hospitals/:id',
  verifyJWT,
  authorizeRoles('ADMIN', 'AROGYA_SEVAK', 'SEVAK'),
  getHospitalById
);

// POST /api/arogya-sevaks - Create Arogya Sevak profile (Admin only)
router.post('/', verifyJWT, authorizeRoles('ADMIN'), createArogyaSevak);

// GET /api/arogya-sevaks/user/:userId - Get profile by user_id
router.get(
  '/user/:userId',
  verifyJWT,
  authorizeRoles('ADMIN', 'AROGYA_SEVAK', 'SEVAK'),
  getArogyaSevakByUserId
);

// GET /api/arogya-sevaks/code/:code - Get profile by employee_code
router.get(
  '/code/:code',
  verifyJWT,
  authorizeRoles('ADMIN', 'AROGYA_SEVAK', 'SEVAK'),
  getArogyaSevakByCode
);

// GET /api/arogya-sevaks/:id/hospitals - Get assigned hospitals by Sevak ID or User ID
router.get(
  '/:id/hospitals',
  verifyJWT,
  authorizeRoles('ADMIN', 'AROGYA_SEVAK', 'SEVAK'),
  getSevakHospitals
);

// GET /api/arogya-sevaks/:id - Get profile by UUID
router.get(
  '/:id',
  verifyJWT,
  authorizeRoles('ADMIN', 'AROGYA_SEVAK', 'SEVAK'),
  getArogyaSevakById
);

// PUT /api/arogya-sevaks/:id - Edit/Update Arogya Sevak profile
router.put(
  '/:id',
  verifyJWT,
  authorizeRoles('ADMIN', 'AROGYA_SEVAK', 'SEVAK'),
  updateArogyaSevak
);

// GET /api/arogya-sevaks/:id/backup - Get active backup sevak assignment
router.get(
  '/:id/backup',
  verifyJWT,
  authorizeRoles('ADMIN', 'AROGYA_SEVAK', 'SEVAK'),
  getActiveBackupSevak
);

// POST /api/arogya-sevaks/:id/backup - Assign backup temporary sevak (Admin only)
router.post(
  '/:id/backup',
  verifyJWT,
  authorizeRoles('ADMIN'),
  assignBackupSevak
);

// DELETE /api/arogya-sevaks/:id/backup - Remove / deactivate backup sevak (Admin only)
router.delete(
  '/:id/backup',
  verifyJWT,
  authorizeRoles('ADMIN'),
  removeBackupSevak
);

export default router;

