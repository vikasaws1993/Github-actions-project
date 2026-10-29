import { query } from '../config/db.js';

let tableEnsured = false;

export const CREATE_DAILY_UPDATES_TABLE_SQL = `
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";

  CREATE TABLE IF NOT EXISTS public.arogya_sevak_daily_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
    sevak_id UUID REFERENCES public.arogya_sevaks(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    report_date DATE NOT NULL DEFAULT CURRENT_DATE,
    shift VARCHAR(50) NOT NULL DEFAULT 'Morning Shift',
    
    -- Inpatient & Staff Counts
    wards_available INT NOT NULL DEFAULT 0,
    wards_total INT NOT NULL DEFAULT 0,
    general_available INT NOT NULL DEFAULT 0,
    general_total INT NOT NULL DEFAULT 85,
    icu_available INT NOT NULL DEFAULT 0,
    icu_total INT NOT NULL DEFAULT 15,
    nicu_available INT NOT NULL DEFAULT 0,
    nicu_total INT NOT NULL DEFAULT 0,
    picu_available INT NOT NULL DEFAULT 0,
    picu_total INT NOT NULL DEFAULT 0,
    isolation_available INT NOT NULL DEFAULT 0,
    isolation_total INT NOT NULL DEFAULT 0,

    my_admissions INT NOT NULL DEFAULT 0,
    doctors_on_duty INT NOT NULL DEFAULT 0,

    -- Critical Resources & Equipment
    ventilators_available INT NOT NULL DEFAULT 0,
    oxygen_beds_available INT NOT NULL DEFAULT 0,
    dialysis_machines_free INT NOT NULL DEFAULT 0,
    active_operation_theatres INT NOT NULL DEFAULT 0,

    -- OPD Doctor Records & Shift Remarks
    opd_doctor_records JSONB DEFAULT '[]'::jsonb,
    remarks TEXT,
    reporting_officer_name VARCHAR(200),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_daily_updates_hospital_date ON public.arogya_sevak_daily_updates(hospital_id, report_date);
  CREATE INDEX IF NOT EXISTS idx_daily_updates_sevak ON public.arogya_sevak_daily_updates(sevak_id);
`;

async function ensureTable() {
  if (tableEnsured) return;
  try {
    await query(CREATE_DAILY_UPDATES_TABLE_SQL);
    await query(`
      ALTER TABLE public.arogya_sevak_daily_updates
        ADD COLUMN IF NOT EXISTS wards_available INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS wards_total INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS nicu_available INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS nicu_total INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS picu_available INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS picu_total INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS isolation_available INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS isolation_total INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS opd_doctor_records JSONB DEFAULT '[]'::jsonb;
    `);
    tableEnsured = true;
  } catch (err) {
    console.warn('[DailyUpdateModel] Table creation notice:', err.message);
  }
}

export const DailyUpdateModel = {
  /**
   * Run migration DDL
   */
  async createTable() {
    await ensureTable();
  },

  /**
   * Create or update daily report entry
   */
  async createReport(data) {
    await ensureTable();

    const sql = `
      INSERT INTO public.arogya_sevak_daily_updates (
        hospital_id,
        sevak_id,
        user_id,
        report_date,
        shift,
        wards_available,
        wards_total,
        general_available,
        general_total,
        icu_available,
        icu_total,
        nicu_available,
        nicu_total,
        picu_available,
        picu_total,
        isolation_available,
        isolation_total,
        my_admissions,
        doctors_on_duty,
        ventilators_available,
        oxygen_beds_available,
        dialysis_machines_free,
        active_operation_theatres,
        opd_doctor_records,
        remarks,
        reporting_officer_name,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, COALESCE($4, CURRENT_DATE), $5,
        $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
        $18, $19,
        $20, $21, $22, $23,
        $24, $25, $26,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING *;
    `;

    const values = [
      data.hospital_id,
      data.sevak_id || null,
      data.user_id || null,
      data.report_date || null,
      data.shift || 'Morning Shift',
      parseInt(data.wards_available, 10) || 0,
      parseInt(data.wards_total, 10) || 0,
      parseInt(data.general_available, 10) || 0,
      parseInt(data.general_total, 10) || 85,
      parseInt(data.icu_available, 10) || 0,
      parseInt(data.icu_total, 10) || 15,
      parseInt(data.nicu_available, 10) || 0,
      parseInt(data.nicu_total, 10) || 0,
      parseInt(data.picu_available, 10) || 0,
      parseInt(data.picu_total, 10) || 0,
      parseInt(data.isolation_available, 10) || 0,
      parseInt(data.isolation_total, 10) || 0,
      parseInt(data.my_admissions, 10) || 0,
      parseInt(data.doctors_on_duty, 10) || 0,
      parseInt(data.ventilators_available, 10) || 0,
      parseInt(data.oxygen_beds_available, 10) || 0,
      parseInt(data.dialysis_machines_free, 10) || 0,
      parseInt(data.active_operation_theatres, 10) || 0,
      JSON.stringify(data.opd_doctor_records || []),
      data.remarks || '',
      data.reporting_officer_name || 'Arogya Sevak',
    ];

    const res = await query(sql, values);
    return res.rows[0];
  },

  /**
   * Get latest daily update reports for a hospital (optionally filtered by user/sevak)
   */
  async getRecentReports(hospitalId, limit = 20, userId = null, sevakId = null) {
    await ensureTable();

    let sql = `
      SELECT 
        d.*,
        h.name AS hospital_name,
        u.full_name AS sevak_full_name,
        u.mobile AS sevak_mobile
      FROM public.arogya_sevak_daily_updates d
      JOIN public.hospitals h ON h.id = d.hospital_id
      LEFT JOIN public.users u ON u.id = d.user_id
      WHERE d.hospital_id = $1
    `;
    const params = [hospitalId];

    if (userId || sevakId) {
      sql += ` AND (d.user_id = $2 OR d.sevak_id = $3)`;
      params.push(userId, sevakId);
      sql += ` ORDER BY d.created_at DESC LIMIT $4;`;
      params.push(limit);
    } else {
      sql += ` ORDER BY d.created_at DESC LIMIT $2;`;
      params.push(limit);
    }

    const res = await query(sql, params);
    return res.rows;
  },

  /**
   * Get latest report summary for a hospital
   */
  async getLatestReport(hospitalId) {
    await ensureTable();

    const sql = `
      SELECT *
      FROM public.arogya_sevak_daily_updates
      WHERE hospital_id = $1
      ORDER BY created_at DESC
      LIMIT 1;
    `;

    const res = await query(sql, [hospitalId]);
    return res.rows[0] || null;
  },
};

export default DailyUpdateModel;
