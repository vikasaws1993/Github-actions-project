import { query } from '../config/db.js';
import crypto from 'crypto';

let tableEnsured = false;
async function ensureHospitalSchemeTable() {
  if (tableEnsured) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS public.hospital_schemes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
        scheme_id UUID NOT NULL REFERENCES public.schemes(id) ON DELETE CASCADE,
        alignment_status VARCHAR(50) DEFAULT 'EMPANELLED',
        alignment_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
        alignment_end_date DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_hospital_schemes_hospital ON public.hospital_schemes(hospital_id);
      CREATE INDEX IF NOT EXISTS idx_hospital_schemes_scheme ON public.hospital_schemes(scheme_id);
    `);
    tableEnsured = true;
  } catch (e) {
    console.warn('[HospitalSchemeModel] Table migration warning:', e.message);
  }
}

// In-memory fallback
const inMemoryHospitalSchemes = new Map();

/**
 * HospitalScheme Model / Data Access Object
 * Maps to `public.hospital_schemes` (M:N junction between Hospitals & Schemes)
 */
export const HospitalSchemeModel = {
  /**
   * Find all hospitals empanelled for a specific scheme
   */
  async findHospitalsBySchemeId(schemeId, { search, alignment_status, limit = 50, offset = 0 } = {}) {
    await ensureHospitalSchemeTable();

    const conditions = [`hs.scheme_id = $1`];
    const values = [schemeId];
    let idx = 2;

    if (alignment_status) {
      conditions.push(`hs.alignment_status = $${idx}`);
      values.push(alignment_status.toUpperCase());
      idx++;
    }

    if (search) {
      conditions.push(`(h.name ILIKE $${idx} OR h.city ILIKE $${idx} OR h.district ILIKE $${idx} OR h.hospital_type ILIKE $${idx})`);
      values.push(`%${search.trim()}%`);
      idx++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM public.hospital_schemes hs
      JOIN public.hospitals h ON hs.hospital_id = h.id
      ${whereClause};
    `;

    const dataSql = `
      SELECT 
        hs.id AS alignment_id,
        hs.scheme_id,
        hs.alignment_status,
        hs.alignment_start_date,
        hs.alignment_end_date,
        hs.created_at AS empanelled_at,
        h.id AS hospital_id,
        h.name,
        h.hospital_type,
        h.phone,
        h.email,
        h.city,
        h.taluka,
        h.district,
        h.state,
        h.pincode,
        h.address_line,
        h.status AS hospital_status
      FROM public.hospital_schemes hs
      JOIN public.hospitals h ON hs.hospital_id = h.id
      ${whereClause}
      ORDER BY hs.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1};
    `;

    try {
      const countRes = await query(countSql, values);
      const total = countRes.rows[0]?.total || 0;

      const dataValues = [...values, limit, offset];
      const dataRes = await query(dataSql, dataValues);

      return {
        hospitals: dataRes.rows,
        total,
      };
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        let results = Array.from(inMemoryHospitalSchemes.values()).filter(
          (hs) => hs.scheme_id === schemeId
        );
        if (alignment_status) {
          results = results.filter((hs) => hs.alignment_status === alignment_status.toUpperCase());
        }
        return {
          hospitals: results.slice(offset, offset + limit),
          total: results.length,
        };
      }
      throw dbErr;
    }
  },

  /**
   * Find all schemes empanelled for a specific hospital
   */
  async findSchemesByHospitalId(hospitalId, { alignment_status = 'EMPANELLED' } = {}) {
    await ensureHospitalSchemeTable();

    const sql = `
      SELECT 
        hs.id AS alignment_id,
        hs.hospital_id,
        hs.alignment_status,
        hs.alignment_start_date,
        hs.alignment_end_date,
        s.id AS scheme_id,
        s.name,
        s.scheme_code,
        s.category,
        s.coverage_amount_text,
        s.maximum_coverage_amount,
        s.is_active
      FROM public.hospital_schemes hs
      JOIN public.schemes s ON hs.scheme_id = s.id
      WHERE hs.hospital_id = $1
        AND ($2::varchar IS NULL OR hs.alignment_status = $2)
      ORDER BY hs.created_at DESC;
    `;

    try {
      const res = await query(sql, [hospitalId, alignment_status]);
      return res.rows;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        return Array.from(inMemoryHospitalSchemes.values()).filter(
          (hs) => hs.hospital_id === hospitalId
        );
      }
      throw dbErr;
    }
  },

  /**
   * Empanel a single hospital to a scheme (or update alignment if exists)
   */
  async empanelHospital({
    hospital_id,
    scheme_id,
    alignment_status = 'EMPANELLED',
    alignment_start_date = new Date().toISOString().split('T')[0],
    alignment_end_date = null,
  }) {
    await ensureHospitalSchemeTable();

    const existingSql = `
      SELECT id FROM public.hospital_schemes 
      WHERE hospital_id = $1 AND scheme_id = $2
      LIMIT 1;
    `;

    try {
      const existing = await query(existingSql, [hospital_id, scheme_id]);

      if (existing.rows.length > 0) {
        const updateSql = `
          UPDATE public.hospital_schemes
          SET 
            alignment_status = $1,
            alignment_start_date = $2,
            alignment_end_date = $3,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
          RETURNING *;
        `;
        const res = await query(updateSql, [
          alignment_status,
          alignment_start_date,
          alignment_end_date,
          existing.rows[0].id,
        ]);
        return res.rows[0];
      }

      const insertSql = `
        INSERT INTO public.hospital_schemes (
          hospital_id,
          scheme_id,
          alignment_status,
          alignment_start_date,
          alignment_end_date
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
      `;
      const res = await query(insertSql, [
        hospital_id,
        scheme_id,
        alignment_status,
        alignment_start_date,
        alignment_end_date,
      ]);
      return res.rows[0];
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        const key = `${hospital_id}_${scheme_id}`;
        const record = {
          id: crypto.randomUUID(),
          hospital_id,
          scheme_id,
          alignment_status,
          alignment_start_date,
          alignment_end_date,
          created_at: new Date(),
          updated_at: new Date(),
        };
        inMemoryHospitalSchemes.set(key, record);
        return record;
      }
      throw dbErr;
    }
  },

  /**
   * Batch empanel multiple hospitals to a scheme
   */
  async batchEmpanelHospitals({
    scheme_id,
    hospital_ids = [],
    alignment_status = 'EMPANELLED',
    alignment_start_date = new Date().toISOString().split('T')[0],
    alignment_end_date = null,
  }) {
    const results = [];
    for (const hid of hospital_ids) {
      const record = await this.empanelHospital({
        hospital_id: hid,
        scheme_id,
        alignment_status,
        alignment_start_date,
        alignment_end_date,
      });
      results.push(record);
    }
    return results;
  },

  /**
   * De-empanel or remove a hospital from a scheme
   */
  async deEmpanelHospital(scheme_id, hospital_id) {
    await ensureHospitalSchemeTable();

    const sql = `
      DELETE FROM public.hospital_schemes
      WHERE scheme_id = $1 AND hospital_id = $2
      RETURNING *;
    `;

    try {
      const res = await query(sql, [scheme_id, hospital_id]);
      return res.rows[0] || null;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        const key = `${hospital_id}_${scheme_id}`;
        const record = inMemoryHospitalSchemes.get(key);
        if (record) {
          inMemoryHospitalSchemes.delete(key);
          return record;
        }
        return null;
      }
      throw dbErr;
    }
  },

  /**
   * Update empanelment status (e.g., SUSPENDED, EMPANELLED)
   */
  async updateStatus(scheme_id, hospital_id, status) {
    await ensureHospitalSchemeTable();

    const sql = `
      UPDATE public.hospital_schemes
      SET alignment_status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE scheme_id = $2 AND hospital_id = $3
      RETURNING *;
    `;

    try {
      const res = await query(sql, [status.toUpperCase(), scheme_id, hospital_id]);
      return res.rows[0] || null;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        const key = `${hospital_id}_${scheme_id}`;
        const record = inMemoryHospitalSchemes.get(key);
        if (record) {
          record.alignment_status = status.toUpperCase();
          record.updated_at = new Date();
          return record;
        }
        return null;
      }
      throw dbErr;
    }
  },

  /**
   * Count empanelled hospitals for a scheme
   */
  async countBySchemeId(schemeId, alignment_status = 'EMPANELLED') {
    await ensureHospitalSchemeTable();

    const sql = `
      SELECT COUNT(*)::int AS count
      FROM public.hospital_schemes
      WHERE scheme_id = $1 AND ($2::varchar IS NULL OR alignment_status = $2);
    `;

    try {
      const res = await query(sql, [schemeId, alignment_status]);
      return res.rows[0]?.count || 0;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        return Array.from(inMemoryHospitalSchemes.values()).filter(
          (hs) => hs.scheme_id === schemeId && (!alignment_status || hs.alignment_status === alignment_status)
        ).length;
      }
      return 0;
    }
  },
};

export default HospitalSchemeModel;
