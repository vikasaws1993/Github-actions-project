import { query } from '../config/db.js';

let tableEnsured = false;
async function ensureDocColumns() {
  if (tableEnsured) return;
  try {
    await query(`
      ALTER TABLE public.application_documents ADD COLUMN IF NOT EXISTS category VARCHAR(50);
      ALTER TABLE public.application_documents ADD COLUMN IF NOT EXISTS file_size VARCHAR(50);
      ALTER TABLE public.application_documents ADD COLUMN IF NOT EXISTS source VARCHAR(20);
      ALTER TABLE public.application_documents ADD COLUMN IF NOT EXISTS is_sevak_upload BOOLEAN DEFAULT FALSE;
      ALTER TABLE public.application_documents ADD COLUMN IF NOT EXISTS uploaded_by_role VARCHAR(50);
      ALTER TABLE public.application_documents ADD COLUMN IF NOT EXISTS s3_key TEXT;
      ALTER TABLE public.application_documents ALTER COLUMN document_type_id DROP NOT NULL;
    `);
    tableEnsured = true;
  } catch (e) {
    console.warn('[ApplicationDocumentModel] Migration warning:', e.message);
  }
}

/**
 * ApplicationDocument Model / Data Access Object
 * Maps to `public.application_documents`
 */
export const ApplicationDocumentModel = {
  /**
   * Upload / register a new application document
   */
  async create({
    application_id,
    document_type_id = null,
    file_url,
    file_name,
    category = 'other',
    file_size = null,
    source = 'device',
    document_status = 'PENDING',
    verification_remark = null,
    uploaded_by_user_id,
    is_sevak_upload = false,
    uploaded_by_role = null,
    s3_key = null,
  }) {
    await ensureDocColumns();

    const sql = `
      INSERT INTO public.application_documents (
        application_id,
        document_type_id,
        file_url,
        file_name,
        category,
        file_size,
        source,
        document_status,
        verification_remark,
        uploaded_at,
        uploaded_by_user_id,
        is_sevak_upload,
        uploaded_by_role,
        s3_key
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, $10, $11, $12, $13)
      RETURNING *;
    `;
    const res = await query(sql, [
      application_id,
      document_type_id,
      file_url,
      file_name,
      category,
      file_size,
      source,
      document_status.toUpperCase(),
      verification_remark,
      uploaded_by_user_id,
      Boolean(is_sevak_upload),
      uploaded_by_role,
      s3_key || null,
    ]);
    return res.rows[0];
  },

  /**
   * Batch create multiple documents for an application
   */
  async batchCreate(applicationId, userId, documents = []) {
    const created = [];
    for (const doc of documents) {
      let finalUrl = doc.file_url || doc.uri || doc.url || doc.secureUrl || doc.base64 || '';

      if (!finalUrl || typeof finalUrl !== 'string') {
        finalUrl = doc.file_url || '';
      }

      const rec = await this.create({
        application_id: applicationId,
        document_type_id: doc.document_type_id || null,
        file_url: finalUrl,
        file_name: doc.name || doc.file_name || 'Document.pdf',
        category: doc.category || 'other',
        file_size: doc.size || doc.file_size || null,
        source: doc.source || 'device',
        uploaded_by_user_id: userId,
      });
      created.push(rec);
    }
    return created;
  },

  /**
   * Find document by UUID
   */
  async findById(id) {
    await ensureDocColumns();
    const sql = `
      SELECT 
        ad.*,
        dt.name AS document_type_name,
        dt.description AS document_type_description,
        dt.is_required,
        u_up.full_name AS uploaded_by_name,
        u_up.role AS uploaded_by_role,
        u_ver.full_name AS verified_by_name
      FROM public.application_documents ad
      LEFT JOIN public.document_types dt ON ad.document_type_id = dt.id
      LEFT JOIN public.users u_up ON ad.uploaded_by_user_id = u_up.id
      LEFT JOIN public.users u_ver ON ad.verified_by_user_id = u_ver.id
      WHERE ad.id = $1
      LIMIT 1;
    `;
    const res = await query(sql, [id]);
    return res.rows[0] || null;
  },

  /**
   * Find all documents belonging to an application
   */
  async findByApplicationId(applicationId) {
    await ensureDocColumns();
    const sql = `
      SELECT 
        ad.*,
        dt.name AS document_type_name,
        dt.description AS document_type_description,
        dt.is_required,
        u_up.full_name AS uploaded_by_name,
        u_up.role AS uploaded_by_role,
        u_ver.full_name AS verified_by_name
      FROM public.application_documents ad
      LEFT JOIN public.document_types dt ON ad.document_type_id = dt.id
      LEFT JOIN public.users u_up ON ad.uploaded_by_user_id = u_up.id
      LEFT JOIN public.users u_ver ON ad.verified_by_user_id = u_ver.id
      WHERE ad.application_id = $1
      ORDER BY ad.uploaded_at ASC;
    `;
    const res = await query(sql, [applicationId]);
    return res.rows;
  },

  /**
   * Update document verification status
   */
  async updateVerificationStatus(id, { document_status, verification_remark = null, verified_by_user_id }) {
    await ensureDocColumns();
    const sql = `
      UPDATE public.application_documents
      SET 
        document_status = $1,
        verification_remark = COALESCE($2, verification_remark),
        verified_by_user_id = $3,
        verified_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *;
    `;
    const res = await query(sql, [document_status.toUpperCase(), verification_remark, verified_by_user_id, id]);
    return res.rows[0] || null;
  },

  /**
   * Update document details (such as after Sevak upload)
   */
  async update(id, fields = {}) {
    await ensureDocColumns();
    const setClauses = [];
    const values = [];
    let idx = 1;

    if (fields.file_url !== undefined) {
      setClauses.push(`file_url = $${idx++}`);
      values.push(fields.file_url);
    }
    if (fields.s3_key !== undefined) {
      setClauses.push(`s3_key = $${idx++}`);
      values.push(fields.s3_key);
    }
    if (fields.file_name !== undefined) {
      setClauses.push(`file_name = $${idx++}`);
      values.push(fields.file_name);
    }
    if (fields.category !== undefined) {
      setClauses.push(`category = $${idx++}`);
      values.push(fields.category);
    }
    if (fields.document_status !== undefined) {
      setClauses.push(`document_status = $${idx++}`);
      values.push(fields.document_status);
    }
    if (fields.is_sevak_upload !== undefined) {
      setClauses.push(`is_sevak_upload = $${idx++}`);
      values.push(fields.is_sevak_upload);
    }
    if (fields.uploaded_by_role !== undefined) {
      setClauses.push(`uploaded_by_role = $${idx++}`);
      values.push(fields.uploaded_by_role);
    }
    if (fields.verification_remark !== undefined) {
      setClauses.push(`verification_remark = $${idx++}`);
      values.push(fields.verification_remark);
    }
    if (fields.uploaded_by_user_id !== undefined) {
      setClauses.push(`uploaded_by_user_id = $${idx++}`);
      values.push(fields.uploaded_by_user_id);
    }
    setClauses.push(`uploaded_at = CURRENT_TIMESTAMP`);

    values.push(id);
    const sql = `
      UPDATE public.application_documents
      SET ${setClauses.join(', ')}
      WHERE id = $${idx}
      RETURNING *;
    `;
    const res = await query(sql, values);
    return res.rows[0] || null;
  },

  /**
   * Delete document by UUID
   */
  async delete(id) {
    const sql = `DELETE FROM public.application_documents WHERE id = $1 RETURNING *;`;
    const res = await query(sql, [id]);
    return res.rows[0] || null;
  },
};

export default ApplicationDocumentModel;
