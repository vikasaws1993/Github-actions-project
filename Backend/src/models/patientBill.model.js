import { query } from '../config/db.js';

/**
 * PatientBill Model / Data Access Object
 * Maps to `public.patient_bills`
 */
export const PatientBillModel = {
  /**
   * Create a patient bill record
   */
  async create({
    application_id,
    hospital_id,
    bill_document_id = null,
    uploaded_by_user_id,
    bill_number,
    bill_date = new Date(),
    total_amount,
    scheme_covered_amount = 0.00,
    patient_payable_amount = 0.00,
    remarks = null,
  }) {
    const sql = `
      INSERT INTO public.patient_bills (
        application_id,
        hospital_id,
        bill_document_id,
        uploaded_by_user_id,
        bill_number,
        bill_date,
        total_amount,
        scheme_covered_amount,
        patient_payable_amount,
        remarks,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *;
    `;
    const res = await query(sql, [
      application_id,
      hospital_id,
      bill_document_id,
      uploaded_by_user_id,
      bill_number,
      bill_date,
      total_amount,
      scheme_covered_amount,
      patient_payable_amount,
      remarks,
    ]);
    return res.rows[0];
  },

  /**
   * Find bill by UUID
   */
  async findById(id) {
    const sql = `
      SELECT 
        pb.*,
        h.name AS hospital_name,
        h.hospital_code,
        app.application_number,
        u.full_name AS uploaded_by_name
      FROM public.patient_bills pb
      LEFT JOIN public.hospitals h ON pb.hospital_id = h.id
      LEFT JOIN public.applications app ON pb.application_id = app.id
      LEFT JOIN public.users u ON pb.uploaded_by_user_id = u.id
      WHERE pb.id = $1
      LIMIT 1;
    `;
    const res = await query(sql, [id]);
    return res.rows[0] || null;
  },

  /**
   * Find bills by application UUID
   */
  async findByApplicationId(applicationId) {
    const sql = `
      SELECT 
        pb.*,
        h.name AS hospital_name
      FROM public.patient_bills pb
      LEFT JOIN public.hospitals h ON pb.hospital_id = h.id
      WHERE pb.application_id = $1
      ORDER BY pb.bill_date DESC;
    `;
    const res = await query(sql, [applicationId]);
    return res.rows;
  },

  /**
   * Find bills issued by a hospital
   */
  async findByHospitalId(hospitalId, { limit = 50, offset = 0 } = {}) {
    const sql = `
      SELECT 
        pb.*,
        app.application_number
      FROM public.patient_bills pb
      LEFT JOIN public.applications app ON pb.application_id = app.id
      WHERE pb.hospital_id = $1
      ORDER BY pb.bill_date DESC
      LIMIT $2 OFFSET $3;
    `;
    const res = await query(sql, [hospitalId, limit, offset]);
    return res.rows;
  },

  /**
   * Update bill details
   */
  async update(id, updateData) {
    const allowedFields = [
      'bill_number',
      'bill_date',
      'total_amount',
      'scheme_covered_amount',
      'patient_payable_amount',
      'remarks',
      'bill_document_id',
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
      UPDATE public.patient_bills
      SET ${fieldsToUpdate.join(', ')}
      WHERE id = $${idx}
      RETURNING *;
    `;
    const res = await query(sql, values);
    return res.rows[0] || null;
  },
};

export default PatientBillModel;
