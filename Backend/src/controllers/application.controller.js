import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';
import { applicationService } from '../services/application.service.js';
import { ApplicationModel } from '../models/application.model.js';
import { ApplicationDocumentModel } from '../models/applicationDocument.model.js';
import {
  validateCreateApplication,
  validateUpdateStatus,
  validateRequestDoc,
  validateResubmitDoc,
  validateAssignCase,
  validateRemindAdmin,
  validateAddRemark,
} from '../validations/application.validation.js';
import { validateTreatmentProgress } from '../validations/treatmentProgress.validation.js';

/**
 * Application Controller
 * Handles Citizen application submissions & tracking, and Admin case review workflows.
 */

// ==========================================
// 1. Citizen Endpoints
// ==========================================

/**
 * Citizen submits a new Healthcare Scheme Application
 * POST /api/applications
 */
export const submitApplication = asyncHandler(async (req, res) => {
  const validation = validateCreateApplication(req.body);
  if (!validation.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: validation.error,
      errors: validation.errors,
    });
  }

  const userId = req.user?.id;
  const application = await applicationService.submitApplication(userId, validation.data);

  return res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(
      HTTP_STATUS.CREATED,
      application,
      `Application ${application.id} submitted successfully / अर्ज यशस्वीरीत्या दाखल झाला आहे`
    )
  );
});

/**
 * Citizen gets their submitted applications
 * GET /api/applications/my
 */
export const getMyApplications = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const result = await applicationService.getMyApplications(userId, req.query);

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, result, 'Applications retrieved successfully'));
});

/**
 * Citizen or Admin gets application detail by Case ID or UUID
 * GET /api/applications/:id
 */
export const getApplicationById = asyncHandler(async (req, res) => {
  const application = await applicationService.getApplicationDetails(req.params.id, req.user);

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, application, 'Application details retrieved successfully'));
});

/**
 * Citizen resubmits requested document for reverted case
 * POST /api/applications/:id/resubmit-doc
 */
export const resubmitDocument = asyncHandler(async (req, res) => {
  const validation = validateResubmitDoc(req.body);
  if (!validation.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: validation.error,
      errors: validation.errors,
    });
  }

  const userId = req.user?.id;
  const updated = await applicationService.resubmitRequestedDocument(
    req.params.id,
    userId,
    validation.data
  );

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, updated, 'Document resubmitted successfully for review'));
});

/**
 * Citizen: Send SLA breach reminder / escalate application
 * POST /api/applications/:id/remind-admin
 */
export const remindAdmin = asyncHandler(async (req, res) => {
  const validation = validateRemindAdmin(req.body);
  const userId = req.user?.id;
  const payload = validation.success ? validation.data : req.body;

  const result = await applicationService.sendAdminReminder(
    req.params.id,
    userId,
    payload
  );

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, result, 'SLA breach reminder sent to administration'));
});

// ==========================================
// 2. Admin Endpoints
// ==========================================

/**
 * Admin: List all applications with filtering & pagination
 * GET /api/admins/applications
 */
export const getAllApplications = asyncHandler(async (req, res) => {
  const result = await applicationService.getAllApplications(req.query);

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, result, 'Applications queue retrieved successfully'));
});

/**
 * Admin: Get queue statistics & metrics
 * GET /api/admins/applications/stats
 */
export const getApplicationStats = asyncHandler(async (req, res) => {
  const stats = await applicationService.getApplicationStats();

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, stats, 'Application queue statistics retrieved'));
});

/**
 * Admin: Update application status (Approve, Reject, Review, Close)
 * Formally assigns official scheme during approval.
 * PATCH /api/admins/applications/:id/status
 */
export const updateApplicationStatus = asyncHandler(async (req, res) => {
  const validation = validateUpdateStatus(req.body);
  if (!validation.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: validation.error,
      errors: validation.errors,
    });
  }

  const adminUserId = req.user?.id;
  const updated = await applicationService.updateApplicationStatus(
    req.params.id,
    adminUserId,
    validation.data
  );

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, updated, `Application status updated to ${updated.status}`));
});

/**
 * Admin: Request document / revert case to citizen with alert
 * POST /api/admins/applications/:id/request-doc
 */
export const requestDocument = asyncHandler(async (req, res) => {
  const validation = validateRequestDoc(req.body);
  if (!validation.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: validation.error,
      errors: validation.errors,
    });
  }

  const adminUserId = req.user?.id;
  const updated = await applicationService.requestDocument(
    req.params.id,
    adminUserId,
    validation.data
  );

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, updated, `Document "${validation.data.requestedDocName}" requested from citizen`));
});

/**
 * Arogya Sevak / Citizen: Upload a requested document or additional clinical record
 * POST /api/applications/:id/documents
 * POST /api/applications/:id/sevak-upload-doc
 */
export const uploadSevakDocument = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const result = await applicationService.uploadSevakDocument(
    req.params.id,
    userId,
    req.body
  );

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, result, 'Document uploaded successfully by Arogya Sevak'));
});

/**
 * Admin: Verify or reject an uploaded document
 * PATCH /api/admins/applications/:id/documents/:docId/verify
 */
export const verifyDocument = asyncHandler(async (req, res) => {
  const { docId } = req.params;
  const { status = 'VERIFIED', remark = null } = req.body;

  const adminUserId = req.user?.id;
  const result = await applicationService.verifyDocument(docId, adminUserId, { status, remark });

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, result, `Document marked as ${result.documentStatus}`));
});

/**
 * Admin: Assign hospital and/or Arogya Sevak to the case
 * POST /api/admins/applications/:id/assign
 */
export const assignCase = asyncHandler(async (req, res) => {
  const validation = validateAssignCase(req.body);
  if (!validation.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: validation.error,
      errors: validation.errors,
    });
  }

  const adminUserId = req.user?.id;
  const result = await applicationService.assignCase(
    req.params.id,
    adminUserId,
    validation.data
  );

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, result, 'Case successfully assigned to hospital coordinator'));
});

/**
 * Admin: Add case note / remark
 * POST /api/admins/applications/:id/remarks
 */
export const addRemark = asyncHandler(async (req, res) => {
  const validation = validateAddRemark(req.body);
  if (!validation.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: validation.error,
      errors: validation.errors,
    });
  }

  const adminUserId = req.user?.id;
  const result = await applicationService.addRemark(
    req.params.id,
    adminUserId,
    validation.data
  );

  return res
    .status(HTTP_STATUS.CREATED)
    .json(new ApiResponse(HTTP_STATUS.CREATED, result, 'Case note recorded successfully'));
});

/**
 * Arogya Sevak: Get all assigned cases
 * GET /api/applications/sevak/assigned
 */
export const getSevakAssignedApplications = asyncHandler(async (req, res) => {
  const sevakUserId = req.user?.id;
  const result = await applicationService.getSevakAssignedApplications(sevakUserId, req.query);

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, result, 'Assigned cases retrieved successfully for Arogya Sevak'));
});

/**
 * Citizen requests to reopen a rejected application within the 60-day window
 * POST /api/applications/:id/request-reopen
 */
export const requestCaseReopen = asyncHandler(async (req, res) => {
  const userContext = req.user;
  const reason = req.body?.reason || req.body?.remarks || '';
  const result = await applicationService.requestCaseReopen(req.params.id, userContext, reason);

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, result, 'Reopen request submitted successfully to Admin / अर्ज फेरविचार विनंती प्रशासनाकडे यशस्वीपणे पाठवली आहे.'));
});

/**
 * Reopen a rejected application within the 60-day window (ADMIN ONLY)
 * POST /api/applications/:id/reopen
 */
export const reopenApplication = asyncHandler(async (req, res) => {
  const userContext = req.user;
  const reason = req.body?.reason || req.body?.remarks || '';
  const result = await applicationService.reopenApplication(req.params.id, userContext, reason);

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, result, 'Application reopened successfully within 60-day eligibility window / अर्ज यशस्वीरित्या फेरविचारासाठी उघडला आहे.'));
});

/**
 * Get documents for an application by Case ID or UUID
 * GET /api/applications/:id/documents
 * Returns documents directly from application_documents table
 */
export const getApplicationDocuments = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Resolve application UUID from case ID (e.g. AA-2026-00005) or direct UUID
  let applicationUuid = id;
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!UUID_REGEX.test(id)) {
    // It's a case ID like AA-2026-00005 — resolve to UUID
    const app = await ApplicationModel.findById(id);
    if (!app) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: `Application '${id}' not found`,
      });
    }
    applicationUuid = app.id;
  }

  // Fetch documents from application_documents table
  const rawDocs = await ApplicationDocumentModel.findByApplicationId(applicationUuid);

  // Deduplicate: if an uploaded doc exists for a title/name, discard any un-uploaded pending placeholder
  const documents = (rawDocs || []).reduce((acc, doc) => {
    const titleKey = (doc.file_name || doc.document_type_name || '').trim().toLowerCase();
    const hasUploaded = Boolean(doc.file_url && doc.file_url !== '' && doc.file_url !== 'Pending Upload');
    const existingIdx = acc.findIndex((d) => (d.file_name || d.document_type_name || '').trim().toLowerCase() === titleKey);

    if (existingIdx !== -1) {
      const existing = acc[existingIdx];
      const existingUploaded = Boolean(existing.file_url && existing.file_url !== '' && existing.file_url !== 'Pending Upload');
      if (hasUploaded && !existingUploaded) {
        acc[existingIdx] = doc;
      }
    } else {
      acc.push(doc);
    }
    return acc;
  }, []);

  // Format response
  const formatted = documents.map((doc, idx) => ({
    id: doc.id,
    docId: doc.id,
    title: doc.file_name || doc.document_type_name || `Medical Document ${idx + 1}`,
    name: doc.file_name || doc.document_type_name || `Document ${idx + 1}`,
    fileName: doc.file_name || 'Document',
    file: doc.file_name || 'Document',
    fileUrl: doc.file_url || '',
    file_url: doc.file_url || '',
    url: doc.file_url || '',
    category: doc.category || doc.document_type_name || 'Medical Record',
    type: doc.category || doc.document_type_name || 'Medical Record',
    size: doc.file_size || null,
    fileSize: doc.file_size || null,
    source: doc.source || (doc.uploaded_by_role === 'AROGYA_SEVAK' ? 'ArogyaSevak Upload' : 'Citizen Upload'),
    uploaded_by_role: doc.uploaded_by_role || (doc.source?.toLowerCase().includes('sevak') ? 'AROGYA_SEVAK' : 'CITIZEN'),
    uploaderRole: doc.uploaded_by_role === 'AROGYA_SEVAK' ? 'ArogyaSevak' : 'Citizen',
    isSevakUpload: Boolean(doc.uploaded_by_role === 'AROGYA_SEVAK' || doc.source?.toLowerCase().includes('sevak')),
    status: doc.document_status || 'PENDING',
    document_status: doc.document_status || 'PENDING',
    verified: doc.document_status === 'VERIFIED',
    statusText: doc.document_status === 'VERIFIED' ? 'Verified' : 'Pending Verification',
    verificationRemark: doc.verification_remark || '',
    uploadedAt: doc.uploaded_at,
    date: doc.uploaded_at
      ? new Date(doc.uploaded_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : 'Recently',
    uploadedByName: doc.uploaded_by_name || (doc.uploaded_by_role === 'AROGYA_SEVAK' ? 'Arogya Sevak' : 'Citizen'),
    uploadedBy: doc.uploaded_by_name || (doc.uploaded_by_role === 'AROGYA_SEVAK' ? 'Arogya Sevak' : 'Citizen'),
    by: doc.uploaded_by_name || (doc.uploaded_by_role === 'AROGYA_SEVAK' ? 'Arogya Sevak' : 'Citizen'),
    verifiedAt: doc.verified_at,
    verifiedByName: doc.verified_by_name || null,
  }));

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, formatted, `${formatted.length} document(s) retrieved for application ${id}`)
  );
});

/**
 * Arogya Sevak or Admin updates clinical treatment progress & ward status
 * PUT/PATCH /api/applications/:id/treatment-progress
 */
export const updateTreatmentProgress = asyncHandler(async (req, res) => {
  const validation = validateTreatmentProgress(req.body);
  if (!validation.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: validation.error,
      errors: validation.errors,
    });
  }

  const userContext = req.user;
  const updated = await applicationService.updateTreatmentProgress(
    req.params.id,
    userContext,
    validation.data
  );

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      updated,
      `Treatment progress updated to "${validation.data.stage}" / उपचार प्रगती अद्ययावत केली गेली आहे`
    )
  );
});

/**
 * Upload and attach a new medical document to an application
 * Automatically creates an Admin Notification in public.notifications
 * POST /api/applications/:id/documents
 * POST /api/applications/case/:caseId/documents
 */
export const uploadApplicationDocument = asyncHandler(async (req, res) => {
  const targetKey = req.params.caseId || req.params.id || req.body.caseId || req.body.applicationId;
  const {
    title,
    docTitle,
    name,
    fileName,
    file_name,
    file_url,
    fileUrl,
    url,
    uri,
    secureUrl,
    category,
    size,
    fileSize,
    file_size,
    note,
    notes,
    source,
    reqDocId,
    is_sevak_upload,
  } = req.body;

  if (!targetKey) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Application ID or Case ID is required');
  }

  const finalUrl = file_url || fileUrl || url || uri || secureUrl;
  if (!finalUrl) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'File URL is required');
  }

  const resolvedTitle = docTitle || title || name || fileName || file_name || 'Medical Document';
  const resolvedFileName = fileName || file_name || `${resolvedTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}.jpg`;
  const finalCategory = category || (resolvedTitle.toLowerCase().includes('report') ? 'Lab Report' : 'Clinical Record');

  // Resolve application from UUID or Application Number / Case ID
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let app = null;
  if (UUID_REGEX.test(targetKey)) {
    app = await ApplicationModel.findById(targetKey);
  } else {
    app = await ApplicationModel.findByApplicationNumber(targetKey);
    if (!app) {
      app = await ApplicationModel.findById(targetKey);
    }
  }

  if (!app) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, `Application or Case '${targetKey}' not found`);
  }

  const sevakName =
    req.user?.full_name ||
    req.user?.name ||
    req.body.uploadedByName ||
    req.body.recordedBy ||
    'Arogya Sevak';
  const uploaderId = req.user?.id || null;
  const uploaderRole = req.user?.role || (is_sevak_upload !== false ? 'AROGYA_SEVAK' : 'CITIZEN');

  // Check if this fulfills an existing admin-requested document
  let existingDoc = null;
  if (reqDocId) {
    try {
      existingDoc = await ApplicationDocumentModel.findById(reqDocId);
    } catch (_) {}
  }

  if (!existingDoc) {
    const allDocs = await ApplicationDocumentModel.findByApplicationId(app.id);
    existingDoc = (allDocs || []).find((d) => {
      const matchName =
        (d.file_name && d.file_name.toLowerCase() === resolvedTitle.toLowerCase()) ||
        (d.file_name && d.file_name.toLowerCase() === resolvedFileName.toLowerCase()) ||
        d.file_name === 'Pending Upload';
      const isPending =
        d.document_status === 'PENDING_SEVAK_UPLOAD' ||
        d.document_status === 'PENDING_CITIZEN_UPLOAD' ||
        !d.file_url ||
        d.file_url === '';
      return matchName && (isPending || d.is_sevak_upload);
    });
  }

  let savedDoc;
  if (existingDoc) {
    savedDoc = await ApplicationDocumentModel.update(existingDoc.id, {
      file_url: finalUrl,
      file_name: resolvedTitle,
      category: finalCategory,
      document_status: 'UPLOADED',
      is_sevak_upload: true,
      uploaded_by_role: uploaderRole,
      verification_remark: note || notes || 'Uploaded by Arogya Sevak — Ready for Verification',
      uploaded_by_user_id: uploaderId,
    });
  } else {
    savedDoc = await ApplicationDocumentModel.create({
      application_id: app.id,
      document_type_id: null,
      file_url: finalUrl,
      file_name: resolvedTitle,
      category: finalCategory,
      file_size: size || fileSize || file_size || '1.5 MB',
      source: source || 'ArogyaSevak Upload',
      document_status: 'UPLOADED',
      is_sevak_upload: true,
      uploaded_by_role: uploaderRole,
      verification_remark: note || notes || 'Uploaded by Arogya Sevak — Ready for Verification',
      uploaded_by_user_id: uploaderId,
    });
  }

  // Create Notification for Admin Desk
  try {
    const { NotificationModel } = await import('../models/notification.model.js');
    const caseIdentifier = app.application_number || targetKey;
    const patientName = app.patient_name || 'Patient';

    await NotificationModel.create({
      recipient_type: 'ADMIN',
      type: 'DOCUMENT_UPLOADED',
      priority: 'HIGH',
      title: 'New Document Uploaded',
      title_en: 'New Document Uploaded',
      title_hi: 'नवा दस्तऐवज अपलोड केला',
      message: `Arogya Sevak ${sevakName} uploaded document "${resolvedTitle}" (${resolvedFileName}) for Case ${caseIdentifier} (${patientName}).`,
      message_en: `Arogya Sevak ${sevakName} uploaded document "${resolvedTitle}" (${resolvedFileName}) for Case ${caseIdentifier} (${patientName}).`,
      message_hi: `आरोग्य सेवक ${sevakName} यांनी प्रकरण ${caseIdentifier} (${patientName}) साठी दस्तऐवज "${resolvedTitle}" अपलोड केला आहे.`,
      sender: `आरोग्य सेवक / ${sevakName}`,
      sender_en: `Arogya Sevak / ${sevakName}`,
      sender_hi: `आरोग्य सेवक / ${sevakName}`,
      application_id: app.id,
      case_id: caseIdentifier,
      requested_doc_name: finalName,
      requested_doc_type: finalCategory,
      sevak_name: sevakName,
      badge: 'New Document',
      badge_en: 'New Document',
      badge_hi: 'नवा दस्तऐवज',
      metadata: {
        document_id: createdDoc.id,
        file_url: finalUrl,
        uploaded_by_role: req.user?.role || 'AROGYA_SEVAK',
        uploaded_by_name: sevakName,
        case_id: caseIdentifier,
        patient_name: patientName,
      },
    });
  } catch (notifErr) {
    console.warn('[uploadApplicationDocument] Admin notification warning:', notifErr.message);
  }

  return res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(
      HTTP_STATUS.CREATED,
      {
        document: createdDoc,
        applicationId: app.id,
        caseId: app.application_number || targetKey,
      },
      'Document uploaded and attached successfully to application'
    )
  );
});

/**
 * Admin: Claim a case for review
 * POST /api/admins/applications/:id/claim
 */
export const claimCase = asyncHandler(async (req, res) => {
  const result = await applicationService.claimApplication(
    req.params.id,
    req.user,
    req.body
  );

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, result, 'Case claimed successfully by reviewer'));
});

/**
 * Admin: Unclaim / release review claim on a case
 * POST /api/admins/applications/:id/unclaim
 */
export const unclaimCase = asyncHandler(async (req, res) => {
  const result = await applicationService.unclaimApplication(
    req.params.id,
    req.user
  );

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, result, 'Case claim released successfully'));
});

/**
 * Admin: Assign reviewer to a specific Admin
 * POST /api/admins/applications/:id/assign-reviewer
 */
export const assignReviewer = asyncHandler(async (req, res) => {
  const result = await applicationService.assignReviewer(
    req.params.id,
    req.user,
    req.body
  );

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, result, 'Case reviewer assigned successfully'));
});

export default {
  submitApplication,
  getMyApplications,
  getApplicationById,
  getApplicationDocuments,
  uploadApplicationDocument,
  resubmitDocument,
  remindAdmin,
  requestCaseReopen,
  reopenApplication,
  getAllApplications,
  getApplicationStats,
  updateApplicationStatus,
  updateTreatmentProgress,
  requestDocument,
  verifyDocument,
  assignCase,
  addRemark,
  getSevakAssignedApplications,
  uploadSevakDocument,
  claimCase,
  unclaimCase,
  assignReviewer,
};
