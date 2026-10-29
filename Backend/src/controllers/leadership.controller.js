import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';
import { leadershipService } from '../services/leadership.service.js';
import { validateUpdatePhoto, validateUpdateProfile } from '../validations/leadership.validation.js';

/**
 * Leadership Controller
 * Handles MLA patron profile retrieval, live telemetry metrics, and photo upload/persistence.
 */

/**
 * Get MLA profile and live telemetry counts
 * GET /api/leadership/mla
 * GET /api/admins/leadership/mla
 */
export const getMlaProfile = asyncHandler(async (req, res) => {
  const result = await leadershipService.getMlaProfileWithTelemetry();

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, result, 'MLA profile and telemetry retrieved successfully'));
});

/**
 * Update MLA photo URL directly
 * PATCH /api/admins/leadership/mla/photo
 */
export const updateMlaPhotoUrl = asyncHandler(async (req, res) => {
  const validation = validateUpdatePhoto(req.body);
  if (!validation.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: validation.error,
      errors: validation.errors,
    });
  }

  const result = await leadershipService.updateMlaPhoto(validation.data.photoUrl);

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, result, 'MLA photo URL updated successfully'));
});

/**
 * Upload MLA photo file to S3 and update database
 * POST /api/admins/leadership/mla/photo/upload
 */
export const uploadMlaPhoto = asyncHandler(async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Please provide an image file to upload',
    });
  }

  const result = await leadershipService.uploadMlaPhotoFile(file);

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, result, 'MLA photo uploaded and updated successfully'));
});

/**
 * Update MLA profile details
 * PUT /api/admins/leadership/mla
 */
export const updateMlaProfile = asyncHandler(async (req, res) => {
  const validation = validateUpdateProfile(req.body);
  if (!validation.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: validation.error,
      errors: validation.errors,
    });
  }

  const result = await leadershipService.updateMlaProfile(validation.data);

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, result, 'MLA profile details updated successfully'));
});

export default {
  getMlaProfile,
  updateMlaPhotoUrl,
  uploadMlaPhoto,
  updateMlaProfile,
};
