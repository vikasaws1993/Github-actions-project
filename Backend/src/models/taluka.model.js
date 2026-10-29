import { query } from '../config/db.js';

/**
 * Taluka Model / DAO
 */
export const TalukaModel = {
  /**
   * Find talukas by district_code or district UUID
   * @param {string} districtCodeOrId
   */
  async findByDistrictCode(districtCodeOrId) {
    const sql = `
      SELECT t.id, t.district_code, t.district_id, t.subdistrict_code, t.code, t.names, t.name_english, t.name_marathi, t.is_active
      FROM public.talukas t
      WHERE (t.district_code = $1 OR t.district_id::text = $1) AND t.is_active = true
      ORDER BY t.name_english ASC;
    `;
    const res = await query(sql, [districtCodeOrId]);
    return res.rows;
  },

  /**
   * Find all talukas with optional search and district filter
   */
  async findAll({ district_code, search, limit = 500, offset = 0 } = {}) {
    const conditions = ['t.is_active = true'];
    const values = [];
    let idx = 1;

    if (district_code) {
      conditions.push(`(t.district_code = $${idx} OR t.district_id::text = $${idx} OR d.code = $${idx})`);
      values.push(district_code);
      idx++;
    }

    if (search) {
      conditions.push(`(t.name_english ILIKE $${idx} OR t.name_marathi ILIKE $${idx} OR t.subdistrict_code ILIKE $${idx} OR t.code ILIKE $${idx} OR t.names::text ILIKE $${idx})`);
      values.push(`%${search.trim()}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT 
        t.id, 
        t.district_code, 
        t.district_id,
        t.code,
        t.names,
        d.name_english AS district_name_en,
        d.name_marathi AS district_name_mr,
        d.code AS district_canonical_code,
        d.names AS district_names,
        t.subdistrict_code, 
        t.name_english, 
        t.name_marathi, 
        t.is_active
      FROM public.talukas t
      LEFT JOIN public.districts d ON t.district_code = d.district_code OR t.district_id = d.id
      ${whereClause}
      ORDER BY d.name_english ASC, t.name_english ASC
      LIMIT $${idx} OFFSET $${idx + 1};
    `;
    values.push(limit, offset);

    const res = await query(sql, values);
    return res.rows;
  },

  /**
   * Find taluka by canonical code (e.g. 'MH-PUN-HAV') or subdistrict code (e.g. '4193')
   * @param {string} codeOrSubdistrictCode
   */
  async findByCode(codeOrSubdistrictCode) {
    if (!codeOrSubdistrictCode) return null;
    const sql = `
      SELECT t.*, d.name_english AS district_name_en, d.name_marathi AS district_name_mr, d.code AS district_canonical_code, d.names AS district_names
      FROM public.talukas t
      LEFT JOIN public.districts d ON t.district_code = d.district_code OR t.district_id = d.id
      WHERE UPPER(t.code) = UPPER($1) OR t.subdistrict_code = $1
      LIMIT 1;
    `;
    const res = await query(sql, [codeOrSubdistrictCode.trim()]);
    return res.rows[0] || null;
  }
};

export default TalukaModel;
