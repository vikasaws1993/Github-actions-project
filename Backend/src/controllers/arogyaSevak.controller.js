import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';
import { arogyaSevakService } from '../services/arogyaSevak.service.js';
import {
  validateCreateArogyaSevak,
  validateUpdateArogyaSevak,
  sevakSendOtpSchema,
  sevakVerifyOtpSchema,
} from '../validations/arogyaSevak.validation.js';

/**
 * Send 6-digit OTP for Arogya Sevak Mobile App Login
 * POST /api/arogya-sevaks/auth/send-otp
 */
export const sendSevakOtp = asyncHandler(async (req, res) => {
  const validation = sevakSendOtpSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: validation.error.errors[0]?.message || 'Validation failed',
      isMobileRegistered: false,
      otpSent: false,
      data: {
        isMobileRegistered: false,
        otpSent: false,
      },
      errors: validation.error.errors,
    });
  }

  const result = await arogyaSevakService.sendSevakLoginOtp(validation.data.mobileNumber);
  const statusCode = result.isMobileRegistered ? HTTP_STATUS.OK : HTTP_STATUS.NOT_FOUND;
  return res.status(statusCode).json({
    success: Boolean(result.isMobileRegistered && result.otpSent),
    statusCode,
    message: result.message,
    isMobileRegistered: Boolean(result.isMobileRegistered),
    otpSent: Boolean(result.otpSent),
    data: result,
  });
});

/**
 * Verify 6-digit OTP and login Arogya Sevak to mobile dashboard
 * POST /api/arogya-sevaks/auth/verify-otp
 * POST /api/arogya-sevaks/auth/login
 */
export const verifySevakOtp = asyncHandler(async (req, res) => {
  const validation = sevakVerifyOtpSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: validation.error.errors[0]?.message || 'Validation failed',
      isOtpValid: false,
      otpVerified: false,
      isMobileRegistered: false,
      data: {
        isOtpValid: false,
        otpVerified: false,
        isMobileRegistered: false,
      },
      errors: validation.error.errors,
    });
  }

  const result = await arogyaSevakService.verifySevakOtpAndLogin(validation.data);
  const statusCode = result.isOtpValid ? HTTP_STATUS.OK : (result.statusCode || HTTP_STATUS.BAD_REQUEST);
  return res.status(statusCode).json({
    success: Boolean(result.isOtpValid),
    statusCode,
    message: result.message,
    isOtpValid: Boolean(result.isOtpValid),
    otpVerified: Boolean(result.otpVerified),
    isMobileRegistered: Boolean(result.isMobileRegistered),
    data: result,
  });
});

/**
 * Create a new Arogya Sevak profile
 * POST /api/arogya-sevaks
 */
export const createArogyaSevak = asyncHandler(async (req, res) => {
  const validation = validateCreateArogyaSevak(req.body);
  if (!validation.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: validation.error,
      errors: validation.errors,
    });
  }

  const sevak = await arogyaSevakService.createArogyaSevak(validation.data);

  return res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(HTTP_STATUS.CREATED, sevak, 'Arogya Sevak profile created successfully')
  );
});

/**
 * Get Arogya Sevak by UUID
 * GET /api/arogya-sevaks/:id
 */
export const getArogyaSevakById = asyncHandler(async (req, res) => {
  const targetId = (!req.params.id || req.params.id === 'me' || req.params.id === 'profile')
    ? (req.user?.sevakId || req.user?.id)
    : req.params.id;

  const sevak = await arogyaSevakService.getArogyaSevakById(targetId);
  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, sevak, 'Arogya Sevak profile retrieved successfully')
  );
});

/**
 * Get Arogya Sevak by User UUID
 * GET /api/arogya-sevaks/user/:userId
 */
export const getArogyaSevakByUserId = asyncHandler(async (req, res) => {
  const sevak = await arogyaSevakService.getArogyaSevakByUserId(req.params.userId);
  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, sevak, 'Arogya Sevak profile retrieved successfully')
  );
});

/**
 * Get Arogya Sevak by Employee Code
 * GET /api/arogya-sevaks/code/:code
 */
export const getArogyaSevakByCode = asyncHandler(async (req, res) => {
  const sevak = await arogyaSevakService.getArogyaSevakByEmployeeCode(req.params.code);
  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, sevak, 'Arogya Sevak profile retrieved successfully')
  );
});

/**
 * Update Arogya Sevak profile
 * PUT /api/arogya-sevaks/:id
 * PATCH /api/arogya-sevaks/:id
 */
export const updateArogyaSevak = asyncHandler(async (req, res) => {
  let sevakId = req.params.id || req.body.id || req.body.sevak_id;
  if (!sevakId || sevakId === 'me' || sevakId === 'profile' || sevakId === 'my-profile') {
    sevakId = req.user?.sevakId || req.user?.id;
  }

  if (!sevakId) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Arogya Sevak ID is required',
    });
  }

  // Permission check: Sevaks can only update their own profile; Admins can update any
  if (req.user && req.user.role !== 'ADMIN') {
    const isSelfSevak = req.user.sevakId === sevakId || req.user.id === sevakId;
    if (!isSelfSevak) {
      const existing = await arogyaSevakService.getArogyaSevakById(sevakId);
      if (existing.user_id !== req.user.id && existing.id !== req.user.sevakId) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: 'Access denied: You can only update your own Arogya Sevak profile',
        });
      }
    }
  }

  const validation = validateUpdateArogyaSevak(req.body);
  if (!validation.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: validation.error,
      errors: validation.errors,
    });
  }

  const updatedSevak = await arogyaSevakService.updateArogyaSevak(
    sevakId,
    validation.data,
    req.user?.id
  );

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      updatedSevak,
      'Arogya Sevak profile updated successfully'
    )
  );
});

/**
 * Assign / Update Backup Temporary Sevak (Admin only)
 * POST /api/arogya-sevaks/:id/backup
 */
export const assignBackupSevak = asyncHandler(async (req, res) => {
  const primarySevakId = req.params.id;
  const { backup_name, name, backup_mobile, mobile, reason, hospital_id } = req.body;

  const backupName = backup_name || name;
  const backupMobile = backup_mobile || mobile;

  if (!backupName || !backupMobile) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Backup Sevak name and 10-digit mobile number are required',
    });
  }

  const result = await arogyaSevakService.assignBackupSevak({
    primary_sevak_id: primarySevakId,
    backup_name: backupName,
    backup_mobile: backupMobile,
    reason: reason || 'Temporary relief coverage for patient cases',
    hospital_id: hospital_id || null,
    assigned_by: req.user?.id || null,
  });

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, result, 'Backup Sevak assigned successfully')
  );
});

/**
 * Get active Backup Sevak for a primary Sevak
 * GET /api/arogya-sevaks/:id/backup
 */
export const getActiveBackupSevak = asyncHandler(async (req, res) => {
  const primarySevakId = req.params.id;
  const result = await arogyaSevakService.getActiveBackupSevak(primarySevakId);

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, result || null, 'Backup Sevak retrieved successfully')
  );
});

/**
 * Remove / Deactivate Backup Sevak (Admin only)
 * DELETE /api/arogya-sevaks/:id/backup
 */
export const removeBackupSevak = asyncHandler(async (req, res) => {
  const primarySevakId = req.params.id;
  const result = await arogyaSevakService.removeBackupSevak(primarySevakId);

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, result, 'Backup Sevak removed successfully')
  );
});

