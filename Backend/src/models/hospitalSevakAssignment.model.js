import { query } from '../config/db.js';
import crypto from 'crypto';

/**
 * SQL DDL for hospital_sevak_assignments table matching the ERD schema:
 *
 * hospital_sevak_assignments
 * -----------------------------------------
 * id (PK)             UUID
 * hospital_id (FK)    UUID REFERENCES hospitals(id)
 * sevak_id (FK)       UUID REFERENCES arogya_sevaks(id)
 * assigned_by (FK)    UUID REFERENCES users(id)
 * assigned_at         TIMESTAMP WITH TIME ZONE
 * unassigned_at       TIMESTAMP WITH TIME ZONE
 * status              VARCHAR(20) (ACTIVE / INACTIVE)
 * remarks             TEXT
 * created_at          TIMESTAMP WITH TIME ZONE
 * updated_at          TIMESTAMP WITH TIME ZONE
 */
export const CREATE_HOSPITAL_SEVAK_ASSIGNMENTS_TABLE_SQL = `
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";

  CREATE TABLE IF NOT EXISTS public.hospital_sevak_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
    sevak_id UUID NOT NULL REFERENCES public.arogya_sevaks(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    unassigned_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
      CHECK (status IN ('ACTIVE', 'INACTIVE')),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_hsa_hospital_id ON public.hospital_sevak_assignments(hospital_id);
  CREATE INDEX IF NOT EXISTS idx_hsa_sevak_id ON public.hospital_sevak_assignments(sevak_id);
  CREATE INDEX IF NOT EXISTS idx_hsa_assigned_by ON public.hospital_sevak_assignments(assigned_by);
  CREATE INDEX IF NOT EXISTS idx_hsa_status ON public.hospital_sevak_assignments(status);
`;

// In-memory fallback for testing/offline dev
const inMemoryAssignments = new Map();

/**
 * Hospital Sevak Assignment Model / Data Access Object
 */
export const HospitalSevakAssignmentModel = {
  /**
   * Ensure table exists in the database
   */
  async createTable() {
    return query(CREATE_HOSPITAL_SEVAK_ASSIGNMENTS_TABLE_SQL);
  },

  /**
   * Create and store a new assignment
   * @param {Object} data
   * @param {string} data.hospital_id
   * @param {string} data.sevak_id
   * @param {string} [data.assigned_by]
   * @param {string} [data.status]
   * @param {string} [data.remarks]
   */
  async create({
    hospital_id,
    sevak_id,
    assigned_by = null,
    status = 'ACTIVE',
    remarks = null,
  }) {
    // Safety check: ensure assigned_by references an existing user ID, or resolve if it's an admin id, or fallback to null
    let resolvedUserId = null;
    if (assigned_by) {
      try {
        const userCheck = await query('SELECT id FROM public.users WHERE id = $1 LIMIT 1', [assigned_by]);
        if (userCheck?.rows?.length > 0) {
          resolvedUserId = userCheck.rows[0].id;
        } else {
          const adminCheck = await query('SELECT user_id FROM public.admins WHERE id = $1 LIMIT 1', [assigned_by]);
          if (adminCheck?.rows?.length > 0) {
            resolvedUserId = adminCheck.rows[0].user_id;
          }
        }
      } catch {
        resolvedUserId = null;
      }
    }

    const insertSQL = `
      INSERT INTO public.hospital_sevak_assignments (
        hospital_id,
        sevak_id,
        assigned_by,
        assigned_at,
        status,
        remarks,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *;
    `;

    try {
      const res = await query(insertSQL, [
        hospital_id,
        sevak_id,
        resolvedUserId,
        status,
        remarks,
      ]);
      return res.rows[0];
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        const record = {
          id: crypto.randomUUID(),
          hospital_id,
          sevak_id,
          assigned_by,
          assigned_at: new Date(),
          unassigned_at: null,
          status,
          remarks,
          created_at: new Date(),
          updated_at: new Date(),
        };
        inMemoryAssignments.set(record.id, record);
        return record;
      }
      throw dbErr;
    }
  },

  /**
   * Find first active assignment by sevak_id (legacy compatibility)
   * @param {string} sevak_id
   */
  async findActiveBySevakId(sevak_id) {
    const selectSQL = `
      SELECT 
        hsa.*,
        h.name AS hospital_name,
        h.hospital_code,
        h.district_id,
        h.taluka_id,
        h.contact_number AS hospital_contact
      FROM public.hospital_sevak_assignments hsa
      JOIN public.hospitals h ON hsa.hospital_id = h.id
      WHERE hsa.sevak_id = $1 AND hsa.status = 'ACTIVE'
      ORDER BY hsa.assigned_at DESC
      LIMIT 1;
    `;

    try {
      const res = await query(selectSQL, [sevak_id]);
      return res.rows[0] || null;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        for (const a of inMemoryAssignments.values()) {
          if (a.sevak_id === sevak_id && a.status === 'ACTIVE') {
            return a;
          }
        }
        return null;
      }
      throw dbErr;
    }
  },

  /**
   * Find ALL active hospitals assigned to a specific sevak
   * @param {string} sevak_id
   */
  async findActiveHospitalsBySevakId(sevak_id) {
    const selectSQL = `
      SELECT 
        hsa.id AS assignment_id,
        hsa.hospital_id,
        hsa.assigned_at,
        hsa.remarks,
        hsa.status,
        h.name AS hospital_name,
        h.hospital_code,
        h.district_id,
        h.taluka_id,
        h.contact_number AS hospital_contact,
        h.address AS hospital_address
      FROM public.hospital_sevak_assignments hsa
      JOIN public.hospitals h ON hsa.hospital_id = h.id
      WHERE hsa.sevak_id = $1 AND hsa.status = 'ACTIVE'
      ORDER BY hsa.assigned_at DESC;
    `;

    try {
      const res = await query(selectSQL, [sevak_id]);
      return res.rows;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        const matches = [];
        for (const a of inMemoryAssignments.values()) {
          if (a.sevak_id === sevak_id && a.status === 'ACTIVE') {
            matches.push({
              assignment_id: a.id,
              hospital_id: a.hospital_id,
              assigned_at: a.assigned_at,
              remarks: a.remarks,
              status: a.status,
              hospital_name: a.hospital_name || 'Hospital ' + a.hospital_id.slice(0, 8),
              hospital_code: a.hospital_code || 'HOSP-' + a.hospital_id.slice(0, 4),
            });
          }
        }
        return matches;
      }
      throw dbErr;
    }
  },

  /**
   * Find all assignment history (active and inactive) for a sevak
   * @param {string} sevak_id
   */
  async findAllAssignmentsBySevakId(sevak_id) {
    const selectSQL = `
      SELECT 
        hsa.*,
        h.name AS hospital_name,
        h.hospital_code,
        h.contact_number AS hospital_contact
      FROM public.hospital_sevak_assignments hsa
      JOIN public.hospitals h ON hsa.hospital_id = h.id
      WHERE hsa.sevak_id = $1
      ORDER BY hsa.assigned_at DESC;
    `;

    try {
      const res = await query(selectSQL, [sevak_id]);
      return res.rows;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        const history = [];
        for (const a of inMemoryAssignments.values()) {
          if (a.sevak_id === sevak_id) {
            history.push(a);
          }
        }
        return history.sort((a, b) => new Date(b.assigned_at) - new Date(a.assigned_at));
      }
      throw dbErr;
    }
  },

  /**
   * Deactivate all active assignments for a sevak
   * @param {string} sevak_id
   * @param {string} [remarks]
   */
  async deactivateBySevakId(sevak_id, remarks = null) {
    const updateSQL = `
      UPDATE public.hospital_sevak_assignments
      SET 
        status = 'INACTIVE', 
        unassigned_at = CURRENT_TIMESTAMP, 
        remarks = COALESCE($2, remarks),
        updated_at = CURRENT_TIMESTAMP
      WHERE sevak_id = $1 AND status = 'ACTIVE'
      RETURNING *;
    `;

    try {
      const res = await query(updateSQL, [sevak_id, remarks]);
      return res.rows;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        const deactivated = [];
        for (const a of inMemoryAssignments.values()) {
          if (a.sevak_id === sevak_id && a.status === 'ACTIVE') {
            a.status = 'INACTIVE';
            a.unassigned_at = new Date();
            if (remarks) a.remarks = remarks;
            a.updated_at = new Date();
            deactivated.push(a);
          }
        }
        return deactivated;
      }
      throw dbErr;
    }
  },

  /**
   * Deactivate specific assignment between a Sevak and a Hospital
   * @param {string} sevak_id
   * @param {string} hospital_id
   * @param {string} [remarks]
   */
  async deactivateSpecificAssignment(sevak_id, hospital_id, remarks = null) {
    const updateSQL = `
      UPDATE public.hospital_sevak_assignments
      SET 
        status = 'INACTIVE', 
        unassigned_at = CURRENT_TIMESTAMP, 
        remarks = COALESCE($3, remarks),
        updated_at = CURRENT_TIMESTAMP
      WHERE sevak_id = $1 AND hospital_id = $2 AND status = 'ACTIVE'
      RETURNING *;
    `;

    try {
      const res = await query(updateSQL, [sevak_id, hospital_id, remarks]);
      return res.rows;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        const deactivated = [];
        for (const a of inMemoryAssignments.values()) {
          if (a.sevak_id === sevak_id && a.hospital_id === hospital_id && a.status === 'ACTIVE') {
            a.status = 'INACTIVE';
            a.unassigned_at = new Date();
            if (remarks) a.remarks = remarks;
            a.updated_at = new Date();
            deactivated.push(a);
          }
        }
        return deactivated;
      }
      throw dbErr;
    }
  },

  /**
   * Deactivate all active assignments for a specific hospital
   * @param {string} hospital_id
   * @param {string} [remarks]
   */
  async deactivateByHospitalId(hospital_id, remarks = null) {
    const updateSQL = `
      UPDATE public.hospital_sevak_assignments
      SET 
        status = 'INACTIVE', 
        unassigned_at = CURRENT_TIMESTAMP, 
        remarks = COALESCE($2, remarks),
        updated_at = CURRENT_TIMESTAMP
      WHERE hospital_id = $1 AND status = 'ACTIVE'
      RETURNING *;
    `;

    try {
      const res = await query(updateSQL, [hospital_id, remarks]);
      return res.rows;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        const deactivated = [];
        for (const a of inMemoryAssignments.values()) {
          if (a.hospital_id === hospital_id && a.status === 'ACTIVE') {
            a.status = 'INACTIVE';
            a.unassigned_at = new Date();
            if (remarks) a.remarks = remarks;
            a.updated_at = new Date();
            deactivated.push(a);
          }
        }
        return deactivated;
      }
      throw dbErr;
    }
  },

  /**
   * Assign multiple Arogya Sevaks to a specific hospital
   * @param {Object} params
   * @param {string} params.hospital_id
   * @param {string[]} params.sevak_ids
   * @param {string} [params.assigned_by]
   * @param {string} [params.remarks]
   */
  async assignSevaksToHospital({
    hospital_id,
    sevak_ids = [],
    assigned_by = null,
    remarks = null,
  }) {
    // 1. Deactivate current active assignments for this hospital
    await this.deactivateByHospitalId(hospital_id, remarks || 'Replaced with new sevaks selection');

    // 2. Insert new active assignments
    const newlyAssigned = [];
    const uniqueSevakIds = [...new Set(sevak_ids.filter(Boolean))];
    for (const sid of uniqueSevakIds) {
      const newAssignment = await this.create({
        hospital_id,
        sevak_id: sid,
        assigned_by,
        status: 'ACTIVE',
        remarks: remarks || 'Assigned by Admin',
      });
      newlyAssigned.push(newAssignment);
    }

    // 3. Return active sevaks for this hospital
    return this.findActiveSevaksByHospitalId(hospital_id);
  },

  /**
   * Assign an Arogya Sevak to multiple selected hospitals
   * @param {Object} params
   * @param {string} params.sevak_id
   * @param {string[]} params.hospital_ids
   * @param {string} [params.assigned_by]
   * @param {'replace'|'append'} [params.mode='replace']
   * @param {string} [params.remarks]
   */
  async assignSevakToHospitals({
    sevak_id,
    hospital_ids = [],
    assigned_by = null,
    mode = 'replace',
    remarks = null,
  }) {
    // 1. If replace mode, deactivate current active assignments not in hospital_ids
    if (mode === 'replace') {
      await this.deactivateBySevakId(sevak_id, remarks || 'Replaced with new hospital selection');
    }

    // 2. Query currently active hospital assignments for this sevak
    const currentActive = await this.findActiveHospitalsBySevakId(sevak_id);
    const activeHospitalIds = new Set(currentActive.map((a) => a.hospital_id));

    // 3. Insert assignments for hospitals not already actively assigned
    const newlyAssigned = [];
    for (const hid of hospital_ids) {
      if (!activeHospitalIds.has(hid)) {
        const newAssignment = await this.create({
          hospital_id: hid,
          sevak_id,
          assigned_by,
          status: 'ACTIVE',
          remarks: remarks || 'Assigned by Admin',
        });
        newlyAssigned.push(newAssignment);
      }
    }

    // 4. Return all current active assignments for this sevak
    return this.findActiveHospitalsBySevakId(sevak_id);
  },

  /**
   * Find all active Sevaks assigned to a specific hospital
   * @param {string} hospital_id
   */
  async findActiveSevaksByHospitalId(hospital_id) {
    const selectSQL = `
      SELECT 
        hsa.id AS assignment_id,
        hsa.assigned_at,
        hsa.remarks AS assignment_remarks,
        s.id AS sevak_id,
        s.employee_code,
        s.phone,
        s.joining_date,
        s.status AS sevak_status,
        u.id AS user_id,
        u.full_name,
        u.mobile,
        u.email,
        u.status AS user_status
      FROM public.hospital_sevak_assignments hsa
      JOIN public.arogya_sevaks s ON hsa.sevak_id = s.id
      JOIN public.users u ON s.user_id = u.id
      WHERE hsa.hospital_id = $1 AND hsa.status = 'ACTIVE'
      ORDER BY hsa.assigned_at DESC;
    `;

    try {
      const res = await query(selectSQL, [hospital_id]);
      return res.rows;
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || !process.env.DATABASE_URL) {
        const active = [];
        for (const a of inMemoryAssignments.values()) {
          if (a.hospital_id === hospital_id && a.status === 'ACTIVE') {
            active.push(a);
          }
        }
        return active;
      }
      throw dbErr;
    }
  },
};

export default HospitalSevakAssignmentModel;
