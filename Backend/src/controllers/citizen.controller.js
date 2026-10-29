import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';
import { citizenService } from '../services/citizen.service.js';
import {
  validateCitizenRegistration,
  citizenSendOtpSchema,
  citizenVerifyOtpSchema,
} from '../validations/citizen.validation.js';

/**
 * Send 6-digit OTP to Citizen mobile number
 * POST /api/citizens/send-otp
 */
export const sendCitizenOtp = asyncHandler(async (req, res) => {
  const mobileInput = req.body?.mobileNumber || req.body?.phoneNumber || req.body?.mobile;
  const validation = citizenSendOtpSchema.safeParse({ mobileNumber: mobileInput });
  if (!validation.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: validation.error.errors[0]?.message || 'Validation failed',
      isRegistered: false,
      isMobileRegistered: false,
      otpSent: false,
      data: {
        isRegistered: false,
        isMobileRegistered: false,
        otpSent: false,
      },
      errors: validation.error.errors,
    });
  }

  const result = await citizenService.sendCitizenOtp(validation.data.mobileNumber);
  
  if (result.isAllowedOnMobile === false) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      statusCode: HTTP_STATUS.FORBIDDEN,
      message: result.message,
      isRegistered: true,
      isMobileRegistered: true,
      role: result.role,
      isAllowedOnMobile: false,
      otpSent: false,
      data: result,
    });
  }

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    statusCode: HTTP_STATUS.OK,
    message: result.message,
    isRegistered: Boolean(result.isRegistered),
    isMobileRegistered: Boolean(result.isRegistered),
    role: result.role,
    otpSent: Boolean(result.otpSent),
    otp: result.otp,
    data: result,
  });
});

/**
 * Verify 6-digit OTP and login to citizen or Sevak dashboard
 * POST /api/citizens/verify-otp
 * POST /api/citizens/login
 * POST /api/mob/verify-otp
 */
export const verifyCitizenOtp = asyncHandler(async (req, res) => {
  const mobileInput = req.body?.mobileNumber || req.body?.phoneNumber || req.body?.mobile;
  const otpInput = req.body?.otp;

  const validation = citizenVerifyOtpSchema.safeParse({
    mobileNumber: mobileInput,
    otp: otpInput,
  });

  if (!validation.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: validation.error.errors[0]?.message || 'Validation failed',
      isOtpValid: false,
      otpVerified: false,
      isRegistered: false,
      isMobileRegistered: false,
      data: {
        isOtpValid: false,
        otpVerified: false,
        isRegistered: false,
        isMobileRegistered: false,
      },
      errors: validation.error.errors,
    });
  }

  const result = await citizenService.verifyCitizenOtpAndLogin(validation.data);
  const statusCode = result.status === 'ADMIN_PROHIBITED'
    ? HTTP_STATUS.FORBIDDEN
    : result.isOtpValid !== false
    ? HTTP_STATUS.OK
    : (result.statusCode || HTTP_STATUS.BAD_REQUEST);

  return res.status(statusCode).json({
    success: statusCode < 400,
    statusCode,
    message: result.message,
    isOtpValid: Boolean(result.isOtpValid !== false),
    otpVerified: Boolean(result.otpVerified !== false),
    isRegistered: Boolean(result.isRegistered),
    isMobileRegistered: Boolean(result.isRegistered),
    role: result.role,
    data: result,
  });
});

/**
 * Register or update citizen profile
 * POST /api/citizens/register
 */
export const registerCitizen = asyncHandler(async (req, res) => {
  // 1. Validate request body against bilingual Zod schema
  const validation = validateCitizenRegistration(req.body);
  if (!validation.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: validation.error,
      errors: validation.errors,
    });
  }

  // 2. Delegate to CitizenService (passes authenticated user if Bearer token present)
  const citizenProfile = await citizenService.registerCitizen(validation.data, req.user);

  return res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(
      HTTP_STATUS.CREATED,
      citizenProfile,
      'नागरिक नोंदणी यशस्वीरीत्या पूर्ण झाली / Citizen registered successfully'
    )
  );
});

/**
 * Get Citizen Profile for Current User or specified user_id
 * GET /api/citizens/profile
 * GET /api/citizens/user/:userId
 */
export const getCitizenProfile = asyncHandler(async (req, res) => {
  const targetUserId = req.params.userId || req.user?.id;
  if (!targetUserId) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: 'User ID is required / वापरकर्ता आयडी आवश्यक आहे',
    });
  }

  const profile = await citizenService.getCitizenByUserId(targetUserId);
  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, profile, 'Citizen profile retrieved successfully')
  );
});

/**
 * Get Citizen by Citizen UUID
 * GET /api/citizens/:id
 */
export const getCitizenById = asyncHandler(async (req, res) => {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_REGEX.test(req.params.id)) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: `Invalid citizen ID format "${req.params.id}". If you are trying to register a citizen, please change the HTTP method from GET to POST.`,
    });
  }

  const profile = await citizenService.getCitizenById(req.params.id);
  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, profile, 'Citizen profile retrieved successfully')
  );
});

/**
 * Get Citizen by Mobile Number
 * GET /api/citizens/mobile/:mobile
 */
export const getCitizenByMobile = asyncHandler(async (req, res) => {
  const profile = await citizenService.getCitizenByMobile(req.params.mobile);
  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, profile, 'Citizen profile retrieved successfully')
  );
});

/**
 * Get Citizen Alerts & Admin Notifications
 * GET /api/citizens/alerts
 * GET /api/mob/alerts
 */
export const getCitizenAlerts = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.query.userId || req.query.user_id;
  const mobile = req.user?.mobile || req.query.mobile || req.query.phoneNumber;

  const alerts = await citizenService.getCitizenAlerts(userId, mobile);
  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      {
        alerts,
        unreadCount: alerts.filter((a) => !a.isRead).length,
        total: alerts.length,
      },
      'Citizen alerts retrieved successfully / प्रशासकीय सूचना यशस्वीरीत्या प्राप्त झाल्या'
    )
  );
});

