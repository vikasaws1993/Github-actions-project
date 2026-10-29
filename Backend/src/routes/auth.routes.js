import { Router } from 'express';
import {
  login,
  sendOtp,
  verifyOtp,
  initiateAuth,
  setPassword,
  registerPassword,
  refreshToken,
  logout,
  changePassword,
} from '../controllers/auth.controller.js';
import { registerFirstAdmin } from '../controllers/admin.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { loginRateLimiter } from '../middlewares/rateLimiter.middleware.js';
import { verifyAccessToken } from '../utils/jwt.util.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import {
  loginSchema,
  sendOtpSchema,
  verifyOtpSchema,
  initiateAuthSchema,
  setPasswordSchema,
  registerPasswordSchema,
  refreshTokenSchema,
  logoutSchema,
  changePasswordSchema,
} from '../validations/auth.validation.js';

const router = Router();

// Optional JWT extraction for logout: allows logging out even if access token is already expired
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = verifyAccessToken(token);
    } catch (_) {
      // Ignore token expiry/error on logout
    }
  }
  next();
};

// POST /api/auth/initiate - Role-based check: verifies Admin/Sevak registration & determines if password exists or OTP needed
router.post('/initiate', validate(initiateAuthSchema), initiateAuth);

// POST /api/auth/verify-otp - Verify 4-digit OTP
router.post('/verify-otp', validate(verifyOtpSchema), verifyOtp);

// POST /api/auth/set-password - Set first-time password after OTP verification
router.post('/set-password', validate(setPasswordSchema), setPassword);

// POST /api/auth/change-password - Change password for authenticated session
router.post('/change-password', verifyJWT, validate(changePasswordSchema), changePassword);

// POST /api/auth/reset-password - Reset password after OTP verification (Forgot Password flow)
router.post('/reset-password', validate(setPasswordSchema), setPassword);

// POST /api/auth/register-password - Register user with password after OTP verification
router.post('/register-password', validate(registerPasswordSchema), registerPassword);

// POST /api/auth/register-first-admin - Register initial first-time Admin (Bootstrap)
router.post('/register-first-admin', registerFirstAdmin);
router.post('/bootstrap-admin', registerFirstAdmin);

// POST /api/auth/send-otp - Send/Resend OTP
router.post('/send-otp', validate(sendOtpSchema), sendOtp);

// POST /api/auth/login - Login returning user with password (Rate-limited for failed attempts)
router.post('/login', loginRateLimiter, validate(loginSchema), login);

// POST /api/auth/refresh - Refresh access token using valid refresh token
router.post('/refresh', validate(refreshTokenSchema), refreshToken);

// POST /api/auth/refresh-token - Alias for refresh endpoint
router.post('/refresh-token', validate(refreshTokenSchema), refreshToken);

// POST /api/auth/logout - Invalidate refresh token and logout session
router.post('/logout', optionalAuth, validate(logoutSchema), logout);

export default router;




