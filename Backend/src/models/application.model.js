import { query } from '../config/db.js';
import crypto from 'crypto';

let columnsEnsured = false;
async function ensureApplicationColumns() {
  if (columnsEnsured) return;
  try {
    // 1. Applications table migrations
    await query(`
      ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS suggested_scheme_id VARCHAR(100);
      ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS suggested_scheme_name VARCHAR(255);
      ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS assigned_scheme_id UUID REFERENCES public.schemes(id) ON DELETE SET NULL;
      ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS assigned_scheme_name VARCHAR(255);
      ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS priority VARCHAR(30) DEFAULT 'MEDIUM';
      ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS treatment_type VARCHAR(20) DEFAULT 'OPD';
      ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS hospital_name VARCHAR(255);
      ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL;
      ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS medical_cause_note TEXT;
      ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS referral_type VARCHAR(100);
      ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS referral_custom_type VARCHAR(100);
      ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS referral_name VARCHAR(200);
      ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS referral_first_name VARCHAR(100);
      ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS referral_last_name VARCHAR(100);
      ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS referred_by VARCHAR(200);
      ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS relative_name VARCHAR(150);
      ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS relative_phone VARCHAR(20);
      ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS relative_relation VARCHAR(50);
      ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS relative_address TEXT;
      ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS relative_village VARCHAR(100);
      ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS relative_city VARCHAR(100);
      ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS relative_taluka VARCHAR(100);
      ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS relative_district VARCHAR(100);
      ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS relative_pincode VARCHAR(10);
      ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS revert_details JSONB;
      ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS sanctioned_amount NUMERIC(12, 2);
      ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS remarks TEXT;
      ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
      ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS reminder_count INT DEFAULT 0;
      ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS reopen_requested BOOLEAN DEFAULT FALSE;
      ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS reopen_requested_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS reopen_request_reason TEXT;
      ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS treatment_stage VARCHAR(100) DEFAULT 'Admitted';
      ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS case_progress JSONB;
      ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS sevak_reported_status VARCHAR(100) DEFAULT 'Under Treatment';
      ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS latest_ward_update TEXT;
      ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS sevak_last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS clinical_notes JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS update_history JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS reviewed_by_admin_id UUID;
      ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS reviewed_by_admin_name VARCHAR(255);
      ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP WITH TIME ZONE;
    `);

    // 2. Patients table adjustments
    await query(`
      ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS age INT;
      ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS abha_number VARCHAR(50);
      ALTER TABLE public.patients ALTER COLUMN date_of_birth DROP NOT NULL;
      ALTER TABLE public.patients ALTER COLUMN aadhaar_number DROP NOT NULL;
      ALTER TABLE public.patients ALTER COLUMN aadhaar_number TYPE VARCHAR(50);
      ALTER TABLE public.patients ALTER COLUMN mobile_number TYPE VARCHAR(50);
      ALTER TABLE public.patients ALTER COLUMN relationship_with_citizen TYPE VARCHAR(50);
    `);

    // 3. Application documents adjustments
    await query(`
      ALTER TABLE public.application_documents ADD COLUMN IF NOT EXISTS category VARCHAR(50);
      ALTER TABLE public.application_documents ADD COLUMN IF NOT EXISTS file_size VARCHAR(50);
      ALTER TABLE public.application_documents ADD COLUMN IF NOT EXISTS source VARCHAR(20);
      ALTER TABLE public.application_documents ADD COLUMN IF NOT EXISTS is_sevak_upload BOOLEAN DEFAULT FALSE;
      ALTER TABLE public.application_documents ADD COLUMN IF NOT EXISTS uploaded_by_role VARCHAR(50);
      ALTER TABLE public.application_documents ALTER COLUMN document_type_id DROP NOT NULL;
    `);

    // 4. Application assignments adjustments & table creation
    await query(`
      CREATE TABLE IF NOT EXISTS public.application_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        application_id UUID NOT NULL,
        assigned_by_admin_id UUID,
        hospital_id UUID,
        hospital_name VARCHAR(255),
        arogya_sevak_id UUID,
        sevak_name VARCHAR(255),
        scheme_id VARCHAR(100),
        scheme_name VARCHAR(255),
        admission_date VARCHAR(50),
        assignment_status VARCHAR(50) DEFAULT 'ASSIGNED',
        assignment_remark TEXT,
        assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP WITH TIME ZONE
      );
      ALTER TABLE public.application_assignments ALTER COLUMN hospital_id DROP NOT NULL;
      ALTER TABLE public.application_assignments ALTER COLUMN arogya_sevak_id DROP NOT NULL;
      ALTER TABLE public.application_assignments ALTER COLUMN assigned_by_admin_id DROP NOT NULL;
      ALTER TABLE public.application_assignments ADD COLUMN IF NOT EXISTS hospital_name VARCHAR(255);
      ALTER TABLE public.application_assignments ADD COLUMN IF NOT EXISTS sevak_name VARCHAR(255);
      ALTER TABLE public.application_assignments ADD COLUMN IF NOT EXISTS scheme_id VARCHAR(100);
      ALTER TABLE public.application_assignments ADD COLUMN IF NOT EXISTS scheme_name VARCHAR(255);
      ALTER TABLE public.application_assignments ADD COLUMN IF NOT EXISTS admission_date VARCHAR(50);
      ALTER TABLE public.application_status_histories ALTER COLUMN changed_by_user_id DROP NOT NULL;
    `);

    columnsEnsured = true;
  } catch (e) {
    console.warn('[ApplicationModel] Column migration warning:', e.message);
  }
}

// In-memory fallback map
const inMemoryApplications = new Map();
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Application Model / Data Access Object
 * Maps to `public.applications`
 */
export const ApplicationModel = {
  /**
   * Generates the next sequential Application Number in format AA-<YYYY>-00001
   */
  async generateNextApplicationNumber(year = new Date().getFullYear()) {
    await ensureApplicationColumns();
    const prefix = `AA-${year}-`;

    const sql = `
      SELECT application_number
      FROM public.applications
      WHERE application_number LIKE $1
      ORDER BY application_number DESC
      LIMIT 1;
    `;

    try {
      const res = await query(sql, [`${prefix}%`]);
      if (res.rows.length === 0) {
        return `${prefix}00001`;
      }

      const latestNumber = res.rows[0].application_number;
      const match = latestNumber.match(/^AA-\d{4}-(\d+)$/);
      if (match && match[1]) {
        const nextSeq = parseInt(match[1], 10) + 1;
        return `${prefix}${String(nextSeq).padStart(5, '0')}`;
      }

      return `${prefix}00001`;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        const matching = Array.from(inMemoryApplications.values())
          .map((a) => a.application_number)
          .filter((n) => n && n.startsWith(prefix))
          .sort()
          .reverse();

        if (matching.length === 0) {
          return `${prefix}00001`;
        }
        const match = matching[0].match(/^AA-\d{4}-(\d+)$/);
        const nextSeq = match && match[1] ? parseInt(match[1], 10) + 1 : 1;
        return `${prefix}${String(nextSeq).padStart(5, '0')}`;
      }
      throw dbErr;
    }
  },

  /**
   * Create a new scheme application
   */
  async create({
    patient_id,
    submitted_by_citizen_id,
    application_number,
    suggested_scheme_id = null,
    suggested_scheme_name = null,
    assigned_scheme_id = null,
    assigned_scheme_name = null,
    priority = 'MEDIUM',
    treatment_type = 'OPD',
    hospital_name = null,
    hospital_id = null,
    medical_cause_note = null,
    referral_type = null,
    referral_custom_type = null,
    referral_name = null,
    referral_first_name = null,
    referral_last_name = null,
    referred_by = null,
    relative_name = null,
    relative_phone = null,
    relative_relation = null,
    revert_details = null,
    sanctioned_amount = null,
    remarks = null,
    current_status = 'SUBMITTED',
  }) {
    await ensureApplicationColumns();

    const finalAppNum = application_number || (await this.generateNextApplicationNumber());

    const sql = `
      INSERT INTO public.applications (
        patient_id,
        submitted_by_citizen_id,
        application_number,
        suggested_scheme_id,
        suggested_scheme_name,
        assigned_scheme_id,
        assigned_scheme_name,
        priority,
        treatment_type,
        hospital_name,
        hospital_id,
        medical_cause_note,
        referral_type,
        referral_custom_type,
        referral_name,
        referral_first_name,
        referral_last_name,
        referred_by,
        relative_name,
        relative_phone,
        relative_relation,
        revert_details,
        sanctioned_amount,
        remarks,
        current_status,
        submitted_at,
        created_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING *;
    `;

    try {
      const res = await query(sql, [
        patient_id,
        submitted_by_citizen_id,
        finalAppNum,
        suggested_scheme_id,
        suggested_scheme_name,
        assigned_scheme_id,
        assigned_scheme_name,
        priority.toUpperCase(),
        treatment_type.toUpperCase(),
        hospital_name,
        hospital_id,
        medical_cause_note,
        referral_type,
        referral_custom_type,
        referral_name,
        referral_first_name,
        referral_last_name,
        referred_by,
        relative_name,
        relative_phone,
        relative_relation,
        revert_details ? JSON.stringify(revert_details) : null,
        sanctioned_amount,
        remarks,
        current_status.toUpperCase(),
      ]);
      return res.rows[0];
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        const record = {
          id: crypto.randomUUID(),
          patient_id,
          submitted_by_citizen_id,
          application_number: finalAppNum,
          suggested_scheme_id,
          suggested_scheme_name,
          assigned_scheme_id,
          assigned_scheme_name,
          priority: priority.toUpperCase(),
          treatment_type: treatment_type.toUpperCase(),
          hospital_name,
          hospital_id,
          medical_cause_note,
          referral_type,
          referral_custom_type,
          referral_name,
          referral_first_name,
          referral_last_name,
          referred_by,
          relative_name,
          relative_phone,
          relative_relation,
          revert_details,
          sanctioned_amount,
          remarks,
          current_status: current_status.toUpperCase(),
          submitted_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        };
        inMemoryApplications.set(record.id, record);
        return record;
      }
      throw dbErr;
    }
  },

  /**
   * Find application by UUID or application_number with full joined details
   */
  async findById(id) {
    if (!id) return null;
    await ensureApplicationColumns();

    const isUuid = UUID_REGEX.test(id);
    let whereCondition;
    let params;
    if (isUuid) {
      whereCondition = 'a.id = $1';
      params = [id];
    } else {
      const cleanTarget = String(id).trim();
      const withApp = cleanTarget.includes('-APP-') ? cleanTarget : cleanTarget.replace(/^([A-Z]+)-(\d{4})-(\d+)$/i, '$1-$2-APP-$3');
      const withoutApp = cleanTarget.replace(/-APP-/gi, '-').replace(/APP-/gi, '');
      whereCondition = '(LOWER(a.application_number) = LOWER($1) OR LOWER(a.application_number) = LOWER($2) OR LOWER(a.application_number) = LOWER($3) OR a.id::text = $1)';
      params = [cleanTarget, withApp, withoutApp];
    }

    const sql = `
      SELECT 
        a.*,
        COALESCE(p.full_name, u.full_name, 'Patient') AS patient_name,
        COALESCE(p.gender, 'Male') AS patient_gender,
        COALESCE(p.age, CASE WHEN p.date_of_birth IS NOT NULL THEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.date_of_birth))::int ELSE NULL END) AS patient_age,
        p.date_of_birth AS patient_dob,
        COALESCE(p.mobile_number, u.mobile, '—') AS patient_mobile,
        p.aadhaar_number AS patient_aadhaar,
        p.abha_number AS patient_abha,
        p.relationship_with_citizen,
        p.address_line AS patient_address,
        p.address_line AS patient_address_line,
        p.area AS patient_area,
        p.village AS patient_village,
        p.city AS patient_city,
        p.taluka AS patient_taluka,
        p.district AS patient_district,
        p.state AS patient_state,
        p.pincode AS patient_pincode,
        c.user_id AS citizen_user_id,
        u.full_name AS citizen_name,
        u.mobile AS citizen_mobile,
        u.email AS citizen_email,
        c.address_line AS citizen_address,
        c.address_line AS citizen_address_line,
        c.city AS citizen_city,
        c.taluka AS citizen_taluka,
        c.district AS citizen_district,
        c.state AS citizen_state,
        c.pincode AS citizen_pincode,
        h.name AS empanelled_hospital_name,
        h.city AS hospital_city,
        h.district AS hospital_district,
        h.phone AS hospital_phone,
        h.hospital_type,
        s_sugg.name AS suggested_scheme_full_name,
        s_sugg.scheme_code AS suggested_scheme_code,
        s_sugg.maximum_coverage_amount AS suggested_scheme_max_coverage,
        s_asgn.name AS assigned_scheme_full_name,
        s_asgn.scheme_code AS assigned_scheme_code,
        s_asgn.maximum_coverage_amount AS assigned_scheme_max_coverage,
        (
          SELECT json_agg(
            json_build_object(
              'id', ad.id,
              'name', COALESCE(ad.file_name, dt.name, 'Uploaded Document'),
              'file_name', ad.file_name,
              'file_url', ad.file_url,
              'category', ad.category,
              'size', ad.file_size,
              'file_size', ad.file_size,
              'source', ad.source,
              'status', ad.document_status,
              'document_status', ad.document_status,
              'is_sevak_upload', ad.is_sevak_upload,
              'uploaded_by_role', ad.uploaded_by_role,
              'verified', (ad.document_status = 'VERIFIED'),
              'uploaded', (ad.document_status != 'PENDING_SEVAK_UPLOAD' AND ad.file_url IS NOT NULL AND ad.file_url != ''),
              'verification_remark', ad.verification_remark,
              'uploaded_at', ad.uploaded_at,
              'verified_at', ad.verified_at
            ) ORDER BY ad.uploaded_at ASC
          )
          FROM public.application_documents ad
          LEFT JOIN public.document_types dt ON ad.document_type_id = dt.id
          WHERE ad.application_id = a.id OR (a.patient_id IS NOT NULL AND ad.application_id = a.patient_id)
        ) AS documents,
        (
          SELECT json_agg(
            json_build_object(
              'id', ash.id,
              'old_status', ash.old_status,
              'new_status', ash.new_status,
              'remark', ash.remark,
              'created_at', ash.created_at,
              'changed_by_name', u_sh.full_name
            ) ORDER BY ash.created_at ASC
          )
          FROM public.application_status_histories ash
          LEFT JOIN public.users u_sh ON ash.changed_by_user_id = u_sh.id
          WHERE ash.application_id = a.id
        ) AS status_history,
        (
          SELECT json_agg(
            json_build_object(
              'id', ar.id,
              'remark', ar.remark,
              'text', ar.remark,
              'note', ar.remark,
              'remark_type', ar.remark_type,
              'created_at', ar.created_at,
              'date', ar.created_at,
              'by', COALESCE(u_ar.full_name, 'Admin (Rohit Patil)'),
              'author_name', COALESCE(u_ar.full_name, 'Admin (Rohit Patil)')
            ) ORDER BY ar.created_at DESC
          )
          FROM public.application_remarks ar
          LEFT JOIN public.users u_ar ON ar.created_by_user_id = u_ar.id
          WHERE ar.application_id = a.id
        ) AS admin_remarks,
        (
          SELECT json_agg(
            json_build_object(
              'assignment_id', aa.id,
              'hospital_id', aa.hospital_id,
              'hospital_name', COALESCE(h_ass.name, aa.hospital_name),
              'arogya_sevak_id', aa.arogya_sevak_id,
              'sevak_user_id', asev.user_id,
              'sevak_name', COALESCE(u_sev.full_name, aa.sevak_name),
              'sevak_mobile', u_sev.mobile,
              'assignment_status', aa.assignment_status,
              'assignment_remark', aa.assignment_remark,
              'assigned_at', aa.assigned_at,
              'completed_at', aa.completed_at
            ) ORDER BY aa.assigned_at DESC
          )
          FROM public.application_assignments aa
          LEFT JOIN public.hospitals h_ass ON aa.hospital_id = h_ass.id
          LEFT JOIN public.arogya_sevaks asev ON aa.arogya_sevak_id = asev.id
          LEFT JOIN public.users u_sev ON asev.user_id = u_sev.id
          WHERE aa.application_id = a.id
        ) AS all_assignments,
        (
          SELECT json_agg(
            json_build_object(
              'id', ce.id,
              'raised_by_arogya_sevak_id', ce.raised_by_arogya_sevak_id,
              'escalated_to_admin_id', ce.escalated_to_admin_id,
              'escalation_reason', ce.escalation_reason,
              'description', ce.description,
              'status', ce.status,
              'resolution', ce.resolution,
              'escalated_at', ce.escalated_at,
              'resolved_at', ce.resolved_at
            ) ORDER BY ce.escalated_at DESC
          )
          FROM public.case_escalations ce
          WHERE ce.application_id = a.id
        ) AS escalations,
        (
          SELECT json_build_object(
            'assignment_id', aa.id,
            'hospital_id', aa.hospital_id,
            'hospital_name', COALESCE(h_ass.name, aa.hospital_name, a.hospital_name),
            'hospital_address', h_ass.address_line,
            'hospital_city', h_ass.city,
            'hospital_district', h_ass.district,
            'hospital_phone', h_ass.phone,
            'arogya_sevak_id', aa.arogya_sevak_id,
            'sevak_name', COALESCE(u_sev.full_name, aa.sevak_name, 'ArogyaSevak Coordinator'),
            'sevak_mobile', COALESCE(u_sev.mobile, asev.phone),
            'sevak_phone', COALESCE(u_sev.mobile, asev.phone),
            'admission_date', aa.admission_date,
            'visit_date', aa.admission_date,
            'assignment_status', aa.assignment_status,
            'assignment_remark', aa.assignment_remark,
            'assigned_at', aa.assigned_at
          )
          FROM public.application_assignments aa
          LEFT JOIN public.hospitals h_ass ON aa.hospital_id = h_ass.id
          LEFT JOIN public.arogya_sevaks asev ON aa.arogya_sevak_id = asev.id
          LEFT JOIN public.users u_sev ON asev.user_id = u_sev.id
          WHERE aa.application_id = a.id AND aa.assignment_status = 'ASSIGNED'
          ORDER BY aa.assigned_at DESC
          LIMIT 1
        ) AS active_assignment
      FROM public.applications a
      LEFT JOIN public.patients p ON a.patient_id = p.id
      LEFT JOIN public.citizens c ON a.submitted_by_citizen_id = c.id
      LEFT JOIN public.users u ON c.user_id = u.id
      LEFT JOIN public.hospitals h ON a.hospital_id = h.id
      LEFT JOIN public.schemes s_sugg ON LOWER(s_sugg.scheme_code) = LOWER(a.suggested_scheme_id) OR s_sugg.id::text = a.suggested_scheme_id
      LEFT JOIN public.schemes s_asgn ON a.assigned_scheme_id = s_asgn.id
      WHERE ${whereCondition}
      LIMIT 1;
    `;

    try {
      const res = await query(sql, params);
      return res.rows[0] || null;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        for (const app of inMemoryApplications.values()) {
          if (app.id === id || app.application_number?.toLowerCase() === id.toLowerCase()) {
            return app;
          }
        }
        return null;
      }
      throw dbErr;
    }
  },

  /**
   * Find application by application number (e.g. 'AA-2026-00001')
   */
  async findByApplicationNumber(applicationNumber) {
    return this.findById(applicationNumber);
  },

  /**
   * Batch find applications by array of UUIDs or application_numbers in a single query
   */
  async findManyByIds(ids) {
    if (!Array.isArray(ids) || ids.length === 0) return [];
    await ensureApplicationColumns();

    const cleanIds = Array.from(new Set(ids.filter(Boolean)));
    if (cleanIds.length === 0) return [];

    const uuids = [];
    const appNumbers = [];

    for (const id of cleanIds) {
      if (UUID_REGEX.test(id)) {
        uuids.push(id);
      } else {
        appNumbers.push(String(id).toLowerCase());
      }
    }

    const conditions = [];
    const params = [];

    if (uuids.length > 0) {
      params.push(uuids);
      conditions.push(`a.id = ANY($${params.length}::uuid[])`);
    }

    if (appNumbers.length > 0) {
      params.push(appNumbers);
      conditions.push(`LOWER(a.application_number) = ANY($${params.length}::text[])`);
    }

    if (conditions.length === 0) return [];

    const whereClause = conditions.join(' OR ');

    const sql = `
      SELECT 
        a.*,
        p.full_name AS patient_name,
        p.gender AS patient_gender,
        COALESCE(p.age, CASE WHEN p.date_of_birth IS NOT NULL THEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.date_of_birth))::int ELSE NULL END) AS patient_age,
        p.date_of_birth AS patient_dob,
        p.mobile_number AS patient_mobile,
        p.aadhaar_number AS patient_aadhaar,
        p.abha_number AS patient_abha,
        p.relationship_with_citizen,
        p.address_line AS patient_address,
        p.address_line AS patient_address_line,
        p.area AS patient_area,
        p.village AS patient_village,
        p.city AS patient_city,
        p.taluka AS patient_taluka,
        p.district AS patient_district,
        p.state AS patient_state,
        p.pincode AS patient_pincode,
        c.user_id AS citizen_user_id,
        u.full_name AS citizen_name,
        u.mobile AS citizen_mobile,
        u.email AS citizen_email,
        c.address_line AS citizen_address,
        c.address_line AS citizen_address_line,
        c.city AS citizen_city,
        c.taluka AS citizen_taluka,
        c.district AS citizen_district,
        c.state AS citizen_state,
        c.pincode AS citizen_pincode,
        h.name AS empanelled_hospital_name,
        h.city AS hospital_city,
        h.district AS hospital_district,
        h.phone AS hospital_phone,
        h.hospital_type,
        s_sugg.name AS suggested_scheme_full_name,
        s_sugg.scheme_code AS suggested_scheme_code,
        s_sugg.maximum_coverage_amount AS suggested_scheme_max_coverage,
        s_asgn.name AS assigned_scheme_full_name,
        s_asgn.scheme_code AS assigned_scheme_code,
        s_asgn.maximum_coverage_amount AS assigned_scheme_max_coverage,
        (
          SELECT json_agg(
            json_build_object(
              'id', ad.id,
              'name', COALESCE(ad.file_name, dt.name, 'Uploaded Document'),
              'file_name', ad.file_name,
              'file_url', ad.file_url,
              'category', ad.category,
              'size', ad.file_size,
              'file_size', ad.file_size,
              'source', ad.source,
              'status', ad.document_status,
              'document_status', ad.document_status,
              'is_sevak_upload', ad.is_sevak_upload,
              'uploaded_by_role', ad.uploaded_by_role,
              'verified', (ad.document_status = 'VERIFIED'),
              'uploaded', (ad.document_status != 'PENDING_SEVAK_UPLOAD' AND ad.file_url IS NOT NULL AND ad.file_url != ''),
              'verification_remark', ad.verification_remark,
              'uploaded_at', ad.uploaded_at,
              'verified_at', ad.verified_at
            ) ORDER BY ad.uploaded_at ASC
          )
          FROM public.application_documents ad
          LEFT JOIN public.document_types dt ON ad.document_type_id = dt.id
          WHERE ad.application_id = a.id OR (a.patient_id IS NOT NULL AND ad.application_id = a.patient_id)
        ) AS documents,
        (
          SELECT json_agg(
            json_build_object(
              'id', ash.id,
              'old_status', ash.old_status,
              'new_status', ash.new_status,
              'changed_by_user_id', ash.changed_by_user_id,
              'remark', ash.remark,
              'created_at', ash.created_at
            ) ORDER BY ash.created_at DESC
          )
          FROM public.application_status_histories ash
          WHERE ash.application_id = a.id
        ) AS status_history,
        (
          SELECT json_agg(
            json_build_object(
              'id', ar.id,
              'remark', ar.remark,
              'text', ar.remark,
              'note', ar.remark,
              'remark_type', ar.remark_type,
              'created_by_user_id', ar.created_by_user_id,
              'created_at', ar.created_at
            ) ORDER BY ar.created_at DESC
          )
          FROM public.application_remarks ar
          WHERE ar.application_id = a.id
        ) AS admin_remarks,
        (
          SELECT json_agg(
            json_build_object(
              'assignment_id', aa.id,
              'hospital_id', aa.hospital_id,
              'hospital_name', COALESCE(h_ass.name, aa.hospital_name),
              'arogya_sevak_id', aa.arogya_sevak_id,
              'sevak_user_id', asev.user_id,
              'sevak_name', COALESCE(u_sev.full_name, aa.sevak_name),
              'sevak_mobile', u_sev.mobile,
              'assignment_status', aa.assignment_status,
              'assignment_remark', aa.assignment_remark,
              'assigned_at', aa.assigned_at,
              'completed_at', aa.completed_at
            ) ORDER BY aa.assigned_at DESC
          )
          FROM public.application_assignments aa
          LEFT JOIN public.hospitals h_ass ON aa.hospital_id = h_ass.id
          LEFT JOIN public.arogya_sevaks asev ON aa.arogya_sevak_id = asev.id
          LEFT JOIN public.users u_sev ON asev.user_id = u_sev.id
          WHERE aa.application_id = a.id
        ) AS all_assignments,
        (
          SELECT json_agg(
            json_build_object(
              'id', ce.id,
              'raised_by_arogya_sevak_id', ce.raised_by_arogya_sevak_id,
              'escalated_to_admin_id', ce.escalated_to_admin_id,
              'escalation_reason', ce.escalation_reason,
              'description', ce.description,
              'status', ce.status,
              'resolution', ce.resolution,
              'escalated_at', ce.escalated_at,
              'resolved_at', ce.resolved_at
            ) ORDER BY ce.escalated_at DESC
          )
          FROM public.case_escalations ce
          WHERE ce.application_id = a.id
        ) AS escalations,
        (
          SELECT json_build_object(
            'assignment_id', aa.id,
            'hospital_id', aa.hospital_id,
            'hospital_name', COALESCE(h_ass.name, aa.hospital_name, a.hospital_name),
            'hospital_address', h_ass.address_line,
            'hospital_city', h_ass.city,
            'hospital_district', h_ass.district,
            'hospital_phone', h_ass.phone,
            'arogya_sevak_id', aa.arogya_sevak_id,
            'sevak_name', COALESCE(u_sev.full_name, aa.sevak_name, 'ArogyaSevak Coordinator'),
            'sevak_mobile', COALESCE(u_sev.mobile, asev.phone),
            'sevak_phone', COALESCE(u_sev.mobile, asev.phone),
            'admission_date', aa.admission_date,
            'visit_date', aa.admission_date,
            'assignment_status', aa.assignment_status,
            'assignment_remark', aa.assignment_remark,
            'assigned_at', aa.assigned_at
          )
          FROM public.application_assignments aa
          LEFT JOIN public.hospitals h_ass ON aa.hospital_id = h_ass.id
          LEFT JOIN public.arogya_sevaks asev ON aa.arogya_sevak_id = asev.id
          LEFT JOIN public.users u_sev ON asev.user_id = u_sev.id
          WHERE aa.application_id = a.id AND aa.assignment_status = 'ASSIGNED'
          ORDER BY aa.assigned_at DESC
          LIMIT 1
        ) AS active_assignment
      FROM public.applications a
      LEFT JOIN public.patients p ON a.patient_id = p.id
      LEFT JOIN public.citizens c ON a.submitted_by_citizen_id = c.id
      LEFT JOIN public.users u ON c.user_id = u.id
      LEFT JOIN public.hospitals h ON a.hospital_id = h.id
      LEFT JOIN public.schemes s_sugg ON LOWER(s_sugg.scheme_code) = LOWER(a.suggested_scheme_id) OR s_sugg.id::text = a.suggested_scheme_id
      LEFT JOIN public.schemes s_asgn ON a.assigned_scheme_id = s_asgn.id
      WHERE (${whereClause})
      ORDER BY a.created_at DESC;
    `;

    try {
      const res = await query(sql, params);
      return res.rows || [];
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        const results = [];
        for (const id of cleanIds) {
          for (const app of inMemoryApplications.values()) {
            if (app.id === id || app.application_number?.toLowerCase() === String(id).toLowerCase()) {
              results.push(app);
            }
          }
        }
        return results;
      }
      throw dbErr;
    }
  },

  /**
   * Find applications submitted by a citizen user or citizen profile UUID
   */
  async findByCitizenId(citizenId, { limit = 50, offset = 0 } = {}) {
    await ensureApplicationColumns();

    const sql = `
      SELECT 
        a.*,
        p.full_name AS patient_name,
        COALESCE(p.age, CASE WHEN p.date_of_birth IS NOT NULL THEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.date_of_birth))::int ELSE NULL END) AS patient_age,
        p.gender AS patient_gender,
        p.relationship_with_citizen,
        s_asgn.name AS assigned_scheme_name,
        s_asgn.scheme_code AS assigned_scheme_code,
        (
          SELECT COUNT(*)::int 
          FROM public.application_documents ad 
          WHERE ad.application_id = a.id
        ) AS documents_count,
        (
          SELECT json_build_object(
            'assignment_id', aa.id,
            'hospital_id', aa.hospital_id,
            'hospital_name', COALESCE(h_ass.name, a.hospital_name),
            'hospital_address', h_ass.address_line,
            'hospital_city', h_ass.city,
            'hospital_district', h_ass.district,
            'hospital_phone', h_ass.phone,
            'arogya_sevak_id', aa.arogya_sevak_id,
            'sevak_name', COALESCE(u_sev.full_name, 'ArogyaSevak Coordinator'),
            'sevak_mobile', u_sev.mobile,
            'sevak_phone', u_sev.mobile,
            'admission_date', aa.admission_date,
            'visit_date', aa.admission_date,
            'assignment_status', aa.assignment_status,
            'assignment_remark', aa.assignment_remark,
            'assigned_at', aa.assigned_at,
            'role', 'Arogya Mitra Coordinator'
          )
          FROM public.application_assignments aa
          LEFT JOIN public.hospitals h_ass ON aa.hospital_id = h_ass.id
          LEFT JOIN public.arogya_sevaks asev ON aa.arogya_sevak_id = asev.id
          LEFT JOIN public.users u_sev ON asev.user_id = u_sev.id
          WHERE aa.application_id = a.id
          ORDER BY aa.assigned_at DESC
          LIMIT 1
        ) AS active_assignment,
        (
          SELECT json_build_object(
            'sevak_name', u_sev.full_name,
            'sevak_phone', u_sev.mobile,
            'role', 'Arogya Mitra Coordinator'
          )
          FROM public.application_assignments aa
          LEFT JOIN public.arogya_sevaks asev ON aa.arogya_sevak_id = asev.id
          LEFT JOIN public.users u_sev ON asev.user_id = u_sev.id
          WHERE aa.application_id = a.id
          ORDER BY aa.assigned_at DESC
          LIMIT 1
        ) AS assigned_sevak
      FROM public.applications a
      LEFT JOIN public.patients p ON a.patient_id = p.id
      LEFT JOIN public.schemes s_asgn ON a.assigned_scheme_id = s_asgn.id
      WHERE a.submitted_by_citizen_id = $1
      ORDER BY a.submitted_at DESC
      LIMIT $2 OFFSET $3;
    `;

    try {
      const res = await query(sql, [citizenId, limit, offset]);
      return res.rows;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        return Array.from(inMemoryApplications.values())
          .filter((a) => a.submitted_by_citizen_id === citizenId)
          .slice(offset, offset + limit);
      }
      throw dbErr;
    }
  },

  /**
   * Find all applications with rich filters and pagination for Admin portal
   */
  async findAll({
    status,
    scheme_id,
    priority,
    search,
    limit = 50,
    offset = 0,
  } = {}) {
    await ensureApplicationColumns();

    const conditions = [];
    const values = [];
    let idx = 1;

    if (status && status !== 'All') {
      conditions.push(`a.current_status = $${idx}`);
      values.push(status.toUpperCase());
      idx++;
    }

    if (scheme_id && scheme_id !== 'All') {
      conditions.push(`(a.assigned_scheme_id::text = $${idx} OR a.suggested_scheme_id ILIKE $${idx} OR a.assigned_scheme_name ILIKE $${idx} OR a.suggested_scheme_name ILIKE $${idx})`);
      values.push(`%${scheme_id}%`);
      idx++;
    }

    if (priority && priority !== 'All') {
      conditions.push(`a.priority = $${idx}`);
      values.push(priority.toUpperCase());
      idx++;
    }

    if (search) {
      conditions.push(`(
        a.application_number ILIKE $${idx} 
        OR p.full_name ILIKE $${idx} 
        OR u.full_name ILIKE $${idx} 
        OR u.mobile ILIKE $${idx}
        OR p.mobile_number ILIKE $${idx}
        OR a.hospital_name ILIKE $${idx}
        OR a.referred_by ILIKE $${idx}
      )`);
      values.push(`%${search.trim()}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM public.applications a
      LEFT JOIN public.patients p ON a.patient_id = p.id
      LEFT JOIN public.citizens c ON a.submitted_by_citizen_id = c.id
      LEFT JOIN public.users u ON c.user_id = u.id
      ${whereClause};
    `;

    const dataSql = `
      SELECT 
        a.*,
        p.full_name AS patient_name,
        COALESCE(p.age, CASE WHEN p.date_of_birth IS NOT NULL THEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.date_of_birth))::int ELSE NULL END) AS patient_age,
        p.gender AS patient_gender,
        p.relationship_with_citizen,
        u.full_name AS citizen_name,
        u.mobile AS citizen_mobile,
        s_asgn.name AS assigned_scheme_name,
        s_asgn.scheme_code AS assigned_scheme_code,
        (
          SELECT json_agg(
            json_build_object(
              'id', ad.id,
              'name', COALESCE(ad.file_name, dt.name, 'Uploaded Document'),
              'file_name', ad.file_name,
              'file_url', ad.file_url,
              'category', ad.category,
              'size', ad.file_size,
              'file_size', ad.file_size,
              'source', ad.source,
              'status', ad.document_status,
              'document_status', ad.document_status,
              'is_sevak_upload', ad.is_sevak_upload,
              'uploaded_by_role', ad.uploaded_by_role,
              'verified', (ad.document_status = 'VERIFIED'),
              'uploaded', (ad.document_status != 'PENDING_SEVAK_UPLOAD' AND ad.file_url IS NOT NULL AND ad.file_url != ''),
              'verification_remark', ad.verification_remark,
              'uploaded_at', ad.uploaded_at,
              'verified_at', ad.verified_at
            ) ORDER BY ad.uploaded_at ASC
          )
          FROM public.application_documents ad
          LEFT JOIN public.document_types dt ON ad.document_type_id = dt.id
          WHERE ad.application_id = a.id
        ) AS documents,
        (
          SELECT COUNT(*)::int 
          FROM public.application_documents ad 
          WHERE ad.application_id = a.id
        ) AS documents_count,
        (
          SELECT json_build_object(
            'assignment_id', aa.id,
            'hospital_id', aa.hospital_id,
            'hospital_name', COALESCE(h_ass.name, a.hospital_name),
            'arogya_sevak_id', aa.arogya_sevak_id,
            'sevak_name', COALESCE(u_sev.full_name, 'ArogyaSevak Coordinator'),
            'sevak_mobile', u_sev.mobile,
            'assignment_status', aa.assignment_status,
            'assignment_remark', aa.assignment_remark,
            'assigned_at', aa.assigned_at
          )
          FROM public.application_assignments aa
          LEFT JOIN public.hospitals h_ass ON aa.hospital_id = h_ass.id
          LEFT JOIN public.arogya_sevaks asev ON aa.arogya_sevak_id = asev.id
          LEFT JOIN public.users u_sev ON asev.user_id = u_sev.id
          WHERE aa.application_id = a.id
          ORDER BY aa.assigned_at DESC
          LIMIT 1
        ) AS active_assignment,
        (
          SELECT json_build_object(
            'sevak_name', u_sev.full_name,
            'sevak_phone', u_sev.mobile
          )
          FROM public.application_assignments aa
          LEFT JOIN public.arogya_sevaks asev ON aa.arogya_sevak_id = asev.id
          LEFT JOIN public.users u_sev ON asev.user_id = u_sev.id
          WHERE aa.application_id = a.id
          ORDER BY aa.assigned_at DESC
          LIMIT 1
        ) AS assigned_sevak
      FROM public.applications a
      LEFT JOIN public.patients p ON a.patient_id = p.id
      LEFT JOIN public.citizens c ON a.submitted_by_citizen_id = c.id
      LEFT JOIN public.users u ON c.user_id = u.id
      LEFT JOIN public.schemes s_asgn ON a.assigned_scheme_id = s_asgn.id
      ${whereClause}
      ORDER BY a.submitted_at DESC
      LIMIT $${idx} OFFSET $${idx + 1};
    `;

    try {
      const countRes = await query(countSql, values);
      const total = countRes.rows[0]?.total || 0;

      const dataValues = [...values, limit, offset];
      const dataRes = await query(dataSql, dataValues);

      return {
        applications: dataRes.rows,
        total,
      };
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        let results = Array.from(inMemoryApplications.values());
        if (status && status !== 'All') {
          results = results.filter((a) => a.current_status === status.toUpperCase());
        }
        return {
          applications: results.slice(offset, offset + limit),
          total: results.length,
        };
      }
      throw dbErr;
    }
  },

  /**
   * Summary queue statistics for Admin Dashboard / Queue tabs
   */
  async getStatistics() {
    await ensureApplicationColumns();

    const sql = `
      SELECT 
        COUNT(*)::int AS total_applications,
        COUNT(CASE WHEN current_status = 'SUBMITTED' THEN 1 END)::int AS submitted_count,
        COUNT(CASE WHEN current_status = 'UNDER_REVIEW' OR current_status = 'IN_REVIEW' THEN 1 END)::int AS in_review_count,
        COUNT(CASE WHEN current_status = 'DOCS_REQUIRED' OR current_status = 'REVERTED' OR current_status = 'ON_HOLD' THEN 1 END)::int AS revert_docs_required_count,
        COUNT(CASE WHEN current_status = 'APPROVED' OR current_status = 'COORDINATED' OR current_status = 'TREATMENT_STARTED' THEN 1 END)::int AS approved_count,
        COUNT(CASE WHEN current_status = 'REJECTED' THEN 1 END)::int AS rejected_count,
        COUNT(CASE WHEN current_status = 'CLOSED' THEN 1 END)::int AS closed_count,
        COUNT(CASE WHEN priority = 'EMERGENCY' OR priority = 'CRITICAL' THEN 1 END)::int AS emergency_count,
        COUNT(CASE WHEN priority = 'EMERGENCY' OR priority = 'CRITICAL' THEN 1 END)::int AS critical_count,
        COUNT(CASE WHEN priority = 'REGULAR' OR priority = 'NORMAL' OR priority = 'HIGH' OR priority = 'MEDIUM' OR priority = 'LOW' THEN 1 END)::int AS regular_count,
        COUNT(CASE WHEN priority = 'HIGH' THEN 1 END)::int AS high_count
      FROM public.applications;
    `;

    try {
      const res = await query(sql);
      return res.rows[0] || {};
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        const all = Array.from(inMemoryApplications.values());
        return {
          total_applications: all.length,
          submitted_count: all.filter((a) => a.current_status === 'SUBMITTED').length,
          in_review_count: all.filter((a) => a.current_status === 'UNDER_REVIEW').length,
          revert_docs_required_count: all.filter((a) => a.current_status === 'REVERTED').length,
          approved_count: all.filter((a) => a.current_status === 'APPROVED').length,
          rejected_count: all.filter((a) => a.current_status === 'REJECTED').length,
          closed_count: all.filter((a) => a.current_status === 'CLOSED').length,
          emergency_count: all.filter((a) => a.priority === 'EMERGENCY' || a.priority === 'CRITICAL').length,
          regular_count: all.filter((a) => a.priority === 'REGULAR' || a.priority === 'NORMAL' || a.priority === 'HIGH' || a.priority === 'MEDIUM' || a.priority === 'LOW').length,
          critical_count: all.filter((a) => a.priority === 'EMERGENCY' || a.priority === 'CRITICAL').length,
          high_count: all.filter((a) => a.priority === 'HIGH').length,
        };
      }
      throw dbErr;
    }
  },

  /**
   * Update application status, timestamps, and optional formal scheme/hospital assignment
   */
  async updateStatus(id, newStatus, {
    assigned_scheme_id = null,
    assigned_scheme_name = null,
    hospital_id = null,
    hospital_name = null,
    sanctioned_amount = null,
    revert_details = null,
    remarks = null,
  } = {}) {
    await ensureApplicationColumns();

    const normalizedStatus = newStatus.toUpperCase();
    const isApproved = normalizedStatus === 'APPROVED' || normalizedStatus === 'COORDINATED' || normalizedStatus === 'TREATMENT_STARTED';
    const isClosed = normalizedStatus === 'CLOSED' || normalizedStatus === 'REJECTED';

    const updates = ['current_status = $1', 'updated_at = CURRENT_TIMESTAMP'];
    const values = [normalizedStatus];
    let idx = 2;

    if (isApproved) {
      updates.push(`completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP)`);
      updates.push(`reviewed_at = COALESCE(reviewed_at, CURRENT_TIMESTAMP)`);
    } else {
      updates.push(`reviewed_at = CURRENT_TIMESTAMP`);
    }

    if (isClosed) {
      updates.push(`closed_at = CURRENT_TIMESTAMP`);
    }

    if (assigned_scheme_id !== undefined && assigned_scheme_id !== null) {
      updates.push(`assigned_scheme_id = $${idx}`);
      values.push(assigned_scheme_id);
      idx++;
    }

    if (assigned_scheme_name !== undefined && assigned_scheme_name !== null) {
      updates.push(`assigned_scheme_name = $${idx}`);
      values.push(assigned_scheme_name);
      idx++;
    }

    if (hospital_id !== undefined && hospital_id !== null) {
      updates.push(`hospital_id = $${idx}`);
      values.push(hospital_id);
      idx++;
    }

    if (hospital_name !== undefined && hospital_name !== null) {
      updates.push(`hospital_name = $${idx}`);
      values.push(hospital_name);
      idx++;
    }

    if (sanctioned_amount !== undefined && sanctioned_amount !== null) {
      updates.push(`sanctioned_amount = $${idx}`);
      values.push(Number(sanctioned_amount));
      idx++;
    }

    if (revert_details !== undefined) {
      updates.push(`revert_details = $${idx}`);
      values.push(revert_details ? JSON.stringify(revert_details) : null);
      idx++;
    }

    if (remarks !== undefined && remarks !== null) {
      updates.push(`remarks = $${idx}`);
      values.push(remarks);
      idx++;
    }

    const isUuid = UUID_REGEX.test(id);
    let whereCond;
    if (isUuid) {
      whereCond = `id = $${idx}`;
      values.push(id);
    } else {
      const cleanTarget = String(id).trim();
      const withApp = cleanTarget.includes('-APP-') ? cleanTarget : cleanTarget.replace(/^([A-Z]+)-(\d{4})-(\d+)$/i, '$1-$2-APP-$3');
      const withoutApp = cleanTarget.replace(/-APP-/gi, '-').replace(/APP-/gi, '');
      whereCond = `(LOWER(application_number) = LOWER($${idx}) OR LOWER(application_number) = LOWER($${idx + 1}) OR LOWER(application_number) = LOWER($${idx + 2}) OR id::text = $${idx})`;
      values.push(cleanTarget, withApp, withoutApp);
    }

    const sql = `
      UPDATE public.applications
      SET ${updates.join(', ')}
      WHERE ${whereCond}
      RETURNING *;
    `;

    try {
      const res = await query(sql, values);
      return res.rows[0] || null;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        for (const a of inMemoryApplications.values()) {
          if (a.id === id || a.application_number?.toLowerCase() === id.toLowerCase()) {
            a.current_status = normalizedStatus;
            if (assigned_scheme_id) a.assigned_scheme_id = assigned_scheme_id;
            if (assigned_scheme_name) a.assigned_scheme_name = assigned_scheme_name;
            if (hospital_id) a.hospital_id = hospital_id;
            if (hospital_name) a.hospital_name = hospital_name;
            if (sanctioned_amount) a.sanctioned_amount = Number(sanctioned_amount);
            if (revert_details) a.revert_details = revert_details;
            a.updated_at = new Date();
            return a;
          }
        }
        return null;
      }
      throw dbErr;
    }
  },

  /**
   * Update or release admin reviewer for a case
   */
  async updateReviewer(id, { reviewed_by_admin_id = null, reviewed_by_admin_name = null, claimed_at = null } = {}) {
    await ensureApplicationColumns();
    const isUuid = UUID_REGEX.test(id);
    const sql = `
      UPDATE public.applications
      SET 
        reviewed_by_admin_id = $1,
        reviewed_by_admin_name = $2,
        claimed_at = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE ${isUuid ? 'id = $4' : 'LOWER(application_number) = LOWER($4)'}
      RETURNING *;
    `;
    try {
      const res = await query(sql, [reviewed_by_admin_id, reviewed_by_admin_name, claimed_at, id]);
      return res.rows[0] || null;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        for (const a of inMemoryApplications.values()) {
          if (a.id === id || a.application_number?.toLowerCase() === id.toLowerCase()) {
            a.reviewed_by_admin_id = reviewed_by_admin_id;
            a.reviewed_by_admin_name = reviewed_by_admin_name;
            a.claimed_at = claimed_at;
            a.updated_at = new Date();
            return a;
          }
        }
        return null;
      }
      throw dbErr;
    }
  },

  /**
   * Formally assign or change scheme for an application (Admin action)
   */
  async assignScheme(id, { scheme_id, scheme_name, sanctioned_amount = null }) {
    await ensureApplicationColumns();

    const sql = `
      UPDATE public.applications
      SET 
        assigned_scheme_id = $1,
        assigned_scheme_name = $2,
        sanctioned_amount = COALESCE($3, sanctioned_amount),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 OR LOWER(application_number) = LOWER($4)
      RETURNING *;
    `;

    const res = await query(sql, [scheme_id, scheme_name, sanctioned_amount, id]);
    return res.rows[0] || null;
  },

  /**
   * Record that citizen sent an SLA reminder (updates last_reminder_sent_at and increments reminder_count)
   */
  async recordReminder(id) {
    await ensureApplicationColumns();
    const isUuid = UUID_REGEX.test(id);
    const whereCond = isUuid ? 'id = $1' : 'LOWER(application_number) = LOWER($1)';

    const sql = `
      UPDATE public.applications
      SET 
        last_reminder_sent_at = CURRENT_TIMESTAMP,
        reminder_count = COALESCE(reminder_count, 0) + 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE ${whereCond}
      RETURNING *;
    `;

    try {
      const res = await query(sql, [id]);
      return res.rows[0] || null;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        for (const a of inMemoryApplications.values()) {
          if (a.id === id || a.application_number?.toLowerCase() === id.toLowerCase()) {
            a.last_reminder_sent_at = new Date();
            a.reminder_count = (a.reminder_count || 0) + 1;
            a.updated_at = new Date();
            return a;
          }
        }
        return null;
      }
      throw dbErr;
    }
  },

  /**
   * Record citizen request to reopen a rejected case (Admin review pending)
   */
  async requestReopen(id, reason) {
    await ensureApplicationColumns();
    const isUuid = UUID_REGEX.test(id);
    const whereCond = isUuid ? 'id = $1' : 'LOWER(application_number) = LOWER($1)';

    const sql = `
      UPDATE public.applications
      SET 
        reopen_requested = TRUE,
        reopen_requested_at = CURRENT_TIMESTAMP,
        reopen_request_reason = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE ${whereCond}
      RETURNING *;
    `;

    try {
      const res = await query(sql, [id, reason]);
      return res.rows[0] || null;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        for (const a of inMemoryApplications.values()) {
          if (a.id === id || a.application_number?.toLowerCase() === id.toLowerCase()) {
            a.reopen_requested = true;
            a.reopen_requested_at = new Date();
            a.reopen_request_reason = reason;
            a.updated_at = new Date();
            return a;
          }
        }
        return null;
      }
      throw dbErr;
    }
  },

  /**
   * Admin reopens a rejected application and restores it to review queue (UNDER_REVIEW)
   */
  async reopenRejectedApplication(id, remarks) {
    await ensureApplicationColumns();
    const isUuid = UUID_REGEX.test(id);
    const whereCond = isUuid ? 'id = $1' : 'LOWER(application_number) = LOWER($1)';

    const sql = `
      UPDATE public.applications
      SET 
        current_status = 'UNDER_REVIEW',
        reopen_requested = FALSE,
        reopen_request_reason = NULL,
        closed_at = NULL,
        remarks = $2,
        reviewed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE ${whereCond}
      RETURNING *;
    `;

    try {
      const res = await query(sql, [id, remarks]);
      return res.rows[0] || null;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        for (const a of inMemoryApplications.values()) {
          if (a.id === id || a.application_number?.toLowerCase() === id.toLowerCase()) {
            a.current_status = 'UNDER_REVIEW';
            a.reopen_requested = false;
            a.reopen_request_reason = null;
            a.closed_at = null;
            a.remarks = remarks;
            a.reviewed_at = new Date();
            a.updated_at = new Date();
            return a;
          }
        }
        return null;
      }
      throw dbErr;
    }
  },

  /**
   * Update clinical treatment progress & Arogya Sevak live ward status
   */
  async updateTreatmentProgress(id, { stage, note, caseProgress, status, sevakName = 'ArogyaSevak', actorId = null }) {
    await ensureApplicationColumns();
    const isUuid = UUID_REGEX.test(id);
    const whereCond = isUuid ? 'id = $1' : 'LOWER(application_number) = LOWER($1)';

    // Build updateHistory and clinicalNotes entry
    const nowISO = new Date().toISOString();
    const historyItem = note ? {
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      update: note,
      type: `${stage || 'Treatment'} Update`,
      by: sevakName,
      timestamp: nowISO
    } : null;

    // Ensure workflow status is preserved as 'APPROVED' (or 'CLOSED'/'COMPLETED' only if completed)
    // and not overwritten with clinical stage strings like 'Post-Op Recovery'
    const validWorkflowStatuses = ['APPROVED', 'CLOSED', 'COMPLETED', 'DISCHARGED', 'TREATMENT_STARTED', 'REJECTED'];
    const newWorkflowStatus = status && validWorkflowStatuses.includes(String(status).toUpperCase().replace(/\s+/g, '_'))
      ? (String(status).toUpperCase() === 'DISCHARGED' || String(status).toUpperCase() === 'COMPLETED' ? 'CLOSED' : 'APPROVED')
      : null;

    const sql = `
      UPDATE public.applications
      SET 
        treatment_stage = COALESCE($2, treatment_stage),
        sevak_reported_status = COALESCE($2, sevak_reported_status),
        case_progress = COALESCE($3::jsonb, case_progress),
        latest_ward_update = COALESCE($4, latest_ward_update),
        sevak_last_updated_at = CURRENT_TIMESTAMP,
        current_status = COALESCE($5, current_status),
        update_history = CASE 
          WHEN $6::jsonb IS NOT NULL THEN 
            COALESCE(update_history, '[]'::jsonb) || $6::jsonb 
          ELSE update_history 
        END,
        clinical_notes = CASE 
          WHEN $6::jsonb IS NOT NULL THEN 
            COALESCE(clinical_notes, '[]'::jsonb) || $6::jsonb 
          ELSE clinical_notes 
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE ${whereCond}
      RETURNING *;
    `;

    const CLINICAL_STAGES_LIST = [
      'Admitted',
      'Diagnostic Stage',
      'Under Treatment',
      'Surgery Scheduled',
      'Post-Op Recovery',
      'On Hold',
      'Discharged',
      'Completed',
    ];

    let computedProgress = (Array.isArray(caseProgress) && caseProgress.length === 8) ? caseProgress : null;
    if (!computedProgress && stage) {
      const todayDateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      const targetIdx = CLINICAL_STAGES_LIST.findIndex(s => s.toLowerCase() === String(stage).toLowerCase());
      const activeIdx = targetIdx >= 0 ? targetIdx : 0;
      computedProgress = CLINICAL_STAGES_LIST.map((label, idx) => {
        if (idx < activeIdx) {
          return {
            label,
            state: 'completed',
            date: todayDateStr,
            note: idx === 0 ? 'Admitted & vitals recorded' : '',
          };
        } else if (idx === activeIdx) {
          const isFinal = label === 'Discharged' || label === 'Completed';
          const isHold = label === 'On Hold';
          return {
            label,
            state: isFinal ? 'completed' : (isHold ? 'hold' : 'active'),
            date: todayDateStr,
            note: note || `Current Status: ${label}`,
          };
        } else {
          return {
            label,
            state: 'pending',
            date: '',
            note: '',
          };
        }
      });
    }

    try {
      const historyJson = historyItem ? JSON.stringify([historyItem]) : null;
      const progressJson = computedProgress ? JSON.stringify(computedProgress) : (caseProgress ? JSON.stringify(caseProgress) : null);
      const res = await query(sql, [id, stage, progressJson, note, newWorkflowStatus, historyJson]);

      const updatedRow = res.rows[0];
      if (updatedRow) {
        // Insert audit event into application_timeline
        try {
          await query(`
            INSERT INTO public.application_timeline (
              application_id, status, remark, actor_id, actor_type, event_type, title, description, new_status, metadata
            ) VALUES (
              $1, $2, $3, $4, 'SEVAK', 'TREATMENT_STAGE_UPDATED', $5, $6, $7, $8
            )
          `, [
            updatedRow.id,
            updatedRow.current_status || stage || 'UNDER_TREATMENT',
            note || `Stage updated to ${stage}`,
            actorId,
            `Treatment Stage: ${stage}`,
            note || `Stage updated to ${stage}`,
            updatedRow.current_status,
            JSON.stringify({ stage, sevakName, note })
          ]);
        } catch (timelineErr) {
          console.warn('[ApplicationModel] Timeline logging notice:', timelineErr.message);
        }
      }

      return updatedRow || null;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        for (const a of inMemoryApplications.values()) {
          if (a.id === id || a.application_number?.toLowerCase() === id.toLowerCase()) {
            if (stage) {
              a.treatment_stage = stage;
              a.sevak_reported_status = stage;
            }
            if (caseProgress) a.case_progress = caseProgress;
            if (note) a.latest_ward_update = note;
            if (status) a.current_status = status;
            a.sevak_last_updated_at = new Date();
            if (historyItem) {
              a.update_history = [historyItem, ...(a.update_history || [])];
            }
            a.updated_at = new Date();
            return a;
          }
        }
        return null;
      }
      throw dbErr;
    }
  },
};

export default ApplicationModel;
