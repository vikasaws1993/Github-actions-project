import { query } from '../config/db.js';
import { HOSPITAL_STATUS } from '../constants/index.js';
import crypto from 'crypto';

/**
 * SQL DDL for hospitals table matching the ERD schema:
 *
 * hospitals
 * -----------------------------------------
 * id (PK)             UUID
 * hospital_code       VARCHAR(50) UNIQUE
 * name                VARCHAR(200) NOT NULL
 * address             TEXT
 * district_id         UUID NOT NULL
 * taluka_id           UUID NOT NULL
 * pincode             VARCHAR(10)
 * latitude            DECIMAL(10,6)
 * longitude           DECIMAL(10,6)
 * contact_number      VARCHAR(15)
 * email               VARCHAR(150)
 * status              VARCHAR(20) DEFAULT 'ACTIVE'
 * created_at          TIMESTAMP WITH TIME ZONE
 * updated_at          TIMESTAMP WITH TIME ZONE
 */
export const CREATE_HOSPITALS_TABLE_SQL = `
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";

  CREATE TABLE IF NOT EXISTS public.hospitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_code VARCHAR(50) UNIQUE,
    name VARCHAR(200) NOT NULL,
    hospital_type VARCHAR(50) DEFAULT 'Government',
    address TEXT,
    address_line TEXT,
    area VARCHAR(100),
    city VARCHAR(100),
    district VARCHAR(100),
    district_id UUID,
    taluka VARCHAR(100),
    taluka_id UUID,
    state VARCHAR(100) DEFAULT 'Maharashtra',
    pincode VARCHAR(10),
    nearest_landmark VARCHAR(255),
    latitude DECIMAL(10, 6),
    longitude DECIMAL(10, 6),
    contact_number VARCHAR(20),
    phone VARCHAR(20),
    email VARCHAR(150),
    scheme VARCHAR(255),
    specialties TEXT[],
    status VARCHAR(20) NOT NULL DEFAULT '${HOSPITAL_STATUS.ACTIVE}'
      CHECK (status IN ('${HOSPITAL_STATUS.ACTIVE}', '${HOSPITAL_STATUS.INACTIVE}')),
    created_by_admin_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS hospital_type VARCHAR(50) DEFAULT 'Government';
  ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS address_line TEXT;
  ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS area VARCHAR(100);
  ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS city VARCHAR(100);
  ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS district VARCHAR(100);
  ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS taluka VARCHAR(100);
  ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS state VARCHAR(100) DEFAULT 'Maharashtra';
  ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS nearest_landmark VARCHAR(255);
  ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS contact_number VARCHAR(20);
  ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
  ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS scheme VARCHAR(255);
  ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS specialties TEXT[];
  ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS created_by_admin_id UUID;

  CREATE INDEX IF NOT EXISTS idx_hospitals_district_id ON public.hospitals(district_id);
  CREATE INDEX IF NOT EXISTS idx_hospitals_taluka_id ON public.hospitals(taluka_id);
  CREATE INDEX IF NOT EXISTS idx_hospitals_hospital_code ON public.hospitals(hospital_code);
  CREATE INDEX IF NOT EXISTS idx_hospitals_status ON public.hospitals(status);
`;

// In-memory fallback for local offline testing
const inMemoryHospitals = new Map();

/**
 * Hospital Model / Data Access Object
 */
export const HospitalModel = {
  /**
   * Ensure hospitals table exists in the database
   */
  async createTable() {
    return query(CREATE_HOSPITALS_TABLE_SQL);
  },

  /**
   * Create and store a new hospital
   * @param {Object} data
   */
  async create({
    hospital_code = null,
    name,
    hospital_type = null,
    type = null,
    address = null,
    address_line = null,
    area = null,
    city = null,
    location = null,
    district = null,
    district_id = 'a0000000-0000-0000-0000-000000000001',
    taluka = null,
    areaTaluka = null,
    taluka_id = 'b0000000-0000-0000-0000-000000000001',
    state = null,
    pincode = null,
    nearest_landmark = null,
    nearestLandmark = null,
    latitude = null,
    longitude = null,
    contact_number = null,
    contact = null,
    phone = null,
    email = null,
    scheme = null,
    specialties = [],
    status = HOSPITAL_STATUS.ACTIVE,
    created_by_admin_id = null,
  }) {
    const finalHospitalType = hospital_type || type || 'Government';
    const finalCity = city || location || 'Pune';
    const finalDistrict = district || location || 'Pune';
    const finalTaluka = taluka || areaTaluka || 'Haveli Taluka';
    const finalArea = area || finalTaluka;
    const finalState = state || 'Maharashtra';
    const finalAddress = address || address_line || `${name}, ${finalCity}`;
    const finalAddressLine = address_line || address || finalAddress;
    const finalLandmark = nearest_landmark || nearestLandmark || null;
    const finalPhone = phone || contact || contact_number || null;
    const finalContactNumber = contact_number || contact || phone || null;
    const finalSpecialties = Array.isArray(specialties)
      ? specialties
      : (typeof specialties === 'string' ? specialties.split(/[,|;]/).map((s) => s.trim()).filter(Boolean) : []);

    // Safety check: ensure created_by_admin_id references an existing admin ID,
    // or resolve if caller passed an admin's user_id, or safely fallback to null to prevent FK violations
    let resolvedAdminId = null;
    if (created_by_admin_id) {
      try {
        const adminCheck = await query(
          'SELECT id FROM public.admins WHERE id = $1 OR user_id = $1 LIMIT 1',
          [created_by_admin_id]
        );
        if (adminCheck?.rows?.length > 0) {
          resolvedAdminId = adminCheck.rows[0].id;
        }
      } catch {
        resolvedAdminId = null;
      }
    }

    const insertSQL = `
      INSERT INTO public.hospitals (
        hospital_code,
        name,
        hospital_type,
        address,
        address_line,
        area,
        city,
        district,
        district_id,
        taluka,
        taluka_id,
        state,
        pincode,
        nearest_landmark,
        latitude,
        longitude,
        contact_number,
        phone,
        email,
        scheme,
        specialties,
        status,
        created_by_admin_id,
        created_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING *;
    `;

let columnsEnsured = false;
async function ensureHospitalColumns() {
  if (columnsEnsured) return;
  try {
    await query(`
      ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS hospital_code VARCHAR(50);
      ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS hospital_type VARCHAR(50) DEFAULT 'Government';
      ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS address_line TEXT;
      ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS area VARCHAR(100);
      ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS city VARCHAR(100);
      ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS district VARCHAR(100);
      ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS taluka VARCHAR(100);
      ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS state VARCHAR(100) DEFAULT 'Maharashtra';
      ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS nearest_landmark VARCHAR(255);
      ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS contact_number VARCHAR(20);
      ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
      ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS scheme VARCHAR(255);
      ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS specialties TEXT[];
      ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS created_by_admin_id UUID;
    `);
    columnsEnsured = true;
  } catch (e) {
    console.warn('[HospitalModel] Auto column migration error:', e.message);
  }
}

    await ensureHospitalColumns();

    try {
      const res = await query(insertSQL, [
        hospital_code,
        name,
        finalHospitalType,
        finalAddress,
        finalAddressLine,
        finalArea,
        finalCity,
        finalDistrict,
        district_id,
        finalTaluka,
        taluka_id,
        finalState,
        pincode,
        finalLandmark,
        latitude,
        longitude,
        finalContactNumber,
        finalPhone,
        email,
        scheme,
        finalSpecialties,
        status,
        resolvedAdminId,
      ]);
      return res.rows[0];
    } catch (dbErr) {
      if (dbErr.code === '42703') {
        columnsEnsured = false;
        await ensureHospitalColumns();
        const retryRes = await query(insertSQL, [
          hospital_code,
          name,
          finalHospitalType,
          finalAddress,
          finalAddressLine,
          finalArea,
          finalCity,
          finalDistrict,
          district_id,
          finalTaluka,
          taluka_id,
          finalState,
          pincode,
          finalLandmark,
          latitude,
          longitude,
          finalContactNumber,
          finalPhone,
          email,
          scheme,
          finalSpecialties,
          status,
          resolvedAdminId,
        ]);
        return retryRes.rows[0];
      }
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        const record = {
          id: crypto.randomUUID(),
          hospital_code,
          name,
          hospital_type: finalHospitalType,
          address: finalAddress,
          address_line: finalAddressLine,
          city: finalCity,
          district: finalDistrict,
          district_id,
          taluka: finalTaluka,
          taluka_id,
          pincode,
          nearest_landmark: finalLandmark,
          latitude: latitude !== null ? Number(latitude) : null,
          longitude: longitude !== null ? Number(longitude) : null,
          contact_number: finalContactNumber,
          phone: finalPhone,
          email,
          scheme,
          specialties: finalSpecialties,
          status,
          created_by_admin_id,
          created_at: new Date(),
          updated_at: new Date(),
        };
        inMemoryHospitals.set(record.id, record);
        return record;
      }
      throw dbErr;
    }
  },

  /**
   * Find hospital by UUID
   * @param {string} id
   */
  async findById(id) {
    try {
      const res = await query(
        'SELECT * FROM public.hospitals WHERE id = $1 LIMIT 1',
        [id]
      );
      return res.rows[0] || null;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        return inMemoryHospitals.get(id) || null;
      }
      throw dbErr;
    }
  },

  /**
   * Find hospital by hospital_code
   * @param {string} hospital_code
   */
  async findByHospitalCode(hospital_code) {
    if (!hospital_code) return null;
    try {
      const res = await query(
        'SELECT * FROM public.hospitals WHERE LOWER(hospital_code) = LOWER($1) LIMIT 1',
        [hospital_code.trim()]
      );
      return res.rows[0] || null;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        for (const h of inMemoryHospitals.values()) {
          if (h.hospital_code && h.hospital_code.toLowerCase() === hospital_code.trim().toLowerCase()) {
            return h;
          }
        }
        return null;
      }
      throw dbErr;
    }
  },

  /**
   * List all hospitals with optional filters & pagination
   * @param {Object} filters
   * @param {string} [filters.district_id]
   * @param {string} [filters.taluka_id]
   * @param {string} [filters.status]
   * @param {string} [filters.search]
   * @param {number} [filters.limit=50]
   * @param {number} [filters.offset=0]
   */
  async findAll({
    district_id,
    taluka_id,
    status,
    search,
    limit = 50,
    offset = 0,
  } = {}) {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (district_id) {
      conditions.push(`district_id = $${idx}`);
      values.push(district_id);
      idx++;
    }

    if (taluka_id) {
      conditions.push(`taluka_id = $${idx}`);
      values.push(taluka_id);
      idx++;
    }

    if (status) {
      conditions.push(`status = $${idx}`);
      values.push(status);
      idx++;
    }

    if (search) {
      conditions.push(`(name ILIKE $${idx} OR hospital_code ILIKE $${idx} OR pincode ILIKE $${idx} OR city ILIKE $${idx} OR taluka ILIKE $${idx} OR district ILIKE $${idx} OR scheme ILIKE $${idx})`);
      values.push(`%${search.trim()}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const selectSQL = `
      SELECT * FROM public.hospitals
      ${whereClause}
      ORDER BY created_at DESC, id DESC
      LIMIT $${idx} OFFSET $${idx + 1};
    `;
    values.push(limit, offset);

    const countSQL = `
      SELECT COUNT(*)::int AS total FROM public.hospitals
      ${whereClause};
    `;

    try {
      const [listRes, countRes] = await Promise.all([
        query(selectSQL, values),
        query(countSQL, values.slice(0, values.length - 2)),
      ]);

      return {
        hospitals: listRes.rows,
        total: countRes.rows[0]?.total || 0,
        limit,
        offset,
      };
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        let results = Array.from(inMemoryHospitals.values());

        if (district_id) {
          results = results.filter((h) => h.district_id === district_id);
        }
        if (taluka_id) {
          results = results.filter((h) => h.taluka_id === taluka_id);
        }
        if (status) {
          results = results.filter((h) => h.status === status);
        }
        if (search) {
          const s = search.toLowerCase();
          results = results.filter(
            (h) =>
              h.name?.toLowerCase().includes(s) ||
              h.hospital_code?.toLowerCase().includes(s) ||
              h.pincode?.includes(s) ||
              h.city?.toLowerCase().includes(s) ||
              h.taluka?.toLowerCase().includes(s) ||
              h.district?.toLowerCase().includes(s) ||
              h.scheme?.toLowerCase().includes(s)
          );
        }

        results.sort((a, b) => new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0));

        const total = results.length;
        const paged = results.slice(offset, offset + limit);

        return {
          hospitals: paged,
          total,
          limit,
          offset,
        };
      }
      throw dbErr;
    }
  },

  /**
   * Update hospital by UUID
   * @param {string} id
   * @param {Object} updateData
   */
  async update(id, updateData) {
    const allowedFields = [
      'hospital_code',
      'name',
      'hospital_type',
      'address',
      'address_line',
      'area',
      'city',
      'district',
      'district_id',
      'taluka',
      'taluka_id',
      'state',
      'pincode',
      'nearest_landmark',
      'latitude',
      'longitude',
      'contact_number',
      'phone',
      'email',
      'scheme',
      'specialties',
      'status',
    ];

    // Alias mapping for updateData
    const normalizedData = { ...updateData };
    if (normalizedData.type && !normalizedData.hospital_type) normalizedData.hospital_type = normalizedData.type;
    if (normalizedData.location && !normalizedData.city) normalizedData.city = normalizedData.location;
    if (normalizedData.areaTaluka && !normalizedData.taluka) normalizedData.taluka = normalizedData.areaTaluka;
    if (normalizedData.nearestLandmark && !normalizedData.nearest_landmark) normalizedData.nearest_landmark = normalizedData.nearestLandmark;
    if (normalizedData.contact && !normalizedData.contact_number) normalizedData.contact_number = normalizedData.contact;

    const fieldsToUpdate = [];
    const values = [];
    let idx = 1;

    for (const field of allowedFields) {
      if (normalizedData[field] !== undefined) {
        fieldsToUpdate.push(`${field} = $${idx}`);
        values.push(normalizedData[field]);
        idx++;
      }
    }

    if (fieldsToUpdate.length === 0) {
      return this.findById(id);
    }

    fieldsToUpdate.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const updateSQL = `
      UPDATE public.hospitals
      SET ${fieldsToUpdate.join(', ')}
      WHERE id = $${idx}
      RETURNING *;
    `;

    try {
      const res = await query(updateSQL, values);
      return res.rows[0] || null;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        const record = inMemoryHospitals.get(id);
        if (!record) return null;
        Object.assign(record, updateData, { updated_at: new Date() });
        return record;
      }
      throw dbErr;
    }
  },

  /**
   * Delete hospital by UUID
   * @param {string} id
   */
  async delete(id) {
    try {
      const res = await query(
        'DELETE FROM public.hospitals WHERE id = $1 RETURNING id, name, hospital_code',
        [id]
      );
      return res.rows[0] || null;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        const record = inMemoryHospitals.get(id);
        if (record) {
          inMemoryHospitals.delete(id);
          return { id, name: record.name, hospital_code: record.hospital_code };
        }
        return null;
      }
      throw dbErr;
    }
  },
};

export default HospitalModel;
