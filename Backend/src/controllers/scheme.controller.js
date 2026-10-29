import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';
import { schemeService } from '../services/scheme.service.js';
import {
  validateCreateScheme,
  validateUpdateScheme,
  validateEmpanelHospital,
} from '../validations/scheme.validation.js';

/**
 * Scheme Controller
 * Handles HTTP requests, validations, and API responses for Healthcare Schemes.
 */

/**
 * Get Scheme Aggregated Statistics & Metrics
 * GET /api/admins/schemes/stats
 */
export const getSchemeStats = asyncHandler(async (req, res) => {
  const stats = await schemeService.getSchemeStats();

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, stats, 'Scheme statistics retrieved successfully'));
});

/**
 * List all Healthcare Schemes with filtering & pagination
 * GET /api/admins/schemes or GET /api/schemes
 */
export const getAllSchemes = asyncHandler(async (req, res) => {
  const { search, category, is_active, limit = 50, offset = 0 } = req.query;

  const result = await schemeService.getAllSchemes(
    {
      search,
      category,
      is_active: is_active !== undefined ? is_active === 'true' || is_active === true : undefined,
      limit: parseInt(limit, 10) || 50,
      offset: parseInt(offset, 10) || 0,
    },
    req.language || 'en'
  );

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, result, 'Schemes retrieved successfully'));
});

/**
 * Get Scheme by ID or scheme code
 * GET /api/admins/schemes/:id or GET /api/schemes/:id
 */
export const getSchemeById = asyncHandler(async (req, res) => {
  const scheme = await schemeService.getSchemeById(req.params.id, req.language || 'en');

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, scheme, 'Scheme details retrieved successfully'));
});

/**
 * Register / Create a new Healthcare Scheme
 * POST /api/admins/schemes
 */
export const createScheme = asyncHandler(async (req, res) => {
  const validation = validateCreateScheme(req.body);
  if (!validation.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: validation.error,
      errors: validation.errors,
    });
  }

  const scheme = await schemeService.createScheme(req.user?.id, validation.data);

  return res
    .status(HTTP_STATUS.CREATED)
    .json(new ApiResponse(HTTP_STATUS.CREATED, scheme, 'Healthcare scheme registered successfully'));
});

/**
 * Update Scheme Details
 * PUT /api/admins/schemes/:id
 */
export const updateScheme = asyncHandler(async (req, res) => {
  const validation = validateUpdateScheme(req.body);
  if (!validation.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: validation.error,
      errors: validation.errors,
    });
  }

  const scheme = await schemeService.updateScheme(req.params.id, validation.data);

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, scheme, 'Scheme updated successfully'));
});

/**
 * Toggle Scheme Active Status
 * PATCH /api/admins/schemes/:id/status
 */
export const toggleSchemeStatus = asyncHandler(async (req, res) => {
  const scheme = await schemeService.toggleSchemeStatus(req.params.id);

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, scheme, `Scheme status changed to ${scheme.status}`));
});

/**
 * Delete Scheme
 * DELETE /api/admins/schemes/:id
 */
export const deleteScheme = asyncHandler(async (req, res) => {
  await schemeService.deleteScheme(req.params.id);

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, null, 'Scheme deleted successfully'));
});

/**
 * List all hospitals empanelled for a specific scheme
 * GET /api/admins/schemes/:id/hospitals
 */
export const getSchemeHospitals = asyncHandler(async (req, res) => {
  const { search, status, limit, offset } = req.query;
  const result = await schemeService.getSchemeHospitals(req.params.id, {
    search,
    alignment_status: status,
    limit,
    offset,
  });

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, result, 'Empanelled hospitals retrieved successfully'));
});

/**
 * Empanel hospital(s) to a scheme
 * POST /api/admins/schemes/:id/hospitals
 */
export const empanelHospitals = asyncHandler(async (req, res) => {
  const validation = validateEmpanelHospital(req.body);
  if (!validation.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: validation.error,
      errors: validation.errors,
    });
  }

  const result = await schemeService.empanelHospitals(req.params.id, validation.data);

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, result, 'Hospital(s) empanelled to scheme successfully'));
});

/**
 * De-empanel hospital from a scheme
 * DELETE /api/admins/schemes/:id/hospitals/:hospitalId
 */
export const deEmpanelHospital = asyncHandler(async (req, res) => {
  const { id: schemeId, hospitalId } = req.params;
  const result = await schemeService.deEmpanelHospital(schemeId, hospitalId);

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, result, 'Hospital de-empanelled successfully'));
});

/**
 * View all claims submitted under a specific scheme
 * GET /api/admins/schemes/:id/claims
 */
export const getSchemeClaims = asyncHandler(async (req, res) => {
  const { hospital_id, status, search, limit, offset } = req.query;
  const result = await schemeService.getSchemeClaims(req.params.id, {
    hospital_id,
    status,
    search,
    limit,
    offset,
  });

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, result, 'Scheme claims retrieved successfully'));
});

export default {
  getSchemeStats,
  getAllSchemes,
  getSchemeById,
  createScheme,
  updateScheme,
  toggleSchemeStatus,
  deleteScheme,
  getSchemeHospitals,
  empanelHospitals,
  deEmpanelHospital,
  getSchemeClaims,
};
