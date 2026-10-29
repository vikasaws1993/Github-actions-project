import { query } from '../config/db.js';

let assignmentColumnsEnsured = false;
async function ensureAssignmentColumns() {
  if (assignmentColumnsEnsured) return;
  try {
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
    `);
    assignmentColumnsEnsured = true;
  } catch (e) {
    console.warn('[ApplicationAssignmentModel] Column migration warning:', e.message);
  }
}

/**
 * ApplicationAssignment Model / Data Access Object
 * Maps to `public.application_assignments`
 */
export const ApplicationAssignmentModel = {
  /**
   * Create an application assignment
   */
  async create({
    application_id,
    assigned_by_admin_id = null,
    hospital_id = null,
    hospital_name = null,
    arogya_sevak_id = null,
    sevak_name = null,
    scheme_id = null,
    scheme_name = null,
    admission_date = null,
    assignment_status = 'ASSIGNED',
    assignment_remark = null,
  }) {
    await ensureAssignmentColumns();

    let validAdminId = assigned_by_admin_id;
    let validHospitalId = hospital_id;
    let validSevakId = arogya_sevak_id;

    if (validAdminId) {
      try {
        const adminCheck = await query('SELECT id FROM public.admins WHERE id = $1', [validAdminId]);
        if (!adminCheck.rows.length) validAdminId = null;
      } catch {
        validAdminId = null;
      }
    }

    if (validHospitalId) {
      try {
        const hospCheck = await query('SELECT id FROM public.hospitals WHERE id = $1', [validHospitalId]);
        if (!hospCheck.rows.length) validHospitalId = null;
      } catch {
        validHospitalId = null;
      }
    }

    if (validSevakId) {
      try {
        const sevakCheck = await query('SELECT id FROM public.arogya_sevaks WHERE id = $1', [validSevakId]);
        if (sevakCheck.rows.length > 0) {
          validSevakId = sevakCheck.rows[0].id;
        } else {
          const userCheck = await query('SELECT id FROM public.arogya_sevaks WHERE user_id = $1', [validSevakId]);
          if (userCheck.rows.length > 0) {
            validSevakId = userCheck.rows[0].id;
          } else {
            validSevakId = null;
          }
        }
      } catch {
        validSevakId = null;
      }
    }

    if (!validSevakId && sevak_name) {
      try {
        const cleanName = sevak_name.includes('—') ? sevak_name.split('—')[0].trim() : (sevak_name.includes('(') ? sevak_name.split('(')[0].trim() : sevak_name.trim());
        const byNameRes = await query(
          `SELECT s.id FROM public.arogya_sevaks s 
           JOIN public.users u ON s.user_id = u.id 
           WHERE u.full_name ILIKE $1 OR u.full_name ILIKE $2 LIMIT 1`,
          [`%${cleanName}%`, `%${cleanName.split(' ')[0]}%`]
        );
        if (byNameRes.rows.length > 0) {
          validSevakId = byNameRes.rows[0].id;
        }
      } catch (_) {}
    }

    // 1. Guard against duplicate assignments: Check if an active assignment already exists for this application
    const existingActive = await query(
      `SELECT id FROM public.application_assignments 
       WHERE application_id = $1 AND (assignment_status = 'ASSIGNED' OR assignment_status IS NULL)
       ORDER BY assigned_at DESC LIMIT 1;`,
      [application_id]
    );

    if (existingActive.rows.length > 0) {
      const existingId = existingActive.rows[0].id;
      const updateSql = `
        UPDATE public.application_assignments
        SET 
          assigned_by_admin_id = COALESCE($1, assigned_by_admin_id),
          hospital_id = COALESCE($2, hospital_id),
          hospital_name = COALESCE($3, hospital_name),
          arogya_sevak_id = COALESCE($4, arogya_sevak_id),
          sevak_name = COALESCE($5, sevak_name),
          scheme_id = COALESCE($6, scheme_id),
          scheme_name = COALESCE($7, scheme_name),
          admission_date = COALESCE($8, admission_date),
          assignment_remark = COALESCE($9, assignment_remark),
          assignment_status = $10,
          assigned_at = CURRENT_TIMESTAMP
        WHERE id = $11
        RETURNING *;
      `;
      const updateRes = await query(updateSql, [
        validAdminId,
        validHospitalId,
        hospital_name,
        validSevakId,
        sevak_name,
        scheme_id,
        scheme_name,
        admission_date,
        assignment_remark,
        assignment_status,
        existingId
      ]);
      return updateRes.rows[0];
    }

    const sql = `
      INSERT INTO public.application_assignments (
        application_id,
        assigned_by_admin_id,
        hospital_id,
        hospital_name,
        arogya_sevak_id,
        sevak_name,
        scheme_id,
        scheme_name,
        admission_date,
        assignment_status,
        assignment_remark,
        assigned_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
      RETURNING *;
    `;
    const res = await query(sql, [
      application_id,
      validAdminId,
      validHospitalId,
      hospital_name,
      validSevakId,
      sevak_name,
      scheme_id,
      scheme_name,
      admission_date,
      assignment_status,
      assignment_remark,
    ]);
    return res.rows[0];
  },

  /**
   * Find assignment by UUID
   */
  async findById(id) {
    await ensureAssignmentColumns();
    const sql = `
      SELECT 
        aa.*,
        COALESCE(h.name, app.hospital_name) AS hospital_name,
        h.hospital_code,
        COALESCE(u_sevak.full_name, 'ArogyaSevak Coordinator') AS arogya_sevak_name,
        u_sevak.mobile AS arogya_sevak_mobile,
        COALESCE(app.assigned_scheme_name, app.suggested_scheme_name) AS scheme_name,
        app.application_number
      FROM public.application_assignments aa
      LEFT JOIN public.hospitals h ON aa.hospital_id = h.id
      LEFT JOIN public.arogya_sevaks s ON aa.arogya_sevak_id = s.id
      LEFT JOIN public.users u_sevak ON s.user_id = u_sevak.id
      LEFT JOIN public.applications app ON aa.application_id = app.id
      WHERE aa.id = $1
      LIMIT 1;
    `;
    const res = await query(sql, [id]);
    return res.rows[0] || null;
  },

  /**
   * Find assignments by application UUID
   */
  async findByApplicationId(applicationId) {
    await ensureAssignmentColumns();
    const sql = `
      SELECT 
        aa.*,
        COALESCE(h.name, app.hospital_name) AS hospital_name,
        COALESCE(u_sevak.full_name, 'ArogyaSevak Coordinator') AS arogya_sevak_name,
        COALESCE(app.assigned_scheme_name, app.suggested_scheme_name) AS scheme_name,
        u_admin.full_name AS assigned_by_admin_name
      FROM public.application_assignments aa
      LEFT JOIN public.hospitals h ON aa.hospital_id = h.id
      LEFT JOIN public.arogya_sevaks s ON aa.arogya_sevak_id = s.id
      LEFT JOIN public.users u_sevak ON s.user_id = u_sevak.id
      LEFT JOIN public.admins a ON aa.assigned_by_admin_id = a.id
      LEFT JOIN public.users u_admin ON a.user_id = u_admin.id
      LEFT JOIN public.applications app ON aa.application_id = app.id
      WHERE aa.application_id = $1
      ORDER BY aa.assigned_at DESC;
    `;
    const res = await query(sql, [applicationId]);
    return res.rows;
  },

  /**
   * Find assignments for an Arogya Sevak
   */
  async findBySevakId(sevakId, { status } = {}) {
    await ensureAssignmentColumns();
    if (!sevakId) return [];

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(sevakId).trim());
    const conditions = [];
    const values = [];
    let idx = 1;

    if (isUuid) {
      conditions.push(`(
        aa.arogya_sevak_id = $${idx} 
        OR s.user_id = $${idx} 
        OR s.id = $${idx} 
        OR u_sevak.id = $${idx}
        OR aa.arogya_sevak_id IN (SELECT id FROM public.arogya_sevaks WHERE user_id = $${idx})
        OR aa.sevak_name IN (SELECT full_name FROM public.users WHERE id = $${idx})
        OR aa.sevak_name IN (SELECT u2.full_name FROM public.arogya_sevaks s2 JOIN public.users u2 ON s2.user_id = u2.id WHERE s2.id = $${idx})
      )`);
      values.push(sevakId);
      idx++;
    } else {
      conditions.push(`(aa.sevak_name ILIKE $${idx} OR u_sevak.full_name ILIKE $${idx} OR s.employee_code ILIKE $${idx})`);
      values.push(`%${sevakId}%`);
      idx++;
    }

    if (status) {
      conditions.push(`aa.assignment_status = $${idx}`);
      values.push(status);
      idx++;
    }

    const sql = `
      SELECT 
        aa.*,
        app.application_number,
        app.current_status AS application_status,
        p.full_name AS patient_name,
        COALESCE(h.name, app.hospital_name) AS hospital_name,
        COALESCE(u_sevak.full_name, 'ArogyaSevak Coordinator') AS arogya_sevak_name,
        COALESCE(app.assigned_scheme_name, app.suggested_scheme_name) AS scheme_name
      FROM public.application_assignments aa
      LEFT JOIN public.applications app ON aa.application_id = app.id
      LEFT JOIN public.patients p ON app.patient_id = p.id
      LEFT JOIN public.hospitals h ON aa.hospital_id = h.id
      LEFT JOIN public.arogya_sevaks s ON aa.arogya_sevak_id = s.id
      LEFT JOIN public.users u_sevak ON s.user_id = u_sevak.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY aa.assigned_at DESC;
    `;
    const res = await query(sql, values);
    return res.rows;
  },

  /**
   * Find assignments for a Hospital
   */
  async findByHospitalId(hospitalId) {
    await ensureAssignmentColumns();
    const sql = `
      SELECT 
        aa.*,
        app.application_number,
        p.full_name AS patient_name,
        COALESCE(h.name, app.hospital_name) AS hospital_name,
        COALESCE(u_sevak.full_name, 'ArogyaSevak Coordinator') AS arogya_sevak_name,
        COALESCE(app.assigned_scheme_name, app.suggested_scheme_name) AS scheme_name
      FROM public.application_assignments aa
      LEFT JOIN public.applications app ON aa.application_id = app.id
      LEFT JOIN public.patients p ON app.patient_id = p.id
      LEFT JOIN public.hospitals h ON aa.hospital_id = h.id
      LEFT JOIN public.arogya_sevaks s ON aa.arogya_sevak_id = s.id
      LEFT JOIN public.users u_sevak ON s.user_id = u_sevak.id
      WHERE aa.hospital_id = $1
      ORDER BY aa.assigned_at DESC;
    `;
    const res = await query(sql, [hospitalId]);
    return res.rows;
  },

  /**
   * Find all assignments with pagination
   */
  async findAll({ status, limit = 50, offset = 0 } = {}) {
    await ensureAssignmentColumns();
    const conditions = [];
    const values = [];
    let idx = 1;

    if (status) {
      conditions.push(`aa.assignment_status = $${idx}`);
      values.push(status);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT 
        aa.*,
        app.application_number,
        COALESCE(h.name, app.hospital_name) AS hospital_name,
        COALESCE(u_sevak.full_name, 'ArogyaSevak Coordinator') AS arogya_sevak_name,
        COALESCE(app.assigned_scheme_name, app.suggested_scheme_name) AS scheme_name
      FROM public.application_assignments aa
      LEFT JOIN public.applications app ON aa.application_id = app.id
      LEFT JOIN public.hospitals h ON aa.hospital_id = h.id
      LEFT JOIN public.arogya_sevaks s ON aa.arogya_sevak_id = s.id
      LEFT JOIN public.users u_sevak ON s.user_id = u_sevak.id
      ${whereClause}
      ORDER BY aa.assigned_at DESC
      LIMIT $${idx} OFFSET $${idx + 1};
    `;
    values.push(limit, offset);

    const res = await query(sql, values);
    return res.rows;
  },

  /**
   * Update assignment status and mark completed if needed
   */
  async updateStatus(id, { assignment_status, assignment_remark = null, completed = false }) {
    await ensureAssignmentColumns();
    let completeUpdate = '';
    if (completed) completeUpdate = ', completed_at = CURRENT_TIMESTAMP';

    const sql = `
      UPDATE public.application_assignments
      SET 
        assignment_status = $1,
        assignment_remark = COALESCE($2, assignment_remark)
        ${completeUpdate}
      WHERE id = $3
      RETURNING *;
    `;
    const res = await query(sql, [assignment_status, assignment_remark, id]);
    return res.rows[0] || null;
  },
};

export default ApplicationAssignmentModel;
