import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';
import { authService } from '../services/auth.service.js';

/**
 * Login User Controller
 * Handles username/email/mobile and password authentication.
 */
export const login = asyncHandler(async (req, res) => {
  const { identifier, mobileNumber, mobile, email, password } = req.body;
  const loginId = identifier || mobileNumber || mobile || email;
  const result = await authService.loginUser(loginId, password);

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, result, 'User logged in successfully'));
});
/**
 * Send OTP Controller
 * POST /api/auth/send-otp
 */
export const sendOtp = asyncHandler(async (req, res) => {
  const { mobileNumber } = req.body;
  const result = await authService.sendLoginOtp(mobileNumber);

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, result, result.message));
});

/**
 * Verify OTP Controller
 * POST /api/auth/verify-otp
 */
export const verifyOtp = asyncHandler(async (req, res) => {
  const { mobileNumber, otp } = req.body;
  const result = await authService.verifyLoginOtp(mobileNumber, otp);

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, result, 'OTP verified successfully'));
});

/**
 * Initiate Role-Based Authentication Controller
 * POST /api/auth/initiate
 * Verifies mobile is registered as Admin or Arogya Sevak.
 * Returns PASSWORD_REQUIRED if password already set, or FIRST_TIME_OTP if not.
 */
export const initiateAuth = asyncHandler(async (req, res) => {
  const { mobileNumber } = req.body;
  const result = await authService.initiateAuth(mobileNumber);

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, result, result.message));
});

/**
 * Set First-Time Password Controller
 * POST /api/auth/set-password
 * Sets user's permanent password after OTP verification and logs them in.
 */
export const setPassword = asyncHandler(async (req, res) => {
  const { mobileNumber, password } = req.body;
  const result = await authService.setFirstTimePassword({ mobileNumber, password });

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, result, 'Password set successfully. Logged in.'));
});

/**
 * Register with Password Controller
 * POST /api/auth/register-password
 */
export const registerPassword = asyncHandler(async (req, res) => {
  const { mobileNumber, password, full_name } = req.body;
  const result = await authService.registerWithPassword({ mobileNumber, password, full_name });

  return res
    .status(HTTP_STATUS.CREATED)
    .json(new ApiResponse(HTTP_STATUS.CREATED, result, 'User registered and logged in successfully.'));
});

/**
 * Refresh Session Token Controller
 * POST /api/auth/refresh (and /api/auth/refresh-token)
 * Validates the refresh token and issues a new access token without requiring re-login.
 */
export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.body?.refreshToken || req.cookies?.refreshToken;
  const result = await authService.refreshSession(token);

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, result, 'Session refreshed successfully'));
});

/**
 * Logout User Controller
 * POST /api/auth/logout
 * Invalidates the refresh token so it cannot be reused.
 */
export const logout = asyncHandler(async (req, res) => {
  const token = req.body?.refreshToken || req.cookies?.refreshToken;
  const userId = req.user?.id;

  const result = await authService.logoutUser(token, userId);

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, result, 'Logged out successfully'));
});

/**
 * Change Password Controller (Authenticated)
 * POST /api/auth/change-password
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const result = await authService.changePassword(req.user?.id, {
    currentPassword,
    newPassword,
  });

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, result, result.message));
});




