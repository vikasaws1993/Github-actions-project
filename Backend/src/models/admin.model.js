import { query } from '../config/db.js';
import { UserModel } from './user.model.js';
import crypto from 'crypto';

/**
 * SQL DDL for admins table:
 *
 * admins
 * -----------------------------------------
 * id (PK)         UUID
 * user_id (FK)    UUID (1-to-1 with users)
 * department      VARCHAR(100)
 * designation     VARCHAR(100)
 * created_at      TIMESTAMP
 * updated_at      TIMESTAMP
 */
export const CREATE_ADMINS_TABLE_SQL = `
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";

  CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    department VARCHAR(100) DEFAULT 'HEALTH_ADMINISTRATION',
    designation VARCHAR(100) DEFAULT 'ADMINISTRATOR',
    address VARCHAR(300),
    city VARCHAR(100),
    taluka VARCHAR(100),
    district VARCHAR(100),
    landmark VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_admins_user_id ON public.admins(user_id);
`;

// In-memory fallback for local/offline testing
const inMemoryAdmins = new Map();

/**
 * Admin Model / Data Access Object
 */
export const AdminModel = {
  /**
   * Ensure admins table exists in the database and has latest columns
   */
  async createTable() {
    await query(CREATE_ADMINS_TABLE_SQL);
    try {
      await query(`
        ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS address VARCHAR(300);
        ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS city VARCHAR(100);
        ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS taluka VARCHAR(100);
        ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS district VARCHAR(100);
        ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS landmark VARCHAR(150);
      `);
    } catch (_) {
      // Ignore if table already has columns
    }
  },

  /**
   * Create and store a new admin profile
   * @param {Object} data
   * @param {string} data.user_id
   * @param {string} [data.department]
   * @param {string} [data.designation]
   * @param {string} [data.address]
   * @param {string} [data.city]
   * @param {string} [data.taluka]
   * @param {string} [data.district]
   * @param {string} [data.landmark]
   */
  async create({
    user_id,
    department = 'HEALTH_ADMINISTRATION',
    designation = 'ADMINISTRATOR',
    address = null,
    city = null,
    taluka = null,
    district = null,
    landmark = null,
  }) {
    const insertSQL = `
      INSERT INTO public.admins (
        user_id,
        department,
        designation,
        address,
        city,
        taluka,
        district,
        landmark,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *;
    `;

    try {
      const res = await query(insertSQL, [
        user_id,
        department,
        designation,
        address,
        city,
        taluka,
        district,
        landmark,
      ]);
      return res.rows[0];
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        const record = {
          id: crypto.randomUUID(),
          user_id,
          department,
          designation,
          address,
          city,
          taluka,
          district,
          landmark,
          created_at: new Date(),
          updated_at: new Date(),
        };
        inMemoryAdmins.set(record.id, record);
        return record;
      }
      throw dbErr;
    }
  },

  /**
   * Find admin profile by user_id
   * @param {string} user_id
   */
  async findByUserId(user_id) {
    const selectSQL = `
      SELECT 
        a.*,
        u.full_name,
        u.mobile,
        u.email,
        u.role,
        u.status AS user_status
      FROM public.admins a
      JOIN public.users u ON a.user_id = u.id
      WHERE a.user_id = $1
      LIMIT 1;
    `;

    try {
      const res = await query(selectSQL, [user_id]);
      return res.rows[0] || null;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        for (const admin of inMemoryAdmins.values()) {
          if (admin.user_id === user_id) {
            const user = await UserModel.findById(user_id);
            return {
              ...admin,
              full_name: user?.full_name,
              mobile: user?.mobile,
              email: user?.email,
              role: user?.role,
              user_status: user?.status,
            };
          }
        }
        return null;
      }
      throw dbErr;
    }
  },

  /**
   * Find admin by admin UUID
   * @param {string} id
   */
  async findById(id) {
    const selectSQL = `
      SELECT 
        a.*,
        u.full_name,
        u.mobile,
        u.email,
        u.role,
        u.status AS user_status
      FROM public.admins a
      JOIN public.users u ON a.user_id = u.id
      WHERE a.id = $1
      LIMIT 1;
    `;

    try {
      const res = await query(selectSQL, [id]);
      return res.rows[0] || null;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        const admin = inMemoryAdmins.get(id);
        if (!admin) return null;
        const user = await UserModel.findById(admin.user_id);
        return {
          ...admin,
          full_name: user?.full_name,
          mobile: user?.mobile,
          email: user?.email,
          role: user?.role,
          user_status: user?.status,
        };
      }
      throw dbErr;
    }
  },

  /**
   * Update admin profile
   * @param {string} id
   * @param {Object} updateData
   */
  async update(id, updateData) {
    const allowedFields = ['department', 'designation', 'address', 'city', 'taluka', 'district', 'landmark'];
    const fieldsToUpdate = [];
    const values = [];
    let idx = 1;

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        fieldsToUpdate.push(`${field} = $${idx}`);
        values.push(updateData[field]);
        idx++;
      }
    }

    if (fieldsToUpdate.length === 0) {
      return this.findById(id);
    }

    fieldsToUpdate.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const updateSQL = `
      UPDATE public.admins
      SET ${fieldsToUpdate.join(', ')}
      WHERE id = $${idx}
      RETURNING *;
    `;

    try {
      const res = await query(updateSQL, values);
      return res.rows[0] || null;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        const record = inMemoryAdmins.get(id);
        if (!record) return null;
        Object.assign(record, updateData, { updated_at: new Date() });
        return record;
      }
      throw dbErr;
    }
  },

  /**
   * Find all admin profiles with filters and pagination
   * @param {Object} filters
   */
  async findAll({ search, limit = 50, offset = 0 } = {}) {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (search) {
      conditions.push(`(u.full_name ILIKE $${idx} OR u.email ILIKE $${idx} OR u.mobile ILIKE $${idx} OR a.department ILIKE $${idx} OR a.designation ILIKE $${idx} OR a.city ILIKE $${idx} OR a.taluka ILIKE $${idx} OR a.district ILIKE $${idx} OR a.address ILIKE $${idx})`);
      values.push(`%${search.trim()}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const selectSQL = `
      SELECT 
        a.*,
        u.full_name,
        u.mobile,
        u.email,
        u.role,
        u.status AS user_status
      FROM public.admins a
      JOIN public.users u ON a.user_id = u.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1};
    `;
    values.push(limit, offset);

    const countSQL = `
      SELECT COUNT(*)::int AS total
      FROM public.admins a
      JOIN public.users u ON a.user_id = u.id
      ${whereClause};
    `;

    try {
      const [listRes, countRes] = await Promise.all([
        query(selectSQL, values),
        query(countSQL, values.slice(0, values.length - 2)),
      ]);

      return {
        admins: listRes.rows,
        total: countRes.rows[0]?.total || 0,
        limit,
        offset,
      };
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        let results = Array.from(inMemoryAdmins.values());
        return {
          admins: results.slice(offset, offset + limit),
          total: results.length,
          limit,
          offset,
        };
      }
      throw dbErr;
    }
  },

  /**
   * Get total count of registered admins
   */
  async count() {
    const countSQL = `SELECT COUNT(*)::int AS total FROM public.admins;`;
    try {
      const res = await query(countSQL);
      return res.rows[0]?.total || 0;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        return inMemoryAdmins.size;
      }
      throw dbErr;
    }
  },
};

export default AdminModel;
