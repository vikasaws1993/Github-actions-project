import crypto from 'crypto';
import { ReferralModel } from '../models/referral.model.js';
import { UserModel } from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.js';
import { HTTP_STATUS } from '../constants/index.js';
import { logger } from '../utils/logger.js';

/**
 * Service handling Referral logic:
 * - Tracking first-time citizen registration attribution
 * - Referral code generation & validation
 * - User referral stats & Admin leaderboard
 */
export class ReferralService {
  /**
   * Generate a unique 6-character alphanumeric referral code prefixed with 'AM-'
   * E.g. 'AM-K7W29A'
   */
  async generateUniqueReferralCode() {
    let code;
    let exists = true;
    let attempts = 0;

    while (exists && attempts < 10) {
      const randomPart = crypto.randomBytes(4).toString('hex').slice(0, 6).toUpperCase();
      code = `AM-${randomPart}`;
      const existingUser = await UserModel.findByReferralCode(code);
      if (!existingUser) {
        exists = false;
      }
      attempts++;
    }

    return code;
  }

  /**
   * Get or initialize a user's unique referral code
   * @param {string} userId
   */
  async getOrCreateUserReferralCode(userId) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found / वापरकर्ता सापडला नाही');
    }

    if (user.referral_code) {
      return {
        userId: user.id,
        referralCode: user.referral_code,
        shareText: `आरोग्यमित्र (ArogyaMitra) ॲप डाउनलोड करा आणि मोफत आरोग्य योजना व सहाय्य मिळवा! माझा रेफरल कोड वापरा: ${user.referral_code}`,
      };
    }

    const newCode = await this.generateUniqueReferralCode();
    await UserModel.updateReferralCode(userId, newCode);
    logger.info(`Assigned new referral code ${newCode} to user ${userId}`);

    return {
      userId: user.id,
      referralCode: newCode,
      shareText: `आरोग्यमित्र (ArogyaMitra) ॲप डाउनलोड करा आणि मोफत आरोग्य योजना व सहाय्य मिळवा! माझा रेफरल कोड वापरा: ${newCode}`,
    };
  }

  /**
   * Validate a referral code to confirm it is authentic and active
   * @param {string} code
   */
  async validateReferralCode(code) {
    if (!code || typeof code !== 'string') {
      return { valid: false, message: 'Referral code is required / रेफरल कोड आवश्यक आहे' };
    }

    const cleanCode = code.trim().toUpperCase();
    const referrer = await UserModel.findByReferralCode(cleanCode);

    if (!referrer) {
      return {
        valid: false,
        message: 'Invalid referral code / अवैध रेफरल कोड',
      };
    }

    if (referrer.status === 'BLOCKED') {
      return {
        valid: false,
        message: 'This referral code is no longer active / हा रेफरल कोड सक्रिय नाही',
      };
    }

    return {
      valid: true,
      referralCode: cleanCode,
      referrerName: referrer.full_name,
      message: `Valid code from ${referrer.full_name}`,
    };
  }

  /**
   * Attribute first-time citizen registration to a referrer.
   * STRICT CONSTRAINT: Only for first-time citizen registration.
   * 
   * @param {Object} params
   * @param {string} params.referralCode - Referral code submitted with registration
   * @param {string} params.referredUserId - UUID of the newly registered citizen
   */
  async processRegistrationReferral({ referralCode, referredUserId }) {
    if (!referralCode || !referredUserId) {
      return null;
    }

    const cleanCode = referralCode.trim().toUpperCase();

    // 1. Verify referrer exists
    const referrer = await UserModel.findByReferralCode(cleanCode);
    if (!referrer) {
      logger.warn(`Referral failed: Code ${cleanCode} not found in system.`);
      return null;
    }

    // 2. Prevent self-referral
    if (referrer.id === referredUserId) {
      logger.warn(`Referral failed: User ${referredUserId} attempted to refer themselves.`);
      return null;
    }

    // 3. Prevent duplicate attribution (a citizen can only be referred once ever)
    const existingReferral = await ReferralModel.findByReferredUserId(referredUserId);
    if (existingReferral) {
      logger.info(`User ${referredUserId} was already attributed via referral ${existingReferral.id}. Skipping.`);
      return existingReferral;
    }

    // 4. Record the referral
    const newReferral = await ReferralModel.create({
      referrer_user_id: referrer.id,
      referred_user_id: referredUserId,
      referral_code: cleanCode,
      status: 'REGISTERED',
    });

    logger.info(
      `[Referral Attributed] Referrer: ${referrer.full_name} (${referrer.id}) -> Referred Citizen User: ${referredUserId} [Code: ${cleanCode}]`
    );

    return newReferral;
  }

  /**
   * Get referral performance statistics for a specific user
   * @param {string} userId
   * @param {Object} [pagination]
   */
  async getUserReferralStats(userId, { limit = 20, offset = 0 } = {}) {
    const codeInfo = await this.getOrCreateUserReferralCode(userId);
    const stats = await ReferralModel.getStatsByReferrerId(userId);
    const referrals = await ReferralModel.findByReferrerId(userId, { limit, offset });

    return {
      referralCode: codeInfo.referralCode,
      shareText: codeInfo.shareText,
      totalReferrals: stats.total_referrals,
      registeredCount: stats.registered_count,
      activeCount: stats.active_count,
      referrals,
      pagination: {
        limit,
        offset,
        count: referrals.length,
      },
    };
  }

  /**
   * Get system-wide referral overview metrics (for Admin dashboard)
   */
  async getAdminOverview() {
    return ReferralModel.getSystemOverview();
  }

  /**
   * Get top referrers leaderboard (for Admin / public gamification)
   * @param {Object} [options]
   * @param {number} [options.limit=10]
   * @param {number} [options.offset=0]
   */
  async getLeaderboard({ limit = 10, offset = 0 } = {}) {
    return ReferralModel.getLeaderboard({ limit, offset });
  }
}

export const referralService = new ReferralService();
export default referralService;
