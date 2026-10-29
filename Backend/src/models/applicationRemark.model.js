import { query } from '../config/db.js';

/**
 * ApplicationRemark Model / Data Access Object
 * Maps to `public.application_remarks`
 */
export const ApplicationRemarkModel = {
  /**
   * Add a remark/note to an application
   */
  async create({
    application_id,
    created_by_user_id,
    remark_type,
    remark,
  }) {
    const sql = `
      INSERT INTO public.application_remarks (
        application_id,
        created_by_user_id,
        remark_type,
        remark,
        created_at
      )
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      RETURNING *;
    `;
    const res = await query(sql, [
      application_id,
      created_by_user_id,
      remark_type,
      remark,
    ]);
    return res.rows[0];
  },

  /**
   * Find remark by UUID
   */
  async findById(id) {
    const sql = `
      SELECT 
        ar.*,
        u.full_name AS author_name,
        u.role AS author_role
      FROM public.application_remarks ar
      LEFT JOIN public.users u ON ar.created_by_user_id = u.id
      WHERE ar.id = $1
      LIMIT 1;
    `;
    const res = await query(sql, [id]);
    return res.rows[0] || null;
  },

  /**
   * Find all remarks for an application, sorted chronologically
   */
  async findByApplicationId(applicationId) {
    const sql = `
      SELECT 
        ar.*,
        u.full_name AS author_name,
        u.role AS author_role
      FROM public.application_remarks ar
      LEFT JOIN public.users u ON ar.created_by_user_id = u.id
      WHERE ar.application_id = $1
      ORDER BY ar.created_at ASC;
    `;
    const res = await query(sql, [applicationId]);
    return res.rows;
  },

  /**
   * Delete remark
   */
  async delete(id) {
    const sql = `DELETE FROM public.application_remarks WHERE id = $1 RETURNING *;`;
    const res = await query(sql, [id]);
    return res.rows[0] || null;
  },
};

export default ApplicationRemarkModel;
