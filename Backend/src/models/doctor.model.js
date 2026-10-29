import { query } from '../config/db.js';

/**
 * Ensure public.doctors table exists and has all master columns & indexes
 */
export const ensureDoctorsTable = async () => {
  try {
    await query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      CREATE TABLE IF NOT EXISTS public.doctors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE,
        doctor_code VARCHAR(100),
        name VARCHAR(150) NOT NULL,
        registration_number VARCHAR(100),
        qualification VARCHAR(255),
        specialization VARCHAR(255),
        specialties TEXT[],
        experience VARCHAR(150),
        experience_years INT DEFAULT 0,
        contact_number VARCHAR(30),
        alt_contact_number VARCHAR(30),
        email VARCHAR(150),
        address TEXT,
        street_address TEXT,
        address_village_city VARCHAR(100),
        address_taluka VARCHAR(100),
        address_district VARCHAR(100),
        address_pincode VARCHAR(20),
        landmark VARCHAR(255),
        department VARCHAR(150),
        room_number VARCHAR(50),
        consultation_fee DECIMAL(10,2) DEFAULT 0,
        doctor_type VARCHAR(50) DEFAULT 'Both',
        duty_type VARCHAR(50) DEFAULT 'Shift',
        working_days TEXT[] DEFAULT ARRAY['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        start_time VARCHAR(20) DEFAULT '04:00',
        start_period VARCHAR(10) DEFAULT 'PM',
        end_time VARCHAR(20) DEFAULT '08:00',
        end_period VARCHAR(10) DEFAULT 'PM',
        opd_shift VARCHAR(50) DEFAULT 'Morning',
        opd_timing VARCHAR(100) DEFAULT 'Morning 8:00 AM - 12:00 PM',
        availability_status VARCHAR(50) DEFAULT 'Available',
        status VARCHAR(50) DEFAULT 'ACTIVE',
        is_active BOOLEAN DEFAULT TRUE,
        is_master BOOLEAN DEFAULT TRUE,
        joining_date DATE DEFAULT CURRENT_DATE,
        leaving_date DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE;
      ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS doctor_code VARCHAR(100);
      ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS specialties TEXT[];
      ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS experience VARCHAR(150);
      ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS experience_years INT DEFAULT 0;
      ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS alt_contact_number VARCHAR(30);
      ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS email VARCHAR(150);
      ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS address TEXT;
      ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS street_address TEXT;
      ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS address_village_city VARCHAR(100);
      ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS address_taluka VARCHAR(100);
      ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS address_district VARCHAR(100);
      ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS address_pincode VARCHAR(20);
      ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS landmark VARCHAR(255);
      ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS duty_type VARCHAR(50) DEFAULT 'Shift';
      ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS working_days TEXT[] DEFAULT ARRAY['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS start_time VARCHAR(20) DEFAULT '04:00';
      ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS start_period VARCHAR(10) DEFAULT 'PM';
      ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS end_time VARCHAR(20) DEFAULT '08:00';
      ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS end_period VARCHAR(10) DEFAULT 'PM';
      ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
      ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS is_master BOOLEAN DEFAULT TRUE;

      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='doctors' AND column_name='registration_number') THEN
          ALTER TABLE public.doctors ALTER COLUMN registration_number DROP NOT NULL;
        END IF;
      END $$;

      CREATE INDEX IF NOT EXISTS idx_doctors_hospital_id ON public.doctors(hospital_id);
      CREATE INDEX IF NOT EXISTS idx_doctors_specialization ON public.doctors(specialization);
      CREATE INDEX IF NOT EXISTS idx_doctors_registration_number ON public.doctors(registration_number);
      CREATE INDEX IF NOT EXISTS idx_doctors_is_active ON public.doctors(is_active);
      CREATE INDEX IF NOT EXISTS idx_doctors_availability_status ON public.doctors(availability_status);
    `);
  } catch (err) {
    console.warn('[DoctorMasterModel.ensureDoctorsTable] Notice:', err.message);
  }
};

// Initialize table on import
ensureDoctorsTable().catch(() => { });

/**
 * Doctor Master Model / Data Access Object
 * Maps to `public.doctors` master table
 */
export const DoctorMasterModel = {
  /**
   * Register / create a single doctor in the master table
   */
  async create({
    hospital_id,
    doctor_code = null,
    name,
    registration_number = null,
    qualification = 'MBBS',
    specialization = '',
    specialties = [],
    experience = '',
    experience_years = 0,
    doctor_type = 'Both',
    duty_type = 'Shift',
    working_days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    start_time = '04:00',
    start_period = 'PM',
    end_time = '08:00',
    end_period = 'PM',
    opd_shift = 'Morning',
    opd_timing = null,
    availability_status = 'Available',
    contact_number = null,
    alt_contact_number = null,
    email = null,
    address = null,
    street_address = null,
    address_village_city = null,
    address_taluka = null,
    address_district = null,
    address_pincode = null,
    landmark = null,
    department = null,
    room_number = null,
    consultation_fee = 0,
    status = 'ACTIVE',
    is_active = true,
    is_master = true,
    joining_date = new Date(),
    leaving_date = null,
  }) {
    await ensureDoctorsTable();

    let validHospitalId = hospital_id || null;
    if (validHospitalId) {
      try {
        const checkHosp = await query(`SELECT id FROM public.hospitals WHERE id = $1 LIMIT 1`, [validHospitalId]);
        if (!checkHosp.rows || checkHosp.rows.length === 0) {
          validHospitalId = null;
        }
      } catch {
        validHospitalId = null;
      }
    }

    const regNum =
      registration_number ||
      doctor_code ||
      `DOC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const code = doctor_code || regNum;

    const specArray = Array.isArray(specialties) && specialties.length > 0
      ? specialties
      : (specialization ? [specialization] : ['General Medicine']);

    const primarySpec = specialization || specArray[0] || 'General Medicine';

    const computedOpdTiming = opd_timing ||
      (duty_type === 'On-Call'
        ? '24/7 Emergency On-Call'
        : `${start_time || '04:00'} ${start_period || 'PM'} - ${end_time || '08:00'} ${end_period || 'PM'}`);

    const computedOpdShift = opd_shift || (duty_type === 'On-Call' ? 'On-Call' : (start_period === 'PM' ? 'Evening' : 'Morning'));

    const sql = `
      INSERT INTO public.doctors (
        hospital_id,
        doctor_code,
        name,
        registration_number,
        qualification,
        specialization,
        specialties,
        experience,
        experience_years,
        doctor_type,
        duty_type,
        working_days,
        start_time,
        start_period,
        end_time,
        end_period,
        opd_shift,
        opd_timing,
        availability_status,
        contact_number,
        alt_contact_number,
        email,
        address,
        street_address,
        address_village_city,
        address_taluka,
        address_district,
        address_pincode,
        landmark,
        department,
        room_number,
        consultation_fee,
        status,
        is_active,
        is_master,
        joining_date,
        leaving_date,
        created_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
        $31, $32, $33, $34, $35, $36, $37,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING *;
    `;

    const values = [
      validHospitalId,
      code,
      name,
      regNum,
      qualification,
      primarySpec,
      specArray,
      experience || '',
      parseInt(experience_years, 10) || 0,
      doctor_type,
      duty_type,
      Array.isArray(working_days) ? working_days : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      start_time,
      start_period,
      end_time,
      end_period,
      computedOpdShift,
      computedOpdTiming,
      availability_status,
      contact_number,
      alt_contact_number,
      email,
      address,
      street_address || address,
      address_village_city,
      address_taluka,
      address_district,
      address_pincode,
      landmark,
      department || primarySpec,
      room_number,
      consultation_fee,
      status,
      is_active,
      is_master,
      joining_date,
      leaving_date,
    ];

    const res = await query(sql, values);
    return res.rows[0];
  },

  /**
   * Bulk create / import doctors into master table
   */
  async bulkCreate(doctorsArray = [], defaultHospitalId = null) {
    if (!Array.isArray(doctorsArray) || doctorsArray.length === 0) return [];
    const results = [];
    for (const doc of doctorsArray) {
      if (!doc || !doc.name) continue;
      const created = await this.create({
        ...doc,
        hospital_id: doc.hospital_id || doc.hospitalId || defaultHospitalId,
      });
      results.push(created);
    }
    return results;
  },

  /**
   * Find doctor by master UUID with hospital details
   */
  async findById(id) {
    const sql = `
      SELECT 
        d.*,
        h.name AS hospital_name,
        h.hospital_number AS hospital_code,
        h.city AS hospital_city,
        h.district AS hospital_district
      FROM public.doctors d
      LEFT JOIN public.hospitals h ON d.hospital_id = h.id
      WHERE d.id = $1
      LIMIT 1;
    `;
    const res = await query(sql, [id]);
    return res.rows[0] || null;
  },

  /**
   * Find doctor by Doctor Code / Registration Number
   */
  async findByRegistrationNumber(regNum) {
    if (!regNum) return null;
    const sql = `
      SELECT 
        d.*,
        h.name AS hospital_name,
        h.hospital_number AS hospital_code
      FROM public.doctors d
      LEFT JOIN public.hospitals h ON d.hospital_id = h.id
      WHERE d.registration_number = $1 OR d.doctor_code = $1
      LIMIT 1;
    `;
    const res = await query(sql, [regNum.trim()]);
    return res.rows[0] || null;
  },

  /**
   * Find all doctors with search, filters, and pagination
   */
  async findAll({
    hospital_id,
    specialization,
    doctor_type,
    duty_type,
    availability_status,
    status,
    is_active,
    search,
    limit = 100,
    offset = 0,
  } = {}) {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (hospital_id) {
      conditions.push(`d.hospital_id = $${idx}`);
      values.push(hospital_id);
      idx++;
    }

    if (specialization) {
      conditions.push(`d.specialization ILIKE $${idx}`);
      values.push(`%${specialization.trim()}%`);
      idx++;
    }

    if (doctor_type) {
      if (doctor_type === 'OPD') {
        conditions.push(`d.doctor_type IN ('OPD', 'Both')`);
      } else if (doctor_type === 'IPD') {
        conditions.push(`d.doctor_type IN ('IPD', 'Both')`);
      } else {
        conditions.push(`d.doctor_type = $${idx}`);
        values.push(doctor_type);
        idx++;
      }
    }

    if (duty_type) {
      conditions.push(`d.duty_type = $${idx}`);
      values.push(duty_type);
      idx++;
    }

    if (availability_status) {
      conditions.push(`d.availability_status = $${idx}`);
      values.push(availability_status);
      idx++;
    }

    if (status) {
      conditions.push(`d.status = $${idx}`);
      values.push(status);
      idx++;
    }

    if (is_active !== undefined && is_active !== null) {
      conditions.push(`d.is_active = $${idx}`);
      values.push(Boolean(is_active));
      idx++;
    }

    if (search && search.trim()) {
      conditions.push(`(
        d.name ILIKE $${idx} OR 
        d.registration_number ILIKE $${idx} OR 
        d.doctor_code ILIKE $${idx} OR
        d.specialization ILIKE $${idx} OR
        d.qualification ILIKE $${idx} OR
        d.address_village_city ILIKE $${idx} OR
        d.address_taluka ILIKE $${idx} OR
        h.name ILIKE $${idx}
      )`);
      values.push(`%${search.trim()}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT 
        d.*,
        h.name AS hospital_name,
        h.hospital_number AS hospital_code,
        h.city AS hospital_city,
        h.district AS hospital_district
      FROM public.doctors d
      LEFT JOIN public.hospitals h ON d.hospital_id = h.id
      ${whereClause}
      ORDER BY d.is_active DESC, d.name ASC
      LIMIT $${idx} OFFSET $${idx + 1};
    `;
    values.push(limit, offset);

    const res = await query(sql, values);
    return res.rows;
  },

  /**
   * Quick autocomplete master doctor search
   */
  async searchMaster(queryStr = '', limit = 20) {
    if (!queryStr || !queryStr.trim()) {
      return this.findAll({ limit });
    }
    return this.findAll({ search: queryStr.trim(), limit });
  },

  /**
   * Get distinct master list of doctor specializations
   */
  async getSpecializationsList() {
    const sql = `
      SELECT DISTINCT UNNEST(specialties) AS specialty 
      FROM public.doctors 
      WHERE is_active = TRUE AND specialties IS NOT NULL
      ORDER BY specialty ASC;
    `;
    const res = await query(sql);
    return res.rows.map((r) => r.specialty).filter(Boolean);
  },

  /**
   * Update doctor master record
   */
  async update(id, updateData) {
    const allowedFields = [
      'hospital_id',
      'doctor_code',
      'name',
      'registration_number',
      'qualification',
      'specialization',
      'specialties',
      'experience',
      'experience_years',
      'doctor_type',
      'duty_type',
      'working_days',
      'start_time',
      'start_period',
      'end_time',
      'end_period',
      'opd_shift',
      'opd_timing',
      'availability_status',
      'contact_number',
      'alt_contact_number',
      'email',
      'address',
      'street_address',
      'address_village_city',
      'address_taluka',
      'address_district',
      'address_pincode',
      'landmark',
      'department',
      'room_number',
      'consultation_fee',
      'status',
      'is_active',
      'is_master',
      'joining_date',
      'leaving_date',
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
      UPDATE public.doctors
      SET ${fieldsToUpdate.join(', ')}
      WHERE id = $${idx}
      RETURNING *;
    `;
    const res = await query(sql, values);
    return res.rows[0] || null;
  },

  /**
   * Fast Availability status updater
   */
  async updateAvailability(id, availabilityStatus) {
    const sql = `
      UPDATE public.doctors
      SET 
        availability_status = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *;
    `;
    const res = await query(sql, [availabilityStatus, id]);
    return res.rows[0] || null;
  },

  /**
   * Toggle Active / Inactive master status
   */
  async toggleActiveStatus(id) {
    const sql = `
      UPDATE public.doctors
      SET 
        is_active = NOT is_active,
        status = CASE WHEN is_active = TRUE THEN 'INACTIVE' ELSE 'ACTIVE' END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *;
    `;
    const res = await query(sql, [id]);
    return res.rows[0] || null;
  },

  /**
   * Delete doctor master record
   */
  async delete(id) {
    const sql = `DELETE FROM public.doctors WHERE id = $1 RETURNING id;`;
    const res = await query(sql, [id]);
    return res.rowCount > 0;
  },

  /**
   * Dynamic statistics & roster metrics
   */
  async getStats(hospitalId = null) {
    let whereClause = '';
    const values = [];

    if (hospitalId) {
      whereClause = 'WHERE hospital_id = $1';
      values.push(hospitalId);
    }

    const sql = `
      SELECT
        COUNT(*) FILTER (WHERE is_active = TRUE) AS total_active,
        COUNT(*) FILTER (WHERE is_active = FALSE) AS total_deactivated,
        COUNT(*) FILTER (WHERE is_active = TRUE AND availability_status = 'Available') AS available_now,
        COUNT(*) FILTER (WHERE is_active = TRUE AND doctor_type IN ('OPD', 'Both')) AS opd_doctors,
        COUNT(*) FILTER (WHERE is_active = TRUE AND doctor_type IN ('IPD', 'Both')) AS ipd_doctors,
        COUNT(*) FILTER (WHERE is_active = TRUE AND availability_status = 'On Leave') AS on_leave,
        COUNT(*) FILTER (WHERE is_active = TRUE AND availability_status = 'In Surgery') AS in_surgery,
        COUNT(*) FILTER (WHERE is_active = TRUE AND availability_status = 'Emergency Duty') AS emergency_duty,
        COUNT(*) FILTER (WHERE is_active = TRUE AND availability_status = 'Unavailable') AS unavailable,
        COUNT(*) AS total_all
      FROM public.doctors
      ${whereClause};
    `;

    const res = await query(sql, values);
    const row = res.rows[0] || {};

    const activeCount = parseInt(row.total_active || 0, 10);
    const availableNowCount = parseInt(row.available_now || 0, 10);
    const opdCount = parseInt(row.opd_doctors || 0, 10);
    const ipdCount = parseInt(row.ipd_doctors || 0, 10);
    const onLeaveCount = parseInt(row.on_leave || 0, 10);
    const inSurgeryCount = parseInt(row.in_surgery || 0, 10);
    const emergencyDutyCount = parseInt(row.emergency_duty || 0, 10);
    const unavailableCount = parseInt(row.unavailable || 0, 10);
    const deactivatedCount = parseInt(row.total_deactivated || 0, 10);
    const totalAllCount = parseInt(row.total_all || 0, 10);

    return {
      total: activeCount,
      active: activeCount,
      availableNow: availableNowCount,
      available: availableNowCount,
      opdCount: opdCount,
      opdDoctors: opdCount,
      ipdCount: ipdCount,
      ipdDoctors: ipdCount,
      onLeave: onLeaveCount,
      inSurgery: inSurgeryCount,
      emergencyDuty: emergencyDutyCount,
      unavailable: unavailableCount,
      deactivated: deactivatedCount,
      totalAll: totalAllCount,
    };
  },
};

// Aliases for compatibility
export const DoctorModel = DoctorMasterModel;
export default DoctorMasterModel;
