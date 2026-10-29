import { query } from '../config/db.js';

/**
 * Patient Model / Data Access Object
 * Maps to `public.patients`
 */
export const PatientModel = {
  /**
   * Create a new patient record under a citizen
   */
  async create({
    citizen_id,
    full_name,
    age = null,
    date_of_birth,
    gender,
    relationship_with_citizen,
    mobile_number = null,
    address_line = null,
    area = null,
    village = null,
    city = null,
    taluka = null,
    district = null,
    state = null,
    pincode = null,
    latitude = null,
    longitude = null,
    aadhaar_number,
    pan_number = null,
  }) {
    const sql = `
      INSERT INTO public.patients (
        citizen_id,
        full_name,
        age,
        date_of_birth,
        gender,
        relationship_with_citizen,
        mobile_number,
        address_line,
        area,
        village,
        city,
        taluka,
        district,
        state,
        pincode,
        latitude,
        longitude,
        aadhaar_number,
        pan_number,
        created_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING *;
    `;
    const res = await query(sql, [
      citizen_id,
      full_name,
      age,
      date_of_birth,
      gender,
      relationship_with_citizen,
      mobile_number,
      address_line,
      area,
      village,
      city,
      taluka,
      district,
      state,
      pincode,
      latitude,
      longitude,
      aadhaar_number,
      pan_number,
    ]);
    return res.rows[0];
  },

  /**
   * Find patient by UUID with citizen and user details
   */
  async findById(id) {
    const sql = `
      SELECT 
        p.*,
        c.user_id AS citizen_user_id,
        u.full_name AS citizen_name,
        u.mobile AS citizen_mobile
      FROM public.patients p
      LEFT JOIN public.citizens c ON p.citizen_id = c.id
      LEFT JOIN public.users u ON c.user_id = u.id
      WHERE p.id = $1
      LIMIT 1;
    `;
    const res = await query(sql, [id]);
    return res.rows[0] || null;
  },

  /**
   * Find patients by citizen UUID
   */
  async findByCitizenId(citizenId) {
    const sql = `
      SELECT *
      FROM public.patients
      WHERE citizen_id = $1
      ORDER BY created_at DESC;
    `;
    const res = await query(sql, [citizenId]);
    return res.rows;
  },

  /**
   * Find patient by Aadhaar number
   */
  async findByAadhaar(aadhaarNumber) {
    const sql = `
      SELECT *
      FROM public.patients
      WHERE aadhaar_number = $1
      LIMIT 1;
    `;
    const res = await query(sql, [aadhaarNumber]);
    return res.rows[0] || null;
  },

  /**
   * Find all patients with optional search and pagination
   */
  async findAll({ search, citizen_id, district, limit = 50, offset = 0 } = {}) {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (citizen_id) {
      conditions.push(`p.citizen_id = $${idx}`);
      values.push(citizen_id);
      idx++;
    }

    if (district) {
      conditions.push(`p.district ILIKE $${idx}`);
      values.push(`%${district.trim()}%`);
      idx++;
    }

    if (search) {
      conditions.push(`(p.full_name ILIKE $${idx} OR p.aadhaar_number ILIKE $${idx} OR p.mobile_number ILIKE $${idx})`);
      values.push(`%${search.trim()}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT 
        p.*,
        u.full_name AS citizen_name
      FROM public.patients p
      LEFT JOIN public.citizens c ON p.citizen_id = c.id
      LEFT JOIN public.users u ON c.user_id = u.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1};
    `;
    values.push(limit, offset);

    const res = await query(sql, values);
    return res.rows;
  },

  /**
   * Update patient information
   */
  async update(id, updateData) {
    const allowedFields = [
      'full_name',
      'date_of_birth',
      'gender',
      'relationship_with_citizen',
      'mobile_number',
      'address_line',
      'area',
      'village',
      'city',
      'taluka',
      'district',
      'state',
      'pincode',
      'latitude',
      'longitude',
      'aadhaar_number',
      'pan_number',
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
      UPDATE public.patients
      SET ${fieldsToUpdate.join(', ')}
      WHERE id = $${idx}
      RETURNING *;
    `;
    const res = await query(sql, values);
    return res.rows[0] || null;
  },
};

export default PatientModel;
