import { query } from '../config/db.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let tableEnsured = false;

// In-memory fallback map (Keyed by id, and cached by specialty)
const inMemoryPackages = new Map();

/**
 * Robust CSV Line Parser
 */
const parseCSVLine = (text) => {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(cur.trim().replace(/^["']|["']$/g, ''));
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur.trim().replace(/^["']|["']$/g, ''));
  return result;
};

/**
 * Seed initial data from package_master_seed.csv
 */
async function seedSeedCsvData() {
  try {
    const seedPath = path.resolve(__dirname, '../data/package_master_seed.csv');
    if (!fs.existsSync(seedPath)) return;

    const content = fs.readFileSync(seedPath, 'utf8');
    const lines = content.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return;

    const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/[\s_-]+/g, ''));

    // Check existing count in DB
    let needDbSeed = true;
    try {
      const checkRes = await query(`SELECT COUNT(*) as count FROM public.package_master WHERE package_name IS NOT NULL AND package_name != '';`);
      if (checkRes?.rows?.[0] && parseInt(checkRes.rows[0].count, 10) > 100) {
        needDbSeed = false;
      }
    } catch {
      needDbSeed = true;
    }

    console.log(`[PackageMasterModel] Seeding seed CSV (needDbSeed: ${needDbSeed}, lines: ${lines.length - 1})...`);

    const batchItems = [];

    for (let i = 1; i < lines.length; i++) {
      const vals = parseCSVLine(lines[i]);
      if (vals.length < 2) continue;

      const row = {};
      headers.forEach((h, idx) => {
        row[h] = vals[idx] || '';
      });

      // Headers: Specialty, Specialty Code, Package Code, Package Name, Procedure Code
      const specialty = row.specialty || row.speciality || vals[0] || '';
      const specialty_code = row.specialtycode || vals[1] || '';
      const package_code = row.packagecode || vals[2] || '';
      const package_name = row.packagename || row.procedurename || vals[3] || '';
      const procedure_code = row.procedurecode || vals[4] || package_code || '';

      if (!specialty || (!package_name && !procedure_code)) continue;

      const id = crypto.randomUUID ? crypto.randomUUID() : `pkg-${Date.now()}-${Math.random()}`;
      const item = {
        id,
        specialty: specialty.trim(),
        specialty_code: specialty_code.trim(),
        package_code: package_code.trim(),
        package_name: package_name.trim(),
        procedure_code: procedure_code.trim(),
        procedure_name: package_name.trim(),
        category: 'General',
        category_id: 'general',
        description: '',
        estimated_cost: 0,
        preauth_required: true,
        status: 'Active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      inMemoryPackages.set(id, item);
      batchItems.push(item);
    }

    if (needDbSeed && batchItems.length > 0) {
      const chunkSize = 150;
      for (let i = 0; i < batchItems.length; i += chunkSize) {
        const chunk = batchItems.slice(i, i + chunkSize);
        const valueClauses = [];
        const params = [];

        chunk.forEach((it) => {
          const idx = params.length;
          params.push(
            it.specialty,
            it.specialty_code,
            it.package_code,
            it.package_name,
            it.procedure_code,
            it.procedure_name,
            it.category,
            it.status
          );
          valueClauses.push(
            `($${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, $${idx + 6}, $${idx + 7}, $${idx + 8})`
          );
        });

        try {
          await query(
            `INSERT INTO public.package_master 
             (specialty, specialty_code, package_code, package_name, procedure_code, procedure_name, category, status)
             VALUES ${valueClauses.join(', ')}
             ON CONFLICT (specialty, procedure_code) 
             DO UPDATE SET 
               package_code = EXCLUDED.package_code,
               package_name = EXCLUDED.package_name,
               procedure_name = EXCLUDED.procedure_name,
               specialty_code = EXCLUDED.specialty_code,
               updated_at = CURRENT_TIMESTAMP;`,
            params
          );
        } catch (e) {
          console.warn('[PackageMasterModel] Batch insert chunk error:', e.message);
        }
      }
    }

    console.log(`[PackageMasterModel] Seed CSV processed. Total cached in-memory: ${inMemoryPackages.size}`);
  } catch (err) {
    console.warn('[PackageMasterModel] Seed CSV processing warning:', err.message);
  }
}

/**
 * Ensure database table creation and schema migration
 */
async function ensurePackageMasterTable() {
  if (tableEnsured) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS public.package_master (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        specialty TEXT NOT NULL,
        specialty_code TEXT,
        package_code TEXT,
        package_name TEXT,
        procedure_code TEXT NOT NULL,
        procedure_name TEXT,
        category TEXT DEFAULT 'General',
        category_id TEXT DEFAULT 'general',
        description TEXT,
        estimated_cost DECIMAL(12, 2) DEFAULT 0.00,
        preauth_required BOOLEAN DEFAULT TRUE,
        status VARCHAR(50) DEFAULT 'Active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE public.package_master ALTER COLUMN specialty TYPE TEXT;
      ALTER TABLE public.package_master ALTER COLUMN specialty_code TYPE TEXT;
      ALTER TABLE public.package_master ALTER COLUMN procedure_code TYPE TEXT;
      ALTER TABLE public.package_master ALTER COLUMN procedure_name DROP NOT NULL;
      ALTER TABLE public.package_master ADD COLUMN IF NOT EXISTS package_code TEXT;
      ALTER TABLE public.package_master ADD COLUMN IF NOT EXISTS package_name TEXT;
      ALTER TABLE public.package_master ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active';

      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'uq_pkg_spec_proc'
        ) THEN
          ALTER TABLE public.package_master ADD CONSTRAINT uq_pkg_spec_proc UNIQUE (specialty, procedure_code);
        END IF;
      END $$;

      CREATE INDEX IF NOT EXISTS idx_pkg_spec ON public.package_master(specialty);
      CREATE INDEX IF NOT EXISTS idx_pkg_spec_code ON public.package_master(specialty_code);
      CREATE INDEX IF NOT EXISTS idx_pkg_package_code ON public.package_master(package_code);
      CREATE INDEX IF NOT EXISTS idx_pkg_package_name ON public.package_master(package_name);
      CREATE INDEX IF NOT EXISTS idx_pkg_proc_code ON public.package_master(procedure_code);
    `);

    tableEnsured = true;
    await seedSeedCsvData();
  } catch (err) {
    console.warn('[PackageMasterModel] Table init warning:', err.message);
    await seedSeedCsvData();
  }
}

export const PackageMasterModel = {
  /**
   * Return Key-Value dictionary where Key = Specialty and Value = Array of UNIQUE Packages
   * e.g. { "Burns Management": { specialty, specialty_code, count, procedures: [ { package_code: "BM001", package_name: "Thermal burns", procedure_codes: [...] }, ... ] } }
   */
  async getBySpecialtyMap({ search = '', specialty = '' } = {}) {
    await ensurePackageMasterTable();
    try {
      let sql = `
        SELECT 
          MIN(id::text) as id,
          specialty,
          MAX(specialty_code) as specialty_code,
          COALESCE(package_code, procedure_code) as package_code,
          COALESCE(package_name, procedure_name) as package_name,
          MAX(category) as category,
          MAX(category_id) as category_id,
          MAX(description) as description,
          MAX(estimated_cost) as estimated_cost,
          bool_or(preauth_required) as preauth_required,
          MAX(status) as status,
          COUNT(*) as procedure_count,
          array_agg(procedure_code ORDER BY procedure_code ASC) as procedure_codes
        FROM public.package_master
        WHERE 1=1
      `;
      const params = [];

      if (search) {
        params.push(`%${search.trim().toLowerCase()}%`);
        sql += ` AND (
          LOWER(COALESCE(package_name, procedure_name, '')) LIKE $${params.length} 
          OR LOWER(COALESCE(package_code, '')) LIKE $${params.length} 
          OR LOWER(procedure_code) LIKE $${params.length} 
          OR LOWER(specialty) LIKE $${params.length}
        )`;
      }

      if (specialty) {
        params.push(specialty.trim());
        sql += ` AND (specialty = $${params.length} OR specialty_code = $${params.length})`;
      }

      sql += `
        GROUP BY specialty, COALESCE(package_code, procedure_code), COALESCE(package_name, procedure_name)
        ORDER BY specialty ASC, package_code ASC;
      `;

      const res = await query(sql, params);
      const rows = res?.rows || [];

      if (rows.length > 0) {
        const map = {};
        rows.forEach((r) => {
          const key = r.specialty;
          if (!map[key]) {
            map[key] = {
              specialty: key,
              specialty_code: r.specialty_code || '',
              count: 0,
              procedures: []
            };
          }
          map[key].procedures.push({
            id: r.id,
            package_code: r.package_code,
            package_name: r.package_name,
            procedure_code: r.procedure_codes?.[0] || r.package_code,
            procedure_codes: r.procedure_codes || [],
            procedure_count: parseInt(r.procedure_count, 10) || 1,
            specialty_code: r.specialty_code || '',
            category: r.category || 'General',
            estimated_cost: r.estimated_cost || 0,
            preauth_required: r.preauth_required,
            status: r.status || 'Active'
          });
          map[key].count += 1;
        });

        return map;
      }
    } catch (err) {
      console.warn('[PackageMasterModel.getBySpecialtyMap] Fallback to in-memory:', err.message);
    }

    // In-memory fallback grouping by unique package
    const map = {};
    const pkgMap = new Map();
    for (const r of inMemoryPackages.values()) {
      if (specialty && r.specialty !== specialty && r.specialty_code !== specialty) continue;
      if (search) {
        const q = search.toLowerCase().trim();
        const match =
          (r.package_name && r.package_name.toLowerCase().includes(q)) ||
          (r.procedure_name && r.procedure_name.toLowerCase().includes(q)) ||
          (r.package_code && r.package_code.toLowerCase().includes(q)) ||
          (r.procedure_code && r.procedure_code.toLowerCase().includes(q)) ||
          (r.specialty && r.specialty.toLowerCase().includes(q));
        if (!match) continue;
      }
      
      const pkgKey = `${r.specialty}____${r.package_code || r.procedure_code}____${r.package_name || r.procedure_name}`;
      if (!pkgMap.has(pkgKey)) {
        pkgMap.set(pkgKey, {
          id: r.id,
          specialty: r.specialty,
          specialty_code: r.specialty_code || '',
          package_code: r.package_code || r.procedure_code,
          package_name: r.package_name || r.procedure_name,
          procedure_code: r.procedure_code,
          procedure_codes: [r.procedure_code],
          procedure_count: 1,
          category: r.category || 'General',
          estimated_cost: r.estimated_cost || 0,
          preauth_required: r.preauth_required,
          status: r.status || 'Active'
        });
      } else {
        const existing = pkgMap.get(pkgKey);
        if (r.procedure_code && !existing.procedure_codes.includes(r.procedure_code)) {
          existing.procedure_codes.push(r.procedure_code);
          existing.procedure_count += 1;
        }
      }
    }

    for (const pkg of pkgMap.values()) {
      const key = pkg.specialty;
      if (!map[key]) {
        map[key] = {
          specialty: key,
          specialty_code: pkg.specialty_code || '',
          count: 0,
          procedures: []
        };
      }
      map[key].procedures.push(pkg);
      map[key].count += 1;
    }
    return map;
  },

  /**
   * Find all individual procedures / packages with search, filter, pagination
   */
  async findAll({ search = '', specialty = '', status = '', limit = 10000, offset = 0 } = {}) {
    await ensurePackageMasterTable();
    try {
      let sql = `SELECT * FROM public.package_master WHERE 1=1`;
      const params = [];

      if (search) {
        params.push(`%${search.trim().toLowerCase()}%`);
        sql += ` AND (
          LOWER(COALESCE(package_name, procedure_name, '')) LIKE $${params.length} 
          OR LOWER(COALESCE(package_code, '')) LIKE $${params.length} 
          OR LOWER(procedure_code) LIKE $${params.length} 
          OR LOWER(specialty) LIKE $${params.length}
        )`;
      }

      if (specialty) {
        params.push(specialty.trim());
        sql += ` AND (specialty = $${params.length} OR specialty_code = $${params.length})`;
      }

      if (status) {
        params.push(status.trim());
        sql += ` AND status = $${params.length}`;
      }

      sql += ` ORDER BY specialty ASC, COALESCE(package_code, procedure_code) ASC, procedure_code ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2};`;
      params.push(limit, offset);

      const res = await query(sql, params);
      if (res?.rows && res.rows.length > 0) return res.rows;
    } catch (err) {
      console.warn('[PackageMasterModel.findAll] Fallback:', err.message);
    }

    let list = Array.from(inMemoryPackages.values());
    if (specialty) list = list.filter((p) => p.specialty === specialty || p.specialty_code === specialty);
    if (status) list = list.filter((p) => p.status === status);
    if (search) {
      const q = search.toLowerCase().trim();
      list = list.filter((p) =>
        (p.package_name && p.package_name.toLowerCase().includes(q)) ||
        (p.procedure_name && p.procedure_name.toLowerCase().includes(q)) ||
        (p.package_code && p.package_code.toLowerCase().includes(q)) ||
        (p.procedure_code && p.procedure_code.toLowerCase().includes(q)) ||
        (p.specialty && p.specialty.toLowerCase().includes(q))
      );
    }
    return list.slice(offset, offset + limit);
  },

  /**
   * Get list of all distinct specialties with UNIQUE package counts
   */
  async getSpecialtiesList() {
    await ensurePackageMasterTable();
    try {
      const res = await query(`
        SELECT 
          specialty, 
          COALESCE(MAX(specialty_code), '') as specialty_code,
          COUNT(DISTINCT COALESCE(package_code, procedure_code)) as procedure_count
        FROM public.package_master
        GROUP BY specialty
        ORDER BY specialty ASC;
      `);
      if (res?.rows && res.rows.length > 0) return res.rows;
    } catch (err) {
      console.warn('[PackageMasterModel.getSpecialtiesList] Fallback:', err.message);
    }

    const counts = {};
    const seen = new Set();
    for (const p of inMemoryPackages.values()) {
      const spec = p.specialty;
      const key = `${spec}____${p.package_code || p.procedure_code}`;
      if (!counts[spec]) {
        counts[spec] = { specialty: spec, specialty_code: p.specialty_code || '', procedure_count: 0 };
      }
      if (!seen.has(key)) {
        seen.add(key);
        counts[spec].procedure_count += 1;
      }
    }
    return Object.values(counts);
  },

  /**
   * Create or Upsert a single procedure/package
   */
  async create({
    specialty,
    specialty_code = '',
    package_code = '',
    package_name = '',
    procedure_code,
    procedure_name = '',
    category = 'General',
    category_id = 'general',
    description = '',
    estimated_cost = 0,
    preauth_required = true,
    status = 'Active'
  }) {
    await ensurePackageMasterTable();
    const pkgName = package_name || procedure_name;
    if (!specialty || !pkgName) {
      throw new Error('Specialty and Package Name are required.');
    }

    const procCode = procedure_code || package_code || `${(specialty_code || specialty.slice(0, 3)).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const pkgCode = package_code || procCode;

    try {
      const res = await query(
        `INSERT INTO public.package_master 
         (specialty, specialty_code, package_code, package_name, procedure_code, procedure_name, category, category_id, description, estimated_cost, preauth_required, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (specialty, procedure_code) 
         DO UPDATE SET 
           package_code = EXCLUDED.package_code,
           package_name = EXCLUDED.package_name,
           procedure_name = EXCLUDED.procedure_name,
           specialty_code = EXCLUDED.specialty_code,
           category = EXCLUDED.category,
           description = EXCLUDED.description,
           estimated_cost = EXCLUDED.estimated_cost,
           preauth_required = EXCLUDED.preauth_required,
           status = EXCLUDED.status,
           updated_at = CURRENT_TIMESTAMP
         RETURNING *;`,
        [specialty, specialty_code, pkgCode, pkgName, procCode, pkgName, category, category_id, description, estimated_cost, preauth_required, status]
      );
      if (res?.rows?.[0]) {
        inMemoryPackages.set(String(res.rows[0].id), res.rows[0]);
        return res.rows[0];
      }
    } catch (err) {
      console.warn('[PackageMasterModel.create] DB insert error, fallback in-memory:', err.message);
    }

    const id = crypto.randomUUID ? crypto.randomUUID() : `pkg-${Date.now()}`;
    const newPkg = {
      id,
      specialty,
      specialty_code,
      package_code: pkgCode,
      package_name: pkgName,
      procedure_code: procCode,
      procedure_name: pkgName,
      category,
      category_id,
      description,
      estimated_cost: Number(estimated_cost || 0),
      preauth_required: Boolean(preauth_required),
      status: status || 'Active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    inMemoryPackages.set(id, newPkg);
    return newPkg;
  },

  /**
   * Update a procedure/package by ID
   */
  async update(id, updates = {}) {
    await ensurePackageMasterTable();
    try {
      const setClauses = [];
      const params = [];
      const allowedFields = [
        'specialty',
        'specialty_code',
        'package_code',
        'package_name',
        'procedure_code',
        'procedure_name',
        'category',
        'category_id',
        'description',
        'estimated_cost',
        'preauth_required',
        'status'
      ];

      // If package_name is updated, also sync procedure_name if needed
      if (updates.package_name && !updates.procedure_name) {
        updates.procedure_name = updates.package_name;
      }

      allowedFields.forEach((field) => {
        if (updates[field] !== undefined) {
          params.push(updates[field]);
          setClauses.push(`${field} = $${params.length}`);
        }
      });

      if (setClauses.length > 0) {
        setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
        params.push(id);
        const sql = `UPDATE public.package_master SET ${setClauses.join(', ')} WHERE id = $${params.length}::uuid OR id::text = $${params.length} RETURNING *;`;
        const res = await query(sql, params);
        if (res?.rows?.[0]) {
          inMemoryPackages.set(String(res.rows[0].id), res.rows[0]);
          return res.rows[0];
        }
      }
    } catch (err) {
      console.warn('[PackageMasterModel.update] DB update error, fallback in-memory:', err.message);
    }

    if (inMemoryPackages.has(String(id))) {
      const existing = inMemoryPackages.get(String(id));
      const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
      inMemoryPackages.set(String(id), updated);
      return updated;
    }
    return null;
  },

  /**
   * Bulk import array of packages/procedures
   */
  async bulkCreate(records = []) {
    await ensurePackageMasterTable();
    if (!Array.isArray(records) || records.length === 0) {
      return { inserted: 0, failed: 0, items: [] };
    }

    let insertedCount = 0;
    let failedCount = 0;
    const insertedItems = [];

    for (const raw of records) {
      const specialty = raw.specialty || raw.Specialty || raw['Specialty Name'];
      const specialty_code = raw.specialty_code || raw['Specialty Code'] || raw.specialtyCode || '';
      const package_code = raw.package_code || raw['Package Code'] || raw.packageCode || '';
      const package_name = raw.package_name || raw['Package Name'] || raw.packageName || raw.procedure_name || raw['Procedure Name'] || '';
      const procedure_code = raw.procedure_code || raw['Procedure Code'] || raw.procedureCode || package_code || '';

      if (!specialty || (!package_name && !procedure_code)) {
        failedCount++;
        continue;
      }

      try {
        const item = await this.create({
          specialty: String(specialty).trim(),
          specialty_code: String(specialty_code).trim(),
          package_code: String(package_code).trim(),
          package_name: String(package_name).trim(),
          procedure_code: String(procedure_code).trim(),
          procedure_name: String(package_name).trim(),
          category: raw.category || 'General',
          estimated_cost: parseFloat(raw.estimated_cost || raw.cost || '0') || 0,
          preauth_required: raw.preauth_required !== false,
          status: raw.status || 'Active'
        });
        insertedItems.push(item);
        insertedCount++;
      } catch (e) {
        failedCount++;
      }
    }

    return {
      inserted: insertedCount,
      failed: failedCount,
      items: insertedItems
    };
  },

  /**
   * Delete by ID
   */
  async delete(id) {
    await ensurePackageMasterTable();
    try {
      await query(`DELETE FROM public.package_master WHERE id = $1::uuid OR id::text = $1;`, [id]);
    } catch (err) {
      console.warn('[PackageMasterModel.delete] Fallback:', err.message);
    }
    inMemoryPackages.delete(id);
    return true;
  }
};

export default PackageMasterModel;
