import { Router } from 'express';
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';
import { uploadSingle } from '../middlewares/upload.middleware.js';
import {
  getMlaProfile,
  updateMlaPhotoUrl,
  uploadMlaPhoto,
  updateMlaProfile,
} from '../controllers/leadership.controller.js';

const router = Router();

/**
 * Leadership & Patron Routes
 */

// GET /api/leadership/mla - Get MLA Profile & Live Telemetry metrics (Public / Authenticated)
router.get('/mla', getMlaProfile);
router.get('/', getMlaProfile);

// PATCH /api/leadership/mla/photo - Update MLA photo URL directly (Admin only)
router.patch('/mla/photo', verifyJWT, authorizeRoles('ADMIN'), updateMlaPhotoUrl);

// POST /api/leadership/mla/photo/upload - Upload new MLA photo file to S3 (Admin only)
router.post('/mla/photo/upload', verifyJWT, authorizeRoles('ADMIN'), uploadSingle('file'), uploadMlaPhoto);

// PUT /api/leadership/mla - Update full MLA profile details (Admin only)
router.put('/mla', verifyJWT, authorizeRoles('ADMIN'), updateMlaProfile);

export default router;
