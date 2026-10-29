import { query, pool } from '../config/db.js';
import { config } from '../config/environment.js';
import { logger } from '../utils/logger.js';
import { ApplicationModel } from '../models/application.model.js';
import { CaseArchiveModel } from '../models/caseArchive.model.js';
import { AuditLogModel } from '../models/auditLog.model.js';

/**
 * Closed-Case Archival Service
 * Handles retention calculation, eligible case discovery, safe transactional archival,
 * and PII-free audit logging.
 */
export const ArchivalService = {
  /**
   * Calculate the retention cutoff date.
   * If a case's closure date is on or before cutoffDate, it is eligible for archival.
   * 
   * @param {Object} options
   * @param {number} [options.retentionDays] - Retention period in days (e.g. 60)
   * @param {number} [options.retentionYears] - Optional fallback retention period in years
   * @param {Date|string} [options.asOfDate] - Reference timestamp (defaults to current time)
   * @returns {Date} Cutoff date
   */
  calculateCutoffDate({ retentionDays, retentionYears, asOfDate = new Date() } = {}) {
    const reference = new Date(asOfDate);
    if (isNaN(reference.getTime())) {
      throw new Error('Invalid asOfDate provided for cutoff date calculation.');
    }

    // Determine days: prefer retentionDays, fallback to retentionYears * 365, fallback to config
    let days = retentionDays;
    if (days === undefined || days === null) {
      if (retentionYears !== undefined && retentionYears !== null) {
        days = retentionYears * 365;
      } else {
        days = config.archival?.retentionDays ?? 60;
      }
    }

    const cutoff = new Date(reference.getTime() - days * 24 * 60 * 60 * 1000);
    return cutoff;
  },

  /**
   * Find closed cases eligible for archival
   */
  async findEligibleCases({ retentionDays, retentionYears, asOfDate = new Date(), limit = 500 } = {}) {
    const cutoffDate = this.calculateCutoffDate({ retentionDays, retentionYears, asOfDate });
    return await ApplicationModel.findEligibleForArchival({ cutoffDate, limit });
  },

  /**
   * Archive a single case transactionally
   * Gathers case data snapshot, creates case_archive entry, and updates application status.
   */
  async archiveSingleCase(applicationId, { retentionDays = 60, client } = {}) {
    const executor = client ? client.query.bind(client) : query;

    // 1. Fetch application details
    const appRes = await executor(
      `SELECT * FROM public.applications WHERE id = $1 LIMIT 1 FOR UPDATE;`,
      [applicationId]
    );
    if (appRes.rows.length === 0) {
      throw new Error(`Application with id ${applicationId} not found.`);
    }
    const app = appRes.rows[0];

    // Safety check: only closed, unarchived cases
    if (app.current_status !== 'CLOSED') {
      throw new Error(`Cannot archive case ${applicationId}: current status is '${app.current_status}', must be 'CLOSED'.`);
    }
    if (app.is_archived) {
      throw new Error(`Cannot archive case ${applicationId}: case is already archived.`);
    }

    const closureDate = app.closed_at || app.completed_at || app.updated_at;

    // 2. Fetch related records sequentially on the client to create a self-contained archive snapshot
    const docsRes = await executor(`SELECT id, document_type_id, file_name, file_url, document_status, uploaded_at, verified_at FROM public.application_documents WHERE application_id = $1;`, [applicationId]);
    const historiesRes = await executor(`SELECT id, old_status, new_status, remark, created_at, changed_by_user_id FROM public.application_status_histories WHERE application_id = $1 ORDER BY created_at ASC;`, [applicationId]);
    const remarksRes = await executor(`SELECT id, remark_type, remark, created_at, created_by_user_id FROM public.application_remarks WHERE application_id = $1 ORDER BY created_at ASC;`, [applicationId]);
    const assessmentsRes = await executor(`SELECT id, scheme_id, eligibility_status, reason, remarks, assessed_at FROM public.scheme_assessments WHERE application_id = $1;`, [applicationId]);
    const claimsRes = await executor(`SELECT id, scheme_id, hospital_id, claim_number, claimed_amount, approved_amount, status, claim_date, approval_date FROM public.scheme_claims WHERE application_id = $1;`, [applicationId]);
    const medicalRes = await executor(`SELECT id, medical_condition, diagnosis, treatment_type, opd_ipd, admission_date, discharge_date, hospital_name FROM public.medical_records WHERE application_id = $1;`, [applicationId]);
    const billsRes = await executor(`SELECT id, hospital_id, bill_number, bill_date, total_amount, scheme_covered_amount, patient_payable_amount FROM public.patient_bills WHERE application_id = $1;`, [applicationId]);
    const assignmentsRes = await executor(`SELECT id, hospital_id, arogya_sevak_id, assignment_status, assigned_at, completed_at FROM public.application_assignments WHERE application_id = $1;`, [applicationId]);

    const archivedSnapshot = {
      application: {
        id: app.id,
        application_number: app.application_number,
        patient_id: app.patient_id,
        submitted_by_citizen_id: app.submitted_by_citizen_id,
        submitted_at: app.submitted_at,
        reviewed_at: app.reviewed_at,
        completed_at: app.completed_at,
        closed_at: app.closed_at,
        closure_date: closureDate,
      },
      documents: docsRes.rows,
      status_histories: historiesRes.rows,
      remarks: remarksRes.rows,
      scheme_assessments: assessmentsRes.rows,
      scheme_claims: claimsRes.rows,
      medical_records: medicalRes.rows,
      patient_bills: billsRes.rows,
      assignments: assignmentsRes.rows,
    };

    // 3. Insert into public.case_archives
    const archiveRecord = await CaseArchiveModel.create({
      application_id: app.id,
      application_number: app.application_number,
      patient_id: app.patient_id,
      citizen_id: app.submitted_by_citizen_id,
      closure_date: closureDate,
      retention_days: retentionDays,
      archived_data: archivedSnapshot,
    }, client);

    // 4. Mark application as archived
    await ApplicationModel.markAsArchived(app.id, client);

    // 5. Add an application status history entry for audit trail (look up user_id from citizen)
    const citizenRes = await executor(
      `SELECT user_id FROM public.citizens WHERE id = $1 LIMIT 1;`,
      [app.submitted_by_citizen_id]
    );
    const changedByUserId = citizenRes.rows[0]?.user_id;

    if (changedByUserId) {
      await executor(`
        INSERT INTO public.application_status_histories (
          application_id,
          old_status,
          new_status,
          remark,
          changed_by_user_id
        )
        VALUES ($1, 'CLOSED', 'ARCHIVED', 'Case automatically archived after retention period by system archival job', $2);
      `, [app.id, changedByUserId]);
    }

    return archiveRecord;
  },

  /**
   * Run the closed-case archival job
   * 
   * @param {Object} options
   * @param {boolean} [options.dryRun=false] - If true, identify eligible cases without modifying data
   * @param {Date|string} [options.asOfDate=new Date()] - Reference date for age evaluation
   * @param {number} [options.retentionDays] - Optional retention days override (defaults to config: 60)
   * @returns {Promise<Object>} Execution summary
   */
  async runArchivalJob({ dryRun = false, asOfDate = new Date(), retentionDays = null } = {}) {
    const startTime = Date.now();
    const effectiveRetentionDays = retentionDays ?? config.archival?.retentionDays ?? 60;
    let cutoffDate = null;

    try {
      cutoffDate = this.calculateCutoffDate({ retentionDays: effectiveRetentionDays, asOfDate });

      logger.info(
        `[ArchivalJob] Starting closed-case archival run (dryRun: ${dryRun}, retentionDays: ${effectiveRetentionDays}, cutoffDate: ${cutoffDate.toISOString()})`
      );

      // 1. Query eligible cases
      const eligibleCases = await ApplicationModel.findEligibleForArchival({
        cutoffDate,
        limit: 1000,
      });

      logger.info(`[ArchivalJob] Found ${eligibleCases.length} eligible closed case(s) for archival.`);

      // 2. Handle dry-run mode
      if (dryRun) {
        const duration = Date.now() - startTime;
        return {
          success: true,
          dryRun: true,
          retentionDays: effectiveRetentionDays,
          cutoffDate: cutoffDate.toISOString(),
          eligibleCount: eligibleCases.length,
          eligibleCaseIds: eligibleCases.map((c) => c.id),
          durationMs: duration,
        };
      }

      // 3. Execute archival transactionally per case
      const archivedIds = [];
      const failedCases = [];

      for (const caseItem of eligibleCases) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await this.archiveSingleCase(caseItem.id, {
            retentionDays: effectiveRetentionDays,
            client,
          });
          await client.query('COMMIT');
          archivedIds.push(caseItem.id);
        } catch (caseErr) {
          await client.query('ROLLBACK');
          logger.error(`[ArchivalJob] Failed to archive case ${caseItem.id}:`, caseErr.message);
          failedCases.push({ id: caseItem.id, error: caseErr.message });
        } finally {
          client.release();
        }
      }

      const duration = Date.now() - startTime;
      const status = failedCases.length === 0 ? 'SUCCESS' : (archivedIds.length > 0 ? 'PARTIAL_SUCCESS' : 'FAILED');

      // 4. Record strictly PII-free operational audit log
      const auditMetadata = {
        retention_days: effectiveRetentionDays,
        cutoff_date: cutoffDate.toISOString(),
        eligible_count: eligibleCases.length,
        archived_count: archivedIds.length,
        failed_count: failedCases.length,
        archived_case_ids: archivedIds,
        duration_ms: duration,
      };

      const auditRecord = await AuditLogModel.create({
        action: 'ARCHIVE',
        entity_type: 'CASE',
        job_name: 'CLOSED_CASE_ARCHIVAL_JOB',
        records_count: archivedIds.length,
        status: status === 'PARTIAL_SUCCESS' ? 'SUCCESS' : status,
        error_message: failedCases.length > 0 ? `Failed cases: ${failedCases.length}` : null,
        metadata: auditMetadata,
        execution_timestamp: new Date(),
      });

      logger.success(
        `[ArchivalJob] Archival completed in ${duration}ms. Successfully archived ${archivedIds.length}/${eligibleCases.length} cases. Audit Log ID: ${auditRecord.id}`
      );

      return {
        success: true,
        dryRun: false,
        retentionDays: effectiveRetentionDays,
        cutoffDate: cutoffDate.toISOString(),
        archivedCount: archivedIds.length,
        archivedCaseIds: archivedIds,
        failedCount: failedCases.length,
        auditLogId: auditRecord.id,
        durationMs: duration,
      };
    } catch (err) {
      const duration = Date.now() - startTime;
      logger.error('[ArchivalJob] Uncaught error during archival execution:', err.message);

      // Safe error handling: log failure in audit logs without leaking PII
      try {
        await AuditLogModel.create({
          action: 'ARCHIVE',
          entity_type: 'CASE',
          job_name: 'CLOSED_CASE_ARCHIVAL_JOB',
          records_count: 0,
          status: 'FAILED',
          error_message: err.message,
          metadata: {
            retention_days: effectiveRetentionDays,
            cutoff_date: cutoffDate ? cutoffDate.toISOString() : null,
            duration_ms: duration,
            error: err.message,
          },
          execution_timestamp: new Date(),
        });
      } catch (auditErr) {
        logger.error('[ArchivalJob] Failed to record error audit log:', auditErr.message);
      }

      return {
        success: false,
        error: err.message,
        durationMs: duration,
      };
    }
  },
};

export default ArchivalService;
