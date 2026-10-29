import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { HTTP_STATUS } from '../constants/index.js';
import { OpdVisitModel } from '../models/opdVisit.model.js';
import applicationService from '../services/application.service.js';
import { s3Service } from '../services/s3.service.js';
import { logger } from '../utils/logger.js';
import {
  createOpdVisitSchema,
  updateOpdVisitSchema,
} from '../validations/opdVisit.validation.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Helper to resolve Sevak assigned scope if caller is an Arogya Sevak
 */
const resolveSevakFilter = async (user) => {
  if (!user || user.role === 'ADMIN') return null;

  if (['AROGYA_SEVAK', 'SEVAK'].includes(user.role)) {
    try {
      const assignedApps = await applicationService.getSevakAssignedApplications(user.id);
      const uuidAppIds = [];
      const caseNumbers = [];

      if (Array.isArray(assignedApps)) {
        assignedApps.forEach((app) => {
          const rawId = app.id || app.uuid || app.raw_id;
          if (rawId && UUID_REGEX.test(String(rawId).trim())) {
            uuidAppIds.push(String(rawId).trim());
          }
          if (app.application_id && UUID_REGEX.test(String(app.application_id).trim())) {
            uuidAppIds.push(String(app.application_id).trim());
          }
          if (app.application_number) caseNumbers.push(String(app.application_number).trim());
          if (app.applicationNumber) caseNumbers.push(String(app.applicationNumber).trim());
          if (app.caseId) caseNumbers.push(String(app.caseId).trim());
          if (app.id && !UUID_REGEX.test(String(app.id).trim())) caseNumbers.push(String(app.id).trim());
        });
      }

      return {
        userId: user.id && UUID_REGEX.test(String(user.id).trim()) ? String(user.id).trim() : null,
        appIds: Array.from(new Set(uuidAppIds)),
        caseNumbers: Array.from(new Set(caseNumbers)),
      };
    } catch (err) {
      console.warn('[opdVisit.controller] Error resolving sevak filter:', err.message);
      return {
        userId: user.id && UUID_REGEX.test(String(user.id).trim()) ? String(user.id).trim() : null,
        appIds: [],
        caseNumbers: [],
      };
    }
  }

  return null;
};

/**
 * Record a new OPD visit outcome against an application / case
 * POST /api/opd-visits
 */
export const recordOpdVisit = asyncHandler(async (req, res) => {
  const validation = createOpdVisitSchema.safeParse(req.body);
  if (!validation.success) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      validation.error.errors[0]?.message || 'Validation error',
      validation.error.errors
    );
  }

  const raw = validation.data;

  let prescriptionFileUrl = raw.prescription_file_url || raw.prescriptionFileUrl || (raw.prescriptionDoc?.uri || null);
  let prescriptionDocData = raw.prescription_doc_data || raw.prescriptionDoc || null;

  // If prescription contains base64 data, automatically upload to AWS S3 storage
  if (prescriptionFileUrl && typeof prescriptionFileUrl === 'string' && prescriptionFileUrl.startsWith('data:')) {
    try {
      const matches = prescriptionFileUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const mimeType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        const ext = mimeType.includes('pdf') ? 'pdf' : (mimeType.includes('png') ? 'png' : 'jpg');
        const safeCaseId = (raw.case_id || raw.caseId || 'general').replace(/[^a-zA-Z0-9_-]/g, '_');
        const fileName = prescriptionDocData?.name || `rx_${Date.now()}.${ext}`;
        const s3Key = `arogyamitra/opd_prescriptions/${safeCaseId}/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

        const uploadRes = await s3Service.uploadBuffer(buffer, { key: s3Key, contentType: mimeType });
        if (uploadRes?.publicUrl) {
          prescriptionFileUrl = uploadRes.publicUrl;
          if (prescriptionDocData) {
            prescriptionDocData = {
              ...prescriptionDocData,
              uri: uploadRes.publicUrl,
              url: uploadRes.publicUrl,
              file_url: uploadRes.publicUrl,
              s3_key: s3Key,
            };
          }
        }
      }
    } catch (s3Err) {
      logger.warn('[opdVisitController] S3 base64 upload notice:', s3Err.message);
    }
  }

  // Normalize camelCase and snake_case inputs
  const visitPayload = {
    token_number: raw.token_number || raw.tokenNumber || null,
    case_id: raw.case_id || raw.caseId || null,
    application_id: raw.application_id || raw.applicationId || null,
    patient_id: raw.patient_id || raw.patientId || null,
    patient_name: raw.patient_name || raw.patientName || null,
    age: raw.age ? parseInt(raw.age, 10) : null,
    gender: raw.gender || null,
    contact_phone: raw.contact_phone || raw.contactPhone || null,
    abha_id: raw.abha_id || raw.abhaId || null,
    visit_date: raw.visit_date || new Date(),
    doctor_name: raw.doctor_name || raw.consultingDoctor || '',
    department: raw.department || 'General Medicine',
    visit_type: raw.visit_type || raw.visitType || 'New Consultation',
    scheme_eligibility: raw.scheme_eligibility || raw.schemeEligibility || 'MJPJAY Eligible',
    diagnosis: raw.diagnosis || raw.chief_complaint || raw.chiefComplaint || '',
    chief_complaint: raw.chief_complaint || raw.chiefComplaint || raw.diagnosis || '',
    findings: raw.findings || null,
    prescription_file_url: prescriptionFileUrl,
    prescription_doc_data: prescriptionDocData,
    follow_up_required: Boolean(raw.follow_up_required ?? raw.nextFollowUpRequired),
    follow_up_date: raw.follow_up_date || null,
    next_follow_up_timeline: raw.next_follow_up_timeline || raw.nextFollowUpTimeline || null,
    follow_up_status: raw.follow_up_status || raw.followUpStatus || null,
    recorded_by_user_id: req.user?.id || null,
    recorded_by_name: raw.recorded_by_name || raw.recordedBy || req.user?.full_name || 'Arogya Sevak',
    notes: raw.notes || null,
  };

  const newVisit = await OpdVisitModel.create(visitPayload);
  const sevakFilter = await resolveSevakFilter(req.user);
  const currentStats = await OpdVisitModel.getStats({ sevakFilter });

  return res
    .status(HTTP_STATUS.CREATED)
    .json(
      new ApiResponse(
        HTTP_STATUS.CREATED,
        {
          visit: newVisit,
          stats: currentStats,
        },
        'OPD visit recorded successfully in database'
      )
    );
});

/**
 * Get all OPD visits with filter, search, and aggregate stats
 * GET /api/opd-visits
 */
export const getAllOpdVisits = asyncHandler(async (req, res) => {
  const { filter = 'ALL', search = '', limit = 100, offset = 0 } = req.query;
  const sevakFilter = await resolveSevakFilter(req.user);

  const [visits, stats] = await Promise.all([
    OpdVisitModel.findAll({
      filter: String(filter).toUpperCase(),
      search: String(search),
      limit: parseInt(limit, 10) || 100,
      offset: parseInt(offset, 10) || 0,
      sevakFilter,
    }),
    OpdVisitModel.getStats({ sevakFilter }),
  ]);

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        {
          visits,
          stats,
          total: visits.length,
        },
        'OPD visits list and statistics retrieved successfully'
      )
    );
});

/**
 * Get aggregate OPD statistics
 * GET /api/opd-visits/stats
 */
export const getOpdStats = asyncHandler(async (req, res) => {
  const sevakFilter = await resolveSevakFilter(req.user);
  const stats = await OpdVisitModel.getStats({ sevakFilter });

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        stats,
        'OPD statistics retrieved successfully'
      )
    );
});

/**
 * Get all OPD visits recorded against an application or case (full outpatient trace)
 * GET /api/opd-visits/application/:applicationId
 */
export const getOpdVisitsByApplication = asyncHandler(async (req, res) => {
  const { applicationId } = req.params;

  if (!applicationId) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'applicationId parameter is required');
  }

  const visits = await OpdVisitModel.findByApplicationOrCaseId(applicationId);

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        {
          application_id: applicationId,
          total_visits: visits.length,
          visits,
        },
        'OPD outpatient visit history trace retrieved successfully'
      )
    );
});

/**
 * Get all OPD visits recorded against a specific caseId / application number
 * GET /api/opd-visits/case/:caseId
 */
export const getOpdVisitsByCase = asyncHandler(async (req, res) => {
  const { caseId } = req.params;

  if (!caseId) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'caseId parameter is required');
  }

  const visits = await OpdVisitModel.findByApplicationOrCaseId(caseId);

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        {
          case_id: caseId,
          total_visits: visits.length,
          visits,
        },
        'OPD case history trace retrieved successfully'
      )
    );
});

/**
 * Mark follow-up as resolved
 * PATCH /api/opd-visits/:id/resolve-follow-up
 */
export const resolveFollowUp = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { resolvedAt, resolvedByVisitId } = req.body || {};

  const updatedVisit = await OpdVisitModel.resolveFollowUp(id, {
    resolvedAt,
    resolvedByVisitId,
  });

  if (!updatedVisit) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, `OPD visit not found with ID ${id}`);
  }

  const currentStats = await OpdVisitModel.getStats();

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        {
          visit: updatedVisit,
          stats: currentStats,
        },
        'Follow-up resolved successfully'
      )
    );
});

/**
 * Get specific OPD visit details by UUID
 * GET /api/opd-visits/:id
 */
export const getOpdVisitById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const visit = await OpdVisitModel.findById(id);
  if (!visit) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, `OPD visit not found with ID ${id}`);
  }

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, visit, 'OPD visit details retrieved successfully'));
});

/**
 * Update an existing OPD visit
 * PATCH /api/opd-visits/:id
 */
export const updateOpdVisit = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const validation = updateOpdVisitSchema.safeParse(req.body);
  if (!validation.success) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      validation.error.errors[0]?.message || 'Validation error',
      validation.error.errors
    );
  }

  const updatedVisit = await OpdVisitModel.update(id, validation.data);
  if (!updatedVisit) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, `OPD visit not found with ID ${id}`);
  }

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, updatedVisit, 'OPD visit updated successfully'));
});

/**
 * Delete an OPD visit
 * DELETE /api/opd-visits/:id
 */
export const deleteOpdVisit = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const deletedVisit = await OpdVisitModel.delete(id);
  if (!deletedVisit) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, `OPD visit not found with ID ${id}`);
  }

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, deletedVisit, 'OPD visit deleted successfully'));
});
