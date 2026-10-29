import { query } from '../config/db.js';

/**
 * District Model / DAO
 */
export const DistrictModel = {
  /**
   * Find all active districts
   */
  async findAll({ search, limit = 100, offset = 0 } = {}) {
    const conditions = ['is_active = true'];
    const values = [];
    let idx = 1;

    if (search) {
      conditions.push(`(name_english ILIKE $${idx} OR name_marathi ILIKE $${idx} OR district_code ILIKE $${idx} OR code ILIKE $${idx} OR names::text ILIKE $${idx})`);
      values.push(`%${search.trim()}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT id, district_code, code, name_english, name_marathi, names, is_active, created_at, updated_at
      FROM public.districts
      ${whereClause}
      ORDER BY name_english ASC
      LIMIT $${idx} OFFSET $${idx + 1};
    `;
    values.push(limit, offset);

    const res = await query(sql, values);
    return res.rows;
  },

  /**
   * Find district by canonical alpha code (e.g. 'MH-PUN') or legacy district_code (e.g. '490')
   * @param {string} codeOrDistrictCode
   */
  async findByCode(codeOrDistrictCode) {
    if (!codeOrDistrictCode) return null;
    const res = await query(
      'SELECT * FROM public.districts WHERE UPPER(code) = UPPER($1) OR district_code = $1 LIMIT 1',
      [codeOrDistrictCode.trim()]
    );
    return res.rows[0] || null;
  },

  /**
   * Find district by UUID id
   * @param {string} id
   */
  async findById(id) {
    if (!id) return null;
    const res = await query(
      'SELECT * FROM public.districts WHERE id = $1 LIMIT 1',
      [id]
    );
    return res.rows[0] || null;
  }
};

export default DistrictModel;
