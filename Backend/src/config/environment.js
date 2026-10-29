import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export const config = Object.freeze({
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  corsOrigin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
  db: {
    url: process.env.DATABASE_URL || '',
    host: process.env.DB_HOST || '',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'default_jwt_secret_change_in_production',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    refreshSecret: process.env.REFRESH_TOKEN_SECRET || 'default_refresh_secret',
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 mins
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '5000', 10),
  },
  s3: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || 'ap-south-1',
    bucketName: process.env.AWS_S3_BUCKET_NAME || 'arogyamitra-media-prod',
  },
  archival: {
    retentionDays: parseInt(process.env.CASE_RETENTION_DAYS || '60', 10),
    retentionYears: process.env.CASE_RETENTION_YEARS ? parseInt(process.env.CASE_RETENTION_YEARS, 10) : 3,
    cronSchedule: process.env.ARCHIVAL_JOB_CRON || '0 2 * * *',
    timezone: process.env.TZ || 'Asia/Kolkata',
  },
});
