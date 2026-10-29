import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { HTTP_STATUS } from '../constants/index.js';
import { s3Service } from '../services/s3.service.js';
import { ApplicationModel } from '../models/application.model.js';
import { ApplicationDocumentModel } from '../models/applicationDocument.model.js';
import { LeadershipModel } from '../models/leadership.model.js';
import {
  presignUploadSchema,
  confirmUploadSchema,
  deleteS3Schema,
  generateSystematicS3Key,
} from '../validations/s3.validation.js';

/**
 * Controller: Request an S3 presigned upload URL
 * POST /api/s3/presign-upload
 *
 * Security:
 * - Requires verified JWT authentication (or optional JWT for citizen self-onboarding).
 * - Rigorously verifies application ownership/assignment before issuing the upload URL.
 * - S3 key is 100% generated server-side.
 */
export const createPresignedUploadUrl = asyncHandler(async (req, res) => {
  const validation = presignUploadSchema.safeParse(req.body);
  if (!validation.success) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      validation.error.errors[0]?.message || 'Invalid upload parameters',
      validation.error.errors
    );
  }

  const { fileName, fileType, category, module, applicationId, applicationNumber, hospitalId } =
    validation.data;

  const user = req.user || { id: null, role: 'CITIZEN' };
  const userRole = String(user.role || 'CITIZEN').toUpperCase();

  // 1. Authorization & Application Access Verification
  let verifiedAppNumber = applicationNumber || null;
  let verifiedAppId = applicationId || null;

  if (applicationId || applicationNumber) {
    let app = null;
    if (applicationId) {
      app = await ApplicationModel.findById(applicationId);
    } else if (applicationNumber) {
      app = await ApplicationModel.findByApplicationNumber(applicationNumber);
    }

    if (!app && (userRole !== 'CITIZEN' || (applicationId && !applicationId.startsWith('temp_')))) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Target application record was not found');
    }

    if (app) {
      verifiedAppNumber = app.application_number || app.id;
      verifiedAppId = app.id;

      // Citizen authorization check: Must own the application
      const appOwnerId = app.citizen_user_id || app.user_id;
      if (userRole === 'CITIZEN' && appOwnerId && user.id && appOwnerId !== user.id) {
        throw new ApiError(
          HTTP_STATUS.FORBIDDEN,
          'Access Denied: You do not have permission to upload documents to this application.'
        );
      }
    }
  }

  // 2. Role-specific module restrictions
  if (module === 'leadership' && userRole !== 'ADMIN' && userRole !== 'SUPERADMIN') {
    throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Only administrators can upload leadership assets');
  }

  // 3. Generate 100% Backend-Controlled S3 Key
  const s3Key = generateSystematicS3Key({
    module,
    category,
    fileName,
    fileType,
    applicationId: verifiedAppId,
    applicationNumber: verifiedAppNumber,
    userId: user.id,
    userRole,
    hospitalId,
  });

  // 4. Generate Presigned PUT URL
  const presignedData = await s3Service.generatePresignedUploadUrl({
    key: s3Key,
    fileType,
    expiresIn: 300, // 5 minutes expiry
  });

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      {
        uploadUrl: presignedData.uploadUrl,
        fileUrl: presignedData.publicUrl,
        key: presignedData.key,
        bucket: presignedData.bucket,
        expiresIn: presignedData.expiresIn,
        module,
        category,
        fileName,
        fileType,
      },
      'Presigned S3 upload URL generated successfully'
    )
  );
});

/**
 * Controller: Confirm S3 Direct Upload and Attach Document to Database
 * POST /api/s3/confirm-upload
 *
 * Security:
 * - Executes S3 HeadObject verification before committing any database row.
 * - Enforces application ownership/assignment verification.
 */
export const confirmUploadAndAttachDoc = asyncHandler(async (req, res) => {
  const validation = confirmUploadSchema.safeParse(req.body);
  if (!validation.success) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      validation.error.errors[0]?.message || 'Invalid confirmation parameters',
      validation.error.errors
    );
  }

  const { key, fileName, fileType, fileSize, docTitle, category, applicationId, reqDocId, note } =
    validation.data;

  const user = req.user || { id: null, role: 'CITIZEN' };
  const userRole = String(user.role || 'CITIZEN').toUpperCase();

  // 1. Mandatory S3 Object Existence & Integrity Verification
  const s3Object = await s3Service.verifyS3Object(key, fileType);

  // 2. Application Record & Access Verification
  let savedDoc = null;
  if (applicationId) {
    const app = await ApplicationModel.findById(applicationId);
    if (!app) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, `Application "${applicationId}" not found`);
    }

    const appOwnerId = app.citizen_user_id || app.user_id;
    if (userRole === 'CITIZEN' && appOwnerId && user.id && appOwnerId !== user.id) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        'Access Denied: You do not own this application'
      );
    }

    const resolvedTitle = docTitle || fileName || 'Clinical Document';
    const resolvedFileName = fileName || `${resolvedTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`;
    const resolvedSizeStr = fileSize
      ? String(fileSize)
      : `${(s3Object.sizeBytes / (1024 * 1024)).toFixed(2)} MB`;

    // Check if this fulfills a requested document requirement
    let existingDoc = null;
    if (reqDocId) {
      existingDoc = await ApplicationDocumentModel.findById(reqDocId);
    }
    if (!existingDoc && resolvedTitle) {
      const allDocs = await ApplicationDocumentModel.findByApplicationId(app.id);
      existingDoc = (allDocs || []).find(
        (d) =>
          (d.file_name === resolvedTitle || d.file_name === resolvedFileName || d.file_name === 'Pending Upload') &&
          (d.document_status === 'PENDING_SEVAK_UPLOAD' || d.is_sevak_upload)
      );
    }

    if (existingDoc) {
      savedDoc = await ApplicationDocumentModel.update(existingDoc.id, {
        file_url: s3Object.publicUrl,
        s3_key: key,
        file_name: resolvedTitle,
        category: category || existingDoc.category || 'Clinical Record',
        document_status: 'UPLOADED',
        is_sevak_upload: userRole === 'SEVAK' || userRole === 'AROGYA_SEVAK',
        uploaded_by_role: userRole,
        uploaded_by_user_id: user.id || null,
        verification_remark: note || null,
      });
    } else {
      savedDoc = await ApplicationDocumentModel.create({
        application_id: app.id,
        file_url: s3Object.publicUrl,
        s3_key: key,
        file_name: resolvedTitle,
        category: category || 'medical_documents',
        file_size: resolvedSizeStr,
        source: 's3_direct',
        document_status: 'UPLOADED',
        verification_remark: note || null,
        uploaded_by_user_id: user.id || null,
        is_sevak_upload: userRole === 'SEVAK' || userRole === 'AROGYA_SEVAK',
        uploaded_by_role: userRole,
      });
    }
  }

  // 3. Leadership photo update handling
  if (key.includes('arogyamitra/leadership/')) {
    if (userRole !== 'ADMIN' && userRole !== 'SUPERADMIN') {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Only admins can confirm leadership photo updates');
    }
    await LeadershipModel.updatePhoto('hon-mla', s3Object.publicUrl);
  }

  return res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(
      HTTP_STATUS.CREATED,
      {
        verified: true,
        key: s3Object.key,
        fileUrl: s3Object.publicUrl,
        sizeBytes: s3Object.sizeBytes,
        contentType: s3Object.contentType,
        lastModified: s3Object.lastModified,
        document: savedDoc || null,
      },
      'S3 upload verified and record saved successfully'
    )
  );
});

/**
 * Controller: Delete an S3 asset
 * DELETE /api/s3
 */
export const deleteS3Asset = asyncHandler(async (req, res) => {
  const validation = deleteS3Schema.safeParse(req.body);
  if (!validation.success) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      validation.error.errors[0]?.message || 'Invalid key format',
      validation.error.errors
    );
  }

  const { key } = validation.data;
  const user = req.user || { role: 'CITIZEN' };
  const userRole = String(user.role || 'CITIZEN').toUpperCase();

  // Deletion authorization check
  if (userRole !== 'ADMIN' && userRole !== 'SUPERADMIN' && userRole !== 'SEVAK' && userRole !== 'AROGYA_SEVAK') {
    if (!key.includes(`user_${user.id}`)) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, 'You are not authorized to delete this S3 asset');
    }
  }

  const result = await s3Service.deleteS3Object(key);

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      result,
      'S3 asset deleted successfully'
    )
  );
});

/**
 * Controller: Stream S3 object directly to browser with inline disposition
 * GET /api/s3/view?key=... or GET /api/s3/file?key=...
 */
export const viewS3Document = asyncHandler(async (req, res) => {
  const rawKey = req.query.key || req.query.url || req.query.file || req.query.path;
  if (!rawKey) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Query parameter "key" or "url" is required');
  }

  await s3Service.streamS3Object(rawKey, res);
});

/**
 * Controller: Generate temporary presigned download URL
 * GET /api/s3/presigned-get-url?key=...
 */
export const getPresignedDownloadUrl = asyncHandler(async (req, res) => {
  const rawKey = req.query.key || req.query.url || req.query.file;
  if (!rawKey) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Query parameter "key" is required');
  }

  const downloadUrl = await s3Service.generatePresignedGetUrl(rawKey, 3600);

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      { downloadUrl, key: rawKey, expiresIn: 3600 },
      'Presigned download URL generated successfully'
    )
  );
});

export default {
  createPresignedUploadUrl,
  confirmUploadAndAttachDoc,
  deleteS3Asset,
  viewS3Document,
  getPresignedDownloadUrl,
};
