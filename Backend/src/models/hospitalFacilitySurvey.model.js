import { query } from '../config/db.js';

let tableEnsured = false;

export const CREATE_HOSPITAL_FACILITY_SURVEYS_TABLE_SQL = `
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";

  CREATE TABLE IF NOT EXISTS public.hospital_facility_surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
    submitted_by_sevak_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    hospital_info JSONB DEFAULT '{}'::jsonb,
    specializations JSONB DEFAULT '{}'::jsonb,
    treatments_operations JSONB DEFAULT '{}'::jsonb,
    bed_availability JSONB DEFAULT '{}'::jsonb,
    critical_resources JSONB DEFAULT '{}'::jsonb,
    emergency_capability JSONB DEFAULT '{}'::jsonb,
    current_status JSONB DEFAULT '{}'::jsonb,
    completed_sections TEXT[] DEFAULT '{}'::text[],
    is_fully_completed BOOLEAN DEFAULT false,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
      CHECK (status IN ('DRAFT', 'SUBMITTED', 'VERIFIED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_hospital_facility_survey_hospital UNIQUE (hospital_id)
  );

  CREATE INDEX IF NOT EXISTS idx_facility_surveys_hospital_id ON public.hospital_facility_surveys(hospital_id);
  CREATE INDEX IF NOT EXISTS idx_facility_surveys_status ON public.hospital_facility_surveys(status);
`;

async function ensureTable() {
  if (tableEnsured) return;
  try {
    await query(CREATE_HOSPITAL_FACILITY_SURVEYS_TABLE_SQL);
    await query(`
      ALTER TABLE public.hospital_facility_surveys ADD COLUMN IF NOT EXISTS capacity JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE public.hospital_facility_surveys ADD COLUMN IF NOT EXISTS selected_specialities JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE public.hospital_facility_surveys ADD COLUMN IF NOT EXISTS selected_packages JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE public.hospital_facility_surveys ADD COLUMN IF NOT EXISTS doctors_list JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE public.hospital_facility_surveys ADD COLUMN IF NOT EXISTS resource_count JSONB DEFAULT '{}'::jsonb;
    `);
    tableEnsured = true;
  } catch (err) {
    console.warn('[HospitalFacilitySurveyModel] Table creation error/warning:', err.message);
  }
}

export const HospitalFacilitySurveyModel = {
  /**
   * Run migration DDL
   */
  async createTable() {
    await ensureTable();
  },

  /**
   * Find survey by hospital UUID
   */
  async findByHospitalId(hospitalId) {
    await ensureTable();
    const sql = `
      SELECT 
        s.*,
        h.name AS hospital_name,
        h.hospital_type AS hospital_type,
        h.address AS hospital_address,
        h.address_line AS hospital_address_line,
        h.city AS hospital_city,
        h.district AS hospital_district,
        h.taluka AS hospital_taluka,
        h.pincode AS hospital_pincode,
        h.nearest_landmark AS hospital_landmark,
        h.contact_number AS hospital_contact,
        h.phone AS hospital_phone
      FROM public.hospital_facility_surveys s
      JOIN public.hospitals h ON h.id = s.hospital_id
      WHERE s.hospital_id = $1
      LIMIT 1;
    `;
    const res = await query(sql, [hospitalId]);
    return res.rows[0] || null;
  },

  /**
   * Upsert full or partial hospital facility survey
   */
  async upsertSurvey(hospitalId, sevakUserId, payload = {}) {
    await ensureTable();

    const {
      hospitalInfo = {},
      capacity = {},
      selectedSpecialities = [],
      selectedPackages = [],
      doctorsList = [],
      resourceCount = {},
      specializations = {},
      treatmentsOperations = {},
      bedAvailability = {},
      criticalResources = {},
      emergencyCapability = {},
      currentStatus = {},
      completedSections = [],
      isFullyCompleted = false,
      status = 'DRAFT',
    } = payload;

    const sql = `
      INSERT INTO public.hospital_facility_surveys (
        hospital_id,
        submitted_by_sevak_id,
        hospital_info,
        capacity,
        selected_specialities,
        selected_packages,
        doctors_list,
        resource_count,
        specializations,
        treatments_operations,
        bed_availability,
        critical_resources,
        emergency_capability,
        current_status,
        completed_sections,
        is_fully_completed,
        status,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP
      )
      ON CONFLICT (hospital_id) DO UPDATE SET
        submitted_by_sevak_id = COALESCE(EXCLUDED.submitted_by_sevak_id, hospital_facility_surveys.submitted_by_sevak_id),
        hospital_info = CASE 
          WHEN $3::jsonb != '{}'::jsonb THEN $3::jsonb 
          ELSE hospital_facility_surveys.hospital_info 
        END,
        capacity = CASE 
          WHEN $4::jsonb != '{}'::jsonb THEN $4::jsonb 
          ELSE hospital_facility_surveys.capacity 
        END,
        selected_specialities = CASE 
          WHEN $5::jsonb != '[]'::jsonb THEN $5::jsonb 
          ELSE hospital_facility_surveys.selected_specialities 
        END,
        selected_packages = CASE 
          WHEN $6::jsonb != '[]'::jsonb THEN $6::jsonb 
          ELSE hospital_facility_surveys.selected_packages 
        END,
        doctors_list = CASE 
          WHEN $7::jsonb != '[]'::jsonb THEN $7::jsonb 
          ELSE hospital_facility_surveys.doctors_list 
        END,
        resource_count = CASE 
          WHEN $8::jsonb != '{}'::jsonb THEN $8::jsonb 
          ELSE hospital_facility_surveys.resource_count 
        END,
        specializations = CASE 
          WHEN $9::jsonb != '{}'::jsonb THEN $9::jsonb 
          ELSE hospital_facility_surveys.specializations 
        END,
        treatments_operations = CASE 
          WHEN $10::jsonb != '{}'::jsonb THEN $10::jsonb 
          ELSE hospital_facility_surveys.treatments_operations 
        END,
        bed_availability = CASE 
          WHEN $11::jsonb != '{}'::jsonb THEN $11::jsonb 
          ELSE hospital_facility_surveys.bed_availability 
        END,
        critical_resources = CASE 
          WHEN $12::jsonb != '{}'::jsonb THEN $12::jsonb 
          ELSE hospital_facility_surveys.critical_resources 
        END,
        emergency_capability = CASE 
          WHEN $13::jsonb != '{}'::jsonb THEN $13::jsonb 
          ELSE hospital_facility_surveys.emergency_capability 
        END,
        current_status = CASE 
          WHEN $14::jsonb != '{}'::jsonb THEN $14::jsonb 
          ELSE hospital_facility_surveys.current_status 
        END,
        completed_sections = CASE 
          WHEN array_length($15::text[], 1) > 0 THEN $15::text[] 
          ELSE hospital_facility_surveys.completed_sections 
        END,
        is_fully_completed = COALESCE(EXCLUDED.is_fully_completed, hospital_facility_surveys.is_fully_completed),
        status = COALESCE(EXCLUDED.status, hospital_facility_surveys.status),
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    const values = [
      hospitalId,
      sevakUserId || null,
      JSON.stringify(hospitalInfo),
      JSON.stringify(capacity),
      JSON.stringify(selectedSpecialities),
      JSON.stringify(selectedPackages),
      JSON.stringify(doctorsList),
      JSON.stringify(resourceCount),
      JSON.stringify(specializations),
      JSON.stringify(treatmentsOperations),
      JSON.stringify(bedAvailability),
      JSON.stringify(criticalResources),
      JSON.stringify(emergencyCapability),
      JSON.stringify(currentStatus),
      completedSections,
      isFullyCompleted,
      status,
    ];

    const res = await query(sql, values);
    return res.rows[0];
  },
};

export default HospitalFacilitySurveyModel;
