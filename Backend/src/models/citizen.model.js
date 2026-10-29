import { query } from '../config/db.js';
import { UserModel } from './user.model.js';
import crypto from 'crypto';

/**
 * SQL DDL for citizens table matching the citizen registration UI:
 *
 * citizens
 * -----------------------------------------
 * id (PK)         UUID
 * user_id (FK)    UUID (1-to-1 with users)
 * dob             DATE
 * gender          VARCHAR(20) ('MALE', 'FEMALE', 'OTHER')
 * address         TEXT
 * state           VARCHAR(100) (default 'Maharashtra')
 * district        VARCHAR(100)
 * district_id     UUID (optional FK)
 * taluka          VARCHAR(100)
 * taluka_id       UUID (optional FK)
 * pincode         VARCHAR(10)
 * email           VARCHAR(150)
 * latitude        DECIMAL(10,6)
 * longitude       DECIMAL(10,6)
 * created_at      TIMESTAMP
 * updated_at      TIMESTAMP
 */
export const CREATE_CITIZENS_TABLE_SQL = `
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";

  CREATE TABLE IF NOT EXISTS public.citizens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    dob DATE,
    gender VARCHAR(20),
    address TEXT,
    state VARCHAR(100) DEFAULT 'Maharashtra',
    district VARCHAR(100),
    district_id UUID,
    taluka VARCHAR(100),
    taluka_id UUID,
    pincode VARCHAR(10),
    email VARCHAR(150),
    latitude DECIMAL(10, 6),
    longitude DECIMAL(10, 6),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  -- Ensure newly added columns exist if table was already created
  ALTER TABLE public.citizens ADD COLUMN IF NOT EXISTS dob DATE;
  ALTER TABLE public.citizens ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
  ALTER TABLE public.citizens ADD COLUMN IF NOT EXISTS state VARCHAR(100) DEFAULT 'Maharashtra';
  ALTER TABLE public.citizens ADD COLUMN IF NOT EXISTS district VARCHAR(100);
  ALTER TABLE public.citizens ADD COLUMN IF NOT EXISTS taluka VARCHAR(100);
  ALTER TABLE public.citizens ADD COLUMN IF NOT EXISTS email VARCHAR(150);

  CREATE INDEX IF NOT EXISTS idx_citizens_user_id ON public.citizens(user_id);
  CREATE INDEX IF NOT EXISTS idx_citizens_district ON public.citizens(district);
  CREATE INDEX IF NOT EXISTS idx_citizens_pincode ON public.citizens(pincode);
`;

let tableEnsured = false;

// In-memory fallback for local offline testing
const inMemoryCitizens = new Map();

/**
 * Citizen Model / Data Access Object
 */
export const CitizenModel = {
  /**
   * Ensure citizens table and columns exist in the database
   */
  async createTable() {
    try {
      await query(CREATE_CITIZENS_TABLE_SQL);
      tableEnsured = true;
    } catch (err) {
      // ignore in offline mode
    }
  },

  /**
   * Create and store a new citizen profile
   * @param {Object} data
   */
  async create({
    user_id,
    dob = null,
    gender = null,
    address = null,
    state = 'Maharashtra',
    district = null,
    district_id = null,
    taluka = null,
    taluka_id = null,
    pincode = null,
    email = null,
    latitude = null,
    longitude = null,
  }) {
    if (!tableEnsured) {
      await this.createTable();
    }

    const insertSQL = `
      INSERT INTO public.citizens (
        user_id,
        dob,
        gender,
        address,
        state,
        district,
        district_id,
        taluka,
        taluka_id,
        pincode,
        email,
        latitude,
        longitude,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *;
    `;

    try {
      const res = await query(insertSQL, [
        user_id,
        dob,
        gender,
        address,
        state,
        district,
        district_id,
        taluka,
        taluka_id,
        pincode,
        email,
        latitude,
        longitude,
      ]);
      return res.rows[0];
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        const record = {
          id: crypto.randomUUID(),
          user_id,
          dob,
          gender,
          address,
          state,
          district,
          district_id,
          taluka,
          taluka_id,
          pincode,
          email,
          latitude: latitude !== null ? Number(latitude) : null,
          longitude: longitude !== null ? Number(longitude) : null,
          created_at: new Date(),
          updated_at: new Date(),
        };
        inMemoryCitizens.set(record.id, record);
        return record;
      }
      throw dbErr;
    }
  },

  /**
   * Find citizen profile by user_id
   * @param {string} user_id
   */
  async findByUserId(user_id) {
    const selectSQL = `
      SELECT 
        c.*,
        u.full_name,
        u.mobile,
        u.email AS user_email,
        u.role,
        u.status AS user_status
      FROM public.citizens c
      JOIN public.users u ON c.user_id = u.id
      WHERE c.user_id = $1
      LIMIT 1;
    `;

    try {
      const res = await query(selectSQL, [user_id]);
      return res.rows[0] || null;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        for (const citizen of inMemoryCitizens.values()) {
          if (citizen.user_id === user_id) {
            const user = await UserModel.findById(user_id);
            return {
              ...citizen,
              full_name: user?.full_name,
              mobile: user?.mobile,
              user_email: user?.email,
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
   * Find citizen profile by mobile number
   * @param {string} mobile
   */
  async findByMobile(mobile) {
    const selectSQL = `
      SELECT 
        c.*,
        u.full_name,
        u.mobile,
        u.email AS user_email,
        u.role,
        u.status AS user_status
      FROM public.citizens c
      JOIN public.users u ON c.user_id = u.id
      WHERE u.mobile = $1
      LIMIT 1;
    `;

    try {
      const res = await query(selectSQL, [mobile]);
      return res.rows[0] || null;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        const user = await UserModel.findByMobile(mobile);
        if (!user) return null;
        return this.findByUserId(user.id);
      }
      throw dbErr;
    }
  },

  /**
   * Find citizen by citizen UUID
   * @param {string} id
   */
  async findById(id) {
    const selectSQL = `
      SELECT 
        c.*,
        u.full_name,
        u.mobile,
        u.email AS user_email,
        u.role,
        u.status AS user_status
      FROM public.citizens c
      JOIN public.users u ON c.user_id = u.id
      WHERE c.id = $1
      LIMIT 1;
    `;

    try {
      const res = await query(selectSQL, [id]);
      return res.rows[0] || null;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        const citizen = inMemoryCitizens.get(id);
        if (!citizen) return null;
        const user = await UserModel.findById(citizen.user_id);
        return {
          ...citizen,
          full_name: user?.full_name,
          mobile: user?.mobile,
          user_email: user?.email,
          role: user?.role,
          user_status: user?.status,
        };
      }
      throw dbErr;
    }
  },

  /**
   * Update citizen profile
   * @param {string} id
   * @param {Object} updateData
   */
  async update(id, updateData) {
    const allowedFields = [
      'dob',
      'gender',
      'address',
      'state',
      'district',
      'district_id',
      'taluka',
      'taluka_id',
      'pincode',
      'email',
      'latitude',
      'longitude',
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
      UPDATE public.citizens
      SET ${fieldsToUpdate.join(', ')}
      WHERE id = $${idx}
      RETURNING *;
    `;

    try {
      const res = await query(updateSQL, values);
      return res.rows[0] || null;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        const record = inMemoryCitizens.get(id);
        if (!record) return null;
        Object.assign(record, updateData, { updated_at: new Date() });
        return record;
      }
      throw dbErr;
    }
  },
};

export default CitizenModel;
