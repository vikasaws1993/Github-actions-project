import { query } from '../config/db.js';

/**
 * CaseEscalation Model / Data Access Object
 * Maps to `public.case_escalations`
 */
export const CaseEscalationModel = {
  /**
   * Create a new case escalation / urgent priority request
   */
  async create({
    application_id,
    raised_by_arogya_sevak_id = null,
    escalated_to_admin_id = null,
    escalation_reason,
    reason_type = 'bill_exceeded',
    required_specialty = null,
    estimated_bill = null,
    attachment_name = null,
    attachment_url = null,
    description,
    status = 'ON_HOLD',
  }) {
    const sql = `
      INSERT INTO public.case_escalations (
        application_id,
        raised_by_arogya_sevak_id,
        escalated_to_admin_id,
        escalation_reason,
        reason_type,
        required_specialty,
        estimated_bill,
        attachment_name,
        attachment_url,
        description,
        status,
        escalated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
      RETURNING *;
    `;
    const res = await query(sql, [
      application_id,
      raised_by_arogya_sevak_id,
      escalated_to_admin_id,
      escalation_reason,
      reason_type,
      required_specialty,
      estimated_bill ? String(estimated_bill) : null,
      attachment_name,
      attachment_url,
      description,
      status,
    ]);
    return res.rows[0];
  },

  /**
   * Find escalation by UUID, short ID, or application identifier with complete joins
   */
  async findById(id) {
    if (!id) return null;
    const cleanShort = String(id || '').replace(/^ESC-/i, '').trim();

    const sql = `
      SELECT 
        ce.*,
        app.application_number,
        app.current_status AS application_status,
        app.priority AS application_priority,
        app.treatment_type,
        app.ward,
        app.medical_cause_note,
        app.hospital_name AS app_hospital_name,
        p.full_name AS patient_name,
        p.gender AS patient_gender,
        p.age AS patient_age,
        p.mobile_number AS patient_phone,
        sch.name AS scheme_name,
        sch.scheme_code AS scheme_code,
        sch.maximum_coverage_amount AS scheme_limit,
        COALESCE(ce.assigned_hospital_name, h.name, app.hospital_name) AS hospital_name,
        h.district AS hospital_district,
        h.taluka AS hospital_taluka,
        h.address AS hospital_address,
        u_sevak.full_name AS raised_by_sevak_name,
        u_esc_admin.full_name AS escalated_to_admin_name,
        u_res_admin.full_name AS resolved_by_admin_name
      FROM public.case_escalations ce
      LEFT JOIN public.applications app ON ce.application_id = app.id
      LEFT JOIN public.patients p ON app.patient_id = p.id
      LEFT JOIN public.schemes sch ON app.assigned_scheme_id = sch.id
      LEFT JOIN public.hospitals h ON (COALESCE(ce.assigned_hospital_id, app.hospital_id) = h.id)
      LEFT JOIN public.arogya_sevaks s ON ce.raised_by_arogya_sevak_id = s.id
      LEFT JOIN public.users u_sevak ON s.user_id = u_sevak.id
      LEFT JOIN public.admins a_esc ON ce.escalated_to_admin_id = a_esc.id
      LEFT JOIN public.users u_esc_admin ON a_esc.user_id = u_esc_admin.id
      LEFT JOIN public.admins a_res ON ce.resolved_by_admin_id = a_res.id
      LEFT JOIN public.users u_res_admin ON a_res.user_id = u_res_admin.id
      WHERE (
        ce.id::text = $1
        OR ce.id::text ILIKE $2
        OR ce.id::text ILIKE $3
        OR app.application_number ILIKE $1
        OR ce.application_id::text = $1
      )
      ORDER BY ce.escalated_at DESC
      LIMIT 1;
    `;
    const res = await query(sql, [String(id), `${cleanShort}%`, `%${cleanShort}%`]);
    return res.rows[0] || null;
  },

  /**
   * Find escalations by application UUID
   */
  async findByApplicationId(applicationId) {
    const sql = `
      SELECT 
        ce.*,
        u_sevak.full_name AS raised_by_sevak_name
      FROM public.case_escalations ce
      LEFT JOIN public.arogya_sevaks s ON ce.raised_by_arogya_sevak_id = s.id
      LEFT JOIN public.users u_sevak ON s.user_id = u_sevak.id
      WHERE ce.application_id = $1
      ORDER BY ce.escalated_at DESC;
    `;
    const res = await query(sql, [applicationId]);
    return res.rows;
  },

  /**
   * Find all escalations with filters and search
   */
  async findAll({ status, reason_type, admin_id, sevak_id, search, limit = 100, offset = 0 } = {}) {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (status && status !== 'All' && status !== 'all') {
      const normalizedStatus = status.toLowerCase() === 'on_hold' || status.toLowerCase() === 'hold' || status.toLowerCase() === 'open' 
        ? ['ON_HOLD', 'OPEN', 'PENDING', 'on_hold', 'under_review'] 
        : ['RESOLVED', 'resolved', 'CLOSED', 'closed'];
      conditions.push(`ce.status = ANY($${idx})`);
      values.push(normalizedStatus);
      idx++;
    }

    if (reason_type && reason_type !== 'All' && reason_type !== 'all') {
      conditions.push(`ce.reason_type = $${idx}`);
      values.push(reason_type);
      idx++;
    }

    if (admin_id) {
      conditions.push(`ce.escalated_to_admin_id = $${idx}`);
      values.push(admin_id);
      idx++;
    }

    if (sevak_id) {
      conditions.push(`(ce.raised_by_arogya_sevak_id = $${idx} OR s.user_id = $${idx})`);
      values.push(sevak_id);
      idx++;
    }

    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      conditions.push(`(
        LOWER(p.full_name) LIKE $${idx} OR
        LOWER(app.application_number) LIKE $${idx} OR
        LOWER(ce.escalation_reason) LIKE $${idx} OR
        LOWER(ce.description) LIKE $${idx} OR
        LOWER(COALESCE(ce.required_specialty, '')) LIKE $${idx}
      )`);
      values.push(q);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT 
        ce.*,
        app.application_number,
        app.current_status AS application_status,
        app.priority AS application_priority,
        app.treatment_type,
        app.ward,
        app.medical_cause_note,
        app.hospital_name AS app_hospital_name,
        p.full_name AS patient_name,
        p.gender AS patient_gender,
        p.age AS patient_age,
        p.mobile_number AS patient_phone,
        sch.name AS scheme_name,
        sch.scheme_code AS scheme_code,
        sch.maximum_coverage_amount AS scheme_limit,
        COALESCE(ce.assigned_hospital_name, h.name, app.hospital_name) AS hospital_name,
        h.district AS hospital_district,
        h.taluka AS hospital_taluka,
        h.address AS hospital_address,
        u_sevak.full_name AS raised_by_sevak_name,
        u_admin.full_name AS escalated_to_admin_name,
        u_res_admin.full_name AS resolved_by_admin_name
      FROM public.case_escalations ce
      LEFT JOIN public.applications app ON ce.application_id = app.id
      LEFT JOIN public.patients p ON app.patient_id = p.id
      LEFT JOIN public.schemes sch ON app.assigned_scheme_id = sch.id
      LEFT JOIN public.hospitals h ON (COALESCE(ce.assigned_hospital_id, app.hospital_id) = h.id)
      LEFT JOIN public.arogya_sevaks s ON ce.raised_by_arogya_sevak_id = s.id
      LEFT JOIN public.users u_sevak ON s.user_id = u_sevak.id
      LEFT JOIN public.admins a ON ce.escalated_to_admin_id = a.id
      LEFT JOIN public.users u_admin ON a.user_id = u_admin.id
      LEFT JOIN public.admins a_res ON ce.resolved_by_admin_id = a_res.id
      LEFT JOIN public.users u_res_admin ON a_res.user_id = u_res_admin.id
      ${whereClause}
      ORDER BY ce.escalated_at DESC
      LIMIT $${idx} OFFSET $${idx + 1};
    `;
    values.push(limit, offset);

    const res = await query(sql, values);
    return res.rows;
  },

  /**
   * Get KPI Counts for summary cards
   */
  async getStats({ sevak_id = null, admin_id = null } = {}) {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (sevak_id) {
      conditions.push(`(raised_by_arogya_sevak_id = $${idx} OR raised_by_arogya_sevak_id IN (SELECT id FROM public.arogya_sevaks WHERE user_id = $${idx}))`);
      values.push(sevak_id);
      idx++;
    }

    if (admin_id) {
      conditions.push(`escalated_to_admin_id = $${idx}`);
      values.push(admin_id);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT 
        COUNT(*)::INTEGER AS all,
        COUNT(CASE WHEN status IN ('ON_HOLD', 'OPEN', 'PENDING', 'on_hold', 'under_review') THEN 1 END)::INTEGER AS on_hold,
        COUNT(CASE WHEN status IN ('RESOLVED', 'resolved', 'CLOSED', 'closed') THEN 1 END)::INTEGER AS resolved,
        COUNT(CASE WHEN reason_type = 'bill_exceeded' THEN 1 END)::INTEGER AS bill_exceeded,
        COUNT(CASE WHEN reason_type = 'specialty_unavailable' THEN 1 END)::INTEGER AS specialty_unavailable
      FROM public.case_escalations
      ${whereClause};
    `;
    const res = await query(sql, values);
    const row = res.rows[0] || {};
    return {
      all: Number(row.all || 0),
      onHold: Number(row.on_hold || 0),
      resolved: Number(row.resolved || 0),
      billExceeded: Number(row.bill_exceeded || 0),
      specialtyUnavailable: Number(row.specialty_unavailable || 0),
    };
  },

  /**
   * Resolve an escalation
   */
  async resolve(id, {
    resolution,
    resolved_by_admin_id = null,
    status = 'RESOLVED',
    resolution_type = null,
    sanctioned_scheme = null,
    assigned_hospital_id = null,
    assigned_hospital_name = null,
    copay_amount = null,
  }) {
    if (!id) return null;

    // 1. Locate the exact record UUID safely
    let targetId = id;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) {
      const cleanShort = String(id || '').replace(/^ESC-/i, '').trim();
      const findSql = `
        SELECT ce.id 
        FROM public.case_escalations ce
        LEFT JOIN public.applications app ON ce.application_id = app.id
        WHERE ce.id::text ILIKE $1 
           OR ce.id::text ILIKE $2
           OR app.application_number = $3 
           OR ce.application_id::text = $3
        ORDER BY ce.escalated_at DESC
        LIMIT 1;
      `;
      const findRes = await query(findSql, [`${cleanShort}%`, `%${cleanShort}%`, id]);
      if (findRes.rows[0]) {
        targetId = findRes.rows[0].id;
      }
    }

    const sql = `
      UPDATE public.case_escalations
      SET 
        status = $1,
        resolution = $2,
        resolved_by_admin_id = $3,
        resolution_type = COALESCE($4, resolution_type),
        sanctioned_scheme = COALESCE($5, sanctioned_scheme),
        assigned_hospital_id = COALESCE($6, assigned_hospital_id),
        assigned_hospital_name = COALESCE($7, assigned_hospital_name),
        copay_amount = COALESCE($8, copay_amount),
        resolved_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9::uuid
      RETURNING *;
    `;
    const res = await query(sql, [
      status,
      resolution,
      resolved_by_admin_id,
      resolution_type,
      sanctioned_scheme,
      assigned_hospital_id,
      assigned_hospital_name,
      copay_amount,
      targetId,
    ]);
    return res.rows[0] || null;
  },
};

export default CaseEscalationModel;
