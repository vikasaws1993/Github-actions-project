import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';
import { hospitalService } from '../services/hospital.service.js';
import { adminService } from '../services/admin.service.js';
import {
  validateCreateHospital,
  validateBulkCreateHospitals,
  parseCsvToHospitalRecords,
} from '../validations/hospital.validation.js';

/**
 * Hospital Controller
 * Handles HTTP requests, validation, and responses for hospital operations.
 */

/**
 * Empanel / Add a new Hospital
 * POST /api/hospitals
 */
export const createHospital = asyncHandler(async (req, res) => {
  const validation = validateCreateHospital(req.body);
  if (!validation.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: validation.error,
      errors: validation.errors,
    });
  }

  const hospital = await hospitalService.createHospital(req.user?.id, validation.data);

  return res
    .status(HTTP_STATUS.CREATED)
    .json(new ApiResponse(HTTP_STATUS.CREATED, hospital, 'Hospital empanelled successfully'));
});

/**
 * Bulk Empanel / Add Multiple Hospitals from CSV File or JSON Array
 * POST /api/hospitals/bulk
 * POST /api/hospitals/upload-csv
 */
export const bulkCreateHospitals = asyncHandler(async (req, res) => {
  let rawData = null;

  // 1. Check for uploaded CSV file in multipart/form-data
  if (req.file && req.file.buffer) {
    rawData = req.file.buffer.toString('utf-8');
  } else if (Array.isArray(req.files) && req.files.length > 0 && req.files[0].buffer) {
    rawData = req.files[0].buffer.toString('utf-8');
  } else if (req.files && typeof req.files === 'object') {
    const firstKey = Object.keys(req.files)[0];
    if (firstKey) {
      const fileObj = Array.isArray(req.files[firstKey]) ? req.files[firstKey][0] : req.files[firstKey];
      if (fileObj?.buffer) {
        rawData = fileObj.buffer.toString('utf-8');
      }
    }
  } else if (typeof req.body === 'string') {
    rawData = req.body;
  } else if (req.body && typeof req.body.csv === 'string') {
    rawData = req.body.csv;
  } else if (req.body && Array.isArray(req.body.hospitals)) {
    rawData = req.body.hospitals;
  } else if (Array.isArray(req.body)) {
    rawData = req.body;
  } else if (req.body && req.body.name) {
    rawData = [req.body];
  }

  if (!rawData) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'No CSV file or hospital array provided in request.',
    });
  }

  const validation = validateBulkCreateHospitals(rawData);
  if (!validation.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: validation.error,
      errors: validation.errors,
    });
  }

  const result = await hospitalService.bulkCreateHospitals(req.user?.id, validation.data);

  return res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(
      HTTP_STATUS.CREATED,
      result,
      `Successfully imported ${result.successCount} of ${result.total} hospitals.`
    )
  );
});

/**
 * List all Hospitals
 * GET /api/hospitals
 */
export const getAllHospitals = asyncHandler(async (req, res) => {
  const { district_id, taluka_id, status, search, limit = 50, offset = 0 } = req.query;

  const result = await hospitalService.getAllHospitals({
    district_id,
    taluka_id,
    status,
    search,
    limit: parseInt(limit, 10) || 50,
    offset: parseInt(offset, 10) || 0,
  });

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, result, 'Hospitals retrieved successfully'));
});

/**
 * Get Hospital by ID
 * GET /api/hospitals/:id
 */
export const getHospitalById = asyncHandler(async (req, res) => {
  const hospital = await hospitalService.getHospitalById(req.params.id);

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, hospital, 'Hospital details retrieved successfully'));
});

/**
 * Get assigned hospital details for currently authenticated Sevak
 * GET /api/arogya-sevaks/assigned-hospital/details
 */
export const getAssignedHospitalDetails = asyncHandler(async (req, res) => {
  const isBackup = Boolean(req.user?.isBackup || req.user?.is_backup);
  const coveringId = req.user?.coveringForSevakId || req.user?.covering_for_sevak_id;
  const sevakId = (isBackup && coveringId) ? coveringId : (req.user?.sevakId || req.user?.id);

  const sevakData = await adminService.getSevakAssignedHospitals(sevakId);
  if (!sevakData?.active_hospitals || sevakData.active_hospitals.length === 0) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      statusCode: HTTP_STATUS.NOT_FOUND,
      message: 'No active assigned hospital found for this Arogya Sevak',
    });
  }
  const hospId = sevakData.active_hospitals[0].hospital_id;
  let hospital = null;
  try {
    hospital = await hospitalService.getHospitalById(hospId);
  } catch (_) {}

  if (!hospital) {
    hospital = {
      id: hospId,
      name: sevakData.active_hospitals[0].hospital_name || hospId,
      hospital_code: sevakData.active_hospitals[0].hospital_code || '',
      address: sevakData.active_hospitals[0].hospital_address || '',
      contact_number: sevakData.active_hospitals[0].hospital_contact || '',
    };
  }

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, hospital, 'Assigned hospital details retrieved successfully'));
});

/**
 * Get Arogya Sevaks for a particular Hospital
 * GET /api/hospitals/:id/sevaks
 * GET /api/hospitals/:id/arogya-sevaks
 */
export const getHospitalSevaks = asyncHandler(async (req, res) => {
  const result = await hospitalService.getHospitalSevaks(req.params.id);

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, result, 'Arogya Sevaks for hospital retrieved successfully'));
});

/**
 * Assign Sevaks to Hospital
 * POST /api/hospitals/:id/assign-sevaks
 */
export const assignSevaksToHospital = asyncHandler(async (req, res) => {
  const result = await hospitalService.assignSevaksToHospital(
    req.user?.id,
    req.params.id,
    req.body
  );

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, result, 'ArogyaSevaks assigned to Hospital successfully'));
});

/**
 * Update Hospital
 * PUT /api/hospitals/:id
 * PATCH /api/hospitals/:id
 */
export const updateHospital = asyncHandler(async (req, res) => {
  const hospital = await hospitalService.updateHospital(req.params.id, req.body);

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, hospital, 'Hospital record updated successfully'));
});

/**
 * Deactivate Hospital (Soft Delete / Deactivation)
 * PATCH /api/hospitals/:id/deactivate
 */
export const deactivateHospital = asyncHandler(async (req, res) => {
  const result = await hospitalService.deactivateHospital(req.params.id);

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, result, result.message));
});

/**
 * Delete Hospital
 * DELETE /api/hospitals/:id
 */
export const deleteHospital = asyncHandler(async (req, res) => {
  await hospitalService.deleteHospital(req.params.id);

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, null, 'Hospital deleted successfully'));
});

export default {
  createHospital,
  bulkCreateHospitals,
  getAllHospitals,
  getHospitalById,
  updateHospital,
  deactivateHospital,
  assignSevaksToHospital,
  deleteHospital,
};

