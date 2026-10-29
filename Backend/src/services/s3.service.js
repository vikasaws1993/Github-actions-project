import {
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, s3BucketName, s3Region } from '../config/s3.config.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import { HTTP_STATUS } from '../constants/index.js';

export const s3Service = {
  /**
   * Generate an AWS S3 presigned PUT URL for direct client uploads
   * @param {Object} params
   * @param {string} params.key - S3 destination object key
   * @param {string} params.fileType - MIME type to enforce during upload
   * @param {number} [params.expiresIn=300] - Expiry in seconds (default 5 minutes)
   */
  async generatePresignedUploadUrl({ key, fileType, expiresIn = 300 }) {
    if (!key || !fileType) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'S3 key and fileType are required to generate presigned upload URL');
    }

    try {
      const command = new PutObjectCommand({
        Bucket: s3BucketName,
        Key: key,
        ContentType: fileType,
      });

      const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });
      const publicUrl = `https://${s3BucketName}.s3.${s3Region}.amazonaws.com/${key}`;

      return {
        uploadUrl,
        publicUrl,
        key,
        bucket: s3BucketName,
        region: s3Region,
        expiresIn,
      };
    } catch (err) {
      logger.error(`❌ S3 Presigned URL generation failed for key [${key}]:`, err.message || err);
      throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, `Failed to generate S3 presigned upload URL: ${err.message}`);
    }
  },

  /**
   * Upload an in-memory file buffer directly to S3
   * @param {Buffer} buffer - In-memory file buffer
   * @param {Object} options
   * @param {string} options.key - Destination S3 object key
   * @param {string} [options.contentType='image/jpeg'] - MIME type
   * @returns {Promise<Object>}
   */
  async uploadBuffer(buffer, { key, contentType = 'image/jpeg' }) {
    if (!buffer || !key) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Buffer and S3 key are required');
    }

    try {
      const command = new PutObjectCommand({
        Bucket: s3BucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      });

      await s3Client.send(command);
      const publicUrl = `https://${s3BucketName}.s3.${s3Region}.amazonaws.com/${key}`;

      logger.info(`[s3Service] Direct buffer uploaded to S3: ${key}`);
      return {
        key,
        publicUrl,
        bucket: s3BucketName,
      };
    } catch (err) {
      logger.error(`❌ S3 Buffer upload error for key [${key}]:`, err.message || err);
      throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, `Failed to upload buffer to S3: ${err.message}`);
    }
  },

  /**
   * Verify that an S3 object actually exists and is non-empty before committing to DB
   * @param {string} key - S3 object key
   * @param {string} [expectedMimeType] - Optional MIME type verification
   * @returns {Promise<Object>} Metadata of the verified S3 object
   */
  async verifyS3Object(key, expectedMimeType = null) {
    if (!key) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'S3 object key is required for verification');
    }

    try {
      const headCommand = new HeadObjectCommand({
        Bucket: s3BucketName,
        Key: key,
      });

      const metadata = await s3Client.send(headCommand);

      if (!metadata || metadata.ContentLength === undefined || metadata.ContentLength <= 0) {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          `The uploaded S3 object (${key}) is empty or corrupted (0 bytes).`
        );
      }

      if (expectedMimeType && metadata.ContentType && metadata.ContentType !== expectedMimeType) {
        logger.warn(
          `[s3Service] MIME type notice for key "${key}": expected "${expectedMimeType}", S3 has "${metadata.ContentType}"`
        );
      }

      const publicUrl = `https://${s3BucketName}.s3.${s3Region}.amazonaws.com/${key}`;

      return {
        exists: true,
        key,
        sizeBytes: metadata.ContentLength,
        contentType: metadata.ContentType || expectedMimeType || 'application/octet-stream',
        lastModified: metadata.LastModified,
        etag: metadata.ETag,
        publicUrl,
      };
    } catch (err) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        logger.warn(`[s3Service] Verification failed: S3 object not found for key "${key}"`);
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          `Uploaded file was not found in S3 storage. Please upload the file before confirming.`
        );
      }
      logger.error(`❌ S3 HeadObject verification error for key [${key}]:`, err.message || err);
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        `S3 object verification failed: ${err.message}`
      );
    }
  },

  /**
   * Extract clean S3 object key from raw URL or path
   * @param {string} rawInput - Full S3 URL or partial key path
   * @returns {string} Clean S3 key
   */
  extractKey(rawInput) {
    if (!rawInput) return '';
    let cleaned = String(rawInput).trim();
    if (cleaned.startsWith('data:') || cleaned.startsWith('blob:')) return '';
    if (cleaned.includes('amazonaws.com')) {
      try {
        const u = new URL(cleaned);
        cleaned = decodeURIComponent(u.pathname.replace(/^\/+/, ''));
      } catch (_) {
        const m = cleaned.match(/amazonaws\.com\/(.+)$/);
        if (m) cleaned = decodeURIComponent(m[1]);
      }
    } else if (cleaned.includes('?key=')) {
      try {
        const u = new URL(cleaned, 'http://localhost');
        cleaned = u.searchParams.get('key') || cleaned;
      } catch (_) {}
    }
    return cleaned.replace(/^\/+/, '');
  },

  /**
   * Streams an S3 object directly to the HTTP response with appropriate Content-Type and inline disposition.
   * @param {string} rawKey - S3 Key or S3 URL
   * @param {import('express').Response} res - Express response object
   */
  async streamS3Object(rawKey, res) {
    const key = this.extractKey(rawKey);
    if (!key) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Valid S3 key is required to stream document');
    }

    try {
      const command = new GetObjectCommand({
        Bucket: s3BucketName,
        Key: key,
      });

      const response = await s3Client.send(command);

      // Determine MIME type
      let contentType = response.ContentType || 'application/octet-stream';
      const keyLower = key.toLowerCase();
      if (keyLower.endsWith('.pdf') || contentType.includes('pdf')) {
        contentType = 'application/pdf';
      } else if (keyLower.endsWith('.jpg') || keyLower.endsWith('.jpeg')) {
        contentType = 'image/jpeg';
      } else if (keyLower.endsWith('.png')) {
        contentType = 'image/png';
      } else if (keyLower.endsWith('.webp')) {
        contentType = 'image/webp';
      }

      const fileName = key.split('/').pop() || 'document';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
      if (response.ContentLength) {
        res.setHeader('Content-Length', response.ContentLength);
      }
      res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

      if (response.Body && typeof response.Body.pipe === 'function') {
        response.Body.pipe(res);
      } else if (response.Body && typeof response.Body.transformToByteArray === 'function') {
        const bytes = await response.Body.transformToByteArray();
        res.end(Buffer.from(bytes));
      } else {
        throw new Error('Unsupported S3 object body stream format');
      }
    } catch (err) {
      logger.warn(`[s3Service] S3 Stream Error for key [${key}]: ${err.message}`);
      if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, `Document file not found in storage: ${key}`);
      }
      throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, `Failed to stream file: ${err.message}`);
    }
  },

  /**
   * Generate an AWS S3 presigned GET URL for secure temporary download/preview
   * @param {string} key - S3 object key
   * @param {number} [expiresIn=3600] - Expiry in seconds (default 1 hour)
   */
  async generatePresignedGetUrl(key, expiresIn = 3600) {
    const cleanKey = this.extractKey(key);
    if (!cleanKey) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'S3 key is required to generate download URL');
    }

    try {
      const command = new GetObjectCommand({
        Bucket: s3BucketName,
        Key: cleanKey,
      });

      return await getSignedUrl(s3Client, command, { expiresIn });
    } catch (err) {
      logger.error(`❌ S3 Presigned GET URL error for key [${cleanKey}]:`, err.message || err);
      throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, `Failed to generate download URL: ${err.message}`);
    }
  },

  /**
   * Delete an object from S3
   * @param {string} key - S3 object key
   */
  async deleteS3Object(key) {
    const cleanKey = this.extractKey(key);
    if (!cleanKey) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'S3 key is required for deletion');
    }

    try {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: s3BucketName,
        Key: cleanKey,
      });

      await s3Client.send(deleteCommand);
      logger.info(`[s3Service] Deleted S3 object: ${cleanKey}`);
      return { success: true, key: cleanKey };
    } catch (err) {
      logger.error(`❌ S3 DeleteObject error for key [${cleanKey}]:`, err.message || err);
      throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, `Failed to delete S3 object: ${err.message}`);
    }
  },
};

export default s3Service;

