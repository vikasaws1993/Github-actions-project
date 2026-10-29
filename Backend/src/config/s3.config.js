import { S3Client } from '@aws-sdk/client-s3';
import { config } from './environment.js';
import { logger } from '../utils/logger.js';

/**
 * AWS S3 Client Configuration (Backend-Only)
 * Uses IAM credentials and target AWS region configured in environment variables.
 */
const s3Config = {
  region: config.s3.region || 'ap-south-1',
};

if (config.s3.accessKeyId && config.s3.secretAccessKey) {
  s3Config.credentials = {
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey,
  };
} else {
  logger.warn('⚠️ AWS S3 credentials are not explicitly set in environment. Relying on default AWS SDK credential provider chain.');
}

export const s3Client = new S3Client(s3Config);

export const s3BucketName = config.s3.bucketName || 'arogyamitra-media-prod';
export const s3Region = config.s3.region || 'ap-south-1';

export default s3Client;
