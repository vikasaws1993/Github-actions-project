import { query } from '../config/db.js';
import crypto from 'crypto';

/**
 * SQL DDL to create the refresh_tokens table:
 * 
 * refresh_tokens
 * -----------------------------------------------------------
 * id (PK)         UUID
 * user_id (FK)    UUID REFERENCES public.users(id) ON DELETE CASCADE
 * token           TEXT NOT NULL UNIQUE
 * revoked         BOOLEAN NOT NULL DEFAULT FALSE
 * expires_at      TIMESTAMP WITH TIME ZONE NOT NULL
 * created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
 * updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
 */
export const CREATE_REFRESH_TOKENS_TABLE_SQL = `
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";

  CREATE TABLE IF NOT EXISTS public.refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON public.refresh_tokens(token);
  CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON public.refresh_tokens(user_id);
`;

// Local in-memory store for fallback/offline testing when DB is not reachable
const inMemoryRefreshTokens = new Map();

/**
 * Refresh Token Model / DAO
 */
export const RefreshTokenModel = {
  /**
   * Ensure refresh_tokens table exists in the database
   */
  async createTable() {
    return query(CREATE_REFRESH_TOKENS_TABLE_SQL);
  },

  /**
   * Store a newly issued refresh token
   * @param {Object} param0
   * @param {string} param0.userId - User UUID
   * @param {string} param0.token - Refresh token string
   * @param {Date|string} param0.expiresAt - Expiration timestamp
   */
  async create({ userId, token, expiresAt }) {
    const insertSQL = `
      INSERT INTO public.refresh_tokens (
        user_id,
        token,
        revoked,
        expires_at,
        created_at,
        updated_at
      )
      VALUES ($1, $2, FALSE, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, user_id, token, revoked, expires_at, created_at, updated_at;
    `;

    try {
      const res = await query(insertSQL, [userId, token, new Date(expiresAt)]);
      return res.rows[0];
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        const record = {
          id: crypto.randomUUID(),
          user_id: userId,
          token,
          revoked: false,
          expires_at: new Date(expiresAt),
          created_at: new Date(),
          updated_at: new Date(),
        };
        inMemoryRefreshTokens.set(token, record);
        return record;
      }
      throw dbErr;
    }
  },

  /**
   * Find a refresh token record by token string
   * @param {string} token
   */
  async findByToken(token) {
    if (!token) return null;

    try {
      const res = await query(
        'SELECT * FROM public.refresh_tokens WHERE token = $1 LIMIT 1',
        [token]
      );
      return res.rows[0] || null;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        return inMemoryRefreshTokens.get(token) || null;
      }
      throw dbErr;
    }
  },

  /**
   * Invalidate/revoke a specific refresh token
   * @param {string} token
   */
  async revoke(token) {
    if (!token) return false;

    try {
      const res = await query(
        `UPDATE public.refresh_tokens
         SET revoked = TRUE, updated_at = CURRENT_TIMESTAMP
         WHERE token = $1
         RETURNING id, revoked, updated_at`,
        [token]
      );
      return (res.rowCount || 0) > 0;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        const record = inMemoryRefreshTokens.get(token);
        if (record) {
          record.revoked = true;
          record.updated_at = new Date();
          return true;
        }
        return false;
      }
      throw dbErr;
    }
  },

  /**
   * Invalidate/revoke all active refresh tokens for a user
   * @param {string} userId - User UUID
   */
  async revokeByUserId(userId) {
    if (!userId) return false;

    try {
      await query(
        `UPDATE public.refresh_tokens
         SET revoked = TRUE, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND revoked = FALSE`,
        [userId]
      );
      return true;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        for (const record of inMemoryRefreshTokens.values()) {
          if (record.user_id === userId) {
            record.revoked = true;
            record.updated_at = new Date();
          }
        }
        return true;
      }
      throw dbErr;
    }
  },
};

export default RefreshTokenModel;
