import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { HTTP_STATUS } from '../constants/index.js';
import { referralService } from '../services/referral.service.js';

/**
 * Get current authenticated user's referral code and share info
 * GET /api/referrals/my-code
 */
export const getMyReferralCode = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Authentication required / प्रमाणीकरण आवश्यक आहे');
  }

  const result = await referralService.getOrCreateUserReferralCode(userId);
  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, result, 'Referral code fetched successfully')
  );
});

/**
 * Get current authenticated user's referral statistics and list of referred citizens
 * GET /api/referrals/my-stats
 */
export const getMyReferralStats = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Authentication required / प्रमाणीकरण आवश्यक आहे');
  }

  const limit = Math.max(1, parseInt(req.query.limit, 10) || 20);
  const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);

  const stats = await referralService.getUserReferralStats(userId, { limit, offset });
  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, stats, 'Referral statistics retrieved successfully')
  );
});

/**
 * Validate a referral code during citizen onboarding
 * GET /api/referrals/validate/:code
 */
export const validateReferralCode = asyncHandler(async (req, res) => {
  const { code } = req.params;
  const result = await referralService.validateReferralCode(code);

  if (!result.valid) {
    return res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, result, result.message)
    );
  }

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, result, 'Referral code is valid')
  );
});

/**
 * Admin: Get overall system referral metrics
 * GET /api/referrals/admin/overview
 */
export const getAdminOverview = asyncHandler(async (req, res) => {
  const overview = await referralService.getAdminOverview();
  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, overview, 'System referral overview fetched successfully')
  );
});

/**
 * Leaderboard: Get top referrers
 * GET /api/referrals/leaderboard
 */
export const getLeaderboard = asyncHandler(async (req, res) => {
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);

  const leaderboard = await referralService.getLeaderboard({ limit, offset });
  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, leaderboard, 'Referral leaderboard fetched successfully')
  );
});
