import { query } from '../config/db.js';

/**
 * Disallowed PII key patterns to ensure audit logs NEVER contain PII.
 */
const FORBIDDEN_PII_KEYS = [
  'name',
  'full_name',
  'patient_name',
  'citizen_name',
  'mobile',
  'mobile_number',
  'phone',
  'email',
  'aadhaar',
  'aadhaar_number',
  'pan',
  'pan_number',
  'address',
  'address_line',
  'medical_condition',
  'diagnosis',
  'treatment_type',
  'treatment_description',
  'findings',
  'prescription_file_url',
  'discharge_summary_url',
  'file_url',
  'notes',
];

/**
 * Recursively sanitize metadata object to strip out any PII.
 */
export function sanitizeAuditMetadata(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeAuditMetadata(item));
  }

  const cleaned = {};
  for (const [key, value] of Object.entries(data)) {
    const isForbidden = FORBIDDEN_PII_KEYS.some(
      (forbidden) => key.toLowerCase() === forbidden || key.toLowerCase().includes(forbidden)
    );
    if (!isForbidden) {
      cleaned[key] = typeof value === 'object' && value !== null
        ? sanitizeAuditMetadata(value)
        : value;
    }
  }
  return cleaned;
}

/**
 * Audit Log Model
 * Strictly non-PII operational audit trail
 */
export const AuditLogModel = {
  /**
   * Create an audit log record
   */
  async create({
    action = 'ARCHIVE',
    entity_type = 'CASE',
    job_name = 'CLOSED_CASE_ARCHIVAL_JOB',
    records_count = 0,
    status = 'SUCCESS',
    error_message = null,
    metadata = {},
    execution_timestamp = new Date(),
  }, client = null) {
    const sanitizedMetadata = sanitizeAuditMetadata(metadata);

    const sql = `
      INSERT INTO public.audit_logs (
        action,
        entity_type,
        job_name,
        records_count,
        status,
        error_message,
        metadata,
        execution_timestamp,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      RETURNING *;
    `;

    const values = [
      action,
      entity_type,
      job_name,
      records_count,
      status,
      error_message,
      JSON.stringify(sanitizedMetadata),
      execution_timestamp,
    ];

    const executor = client ? client.query.bind(client) : query;
    const res = await executor(sql, values);
    return res.rows[0];
  },

  /**
   * Find audit log by ID
   */
  async findById(id) {
    const sql = `SELECT * FROM public.audit_logs WHERE id = $1 LIMIT 1;`;
    const res = await query(sql, [id]);
    return res.rows[0] || null;
  },

  /**
   * Find latest audit log for a job
   */
  async findLatestByJobName(jobName) {
    const sql = `
      SELECT * FROM public.audit_logs 
      WHERE job_name = $1 
      ORDER BY execution_timestamp DESC 
      LIMIT 1;
    `;
    const res = await query(sql, [jobName]);
    return res.rows[0] || null;
  },

  /**
   * Find all audit logs with filtering
   */
  async findAll({ job_name, action, status, limit = 50, offset = 0 } = {}) {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (job_name) {
      conditions.push(`job_name = $${idx}`);
      values.push(job_name);
      idx++;
    }

    if (action) {
      conditions.push(`action = $${idx}`);
      values.push(action);
      idx++;
    }

    if (status) {
      conditions.push(`status = $${idx}`);
      values.push(status);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT * FROM public.audit_logs
      ${whereClause}
      ORDER BY execution_timestamp DESC
      LIMIT $${idx} OFFSET $${idx + 1};
    `;
    values.push(limit, offset);

    const res = await query(sql, values);
    return res.rows;
  },
};

export default AuditLogModel;
