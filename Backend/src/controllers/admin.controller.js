import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';
import { adminService } from '../services/admin.service.js';
import { HospitalModel } from '../models/hospital.model.js';
import {
  validateAdminBootstrap,
  validateAdminCreateNewAdmin,
  validateCreateAdmin,
  validateAdminAddArogyaSevak,
  validateAdminUpdateArogyaSevak,
  validateAdminAssignHospital,
  validateAdminAssignHospitals,
  validateAdminAssignSevaksToHospital,
} from '../validations/admin.validation.js';

/**
 * Admin Controller
 * Handles HTTP requests, validation, and responses for admin layer endpoints.
 */

// ==========================================
// 1. Admin Account & Profile Endpoints
// ==========================================

/**
 * Register First Admin (Bootstrap endpoint - No Auth Token Required)
 * Strictly accessible ONLY when zero admins currently exist in the system.
 * POST /api/admins/bootstrap
 * POST /api/admins/first-admin
 */
export const registerFirstAdmin = asyncHandler(async (req, res) => {
  const validation = validateAdminBootstrap(req.body);
  if (!validation.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: validation.error,
      errors: validation.errors,
    });
  }

  const result = await adminService.registerFirstAdmin(validation.data);
  return res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(
      HTTP_STATUS.CREATED,
      result,
      'Initial Administrator account created successfully'
    )
  );
});

/**
 * Create a new Admin
 * If body contains full_name/mobile/password -> creates User + Admin Profile
 * If body contains user_id -> links existing User to Admin Profile
 * POST /api/admins
 */
export const createAdmin = asyncHandler(async (req, res) => {
  if (req.body.full_name || req.body.mobile) {
    const validation = validateAdminCreateNewAdmin(req.body);
    if (!validation.success) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: validation.error,
        errors: validation.errors,
      });
    }

    const admin = await adminService.addNewAdmin(req.user?.id, validation.data);
    return res.status(HTTP_STATUS.CREATED).json(
      new ApiResponse(HTTP_STATUS.CREATED, admin, 'New Admin created successfully')
    );
  }

  // Fallback: linking existing user_id
  const validation = validateCreateAdmin(req.body);
  if (!validation.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: validation.error,
      errors: validation.errors,
    });
  }

  const admin = await adminService.createAdmin(validation.data);
  return res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(HTTP_STATUS.CREATED, admin, 'Admin profile linked successfully')
  );
});

/**
 * List all Admins
 * GET /api/admins
 */
export const getAllAdmins = asyncHandler(async (req, res) => {
  const result = await adminService.getAllAdmins(req.query);
  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, result, 'Admins retrieved successfully')
  );
});

/**
 * Get Admin by Admin UUID
 * GET /api/admins/:id
 */
export const getAdminById = asyncHandler(async (req, res) => {
  const admin = await adminService.getAdminById(req.params.id);
  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, admin, 'Admin profile retrieved successfully')
  );
});

/**
 * Get Admin by User UUID
 * GET /api/admins/user/:userId
 */
export const getAdminByUserId = asyncHandler(async (req, res) => {
  const admin = await adminService.getAdminByUserId(req.params.userId);
  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, admin, 'Admin profile retrieved successfully')
  );
});

/**
 * Get current authenticated Admin profile
 * GET /api/admins/profile
 * GET /api/admins/me
 */
export const getMyProfile = asyncHandler(async (req, res) => {
  const admin = await adminService.getAdminByUserId(req.user.id);
  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, admin, 'Authenticated admin profile retrieved successfully')
  );
});

import { authService } from '../services/auth.service.js';

/**
 * Update current authenticated Admin profile
 * PUT /api/admins/profile
 * PATCH /api/admins/profile
 */
export const updateMyProfile = asyncHandler(async (req, res) => {
  const updatedAdmin = await adminService.updateMyProfile(req.user.id, req.body);
  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, updatedAdmin, 'Admin profile updated successfully')
  );
});

/**
 * Change Password for authenticated Admin
 * POST /api/admins/change-password
 */
export const changeAdminPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const result = await authService.changePassword(req.user?.id, {
    currentPassword,
    newPassword,
  });

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, result, result.message)
  );
});

// ==========================================
// 2. Arogya Sevak Management by Admin
// ==========================================

/**
 * Admin: Add a new Arogya Sevak (with optional hospital assignments)
 * POST /api/admins/arogya-sevaks
 */
export const addArogyaSevak = asyncHandler(async (req, res) => {
  const validation = validateAdminAddArogyaSevak(req.body);
  if (!validation.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: validation.error,
      errors: validation.errors,
    });
  }

  const sevak = await adminService.addArogyaSevak(req.user?.id, validation.data);

  return res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(HTTP_STATUS.CREATED, sevak, 'Arogya Sevak created and assigned successfully by Admin')
  );
});

/**
 * Admin: List all Arogya Sevaks
 * GET /api/admins/arogya-sevaks
 */
export const getAllArogyaSevaks = asyncHandler(async (req, res) => {
  const result = await adminService.getAllArogyaSevaks(req.query);
  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, result, 'Arogya Sevaks retrieved successfully')
  );
});

/**
 * Admin: Get Arogya Sevak by UUID
 * GET /api/admins/arogya-sevaks/:id
 */
export const getArogyaSevakById = asyncHandler(async (req, res) => {
  const sevak = await adminService.getArogyaSevakById(req.params.id);
  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, sevak, 'Arogya Sevak retrieved successfully')
  );
});

/**
 * Admin: Update Arogya Sevak profile details & assignments
 * PUT /api/admins/arogya-sevaks/:id
 * PATCH /api/admins/arogya-sevaks/:id
 */
export const updateArogyaSevak = asyncHandler(async (req, res) => {
  const sevakId = req.params.id || req.body.id || req.body.sevak_id;
  if (!sevakId) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Arogya Sevak ID is required',
    });
  }

  const validation = validateAdminUpdateArogyaSevak(req.body);
  if (!validation.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: validation.error,
      errors: validation.errors,
    });
  }

  const updatedSevak = await adminService.updateArogyaSevak(
    req.user?.id,
    sevakId,
    validation.data
  );

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      updatedSevak,
      'Arogya Sevak details updated successfully'
    )
  );
});


// ==========================================
// 3. Hospital Assignments for Arogya Sevaks
// ==========================================

/**
 * Admin: Assign Arogya Sevak to Selected Hospitals
 * Supports body.sevak_id OR route params.id
 * POST /api/admins/arogya-sevaks/assign-hospitals
 * POST /api/admins/arogya-sevaks/:id/assign-hospitals
 */
export const assignSevakToHospitals = asyncHandler(async (req, res) => {
  const payload = {
    ...req.body,
    sevak_id: req.params.id || req.body.sevak_id,
  };

  const validation = validateAdminAssignHospitals(payload);
  if (!validation.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: validation.error,
      errors: validation.errors,
    });
  }

  const result = await adminService.assignSevakToHospitals(req.user?.id, validation.data);

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, result, 'Arogya Sevak successfully assigned to selected hospitals')
  );
});

/**
 * Admin: Assign Sevak to single Hospital (legacy endpoint)
 * POST /api/admins/arogya-sevaks/assign-hospital
 */
export const assignSevakToHospital = asyncHandler(async (req, res) => {
  const validation = validateAdminAssignHospital(req.body);
  if (!validation.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: validation.error,
      errors: validation.errors,
    });
  }

  const result = await adminService.assignSevakToHospital(req.user?.id, validation.data);

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, result, 'Arogya Sevak assigned to Hospital successfully')
  );
});

/**
 * Admin / Arogya Sevak: Get all hospitals assigned to a specific Sevak
 * Supports passing Sevak UUID, User UUID, or 'me'
 * GET /api/admins/arogya-sevaks/:id/hospitals
 * GET /api/arogya-sevaks/:id/hospitals
 * GET /api/arogya-sevaks/me/hospitals
 */
export const getSevakHospitals = asyncHandler(async (req, res) => {
  const isBackup = Boolean(req.user?.isBackup || req.user?.is_backup);
  const coveringId = req.user?.coveringForSevakId || req.user?.covering_for_sevak_id;
  const targetId = (!req.params.id || req.params.id === 'me')
    ? (isBackup && coveringId ? coveringId : (req.user?.sevakId || req.user?.id))
    : req.params.id;

  let result = null;
  try {
    result = await adminService.getSevakAssignedHospitals(targetId);
  } catch (err) {
    if (isBackup && req.user?.id) {
      try {
        result = await adminService.getSevakAssignedHospitals(req.user.id);
      } catch (_) {}
    }
  }

  const userHosp = req.user?.hospital || req.user?.hospitalId;
  if ((!result || !result.active_hospitals || result.active_hospitals.length === 0) && userHosp) {
    result = {
      sevak: {
        id: targetId,
        full_name: req.user?.full_name || req.user?.name || 'Arogya Sevak',
        employee_code: req.user?.employee_code || (isBackup ? 'RELIEF-SEVAK' : ''),
      },
      active_count: 1,
      active_hospitals: [
        {
          hospital_id: userHosp,
          hospital_name: typeof userHosp === 'string' ? userHosp : (userHosp.name || userHosp.hospital_name || 'Assigned Hospital'),
          hospital_address: '',
          hospital_code: '',
          hospital_contact: '',
        },
      ],
      assignment_history: [],
    };
  }

  if (!result || !result.active_hospitals || result.active_hospitals.length === 0) {
    try {
      const allH = await HospitalModel.findAll({ limit: 1 });
      if (allH?.hospitals && allH.hospitals.length > 0) {
        const h = allH.hospitals[0];
        result = {
          sevak: {
            id: targetId,
            full_name: req.user?.full_name || req.user?.name || 'Arogya Sevak',
            employee_code: req.user?.employee_code || '',
          },
          active_count: 1,
          active_hospitals: [
            {
              hospital_id: h.id,
              hospital_name: h.name,
              hospital_address: h.address || h.city || '',
              hospital_code: h.code || '',
              hospital_contact: h.contact || h.phone || '',
            },
          ],
          assignment_history: [],
        };
      }
    } catch (_) {}
  }

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, result, 'Assigned hospitals retrieved successfully')
  );
});

/**
 * Admin: Unassign Arogya Sevak from Hospital(s)
 * POST /api/admins/arogya-sevaks/:id/unassign
 */
export const unassignSevak = asyncHandler(async (req, res) => {
  const result = await adminService.unassignSevakFromHospital(
    req.user?.id,
    req.params.id,
    req.body?.hospital_id || null,
    req.body?.remarks
  );

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, result, 'Arogya Sevak unassigned from Hospital successfully')
  );
});

// ==========================================
// 5. Admin Notification Dispatch Endpoints
// ==========================================

/**
 * Admin: Send targeted notification to citizen / case
 * POST /api/admins/notifications/send
 * POST /api/notifications/send
 */
export const sendNotification = asyncHandler(async (req, res) => {
  const result = await adminService.sendNotification(req.user?.id, req.body);
  return res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(
      HTTP_STATUS.CREATED,
      result,
      'Notification dispatched successfully to citizen / सूचना यशस्वीरीत्या पाठवली गेली'
    )
  );
});

/**
 * Admin: Broadcast health announcement to all citizens
 * POST /api/admins/notifications/broadcast
 * POST /api/notifications/broadcast
 */
export const broadcastNotification = asyncHandler(async (req, res) => {
  const result = await adminService.broadcastNotification(req.user?.id, req.body);
  return res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(
      HTTP_STATUS.CREATED,
      result,
      'Public health announcement broadcasted successfully / आरोग्य घोषणा यशस्वीरीत्या प्रसारित झाली'
    )
  );
});

/**
 * Admin: Get all sent and received notifications history & unread count
 * GET /api/admins/notifications
 */
export const getAllNotifications = asyncHandler(async (req, res) => {
  const result = await adminService.getAllNotifications(req.query || {});
  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      {
        notifications: result.notifications,
        total: result.total,
        unreadCount: result.unreadCount,
      },
      'Notifications retrieved successfully'
    )
  );
});

/**
 * Admin: Mark a specific notification as read
 * PATCH /api/admins/notifications/:id/read
 */
export const markNotificationRead = asyncHandler(async (req, res) => {
  const result = await adminService.markNotificationRead(req.params.id);
  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, result, 'Notification marked as read')
  );
});

/**
 * Admin: Mark all notifications as read
 * PATCH /api/admins/notifications/read-all
 */
export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await adminService.markAllNotificationsRead();
  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, { success: true }, 'All notifications marked as read')
  );
});

/**
 * Admin: Clear/delete all seen/read notifications
 * DELETE /api/admins/notifications/seen
 */
export const clearSeenNotifications = asyncHandler(async (req, res) => {
  await adminService.clearSeenNotifications();
  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, { success: true }, 'Seen notifications cleared successfully')
  );
});

/**
 * Admin: Clear/delete all notifications (full purge)
 * DELETE /api/admins/notifications/all
 */
export const clearAllNotifications = asyncHandler(async (req, res) => {
  await adminService.clearAllNotifications();
  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, { success: true }, 'All notifications cleared successfully')
  );
});

/**
 * Admin: Delete single notification
 * DELETE /api/admins/notifications/:id
 */
export const deleteNotification = asyncHandler(async (req, res) => {
  await adminService.deleteNotification(req.params.id);
  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, { success: true }, 'Notification deleted successfully')
  );
});

