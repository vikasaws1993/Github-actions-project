
import app from './app.js';
import { config } from './config/environment.js';
import { logger } from './utils/logger.js';
import { connectDB } from './config/db.js';
import { initArchivalJob, stopArchivalJob } from './jobs/closedCaseArchival.job.js';
import { seedDemoAccounts } from './utils/demoSeeder.util.js';

import { AdminModel } from './models/admin.model.js';
import { LeadershipModel } from './models/leadership.model.js';
import { HospitalFacilitySurveyModel } from './models/hospitalFacilitySurvey.model.js';
import { DailyUpdateModel } from './models/dailyUpdate.model.js';
import { OpdVisitModel } from './models/opdVisit.model.js';
import { BackupSevakAssignmentModel } from './models/backupSevakAssignment.model.js';
import { setupDatabaseIndexes } from './scripts/setupDatabaseIndexes.js';

let server;

/**
 * Handle Uncaught Exceptions
 */
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! Shutting down...', err.message, err.stack);
  process.exit(1);
});

/**
 * Initialize and Bootstrap the Application
 */
const startServer = async () => {
  try {
    // 1. Establish database connection
    await connectDB();

    // Ensure database table columns are synchronized
    await AdminModel.createTable();
    await LeadershipModel.createTable();
    await HospitalFacilitySurveyModel.createTable();
    await DailyUpdateModel.createTable();
    await OpdVisitModel.ensureTableExists();
    await BackupSevakAssignmentModel.createTable();

    // 2. Seed initial demo test accounts (Citizen, Sevak, Admin)
    await seedDemoAccounts();

    // 3. Initialize scheduled background jobs (Closed-case archival at 2:00 AM IST)
    initArchivalJob();

    // 3. Start HTTP server listener
    server = app.listen(config.port, '0.0.0.0', () => {
      logger.success(
        `🚀 WardArogya Server running on http://0.0.0.0:${config.port} (http://localhost:${config.port}) in [${config.env}] mode`
      );
      logger.info(`Health check available at: http://localhost:${config.port}/api/v1/health`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err.message);
    process.exit(1);
  }
};

startServer();

/**
 * Handle Unhandled Promise Rejections
 */
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! Shutting down gracefully...', err.message);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

/**
 * Graceful Shutdown on Termination Signals
 */
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Closing HTTP server and releasing resources...`);
  stopArchivalJob();
  if (server) {
    server.close(() => {
      logger.success('HTTP server closed.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
