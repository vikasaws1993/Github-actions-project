import { query } from '../config/db.js';

/**
 * MedicalRecord Model / Data Access Object
 * Maps to `public.medical_records`
 */
export const MedicalRecordModel = {
  /**
   * Create a new medical record for an application/patient
   */
  async create({
    patient_id,
    application_id,
    medical_condition,
    diagnosis,
    treatment_type,
    opd_ipd,
    admission_date,
    discharge_date = null,
    treating_doctor,
    hospital_name,
    treatment_description = null,
  }) {
    const sql = `
      INSERT INTO public.medical_records (
        patient_id,
        application_id,
        medical_condition,
        diagnosis,
        treatment_type,
        opd_ipd,
        admission_date,
        discharge_date,
        treating_doctor,
        hospital_name,
        treatment_description,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *;
    `;
    const res = await query(sql, [
      patient_id,
      application_id,
      medical_condition,
      diagnosis,
      treatment_type,
      opd_ipd,
      admission_date,
      discharge_date,
      treating_doctor,
      hospital_name,
      treatment_description,
    ]);
    return res.rows[0];
  },

  /**
   * Find medical record by UUID
   */
  async findById(id) {
    const sql = `
      SELECT 
        mr.*,
        p.full_name AS patient_name,
        p.gender AS patient_gender,
        p.date_of_birth AS patient_dob,
        app.application_number
      FROM public.medical_records mr
      LEFT JOIN public.patients p ON mr.patient_id = p.id
      LEFT JOIN public.applications app ON mr.application_id = app.id
      WHERE mr.id = $1
      LIMIT 1;
    `;
    const res = await query(sql, [id]);
    return res.rows[0] || null;
  },

  /**
   * Find medical records by application UUID
   */
  async findByApplicationId(applicationId) {
    const sql = `
      SELECT 
        mr.*,
        p.full_name AS patient_name
      FROM public.medical_records mr
      LEFT JOIN public.patients p ON mr.patient_id = p.id
      WHERE mr.application_id = $1
      ORDER BY mr.admission_date DESC;
    `;
    const res = await query(sql, [applicationId]);
    return res.rows;
  },

  /**
   * Find all medical history for a patient
   */
  async findByPatientId(patientId) {
    const sql = `
      SELECT 
        mr.*,
        app.application_number
      FROM public.medical_records mr
      LEFT JOIN public.applications app ON mr.application_id = app.id
      WHERE mr.patient_id = $1
      ORDER BY mr.admission_date DESC;
    `;
    const res = await query(sql, [patientId]);
    return res.rows;
  },

  /**
   * Update medical record details
   */
  async update(id, updateData) {
    const allowedFields = [
      'medical_condition',
      'diagnosis',
      'treatment_type',
      'opd_ipd',
      'admission_date',
      'discharge_date',
      'treating_doctor',
      'hospital_name',
      'treatment_description',
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
      UPDATE public.medical_records
      SET ${fieldsToUpdate.join(', ')}
      WHERE id = $${idx}
      RETURNING *;
    `;
    const res = await query(sql, values);
    return res.rows[0] || null;
  },
};

export default MedicalRecordModel;
