import { query } from '../config/db.js';
import crypto from 'crypto';

let columnsEnsured = false;
async function ensureSchemeColumns() {
  if (columnsEnsured) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS public.schemes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        scheme_code VARCHAR(50) UNIQUE NOT NULL,
        category VARCHAR(100) DEFAULT 'State Flagship Scheme',
        description TEXT,
        coverage_amount_text VARCHAR(150),
        maximum_coverage_amount DECIMAL(12, 2) NOT NULL DEFAULT 150000.00,
        eligibility_description TEXT,
        hotline VARCHAR(50) DEFAULT '1800-111-222',
        required_documents TEXT[],
        is_active BOOLEAN DEFAULT TRUE,
        created_by_admin_id UUID REFERENCES public.admins(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE public.schemes ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'State Flagship Scheme';
      ALTER TABLE public.schemes ADD COLUMN IF NOT EXISTS coverage_amount_text VARCHAR(150);
      ALTER TABLE public.schemes ADD COLUMN IF NOT EXISTS hotline VARCHAR(50) DEFAULT '1800-111-222';
      ALTER TABLE public.schemes ADD COLUMN IF NOT EXISTS required_documents TEXT[];
      ALTER TABLE public.schemes ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
      ALTER TABLE public.schemes ADD COLUMN IF NOT EXISTS created_by_admin_id UUID REFERENCES public.admins(id) ON DELETE SET NULL;

      CREATE INDEX IF NOT EXISTS idx_schemes_code ON public.schemes(scheme_code);
    `);
    columnsEnsured = true;
  } catch (e) {
    console.warn('[SchemeModel] Column migration warning:', e.message);
  }
}

// In-memory fallback
const inMemorySchemes = new Map();
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Scheme Model / Data Access Object
 * Maps to `public.schemes`
 */
export const SchemeModel = {
  /**
   * Create a new healthcare scheme
   */
  async create({
    name,
    code,
    scheme_code,
    category = 'State Flagship Scheme',
    description = 'Healthcare assistance scheme for eligible citizens.',
    coverageAmount,
    coverage_amount_text = '₹1,50,000 / family / year',
    maxCoverageVal,
    maximum_coverage_amount = 150000.0,
    eligibility,
    eligibility_description = 'Empanelled card holders and eligible citizens.',
    hotline = '1800-111-222',
    requiredDocuments,
    required_documents = [
      'Aadhaar Card',
      'Ration Card (Orange / Yellow / Antyodaya)',
      'Doctor Consultation / Referral Note',
    ],
    is_active = true,
    created_by_admin_id = null,
  }) {
    await ensureSchemeColumns();

    const finalCode = (scheme_code || code || 'SCHEME').trim().toUpperCase();
    const finalCoverageText = coverage_amount_text || coverageAmount || '₹1,50,000 / family / year';
    const finalMaxAmount = maximum_coverage_amount != null 
      ? Number(maximum_coverage_amount) 
      : (maxCoverageVal != null ? Number(maxCoverageVal) : 150000.0);
    const finalEligibility = eligibility_description || eligibility || 'Empanelled card holders and eligible citizens.';
    const finalDocs = Array.isArray(required_documents)
      ? required_documents
      : (Array.isArray(requiredDocuments)
          ? requiredDocuments
          : (typeof requiredDocuments === 'string'
              ? requiredDocuments.split(/[,|;]/).map((s) => s.trim()).filter(Boolean)
              : ['Aadhaar Card', 'Ration Card (Orange / Yellow / Antyodaya)']));

    const sql = `
      INSERT INTO public.schemes (
        name,
        scheme_code,
        category,
        description,
        coverage_amount_text,
        maximum_coverage_amount,
        eligibility_description,
        hotline,
        required_documents,
        is_active,
        created_by_admin_id,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *;
    `;

    try {
      const res = await query(sql, [
        name.trim(),
        finalCode,
        category.trim(),
        description.trim(),
        finalCoverageText,
        finalMaxAmount,
        finalEligibility.trim(),
        hotline.trim(),
        finalDocs,
        Boolean(is_active),
        created_by_admin_id,
      ]);
      return res.rows[0];
    } catch (dbErr) {
      if (dbErr.code === '42703') {
        columnsEnsured = false;
        await ensureSchemeColumns();
        const retryRes = await query(sql, [
          name.trim(),
          finalCode,
          category.trim(),
          description.trim(),
          finalCoverageText,
          finalMaxAmount,
          finalEligibility.trim(),
          hotline.trim(),
          finalDocs,
          Boolean(is_active),
          created_by_admin_id,
        ]);
        return retryRes.rows[0];
      }
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        const record = {
          id: crypto.randomUUID(),
          name: name.trim(),
          scheme_code: finalCode,
          category: category.trim(),
          description: description.trim(),
          coverage_amount_text: finalCoverageText,
          maximum_coverage_amount: finalMaxAmount,
          eligibility_description: finalEligibility.trim(),
          hotline: hotline.trim(),
          required_documents: finalDocs,
          is_active: Boolean(is_active),
          created_by_admin_id,
          created_at: new Date(),
          updated_at: new Date(),
        };
        inMemorySchemes.set(record.id, record);
        return record;
      }
      throw dbErr;
    }
  },

  /**
   * Find scheme by UUID with enriched statistics
   */
  async findById(id) {
    if (!id) return null;
    if (!UUID_REGEX.test(id)) {
      return this.findByCode(id);
    }
    await ensureSchemeColumns();
    try {
      const sql = `
        SELECT 
          s.*,
          u.full_name AS created_by_admin_name,
          (
            SELECT COUNT(*)::int 
            FROM public.hospital_schemes hs 
            WHERE hs.scheme_id = s.id AND hs.alignment_status = 'EMPANELLED'
          ) AS empanelled_hospitals_count,
          (
            SELECT COUNT(*)::int 
            FROM public.scheme_claims sc 
            WHERE sc.scheme_id = s.id
          ) AS claims_count,
          (
            SELECT COALESCE(SUM(sc.claimed_amount), 0)::numeric 
            FROM public.scheme_claims sc 
            WHERE sc.scheme_id = s.id
          ) AS total_claimed_amount,
          (
            SELECT COALESCE(SUM(sc.approved_amount), 0)::numeric 
            FROM public.scheme_claims sc 
            WHERE sc.scheme_id = s.id AND sc.status = 'APPROVED'
          ) AS total_approved_amount
        FROM public.schemes s
        LEFT JOIN public.admins a ON s.created_by_admin_id = a.id
        LEFT JOIN public.users u ON a.user_id = u.id
        WHERE s.id = $1
        LIMIT 1;
      `;
      const res = await query(sql, [id]);
      return res.rows[0] || null;
    } catch (dbErr) {
      if (dbErr.code === '22P02') {
        return this.findByCode(id);
      }
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        return inMemorySchemes.get(id) || null;
      }
      throw dbErr;
    }
  },

  /**
   * Find scheme by unique scheme code (e.g. 'MJPJAY', 'PMJAY')
   */
  async findByCode(schemeCode) {
    if (!schemeCode) return null;
    await ensureSchemeColumns();
    try {
      const sql = `
        SELECT 
          s.*,
          (
            SELECT COUNT(*)::int 
            FROM public.hospital_schemes hs 
            WHERE hs.scheme_id = s.id AND hs.alignment_status = 'EMPANELLED'
          ) AS empanelled_hospitals_count,
          (
            SELECT COUNT(*)::int 
            FROM public.scheme_claims sc 
            WHERE sc.scheme_id = s.id
          ) AS claims_count
        FROM public.schemes s
        WHERE LOWER(s.scheme_code) = LOWER($1)
        LIMIT 1;
      `;
      const res = await query(sql, [schemeCode.trim()]);
      return res.rows[0] || null;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        for (const sc of inMemorySchemes.values()) {
          if (sc.scheme_code && sc.scheme_code.toLowerCase() === schemeCode.trim().toLowerCase()) {
            return sc;
          }
        }
        return null;
      }
      throw dbErr;
    }
  },

  /**
   * Find all schemes with search, category filter, active filter, pagination, and total count
   */
  async findAll({ search, category, is_active, limit = 50, offset = 0 } = {}) {
    await ensureSchemeColumns();
    const conditions = [];
    const values = [];
    let idx = 1;

    if (is_active !== undefined) {
      conditions.push(`s.is_active = $${idx}`);
      values.push(Boolean(is_active));
      idx++;
    }

    if (category && category !== 'All') {
      conditions.push(`s.category ILIKE $${idx}`);
      values.push(category.trim());
      idx++;
    }

    if (search) {
      conditions.push(`(s.name ILIKE $${idx} OR s.scheme_code ILIKE $${idx} OR s.category ILIKE $${idx} OR s.description ILIKE $${idx})`);
      values.push(`%${search.trim()}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM public.schemes s
      ${whereClause};
    `;

    const dataSql = `
      SELECT 
        s.*,
        (
          SELECT COUNT(*)::int 
          FROM public.hospital_schemes hs 
          WHERE hs.scheme_id = s.id AND hs.alignment_status = 'EMPANELLED'
        ) AS empanelled_hospitals_count,
        (
          SELECT COUNT(*)::int 
          FROM public.scheme_claims sc 
          WHERE sc.scheme_id = s.id
        ) AS claims_count
      FROM public.schemes s
      ${whereClause}
      ORDER BY s.created_at DESC, s.id DESC
      LIMIT $${idx} OFFSET $${idx + 1};
    `;

    try {
      const countRes = await query(countSql, values);
      const total = countRes.rows[0]?.total || 0;

      const dataValues = [...values, limit, offset];
      const dataRes = await query(dataSql, dataValues);

      return {
        schemes: dataRes.rows,
        total,
      };
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        let results = Array.from(inMemorySchemes.values());
        if (is_active !== undefined) {
          results = results.filter((s) => s.is_active === is_active);
        }
        if (category && category !== 'All') {
          results = results.filter((s) => s.category?.toLowerCase() === category.toLowerCase());
        }
        if (search) {
          const q = search.toLowerCase();
          results = results.filter(
            (s) =>
              s.name?.toLowerCase().includes(q) ||
              s.scheme_code?.toLowerCase().includes(q) ||
              s.category?.toLowerCase().includes(q) ||
              s.description?.toLowerCase().includes(q)
          );
        }
        results.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        return {
          schemes: results.slice(offset, offset + limit),
          total: results.length,
        };
      }
      throw dbErr;
    }
  },

  /**
   * Get high-level aggregated statistics for schemes
   */
  async getStatistics() {
    await ensureSchemeColumns();

    const sql = `
      SELECT 
        COUNT(*)::int AS total_schemes,
        COUNT(CASE WHEN is_active = TRUE THEN 1 END)::int AS active_schemes,
        COUNT(CASE WHEN is_active = FALSE THEN 1 END)::int AS inactive_schemes,
        COALESCE(SUM(maximum_coverage_amount), 0)::numeric AS total_coverage_cap,
        (
          SELECT COUNT(DISTINCT hospital_id)::int 
          FROM public.hospital_schemes 
          WHERE alignment_status = 'EMPANELLED'
        ) AS total_empanelled_hospitals,
        (
          SELECT COUNT(*)::int 
          FROM public.scheme_claims
        ) AS total_claims,
        (
          SELECT COALESCE(SUM(claimed_amount), 0)::numeric 
          FROM public.scheme_claims
        ) AS total_claimed_amount,
        (
          SELECT COALESCE(SUM(approved_amount), 0)::numeric 
          FROM public.scheme_claims 
          WHERE status = 'APPROVED'
        ) AS total_approved_amount,
        (
          SELECT COUNT(DISTINCT application_id)::int 
          FROM (
            SELECT application_id FROM public.scheme_assessments WHERE eligibility_status = 'ELIGIBLE'
            UNION
            SELECT application_id FROM public.scheme_claims
          ) b
        ) AS total_beneficiaries_enrolled
      FROM public.schemes;
    `;

    const catSql = `
      SELECT category, COUNT(*)::int AS count
      FROM public.schemes
      GROUP BY category
      ORDER BY count DESC;
    `;

    try {
      const statsRes = await query(sql);
      const catRes = await query(catSql);

      const stats = statsRes.rows[0] || {};
      stats.categories_breakdown = catRes.rows || [];

      return stats;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        const all = Array.from(inMemorySchemes.values());
        return {
          total_schemes: all.length,
          active_schemes: all.filter((s) => s.is_active).length,
          inactive_schemes: all.filter((s) => !s.is_active).length,
          total_coverage_cap: all.reduce((sum, s) => sum + (Number(s.maximum_coverage_amount) || 0), 0),
          total_empanelled_hospitals: 0,
          total_claims: 0,
          total_claimed_amount: 0,
          total_approved_amount: 0,
          total_beneficiaries_enrolled: 0,
          categories_breakdown: [],
        };
      }
      throw dbErr;
    }
  },

  /**
   * Update scheme fields
   */
  async update(id, updateData) {
    await ensureSchemeColumns();
    const allowedFields = [
      'name',
      'scheme_code',
      'category',
      'description',
      'coverage_amount_text',
      'maximum_coverage_amount',
      'eligibility_description',
      'hotline',
      'required_documents',
      'is_active',
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

    const sql = `
      UPDATE public.schemes
      SET ${fieldsToUpdate.join(', ')}
      WHERE id = $${idx}
      RETURNING *;
    `;
    try {
      const res = await query(sql, values);
      return res.rows[0] || null;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        const record = inMemorySchemes.get(id);
        if (!record) return null;
        Object.assign(record, updateData, { updated_at: new Date() });
        return record;
      }
      throw dbErr;
    }
  },

  /**
   * Soft delete or toggle active status
   */
  async setActiveStatus(id, isActive) {
    return this.update(id, { is_active: Boolean(isActive) });
  },

  /**
   * Delete scheme by UUID
   */
  async delete(id) {
    await ensureSchemeColumns();
    try {
      const sql = `DELETE FROM public.schemes WHERE id = $1 RETURNING *;`;
      const res = await query(sql, [id]);
      return res.rows[0] || null;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        const record = inMemorySchemes.get(id);
        if (record) {
          inMemorySchemes.delete(id);
          return record;
        }
        return null;
      }
      throw dbErr;
    }
  },
};

export default SchemeModel;
