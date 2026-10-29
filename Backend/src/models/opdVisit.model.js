import { query } from '../config/db.js';

/**
 * SQL DDL for opd_visits table
 */
export const CREATE_OPD_VISITS_TABLE_SQL = `
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";

  CREATE TABLE IF NOT EXISTS public.opd_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_number VARCHAR(50),
    case_id VARCHAR(100),
    application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    recorded_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    recorded_by_name VARCHAR(150),
    patient_name VARCHAR(255),
    age INT,
    gender VARCHAR(30),
    contact_phone VARCHAR(50),
    abha_id VARCHAR(50),
    visit_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date DATE DEFAULT CURRENT_DATE,
    entry_time VARCHAR(30),
    timestamp_formatted VARCHAR(100),
    doctor_name VARCHAR(150),
    department VARCHAR(100),
    visit_type VARCHAR(50) DEFAULT 'New Consultation',
    scheme_eligibility VARCHAR(50) DEFAULT 'MJPJAY Eligible',
    diagnosis TEXT,
    chief_complaint TEXT,
    findings TEXT,
    prescription_file_url TEXT,
    prescription_doc_data JSONB,
    follow_up_required BOOLEAN NOT NULL DEFAULT FALSE,
    follow_up_date DATE,
    next_follow_up_timeline VARCHAR(100),
    follow_up_status VARCHAR(30) DEFAULT 'NOT_REQUIRED',
    follow_up_resolved_at VARCHAR(100),
    follow_up_resolved_by_visit_id VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_opd_visits_app ON public.opd_visits(application_id);
  CREATE INDEX IF NOT EXISTS idx_opd_visits_case ON public.opd_visits(case_id);
  CREATE INDEX IF NOT EXISTS idx_opd_visits_patient ON public.opd_visits(patient_id);
  CREATE INDEX IF NOT EXISTS idx_opd_visits_date ON public.opd_visits(visit_date DESC);
  CREATE INDEX IF NOT EXISTS idx_opd_visits_followup ON public.opd_visits(follow_up_status);
`;

const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getNowTimeString = () => {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const getFormattedTimestamp = () => {
  const d = new Date();
  const dateStr = d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return `${dateStr}, ${timeStr}`;
};

/**
 * Format database row into standardized response object
 */
export const formatOpdVisitResponse = (row) => {
  if (!row) return null;

  let prescriptionDoc = null;
  if (row.prescription_doc_data) {
    if (typeof row.prescription_doc_data === 'string') {
      try {
        prescriptionDoc = JSON.parse(row.prescription_doc_data);
      } catch (_) {
        prescriptionDoc = null;
      }
    } else {
      prescriptionDoc = row.prescription_doc_data;
    }
  } else if (row.prescription_file_url) {
    prescriptionDoc = {
      id: `rx-${row.id}`,
      name: 'Prescription_Document.jpg',
      uri: row.prescription_file_url,
      type: 'image/jpeg',
      source: 'device',
      uploadedAt: row.entry_time || 'Prescription',
    };
  }

  const visitDateObj = row.visit_date ? new Date(row.visit_date) : new Date(row.created_at || Date.now());
  const dateStr = row.date
    ? (typeof row.date === 'string' ? row.date.split('T')[0] : new Date(row.date).toISOString().split('T')[0])
    : visitDateObj.toISOString().split('T')[0];

  const formattedTs = row.timestamp_formatted || (
    `${visitDateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${row.entry_time || visitDateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
  );

  return {
    id: row.id,
    tokenNumber: row.token_number || `OPD-${String(row.id).slice(0, 4).toUpperCase()}`,
    caseId: row.case_id || row.application_number || row.application_id || 'GENERAL-OPD',
    applicationId: row.application_id || null,
    patientId: row.patient_id || null,
    patientName: row.patient_name || row.joined_patient_name || 'Patient',
    age: row.age || (row.patient_dob ? new Date().getFullYear() - new Date(row.patient_dob).getFullYear() : 35),
    gender: row.gender || row.patient_gender || 'Other',
    contactPhone: row.contact_phone || row.patient_mobile || '',
    abhaId: row.abha_id || row.patient_abha || '',
    department: row.department || 'General Medicine',
    consultingDoctor: row.doctor_name || '',
    visitType: row.visit_type || 'New Consultation',
    schemeEligibility: row.scheme_eligibility || 'MJPJAY Eligible',
    diagnosis: row.diagnosis || '',
    chiefComplaint: row.chief_complaint || row.diagnosis || '',
    findings: row.findings || '',
    prescriptionDoc: prescriptionDoc,
    prescriptionFileUrl: row.prescription_file_url || (prescriptionDoc?.uri || null),
    nextFollowUpRequired: Boolean(row.follow_up_required),
    nextFollowUpTimeline: row.next_follow_up_timeline || (row.follow_up_date ? `On ${row.follow_up_date}` : 'In 7 Days'),
    followUpStatus: row.follow_up_status || (row.follow_up_required ? 'PENDING' : 'NOT_REQUIRED'),
    followUpResolvedAt: row.follow_up_resolved_at || null,
    followUpResolvedByVisitId: row.follow_up_resolved_by_visit_id || null,
    entryTime: row.entry_time || visitDateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    date: dateStr,
    timestampFormatted: formattedTs,
    recordedBy: row.recorded_by_name || row.recorded_by_user_name || 'Arogya Sevak',
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

let tableEnsured = false;

/**
 * OpdVisit Model / Data Access Object
 */
export const OpdVisitModel = {
  /**
   * Ensure opd_visits table exists and has all required columns
   */
  async ensureTableExists() {
    if (tableEnsured) return;
    try {
      await query(CREATE_OPD_VISITS_TABLE_SQL);

      const migrations = [
        'ALTER TABLE public.opd_visits ADD COLUMN IF NOT EXISTS token_number VARCHAR(50)',
        'ALTER TABLE public.opd_visits ADD COLUMN IF NOT EXISTS token_no VARCHAR(50)',
        'ALTER TABLE public.opd_visits ADD COLUMN IF NOT EXISTS case_id VARCHAR(100)',
        'ALTER TABLE public.opd_visits ADD COLUMN IF NOT EXISTS recorded_by_name VARCHAR(150)',
        'ALTER TABLE public.opd_visits ADD COLUMN IF NOT EXISTS patient_name VARCHAR(255)',
        'ALTER TABLE public.opd_visits ADD COLUMN IF NOT EXISTS age INT',
        'ALTER TABLE public.opd_visits ADD COLUMN IF NOT EXISTS gender VARCHAR(30)',
        'ALTER TABLE public.opd_visits ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50)',
        'ALTER TABLE public.opd_visits ADD COLUMN IF NOT EXISTS abha_id VARCHAR(50)',
        'ALTER TABLE public.opd_visits ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE',
        'ALTER TABLE public.opd_visits ADD COLUMN IF NOT EXISTS entry_time VARCHAR(30)',
        'ALTER TABLE public.opd_visits ADD COLUMN IF NOT EXISTS timestamp_formatted VARCHAR(100)',
        'ALTER TABLE public.opd_visits ADD COLUMN IF NOT EXISTS visit_type VARCHAR(50) DEFAULT \'New Consultation\'',
        'ALTER TABLE public.opd_visits ADD COLUMN IF NOT EXISTS scheme_eligibility VARCHAR(50) DEFAULT \'MJPJAY Eligible\'',
        'ALTER TABLE public.opd_visits ADD COLUMN IF NOT EXISTS chief_complaint TEXT',
        'ALTER TABLE public.opd_visits ADD COLUMN IF NOT EXISTS prescription_doc_data JSONB',
        'ALTER TABLE public.opd_visits ADD COLUMN IF NOT EXISTS next_follow_up_timeline VARCHAR(100)',
        'ALTER TABLE public.opd_visits ADD COLUMN IF NOT EXISTS follow_up_status VARCHAR(30) DEFAULT \'NOT_REQUIRED\'',
        'ALTER TABLE public.opd_visits ADD COLUMN IF NOT EXISTS follow_up_resolved_at VARCHAR(100)',
        'ALTER TABLE public.opd_visits ADD COLUMN IF NOT EXISTS follow_up_resolved_by_visit_id VARCHAR(100)',
        'ALTER TABLE public.opd_visits ALTER COLUMN application_id DROP NOT NULL',
        'ALTER TABLE public.opd_visits ALTER COLUMN doctor_name DROP NOT NULL',
        'ALTER TABLE public.opd_visits ALTER COLUMN diagnosis DROP NOT NULL',
        'ALTER TABLE public.opd_visits DROP CONSTRAINT IF EXISTS opd_visits_application_id_fkey',
        'ALTER TABLE public.opd_visits DROP CONSTRAINT IF EXISTS opd_visits_patient_id_fkey',
        'ALTER TABLE public.opd_visits DROP CONSTRAINT IF EXISTS opd_visits_recorded_by_user_id_fkey',
      ];

      for (const m of migrations) {
        try {
          await query(m);
        } catch (_) {}
      }
      tableEnsured = true;
    } catch (e) {
      console.warn('[OpdVisitModel.ensureTableExists] Migration note:', e.message);
    }
  },

  /**
   * Record a new OPD visit outcome against an application or case
   */
  async create({
    token_number = null,
    case_id = null,
    application_id = null,
    patient_id = null,
    recorded_by_user_id = null,
    recorded_by_name = null,
    patient_name = null,
    age = null,
    gender = null,
    contact_phone = null,
    abha_id = null,
    visit_date = new Date(),
    doctor_name = '',
    department = 'General Medicine',
    visit_type = 'New Consultation',
    scheme_eligibility = 'MJPJAY Eligible',
    diagnosis = '',
    chief_complaint = '',
    findings = null,
    prescription_file_url = null,
    prescription_doc_data = null,
    follow_up_required = false,
    follow_up_date = null,
    next_follow_up_timeline = null,
    follow_up_status = null,
    notes = null,
  }) {
    await this.ensureTableExists();

    let targetApplicationId = application_id;
    let targetPatientId = patient_id;
    let targetCaseId = case_id;
    let targetPatientName = patient_name;
    let targetAge = age ? parseInt(age, 10) : null;
    let targetGender = gender;
    let targetPhone = contact_phone;
    let targetAbha = abha_id;

    // Check if targetCaseId or targetApplicationId can be resolved from public.applications
    const lookupKey = targetApplicationId || targetCaseId;
    if (lookupKey) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lookupKey);
      let appRes;
      try {
        if (isUuid) {
          appRes = await query(
            `SELECT a.id, a.application_number, a.patient_id, p.full_name, p.age, p.gender, p.mobile_number, p.abha_number
             FROM public.applications a
             LEFT JOIN public.patients p ON a.patient_id = p.id
             WHERE a.id = $1 LIMIT 1`,
            [lookupKey]
          );
        } else {
          appRes = await query(
            `SELECT a.id, a.application_number, a.patient_id, p.full_name, p.age, p.gender, p.mobile_number, p.abha_number
             FROM public.applications a
             LEFT JOIN public.patients p ON a.patient_id = p.id
             WHERE a.application_number = $1 OR a.id::text = $1 LIMIT 1`,
            [lookupKey]
          );
        }

        if (appRes && appRes.rows.length > 0) {
          const found = appRes.rows[0];
          targetApplicationId = found.id;
          targetCaseId = targetCaseId || found.application_number;
          if (!targetPatientId) targetPatientId = found.patient_id;
          if (!targetPatientName) targetPatientName = found.full_name;
          if (!targetAge) targetAge = found.age;
          if (!targetGender) targetGender = found.gender;
          if (!targetPhone) targetPhone = found.mobile_number;
          if (!targetAbha) targetAbha = found.abha_number;
        }
      } catch (_) {}
    }

    const isValidUuid = (v) => Boolean(v && typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.trim()));

    if (!isValidUuid(targetApplicationId)) targetApplicationId = null;
    if (!isValidUuid(targetPatientId)) targetPatientId = null;
    if (!isValidUuid(recorded_by_user_id)) recorded_by_user_id = null;

    // Verify FK targets actually exist in database
    if (targetApplicationId) {
      try {
        const appCheck = await query(`SELECT id FROM public.applications WHERE id = $1 LIMIT 1`, [targetApplicationId]);
        if (!appCheck.rows.length) targetApplicationId = null;
      } catch (_) { targetApplicationId = null; }
    }
    if (targetPatientId) {
      try {
        const pCheck = await query(`SELECT id FROM public.patients WHERE id = $1 LIMIT 1`, [targetPatientId]);
        if (!pCheck.rows.length) targetPatientId = null;
      } catch (_) { targetPatientId = null; }
    }
    if (recorded_by_user_id) {
      try {
        const uCheck = await query(`SELECT id FROM public.users WHERE id = $1 LIMIT 1`, [recorded_by_user_id]);
        if (!uCheck.rows.length) recorded_by_user_id = null;
      } catch (_) { recorded_by_user_id = null; }
    }

    // Determine today's token number if not provided
    let finalTokenNumber = token_number;
    if (!finalTokenNumber) {
      const countRes = await query(
        `SELECT COUNT(*) as cnt FROM public.opd_visits WHERE (date = CURRENT_DATE OR visit_date::date = CURRENT_DATE)`
      );
      const nextNum = 101 + parseInt(countRes.rows[0]?.cnt || '0', 10);
      finalTokenNumber = `OPD-${nextNum}`;
    }

    const todayStr = getTodayString();
    const nowTimeStr = getNowTimeString();
    const formattedTs = getFormattedTimestamp();

    // Determine follow up status
    const isFollowUpReq = Boolean(follow_up_required);
    const finalFollowUpStatus = follow_up_status || (isFollowUpReq ? 'PENDING' : 'NOT_REQUIRED');

    const sql = `
      INSERT INTO public.opd_visits (
        token_number,
        case_id,
        application_id,
        patient_id,
        recorded_by_user_id,
        recorded_by_name,
        patient_name,
        age,
        gender,
        contact_phone,
        abha_id,
        visit_date,
        date,
        entry_time,
        timestamp_formatted,
        doctor_name,
        department,
        visit_type,
        scheme_eligibility,
        diagnosis,
        chief_complaint,
        findings,
        prescription_file_url,
        prescription_doc_data,
        follow_up_required,
        follow_up_date,
        next_follow_up_timeline,
        follow_up_status,
        notes,
        created_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING *;
    `;

    const res = await query(sql, [
      finalTokenNumber,
      targetCaseId || targetApplicationId || 'GENERAL-OPD',
      targetApplicationId,
      targetPatientId,
      recorded_by_user_id,
      recorded_by_name || 'Arogya Sevak',
      targetPatientName || 'Patient',
      targetAge || null,
      targetGender || 'Other',
      targetPhone || '',
      targetAbha || '',
      visit_date || new Date(),
      todayStr,
      nowTimeStr,
      formattedTs,
      doctor_name || '',
      department || 'General Medicine',
      visit_type || 'New Consultation',
      scheme_eligibility || 'MJPJAY Eligible',
      diagnosis || chief_complaint || '',
      chief_complaint || diagnosis || '',
      findings,
      prescription_file_url,
      prescription_doc_data ? JSON.stringify(prescription_doc_data) : null,
      isFollowUpReq,
      isFollowUpReq ? follow_up_date : null,
      isFollowUpReq ? (next_follow_up_timeline || 'In 7 Days') : null,
      finalFollowUpStatus,
      notes,
    ]);

    const createdVisit = res.rows[0];

    // If this is a 'Follow-Up' visit, auto-resolve any previous pending follow-ups for this case / patient
    if (visit_type === 'Follow-Up' && (targetCaseId || targetApplicationId || targetPatientId)) {
      try {
        await query(
          `UPDATE public.opd_visits
           SET follow_up_status = 'DONE',
               follow_up_resolved_at = $1,
               follow_up_resolved_by_visit_id = $2,
               updated_at = CURRENT_TIMESTAMP
           WHERE id != $3
             AND follow_up_status = 'PENDING'
             AND (
               (case_id IS NOT NULL AND case_id = $4) OR
               (application_id IS NOT NULL AND application_id = $5) OR
               (patient_id IS NOT NULL AND patient_id = $6)
             )`,
          [
            formattedTs,
            createdVisit.id,
            createdVisit.id,
            targetCaseId,
            targetApplicationId,
            targetPatientId,
          ]
        );
      } catch (err) {
        console.warn('[OpdVisitModel.create] Error auto-resolving previous follow up:', err.message);
      }
    }

    return formatOpdVisitResponse(createdVisit);
  },

  /**
   * Find OPD visit by UUID with joined details
   */
  async findById(id) {
    await this.ensureTableExists();

    const sql = `
      SELECT 
        v.*,
        app.application_number,
        p.full_name AS joined_patient_name,
        p.gender AS patient_gender,
        p.date_of_birth AS patient_dob,
        p.mobile_number AS patient_mobile,
        p.abha_number AS patient_abha,
        u.full_name AS recorded_by_user_name,
        u.role AS recorded_by_role
      FROM public.opd_visits v
      LEFT JOIN public.applications app ON v.application_id = app.id
      LEFT JOIN public.patients p ON v.patient_id = p.id
      LEFT JOIN public.users u ON v.recorded_by_user_id = u.id
      WHERE v.id = $1
      LIMIT 1;
    `;
    const res = await query(sql, [id]);
    return formatOpdVisitResponse(res.rows[0]);
  },

  /**
   * Find all OPD visits with filter, search, and pagination
   */
  async findAll({ filter = 'ALL', search = '', limit = 100, offset = 0, sevakFilter = null } = {}) {
    await this.ensureTableExists();

    const conditions = [];
    const values = [];
    let idx = 1;

    // Filter tab
    if (filter === 'TODAY') {
      conditions.push(`(v.date = CURRENT_DATE OR v.visit_date::date = CURRENT_DATE)`);
    } else if (filter === 'FOLLOW_UP_REQUIRED') {
      conditions.push(`v.follow_up_status = 'PENDING'`);
    } else if (filter === 'FOLLOW_UP_DONE') {
      conditions.push(`v.follow_up_status = 'DONE'`);
    }

    // Arogya Sevak scoping
    if (sevakFilter) {
      const { userId, appIds = [], caseNumbers = [] } = sevakFilter;
      const validAppUuids = (Array.isArray(appIds) ? appIds : []).filter((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id).trim()));
      const validCaseNumbers = Array.isArray(caseNumbers) ? caseNumbers.filter(Boolean) : [];
      const sevakOrConditions = [];

      if (userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(userId).trim())) {
        sevakOrConditions.push(`v.recorded_by_user_id = $${idx}::uuid`);
        values.push(String(userId).trim());
        idx++;
      }

      if (validAppUuids.length > 0) {
        sevakOrConditions.push(`v.application_id = ANY($${idx}::uuid[])`);
        values.push(validAppUuids);
        idx++;
      }

      if (validCaseNumbers.length > 0) {
        sevakOrConditions.push(`(v.case_id = ANY($${idx}::text[]) OR app.application_number = ANY($${idx}::text[]))`);
        values.push(validCaseNumbers);
        idx++;
      }

      if (sevakOrConditions.length > 0) {
        conditions.push(`(${sevakOrConditions.join(' OR ')})`);
      } else {
        conditions.push(`1 = 0`);
      }
    }

    // Search
    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      conditions.push(`(
        v.patient_name ILIKE $${idx} OR
        v.case_id ILIKE $${idx} OR
        v.token_number ILIKE $${idx} OR
        v.contact_phone ILIKE $${idx} OR
        v.department ILIKE $${idx} OR
        v.doctor_name ILIKE $${idx} OR
        v.diagnosis ILIKE $${idx} OR
        v.chief_complaint ILIKE $${idx}
      )`);
      values.push(q);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        v.*,
        app.application_number,
        p.full_name AS joined_patient_name,
        p.gender AS patient_gender,
        p.date_of_birth AS patient_dob,
        p.mobile_number AS patient_mobile,
        p.abha_number AS patient_abha,
        u.full_name AS recorded_by_user_name
      FROM public.opd_visits v
      LEFT JOIN public.applications app ON v.application_id = app.id
      LEFT JOIN public.patients p ON v.patient_id = p.id
      LEFT JOIN public.users u ON v.recorded_by_user_id = u.id
      ${whereClause}
      ORDER BY v.visit_date DESC, v.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1};
    `;

    values.push(limit, offset);

    const res = await query(sql, values);
    return res.rows.map(formatOpdVisitResponse);
  },

  /**
   * Find all OPD visits for a given application or case number
   */
  async findByApplicationOrCaseId(caseOrAppId) {
    await this.ensureTableExists();

    if (!caseOrAppId) return [];

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(caseOrAppId);

    const sql = `
      SELECT 
        v.*,
        app.application_number,
        p.full_name AS joined_patient_name,
        p.gender AS patient_gender,
        p.date_of_birth AS patient_dob,
        p.mobile_number AS patient_mobile,
        p.abha_number AS patient_abha,
        u.full_name AS recorded_by_user_name
      FROM public.opd_visits v
      LEFT JOIN public.applications app ON v.application_id = app.id
      LEFT JOIN public.patients p ON v.patient_id = p.id
      LEFT JOIN public.users u ON v.recorded_by_user_id = u.id
      WHERE 
        v.case_id = $1 OR
        app.application_number = $1 OR
        ${isUuid ? `v.application_id = $1::uuid OR v.id = $1::uuid` : `v.application_id::text = $1`}
      ORDER BY v.visit_date DESC, v.created_at DESC;
    `;

    const res = await query(sql, [caseOrAppId]);
    return res.rows.map(formatOpdVisitResponse);
  },

  /**
   * Backward compatibility alias for application ID
   */
  async findByApplicationId(applicationId) {
    return this.findByApplicationOrCaseId(applicationId);
  },

  /**
   * Find all OPD visits for a patient across all applications
   */
  async findByPatientId(patientId) {
    await this.ensureTableExists();

    const sql = `
      SELECT 
        v.*,
        app.application_number,
        p.full_name AS joined_patient_name,
        u.full_name AS recorded_by_user_name
      FROM public.opd_visits v
      LEFT JOIN public.applications app ON v.application_id = app.id
      LEFT JOIN public.patients p ON v.patient_id = p.id
      LEFT JOIN public.users u ON v.recorded_by_user_id = u.id
      WHERE v.patient_id = $1
      ORDER BY v.visit_date DESC, v.created_at DESC;
    `;
    const res = await query(sql, [patientId]);
    return res.rows.map(formatOpdVisitResponse);
  },

  /**
   * Compute aggregate OPD stats
   */
  async getStats({ sevakFilter = null } = {}) {
    await this.ensureTableExists();

    let whereClause = '';
    const values = [];
    let idx = 1;

    if (sevakFilter) {
      const { userId, appIds = [], caseNumbers = [] } = sevakFilter;
      const validAppUuids = (Array.isArray(appIds) ? appIds : []).filter((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id).trim()));
      const validCaseNumbers = Array.isArray(caseNumbers) ? caseNumbers.filter(Boolean) : [];
      const sevakOrConditions = [];

      if (userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(userId).trim())) {
        sevakOrConditions.push(`recorded_by_user_id = $${idx}::uuid`);
        values.push(String(userId).trim());
        idx++;
      }

      if (validAppUuids.length > 0) {
        sevakOrConditions.push(`application_id = ANY($${idx}::uuid[])`);
        values.push(validAppUuids);
        idx++;
      }

      if (validCaseNumbers.length > 0) {
        sevakOrConditions.push(`case_id = ANY($${idx}::text[])`);
        values.push(validCaseNumbers);
        idx++;
      }

      if (sevakOrConditions.length > 0) {
        whereClause = `(${sevakOrConditions.join(' OR ')})`;
      } else {
        return {
          totalVisits: 0,
          todayCount: 0,
          followUpRequiredCount: 0,
          followUpDoneCount: 0,
        };
      }
    }

    const baseWhere = whereClause ? `WHERE ${whereClause}` : '';
    const whereAnd = whereClause ? `WHERE ${whereClause} AND` : 'WHERE';

    const totalSql = `SELECT COUNT(*) AS total FROM public.opd_visits ${baseWhere};`;
    const todaySql = `SELECT COUNT(*) AS today FROM public.opd_visits ${whereAnd} (date = CURRENT_DATE OR visit_date::date = CURRENT_DATE);`;
    const pendingSql = `SELECT COUNT(*) AS pending FROM public.opd_visits ${whereAnd} follow_up_status = 'PENDING';`;
    const doneSql = `SELECT COUNT(*) AS done FROM public.opd_visits ${whereAnd} follow_up_status = 'DONE';`;

    const [totalRes, todayRes, pendingRes, doneRes] = await Promise.all([
      query(totalSql, values),
      query(todaySql, values),
      query(pendingSql, values),
      query(doneSql, values),
    ]);

    return {
      totalVisits: parseInt(totalRes.rows[0]?.total || '0', 10),
      todayCount: parseInt(todayRes.rows[0]?.today || '0', 10),
      followUpRequiredCount: parseInt(pendingRes.rows[0]?.pending || '0', 10),
      followUpDoneCount: parseInt(doneRes.rows[0]?.done || '0', 10),
    };
  },

  /**
   * Resolve follow-up status on a visit
   */
  async resolveFollowUp(id, { resolvedAt = null, resolvedByVisitId = null } = {}) {
    await this.ensureTableExists();

    const formattedTs = resolvedAt || getFormattedTimestamp();

    const sql = `
      UPDATE public.opd_visits
      SET follow_up_status = 'DONE',
          follow_up_resolved_at = $1,
          follow_up_resolved_by_visit_id = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *;
    `;

    const res = await query(sql, [formattedTs, resolvedByVisitId, id]);
    return formatOpdVisitResponse(res.rows[0]);
  },

  /**
   * Update an OPD visit record
   */
  async update(id, updates = {}) {
    await this.ensureTableExists();

    const allowedFields = [
      'token_number',
      'case_id',
      'patient_name',
      'age',
      'gender',
      'contact_phone',
      'abha_id',
      'visit_date',
      'doctor_name',
      'department',
      'visit_type',
      'scheme_eligibility',
      'diagnosis',
      'chief_complaint',
      'findings',
      'prescription_file_url',
      'prescription_doc_data',
      'follow_up_required',
      'follow_up_date',
      'next_follow_up_timeline',
      'follow_up_status',
      'follow_up_resolved_at',
      'notes',
    ];

    const setClauses = [];
    const values = [];
    let idx = 1;

    for (const [key, val] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClauses.push(`${key} = $${idx}`);
        values.push(key === 'prescription_doc_data' && typeof val === 'object' ? JSON.stringify(val) : val);
        idx++;
      }
    }

    if (setClauses.length === 0) {
      return this.findById(id);
    }

    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const sql = `
      UPDATE public.opd_visits
      SET ${setClauses.join(', ')}
      WHERE id = $${idx}
      RETURNING *;
    `;

    const res = await query(sql, values);
    return formatOpdVisitResponse(res.rows[0]);
  },

  /**
   * Delete an OPD visit
   */
  async delete(id) {
    await this.ensureTableExists();

    const sql = `DELETE FROM public.opd_visits WHERE id = $1 RETURNING *;`;
    const res = await query(sql, [id]);
    return formatOpdVisitResponse(res.rows[0]);
  },
};

export default OpdVisitModel;
