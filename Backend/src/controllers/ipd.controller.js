import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { HTTP_STATUS } from '../constants/index.js';
import { IpdAdmissionModel } from '../models/ipdAdmission.model.js';
import { IpdStatusUpdateModel } from '../models/ipdStatusUpdate.model.js';
import {
  createIpdAdmissionSchema,
  transitionIpdStatusSchema,
  dischargeIpdSchema,
} from '../validations/ipd.validation.js';

/**
 * Admit a patient to IPD against a case application (1:1 relationship)
 * POST /api/ipd/admissions
 */
export const admitPatientToIpd = asyncHandler(async (req, res) => {
  const validation = createIpdAdmissionSchema.safeParse(req.body);
  if (!validation.success) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      validation.error.errors[0]?.message || 'Validation error',
      validation.error.errors
    );
  }

  // Check if an IPD admission already exists for this application (1:1 constraint)
  const existingAdmission = await IpdAdmissionModel.findByApplicationId(validation.data.application_id);
  if (existingAdmission) {
    throw new ApiError(
      HTTP_STATUS.CONFLICT,
      `An IPD admission already exists for application ${validation.data.application_id}. Current status: ${existingAdmission.current_status}`
    );
  }

  const admission = await IpdAdmissionModel.create({
    ...validation.data,
    admitted_by_user_id: req.user?.id || null,
  });

  return res
    .status(HTTP_STATUS.CREATED)
    .json(
      new ApiResponse(
        HTTP_STATUS.CREATED,
        admission,
        'Patient admitted to IPD successfully'
      )
    );
});

/**
 * Get IPD admission details by application ID
 * GET /api/ipd/admissions/application/:applicationId
 */
export const getIpdAdmissionByApplication = asyncHandler(async (req, res) => {
  const { applicationId } = req.params;

  const admission = await IpdAdmissionModel.findByApplicationId(applicationId);
  if (!admission) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      `No IPD admission found for application ${applicationId}`
    );
  }

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, admission, 'IPD admission retrieved successfully'));
});

/**
 * Get IPD admission details by UUID
 * GET /api/ipd/admissions/:id
 */
export const getIpdAdmissionById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const admission = await IpdAdmissionModel.findById(id);
  if (!admission) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, `IPD admission not found with ID ${id}`);
  }

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, admission, 'IPD admission retrieved successfully'));
});

/**
 * Transition IPD patient status (e.g. ADMITTED_WARD -> IN_ICU -> SURGERY_PLANNED -> TREATMENT_ONGOING -> DISCHARGED)
 * POST /api/ipd/admissions/:id/status
 */
export const transitionIpdStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const validation = transitionIpdStatusSchema.safeParse(req.body);
  if (!validation.success) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      validation.error.errors[0]?.message || 'Validation error',
      validation.error.errors
    );
  }

  const updatedByUserId = req.user?.id;
  if (!updatedByUserId) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'User authentication required to update treatment status');
  }

  const result = await IpdAdmissionModel.transitionStatus(id, {
    ...validation.data,
    updated_by_user_id: updatedByUserId,
  });

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        result,
        `IPD status transitioned to ${validation.data.new_status} and audit event recorded`
      )
    );
});

/**
 * Discharge an IPD patient with discharge date & summary URL
 * POST /api/ipd/admissions/:id/discharge
 */
export const dischargeIpdPatient = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const validation = dischargeIpdSchema.safeParse(req.body);
  if (!validation.success) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      validation.error.errors[0]?.message || 'Validation error',
      validation.error.errors
    );
  }

  const updatedByUserId = req.user?.id;
  if (!updatedByUserId) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'User authentication required to discharge patient');
  }

  const result = await IpdAdmissionModel.transitionStatus(id, {
    new_status: 'DISCHARGED',
    discharge_date: validation.data.discharge_date || new Date(),
    discharge_summary_url: validation.data.discharge_summary_url,
    notes: validation.data.notes || 'Patient discharged from hospital inpatient care.',
    ward_bed_number: validation.data.ward_bed_number,
    updated_by_user_id: updatedByUserId,
  });

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        result,
        'Patient discharged successfully and discharge summary recorded'
      )
    );
});

/**
 * Get timestamped status change audit history for an admission or application
 * GET /api/ipd/admissions/:id/timeline
 * GET /api/ipd/admissions/application/:applicationId/timeline
 */
export const getIpdTimeline = asyncHandler(async (req, res) => {
  const { id, applicationId } = req.params;

  let timeline = [];
  if (applicationId) {
    timeline = await IpdStatusUpdateModel.findByApplicationId(applicationId);
  } else if (id) {
    timeline = await IpdStatusUpdateModel.findByAdmissionId(id);
  }

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        {
          total_events: timeline.length,
          timeline,
        },
        'IPD status update history timeline retrieved successfully'
      )
    );
});
