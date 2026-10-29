import { Router } from 'express';
import { verifyJWT, optionalJWT } from '../middlewares/auth.middleware.js';
import {
  createPresignedUploadUrl,
  confirmUploadAndAttachDoc,
  deleteS3Asset,
  viewS3Document,
  getPresignedDownloadUrl,
} from '../controllers/s3.controller.js';

const router = Router();

/**
 * S3 Storage Routes (Zero-Trust Presigned Architecture & Secure Streaming Proxy)
 */

// Stream S3 file directly with inline MIME type
// GET /api/s3/view?key=... or GET /api/s3/file?key=...
router.get('/view', optionalJWT, viewS3Document);
router.get('/file', optionalJWT, viewS3Document);

// Get temporary presigned download URL
// GET /api/s3/presigned-get-url?key=...
router.get('/presigned-get-url', optionalJWT, getPresignedDownloadUrl);

// Generate short-lived presigned PUT URL for direct S3 upload
// POST /api/s3/presign-upload
router.post('/presign-upload', optionalJWT, createPresignedUploadUrl);

// Verify S3 object existence via HeadObject and attach record to DB
// POST /api/s3/confirm-upload
router.post('/confirm-upload', verifyJWT, confirmUploadAndAttachDoc);

// Delete an existing S3 asset by key
// DELETE /api/s3
router.delete('/', verifyJWT, deleteS3Asset);

export default router;

