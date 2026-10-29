import cron from 'node-cron';
import { config } from '../config/environment.js';
import { logger } from '../utils/logger.js';
import { ArchivalService } from '../services/archival.service.js';

let scheduledTask = null;

/**
 * Initialize and start the Closed-Case Archival Cron Job
 * 
 * Scheduled to run every day at 2:00 AM IST (Asia/Kolkata)
 * Controlled entirely by backend configuration:
 * - CASE_RETENTION_DAYS (default: 60)
 * - ARCHIVAL_JOB_CRON (default: '0 2 * * *')
 * - TZ (default: 'Asia/Kolkata')
 */
export function initArchivalJob() {
  const cronExpression = config.archival?.cronSchedule || '0 2 * * *';
  const timezone = config.archival?.timezone || 'Asia/Kolkata';
  const retentionDays = config.archival?.retentionDays ?? 60;

  if (!cron.validate(cronExpression)) {
    logger.error(`[ArchivalJob] Invalid CRON expression: "${cronExpression}". Archival job was NOT scheduled.`);
    return null;
  }

  logger.info(
    `[ArchivalJob] Initializing closed-case archival cron job: schedule="${cronExpression}", timezone="${timezone}", retentionDays=${retentionDays}`
  );

  scheduledTask = cron.schedule(
    cronExpression,
    async () => {
      logger.info(`[ArchivalJob] Scheduled trigger fired at ${new Date().toISOString()}`);
      try {
        const result = await ArchivalService.runArchivalJob({
          retentionDays,
          dryRun: false,
        });
        logger.info(
          `[ArchivalJob] Scheduled run completed successfully. Archived: ${result.archivedCount} case(s).`
        );
      } catch (err) {
        logger.error('[ArchivalJob] Unhandled error during scheduled execution:', err.message);
      }
    },
    {
      scheduled: true,
      timezone,
    }
  );

  logger.success(`[ArchivalJob] Closed-case archival job scheduled successfully (Daily at 2:00 AM ${timezone}).`);
  return scheduledTask;
}

/**
 * Stop the scheduled archival job (e.g. during graceful shutdown)
 */
export function stopArchivalJob() {
  if (scheduledTask) {
    scheduledTask.stop();
    logger.info('[ArchivalJob] Scheduled archival job stopped.');
    scheduledTask = null;
  }
}

/**
 * Trigger archival job manually (for testing or administrative verification)
 */
export async function triggerArchivalJobManual({ dryRun = false, asOfDate = new Date(), retentionDays } = {}) {
  return await ArchivalService.runArchivalJob({
    dryRun,
    asOfDate,
    retentionDays,
  });
}

export default {
  initArchivalJob,
  stopArchivalJob,
  triggerArchivalJobManual,
};
