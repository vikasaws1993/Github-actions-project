import { query } from '../config/db.js';

/**
 * Case Archive Model
 * Maps to `public.case_archives`
 */
export const CaseArchiveModel = {
  /**
   * Create an archive record for an application
   */
  async create({
    application_id,
    application_number,
    patient_id,
    citizen_id,
    closure_date,
    retention_days = 60,
    archived_data = {},
  }, client = null) {
    const sql = `
      INSERT INTO public.case_archives (
        application_id,
        application_number,
        patient_id,
        citizen_id,
        closure_date,
        retention_days,
        archived_data,
        archived_at,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *;
    `;

    const values = [
      application_id,
      application_number,
      patient_id,
      citizen_id,
      closure_date,
      retention_days,
      JSON.stringify(archived_data),
    ];

    const executor = client ? client.query.bind(client) : query;
    const res = await executor(sql, values);
    return res.rows[0];
  },

  /**
   * Find archive record by application ID
   */
  async findByApplicationId(applicationId) {
    const sql = `
      SELECT * FROM public.case_archives 
      WHERE application_id = $1 
      ORDER BY archived_at DESC 
      LIMIT 1;
    `;
    const res = await query(sql, [applicationId]);
    return res.rows[0] || null;
  },

  /**
   * Find archive record by ID
   */
  async findById(id) {
    const sql = `SELECT * FROM public.case_archives WHERE id = $1 LIMIT 1;`;
    const res = await query(sql, [id]);
    return res.rows[0] || null;
  },

  /**
   * Find all archived cases
   */
  async findAll({ limit = 50, offset = 0 } = {}) {
    const sql = `
      SELECT 
        id,
        application_id,
        application_number,
        patient_id,
        citizen_id,
        closure_date,
        retention_days,
        archived_at,
        created_at
      FROM public.case_archives
      ORDER BY archived_at DESC
      LIMIT $1 OFFSET $2;
    `;
    const res = await query(sql, [limit, offset]);
    return res.rows;
  },
};

export default CaseArchiveModel;
