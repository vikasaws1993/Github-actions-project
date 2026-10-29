import { query } from '../config/db.js';
import crypto from 'crypto';

/**
 * SQL DDL to create the referrals table:
 * 
 * referrals
 * -----------------------------------------------------------
 * id (PK)              UUID
 * referrer_user_id     UUID REFERENCES public.users(id) ON DELETE CASCADE
 * referred_user_id     UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE
 * referral_code        VARCHAR(50) NOT NULL
 * status               VARCHAR(50) NOT NULL DEFAULT 'REGISTERED'
 * created_at           TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
 * updated_at           TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
 */
export const CREATE_REFERRALS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    referred_user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    referral_code VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'REGISTERED' CHECK (status IN ('REGISTERED', 'ACTIVE', 'COMPLETED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_user_id);
  CREATE INDEX IF NOT EXISTS idx_referrals_referred ON public.referrals(referred_user_id);
  CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(referral_code);
  CREATE INDEX IF NOT EXISTS idx_referrals_created ON public.referrals(created_at DESC);
`;

// In-memory fallback map for environments without DB connection
const inMemoryReferrals = new Map();

/**
 * Referral Model / DAO
 */
export const ReferralModel = {
  /**
   * Ensure referrals table exists
   */
  async createTable() {
    return query(CREATE_REFERRALS_TABLE_SQL);
  },

  /**
   * Record a new referral
   * @param {Object} data
   * @param {string} data.referrer_user_id - User UUID who shared the code
   * @param {string} data.referred_user_id - New user UUID who used the code
   * @param {string} data.referral_code - The code that was redeemed
   * @param {string} [data.status='REGISTERED']
   */
  async create({
    referrer_user_id,
    referred_user_id,
    referral_code,
    status = 'REGISTERED',
  }) {
    const insertSQL = `
      INSERT INTO public.referrals (
        referrer_user_id,
        referred_user_id,
        referral_code,
        status,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, referrer_user_id, referred_user_id, referral_code, status, created_at, updated_at;
    `;

    try {
      const res = await query(insertSQL, [
        referrer_user_id,
        referred_user_id,
        referral_code.trim().toUpperCase(),
        status,
      ]);
      return res.rows[0];
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        const record = {
          id: crypto.randomUUID(),
          referrer_user_id,
          referred_user_id,
          referral_code: referral_code.trim().toUpperCase(),
          status,
          created_at: new Date(),
          updated_at: new Date(),
        };
        inMemoryReferrals.set(record.id, record);
        return record;
      }
      throw dbErr;
    }
  },

  /**
   * Find referral record by the referred user's UUID (Enforces 1 referral per citizen)
   * @param {string} referredUserId
   */
  async findByReferredUserId(referredUserId) {
    try {
      const res = await query(
        `SELECT id, referrer_user_id, referred_user_id, referral_code, status, created_at, updated_at
         FROM public.referrals
         WHERE referred_user_id = $1
         LIMIT 1`,
        [referredUserId]
      );
      return res.rows[0] || null;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        for (const item of inMemoryReferrals.values()) {
          if (item.referred_user_id === referredUserId) return item;
        }
        return null;
      }
      throw dbErr;
    }
  },

  /**
   * List all citizens referred by a specific referrer with pagination
   * @param {string} referrerUserId
   * @param {Object} [options]
   * @param {number} [options.limit=50]
   * @param {number} [options.offset=0]
   */
  async findByReferrerId(referrerUserId, { limit = 50, offset = 0 } = {}) {
    const listSQL = `
      SELECT 
        r.id AS referral_id,
        r.referral_code,
        r.status,
        r.created_at AS referred_at,
        u.id AS referred_user_id,
        u.full_name AS referred_name,
        CONCAT(SUBSTRING(u.mobile, 1, 2), '******', SUBSTRING(u.mobile, 9, 2)) AS referred_mobile_masked,
        u.role AS referred_role,
        c.district,
        c.taluka
      FROM public.referrals r
      JOIN public.users u ON r.referred_user_id = u.id
      LEFT JOIN public.citizens c ON c.user_id = u.id
      WHERE r.referrer_user_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3;
    `;

    try {
      const res = await query(listSQL, [referrerUserId, limit, offset]);
      return res.rows;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        const matches = [];
        for (const item of inMemoryReferrals.values()) {
          if (item.referrer_user_id === referrerUserId) {
            matches.push({
              referral_id: item.id,
              referral_code: item.referral_code,
              status: item.status,
              referred_at: item.created_at,
              referred_user_id: item.referred_user_id,
              referred_name: 'In-Memory User',
              referred_mobile_masked: '98******10',
            });
          }
        }
        return matches.slice(offset, offset + limit);
      }
      throw dbErr;
    }
  },

  /**
   * Get referral statistics for a specific user
   * @param {string} referrerUserId
   */
  async getStatsByReferrerId(referrerUserId) {
    const statsSQL = `
      SELECT 
        COUNT(*)::INTEGER AS total_referrals,
        COUNT(CASE WHEN status = 'REGISTERED' THEN 1 END)::INTEGER AS registered_count,
        COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END)::INTEGER AS active_count
      FROM public.referrals
      WHERE referrer_user_id = $1;
    `;

    try {
      const res = await query(statsSQL, [referrerUserId]);
      return res.rows[0] || { total_referrals: 0, registered_count: 0, active_count: 0 };
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        let total = 0;
        for (const item of inMemoryReferrals.values()) {
          if (item.referrer_user_id === referrerUserId) total++;
        }
        return { total_referrals: total, registered_count: total, active_count: 0 };
      }
      throw dbErr;
    }
  },

  /**
   * Get system-wide referral overview metrics for Admin dashboard
   */
  async getSystemOverview() {
    const overviewSQL = `
      SELECT 
        (SELECT COUNT(*)::INTEGER FROM public.referrals) AS total_referrals,
        (SELECT COUNT(DISTINCT referrer_user_id)::INTEGER FROM public.referrals) AS total_referrers,
        (SELECT COUNT(*)::INTEGER FROM public.referrals WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days') AS referrals_last_30_days,
        (SELECT COUNT(*)::INTEGER FROM public.referrals WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days') AS referrals_last_7_days;
    `;

    try {
      const res = await query(overviewSQL);
      return res.rows[0] || {
        total_referrals: 0,
        total_referrers: 0,
        referrals_last_30_days: 0,
        referrals_last_7_days: 0,
      };
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        return {
          total_referrals: inMemoryReferrals.size,
          total_referrers: inMemoryReferrals.size > 0 ? 1 : 0,
          referrals_last_30_days: inMemoryReferrals.size,
          referrals_last_7_days: inMemoryReferrals.size,
        };
      }
      throw dbErr;
    }
  },

  /**
   * Top Referrers Leaderboard (Ranked by number of registered citizens referred)
   * @param {Object} [options]
   * @param {number} [options.limit=10]
   * @param {number} [options.offset=0]
   */
  async getLeaderboard({ limit = 10, offset = 0 } = {}) {
    const leaderboardSQL = `
      SELECT 
        u.id AS referrer_user_id,
        u.full_name AS referrer_name,
        CONCAT(SUBSTRING(u.mobile, 1, 2), '******', SUBSTRING(u.mobile, 9, 2)) AS referrer_mobile_masked,
        u.referral_code,
        u.role,
        COUNT(r.id)::INTEGER AS total_referrals,
        MAX(r.created_at) AS last_referral_at
      FROM public.referrals r
      JOIN public.users u ON r.referrer_user_id = u.id
      GROUP BY u.id, u.full_name, u.mobile, u.referral_code, u.role
      ORDER BY total_referrals DESC, last_referral_at DESC
      LIMIT $1 OFFSET $2;
    `;

    try {
      const res = await query(leaderboardSQL, [limit, offset]);
      return res.rows;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        return [];
      }
      throw dbErr;
    }
  },

  /**
   * Delete a referral record by referred_user_id (helpful for test teardown)
   * @param {string} referredUserId
   */
  async deleteByReferredUserId(referredUserId) {
    try {
      const res = await query(
        'DELETE FROM public.referrals WHERE referred_user_id = $1 RETURNING id',
        [referredUserId]
      );
      return res.rows[0] || null;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        for (const [id, item] of inMemoryReferrals.entries()) {
          if (item.referred_user_id === referredUserId) {
            inMemoryReferrals.delete(id);
            return { id };
          }
        }
        return null;
      }
      throw dbErr;
    }
  },
};

export default ReferralModel;
