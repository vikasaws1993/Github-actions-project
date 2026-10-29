import { query } from '../config/db.js';

/**
 * SchemeAssessment Model / Data Access Object
 * Maps to `public.scheme_assessments`
 */
export const SchemeAssessmentModel = {
  /**
   * Create an initial or revised scheme assessment
   */
  async create({
    application_id,
    scheme_id,
    eligibility_status,
    reason = null,
    remarks = null,
    assessed_by_admin_id,
  }) {
    const sql = `
      INSERT INTO public.scheme_assessments (
        application_id,
        scheme_id,
        eligibility_status,
        reason,
        remarks,
        assessed_at,
        assessed_by_admin_id
      )
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6)
      RETURNING *;
    `;
    const res = await query(sql, [
      application_id,
      scheme_id,
      eligibility_status,
      reason,
      remarks,
      assessed_by_admin_id,
    ]);
    return res.rows[0];
  },

  /**
   * Find scheme assessment by ID
   */
  async findById(id) {
    const sql = `
      SELECT 
        sa.*,
        s.name AS scheme_name,
        s.scheme_code,
        s.maximum_coverage_amount,
        u.full_name AS assessed_by_admin_name
      FROM public.scheme_assessments sa
      LEFT JOIN public.schemes s ON sa.scheme_id = s.id
      LEFT JOIN public.admins a ON sa.assessed_by_admin_id = a.id
      LEFT JOIN public.users u ON a.user_id = u.id
      WHERE sa.id = $1
      LIMIT 1;
    `;
    const res = await query(sql, [id]);
    return res.rows[0] || null;
  },

  /**
   * Find assessments by application_id
   */
  async findByApplicationId(applicationId) {
    const sql = `
      SELECT 
        sa.*,
        s.name AS scheme_name,
        s.scheme_code,
        s.maximum_coverage_amount,
        u.full_name AS assessed_by_admin_name
      FROM public.scheme_assessments sa
      LEFT JOIN public.schemes s ON sa.scheme_id = s.id
      LEFT JOIN public.admins a ON sa.assessed_by_admin_id = a.id
      LEFT JOIN public.users u ON a.user_id = u.id
      WHERE sa.application_id = $1
      ORDER BY sa.assessed_at DESC;
    `;
    const res = await query(sql, [applicationId]);
    return res.rows;
  },

  /**
   * Find all scheme assessments with optional filters
   */
  async findAll({ application_id, scheme_id, eligibility_status, limit = 50, offset = 0 } = {}) {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (application_id) {
      conditions.push(`sa.application_id = $${idx}`);
      values.push(application_id);
      idx++;
    }

    if (scheme_id) {
      conditions.push(`sa.scheme_id = $${idx}`);
      values.push(scheme_id);
      idx++;
    }

    if (eligibility_status) {
      conditions.push(`sa.eligibility_status = $${idx}`);
      values.push(eligibility_status);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT 
        sa.*,
        s.name AS scheme_name,
        s.scheme_code,
        u.full_name AS assessed_by_admin_name
      FROM public.scheme_assessments sa
      LEFT JOIN public.schemes s ON sa.scheme_id = s.id
      LEFT JOIN public.admins a ON sa.assessed_by_admin_id = a.id
      LEFT JOIN public.users u ON a.user_id = u.id
      ${whereClause}
      ORDER BY sa.assessed_at DESC
      LIMIT $${idx} OFFSET $${idx + 1};
    `;
    values.push(limit, offset);

    const res = await query(sql, values);
    return res.rows;
  },

  /**
   * Update assessment remarks or status
   */
  async update(id, { eligibility_status, reason, remarks }) {
    const fieldsToUpdate = [];
    const values = [];
    let idx = 1;

    if (eligibility_status !== undefined) {
      fieldsToUpdate.push(`eligibility_status = $${idx}`);
      values.push(eligibility_status);
      idx++;
    }
    if (reason !== undefined) {
      fieldsToUpdate.push(`reason = $${idx}`);
      values.push(reason);
      idx++;
    }
    if (remarks !== undefined) {
      fieldsToUpdate.push(`remarks = $${idx}`);
      values.push(remarks);
      idx++;
    }

    if (fieldsToUpdate.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const sql = `
      UPDATE public.scheme_assessments
      SET ${fieldsToUpdate.join(', ')}
      WHERE id = $${idx}
      RETURNING *;
    `;
    const res = await query(sql, values);
    return res.rows[0] || null;
  },
};

export default SchemeAssessmentModel;
