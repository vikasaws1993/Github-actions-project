import { query } from '../config/db.js';

/**
 * SchemeClaim Model / Data Access Object
 * Maps to `public.scheme_claims`
 */
export const SchemeClaimModel = {
  /**
   * Create a new scheme claim
   */
  async create({
    application_id,
    scheme_id,
    hospital_id,
    arogya_sevak_id,
    claim_number,
    claimed_amount,
    approved_amount = null,
    status = 'PENDING',
    claim_date = new Date(),
    approval_date = null,
    remarks = null,
  }) {
    const sql = `
      INSERT INTO public.scheme_claims (
        application_id,
        scheme_id,
        hospital_id,
        arogya_sevak_id,
        claim_number,
        claimed_amount,
        approved_amount,
        status,
        claim_date,
        approval_date,
        remarks,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *;
    `;
    const res = await query(sql, [
      application_id,
      scheme_id,
      hospital_id,
      arogya_sevak_id,
      claim_number,
      claimed_amount,
      approved_amount,
      status,
      claim_date,
      approval_date,
      remarks,
    ]);
    return res.rows[0];
  },

  /**
   * Find claim by UUID
   */
  async findById(id) {
    const sql = `
      SELECT 
        sc.*,
        s.name AS scheme_name,
        s.scheme_code,
        h.name AS hospital_name,
        h.hospital_code,
        app.application_number
      FROM public.scheme_claims sc
      LEFT JOIN public.schemes s ON sc.scheme_id = s.id
      LEFT JOIN public.hospitals h ON sc.hospital_id = h.id
      LEFT JOIN public.applications app ON sc.application_id = app.id
      WHERE sc.id = $1
      LIMIT 1;
    `;
    const res = await query(sql, [id]);
    return res.rows[0] || null;
  },

  /**
   * Find claim by unique claim number
   */
  async findByClaimNumber(claimNumber) {
    const sql = `
      SELECT 
        sc.*,
        s.name AS scheme_name,
        s.scheme_code,
        h.name AS hospital_name,
        app.application_number
      FROM public.scheme_claims sc
      LEFT JOIN public.schemes s ON sc.scheme_id = s.id
      LEFT JOIN public.hospitals h ON sc.hospital_id = h.id
      LEFT JOIN public.applications app ON sc.application_id = app.id
      WHERE sc.claim_number = $1
      LIMIT 1;
    `;
    const res = await query(sql, [claimNumber]);
    return res.rows[0] || null;
  },

  /**
   * Find claims by application UUID
   */
  async findByApplicationId(applicationId) {
    const sql = `
      SELECT 
        sc.*,
        s.name AS scheme_name,
        s.scheme_code,
        h.name AS hospital_name
      FROM public.scheme_claims sc
      LEFT JOIN public.schemes s ON sc.scheme_id = s.id
      LEFT JOIN public.hospitals h ON sc.hospital_id = h.id
      WHERE sc.application_id = $1
      ORDER BY sc.created_at DESC;
    `;
    const res = await query(sql, [applicationId]);
    return res.rows;
  },

  /**
   * Find all claims with filters and pagination
   */
  async findAll({
    hospital_id,
    scheme_id,
    arogya_sevak_id,
    status,
    search,
    limit = 50,
    offset = 0,
  } = {}) {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (hospital_id) {
      conditions.push(`sc.hospital_id = $${idx}`);
      values.push(hospital_id);
      idx++;
    }

    if (scheme_id) {
      conditions.push(`sc.scheme_id = $${idx}`);
      values.push(scheme_id);
      idx++;
    }

    if (arogya_sevak_id) {
      conditions.push(`sc.arogya_sevak_id = $${idx}`);
      values.push(arogya_sevak_id);
      idx++;
    }

    if (status) {
      conditions.push(`sc.status = $${idx}`);
      values.push(status);
      idx++;
    }

    if (search) {
      conditions.push(`(sc.claim_number ILIKE $${idx} OR s.name ILIKE $${idx} OR h.name ILIKE $${idx})`);
      values.push(`%${search.trim()}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT 
        sc.*,
        s.name AS scheme_name,
        s.scheme_code,
        h.name AS hospital_name,
        app.application_number
      FROM public.scheme_claims sc
      LEFT JOIN public.schemes s ON sc.scheme_id = s.id
      LEFT JOIN public.hospitals h ON sc.hospital_id = h.id
      LEFT JOIN public.applications app ON sc.application_id = app.id
      ${whereClause}
      ORDER BY sc.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1};
    `;
    values.push(limit, offset);

    const res = await query(sql, values);
    return res.rows;
  },

  /**
   * Update claim status and approval details
   */
  async updateStatus(id, { status, approved_amount = null, approval_date = null, remarks = null }) {
    const sql = `
      UPDATE public.scheme_claims
      SET 
        status = $1,
        approved_amount = COALESCE($2, approved_amount),
        approval_date = COALESCE($3, approval_date),
        remarks = COALESCE($4, remarks),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *;
    `;
    const res = await query(sql, [status, approved_amount, approval_date, remarks, id]);
    return res.rows[0] || null;
  },
};

export default SchemeClaimModel;
