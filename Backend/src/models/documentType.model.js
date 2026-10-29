import { query } from '../config/db.js';

/**
 * DocumentType Model / Data Access Object
 * Maps to `public.document_types`
 */
export const DocumentTypeModel = {
  /**
   * Create a new document type configuration
   */
  async create({
    name,
    description = null,
    is_required = true,
    status = 'ACTIVE',
  }) {
    const sql = `
      INSERT INTO public.document_types (
        name,
        description,
        is_required,
        status,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *;
    `;
    const res = await query(sql, [name, description, is_required, status]);
    return res.rows[0];
  },

  /**
   * Find document type by UUID
   */
  async findById(id) {
    const sql = `SELECT * FROM public.document_types WHERE id = $1 LIMIT 1;`;
    const res = await query(sql, [id]);
    return res.rows[0] || null;
  },

  /**
   * Find all active document types
   */
  async findActive() {
    const sql = `
      SELECT * FROM public.document_types
      WHERE status = 'ACTIVE'
      ORDER BY is_required DESC, name ASC;
    `;
    const res = await query(sql);
    return res.rows;
  },

  /**
   * Find all document types with optional filters
   */
  async findAll({ status, is_required, limit = 100, offset = 0 } = {}) {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (status) {
      conditions.push(`status = $${idx}`);
      values.push(status);
      idx++;
    }

    if (is_required !== undefined) {
      conditions.push(`is_required = $${idx}`);
      values.push(is_required);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT * FROM public.document_types
      ${whereClause}
      ORDER BY name ASC
      LIMIT $${idx} OFFSET $${idx + 1};
    `;
    values.push(limit, offset);

    const res = await query(sql, values);
    return res.rows;
  },

  /**
   * Update document type
   */
  async update(id, updateData) {
    const allowedFields = ['name', 'description', 'is_required', 'status'];
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
      UPDATE public.document_types
      SET ${fieldsToUpdate.join(', ')}
      WHERE id = $${idx}
      RETURNING *;
    `;
    const res = await query(sql, values);
    return res.rows[0] || null;
  },

  /**
   * Delete document type
   */
  async delete(id) {
    const sql = `DELETE FROM public.document_types WHERE id = $1 RETURNING *;`;
    const res = await query(sql, [id]);
    return res.rows[0] || null;
  },
};

export default DocumentTypeModel;
