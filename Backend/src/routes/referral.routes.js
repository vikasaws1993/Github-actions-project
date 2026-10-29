import { Router } from 'express';
import {
  getMyReferralCode,
  getMyReferralStats,
  validateReferralCode,
  getAdminOverview,
  getLeaderboard,
} from '../controllers/referral.controller.js';
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';
import { USER_ROLES } from '../constants/index.js';

const router = Router();

// Public route: Validate referral code before submitting registration
router.get('/validate/:code', validateReferralCode);

// Public route: Gamified leaderboard of top community referrers
router.get('/leaderboard', getLeaderboard);

// Authenticated user routes: View own code & statistics
router.get('/my-code', verifyJWT, getMyReferralCode);
router.get('/my-stats', verifyJWT, getMyReferralStats);

// Admin-only route: Platform-wide overview & metrics
router.get('/admin/overview', verifyJWT, authorizeRoles(USER_ROLES.ADMIN), getAdminOverview);

export default router;
