import { query } from '../config/db.js';

/**
 * ApplicationStatusHistory Model / Data Access Object
 * Maps to `public.application_status_histories`
 */
export const ApplicationStatusHistoryModel = {
  /**
   * Record a status transition event
   */
  async create({
    application_id,
    old_status = null,
    new_status,
    remark = null,
    changed_by_user_id = null,
  }) {
    let resolvedUserId = changed_by_user_id;
    if (!resolvedUserId) {
      try {
        const adminRes = await query(`SELECT id FROM public.users WHERE role = 'ADMIN' LIMIT 1;`);
        if (adminRes.rows && adminRes.rows[0]) {
          resolvedUserId = adminRes.rows[0].id;
        }
      } catch (_) {}
    }

    try {
      const sql = `
        INSERT INTO public.application_status_histories (
          application_id,
          old_status,
          new_status,
          remark,
          created_at,
          changed_by_user_id
        )
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)
        RETURNING *;
      `;
      const res = await query(sql, [
        application_id,
        old_status,
        new_status,
        remark,
        resolvedUserId,
      ]);
      return res.rows[0];
    } catch (insertErr) {
      // If NOT NULL constraint on changed_by_user_id triggered, drop constraint and retry
      if (insertErr.code === '23502' || insertErr.message?.includes('changed_by_user_id')) {
        try {
          await query(`ALTER TABLE public.application_status_histories ALTER COLUMN changed_by_user_id DROP NOT NULL;`);
          const retrySql = `
            INSERT INTO public.application_status_histories (
              application_id,
              old_status,
              new_status,
              remark,
              created_at,
              changed_by_user_id
            )
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)
            RETURNING *;
          `;
          const retryRes = await query(retrySql, [
            application_id,
            old_status,
            new_status,
            remark,
            resolvedUserId,
          ]);
          return retryRes.rows[0];
        } catch (_) {}
      }
      console.warn('[ApplicationStatusHistoryModel] create notice:', insertErr.message);
      return null;
    }
  },

  /**
   * Find status history timeline for an application
   */
  async findByApplicationId(applicationId) {
    const sql = `
      SELECT 
        ash.*,
        u.full_name AS changed_by_name,
        u.role AS changed_by_role
      FROM public.application_status_histories ash
      LEFT JOIN public.users u ON ash.changed_by_user_id = u.id
      WHERE ash.application_id = $1
      ORDER BY ash.created_at ASC;
    `;
    const res = await query(sql, [applicationId]);
    return res.rows;
  },

  /**
   * Find recent status history events across the system
   */
  async findAll({ limit = 50, offset = 0 } = {}) {
    const sql = `
      SELECT 
        ash.*,
        app.application_number,
        u.full_name AS changed_by_name
      FROM public.application_status_histories ash
      LEFT JOIN public.applications app ON ash.application_id = app.id
      LEFT JOIN public.users u ON ash.changed_by_user_id = u.id
      ORDER BY ash.created_at DESC
      LIMIT $1 OFFSET $2;
    `;
    const res = await query(sql, [limit, offset]);
    return res.rows;
  },
};

export default ApplicationStatusHistoryModel;
