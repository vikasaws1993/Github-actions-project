import { query } from '../config/db.js';
import { USER_ROLES, USER_STATUS } from '../constants/index.js';
import crypto from 'crypto';

/**
 * SQL DDL to create the users table matching the ERD schema:
 * 
 * users
 * -----------------------------------------------------------
 * id (PK)         UUID
 * full_name       VARCHAR(150)
 * mobile          VARCHAR(15)
 * email           VARCHAR(150)
 * password_hash   TEXT
 * role            VARCHAR(30) (ADMIN / CITIZEN / SEVAK)
 * status          VARCHAR(30) (ACTIVE / INACTIVE / BLOCKED)
 * created_at      TIMESTAMP
 * updated_at      TIMESTAMP
 */
export const CREATE_USERS_TABLE_SQL = `
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";

  CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    mobile VARCHAR(15) NOT NULL UNIQUE,
    email VARCHAR(150),
    password_hash TEXT,
    role VARCHAR(30) NOT NULL DEFAULT '${USER_ROLES.CITIZEN}' 
      CHECK (role IN ('${USER_ROLES.ADMIN}', '${USER_ROLES.CITIZEN}', '${USER_ROLES.SEVAK}', '${USER_ROLES.AROGYA_SEVAK}')),
    status VARCHAR(30) NOT NULL DEFAULT '${USER_STATUS.ACTIVE}' 
      CHECK (status IN ('${USER_STATUS.ACTIVE}', '${USER_STATUS.INACTIVE}', '${USER_STATUS.BLOCKED}')),
    referral_code VARCHAR(50) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_users_mobile ON public.users(mobile);
  CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
  CREATE INDEX IF NOT EXISTS idx_users_referral_code ON public.users(referral_code);
`;

// Local in-memory store for fallback/offline testing when DB is not reachable
const inMemoryUsers = new Map();

/**
 * User Model / DAO
 */
export const UserModel = {
  /**
   * Ensure users table exists in the database
   */
  async createTable() {
    return query(CREATE_USERS_TABLE_SQL);
  },

  /**
   * Create and store a new user in the database
   * @param {Object} data
   * @param {string} data.full_name
   * @param {string} data.mobile
   * @param {string} [data.email]
   * @param {string} [data.password_hash]
   * @param {string} [data.role]
   * @param {string} [data.status]
   * @param {string} [data.referral_code]
   */
  async create({
    full_name,
    mobile,
    email = null,
    password_hash = null,
    role = USER_ROLES.CITIZEN,
    status = USER_STATUS.ACTIVE,
    referral_code = null,
  }) {
    const finalReferralCode = referral_code || `AM-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const insertSQL = `
      INSERT INTO public.users (
        full_name,
        mobile,
        email,
        password_hash,
        role,
        status,
        referral_code,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, full_name, mobile, email, role, status, referral_code, created_at, updated_at;
    `;

    try {
      const res = await query(insertSQL, [
        full_name,
        mobile,
        email,
        password_hash,
        role,
        status,
        finalReferralCode,
      ]);
      return res.rows[0];
    } catch (dbErr) {
      // Fallback to in-memory if DB connection is unavailable in local dev
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        const record = {
          id: crypto.randomUUID(),
          full_name,
          mobile,
          email,
          password_hash,
          role,
          status,
          created_at: new Date(),
          updated_at: new Date(),
        };
        inMemoryUsers.set(record.id, record);
        const { password_hash: _, ...safeUser } = record;
        return safeUser;
      }
      throw dbErr;
    }
  },

  /**
   * Find a user by mobile number
   * @param {string} mobile
   */
  async findByMobile(mobile) {
    try {
      const res = await query(
        'SELECT * FROM public.users WHERE mobile = $1 LIMIT 1',
        [mobile]
      );
      return res.rows[0] || null;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        for (const user of inMemoryUsers.values()) {
          if (user.mobile === mobile) return user;
        }
        return null;
      }
      throw dbErr;
    }
  },

  /**
   * Find a user by email (case-insensitive)
   * @param {string} email
   */
  async findByEmail(email) {
    if (!email) return null;
    const normalizedEmail = email.trim().toLowerCase();
    try {
      const res = await query(
        'SELECT * FROM public.users WHERE LOWER(email) = LOWER($1) LIMIT 1',
        [normalizedEmail]
      );
      return res.rows[0] || null;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        for (const user of inMemoryUsers.values()) {
          if (user.email && user.email.toLowerCase() === normalizedEmail) return user;
        }
        return null;
      }
      throw dbErr;
    }
  },

  /**
   * Update a user's password hash
   * @param {string} id - User UUID
   * @param {string} password_hash - New password hash
   */
  async updatePassword(id, password_hash) {
    try {
      const res = await query(
        'UPDATE public.users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, full_name, email, role, status, updated_at',
        [password_hash, id]
      );
      return res.rows[0] || null;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        const user = inMemoryUsers.get(id);
        if (user) {
          user.password_hash = password_hash;
          user.updated_at = new Date();
          return user;
        }
        return null;
      }
      throw dbErr;
    }
  },

  /**
   * Find a user by UUID id
   * @param {string} id
   */
  async findById(id) {
    try {
      const res = await query(
        'SELECT id, full_name, mobile, email, role, status, referral_code, created_at, updated_at FROM public.users WHERE id = $1 LIMIT 1',
        [id]
      );
      return res.rows[0] || null;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        const user = inMemoryUsers.get(id);
        if (!user) return null;
        const { password_hash: _, ...safeUser } = user;
        return safeUser;
      }
      throw dbErr;
    }
  },

  /**
   * Find a user by referral code (case-insensitive)
   * @param {string} referralCode
   */
  async findByReferralCode(referralCode) {
    if (!referralCode) return null;
    const cleanCode = referralCode.trim().toUpperCase();
    try {
      const res = await query(
        'SELECT id, full_name, mobile, email, role, status, referral_code, created_at, updated_at FROM public.users WHERE UPPER(referral_code) = $1 LIMIT 1',
        [cleanCode]
      );
      return res.rows[0] || null;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        for (const user of inMemoryUsers.values()) {
          if (user.referral_code && user.referral_code.toUpperCase() === cleanCode) {
            const { password_hash: _, ...safeUser } = user;
            return safeUser;
          }
        }
        return null;
      }
      throw dbErr;
    }
  },

  /**
   * Update or assign a referral code to a user
   * @param {string} id
   * @param {string} referralCode
   */
  async updateReferralCode(id, referralCode) {
    try {
      const res = await query(
        'UPDATE public.users SET referral_code = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, full_name, mobile, email, role, status, referral_code, updated_at',
        [referralCode, id]
      );
      return res.rows[0] || null;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        const user = inMemoryUsers.get(id);
        if (user) {
          user.referral_code = referralCode;
          user.updated_at = new Date();
          const { password_hash: _, ...safeUser } = user;
          return safeUser;
        }
        return null;
      }
      throw dbErr;
    }
  },

  /**
   * Update user basic profile (full_name, email)
   * @param {string} id - User UUID
   * @param {Object} updateData
   * @param {string} [updateData.full_name]
   * @param {string} [updateData.mobile]
   * @param {string} [updateData.email]
   * @param {string} [updateData.status]
   */
  async update(id, updateData = {}) {
    const { full_name, mobile, email, status } = updateData;
    const updates = [];
    const values = [];
    let idx = 1;

    if (full_name !== undefined && full_name !== null) {
      updates.push(`full_name = $${idx}`);
      values.push(full_name.trim());
      idx++;
    }

    if (mobile !== undefined && mobile !== null) {
      updates.push(`mobile = $${idx}`);
      values.push(mobile.trim());
      idx++;
    }

    if (email !== undefined) {
      updates.push(`email = $${idx}`);
      values.push(email ? email.trim().toLowerCase() : null);
      idx++;
    }

    if (status !== undefined && status !== null) {
      updates.push(`status = $${idx}`);
      values.push(status);
      idx++;
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const updateSQL = `
      UPDATE public.users
      SET ${updates.join(', ')}
      WHERE id = $${idx}
      RETURNING id, full_name, mobile, email, role, status, updated_at;
    `;

    try {
      const res = await query(updateSQL, values);
      return res.rows[0] || null;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        const user = inMemoryUsers.get(id);
        if (user) {
          if (full_name) user.full_name = full_name.trim();
          if (mobile) user.mobile = mobile.trim();
          if (email !== undefined) user.email = email ? email.trim().toLowerCase() : null;
          if (status) user.status = status;
          user.updated_at = new Date();
          const { password_hash: _, ...safeUser } = user;
          return safeUser;
        }
        return null;
      }
      throw dbErr;
    }
  },

  /**
   * Update user basic profile (full_name, email)
   * @param {string} id - User UUID
   * @param {Object} data
   * @param {string} [data.full_name]
   * @param {string} [data.email]
   */
  async updateProfile(id, { full_name, email }) {
    return this.update(id, { full_name, email });
  },

  /**
   * Count users matching a specific role
   * @param {string} role
   */
  async countByRole(role) {
    try {
      const res = await query(
        'SELECT COUNT(*)::int AS total FROM public.users WHERE role = $1',
        [role]
      );
      return res.rows[0]?.total || 0;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        let count = 0;
        for (const user of inMemoryUsers.values()) {
          if (user.role === role) count++;
        }
        return count;
      }
      throw dbErr;
    }
  },
};

export default UserModel;
