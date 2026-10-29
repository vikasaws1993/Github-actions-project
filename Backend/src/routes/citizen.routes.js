import { Router } from 'express';
import {
  registerCitizen,
  getCitizenProfile,
  getCitizenById,
  getCitizenByMobile,
  sendCitizenOtp,
  verifyCitizenOtp,
  getCitizenAlerts,
} from '../controllers/citizen.controller.js';
import { verifyAccessToken } from '../utils/jwt.util.js';
import {
  otpVerifyRateLimiter,
  otpRequestRateLimiter,
} from '../middlewares/rateLimiter.middleware.js';

const router = Router();

/**
 * Optional Auth Middleware:
 * If a valid Bearer token is provided, attaches req.user.
 * If not provided, still proceeds so that Postman requests with user_id or mobileNumber in body work seamlessly.
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = verifyAccessToken(token);
    } catch (_) {
      // Continue without token
    }
  }
  next();
};

// POST /api/citizens/send-otp - Send 6-digit OTP to Citizen mobile number (Rate limited against flooding)
router.post('/send-otp', otpRequestRateLimiter, sendCitizenOtp);

// POST /api/citizens/verify-otp - Verify 6-digit OTP and login to citizen dashboard (Brute-force protected)
router.post('/verify-otp', otpVerifyRateLimiter, verifyCitizenOtp);

// POST /api/citizens/login - Alias for OTP login (Brute-force protected)
router.post('/login', otpVerifyRateLimiter, verifyCitizenOtp);

// POST /api/citizens/register - Citizen Registration (Marathi / English data supported)
router.post('/register', optionalAuth, registerCitizen);

// GET /api/citizens/alerts - Get citizen alerts & admin notifications
router.get('/alerts', optionalAuth, getCitizenAlerts);

// GET /api/citizens/profile - Get profile of authenticated citizen
router.get('/profile', optionalAuth, getCitizenProfile);

// GET /api/citizens/mobile/:mobile - Get profile by mobile number
router.get('/mobile/:mobile', getCitizenByMobile);

// GET /api/citizens/user/:userId - Get profile by user_id
router.get('/user/:userId', getCitizenProfile);

// GET /api/citizens/:id - Get profile by citizen UUID
router.get('/:id', getCitizenById);

export default router;
