import { Router } from 'express';
import {
  sendCitizenOtp,
  verifyCitizenOtp,
  registerCitizen,
  getCitizenProfile,
  getCitizenById,
  getCitizenByMobile,
  getCitizenAlerts,
} from '../controllers/citizen.controller.js';
import { initiateAuth, login } from '../controllers/auth.controller.js';
import {
  sendDirectNotification,
  broadcastNotification,
  getCitizenNotifications,
  markNotificationRead,
  getUnreadNotificationCount,
} from '../controllers/notification.controller.js';
import { verifyAccessToken } from '../utils/jwt.util.js';
import {
  otpVerifyRateLimiter,
  otpRequestRateLimiter,
  loginRateLimiter,
} from '../middlewares/rateLimiter.middleware.js';

const router = Router();

/**
 * Optional Auth Middleware for Mobile APIs:
 * Extracts Bearer token if present to attach user context, but allows unauthenticated access for registration/OTP.
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

// ====================================================
// Mobile Dedicated Endpoints (/api/mob/...)
// ====================================================

// GET /api/mob/alerts - Citizen Alerts & Admin Notifications
router.get('/alerts', optionalAuth, getCitizenAlerts);

// POST /api/mob/notifications/send - Trigger notification from Admin to Citizen
router.post('/notifications/send', optionalAuth, sendDirectNotification);

// POST /api/mob/notifications/broadcast - Broadcast notice to all citizens
router.post('/notifications/broadcast', optionalAuth, broadcastNotification);

// POST /api/mob/send-otp & /api/mob/auth/send-otp - Request OTP for Mobile Login
router.post('/send-otp', otpRequestRateLimiter, sendCitizenOtp);
router.post('/auth/send-otp', otpRequestRateLimiter, sendCitizenOtp);

// POST /api/mob/verify-otp & /api/mob/auth/verify-otp - Verify OTP for Mobile Login
router.post('/verify-otp', otpVerifyRateLimiter, verifyCitizenOtp);
router.post('/auth/verify-otp', otpVerifyRateLimiter, verifyCitizenOtp);

// POST /api/mob/login & /api/mob/auth/login - Mobile Login (OTP / Password)
router.post('/login', otpVerifyRateLimiter, verifyCitizenOtp);
router.post('/auth/login', loginRateLimiter, login);

// POST /api/mob/register & /api/mob/auth/register - Mobile Citizen Registration
router.post('/register', optionalAuth, registerCitizen);
router.post('/auth/register', optionalAuth, registerCitizen);

// POST /api/mob/initiate & /api/mob/auth/initiate - Mobile Auth Initiation
router.post('/initiate', initiateAuth);
router.post('/auth/initiate', initiateAuth);

// GET /api/mob/profile - Mobile User Profile
router.get('/profile', optionalAuth, getCitizenProfile);

// ====================================================
// Mobile Citizen Alerts & Notifications (/api/mob/notifications)
// ====================================================

// GET /api/mob/notifications & /api/mob/notifications/my - Retrieve Citizen alerts + Broadcasts
router.get('/notifications', optionalAuth, getCitizenNotifications);
router.get('/notifications/my', optionalAuth, getCitizenNotifications);

// GET /api/mob/notifications/unread-count - Get unread count
router.get('/notifications/unread-count', optionalAuth, getUnreadNotificationCount);

// PATCH & POST /api/mob/notifications/:id/read - Mark notification as read
router.patch('/notifications/:id/read', optionalAuth, markNotificationRead);
router.post('/notifications/:id/read', optionalAuth, markNotificationRead);

// POST /api/mob/notifications/send - Direct alert (alias)
router.post('/notifications/send', optionalAuth, sendDirectNotification);

// POST /api/mob/notifications/broadcast - Broadcast alert (alias)
router.post('/notifications/broadcast', optionalAuth, broadcastNotification);

// GET /api/mob/mobile/:mobile - Get Citizen by Mobile
router.get('/mobile/:mobile', getCitizenByMobile);

// GET /api/mob/:id - Get Citizen by ID
router.get('/:id', getCitizenById);

export default router;
