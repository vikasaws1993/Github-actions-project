import { query } from '../config/db.js';
import { UserModel } from './user.model.js';
import { SEVAK_STATUS } from '../constants/index.js';
import crypto from 'crypto';

/**
 * SQL DDL for arogya_sevaks table matching the schema diagram:
 *
 * arogya_sevaks
 * -----------------------------------------
 * id (PK)         UUID
 * user_id (FK)    UUID (1-to-1 with users)
 * employee_code   VARCHAR(50)
 * phone           VARCHAR(15)
 * joining_date    DATE
 * status          VARCHAR(20) (ACTIVE / INACTIVE)
 * created_at      TIMESTAMP
 * updated_at      TIMESTAMP
 */
export const CREATE_AROGYA_SEVAKS_TABLE_SQL = `
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";

  CREATE TABLE IF NOT EXISTS public.arogya_sevaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    employee_code VARCHAR(50) UNIQUE NOT NULL,
    phone VARCHAR(15),
    joining_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL DEFAULT '${SEVAK_STATUS.ACTIVE}' 
      CHECK (status IN ('${SEVAK_STATUS.ACTIVE}', '${SEVAK_STATUS.INACTIVE}')),
    address TEXT,
    city VARCHAR(100),
    taluka VARCHAR(100),
    district VARCHAR(100),
    landmark VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_sevaks_user_id ON public.arogya_sevaks(user_id);
  CREATE INDEX IF NOT EXISTS idx_sevaks_employee_code ON public.arogya_sevaks(employee_code);
  CREATE INDEX IF NOT EXISTS idx_sevaks_status ON public.arogya_sevaks(status);
`;

// In-memory fallback store for offline development/testing
const inMemorySevaks = new Map();

/**
 * Arogya Sevak Model / Data Access Object
 */
export const ArogyaSevakModel = {
  /**
   * Ensure arogya_sevaks table exists in the database
   */
  async createTable() {
    return query(CREATE_AROGYA_SEVAKS_TABLE_SQL);
  },

  /**
   * Create and store a new Arogya Sevak profile
   * @param {Object} data
   * @param {string} data.user_id
   * @param {string} data.employee_code
   * @param {string} [data.phone]
   * @param {string|Date} [data.joining_date]
   * @param {string} [data.status]
   * @param {string} [data.address]
   * @param {string} [data.city]
   * @param {string} [data.taluka]
   * @param {string} [data.district]
   * @param {string} [data.landmark]
   */
  async create({
    user_id,
    employee_code,
    phone = null,
    joining_date = null,
    status = SEVAK_STATUS.ACTIVE,
    address = null,
    city = null,
    taluka = null,
    district = null,
    landmark = null,
  }) {
    const insertSQL = `
      INSERT INTO public.arogya_sevaks (
        user_id,
        employee_code,
        phone,
        joining_date,
        status,
        address,
        city,
        taluka,
        district,
        landmark,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, COALESCE($4, CURRENT_DATE), $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *;
    `;

    try {
      const res = await query(insertSQL, [
        user_id,
        employee_code,
        phone,
        joining_date,
        status,
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
          employee_code,
          phone,
          joining_date: joining_date || new Date().toISOString().split('T')[0],
          status,
          address,
          city,
          taluka,
          district,
          landmark,
          created_at: new Date(),
          updated_at: new Date(),
        };
        inMemorySevaks.set(record.id, record);
        return record;
      }
      throw dbErr;
    }
  },

  /**
   * Find Arogya Sevak profile by user_id
   * @param {string} user_id
   */
  async findByUserId(user_id) {
    const selectSQL = `
      SELECT 
        s.*,
        u.full_name,
        u.mobile,
        u.email,
        u.role,
        u.status AS user_status
      FROM public.arogya_sevaks s
      JOIN public.users u ON s.user_id = u.id
      WHERE s.user_id = $1
      LIMIT 1;
    `;

    try {
      const res = await query(selectSQL, [user_id]);
      return res.rows[0] || null;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        for (const sevak of inMemorySevaks.values()) {
          if (sevak.user_id === user_id) {
            const user = await UserModel.findById(user_id);
            return {
              ...sevak,
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
   * Find Arogya Sevak by employee_code
   * @param {string} employee_code
   */
  async findByEmployeeCode(employee_code) {
    const selectSQL = `
      SELECT 
        s.*,
        u.full_name,
        u.mobile,
        u.email,
        u.role,
        u.status AS user_status
      FROM public.arogya_sevaks s
      JOIN public.users u ON s.user_id = u.id
      WHERE s.employee_code = $1
      LIMIT 1;
    `;

    try {
      const res = await query(selectSQL, [employee_code]);
      return res.rows[0] || null;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        for (const sevak of inMemorySevaks.values()) {
          if (sevak.employee_code === employee_code) {
            const user = await UserModel.findById(sevak.user_id);
            return {
              ...sevak,
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
   * Find Arogya Sevak by UUID id
   * @param {string} id
   */
  async findById(id) {
    const selectSQL = `
      SELECT 
        s.*,
        u.full_name,
        u.mobile,
        u.email,
        u.role,
        u.status AS user_status,
        COALESCE(
          json_agg(
            json_build_object(
              'id', h.id,
              'name', h.name,
              'hospital_code', h.hospital_code,
              'contact_number', h.contact_number,
              'assigned_at', hsa.assigned_at,
              'remarks', hsa.remarks
            )
          ) FILTER (WHERE h.id IS NOT NULL),
          '[]'
        ) AS assigned_hospitals
      FROM public.arogya_sevaks s
      JOIN public.users u ON s.user_id = u.id
      LEFT JOIN public.hospital_sevak_assignments hsa ON s.id = hsa.sevak_id AND hsa.status = 'ACTIVE'
      LEFT JOIN public.hospitals h ON hsa.hospital_id = h.id
      WHERE s.id = $1
      GROUP BY s.id, u.id
      LIMIT 1;
    `;

    try {
      const res = await query(selectSQL, [id]);
      if (!res.rows[0]) return null;
      const row = res.rows[0];
      return {
        ...row,
        hospital: row.assigned_hospitals?.[0] || null,
      };
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        const sevak = inMemorySevaks.get(id);
        if (!sevak) return null;
        const user = await UserModel.findById(sevak.user_id);
        return {
          ...sevak,
          full_name: user?.full_name,
          mobile: user?.mobile,
          email: user?.email,
          role: user?.role,
          user_status: user?.status,
          assigned_hospitals: sevak.assigned_hospitals || [],
          hospital: sevak.assigned_hospitals?.[0] || null,
        };
      }
    }
  },

  /**
   * Find Arogya Sevak by Name, Employee Code, or ID
   * @param {string} search
   */
  async findByNameOrCode(search) {
    if (!search) return null;
    const clean = String(search).trim();

    // Check if valid UUID first
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean);
    if (isUUID) {
      const byId = await this.findById(clean);
      if (byId) return byId;
      const byUserId = await this.findByUserId(clean);
      if (byUserId) return byUserId;
    }

    const cleanBase = clean.includes('—') ? clean.split('—')[0].trim() : (clean.includes('(') ? clean.split('(')[0].trim() : clean);

    const selectSQL = `
      SELECT 
        s.*,
        u.full_name,
        u.mobile,
        u.email,
        u.role,
        u.status AS user_status
      FROM public.arogya_sevaks s
      JOIN public.users u ON s.user_id = u.id
      WHERE (
        u.full_name ILIKE $1 
        OR u.full_name ILIKE $2
        OR s.employee_code ILIKE $1
        OR s.phone ILIKE $1
        OR u.mobile ILIKE $1
      )
      LIMIT 1;
    `;

    try {
      const res = await query(selectSQL, [`%${cleanBase}%`, clean]);
      return res.rows[0] || null;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        for (const sevak of inMemorySevaks.values()) {
          const user = await UserModel.findById(sevak.user_id);
          if (
            sevak.id === clean ||
            sevak.employee_code?.toLowerCase() === clean.toLowerCase() ||
            user?.full_name?.toLowerCase() === clean.toLowerCase()
          ) {
            return {
              ...sevak,
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
   * Update Arogya Sevak profile
   * @param {string} id
   * @param {Object} updateData
   */
  async update(id, updateData) {
    const allowedFields = [
      'employee_code',
      'phone',
      'joining_date',
      'status',
      'address',
      'city',
      'taluka',
      'district',
      'landmark',
    ];
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
      UPDATE public.arogya_sevaks
      SET ${fieldsToUpdate.join(', ')}
      WHERE id = $${idx}
      RETURNING *;
    `;

    try {
      const res = await query(updateSQL, values);
      if (!res.rows[0]) return null;
      return this.findById(id);
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        const record = inMemorySevaks.get(id);
        if (!record) return null;
        Object.assign(record, updateData, { updated_at: new Date() });
        return this.findById(id);
      }
      throw dbErr;
    }
  },

  /**
   * Find all Arogya Sevaks with filters, pagination, and multi-hospital assignment aggregation
   * @param {Object} filters
   */
  async findAll({ status, search, limit = 50, offset = 0 } = {}) {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (status) {
      conditions.push(`s.status = $${idx}`);
      values.push(status);
      idx++;
    }

    if (search) {
      conditions.push(`(u.full_name ILIKE $${idx} OR s.employee_code ILIKE $${idx} OR u.mobile ILIKE $${idx} OR u.email ILIKE $${idx})`);
      values.push(`%${search.trim()}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const selectSQL = `
      SELECT 
        s.*,
        u.full_name,
        u.mobile,
        u.email,
        u.role,
        u.status AS user_status,
        COALESCE(
          json_agg(
            json_build_object(
              'id', h.id,
              'name', h.name,
              'hospital_code', h.hospital_code,
              'assigned_at', hsa.assigned_at
            )
          ) FILTER (WHERE h.id IS NOT NULL),
          '[]'
        ) AS assigned_hospitals
      FROM public.arogya_sevaks s
      JOIN public.users u ON s.user_id = u.id
      LEFT JOIN public.hospital_sevak_assignments hsa ON s.id = hsa.sevak_id AND hsa.status = 'ACTIVE'
      LEFT JOIN public.hospitals h ON hsa.hospital_id = h.id
      ${whereClause}
      GROUP BY s.id, u.id
      ORDER BY s.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1};
    `;
    values.push(limit, offset);

    const countSQL = `
      SELECT COUNT(*)::int AS total
      FROM public.arogya_sevaks s
      JOIN public.users u ON s.user_id = u.id
      ${whereClause};
    `;

    try {
      const [listRes, countRes] = await Promise.all([
        query(selectSQL, values),
        query(countSQL, values.slice(0, values.length - 2)),
      ]);

      const formattedSevaks = listRes.rows.map((row) => ({
        ...row,
        hospital: row.assigned_hospitals?.[0] || null,
      }));

      return {
        sevaks: formattedSevaks,
        total: countRes.rows[0]?.total || 0,
        limit,
        offset,
      };
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        let results = Array.from(inMemorySevaks.values());
        if (status) results = results.filter((s) => s.status === status);
        return {
          sevaks: results.slice(offset, offset + limit),
          total: results.length,
          limit,
          offset,
        };
      }
      throw dbErr;
    }
  },
};

export default ArogyaSevakModel;
