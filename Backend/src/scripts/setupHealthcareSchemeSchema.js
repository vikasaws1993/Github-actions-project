import { query, pool } from '../config/db.js';
import { setupDatabaseIndexes } from './setupDatabaseIndexes.js';

/**
 * Arogya Mitra — Healthcare Scheme Assistance Data Model
 * Complete Schema Setup & Realistic Dummy Data Seeder
 * All 23 Tables matching the ER Diagram
 */

async function setupSchemaAndSeedData() {
  console.log('🚀 Starting Arogya Mitra Schema Setup & Dummy Data Seeding...');

  try {
    // 1. Enable pgcrypto extension for UUIDs
    await query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
    console.log('✅ Extension "pgcrypto" verified.');

    // 2. Adjust & Create Tables in Topological / Foreign Key Dependency Order
    console.log('📦 Creating/Verifying all 23 tables...');

    // Table 1: users
    await query(`
      CREATE TABLE IF NOT EXISTS public.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        full_name VARCHAR(150) NOT NULL,
        mobile VARCHAR(20),
        mobile_number VARCHAR(20),
        email VARCHAR(150) UNIQUE,
        password_hash TEXT,
        role VARCHAR(50) NOT NULL DEFAULT 'CITIZEN',
        status VARCHAR(30) DEFAULT 'ACTIVE',
        is_active BOOLEAN DEFAULT TRUE,
        is_super_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_login_at TIMESTAMP WITH TIME ZONE
      );

      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(20);
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE public.users ALTER COLUMN mobile DROP NOT NULL;
      ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
      ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('ADMIN', 'CITIZEN', 'SEVAK', 'AROGYA_SEVAK', 'DOCTOR'));
    `);
    console.log('  ✓ 1. users');

    // Table 2: admins
    await query(`
      CREATE TABLE IF NOT EXISTS public.admins (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
        created_by UUID REFERENCES public.admins(id) ON DELETE SET NULL,
        department VARCHAR(100) DEFAULT 'HEALTH_ADMINISTRATION',
        designation VARCHAR(100) DEFAULT 'ADMINISTRATOR',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.admins(id) ON DELETE SET NULL;
      ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS department VARCHAR(100) DEFAULT 'HEALTH_ADMINISTRATION';
      ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS designation VARCHAR(100) DEFAULT 'ADMINISTRATOR';
    `);
    console.log('  ✓ 2. admins');

    // Table 3: citizens
    await query(`
      CREATE TABLE IF NOT EXISTS public.citizens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
        address_line TEXT,
        city VARCHAR(100),
        taluka VARCHAR(100),
        district VARCHAR(100),
        state VARCHAR(100),
        pincode VARCHAR(10),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE public.citizens ADD COLUMN IF NOT EXISTS address_line TEXT;
      ALTER TABLE public.citizens ADD COLUMN IF NOT EXISTS city VARCHAR(100);
      ALTER TABLE public.citizens ADD COLUMN IF NOT EXISTS taluka VARCHAR(100);
      ALTER TABLE public.citizens ADD COLUMN IF NOT EXISTS district VARCHAR(100);
      ALTER TABLE public.citizens ADD COLUMN IF NOT EXISTS state VARCHAR(100);
      ALTER TABLE public.citizens ADD COLUMN IF NOT EXISTS pincode VARCHAR(10);
      
      DO $$ 
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='citizens' AND column_name='district_id') THEN
          ALTER TABLE public.citizens ALTER COLUMN district_id DROP NOT NULL;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='citizens' AND column_name='taluka_id') THEN
          ALTER TABLE public.citizens ALTER COLUMN taluka_id DROP NOT NULL;
        END IF;
      END $$;
    `);
    console.log('  ✓ 3. citizens');

    // Table 4: patients
    await query(`
      CREATE TABLE IF NOT EXISTS public.patients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        citizen_id UUID NOT NULL REFERENCES public.citizens(id) ON DELETE CASCADE,
        full_name VARCHAR(150) NOT NULL,
        date_of_birth DATE NOT NULL,
        gender VARCHAR(20) NOT NULL,
        relationship_with_citizen VARCHAR(50) NOT NULL,
        mobile_number VARCHAR(20),
        address_line TEXT,
        area VARCHAR(100),
        village VARCHAR(100),
        city VARCHAR(100),
        taluka VARCHAR(100),
        district VARCHAR(100),
        state VARCHAR(100),
        pincode VARCHAR(10),
        latitude DECIMAL(10, 7),
        longitude DECIMAL(10, 7),
        aadhaar_number VARCHAR(20) UNIQUE NOT NULL,
        pan_number VARCHAR(20),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_patients_citizen_id ON public.patients(citizen_id);
    `);
    console.log('  ✓ 4. patients');

    // Table 5: hospitals
    await query(`
      CREATE TABLE IF NOT EXISTS public.hospitals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_by_admin_id UUID REFERENCES public.admins(id) ON DELETE SET NULL,
        name VARCHAR(200) NOT NULL,
        registration_number VARCHAR(100) UNIQUE,
        hospital_number VARCHAR(50),
        hospital_type VARCHAR(50) DEFAULT 'GOVERNMENT',
        address_line TEXT,
        area VARCHAR(100),
        village VARCHAR(100),
        city VARCHAR(100),
        taluka VARCHAR(100),
        district VARCHAR(100),
        state VARCHAR(100),
        pincode VARCHAR(10),
        nearest_landmark VARCHAR(255),
        phone VARCHAR(20),
        email VARCHAR(150),
        status VARCHAR(50) DEFAULT 'ACTIVE',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS created_by_admin_id UUID REFERENCES public.admins(id) ON DELETE SET NULL;
      ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS registration_number VARCHAR(100);
      ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS hospital_number VARCHAR(50);
      ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS hospital_type VARCHAR(50) DEFAULT 'GOVERNMENT';
      ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS address_line TEXT;
      ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS area VARCHAR(100);
      ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS village VARCHAR(100);
      ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS city VARCHAR(100);
      ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS taluka VARCHAR(100);
      ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS district VARCHAR(100);
      ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS state VARCHAR(100);
      ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS pincode VARCHAR(10);
      ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS nearest_landmark VARCHAR(255);
      ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

      DO $$ 
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hospitals' AND column_name='district_id') THEN
          ALTER TABLE public.hospitals ALTER COLUMN district_id DROP NOT NULL;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hospitals' AND column_name='taluka_id') THEN
          ALTER TABLE public.hospitals ALTER COLUMN taluka_id DROP NOT NULL;
        END IF;
      END $$;
    `);
    console.log('  ✓ 5. hospitals');

    // Table 6: arogya_sevaks
    await query(`
      CREATE TABLE IF NOT EXISTS public.arogya_sevaks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
        hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
        employee_id VARCHAR(50) UNIQUE,
        designation VARCHAR(100) DEFAULT 'Arogya Mitra Coordinator',
        joining_date DATE DEFAULT CURRENT_DATE,
        status VARCHAR(50) DEFAULT 'ACTIVE',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE public.arogya_sevaks ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL;
      ALTER TABLE public.arogya_sevaks ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
      ALTER TABLE public.arogya_sevaks ADD COLUMN IF NOT EXISTS designation VARCHAR(100) DEFAULT 'Arogya Mitra Coordinator';
      ALTER TABLE public.arogya_sevaks ADD COLUMN IF NOT EXISTS joining_date DATE DEFAULT CURRENT_DATE;
      ALTER TABLE public.arogya_sevaks ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';

      DO $$ 
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='arogya_sevaks' AND column_name='employee_code') THEN
          ALTER TABLE public.arogya_sevaks ALTER COLUMN employee_code DROP NOT NULL;
        END IF;
      END $$;
    `);
    console.log('  ✓ 6. arogya_sevaks');

    // Table 7: doctors
    await query(`
      CREATE TABLE IF NOT EXISTS public.doctors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL,
        registration_number VARCHAR(100) UNIQUE NOT NULL,
        qualification VARCHAR(150) NOT NULL,
        specialization VARCHAR(150) NOT NULL,
        contact_number VARCHAR(20) NOT NULL,
        joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
        leaving_date DATE,
        status VARCHAR(50) DEFAULT 'ACTIVE',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_doctors_hospital_id ON public.doctors(hospital_id);
    `);
    console.log('  ✓ 7. doctors');

    // Table 8: schemes
    await query(`
      CREATE TABLE IF NOT EXISTS public.schemes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        scheme_code VARCHAR(50) UNIQUE NOT NULL,
        description TEXT NOT NULL,
        maximum_coverage_amount DECIMAL(12, 2) NOT NULL,
        eligibility_description TEXT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_schemes_code ON public.schemes(scheme_code);
    `);
    console.log('  ✓ 8. schemes');

    // Table 9: hospital_schemes
    await query(`
      CREATE TABLE IF NOT EXISTS public.hospital_schemes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
        scheme_id UUID NOT NULL REFERENCES public.schemes(id) ON DELETE CASCADE,
        alignment_status VARCHAR(50) DEFAULT 'EMPANELLED',
        alignment_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
        alignment_end_date DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_hospital_schemes_hospital ON public.hospital_schemes(hospital_id);
      CREATE INDEX IF NOT EXISTS idx_hospital_schemes_scheme ON public.hospital_schemes(scheme_id);
    `);
    console.log('  ✓ 9. hospital_schemes');

    // Table 10: applications
    await query(`
      CREATE TABLE IF NOT EXISTS public.applications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
        submitted_by_citizen_id UUID NOT NULL REFERENCES public.citizens(id) ON DELETE CASCADE,
        application_number VARCHAR(50) UNIQUE NOT NULL,
        current_status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED',
        submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_applications_patient ON public.applications(patient_id);
      CREATE INDEX IF NOT EXISTS idx_applications_citizen ON public.applications(submitted_by_citizen_id);
      CREATE INDEX IF NOT EXISTS idx_applications_number ON public.applications(application_number);
    `);
    console.log('  ✓ 10. applications');

    // Table 11: document_types
    await query(`
      CREATE TABLE IF NOT EXISTS public.document_types (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(150) UNIQUE NOT NULL,
        description TEXT,
        is_required BOOLEAN DEFAULT TRUE,
        status VARCHAR(50) DEFAULT 'ACTIVE',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('  ✓ 11. document_types');

    // Table 12: application_documents
    await query(`
      CREATE TABLE IF NOT EXISTS public.application_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
        document_type_id UUID NOT NULL REFERENCES public.document_types(id) ON DELETE RESTRICT,
        file_url TEXT NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        document_status VARCHAR(50) DEFAULT 'PENDING',
        verification_remark TEXT,
        uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        verified_at TIMESTAMP WITH TIME ZONE,
        uploaded_by_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        verified_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_app_docs_application ON public.application_documents(application_id);
    `);
    console.log('  ✓ 12. application_documents');

    // Table 13: application_status_histories
    await query(`
      CREATE TABLE IF NOT EXISTS public.application_status_histories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
        old_status VARCHAR(50),
        new_status VARCHAR(50) NOT NULL,
        remark TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        changed_by_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_app_status_hist_app ON public.application_status_histories(application_id);
    `);
    console.log('  ✓ 13. application_status_histories');

    // Table 14: application_remarks
    await query(`
      CREATE TABLE IF NOT EXISTS public.application_remarks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
        created_by_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        remark_type VARCHAR(50) NOT NULL,
        remark TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_app_remarks_app ON public.application_remarks(application_id);
    `);
    console.log('  ✓ 14. application_remarks');

    // Table 15: application_assignments
    await query(`
      CREATE TABLE IF NOT EXISTS public.application_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
        assigned_by_admin_id UUID REFERENCES public.admins(id) ON DELETE SET NULL,
        hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
        arogya_sevak_id UUID NOT NULL REFERENCES public.arogya_sevaks(id) ON DELETE CASCADE,
        assignment_status VARCHAR(50) DEFAULT 'ASSIGNED',
        assignment_remark TEXT,
        assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP WITH TIME ZONE
      );
      CREATE INDEX IF NOT EXISTS idx_app_assignments_app ON public.application_assignments(application_id);
      CREATE INDEX IF NOT EXISTS idx_app_assignments_sevak ON public.application_assignments(arogya_sevak_id);
    `);
    console.log('  ✓ 15. application_assignments');

    // Table 16: scheme_assessments
    await query(`
      CREATE TABLE IF NOT EXISTS public.scheme_assessments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
        scheme_id UUID NOT NULL REFERENCES public.schemes(id) ON DELETE CASCADE,
        eligibility_status VARCHAR(50) NOT NULL,
        reason TEXT,
        remarks TEXT,
        assessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        assessed_by_admin_id UUID NOT NULL REFERENCES public.admins(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_scheme_assessments_app ON public.scheme_assessments(application_id);
    `);
    console.log('  ✓ 16. scheme_assessments');

    // Table 17: scheme_claims
    await query(`
      CREATE TABLE IF NOT EXISTS public.scheme_claims (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
        scheme_id UUID NOT NULL REFERENCES public.schemes(id) ON DELETE CASCADE,
        hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
        arogya_sevak_id UUID NOT NULL REFERENCES public.arogya_sevaks(id) ON DELETE CASCADE,
        claim_number VARCHAR(50) UNIQUE NOT NULL,
        claimed_amount DECIMAL(12, 2) NOT NULL,
        approved_amount DECIMAL(12, 2),
        status VARCHAR(50) DEFAULT 'PENDING',
        claim_date DATE NOT NULL DEFAULT CURRENT_DATE,
        approval_date DATE,
        remarks TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_scheme_claims_app ON public.scheme_claims(application_id);
    `);
    console.log('  ✓ 17. scheme_claims');

    // Table 18: case_escalations
    await query(`
      CREATE TABLE IF NOT EXISTS public.case_escalations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
        raised_by_arogya_sevak_id UUID NOT NULL REFERENCES public.arogya_sevaks(id) ON DELETE CASCADE,
        escalated_to_admin_id UUID NOT NULL REFERENCES public.admins(id) ON DELETE CASCADE,
        resolved_by_admin_id UUID REFERENCES public.admins(id) ON DELETE SET NULL,
        escalation_reason VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'OPEN',
        resolution TEXT,
        escalated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP WITH TIME ZONE
      );
      CREATE INDEX IF NOT EXISTS idx_case_escalations_app ON public.case_escalations(application_id);
    `);
    console.log('  ✓ 18. case_escalations');

    // Table 19: medical_records
    await query(`
      CREATE TABLE IF NOT EXISTS public.medical_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
        application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
        medical_condition VARCHAR(255) NOT NULL,
        diagnosis TEXT NOT NULL,
        treatment_type VARCHAR(150) NOT NULL,
        opd_ipd VARCHAR(20) NOT NULL,
        admission_date DATE NOT NULL,
        discharge_date DATE,
        treating_doctor VARCHAR(150) NOT NULL,
        hospital_name VARCHAR(200) NOT NULL,
        treatment_description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_medical_records_patient ON public.medical_records(patient_id);
      CREATE INDEX IF NOT EXISTS idx_medical_records_app ON public.medical_records(application_id);
    `);
    console.log('  ✓ 19. medical_records');

    // Table 20: patient_bills
    await query(`
      CREATE TABLE IF NOT EXISTS public.patient_bills (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
        hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
        bill_document_id UUID REFERENCES public.application_documents(id) ON DELETE SET NULL,
        uploaded_by_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        bill_number VARCHAR(100) NOT NULL,
        bill_date DATE NOT NULL,
        total_amount DECIMAL(12, 2) NOT NULL,
        scheme_covered_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        patient_payable_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        remarks TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_patient_bills_app ON public.patient_bills(application_id);
    `);
    console.log('  ✓ 20. patient_bills');

    // Table 21: daily_hospital_updates
    await query(`
      CREATE TABLE IF NOT EXISTS public.daily_hospital_updates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
        updated_by_arogya_sevak_id UUID NOT NULL REFERENCES public.arogya_sevaks(id) ON DELETE CASCADE,
        update_date DATE NOT NULL DEFAULT CURRENT_DATE,
        total_beds INT NOT NULL DEFAULT 0,
        available_icu_beds INT NOT NULL DEFAULT 0,
        available_general_beds INT NOT NULL DEFAULT 0,
        available_other_beds INT NOT NULL DEFAULT 0,
        total_icu_beds INT NOT NULL DEFAULT 0,
        total_general_beds INT NOT NULL DEFAULT 0,
        total_other_beds INT NOT NULL DEFAULT 0,
        total_patient_count INT NOT NULL DEFAULT 0,
        new_doctors_joined_count INT NOT NULL DEFAULT 0,
        doctors_left_count INT NOT NULL DEFAULT 0,
        remarks TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_daily_hosp_updates_hosp ON public.daily_hospital_updates(hospital_id);
    `);
    console.log('  ✓ 21. daily_hospital_updates');

    // Table 22: hospital_infrastructures
    await query(`
      CREATE TABLE IF NOT EXISTS public.hospital_infrastructures (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        hospital_id UUID NOT NULL UNIQUE REFERENCES public.hospitals(id) ON DELETE CASCADE,
        verified_by_arogya_sevak_id UUID REFERENCES public.arogya_sevaks(id) ON DELETE SET NULL,
        total_beds INT NOT NULL DEFAULT 0,
        general_beds INT NOT NULL DEFAULT 0,
        icu_beds INT NOT NULL DEFAULT 0,
        other_beds INT NOT NULL DEFAULT 0,
        total_rooms INT NOT NULL DEFAULT 0,
        general_rooms INT NOT NULL DEFAULT 0,
        icu_rooms INT NOT NULL DEFAULT 0,
        other_rooms INT NOT NULL DEFAULT 0,
        has_icu BOOLEAN DEFAULT FALSE,
        has_general_ward BOOLEAN DEFAULT TRUE,
        has_required_rooms BOOLEAN DEFAULT TRUE,
        has_required_medical_infrastructure BOOLEAN DEFAULT TRUE,
        has_specialist_doctors BOOLEAN DEFAULT FALSE,
        has_required_doctors BOOLEAN DEFAULT TRUE,
        has_emergency_services BOOLEAN DEFAULT TRUE,
        has_operation_theatre BOOLEAN DEFAULT FALSE,
        has_pharmacy BOOLEAN DEFAULT TRUE,
        has_lab BOOLEAN DEFAULT TRUE,
        has_blood_bank BOOLEAN DEFAULT FALSE,
        is_scheme_compliant BOOLEAN DEFAULT TRUE,
        infrastructure_verification_status VARCHAR(50) DEFAULT 'VERIFIED',
        infrastructure_verification_remark TEXT,
        verified_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_hosp_infra_hosp ON public.hospital_infrastructures(hospital_id);
    `);
    console.log('  ✓ 22. hospital_infrastructures');

    // Table 23: hospital_verifications
    await query(`
      CREATE TABLE IF NOT EXISTS public.hospital_verifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
        hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
        infrastructure_id UUID REFERENCES public.hospital_infrastructures(id) ON DELETE SET NULL,
        arogya_sevak_id UUID NOT NULL REFERENCES public.arogya_sevaks(id) ON DELETE CASCADE,
        verification_status VARCHAR(50) DEFAULT 'VERIFIED',
        remarks TEXT,
        verified_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_hosp_verifications_app ON public.hospital_verifications(application_id);
      CREATE INDEX IF NOT EXISTS idx_hosp_verifications_hosp ON public.hospital_verifications(hospital_id);
    `);
    console.log('  ✓ 23. hospital_verifications');

    // Table 24: opd_visits
    await query(`
      CREATE TABLE IF NOT EXISTS public.opd_visits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
        patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
        recorded_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
        visit_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        doctor_name VARCHAR(150) NOT NULL,
        department VARCHAR(100),
        diagnosis TEXT NOT NULL,
        findings TEXT,
        prescription_file_url TEXT,
        follow_up_required BOOLEAN NOT NULL DEFAULT FALSE,
        follow_up_date DATE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_opd_visits_app ON public.opd_visits(application_id);
      CREATE INDEX IF NOT EXISTS idx_opd_visits_patient ON public.opd_visits(patient_id);
      CREATE INDEX IF NOT EXISTS idx_opd_visits_date ON public.opd_visits(visit_date DESC);
    `);
    console.log('  ✓ 24. opd_visits');

    // Table 25: ipd_admissions
    await query(`
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
    `);
    console.log('  ✓ 25. ipd_admissions');

    // Table 26: ipd_status_updates
    await query(`
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
    `);
    console.log('  ✓ 26. ipd_status_updates');

    console.log('\n🎉 All 26 tables are verified and configured in PostgreSQL database!');
    await setupDatabaseIndexes();

    // ==========================================
    // 3. SEED DUMMY DATA (5 realistic records in each)
    // ==========================================
    console.log('\n🌱 Seeding 5 realistic healthcare data records in each table...');

    // Helper: upsert user
    async function upsertUser({ full_name, email, mobile, mobile_number, role, is_super_admin, password_hash, status, is_active }) {
      const existing = await query('SELECT id FROM public.users WHERE email = $1 LIMIT 1', [email]);
      if (existing.rows.length > 0) {
        await query(`
          UPDATE public.users 
          SET full_name = $1, mobile = $2, mobile_number = $3, role = $4, is_super_admin = $5, is_active = $6, updated_at = CURRENT_TIMESTAMP
          WHERE id = $7
        `, [full_name, mobile, mobile_number, role, is_super_admin, is_active, existing.rows[0].id]);
        return existing.rows[0].id;
      }
      const ins = await query(`
        INSERT INTO public.users (full_name, email, mobile, mobile_number, role, is_super_admin, password_hash, status, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id;
      `, [full_name, email, mobile, mobile_number, role, is_super_admin, password_hash, status, is_active]);
      return ins.rows[0].id;
    }

    // 1. Seed Users (At least 5 users for each role category)
    const dummyUsers = [
      { full_name: 'Dr. Suresh R. Patil', email: 'dr.suresh.admin@arogyamitra.gov.in', mobile: '9820011001', mobile_number: '9820011001', role: 'ADMIN', is_super_admin: true, password_hash: '$2b$10$w8T0.dummyHashForDevLogin1234567890', status: 'ACTIVE', is_active: true },
      { full_name: 'Dr. Meera S. Joshi', email: 'meera.admin@arogyamitra.gov.in', mobile: '9820011002', mobile_number: '9820011002', role: 'ADMIN', is_super_admin: false, password_hash: '$2b$10$w8T0.dummyHashForDevLogin1234567890', status: 'ACTIVE', is_active: true },
      { full_name: 'Anil K. Deshmukh', email: 'anil.admin@arogyamitra.gov.in', mobile: '9820011003', mobile_number: '9820011003', role: 'ADMIN', is_super_admin: false, password_hash: '$2b$10$w8T0.dummyHashForDevLogin1234567890', status: 'ACTIVE', is_active: true },
      { full_name: 'Pravin V. Gaikwad', email: 'pravin.admin@arogyamitra.gov.in', mobile: '9820011004', mobile_number: '9820011004', role: 'ADMIN', is_super_admin: false, password_hash: '$2b$10$w8T0.dummyHashForDevLogin1234567890', status: 'ACTIVE', is_active: true },
      { full_name: 'Sunita M. Shinde', email: 'sunita.admin@arogyamitra.gov.in', mobile: '9820011005', mobile_number: '9820011005', role: 'ADMIN', is_super_admin: false, password_hash: '$2b$10$w8T0.dummyHashForDevLogin1234567890', status: 'ACTIVE', is_active: true },

      { full_name: 'Vijay Shantaram Chavan', email: 'vijay.citizen@gmail.com', mobile: '9820022001', mobile_number: '9820022001', role: 'CITIZEN', is_super_admin: false, password_hash: '$2b$10$w8T0.dummyHashForDevLogin1234567890', status: 'ACTIVE', is_active: true },
      { full_name: 'Sunita Ravindra Jadhav', email: 'sunita.jadhav.citizen@gmail.com', mobile: '9820022002', mobile_number: '9820022002', role: 'CITIZEN', is_super_admin: false, password_hash: '$2b$10$w8T0.dummyHashForDevLogin1234567890', status: 'ACTIVE', is_active: true },
      { full_name: 'Ashok B. More', email: 'ashok.more.citizen@gmail.com', mobile: '9820022003', mobile_number: '9820022003', role: 'CITIZEN', is_super_admin: false, password_hash: '$2b$10$w8T0.dummyHashForDevLogin1234567890', status: 'ACTIVE', is_active: true },
      { full_name: 'Dattatray P. Shinde', email: 'dattatray.shinde@gmail.com', mobile: '9820022004', mobile_number: '9820022004', role: 'CITIZEN', is_super_admin: false, password_hash: '$2b$10$w8T0.dummyHashForDevLogin1234567890', status: 'ACTIVE', is_active: true },
      { full_name: 'Bapu K. Gaikwad', email: 'bapu.gaikwad@gmail.com', mobile: '9820022005', mobile_number: '9820022005', role: 'CITIZEN', is_super_admin: false, password_hash: '$2b$10$w8T0.dummyHashForDevLogin1234567890', status: 'ACTIVE', is_active: true },

      { full_name: 'Ramesh Narayan Kadam', email: 'ramesh.kadam.sevak@arogyamitra.gov.in', mobile: '9820033001', mobile_number: '9820033001', role: 'AROGYA_SEVAK', is_super_admin: false, password_hash: '$2b$10$w8T0.dummyHashForDevLogin1234567890', status: 'ACTIVE', is_active: true },
      { full_name: 'Pooja Anand Deshmukh', email: 'pooja.deshmukh.sevak@arogyamitra.gov.in', mobile: '9820033002', mobile_number: '9820033002', role: 'AROGYA_SEVAK', is_super_admin: false, password_hash: '$2b$10$w8T0.dummyHashForDevLogin1234567890', status: 'ACTIVE', is_active: true },
      { full_name: 'Sachin D. Pawar', email: 'sachin.pawar.sevak@arogyamitra.gov.in', mobile: '9820033003', mobile_number: '9820033003', role: 'AROGYA_SEVAK', is_super_admin: false, password_hash: '$2b$10$w8T0.dummyHashForDevLogin1234567890', status: 'ACTIVE', is_active: true },
      { full_name: 'Kavita R. Thorat', email: 'kavita.thorat.sevak@arogyamitra.gov.in', mobile: '9820033004', mobile_number: '9820033004', role: 'AROGYA_SEVAK', is_super_admin: false, password_hash: '$2b$10$w8T0.dummyHashForDevLogin1234567890', status: 'ACTIVE', is_active: true },
      { full_name: 'Ganesh T. Waghmare', email: 'ganesh.waghmare.sevak@arogyamitra.gov.in', mobile: '9820033005', mobile_number: '9820033005', role: 'AROGYA_SEVAK', is_super_admin: false, password_hash: '$2b$10$w8T0.dummyHashForDevLogin1234567890', status: 'ACTIVE', is_active: true }
    ];

    const seededUserMap = {};
    for (const u of dummyUsers) {
      const id = await upsertUser(u);
      seededUserMap[u.email] = id;
    }
    console.log('  ✓ Table 1: users seeded');

    // 2. Seed Admins (5 admins)
    const adminEmails = [
      'dr.suresh.admin@arogyamitra.gov.in',
      'meera.admin@arogyamitra.gov.in',
      'anil.admin@arogyamitra.gov.in',
      'pravin.admin@arogyamitra.gov.in',
      'sunita.admin@arogyamitra.gov.in'
    ];
    const adminDepts = ['HEALTH_ADMINISTRATION', 'SCHEME_DISBURSEMENT', 'HOSPITAL_MONITORING', 'GRIEVANCE_REDRESSAL', 'QUALITY_ASSURANCE'];
    const seededAdminIds = [];

    for (let i = 0; i < adminEmails.length; i++) {
      const uId = seededUserMap[adminEmails[i]];
      const check = await query('SELECT id FROM public.admins WHERE user_id = $1', [uId]);
      if (check.rows.length > 0) {
        seededAdminIds.push(check.rows[0].id);
      } else {
        const ins = await query(`
          INSERT INTO public.admins (user_id, department, designation)
          VALUES ($1, $2, $3)
          RETURNING id;
        `, [uId, adminDepts[i], `Deputy Director ${i + 1}`]);
        seededAdminIds.push(ins.rows[0].id);
      }
    }
    // Update created_by
    for (let i = 1; i < seededAdminIds.length; i++) {
      await query(`UPDATE public.admins SET created_by = $1 WHERE id = $2`, [seededAdminIds[0], seededAdminIds[i]]);
    }
    console.log('  ✓ Table 2: admins seeded (5 records)');

    // 3. Seed Citizens (5 citizens)
    const citizenEmails = [
      'vijay.citizen@gmail.com',
      'sunita.jadhav.citizen@gmail.com',
      'ashok.more.citizen@gmail.com',
      'dattatray.shinde@gmail.com',
      'bapu.gaikwad@gmail.com'
    ];
    const citizenProfiles = [
      { address_line: 'Flat 302, Sai Shraddha Apts, Shivaji Nagar', city: 'Pune', taluka: 'Haveli', district: 'Pune', state: 'Maharashtra', pincode: '411005' },
      { address_line: 'House No. 45, Near Hanuman Temple, Aundh', city: 'Pune', taluka: 'Haveli', district: 'Pune', state: 'Maharashtra', pincode: '411007' },
      { address_line: 'Room 12, Chawl No. 4, Kurla West', city: 'Mumbai', taluka: 'Kurla', district: 'Mumbai Suburban', state: 'Maharashtra', pincode: '400070' },
      { address_line: 'Plot 88, Sector 19, Vashi', city: 'Navi Mumbai', taluka: 'Thane', district: 'Thane', state: 'Maharashtra', pincode: '400703' },
      { address_line: 'At Post Wadala, Near Gram Panchayat', city: 'Solapur', taluka: 'North Solapur', district: 'Solapur', state: 'Maharashtra', pincode: '413222' }
    ];

    const seededCitizenIds = [];
    for (let i = 0; i < citizenEmails.length; i++) {
      const uId = seededUserMap[citizenEmails[i]];
      const p = citizenProfiles[i];
      const check = await query('SELECT id FROM public.citizens WHERE user_id = $1', [uId]);
      if (check.rows.length > 0) {
        await query(`
          UPDATE public.citizens SET address_line = $1, city = $2, taluka = $3, district = $4, state = $5, pincode = $6
          WHERE id = $7
        `, [p.address_line, p.city, p.taluka, p.district, p.state, p.pincode, check.rows[0].id]);
        seededCitizenIds.push(check.rows[0].id);
      } else {
        const ins = await query(`
          INSERT INTO public.citizens (user_id, address_line, city, taluka, district, state, pincode)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id;
        `, [uId, p.address_line, p.city, p.taluka, p.district, p.state, p.pincode]);
        seededCitizenIds.push(ins.rows[0].id);
      }
    }
    console.log('  ✓ Table 3: citizens seeded (5 records)');

    // 4. Seed Patients (5 patients)
    const dummyPatients = [
      {
        citizen_id: seededCitizenIds[0],
        full_name: 'Vijay Shantaram Chavan',
        date_of_birth: '1975-04-12',
        gender: 'MALE',
        relationship_with_citizen: 'SELF',
        mobile_number: '9820022001',
        address_line: 'Flat 302, Sai Shraddha Apts, Shivaji Nagar',
        area: 'Shivaji Nagar',
        village: 'Pune City',
        city: 'Pune',
        taluka: 'Haveli',
        district: 'Pune',
        state: 'Maharashtra',
        pincode: '411005',
        latitude: 18.5308,
        longitude: 73.8475,
        aadhaar_number: '554433221101',
        pan_number: 'ABCDE1234F'
      },
      {
        citizen_id: seededCitizenIds[1],
        full_name: 'Anandi Ravindra Jadhav',
        date_of_birth: '1952-08-20',
        gender: 'FEMALE',
        relationship_with_citizen: 'PARENT',
        mobile_number: '9820022002',
        address_line: 'House No. 45, Near Hanuman Temple, Aundh',
        area: 'Aundh',
        village: 'Aundh Gaon',
        city: 'Pune',
        taluka: 'Haveli',
        district: 'Pune',
        state: 'Maharashtra',
        pincode: '411007',
        latitude: 18.5602,
        longitude: 73.8031,
        aadhaar_number: '554433221102',
        pan_number: 'BCDEF2345G'
      },
      {
        citizen_id: seededCitizenIds[2],
        full_name: 'Rahul Ashok More',
        date_of_birth: '1998-11-05',
        gender: 'MALE',
        relationship_with_citizen: 'CHILD',
        mobile_number: '9820022003',
        address_line: 'Room 12, Chawl No. 4, Kurla West',
        area: 'Kurla West',
        village: 'Kurla',
        city: 'Mumbai',
        taluka: 'Kurla',
        district: 'Mumbai Suburban',
        state: 'Maharashtra',
        pincode: '400070',
        latitude: 19.0728,
        longitude: 72.8797,
        aadhaar_number: '554433221103',
        pan_number: 'CDEFG3456H'
      },
      {
        citizen_id: seededCitizenIds[3],
        full_name: 'Sharda Dattatray Shinde',
        date_of_birth: '1968-01-15',
        gender: 'FEMALE',
        relationship_with_citizen: 'SPOUSE',
        mobile_number: '9820022004',
        address_line: 'Plot 88, Sector 19, Vashi',
        area: 'Vashi',
        village: 'Vashi',
        city: 'Navi Mumbai',
        taluka: 'Thane',
        district: 'Thane',
        state: 'Maharashtra',
        pincode: '400703',
        latitude: 19.0771,
        longitude: 72.9986,
        aadhaar_number: '554433221104',
        pan_number: null
      },
      {
        citizen_id: seededCitizenIds[4],
        full_name: 'Kashinath Bapu Gaikwad',
        date_of_birth: '1960-06-30',
        gender: 'MALE',
        relationship_with_citizen: 'SELF',
        mobile_number: '9820022005',
        address_line: 'At Post Wadala, Near Gram Panchayat',
        area: 'Wadala Gram',
        village: 'Wadala',
        city: 'Solapur',
        taluka: 'North Solapur',
        district: 'Solapur',
        state: 'Maharashtra',
        pincode: '413222',
        latitude: 17.6599,
        longitude: 75.9064,
        aadhaar_number: '554433221105',
        pan_number: null
      }
    ];

    const seededPatientIds = [];
    for (const pat of dummyPatients) {
      const check = await query('SELECT id FROM public.patients WHERE aadhaar_number = $1', [pat.aadhaar_number]);
      if (check.rows.length > 0) {
        seededPatientIds.push(check.rows[0].id);
      } else {
        const ins = await query(`
          INSERT INTO public.patients (
            citizen_id, full_name, date_of_birth, gender, relationship_with_citizen,
            mobile_number, address_line, area, village, city, taluka, district, state,
            pincode, latitude, longitude, aadhaar_number, pan_number
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
          RETURNING id;
        `, [
          pat.citizen_id, pat.full_name, pat.date_of_birth, pat.gender, pat.relationship_with_citizen,
          pat.mobile_number, pat.address_line, pat.area, pat.village, pat.city, pat.taluka, pat.district, pat.state,
          pat.pincode, pat.latitude, pat.longitude, pat.aadhaar_number, pat.pan_number
        ]);
        seededPatientIds.push(ins.rows[0].id);
      }
    }
    console.log('  ✓ Table 4: patients seeded (5 records)');

    // 5. Seed Hospitals (5 hospitals)
    const dummyHospitals = [
      {
        created_by_admin_id: seededAdminIds[0],
        name: 'King Edward Memorial (KEM) Hospital & Medical College',
        registration_number: 'HOSP-MH-MUM-001',
        hospital_number: 'KEMH-1896',
        hospital_type: 'GOVERNMENT',
        address_line: 'Acharya Donde Marg, Parel',
        area: 'Parel',
        village: 'Parel',
        city: 'Mumbai',
        taluka: 'Mumbai City',
        district: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400012',
        nearest_landmark: 'Opposite Tata Memorial Hospital',
        phone: '02224107000',
        email: 'kem.admin@mcgm.gov.in',
        status: 'ACTIVE'
      },
      {
        created_by_admin_id: seededAdminIds[0],
        name: 'Sassoon General Hospital & B.J. Medical College',
        registration_number: 'HOSP-MH-PUN-002',
        hospital_number: 'SGH-PUN-104',
        hospital_type: 'GOVERNMENT',
        address_line: 'Near Pune Railway Station, Sassoon Road',
        area: 'Station Road',
        village: 'Pune',
        city: 'Pune',
        taluka: 'Haveli',
        district: 'Pune',
        state: 'Maharashtra',
        pincode: '411001',
        nearest_landmark: 'Pune Junction Railway Station',
        phone: '02026128000',
        email: 'dean.bjmc@maharashtra.gov.in',
        status: 'ACTIVE'
      },
      {
        created_by_admin_id: seededAdminIds[1],
        name: 'Chhatrapati Shivaji Maharaj Civil Hospital',
        registration_number: 'HOSP-MH-THA-003',
        hospital_number: 'CSM-THA-203',
        hospital_type: 'DISTRICT_HOSPITAL',
        address_line: 'Near Central Jail, Tembhi Naka',
        area: 'Tembhi Naka',
        village: 'Thane West',
        city: 'Thane',
        taluka: 'Thane',
        district: 'Thane',
        state: 'Maharashtra',
        pincode: '400601',
        nearest_landmark: 'Tembhi Naka Junction',
        phone: '02225472255',
        email: 'civilhospital.thane@maharashtra.gov.in',
        status: 'ACTIVE'
      },
      {
        created_by_admin_id: seededAdminIds[2],
        name: 'Lilavati Hospital and Research Centre',
        registration_number: 'HOSP-MH-LIL-004',
        hospital_number: 'LIL-MUM-401',
        hospital_type: 'TRUST',
        address_line: 'A-791, Bandra Reclamation, Bandra West',
        area: 'Bandra Reclamation',
        village: 'Bandra',
        city: 'Mumbai',
        taluka: 'Andheri',
        district: 'Mumbai Suburban',
        state: 'Maharashtra',
        pincode: '400050',
        nearest_landmark: 'Bandra-Worli Sea Link Toll Plaza',
        phone: '02226751000',
        email: 'schemes@lilavatihospital.com',
        status: 'ACTIVE'
      },
      {
        created_by_admin_id: seededAdminIds[3],
        name: 'Dr. V. M. Government Medical College & General Hospital',
        registration_number: 'HOSP-MH-SOL-005',
        hospital_number: 'VMGMC-SOL-501',
        hospital_type: 'GOVERNMENT',
        address_line: 'Opposite District Court, Budhwar Peth',
        area: 'Budhwar Peth',
        village: 'Solapur City',
        city: 'Solapur',
        taluka: 'North Solapur',
        district: 'Solapur',
        state: 'Maharashtra',
        pincode: '413003',
        nearest_landmark: 'District Sessions Court',
        phone: '02172312984',
        email: 'vmgmc.solapur@maharashtra.gov.in',
        status: 'ACTIVE'
      }
    ];

    const seededHospitalIds = [];
    for (const h of dummyHospitals) {
      const check = await query('SELECT id FROM public.hospitals WHERE registration_number = $1 OR name = $2', [h.registration_number, h.name]);
      if (check.rows.length > 0) {
        await query(`
          UPDATE public.hospitals 
          SET registration_number = $1, hospital_number = $2, hospital_type = $3, address_line = $4, area = $5,
              village = $6, city = $7, taluka = $8, district = $9, state = $10, pincode = $11, nearest_landmark = $12, phone = $13
          WHERE id = $14
        `, [
          h.registration_number, h.hospital_number, h.hospital_type, h.address_line, h.area,
          h.village, h.city, h.taluka, h.district, h.state, h.pincode, h.nearest_landmark, h.phone, check.rows[0].id
        ]);
        seededHospitalIds.push(check.rows[0].id);
      } else {
        const ins = await query(`
          INSERT INTO public.hospitals (
            created_by_admin_id, name, registration_number, hospital_number, hospital_type,
            address_line, area, village, city, taluka, district, state, pincode, nearest_landmark,
            phone, email, status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          RETURNING id;
        `, [
          h.created_by_admin_id, h.name, h.registration_number, h.hospital_number, h.hospital_type,
          h.address_line, h.area, h.village, h.city, h.taluka, h.district, h.state, h.pincode, h.nearest_landmark,
          h.phone, h.email, h.status
        ]);
        seededHospitalIds.push(ins.rows[0].id);
      }
    }
    console.log('  ✓ Table 5: hospitals seeded (5 records)');

    // 6. Seed Arogya Sevaks (5 sevaks)
    const sevakEmails = [
      'ramesh.kadam.sevak@arogyamitra.gov.in',
      'pooja.deshmukh.sevak@arogyamitra.gov.in',
      'sachin.pawar.sevak@arogyamitra.gov.in',
      'kavita.thorat.sevak@arogyamitra.gov.in',
      'ganesh.waghmare.sevak@arogyamitra.gov.in'
    ];
    const dummySevaks = [
      { employee_id: 'AS-MH-PUN-0101', designation: 'Senior Arogya Mitra', joining_date: '2023-01-15' },
      { employee_id: 'AS-MH-MUM-0102', designation: 'Lead Scheme Coordinator', joining_date: '2023-03-01' },
      { employee_id: 'AS-MH-THA-0103', designation: 'Hospital Helpdesk Sevak', joining_date: '2023-06-10' },
      { employee_id: 'AS-MH-MUM-0104', designation: 'Patient Welfare Assistant', joining_date: '2023-09-20' },
      { employee_id: 'AS-MH-SOL-0105', designation: 'District Field Sevak', joining_date: '2024-02-01' }
    ];

    const seededSevakIds = [];
    for (let i = 0; i < sevakEmails.length; i++) {
      const uId = seededUserMap[sevakEmails[i]];
      const hId = seededHospitalIds[i % seededHospitalIds.length];
      const s = dummySevaks[i];
      const check = await query('SELECT id FROM public.arogya_sevaks WHERE user_id = $1', [uId]);
      if (check.rows.length > 0) {
        await query(`
          UPDATE public.arogya_sevaks 
          SET hospital_id = $1, employee_id = $2, designation = $3, joining_date = $4, status = 'ACTIVE'
          WHERE id = $5
        `, [hId, s.employee_id, s.designation, s.joining_date, check.rows[0].id]);
        seededSevakIds.push(check.rows[0].id);
      } else {
        const ins = await query(`
          INSERT INTO public.arogya_sevaks (user_id, hospital_id, employee_id, designation, joining_date, status)
          VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
          RETURNING id;
        `, [uId, hId, s.employee_id, s.designation, s.joining_date]);
        seededSevakIds.push(ins.rows[0].id);
      }
    }
    console.log('  ✓ Table 6: arogya_sevaks seeded (5 records)');

    // 7. Seed Doctors (5 doctors)
    const dummyDoctors = [
      { hospital_id: seededHospitalIds[0], name: 'Dr. Arvind Mahadeo Joshi', registration_number: 'MMC-2004-05-1234', qualification: 'MBBS, MS (General Surgery), MCh (Cardiothoracic)', specialization: 'Cardiothoracic Surgery', contact_number: '9821100111', joining_date: '2015-07-01' },
      { hospital_id: seededHospitalIds[1], name: 'Dr. Meenal Kulkarni-Deshpande', registration_number: 'MMC-2008-11-5678', qualification: 'MBBS, MD (Medicine), DM (Cardiology)', specialization: 'Interventional Cardiology', contact_number: '9821100222', joining_date: '2018-02-15' },
      { hospital_id: seededHospitalIds[2], name: 'Dr. Rajesh Vitthalrao Salunkhe', registration_number: 'MMC-2010-03-9012', qualification: 'MBBS, MS (Orthopaedics)', specialization: 'Joint Replacement & Trauma', contact_number: '9821100333', joining_date: '2019-09-01' },
      { hospital_id: seededHospitalIds[3], name: 'Dr. Farhan N. Merchant', registration_number: 'MMC-2006-08-3456', qualification: 'MBBS, MD (General Medicine), DM (Nephrology)', specialization: 'Nephrology & Renal Transplant', contact_number: '9821100444', joining_date: '2017-05-10' },
      { hospital_id: seededHospitalIds[4], name: 'Dr. Sunanda Balkrishna Shinde', registration_number: 'MMC-2012-04-7890', qualification: 'MBBS, MS (Ophthalmology)', specialization: 'Cataract & Refractive Eye Care', contact_number: '9821100555', joining_date: '2020-01-10' }
    ];

    const seededDoctorIds = [];
    for (const d of dummyDoctors) {
      const check = await query('SELECT id FROM public.doctors WHERE registration_number = $1', [d.registration_number]);
      if (check.rows.length > 0) {
        seededDoctorIds.push(check.rows[0].id);
      } else {
        const ins = await query(`
          INSERT INTO public.doctors (hospital_id, name, registration_number, qualification, specialization, contact_number, joining_date, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE')
          RETURNING id;
        `, [d.hospital_id, d.name, d.registration_number, d.qualification, d.specialization, d.contact_number, d.joining_date]);
        seededDoctorIds.push(ins.rows[0].id);
      }
    }
    console.log('  ✓ Table 7: doctors seeded (5 records)');

    // 8. Seed Schemes (5 schemes)
    const dummySchemes = [
      { name: 'Ayushman Bharat - Pradhan Mantri Jan Arogya Yojana (PM-JAY)', scheme_code: 'PMJAY-IND-001', description: 'Flagship national health protection scheme providing coverage of up to Rs. 5 Lakhs per family per year.', maximum_coverage_amount: 500000.00, eligibility_description: 'Households identified via Socio-Economic Caste Census (SECC 2011) database.', is_active: true },
      { name: 'Mahatma Jyotirao Phule Jan Arogya Yojana (MJPJAY)', scheme_code: 'MJPJAY-MH-002', description: 'Government of Maharashtra health insurance scheme covering 996 medical and surgical procedures up to Rs. 5 Lakhs.', maximum_coverage_amount: 500000.00, eligibility_description: 'Yellow and Orange Ration Card holders, Antyodaya and Annapurna Card holders in Maharashtra.', is_active: true },
      { name: 'Mukhyamantri Sahayata Nidhi (Chief Minister Relief Fund)', scheme_code: 'CMRF-MH-003', description: 'Financial aid provided directly by the Maharashtra CM Office for critical life-threatening surgeries.', maximum_coverage_amount: 300000.00, eligibility_description: 'Needy citizens residing in Maharashtra with annual family income below Rs. 1.8 Lakhs.', is_active: true },
      { name: 'Rashtriya Arogya Nidhi (RAN)', scheme_code: 'RAN-CENTRAL-004', description: 'Financial assistance to patients living Below Poverty Line (BPL) suffering from major life-threatening diseases.', maximum_coverage_amount: 1500000.00, eligibility_description: 'Strictly for Below Poverty Line (BPL) card holders receiving treatment in empanelled apex central government institutes.', is_active: true },
      { name: 'Pradhan Mantri National Dialysis Programme (PMNDP)', scheme_code: 'PMNDP-DIA-005', description: 'Free hemodialysis services for BPL chronic kidney failure patients and subsidized rates under NHM.', maximum_coverage_amount: 150000.00, eligibility_description: 'All patients diagnosed with end-stage renal disease (ESRD) requiring regular weekly hemodialysis.', is_active: true }
    ];

    const seededSchemeIds = [];
    for (const sc of dummySchemes) {
      const check = await query('SELECT id FROM public.schemes WHERE scheme_code = $1', [sc.scheme_code]);
      if (check.rows.length > 0) {
        seededSchemeIds.push(check.rows[0].id);
      } else {
        const ins = await query(`
          INSERT INTO public.schemes (name, scheme_code, description, maximum_coverage_amount, eligibility_description, is_active)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id;
        `, [sc.name, sc.scheme_code, sc.description, sc.maximum_coverage_amount, sc.eligibility_description, sc.is_active]);
        seededSchemeIds.push(ins.rows[0].id);
      }
    }
    console.log('  ✓ Table 8: schemes seeded (5 records)');

    // 9. Seed Hospital Schemes (5 alignments)
    const seededHospitalSchemeIds = [];
    for (let i = 0; i < 5; i++) {
      const hId = seededHospitalIds[i];
      const scId = seededSchemeIds[i];
      const check = await query('SELECT id FROM public.hospital_schemes WHERE hospital_id = $1 AND scheme_id = $2', [hId, scId]);
      if (check.rows.length > 0) {
        seededHospitalSchemeIds.push(check.rows[0].id);
      } else {
        const ins = await query(`
          INSERT INTO public.hospital_schemes (hospital_id, scheme_id, alignment_status, alignment_start_date)
          VALUES ($1, $2, 'EMPANELLED', '2023-01-01')
          RETURNING id;
        `, [hId, scId]);
        seededHospitalSchemeIds.push(ins.rows[0].id);
      }
    }
    console.log('  ✓ Table 9: hospital_schemes seeded (5 records)');

    // 10. Seed Applications (5 applications)
    const dummyApplications = [
      { patient_id: seededPatientIds[0], submitted_by_citizen_id: seededCitizenIds[0], application_number: 'AM-2026-APP-000101', current_status: 'APPROVED', submitted_at: '2026-08-01 10:30:00+05:30', reviewed_at: '2026-08-02 14:00:00+05:30', completed_at: '2026-08-05 18:00:00+05:30' },
      { patient_id: seededPatientIds[1], submitted_by_citizen_id: seededCitizenIds[1], application_number: 'AM-2026-APP-000102', current_status: 'UNDER_REVIEW', submitted_at: '2026-08-10 11:15:00+05:30', reviewed_at: '2026-08-11 09:45:00+05:30', completed_at: null },
      { patient_id: seededPatientIds[2], submitted_by_citizen_id: seededCitizenIds[2], application_number: 'AM-2026-APP-000103', current_status: 'SUBMITTED', submitted_at: '2026-08-15 16:20:00+05:30', reviewed_at: null, completed_at: null },
      { patient_id: seededPatientIds[3], submitted_by_citizen_id: seededCitizenIds[3], application_number: 'AM-2026-APP-000104', current_status: 'ESCALATED', submitted_at: '2026-08-18 12:00:00+05:30', reviewed_at: '2026-08-19 13:00:00+05:30', completed_at: null },
      { patient_id: seededPatientIds[4], submitted_by_citizen_id: seededCitizenIds[4], application_number: 'AM-2026-APP-000105', current_status: 'DISBURSED', submitted_at: '2026-07-20 09:00:00+05:30', reviewed_at: '2026-07-21 11:30:00+05:30', completed_at: '2026-07-28 17:00:00+05:30' }
    ];

    const seededAppIds = [];
    for (const app of dummyApplications) {
      const check = await query('SELECT id FROM public.applications WHERE application_number = $1', [app.application_number]);
      if (check.rows.length > 0) {
        seededAppIds.push(check.rows[0].id);
      } else {
        const ins = await query(`
          INSERT INTO public.applications (
            patient_id, submitted_by_citizen_id, application_number, current_status,
            submitted_at, reviewed_at, completed_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id;
        `, [app.patient_id, app.submitted_by_citizen_id, app.application_number, app.current_status, app.submitted_at, app.reviewed_at, app.completed_at]);
        seededAppIds.push(ins.rows[0].id);
      }
    }
    console.log('  ✓ Table 10: applications seeded (5 records)');

    // 11. Seed Document Types (5 document types)
    const dummyDocTypes = [
      { name: 'Aadhaar Card', description: 'Official photo identity and address verification proof issued by UIDAI.', is_required: true },
      { name: 'Income Certificate / Ration Card', description: 'Tahsildar approved annual income certificate or NFSA Yellow/Orange ration card.', is_required: true },
      { name: 'Doctor Treatment Estimation Slip', description: 'Hospital quotation and pre-authorization diagnosis letter signed by treating doctor.', is_required: true },
      { name: 'Hospital Admission Card / OPD Slip', description: 'Initial registration case paper indicating date and type of admission.', is_required: true },
      { name: 'Diagnostic & Pathology Reports', description: 'Laboratory test findings (ECG, 2D Echo, MRI/CT, Biopsy report, Blood tests).', is_required: false }
    ];

    const seededDocTypeIds = [];
    for (const dt of dummyDocTypes) {
      const check = await query('SELECT id FROM public.document_types WHERE name = $1', [dt.name]);
      if (check.rows.length > 0) {
        seededDocTypeIds.push(check.rows[0].id);
      } else {
        const ins = await query(`
          INSERT INTO public.document_types (name, description, is_required, status)
          VALUES ($1, $2, $3, 'ACTIVE')
          RETURNING id;
        `, [dt.name, dt.description, dt.is_required]);
        seededDocTypeIds.push(ins.rows[0].id);
      }
    }
    console.log('  ✓ Table 11: document_types seeded (5 records)');

    // 12. Seed Application Documents (5 verified documents)
    const dummyAppDocs = [
      { application_id: seededAppIds[0], document_type_id: seededDocTypeIds[0], file_url: 'https://storage.supabase.co/arogyamitra-docs/app101/aadhaar_card.pdf', file_name: 'patient_aadhaar_front_back.pdf', document_status: 'VERIFIED', verification_remark: 'Aadhaar QR verified successfully against UIDAI records.', uploaded_by_user_id: seededUserMap['vijay.citizen@gmail.com'], verified_by_user_id: seededUserMap['dr.suresh.admin@arogyamitra.gov.in'] },
      { application_id: seededAppIds[0], document_type_id: seededDocTypeIds[2], file_url: 'https://storage.supabase.co/arogyamitra-docs/app101/kem_doctor_quotation.pdf', file_name: 'kem_angioplasty_estimation.pdf', document_status: 'VERIFIED', verification_remark: 'Signed and stamped by Head of Cardiology Department.', uploaded_by_user_id: seededUserMap['vijay.citizen@gmail.com'], verified_by_user_id: seededUserMap['dr.suresh.admin@arogyamitra.gov.in'] },
      { application_id: seededAppIds[1], document_type_id: seededDocTypeIds[1], file_url: 'https://storage.supabase.co/arogyamitra-docs/app102/orange_ration_card.pdf', file_name: 'maharashtra_orange_ration_card.pdf', document_status: 'VERIFIED', verification_remark: 'RC valid under MJPJAY scheme portal.', uploaded_by_user_id: seededUserMap['sunita.jadhav.citizen@gmail.com'], verified_by_user_id: seededUserMap['meera.admin@arogyamitra.gov.in'] },
      { application_id: seededAppIds[2], document_type_id: seededDocTypeIds[3], file_url: 'https://storage.supabase.co/arogyamitra-docs/app103/opd_admission_case_paper.pdf', file_name: 'thane_civil_opd_paper.pdf', document_status: 'PENDING', verification_remark: 'Awaiting Sevak physical verification at desk.', uploaded_by_user_id: seededUserMap['ashok.more.citizen@gmail.com'], verified_by_user_id: null },
      { application_id: seededAppIds[3], document_type_id: seededDocTypeIds[4], file_url: 'https://storage.supabase.co/arogyamitra-docs/app104/biopsy_histopathology.pdf', file_name: 'lilavati_pathology_biopsy.pdf', document_status: 'VERIFIED', verification_remark: 'Confirmed positive for standard chemotherapy protocol.', uploaded_by_user_id: seededUserMap['dattatray.shinde@gmail.com'], verified_by_user_id: seededUserMap['anil.admin@arogyamitra.gov.in'] }
    ];

    const seededAppDocIds = [];
    for (const ad of dummyAppDocs) {
      const check = await query('SELECT id FROM public.application_documents WHERE application_id = $1 AND file_name = $2', [ad.application_id, ad.file_name]);
      if (check.rows.length > 0) {
        seededAppDocIds.push(check.rows[0].id);
      } else {
        const ins = await query(`
          INSERT INTO public.application_documents (
            application_id, document_type_id, file_url, file_name, document_status,
            verification_remark, uploaded_by_user_id, verified_by_user_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id;
        `, [ad.application_id, ad.document_type_id, ad.file_url, ad.file_name, ad.document_status, ad.verification_remark, ad.uploaded_by_user_id, ad.verified_by_user_id]);
        seededAppDocIds.push(ins.rows[0].id);
      }
    }
    console.log('  ✓ Table 12: application_documents seeded (5 records)');

    // 13. Seed Application Status History (5 logs)
    const existingHist = await query('SELECT count(*)::int AS count FROM public.application_status_histories');
    if (existingHist.rows[0].count < 5) {
      const dummyStatusHistory = [
        { application_id: seededAppIds[0], old_status: 'DRAFT', new_status: 'SUBMITTED', remark: 'Citizen completed form submission online.', changed_by_user_id: seededUserMap['vijay.citizen@gmail.com'] },
        { application_id: seededAppIds[0], old_status: 'SUBMITTED', new_status: 'UNDER_REVIEW', remark: 'Assigned to Arogya Sevak for desk verification.', changed_by_user_id: seededUserMap['dr.suresh.admin@arogyamitra.gov.in'] },
        { application_id: seededAppIds[0], old_status: 'UNDER_REVIEW', new_status: 'APPROVED', remark: 'Documents and income criteria validated. Scheme sanction approved.', changed_by_user_id: seededUserMap['dr.suresh.admin@arogyamitra.gov.in'] },
        { application_id: seededAppIds[1], old_status: 'SUBMITTED', new_status: 'UNDER_REVIEW', remark: 'Documents under clinical evaluation by Medical Officer.', changed_by_user_id: seededUserMap['meera.admin@arogyamitra.gov.in'] },
        { application_id: seededAppIds[3], old_status: 'UNDER_REVIEW', new_status: 'ESCALATED', remark: 'Hospital requested pre-auth clarification on billing cap.', changed_by_user_id: seededUserMap['pooja.deshmukh.sevak@arogyamitra.gov.in'] }
      ];

      for (const sh of dummyStatusHistory) {
        await query(`
          INSERT INTO public.application_status_histories (application_id, old_status, new_status, remark, changed_by_user_id)
          VALUES ($1, $2, $3, $4, $5);
        `, [sh.application_id, sh.old_status, sh.new_status, sh.remark, sh.changed_by_user_id]);
      }
    }
    console.log('  ✓ Table 13: application_status_histories seeded (5 records)');

    // 14. Seed Application Remarks (5 remarks)
    const existingRem = await query('SELECT count(*)::int AS count FROM public.application_remarks');
    if (existingRem.rows[0].count < 5) {
      const dummyRemarks = [
        { application_id: seededAppIds[0], created_by_user_id: seededUserMap['dr.suresh.admin@arogyamitra.gov.in'], remark_type: 'ADMIN_NOTE', remark: 'Fast-track approval granted for urgent cardiac stenting under PM-JAY.' },
        { application_id: seededAppIds[1], created_by_user_id: seededUserMap['ramesh.kadam.sevak@arogyamitra.gov.in'], remark_type: 'INTERNAL', remark: 'Verified family ration card directly at Tahsil portal. Valid.' },
        { application_id: seededAppIds[2], created_by_user_id: seededUserMap['ashok.more.citizen@gmail.com'], remark_type: 'CITIZEN_VISIBLE', remark: 'Patient admitted to Ward 4, awaiting final surgery schedule.' },
        { application_id: seededAppIds[3], created_by_user_id: seededUserMap['pooja.deshmukh.sevak@arogyamitra.gov.in'], remark_type: 'MEDICAL_REVIEW', remark: 'Pre-auth query raised regarding implant cost limits under MJPJAY.' },
        { application_id: seededAppIds[4], created_by_user_id: seededUserMap['pravin.admin@arogyamitra.gov.in'], remark_type: 'GENERAL', remark: 'Claim disbursed directly to hospital DBT account.' }
      ];

      for (const rem of dummyRemarks) {
        await query(`
          INSERT INTO public.application_remarks (application_id, created_by_user_id, remark_type, remark)
          VALUES ($1, $2, $3, $4);
        `, [rem.application_id, rem.created_by_user_id, rem.remark_type, rem.remark]);
      }
    }
    console.log('  ✓ Table 14: application_remarks seeded (5 records)');

    // 15. Seed Application Assignments (5 assignments)
    const dummyAssignments = [
      { application_id: seededAppIds[0], assigned_by_admin_id: seededAdminIds[0], hospital_id: seededHospitalIds[0], arogya_sevak_id: seededSevakIds[0], assignment_status: 'COMPLETED', assignment_remark: 'Pre-auth and desk verification completed successfully.' },
      { application_id: seededAppIds[1], assigned_by_admin_id: seededAdminIds[0], hospital_id: seededHospitalIds[1], arogya_sevak_id: seededSevakIds[1], assignment_status: 'IN_PROGRESS', assignment_remark: 'Patient document verification currently underway in Sassoon Hospital.' },
      { application_id: seededAppIds[2], assigned_by_admin_id: seededAdminIds[1], hospital_id: seededHospitalIds[2], arogya_sevak_id: seededSevakIds[2], assignment_status: 'ASSIGNED', assignment_remark: 'Assigned to Thane Civil Hospital Sevak for patient guidance.' },
      { application_id: seededAppIds[3], assigned_by_admin_id: seededAdminIds[2], hospital_id: seededHospitalIds[3], arogya_sevak_id: seededSevakIds[3], assignment_status: 'IN_PROGRESS', assignment_remark: 'Coordinating with Lilavati billing desk.' },
      { application_id: seededAppIds[4], assigned_by_admin_id: seededAdminIds[3], hospital_id: seededHospitalIds[4], arogya_sevak_id: seededSevakIds[4], assignment_status: 'COMPLETED', assignment_remark: 'Disbursement confirmation handed over to patient family.' }
    ];

    for (const asn of dummyAssignments) {
      const check = await query('SELECT id FROM public.application_assignments WHERE application_id = $1 AND arogya_sevak_id = $2', [asn.application_id, asn.arogya_sevak_id]);
      if (check.rows.length === 0) {
        await query(`
          INSERT INTO public.application_assignments (
            application_id, assigned_by_admin_id, hospital_id, arogya_sevak_id, assignment_status, assignment_remark
          )
          VALUES ($1, $2, $3, $4, $5, $6);
        `, [asn.application_id, asn.assigned_by_admin_id, asn.hospital_id, asn.arogya_sevak_id, asn.assignment_status, asn.assignment_remark]);
      }
    }
    console.log('  ✓ Table 15: application_assignments seeded (5 records)');

    // 16. Seed Scheme Assessments (5 assessments)
    const dummyAssessments = [
      { application_id: seededAppIds[0], scheme_id: seededSchemeIds[0], eligibility_status: 'ELIGIBLE', reason: 'SECC Deprivation D1 criteria verified with biometric Aadhaar match.', remarks: 'Sanctioned 100% package for Coronary Angioplasty up to Rs. 1,50,000.', assessed_by_admin_id: seededAdminIds[0] },
      { application_id: seededAppIds[1], scheme_id: seededSchemeIds[1], eligibility_status: 'ELIGIBLE', reason: 'Valid Orange Ration Card Holder within Maharashtra state limits.', remarks: 'Approved under MJPJAY knee replacement code ORTH01.', assessed_by_admin_id: seededAdminIds[0] },
      { application_id: seededAppIds[2], scheme_id: seededSchemeIds[2], eligibility_status: 'CONDITIONAL', reason: 'Income certificate above 1 Lakh, requires Tahsildar counter-signature.', remarks: 'Provisional clearance subject to counter-signed affidavit.', assessed_by_admin_id: seededAdminIds[1] },
      { application_id: seededAppIds[3], scheme_id: seededSchemeIds[0], eligibility_status: 'ELIGIBLE', reason: 'Eligible under PM-JAY Tertiary Oncology protocol.', remarks: 'Approved for cycle 1-6 Chemotherapy.', assessed_by_admin_id: seededAdminIds[2] },
      { application_id: seededAppIds[4], scheme_id: seededSchemeIds[4], eligibility_status: 'ELIGIBLE', reason: 'End Stage Renal Disease verified by Nephrology Board.', remarks: 'Approved for ongoing weekly bi-dialysis at civil unit.', assessed_by_admin_id: seededAdminIds[3] }
    ];

    for (const sa of dummyAssessments) {
      const check = await query('SELECT id FROM public.scheme_assessments WHERE application_id = $1 AND scheme_id = $2', [sa.application_id, sa.scheme_id]);
      if (check.rows.length === 0) {
        await query(`
          INSERT INTO public.scheme_assessments (
            application_id, scheme_id, eligibility_status, reason, remarks, assessed_by_admin_id
          )
          VALUES ($1, $2, $3, $4, $5, $6);
        `, [sa.application_id, sa.scheme_id, sa.eligibility_status, sa.reason, sa.remarks, sa.assessed_by_admin_id]);
      }
    }
    console.log('  ✓ Table 16: scheme_assessments seeded (5 records)');

    // 17. Seed Scheme Claims (5 claims)
    const dummyClaims = [
      { application_id: seededAppIds[0], scheme_id: seededSchemeIds[0], hospital_id: seededHospitalIds[0], arogya_sevak_id: seededSevakIds[0], claim_number: 'CLM-2026-MH-001001', claimed_amount: 145000.00, approved_amount: 145000.00, status: 'APPROVED', claim_date: '2026-08-04', approval_date: '2026-08-05', remarks: 'Claim fully settled per PM-JAY package rates.' },
      { application_id: seededAppIds[1], scheme_id: seededSchemeIds[1], hospital_id: seededHospitalIds[1], arogya_sevak_id: seededSevakIds[1], claim_number: 'CLM-2026-MH-001002', claimed_amount: 98000.00, approved_amount: 95000.00, status: 'UNDER_REVIEW', claim_date: '2026-08-12', approval_date: null, remarks: 'Audit verification of implant invoice in progress.' },
      { application_id: seededAppIds[2], scheme_id: seededSchemeIds[2], hospital_id: seededHospitalIds[2], arogya_sevak_id: seededSevakIds[2], claim_number: 'CLM-2026-MH-001003', claimed_amount: 45000.00, approved_amount: null, status: 'PENDING', claim_date: '2026-08-16', approval_date: null, remarks: 'Awaiting submission of post-operative discharge summary.' },
      { application_id: seededAppIds[3], scheme_id: seededSchemeIds[0], hospital_id: seededHospitalIds[3], arogya_sevak_id: seededSevakIds[3], claim_number: 'CLM-2026-MH-001004', claimed_amount: 210000.00, approved_amount: null, status: 'SUBMITTED', claim_date: '2026-08-19', approval_date: null, remarks: 'Escalation raised for high package approval.' },
      { application_id: seededAppIds[4], scheme_id: seededSchemeIds[4], hospital_id: seededHospitalIds[4], arogya_sevak_id: seededSevakIds[4], claim_number: 'CLM-2026-MH-001005', claimed_amount: 32000.00, approved_amount: 32000.00, status: 'APPROVED', claim_date: '2026-07-25', approval_date: '2026-07-28', remarks: 'Dialysis cycle package disbursed directly.' }
    ];

    for (const clm of dummyClaims) {
      const check = await query('SELECT id FROM public.scheme_claims WHERE claim_number = $1', [clm.claim_number]);
      if (check.rows.length === 0) {
        await query(`
          INSERT INTO public.scheme_claims (
            application_id, scheme_id, hospital_id, arogya_sevak_id, claim_number,
            claimed_amount, approved_amount, status, claim_date, approval_date, remarks
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);
        `, [
          clm.application_id, clm.scheme_id, clm.hospital_id, clm.arogya_sevak_id, clm.claim_number,
          clm.claimed_amount, clm.approved_amount, clm.status, clm.claim_date, clm.approval_date, clm.remarks
        ]);
      }
    }
    console.log('  ✓ Table 17: scheme_claims seeded (5 records)');

    // 18. Seed Case Escalations (5 escalations)
    const dummyEscalations = [
      { application_id: seededAppIds[3], raised_by_arogya_sevak_id: seededSevakIds[3], escalated_to_admin_id: seededAdminIds[2], resolved_by_admin_id: null, escalation_reason: 'SCHEME_DENIAL', description: 'Private hospital billing desk demanding cash deposit for oncology drugs covered under PM-JAY.', status: 'OPEN', resolution: null },
      { application_id: seededAppIds[1], raised_by_arogya_sevak_id: seededSevakIds[1], escalated_to_admin_id: seededAdminIds[0], resolved_by_admin_id: seededAdminIds[0], escalation_reason: 'DELAY_IN_APPROVAL', description: 'TPA portal technical delay exceeding 24 hours for emergency surgery approval.', status: 'RESOLVED', resolution: 'Admin intervened and granted manual offline sanction code.' },
      { application_id: seededAppIds[2], raised_by_arogya_sevak_id: seededSevakIds[2], escalated_to_admin_id: seededAdminIds[1], resolved_by_admin_id: null, escalation_reason: 'DOCUMENT_MISMATCH', description: 'Aadhaar spelling mismatch with hospital birth register entry.', status: 'UNDER_INVESTIGATION', resolution: null },
      { application_id: seededAppIds[0], raised_by_arogya_sevak_id: seededSevakIds[0], escalated_to_admin_id: seededAdminIds[0], resolved_by_admin_id: seededAdminIds[0], escalation_reason: 'HOSPITAL_NON_COOPERATION', description: 'Initial lack of ICU bed availability reported by ward staff.', status: 'CLOSED', resolution: 'Sevak met Medical Superintendent; emergency cardiac bed allotted.' },
      { application_id: seededAppIds[4], raised_by_arogya_sevak_id: seededSevakIds[4], escalated_to_admin_id: seededAdminIds[3], resolved_by_admin_id: seededAdminIds[3], escalation_reason: 'PATIENT_GRIEVANCE', description: 'Patient requested assistance for local travel reimbursement under tribal subsidy.', status: 'RESOLVED', resolution: 'Transport allowance of Rs. 1,000 disbursed per scheme guidelines.' }
    ];

    for (const esc of dummyEscalations) {
      const check = await query('SELECT id FROM public.case_escalations WHERE application_id = $1 AND escalation_reason = $2', [esc.application_id, esc.escalation_reason]);
      if (check.rows.length === 0) {
        await query(`
          INSERT INTO public.case_escalations (
            application_id, raised_by_arogya_sevak_id, escalated_to_admin_id, resolved_by_admin_id,
            escalation_reason, description, status, resolution
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
        `, [
          esc.application_id, esc.raised_by_arogya_sevak_id, esc.escalated_to_admin_id, esc.resolved_by_admin_id,
          esc.escalation_reason, esc.description, esc.status, esc.resolution
        ]);
      }
    }
    console.log('  ✓ Table 18: case_escalations seeded (5 records)');

    // 19. Seed Medical Records (5 medical records)
    const dummyMedicalRecords = [
      { patient_id: seededPatientIds[0], application_id: seededAppIds[0], medical_condition: 'Acute Anterior Wall Myocardial Infarction', diagnosis: 'Coronary Artery Disease with 95% LAD artery stenosis.', treatment_type: 'Percutaneous Coronary Intervention', opd_ipd: 'IPD', admission_date: '2026-08-01', discharge_date: '2026-08-05', treating_doctor: 'Dr. Arvind Mahadeo Joshi', hospital_name: 'King Edward Memorial (KEM) Hospital', treatment_description: 'Drug Eluting Stent placed in LAD successfully under fluoroscopy guidance. Patient stable.' },
      { patient_id: seededPatientIds[1], application_id: seededAppIds[1], medical_condition: 'Severe Bilateral Osteoarthritis of Knees', diagnosis: 'Degenerative joint disease resulting in severe mobility impairment.', treatment_type: 'Total Knee Arthroplasty (TKR)', opd_ipd: 'IPD', admission_date: '2026-08-10', discharge_date: null, treating_doctor: 'Dr. Meenal Kulkarni-Deshpande', hospital_name: 'Sassoon General Hospital Pune', treatment_description: 'Pre-operative cardiac and anaesthetic clearance completed. Surgery planned.' },
      { patient_id: seededPatientIds[2], application_id: seededAppIds[2], medical_condition: 'Closed Fracture Right Tibia-Fibula Shaft', diagnosis: 'Road traffic accident injury with displacement of right lower leg bones.', treatment_type: 'Closed Reduction and Internal Fixation', opd_ipd: 'IPD', admission_date: '2026-08-15', discharge_date: null, treating_doctor: 'Dr. Rajesh Vitthalrao Salunkhe', hospital_name: 'Chhatrapati Shivaji Maharaj Civil Hospital Thane', treatment_description: 'C-arm guided interlocking nail inserted. Limb immobilized.' },
      { patient_id: seededPatientIds[3], application_id: seededAppIds[3], medical_condition: 'Diffuse Large B-Cell Non-Hodgkin Lymphoma', diagnosis: 'Stage III lymphadenopathy requiring systematic chemotherapy regimen.', treatment_type: 'R-CHOP Chemotherapy Protocol', opd_ipd: 'IPD', admission_date: '2026-08-18', discharge_date: '2026-08-20', treating_doctor: 'Dr. Farhan N. Merchant', hospital_name: 'Lilavati Hospital and Research Centre', treatment_description: 'Cycle 1 intravenous infusions administered with antiemetic coverage.' },
      { patient_id: seededPatientIds[4], application_id: seededAppIds[4], medical_condition: 'Chronic Kidney Disease Stage 5 (ESRD)', diagnosis: 'Hypertensive nephrosclerosis with serum creatinine 8.4 mg/dL.', treatment_type: 'Bicarbonate Hemodialysis via AV Fistula', opd_ipd: 'OPD', admission_date: '2026-07-20', discharge_date: '2026-07-20', treating_doctor: 'Dr. Sunanda Balkrishna Shinde', hospital_name: 'Dr. V. M. Government Medical College Solapur', treatment_description: '4-hour regular hemodialysis session completed smoothly.' }
    ];

    for (const mr of dummyMedicalRecords) {
      const check = await query('SELECT id FROM public.medical_records WHERE application_id = $1', [mr.application_id]);
      if (check.rows.length === 0) {
        await query(`
          INSERT INTO public.medical_records (
            patient_id, application_id, medical_condition, diagnosis, treatment_type,
            opd_ipd, admission_date, discharge_date, treating_doctor, hospital_name, treatment_description
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);
        `, [
          mr.patient_id, mr.application_id, mr.medical_condition, mr.diagnosis, mr.treatment_type,
          mr.opd_ipd, mr.admission_date, mr.discharge_date, mr.treating_doctor, mr.hospital_name, mr.treatment_description
        ]);
      }
    }
    console.log('  ✓ Table 19: medical_records seeded (5 records)');

    // 20. Seed Patient Bills (5 bills)
    const dummyBills = [
      { application_id: seededAppIds[0], hospital_id: seededHospitalIds[0], bill_document_id: seededAppDocIds[1], uploaded_by_user_id: seededUserMap['vijay.citizen@gmail.com'], bill_number: 'BILL-KEM-2026-0941', bill_date: '2026-08-05', total_amount: 145000.00, scheme_covered_amount: 145000.00, patient_payable_amount: 0.00, remarks: 'Zero cash out of pocket under cashless PM-JAY package.' },
      { application_id: seededAppIds[1], hospital_id: seededHospitalIds[1], bill_document_id: null, uploaded_by_user_id: seededUserMap['sunita.jadhav.citizen@gmail.com'], bill_number: 'BILL-SGH-2026-1182', bill_date: '2026-08-11', total_amount: 98000.00, scheme_covered_amount: 95000.00, patient_payable_amount: 3000.00, remarks: 'Minor non-medical consumables fee payable by patient family.' },
      { application_id: seededAppIds[2], hospital_id: seededHospitalIds[2], bill_document_id: null, uploaded_by_user_id: seededUserMap['ashok.more.citizen@gmail.com'], bill_number: 'BILL-CSM-2026-0523', bill_date: '2026-08-16', total_amount: 45000.00, scheme_covered_amount: 45000.00, patient_payable_amount: 0.00, remarks: 'Fully sponsored under Maharashtra state government health scheme.' },
      { application_id: seededAppIds[3], hospital_id: seededHospitalIds[3], bill_document_id: null, uploaded_by_user_id: seededUserMap['dattatray.shinde@gmail.com'], bill_number: 'BILL-LIL-2026-3021', bill_date: '2026-08-20', total_amount: 210000.00, scheme_covered_amount: 200000.00, patient_payable_amount: 10000.00, remarks: 'Covered under specialized trust scheme allowance.' },
      { application_id: seededAppIds[4], hospital_id: seededHospitalIds[4], bill_document_id: null, uploaded_by_user_id: seededUserMap['bapu.gaikwad@gmail.com'], bill_number: 'BILL-VMG-2026-8821', bill_date: '2026-07-28', total_amount: 32000.00, scheme_covered_amount: 32000.00, patient_payable_amount: 0.00, remarks: 'National Dialysis Programme complete waiver.' }
    ];

    for (const b of dummyBills) {
      const check = await query('SELECT id FROM public.patient_bills WHERE bill_number = $1', [b.bill_number]);
      if (check.rows.length === 0) {
        await query(`
          INSERT INTO public.patient_bills (
            application_id, hospital_id, bill_document_id, uploaded_by_user_id, bill_number,
            bill_date, total_amount, scheme_covered_amount, patient_payable_amount, remarks
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
        `, [
          b.application_id, b.hospital_id, b.bill_document_id, b.uploaded_by_user_id, b.bill_number,
          b.bill_date, b.total_amount, b.scheme_covered_amount, b.patient_payable_amount, b.remarks
        ]);
      }
    }
    console.log('  ✓ Table 20: patient_bills seeded (5 records)');

    // 21. Seed Daily Hospital Updates (5 daily logs)
    const dummyDailyUpdates = [
      { hospital_id: seededHospitalIds[0], updated_by_arogya_sevak_id: seededSevakIds[0], update_date: '2026-09-08', total_beds: 1800, available_icu_beds: 12, available_general_beds: 95, available_other_beds: 20, total_icu_beds: 150, total_general_beds: 1500, total_other_beds: 150, total_patient_count: 1673, new_doctors_joined_count: 3, doctors_left_count: 0, remarks: 'ICU occupancy high; normal OPD and emergency admissions running smoothly.' },
      { hospital_id: seededHospitalIds[1], updated_by_arogya_sevak_id: seededSevakIds[1], update_date: '2026-09-08', total_beds: 1250, available_icu_beds: 8, available_general_beds: 74, available_other_beds: 15, total_icu_beds: 100, total_general_beds: 1050, total_other_beds: 100, total_patient_count: 1153, new_doctors_joined_count: 1, doctors_left_count: 0, remarks: 'New dialysis wing operational; additional 10 beds added.' },
      { hospital_id: seededHospitalIds[2], updated_by_arogya_sevak_id: seededSevakIds[2], update_date: '2026-09-08', total_beds: 650, available_icu_beds: 4, available_general_beds: 48, available_other_beds: 8, total_icu_beds: 50, total_general_beds: 550, total_other_beds: 50, total_patient_count: 590, new_doctors_joined_count: 2, doctors_left_count: 1, remarks: 'Oxygen plant inspected; adequate medicine stock available.' },
      { hospital_id: seededHospitalIds[3], updated_by_arogya_sevak_id: seededSevakIds[3], update_date: '2026-09-08', total_beds: 350, available_icu_beds: 6, available_general_beds: 35, available_other_beds: 10, total_icu_beds: 60, total_general_beds: 250, total_other_beds: 40, total_patient_count: 299, new_doctors_joined_count: 0, doctors_left_count: 0, remarks: 'Oncology ward bed reservation maintained for scheme beneficiaries.' },
      { hospital_id: seededHospitalIds[4], updated_by_arogya_sevak_id: seededSevakIds[4], update_date: '2026-09-08', total_beds: 800, available_icu_beds: 9, available_general_beds: 82, available_other_beds: 18, total_icu_beds: 70, total_general_beds: 650, total_other_beds: 80, total_patient_count: 691, new_doctors_joined_count: 4, doctors_left_count: 1, remarks: 'Weekly vector-borne disease surge management active.' }
    ];

    for (const dhu of dummyDailyUpdates) {
      const check = await query('SELECT id FROM public.daily_hospital_updates WHERE hospital_id = $1 AND update_date = $2', [dhu.hospital_id, dhu.update_date]);
      if (check.rows.length === 0) {
        await query(`
          INSERT INTO public.daily_hospital_updates (
            hospital_id, updated_by_arogya_sevak_id, update_date, total_beds,
            available_icu_beds, available_general_beds, available_other_beds,
            total_icu_beds, total_general_beds, total_other_beds, total_patient_count,
            new_doctors_joined_count, doctors_left_count, remarks
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14);
        `, [
          dhu.hospital_id, dhu.updated_by_arogya_sevak_id, dhu.update_date, dhu.total_beds,
          dhu.available_icu_beds, dhu.available_general_beds, dhu.available_other_beds,
          dhu.total_icu_beds, dhu.total_general_beds, dhu.total_other_beds, dhu.total_patient_count,
          dhu.new_doctors_joined_count, dhu.doctors_left_count, dhu.remarks
        ]);
      }
    }
    console.log('  ✓ Table 21: daily_hospital_updates seeded (5 records)');

    // 22. Seed Hospital Infrastructures (5 infrastructures)
    const dummyInfrastructures = [
      { hospital_id: seededHospitalIds[0], verified_by_arogya_sevak_id: seededSevakIds[0], total_beds: 1800, general_beds: 1500, icu_beds: 150, other_beds: 150, total_rooms: 120, general_rooms: 80, icu_rooms: 20, other_rooms: 20, has_icu: true, has_general_ward: true, has_required_rooms: true, has_required_medical_infrastructure: true, has_specialist_doctors: true, has_required_doctors: true, has_emergency_services: true, has_operation_theatre: true, has_pharmacy: true, has_lab: true, has_blood_bank: true, is_scheme_compliant: true, infrastructure_verification_status: 'VERIFIED', infrastructure_verification_remark: 'Level-1 Tertiary Teaching Hospital with full NABH and NABL compliance.', verified_at: '2026-01-10 10:00:00+05:30' },
      { hospital_id: seededHospitalIds[1], verified_by_arogya_sevak_id: seededSevakIds[1], total_beds: 1250, general_beds: 1050, icu_beds: 100, other_beds: 100, total_rooms: 90, general_rooms: 60, icu_rooms: 15, other_rooms: 15, has_icu: true, has_general_ward: true, has_required_rooms: true, has_required_medical_infrastructure: true, has_specialist_doctors: true, has_required_doctors: true, has_emergency_services: true, has_operation_theatre: true, has_pharmacy: true, has_lab: true, has_blood_bank: true, is_scheme_compliant: true, infrastructure_verification_status: 'VERIFIED', infrastructure_verification_remark: 'State government apex referral hospital fully accredited.', verified_at: '2026-01-15 11:30:00+05:30' },
      { hospital_id: seededHospitalIds[2], verified_by_arogya_sevak_id: seededSevakIds[2], total_beds: 650, general_beds: 550, icu_beds: 50, other_beds: 50, total_rooms: 50, general_rooms: 35, icu_rooms: 8, other_rooms: 7, has_icu: true, has_general_ward: true, has_required_rooms: true, has_required_medical_infrastructure: true, has_specialist_doctors: true, has_required_doctors: true, has_emergency_services: true, has_operation_theatre: true, has_pharmacy: true, has_lab: true, has_blood_bank: true, is_scheme_compliant: true, infrastructure_verification_status: 'VERIFIED', infrastructure_verification_remark: 'District civil infrastructure verified and empanelled for trauma and obstetrics.', verified_at: '2026-02-01 15:00:00+05:30' },
      { hospital_id: seededHospitalIds[3], verified_by_arogya_sevak_id: seededSevakIds[3], total_beds: 350, general_beds: 250, icu_beds: 60, other_beds: 40, total_rooms: 40, general_rooms: 25, icu_rooms: 10, other_rooms: 5, has_icu: true, has_general_ward: true, has_required_rooms: true, has_required_medical_infrastructure: true, has_specialist_doctors: true, has_required_doctors: true, has_emergency_services: true, has_operation_theatre: true, has_pharmacy: true, has_lab: true, has_blood_bank: true, is_scheme_compliant: true, infrastructure_verification_status: 'VERIFIED', infrastructure_verification_remark: 'Super-specialty trust hospital with state of the art robotic surgery & oncology OT.', verified_at: '2026-02-10 14:00:00+05:30' },
      { hospital_id: seededHospitalIds[4], verified_by_arogya_sevak_id: seededSevakIds[4], total_beds: 800, general_beds: 650, icu_beds: 70, other_beds: 80, total_rooms: 65, general_rooms: 45, icu_rooms: 10, other_rooms: 10, has_icu: true, has_general_ward: true, has_required_rooms: true, has_required_medical_infrastructure: true, has_specialist_doctors: true, has_required_doctors: true, has_emergency_services: true, has_operation_theatre: true, has_pharmacy: true, has_lab: true, has_blood_bank: true, is_scheme_compliant: true, infrastructure_verification_status: 'VERIFIED', infrastructure_verification_remark: 'Medical college hospital fulfilling all National Medical Commission norms.', verified_at: '2026-02-20 16:30:00+05:30' }
    ];

    const seededInfraIds = [];
    for (const inf of dummyInfrastructures) {
      const check = await query('SELECT id FROM public.hospital_infrastructures WHERE hospital_id = $1', [inf.hospital_id]);
      if (check.rows.length > 0) {
        seededInfraIds.push(check.rows[0].id);
      } else {
        const ins = await query(`
          INSERT INTO public.hospital_infrastructures (
            hospital_id, verified_by_arogya_sevak_id, total_beds, general_beds, icu_beds, other_beds,
            total_rooms, general_rooms, icu_rooms, other_rooms, has_icu, has_general_ward,
            has_required_rooms, has_required_medical_infrastructure, has_specialist_doctors,
            has_required_doctors, has_emergency_services, has_operation_theatre, has_pharmacy,
            has_lab, has_blood_bank, is_scheme_compliant, infrastructure_verification_status,
            infrastructure_verification_remark, verified_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
          RETURNING id;
        `, [
          inf.hospital_id, inf.verified_by_arogya_sevak_id, inf.total_beds, inf.general_beds, inf.icu_beds, inf.other_beds,
          inf.total_rooms, inf.general_rooms, inf.icu_rooms, inf.other_rooms, inf.has_icu, inf.has_general_ward,
          inf.has_required_rooms, inf.has_required_medical_infrastructure, inf.has_specialist_doctors,
          inf.has_required_doctors, inf.has_emergency_services, inf.has_operation_theatre, inf.has_pharmacy,
          inf.has_lab, inf.has_blood_bank, inf.is_scheme_compliant, inf.infrastructure_verification_status,
          inf.infrastructure_verification_remark, inf.verified_at
        ]);
        seededInfraIds.push(ins.rows[0].id);
      }
    }
    console.log('  ✓ Table 22: hospital_infrastructures seeded (5 records)');

    // 23. Seed Hospital Verifications (5 audits)
    const dummyHospitalVerifications = [
      { application_id: seededAppIds[0], hospital_id: seededHospitalIds[0], infrastructure_id: seededInfraIds[0], arogya_sevak_id: seededSevakIds[0], verification_status: 'VERIFIED', remarks: 'Cath Lab and ICU facilities verified in person for angioplasty procedure.', verified_at: '2026-08-01 12:00:00+05:30' },
      { application_id: seededAppIds[1], hospital_id: seededHospitalIds[1], infrastructure_id: seededInfraIds[1], arogya_sevak_id: seededSevakIds[1], verification_status: 'VERIFIED', remarks: 'Orthopaedic OT sterilization and joint replacement prosthesis stock verified.', verified_at: '2026-08-10 14:30:00+05:30' },
      { application_id: seededAppIds[2], hospital_id: seededHospitalIds[2], infrastructure_id: seededInfraIds[2], arogya_sevak_id: seededSevakIds[2], verification_status: 'VERIFIED', remarks: 'Emergency casualty and X-Ray unit verified for trauma fixation.', verified_at: '2026-08-15 17:00:00+05:30' },
      { application_id: seededAppIds[3], hospital_id: seededHospitalIds[3], infrastructure_id: seededInfraIds[3], arogya_sevak_id: seededSevakIds[3], verification_status: 'VERIFIED', remarks: 'Day care chemotherapy unit and bio-safety cabinet validated.', verified_at: '2026-08-18 15:00:00+05:30' },
      { application_id: seededAppIds[4], hospital_id: seededHospitalIds[4], infrastructure_id: seededInfraIds[4], arogya_sevak_id: seededSevakIds[4], verification_status: 'VERIFIED', remarks: 'RO water plant purity test and hemodialysis machine maintenance log approved.', verified_at: '2026-07-20 10:30:00+05:30' }
    ];

    for (const hv of dummyHospitalVerifications) {
      const check = await query('SELECT id FROM public.hospital_verifications WHERE application_id = $1 AND hospital_id = $2', [hv.application_id, hv.hospital_id]);
      if (check.rows.length === 0) {
        await query(`
          INSERT INTO public.hospital_verifications (
            application_id, hospital_id, infrastructure_id, arogya_sevak_id,
            verification_status, remarks, verified_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7);
        `, [
          hv.application_id, hv.hospital_id, hv.infrastructure_id, hv.arogya_sevak_id,
          hv.verification_status, hv.remarks, hv.verified_at
        ]);
      }
    }
    console.log('  ✓ Table 23: hospital_verifications seeded (5 records)');

    const sevakUser1 = seededUserMap['ramesh.kadam.sevak@arogyamitra.gov.in'] || Object.values(seededUserMap)[0];
    const sevakUser2 = seededUserMap['pooja.deshmukh.sevak@arogyamitra.gov.in'] || Object.values(seededUserMap)[1];

    // 24. Seed OPD Visits (Multi-visit records across cases)
    const dummyOpdVisits = [
      {
        application_id: seededAppIds[0],
        patient_id: seededPatientIds[0],
        recorded_by_user_id: sevakUser1,
        visit_date: '2026-07-28 10:30:00+05:30',
        doctor_name: 'Dr. Arvind Mahadeo Joshi',
        department: 'Cardiology',
        diagnosis: 'Acute Coronary Syndrome with Troponin-T positive',
        findings: 'ECG demonstrates ST elevation in leads V1-V4. Urgent coronary angiography recommended.',
        prescription_file_url: 'https://storage.supabase.co/arogyamitra-docs/app101/opd_rx_cardio_initial.pdf',
        follow_up_required: true,
        follow_up_date: '2026-08-01',
        notes: 'Pre-admission cardiology triage. Patient approved for emergency catheterization under MJPJAY.'
      },
      {
        application_id: seededAppIds[0], // Multiple visit recorded against the same application
        patient_id: seededPatientIds[0],
        recorded_by_user_id: sevakUser1,
        visit_date: '2026-08-12 11:15:00+05:30',
        doctor_name: 'Dr. Arvind Mahadeo Joshi',
        department: 'Cardiology',
        diagnosis: 'Post-PCI Stent Review & Lipid Optimization',
        findings: 'Limb puncture site healed without hematoma. Blood pressure 124/82 mmHg, Pulse 72 bpm regular.',
        prescription_file_url: 'https://storage.supabase.co/arogyamitra-docs/app101/opd_rx_cardio_followup.pdf',
        follow_up_required: true,
        follow_up_date: '2026-09-12',
        notes: 'Prescribed dual antiplatelet therapy for 12 months. Echo scheduled next month.'
      },
      {
        application_id: seededAppIds[1],
        patient_id: seededPatientIds[1],
        recorded_by_user_id: sevakUser2,
        visit_date: '2026-08-02 09:45:00+05:30',
        doctor_name: 'Dr. Meenal Kulkarni-Deshpande',
        department: 'Orthopedics',
        diagnosis: 'Grade IV Bilateral Knee Osteoarthritis',
        findings: 'Severe medial compartment joint space narrowing with subchondral sclerosis and osteophytes.',
        prescription_file_url: 'https://storage.supabase.co/arogyamitra-docs/app102/opd_rx_ortho_assessment.pdf',
        follow_up_required: true,
        follow_up_date: '2026-08-10',
        notes: 'Pre-operative joint evaluation complete. Fitness clearance obtained from anesthesia OPD.'
      },
      {
        application_id: seededAppIds[2],
        patient_id: seededPatientIds[2],
        recorded_by_user_id: sevakUser1,
        visit_date: '2026-08-14 16:20:00+05:30',
        doctor_name: 'Dr. Rajesh Vitthalrao Salunkhe',
        department: 'Orthopedics',
        diagnosis: 'Acute RTA Right Leg Tibia Fracture',
        findings: 'Right lower leg swelling and deformity, distal neurovascular status intact. X-ray confirmed displaced transverse shaft fracture.',
        prescription_file_url: 'https://storage.supabase.co/arogyamitra-docs/app103/opd_rx_trauma.pdf',
        follow_up_required: false,
        follow_up_date: null,
        notes: 'Casualty OPD triage. Converted immediately to surgical admission.'
      },
      {
        application_id: seededAppIds[3],
        patient_id: seededPatientIds[3],
        recorded_by_user_id: sevakUser2,
        visit_date: '2026-08-10 14:00:00+05:30',
        doctor_name: 'Dr. Farhan N. Merchant',
        department: 'Oncology',
        diagnosis: 'Stage III DLBCL Lymphoma Consultation',
        findings: 'Supraclavicular and axillary lymphadenopathy. CBC and renal profile satisfactory for chemotherapy.',
        prescription_file_url: 'https://storage.supabase.co/arogyamitra-docs/app104/opd_rx_chemo.pdf',
        follow_up_required: true,
        follow_up_date: '2026-08-18',
        notes: 'Pre-chemo OPD workup completed under PM-JAY pre-authorization.'
      },
      {
        application_id: seededAppIds[4],
        patient_id: seededPatientIds[4],
        recorded_by_user_id: sevakUser1,
        visit_date: '2026-07-20 08:30:00+05:30',
        doctor_name: 'Dr. Sunanda Balkrishna Shinde',
        department: 'Nephrology',
        diagnosis: 'End Stage Renal Disease (ESRD) on Maintenance Hemodialysis',
        findings: 'Arteriovenous fistula patent with good thrill and bruit. Pre-dialysis BP 150/90 mmHg.',
        prescription_file_url: 'https://storage.supabase.co/arogyamitra-docs/app105/opd_rx_dialysis.pdf',
        follow_up_required: true,
        follow_up_date: '2026-07-23',
        notes: 'Hemodialysis session #48 logged smoothly. Erythropoietin 4000 IU administered.'
      }
    ];

    for (const ov of dummyOpdVisits) {
      const check = await query(
        'SELECT id FROM public.opd_visits WHERE application_id = $1 AND doctor_name = $2 AND visit_date = $3',
        [ov.application_id, ov.doctor_name, ov.visit_date]
      );
      if (check.rows.length === 0) {
        await query(`
          INSERT INTO public.opd_visits (
            application_id, patient_id, recorded_by_user_id, visit_date,
            doctor_name, department, diagnosis, findings,
            prescription_file_url, follow_up_required, follow_up_date, notes
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);
        `, [
          ov.application_id, ov.patient_id, ov.recorded_by_user_id, ov.visit_date,
          ov.doctor_name, ov.department, ov.diagnosis, ov.findings,
          ov.prescription_file_url, ov.follow_up_required, ov.follow_up_date, ov.notes
        ]);
      }
    }
    console.log('  ✓ Table 24: opd_visits seeded (6 records including multi-visit case)');

    // 25. Seed IPD Admissions (1:1 with applications)
    const dummyIpdAdmissions = [
      {
        application_id: seededAppIds[0],
        patient_id: seededPatientIds[0],
        hospital_id: seededHospitalIds[0],
        admission_date: '2026-08-01 09:00:00+05:30',
        ward_bed_number: 'Step-down Cardiology Ward - Bed 06',
        current_status: 'DISCHARGED',
        discharge_date: '2026-08-05 16:30:00+05:30',
        discharge_summary_url: 'https://storage.supabase.co/arogyamitra-docs/app101/discharge_summary.pdf',
        admitting_doctor: 'Dr. Arvind Mahadeo Joshi',
        diagnosis: 'Acute Anterior Wall MI - Stent Placed',
        admitted_by_user_id: sevakUser1
      },
      {
        application_id: seededAppIds[1],
        patient_id: seededPatientIds[1],
        hospital_id: seededHospitalIds[1],
        admission_date: '2026-08-10 11:00:00+05:30',
        ward_bed_number: 'Special Surgical Ward - Bed 08',
        current_status: 'SURGERY_PLANNED',
        discharge_date: null,
        discharge_summary_url: null,
        admitting_doctor: 'Dr. Meenal Kulkarni-Deshpande',
        diagnosis: 'Severe Bilateral Knee Osteoarthritis',
        admitted_by_user_id: sevakUser2
      },
      {
        application_id: seededAppIds[2],
        patient_id: seededPatientIds[2],
        hospital_id: seededHospitalIds[2],
        admission_date: '2026-08-15 15:30:00+05:30',
        ward_bed_number: 'Trauma ICU - Bed 04',
        current_status: 'IN_ICU',
        discharge_date: null,
        discharge_summary_url: null,
        admitting_doctor: 'Dr. Rajesh Vitthalrao Salunkhe',
        diagnosis: 'Closed Fracture Right Tibia-Fibula Shaft',
        admitted_by_user_id: sevakUser1
      },
      {
        application_id: seededAppIds[3],
        patient_id: seededPatientIds[3],
        hospital_id: seededHospitalIds[3],
        admission_date: '2026-08-18 08:30:00+05:30',
        ward_bed_number: 'Oncology Day-Care - Bed 09',
        current_status: 'TREATMENT_ONGOING',
        discharge_date: null,
        discharge_summary_url: null,
        admitting_doctor: 'Dr. Farhan N. Merchant',
        diagnosis: 'Diffuse Large B-Cell Non-Hodgkin Lymphoma',
        admitted_by_user_id: sevakUser2
      }
    ];

    const seededIpdAdmissionMap = {};
    for (const adm of dummyIpdAdmissions) {
      const check = await query('SELECT id FROM public.ipd_admissions WHERE application_id = $1', [adm.application_id]);
      if (check.rows.length === 0) {
        const ins = await query(`
          INSERT INTO public.ipd_admissions (
            application_id, patient_id, hospital_id, admission_date,
            ward_bed_number, current_status, discharge_date, discharge_summary_url,
            admitting_doctor, diagnosis, admitted_by_user_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id;
        `, [
          adm.application_id, adm.patient_id, adm.hospital_id, adm.admission_date,
          adm.ward_bed_number, adm.current_status, adm.discharge_date, adm.discharge_summary_url,
          adm.admitting_doctor, adm.diagnosis, adm.admitted_by_user_id
        ]);
        seededIpdAdmissionMap[adm.application_id] = ins.rows[0].id;
      } else {
        seededIpdAdmissionMap[adm.application_id] = check.rows[0].id;
      }
    }
    console.log('  ✓ Table 25: ipd_admissions seeded (4 records with 1:1 case binding)');

    // 26. Seed IPD Status Updates (Timestamped history transitions)
    const dummyStatusUpdates = [
      // App 0 Timeline
      {
        ipd_admission_id: seededIpdAdmissionMap[seededAppIds[0]],
        previous_status: null,
        new_status: 'ADMITTED_WARD',
        ward_bed_number: 'Ward 4 - Bed 14',
        notes: 'Emergency coronary admission under MJPJAY.',
        updated_by_user_id: sevakUser1,
        created_at: '2026-08-01 09:00:00+05:30'
      },
      {
        ipd_admission_id: seededIpdAdmissionMap[seededAppIds[0]],
        previous_status: 'ADMITTED_WARD',
        new_status: 'IN_ICU',
        ward_bed_number: 'Cardiac ICU - Bed 02',
        notes: 'Transferred post-angioplasty for hemodynamics monitoring.',
        updated_by_user_id: sevakUser1,
        created_at: '2026-08-01 14:00:00+05:30'
      },
      {
        ipd_admission_id: seededIpdAdmissionMap[seededAppIds[0]],
        previous_status: 'IN_ICU',
        new_status: 'TREATMENT_ONGOING',
        ward_bed_number: 'Step-down Cardiology Ward - Bed 06',
        notes: 'Patient stabilized. Step-down care initiated.',
        updated_by_user_id: sevakUser1,
        created_at: '2026-08-03 10:00:00+05:30'
      },
      {
        ipd_admission_id: seededIpdAdmissionMap[seededAppIds[0]],
        previous_status: 'TREATMENT_ONGOING',
        new_status: 'DISCHARGED',
        ward_bed_number: 'Step-down Cardiology Ward - Bed 06',
        notes: 'Discharge summary issued. Medication education provided.',
        updated_by_user_id: sevakUser1,
        created_at: '2026-08-05 16:30:00+05:30'
      },
      // App 1 Timeline
      {
        ipd_admission_id: seededIpdAdmissionMap[seededAppIds[1]],
        previous_status: null,
        new_status: 'ADMITTED_WARD',
        ward_bed_number: 'Orthopedic Ward - Bed 12',
        notes: 'Admitted for scheduled total knee arthroplasty.',
        updated_by_user_id: sevakUser2,
        created_at: '2026-08-10 11:00:00+05:30'
      },
      {
        ipd_admission_id: seededIpdAdmissionMap[seededAppIds[1]],
        previous_status: 'ADMITTED_WARD',
        new_status: 'SURGERY_PLANNED',
        ward_bed_number: 'Special Surgical Ward - Bed 08',
        notes: 'Pre-op anesthesiology clearance done. TKR scheduled tomorrow 8 AM.',
        updated_by_user_id: sevakUser2,
        created_at: '2026-08-11 09:00:00+05:30'
      },
      // App 2 Timeline
      {
        ipd_admission_id: seededIpdAdmissionMap[seededAppIds[2]],
        previous_status: null,
        new_status: 'ADMITTED_WARD',
        ward_bed_number: 'Emergency Casualty - Bay 03',
        notes: 'RTA trauma casualty stabilization.',
        updated_by_user_id: sevakUser1,
        created_at: '2026-08-15 15:30:00+05:30'
      },
      {
        ipd_admission_id: seededIpdAdmissionMap[seededAppIds[2]],
        previous_status: 'ADMITTED_WARD',
        new_status: 'IN_ICU',
        ward_bed_number: 'Trauma ICU - Bed 04',
        notes: 'Post-op observation after closed reduction.',
        updated_by_user_id: sevakUser1,
        created_at: '2026-08-15 19:00:00+05:30'
      }
    ];

    for (const su of dummyStatusUpdates) {
      if (su.ipd_admission_id) {
        const check = await query(
          'SELECT id FROM public.ipd_status_updates WHERE ipd_admission_id = $1 AND new_status = $2 AND created_at = $3',
          [su.ipd_admission_id, su.new_status, su.created_at]
        );
        if (check.rows.length === 0) {
          await query(`
            INSERT INTO public.ipd_status_updates (
              ipd_admission_id, previous_status, new_status, ward_bed_number, notes, updated_by_user_id, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7);
          `, [
            su.ipd_admission_id, su.previous_status, su.new_status, su.ward_bed_number, su.notes, su.updated_by_user_id, su.created_at
          ]);
        }
      }
    }
    console.log('  ✓ Table 26: ipd_status_updates seeded (8 status transition events)');

    // ==========================================
    // 4. VERIFY ALL 26 TABLES & PRINT STATS
    // ==========================================
    console.log('\n========================================================================');
    console.log('📊 VERIFICATION SUMMARY: ALL 26 TABLES CREATED AND SEEDED');
    console.log('========================================================================');

    const all26Tables = [
      'users',
      'admins',
      'citizens',
      'patients',
      'hospitals',
      'arogya_sevaks',
      'doctors',
      'schemes',
      'hospital_schemes',
      'applications',
      'document_types',
      'application_documents',
      'application_status_histories',
      'application_remarks',
      'application_assignments',
      'scheme_assessments',
      'scheme_claims',
      'case_escalations',
      'medical_records',
      'patient_bills',
      'daily_hospital_updates',
      'hospital_infrastructures',
      'hospital_verifications',
      'opd_visits',
      'ipd_admissions',
      'ipd_status_updates'
    ];

    const report = [];
    for (let idx = 0; idx < all26Tables.length; idx++) {
      const tbl = all26Tables[idx];
      const countRes = await query(`SELECT count(*)::int AS count FROM public.${tbl}`);
      const count = countRes.rows[0].count;
      report.push({
        '#': idx + 1,
        'Table Name': tbl,
        'Total Records': count,
        'Has 4-5+ Dummy Records': count >= 4 ? '✅ YES' : '❌ NO'
      });
    }

    console.table(report);
    console.log('🎉 ALL 26 TABLES (INCLUDING IPD ADMISSIONS & STATUS UPDATES) VERIFIED IN POSTGRESQL / SUPABASE!');

  } catch (err) {
    console.error('❌ Error during schema setup or data seeding:', err);
    throw err;
  } finally {
    await pool.end();
  }
}

setupSchemaAndSeedData()
  .then(() => {
    console.log('✅ Migration script finished successfully.');
    process.exit(0);
  })
  .catch(() => {
    process.exit(1);
  });
