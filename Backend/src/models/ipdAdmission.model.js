import { query } from '../config/db.js';

/**
 * Valid IPD Status Transitions
 */
export const IPD_STATUSES = [
  'ADMITTED_WARD',
  'IN_ICU',
  'SURGERY_PLANNED',
  'TREATMENT_ONGOING',
  'DISCHARGED',
];

/**
 * SQL DDL for ipd_admissions and ipd_status_updates tables
 */
export const CREATE_IPD_TABLES_SQL = `
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";

  -- Table 25: ipd_admissions (1:1 with application)
  CREATE TABLE IF NOT EXISTS public.ipd_admissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID UNIQUE NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
    admission_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ward_bed_number VARCHAR(100) NOT NULL,
    current_status VARCHAR(50) NOT NULL DEFAULT 'ADMITTED_WARD'
      CHECK (current_status IN ('ADMITTED_WARD', 'IN_ICU', 'SURGERY_PLANNED', 'TREATMENT_ONGOING', 'DISCHARGED')),
    discharge_date TIMESTAMP WITH TIME ZONE,
    discharge_summary_url TEXT,
    admitting_doctor VARCHAR(150),
    diagnosis TEXT,
    admitted_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_ipd_admissions_app ON public.ipd_admissions(application_id);
  CREATE INDEX IF NOT EXISTS idx_ipd_admissions_patient ON public.ipd_admissions(patient_id);
  CREATE INDEX IF NOT EXISTS idx_ipd_admissions_hospital ON public.ipd_admissions(hospital_id);
  CREATE INDEX IF NOT EXISTS idx_ipd_admissions_status ON public.ipd_admissions(current_status);

  -- Table 26: ipd_status_updates (Timestamped treatment audit trail)
  CREATE TABLE IF NOT EXISTS public.ipd_status_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ipd_admission_id UUID NOT NULL REFERENCES public.ipd_admissions(id) ON DELETE CASCADE,
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL
      CHECK (new_status IN ('ADMITTED_WARD', 'IN_ICU', 'SURGERY_PLANNED', 'TREATMENT_ONGOING', 'DISCHARGED')),
    ward_bed_number VARCHAR(100),
    notes TEXT,
    updated_by_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_ipd_status_updates_admission ON public.ipd_status_updates(ipd_admission_id);
  CREATE INDEX IF NOT EXISTS idx_ipd_status_updates_created ON public.ipd_status_updates(created_at ASC);
`;

/**
 * IpdAdmission Model / Data Access Object
 * Maps to `public.ipd_admissions`
 */
export const IpdAdmissionModel = {
  /**
   * Ensure IPD tables exist
   */
  async ensureTablesExist() {
    await query(CREATE_IPD_TABLES_SQL);
  },

  /**
   * Create an IPD admission record (1:1 with application)
   * Automatically initializes the first entry in ipd_status_updates.
   */
  async create({
    application_id,
    patient_id = null,
    hospital_id,
    admission_date = new Date(),
    ward_bed_number,
    current_status = 'ADMITTED_WARD',
    admitting_doctor = null,
    diagnosis = null,
    admitted_by_user_id = null,
    initial_notes = null,
  }) {
    // If patient_id not provided, look it up from applications
    let targetPatientId = patient_id;
    if (!targetPatientId && application_id) {
      const appRes = await query('SELECT patient_id FROM public.applications WHERE id = $1 LIMIT 1', [application_id]);
      if (appRes.rows.length > 0) {
        targetPatientId = appRes.rows[0].patient_id;
      }
    }

    const insertSql = `
      INSERT INTO public.ipd_admissions (
        application_id,
        patient_id,
        hospital_id,
        admission_date,
        ward_bed_number,
        current_status,
        admitting_doctor,
        diagnosis,
        admitted_by_user_id,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *;
    `;

    const res = await query(insertSql, [
      application_id,
      targetPatientId,
      hospital_id,
      admission_date,
      ward_bed_number,
      current_status,
      admitting_doctor,
      diagnosis,
      admitted_by_user_id,
    ]);

    const newAdmission = res.rows[0];

    // Log the initial status update entry if admitted_by_user_id is available
    if (admitted_by_user_id) {
      await query(`
        INSERT INTO public.ipd_status_updates (
          ipd_admission_id,
          previous_status,
          new_status,
          ward_bed_number,
          notes,
          updated_by_user_id,
          created_at
        )
        VALUES ($1, NULL, $2, $3, $4, $5, CURRENT_TIMESTAMP);
      `, [
        newAdmission.id,
        current_status,
        ward_bed_number,
        initial_notes || 'Patient admitted to inpatient department.',
        admitted_by_user_id,
      ]);
    }

    return newAdmission;
  },

  /**
   * Find admission by UUID with joined details
   */
  async findById(id) {
    const sql = `
      SELECT 
        ia.*,
        app.application_number,
        app.current_status AS application_scheme_status,
        p.full_name AS patient_name,
        p.gender AS patient_gender,
        p.date_of_birth AS patient_dob,
        p.mobile_number AS patient_mobile,
        h.name AS hospital_name,
        h.hospital_type,
        u.full_name AS admitted_by_name,
        u.role AS admitted_by_role
      FROM public.ipd_admissions ia
      LEFT JOIN public.applications app ON ia.application_id = app.id
      LEFT JOIN public.patients p ON ia.patient_id = p.id
      LEFT JOIN public.hospitals h ON ia.hospital_id = h.id
      LEFT JOIN public.users u ON ia.admitted_by_user_id = u.id
      WHERE ia.id = $1
      LIMIT 1;
    `;
    const res = await query(sql, [id]);
    return res.rows[0] || null;
  },

  /**
   * Find admission by application UUID (1:1 relationship)
   */
  async findByApplicationId(applicationId) {
    const sql = `
      SELECT 
        ia.*,
        app.application_number,
        app.current_status AS application_scheme_status,
        p.full_name AS patient_name,
        p.gender AS patient_gender,
        p.date_of_birth AS patient_dob,
        p.mobile_number AS patient_mobile,
        h.name AS hospital_name,
        h.hospital_type,
        u.full_name AS admitted_by_name,
        u.role AS admitted_by_role
      FROM public.ipd_admissions ia
      LEFT JOIN public.applications app ON ia.application_id = app.id
      LEFT JOIN public.patients p ON ia.patient_id = p.id
      LEFT JOIN public.hospitals h ON ia.hospital_id = h.id
      LEFT JOIN public.users u ON ia.admitted_by_user_id = u.id
      WHERE ia.application_id = $1
      LIMIT 1;
    `;
    const res = await query(sql, [applicationId]);
    return res.rows[0] || null;
  },

  /**
   * List admissions by hospital with optional status filter
   */
  async findByHospitalId(hospitalId, { status = null } = {}) {
    let sql = `
      SELECT 
        ia.*,
        app.application_number,
        p.full_name AS patient_name,
        p.gender AS patient_gender,
        p.date_of_birth AS patient_dob
      FROM public.ipd_admissions ia
      LEFT JOIN public.applications app ON ia.application_id = app.id
      LEFT JOIN public.patients p ON ia.patient_id = p.id
      WHERE ia.hospital_id = $1
    `;
    const params = [hospitalId];

    if (status) {
      params.push(status);
      sql += ` AND ia.current_status = $2`;
    }

    sql += ` ORDER BY ia.admission_date DESC;`;
    const res = await query(sql, params);
    return res.rows;
  },

  /**
   * Transition admission status with timestamped history log
   * (ADMITTED_WARD -> IN_ICU -> SURGERY_PLANNED -> TREATMENT_ONGOING -> DISCHARGED)
   */
  async transitionStatus(
    id,
    {
      new_status,
      ward_bed_number = null,
      notes = null,
      discharge_date = null,
      discharge_summary_url = null,
      updated_by_user_id,
    }
  ) {
    // 1. Get current admission record
    const current = await this.findById(id);
    if (!current) {
      throw new Error(`IPD admission not found with id ${id}`);
    }

    const previousStatus = current.current_status;
    const finalWardBed = ward_bed_number || current.ward_bed_number;

    let finalDischargeDate = current.discharge_date;
    let finalDischargeSummaryUrl = current.discharge_summary_url;

    if (new_status === 'DISCHARGED') {
      finalDischargeDate = discharge_date || new Date();
      if (discharge_summary_url) {
        finalDischargeSummaryUrl = discharge_summary_url;
      }
    }

    // 2. Update admission master row
    const updateSql = `
      UPDATE public.ipd_admissions
      SET 
        current_status = $1,
        ward_bed_number = $2,
        discharge_date = $3,
        discharge_summary_url = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *;
    `;

    const updateRes = await query(updateSql, [
      new_status,
      finalWardBed,
      finalDischargeDate,
      finalDischargeSummaryUrl,
      id,
    ]);

    // 3. Insert audit log in ipd_status_updates
    const historySql = `
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

    const historyRes = await query(historySql, [
      id,
      previousStatus,
      new_status,
      finalWardBed,
      notes,
      updated_by_user_id,
    ]);

    return {
      admission: updateRes.rows[0],
      status_update: historyRes.rows[0],
    };
  },

  /**
   * Delete an IPD admission (cascade deletes history logs)
   */
  async delete(id) {
    const res = await query('DELETE FROM public.ipd_admissions WHERE id = $1 RETURNING *;', [id]);
    return res.rows[0] || null;
  },
};

export default IpdAdmissionModel;
