import { query } from '../config/db.js';

/**
 * IpdStatusUpdate Model / Data Access Object
 * Maps to `public.ipd_status_updates`
 */
export const IpdStatusUpdateModel = {
  /**
   * Log a new status change event
   */
  async create({
    ipd_admission_id,
    previous_status = null,
    new_status,
    ward_bed_number = null,
    notes = null,
    updated_by_user_id,
  }) {
    const sql = `
      INSERT INTO public.ipd_status_updates (
        ipd_admission_id,
        previous_status,
        new_status,
        ward_bed_number,
        notes,
        updated_by_user_id,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      RETURNING *;
    `;

    const res = await query(sql, [
      ipd_admission_id,
      previous_status,
      new_status,
      ward_bed_number,
      notes,
      updated_by_user_id,
    ]);

    return res.rows[0];
  },

  /**
   * Get all status updates for an admission, chronologically ordered
   */
  async findByAdmissionId(admissionId) {
    const sql = `
      SELECT 
        su.*,
        u.full_name AS updated_by_name,
        u.role AS updated_by_role
      FROM public.ipd_status_updates su
      LEFT JOIN public.users u ON su.updated_by_user_id = u.id
      WHERE su.ipd_admission_id = $1
      ORDER BY su.created_at ASC;
    `;

    const res = await query(sql, [admissionId]);
    return res.rows;
  },

  /**
   * Get all status updates for an application via joined admission
   */
  async findByApplicationId(applicationId) {
    const sql = `
      SELECT 
        su.*,
        u.full_name AS updated_by_name,
        u.role AS updated_by_role,
        ia.application_id,
        ia.ward_bed_number AS current_ward_bed
      FROM public.ipd_status_updates su
      JOIN public.ipd_admissions ia ON su.ipd_admission_id = ia.id
      LEFT JOIN public.users u ON su.updated_by_user_id = u.id
      WHERE ia.application_id = $1
      ORDER BY su.created_at ASC;
    `;

    const res = await query(sql, [applicationId]);
    return res.rows;
  },
};

export default IpdStatusUpdateModel;
