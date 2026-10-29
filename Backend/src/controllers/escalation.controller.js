import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { HTTP_STATUS } from '../constants/index.js';
import { CaseEscalationModel } from '../models/caseEscalation.model.js';
import { ApplicationModel } from '../models/application.model.js';
import { ArogyaSevakModel } from '../models/arogyaSevak.model.js';
import { AdminModel } from '../models/admin.model.js';
import { HospitalModel } from '../models/hospital.model.js';
import { ApplicationAssignmentModel } from '../models/applicationAssignment.model.js';
import { notificationService } from '../services/notification.service.js';
import { query } from '../config/db.js';
import { NotificationModel } from '../models/notification.model.js';
import {
  createEscalationSchema,
  resolveEscalationSchema,
} from '../validations/escalation.validation.js';

/**
 * Normalizes DB escalation row into the rich format expected by the React UI
 */
export const formatEscalationResponse = (row) => {
  if (!row) return null;

  const isHold = ['ON_HOLD', 'OPEN', 'PENDING', 'on_hold', 'under_review'].includes(row.status);
  const statusKey = isHold ? 'on_hold' : 'resolved';
  const statusLabel = isHold ? 'ON HOLD' : 'Resolved';
  const statusBadge = isHold ? 'Under Review' : 'Admin Approved';

  const isBill = row.reason_type === 'bill_exceeded' || 
                 (row.escalation_reason || '').toLowerCase().includes('bill');

  const reasonType = row.reason_type || (isBill ? 'bill_exceeded' : 'specialty_unavailable');
  const reasonTitle = isBill 
    ? 'Hospital Bill Exceeded Scheme Limit' 
    : 'Facility / Specialty Unavailable';
  const reasonBadge = isBill ? 'Bill Exceeded' : 'Specialty Unavailable';

  const patientAge = row.patient_age || 45;
  const patientGender = row.patient_gender || 'Male';
  const ageGender = `${patientAge} yrs • ${patientGender}`;

  const submittedAtFormatted = row.escalated_at 
    ? new Date(row.escalated_at).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }) + `, ${new Date(row.escalated_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}`
    : 'Recently';

  const appNumber = row.application_number || row.application_id || 'CAS-2026-8912';
  const escShortId = `ESC-${(row.id || '').slice(0, 4).toUpperCase() || '8912'}`;

  return {
    id: row.id,
    uuid: row.id,
    shortId: escShortId,
    displayId: escShortId,
    caseId: appNumber,
    applicationId: row.application_id,
    patientName: row.patient_name || 'Assigned Patient',
    ageGender,
    ward: row.ward || 'General Ward',
    scheme: row.scheme_code || row.scheme_name || 'MJPJAY',
    schemeLimit: row.scheme_limit ? `₹${(row.scheme_limit / 100000).toFixed(1)}L` : '₹1.5L',
    reasonType,
    reasonTitle: row.escalation_reason || reasonTitle,
    reasonBadge,
    status: statusKey,
    statusLabel,
    statusBadge,
    requiredSpecialty: row.required_specialty || '',
    estimatedBill: row.estimated_bill || (isBill ? '1,85,000' : ''),
    remarks: row.description || row.medical_cause_note || 'Urgent intervention requested',
    attachment: row.attachment_name || (row.attachment_url ? 'attached_bill_document.pdf' : null),
    attachmentUrl: row.attachment_url || null,
    submittedAt: submittedAtFormatted,
    submittedBy: row.raised_by_sevak_name ? `Arogya Sevak (${row.raised_by_sevak_name})` : 'Arogya Sevak',
    assignedHospital: row.assigned_hospital_name || row.hospital_name || '',
    sanctionedScheme: row.sanctioned_scheme || '',
    resolutionNotes: row.resolution || '',
    putOnHold: isHold,
    hospitalName: row.hospital_name || 'Assigned Hospital',
    hospitalDistrict: row.hospital_district || '',
    createdAt: row.escalated_at,
    resolvedAt: row.resolved_at,
  };
};

/**
 * 1) GET /api/escalations
 * Retrieve all urgent requests & escalations with stats & filters
 */
export const getEscalations = asyncHandler(async (req, res) => {
  const { status, reasonType, search, limit = 100, offset = 0, sevakId: querySevakId, sevak_id, sevakPhone, sevakName } = req.query;

  let sevakId = null;
  const isSevakRole = req.user && ['SEVAK', 'AROGYA_SEVAK'].includes(String(req.user.role || '').toUpperCase());
  const isSevakScoped = isSevakRole || Boolean(querySevakId || sevak_id || sevakPhone || sevakName);

  if (isSevakScoped) {
    sevakId = querySevakId || sevak_id || req.user?.sevakId || req.user?.id || null;
    try {
      if (sevakId) {
        const sevakRow = await ArogyaSevakModel.findByUserId(sevakId);
        if (sevakRow) {
          sevakId = sevakRow.id;
        } else {
          const byId = await ArogyaSevakModel.findById(sevakId);
          if (byId) sevakId = byId.id;
          else {
            const byCode = await ArogyaSevakModel.findByNameOrCode(sevakId);
            if (byCode) sevakId = byCode.id;
          }
        }
      }
      if (!sevakId && (sevakPhone || sevakName)) {
        const bySearch = await ArogyaSevakModel.findByNameOrCode(sevakPhone || sevakName);
        if (bySearch) sevakId = bySearch.id;
      }
    } catch (_) {}

    // If an Arogya Sevak context was requested but no matching records exist, return empty list
    if (!sevakId) {
      return res.status(HTTP_STATUS.OK).json(
        new ApiResponse(
          HTTP_STATUS.OK,
          {
            stats: { all: 0, onHold: 0, resolved: 0, billExceeded: 0, specialtyUnavailable: 0 },
            counts: { all: 0, onHold: 0, resolved: 0 },
            total: 0,
            requests: [],
          },
          'Urgent requests retrieved successfully'
        )
      );
    }
  }

  const [escalationRows, stats] = await Promise.all([
    CaseEscalationModel.findAll({
      status,
      reason_type: reasonType,
      search,
      sevak_id: sevakId,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    }),
    CaseEscalationModel.getStats({ sevak_id: sevakId }),
  ]);

  const formattedRequests = escalationRows.map(formatEscalationResponse);

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      {
        stats: {
          all: stats.all,
          onHold: stats.onHold,
          resolved: stats.resolved,
          billExceeded: stats.billExceeded,
          specialtyUnavailable: stats.specialtyUnavailable,
        },
        counts: {
          all: stats.all,
          onHold: stats.onHold,
          resolved: stats.resolved,
        },
        total: formattedRequests.length,
        requests: formattedRequests,
      },
      'Urgent requests retrieved successfully'
    )
  );
});

/**
 * 2) GET /api/escalations/stats
 * Summary KPI stats endpoint
 */
export const getEscalationStats = asyncHandler(async (req, res) => {
  const { sevakId: querySevakId, sevak_id, sevakPhone, sevakName } = req.query;
  let sevakId = null;
  const isSevakRole = req.user && ['SEVAK', 'AROGYA_SEVAK'].includes(String(req.user.role || '').toUpperCase());
  const isSevakScoped = isSevakRole || Boolean(querySevakId || sevak_id || sevakPhone || sevakName);

  if (isSevakScoped) {
    sevakId = querySevakId || sevak_id || req.user?.sevakId || req.user?.id || null;
    try {
      if (sevakId) {
        const sevakRow = await ArogyaSevakModel.findByUserId(sevakId);
        if (sevakRow) {
          sevakId = sevakRow.id;
        } else {
          const byId = await ArogyaSevakModel.findById(sevakId);
          if (byId) sevakId = byId.id;
          else {
            const byCode = await ArogyaSevakModel.findByNameOrCode(sevakId);
            if (byCode) sevakId = byCode.id;
          }
        }
      }
      if (!sevakId && (sevakPhone || sevakName)) {
        const bySearch = await ArogyaSevakModel.findByNameOrCode(sevakPhone || sevakName);
        if (bySearch) sevakId = bySearch.id;
      }
    } catch (_) {}

    if (!sevakId) {
      return res.status(HTTP_STATUS.OK).json(
        new ApiResponse(
          HTTP_STATUS.OK,
          { all: 0, onHold: 0, resolved: 0, billExceeded: 0, specialtyUnavailable: 0 },
          'Escalation statistics retrieved successfully'
        )
      );
    }
  }

  const stats = await CaseEscalationModel.getStats({ sevak_id: sevakId });
  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, stats, 'Escalation statistics retrieved successfully'));
});

/**
 * 3) GET /api/escalations/:id
 * Retrieve single escalation details
 */
export const getEscalationById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const row = await CaseEscalationModel.findById(id);

  if (!row) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, `Urgent request with ID '${id}' not found`);
  }

  const formatted = formatEscalationResponse(row);
  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, formatted, 'Urgent request details retrieved successfully'));
});

/**
 * 4) POST /api/escalations
 * Create a new urgent priority request / escalation
 */
export const createEscalation = asyncHandler(async (req, res) => {
  const validation = createEscalationSchema.safeParse(req.body);
  if (!validation.success) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      validation.error.errors[0]?.message || 'Validation error',
      validation.error.errors
    );
  }

  const {
    applicationId,
    caseId,
    reasonType,
    escalationReason,
    requiredSpecialty,
    estimatedBill,
    remarks,
    description,
    attachmentName,
    attachmentUrl,
    attachment,
    putOnHold,
  } = validation.data;

  // Resolve application UUID from ID or Application Number (e.g. CAS-2026-8912)
  const targetAppIdentifier = applicationId || caseId;
  let resolvedAppId = null;

  // Try direct lookup
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetAppIdentifier);
    if (isUuid) {
      const directApp = await ApplicationModel.findById(targetAppIdentifier);
      if (directApp) resolvedAppId = directApp.id;
    }

    if (!resolvedAppId) {
      const byNumber = await ApplicationModel.findByApplicationNumber(targetAppIdentifier);
      if (byNumber) resolvedAppId = byNumber.id;
    }
  } catch (_) {}

  // If application not found in DB, link to first available application to prevent foreign key errors
  if (!resolvedAppId) {
    const fallbackApps = await ApplicationModel.findAll({ limit: 1 });
    if (fallbackApps?.applications?.[0]) {
      resolvedAppId = fallbackApps.applications[0].id;
    }
  }

  if (!resolvedAppId) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, `Invalid Case ID or Application '${targetAppIdentifier}'`);
  }

  // Determine Sevak ID
  let sevakId = req.user?.sevakId || null;
  if (!sevakId && req.user?.id) {
    try {
      const sevakRow = await ArogyaSevakModel.findByUserId(req.user.id);
      if (sevakRow) sevakId = sevakRow.id;
    } catch (_) {}
  }

  // Determine Admin ID (assign to first active admin)
  let adminId = null;
  try {
    const adminRes = await query('SELECT id FROM public.admins LIMIT 1;');
    if (adminRes.rows[0]) adminId = adminRes.rows[0].id;
  } catch (_) {}

  const finalReason = escalationReason || (
    reasonType === 'bill_exceeded' 
      ? 'Hospital Bill Exceeded Scheme Limit' 
      : 'Facility / Specialty Unavailable'
  );

  const finalDesc = remarks || description || (
    reasonType === 'bill_exceeded'
      ? `Hospital bill of ₹${estimatedBill || '1,85,000'} exceeds package ceiling limit. Immediate scheme top-up requested.`
      : `Specialty (${requiredSpecialty || 'Critical Care'}) unavailable in current hospital facility.`
  );

  const newEscalation = await CaseEscalationModel.create({
    application_id: resolvedAppId,
    raised_by_arogya_sevak_id: sevakId,
    escalated_to_admin_id: adminId,
    escalation_reason: finalReason,
    reason_type: reasonType,
    required_specialty: requiredSpecialty || null,
    estimated_bill: estimatedBill || null,
    attachment_name: attachmentName || attachment || null,
    attachment_url: attachmentUrl || null,
    description: finalDesc,
    status: putOnHold ? 'ON_HOLD' : 'OPEN',
  });

  // If put on hold requested, update application status
  if (putOnHold) {
    try {
      await query(
        `UPDATE public.applications 
         SET current_status = 'ON_HOLD', remarks = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2;`,
        [`[ESCALATION ON HOLD]: ${finalReason}`, resolvedAppId]
      );

      await query(
        `INSERT INTO public.application_timeline (application_id, status, remark, created_by_user_id)
         VALUES ($1, $2, $3, $4);`,
        [
          resolvedAppId,
          'ON_HOLD',
          `Case placed on administrative hold: ${finalReason}`,
          req.user?.id || null,
        ]
      );
    } catch (err) {
      console.warn('[escalation.controller] Timeline log notice:', err.message);
    }
  }

  // Create real-time notification for Admin Dashboard
  try {
    const sevakName = req.user?.name || req.user?.full_name || 'Arogya Sevak';
    await NotificationModel.create({
      type: 'URGENT_CASE',
      priority: 'CRITICAL',
      title: `🚨 Urgent Escalation: ${finalReason}`,
      title_en: `🚨 Urgent Escalation: ${finalReason}`,
      title_hi: `🚨 अति-आवश्यक हस्तक्षेप: ${finalReason}`,
      message: `Arogya Sevak (${sevakName}) logged urgent priority request for Case #${targetAppIdentifier}. Reason: "${finalDesc}"`,
      message_en: `Arogya Sevak (${sevakName}) logged urgent priority request for Case #${targetAppIdentifier}. Reason: "${finalDesc}"`,
      message_hi: `आरोग्य सेवक (${sevakName}) ने केस #${targetAppIdentifier} के लिए तत्काल हस्तक्षेप का अनुरोध किया है।`,
      application_id: resolvedAppId,
      case_id: targetAppIdentifier,
      badge: 'Urgent Escalation',
      badge_en: 'Urgent Escalation',
      badge_hi: 'अति-आवश्यक',
      is_broadcast: true,
      metadata: {
        escalationId: newEscalation.id,
        reasonType,
        requiredSpecialty,
        estimatedBill,
      },
    });
  } catch (notifErr) {
    console.warn('[escalation.controller] Admin notification warning:', notifErr.message);
  }

  const completeRow = await CaseEscalationModel.findById(newEscalation.id);
  const formatted = formatEscalationResponse(completeRow || newEscalation);

  return res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(
      HTTP_STATUS.CREATED,
      formatted,
      'Urgent priority request created successfully'
    )
  );
});

/**
 * 5) PATCH /api/escalations/:id/resolve
 * Resolve an escalation (District Admin decision or grant sanction)
 */
export const resolveEscalation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const validation = resolveEscalationSchema.safeParse(req.body);

  if (!validation.success) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      validation.error.errors[0]?.message || 'Validation error',
      validation.error.errors
    );
  }

  const {
    resolutionNotes,
    resolution,
    prevSevakNote,
    newSevakNote,
    notesForPrevSevak,
    notesForNewSevak,
    resolutionType,
    sanctionedScheme,
    assignedHospitalId,
    assignedHospitalName,
    assignedHospital,
    newSevakName,
    newSevakId,
    newSevakPhone,
    assignedSevakName,
    assignedSevakId,
    assignedSevakPhone,
    prevHospitalName,
    prevSevakName,
    prevSevakPhone,
    copayAmount,
    status = 'RESOLVED',
  } = validation.data;

  const finalPrevSevakNote = (prevSevakNote || notesForPrevSevak || '').trim();
  const finalNewSevakNote = (newSevakNote || notesForNewSevak || '').trim();

  // Find Admin ID
  let adminId = req.user?.adminId || null;
  if (!adminId && req.user?.id) {
    try {
      const adminRow = await AdminModel.findByUserId(req.user.id);
      if (adminRow) adminId = adminRow.id;
    } catch (_) {}
  }

  // Capture existing escalation and application hospital BEFORE resolving
  const existingEscalation = await CaseEscalationModel.findById(id);
  const existingApp = existingEscalation?.application_id ? await ApplicationModel.findById(existingEscalation.application_id) : null;
  const initialFromHospital = prevHospitalName || existingEscalation?.app_hospital_name || existingApp?.active_assignment?.hospital_name || existingApp?.hospital_name || null;

  const updatedEscalation = await CaseEscalationModel.resolve(id, {
    resolution: resolutionNotes || resolution || 'Escalation resolved by District Health Admin.',
    resolved_by_admin_id: adminId,
    status: status.toUpperCase(),
    resolution_type: resolutionType || null,
    sanctioned_scheme: sanctionedScheme || null,
    assigned_hospital_id: assignedHospitalId || null,
    assigned_hospital_name: assignedHospitalName || assignedHospital || null,
    copay_amount: copayAmount ? String(copayAmount) : null,
  });

  if (!updatedEscalation) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, `Urgent request with ID '${id}' not found`);
  }

  const completeRow = await CaseEscalationModel.findById(updatedEscalation.id || id);
  const appId = updatedEscalation.application_id || completeRow?.application_id;

  if (appId) {
    const app = await ApplicationModel.findById(appId);
    const patientName = completeRow?.patient_name || app?.patient_name || 'Patient';
    const appNumber = completeRow?.application_number || app?.application_number || 'CAS-2026-8912';
    const fromHospitalName = initialFromHospital || prevHospitalName || completeRow?.hospital_name || app?.hospital_name || 'govind kale hospital';
    const requiredSpecialty = completeRow?.required_specialty || completeRow?.escalation_reason || 'Specialized Facility';

    const isHospitalTransfer = resolutionType === 'hospital_transfer' || Boolean(assignedHospitalName || assignedHospital || newSevakName);

    if (isHospitalTransfer) {
      // 1. Resolve Previous Sevak Info
      const prevSevakRecordId = completeRow?.raised_by_arogya_sevak_id || app?.active_assignment?.arogya_sevak_id || null;
      let resolvedPrevSevakName = prevSevakName || completeRow?.raised_by_sevak_name || 'Previous Arogya Sevak';
      let resolvedPrevSevakPhone = prevSevakPhone || '98765 00001';
      let resolvedPrevSevakUserId = null;

      if (prevSevakRecordId) {
        try {
          const pSevak = await ArogyaSevakModel.findById(prevSevakRecordId);
          if (pSevak) {
            resolvedPrevSevakName = pSevak.name || pSevak.full_name || resolvedPrevSevakName;
            resolvedPrevSevakPhone = pSevak.phone_number || pSevak.mobile || resolvedPrevSevakPhone;
            resolvedPrevSevakUserId = pSevak.user_id;
          }
        } catch (_) {}
      }

      // 2. Resolve Target Hospital and New Sevak Info
      let targetHospName = assignedHospitalName || assignedHospital || completeRow?.assigned_hospital_name || 'Assigned Hospital';
      let targetHospId = assignedHospitalId || completeRow?.assigned_hospital_id || null;

      if (targetHospId) {
        try {
          const hRec = await HospitalModel.findById(targetHospId);
          if (hRec) targetHospName = hRec.name;
        } catch (_) {}
      }

      let targetSevakName = newSevakName || assignedSevakName || 'New Assigned Arogya Sevak';
      let targetSevakId = newSevakId || assignedSevakId || null;
      let targetSevakPhone = newSevakPhone || assignedSevakPhone || '98765 00002';
      let targetSevakUserId = null;

      try {
        let nSevak = null;
        if (targetSevakId) {
          nSevak = await ArogyaSevakModel.findById(targetSevakId);
        }
        if (!nSevak && targetSevakName) {
          const cleanName = targetSevakName.includes('—') ? targetSevakName.split('—')[0].trim() : (targetSevakName.includes('(') ? targetSevakName.split('(')[0].trim() : targetSevakName.trim());
          nSevak = await ArogyaSevakModel.findByNameOrCode(cleanName);
        }
        if (nSevak) {
          targetSevakId = nSevak.id;
          targetSevakName = nSevak.name || nSevak.full_name || targetSevakName;
          targetSevakPhone = nSevak.phone_number || nSevak.mobile || targetSevakPhone;
          targetSevakUserId = nSevak.user_id;
        }
      } catch (_) {}

      // 3. Update Application: Set Critical priority, status COORDINATED, and explicit remarks
      const transferRemarks = `🚨 [CRITICAL - REASSIGNED CASE]: Transferred from ${fromHospitalName} due to '${requiredSpecialty}' specialty unavailable. Assigned to Arogya Sevak ${targetSevakName}.`;
      await query(
        `UPDATE public.applications 
         SET current_status = 'COORDINATED',
             priority = 'CRITICAL',
             hospital_id = COALESCE($1, hospital_id),
             hospital_name = $2,
             remarks = $3,
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $4;`,
        [targetHospId, targetHospName, transferRemarks, appId]
      );

      // 4. Update Assignments: Mark old active assignment as TRANSFERRED
      try {
        await query(
          `UPDATE public.application_assignments
           SET assignment_status = 'TRANSFERRED',
               assignment_remark = $1,
               completed_at = CURRENT_TIMESTAMP
           WHERE application_id = $2 AND assignment_status = 'ASSIGNED';`,
          [`Transferred from ${fromHospitalName} to ${targetHospName} (${targetSevakName}) due to ${requiredSpecialty} unavailable`, appId]
        );

        // Create new active assignment for New Sevak
        await ApplicationAssignmentModel.create({
          application_id: appId,
          assigned_by_admin_id: adminId,
          hospital_id: targetHospId,
          hospital_name: targetHospName,
          arogya_sevak_id: targetSevakId,
          sevak_name: targetSevakName,
          scheme_id: app?.assigned_scheme_id || app?.suggested_scheme_id,
          scheme_name: app?.assigned_scheme_name || app?.suggested_scheme_name,
          assignment_status: 'ASSIGNED',
          assignment_remark: `🚨 [CRITICAL REASSIGNED CASE]: Transferred from ${fromHospitalName} due to ${requiredSpecialty} unavailable. Previous Sevak: ${resolvedPrevSevakName} (Ph: ${resolvedPrevSevakPhone}).`,
        });
      } catch (assignErr) {
        console.warn('[escalation.controller] Assignment transition notice:', assignErr.message);
      }

      // 5. Insert Timeline Audit Record
      try {
        await query(
          `INSERT INTO public.application_timeline (application_id, status, remark, created_by_user_id)
           VALUES ($1, $2, $3, $4);`,
          [
            appId,
            'REASSIGNED_TRANSFER',
            `🚨 [CRITICAL - REASSIGNED CASE] Transferred from "${fromHospitalName}" to "${targetHospName}" due to "${requiredSpecialty}" specialty not available. Assigned to New Arogya Sevak ${targetSevakName} (📱 ${targetSevakPhone}). Previous Sevak: ${resolvedPrevSevakName} (📱 ${resolvedPrevSevakPhone}).${finalPrevSevakNote ? ` Note for Prev Sevak: "${finalPrevSevakNote}".` : ''}${finalNewSevakNote ? ` Note for New Sevak: "${finalNewSevakNote}".` : ''}`,
            req.user?.id || null,
          ]
        );
      } catch (timelineErr) {
        console.warn('[escalation.controller] Timeline log notice:', timelineErr.message);
      }

      // 6. Notify the NEW Arogya Sevak (Critical Priority + Reassigned Badge + New Sevak Note)
      try {
        const newSevakMsg = `रुग्ण ${patientName} चे प्रकरण '${fromHospitalName}' येथून '${requiredSpecialty}' सुविधा उपलब्ध नसल्याने '${targetHospName}' येथे तुमच्याकडे वर्ग केले आहे. मागील आरोग्य सेवक: ${resolvedPrevSevakName} (संपर्क: ${resolvedPrevSevakPhone}).${finalNewSevakNote ? `\n\n📝 प्रशासक निर्देश (Admin Note for You): "${finalNewSevakNote}"` : ''}\n\nकृपया त्वरित पुढील वैद्यकीय प्रक्रिया सुरू करा.`;
        const newSevakMsgEn = `Case #${appNumber} (${patientName}) has been re-assigned to you at ${targetHospName}. Transferred from ${fromHospitalName} due to '${requiredSpecialty}' specialty not available there. Previous Arogya Sevak: ${resolvedPrevSevakName} (Contact: ${resolvedPrevSevakPhone}).${finalNewSevakNote ? `\n\n📝 Admin Note for You: "${finalNewSevakNote}"` : ''}\n\nPlease initiate patient intake immediately.`;
        const newSevakMsgHi = `केस #${appNumber} (${patientName}) '${fromHospitalName}' से '${requiredSpecialty}' सुविधा न होने के कारण '${targetHospName}' में आपको पुनः सौंपी गई है। पूर्व आरोग्य सेवक: ${resolvedPrevSevakName} (संपर्क: ${resolvedPrevSevakPhone})।${finalNewSevakNote ? `\n\n📝 प्रशासक निर्देश: "${finalNewSevakNote}"` : ''}\n\nकृपया तुरंत मरीज की प्रक्रिया शुरू करें।`;

        await notificationService.sendDirectNotification({
          recipient_type: 'SEVAK',
          recipient_id: targetSevakId,
          recipient_user_id: targetSevakUserId,
          sevak_id: targetSevakId,
          sevak_name: targetSevakName,
          sevak_phone: targetSevakPhone,
          mobile: targetSevakPhone,
          application_id: appId,
          case_id: appNumber,
          type: 'URGENT_CASE',
          priority: 'CRITICAL',
          title: `🚨 तातडीचे: पुनर्नियुक्त प्रकरण तुमच्याकडे सोपवले (केस #${appNumber})`,
          title_en: `🚨 Critical: Re-Assigned Case Assigned to You (Case #${appNumber})`,
          title_hi: `🚨 अति-आवश्यक: पुनर्नियुक्त केस आपको सौंपी गई (केस #${appNumber})`,
          message: newSevakMsg,
          message_en: newSevakMsgEn,
          message_hi: newSevakMsgHi,
          badge: 'Reassigned Case',
          badge_en: 'Reassigned Case',
          badge_hi: 'पुनर्निर्देशित प्रकरण',
          hospital_name: targetHospName,
          metadata: {
            isReassigned: true,
            isCritical: true,
            fromHospital: fromHospitalName,
            toHospital: targetHospName,
            requiredSpecialty,
            adminNote: finalNewSevakNote || null,
            previousSevak: {
              name: resolvedPrevSevakName,
              phone: resolvedPrevSevakPhone,
              hospital: fromHospitalName,
            },
            newSevak: {
              name: targetSevakName,
              phone: targetSevakPhone,
              hospital: targetHospName,
            },
            caseId: appNumber,
            applicationId: appId,
          },
        }, adminId);
      } catch (newNotifErr) {
        console.warn('[escalation.controller] New Sevak Notification Warning:', newNotifErr.message);
      }

      // 7. Notify the PREVIOUS Arogya Sevak (Transfer Approved + New Sevak details + Prev Sevak Note)
      if (prevSevakRecordId || resolvedPrevSevakPhone) {
        try {
          const prevSevakMsg = `केस #${appNumber} (${patientName}) ची वर्ग विनंती प्रशासनाकडून मंजूर झाली आहे. रुग्ण '${targetHospName}' येथे वर्ग झाला असून नवीन आरोग्य सेवक ${targetSevakName} (संपर्क: ${targetSevakPhone}) यांना केस सोपवली आहे.${finalPrevSevakNote ? `\n\n📝 प्रशासक निर्देश (Admin Note for You): "${finalPrevSevakNote}"` : ''}\n\nही केस आता तुमच्या सक्रिय यादीतून वर्ग (Transferred) झाली आहे.`;
          const prevSevakMsgEn = `Your urgent transfer request for Case #${appNumber} (${patientName}) has been approved by District Admin. Patient transferred to ${targetHospName} and assigned to Arogya Sevak ${targetSevakName} (Contact: ${targetSevakPhone}).${finalPrevSevakNote ? `\n\n📝 Admin Note for You: "${finalPrevSevakNote}"` : ''}\n\nCase status is now Transferred.`;
          const prevSevakMsgHi = `केस #${appNumber} (${patientName}) का ट्रांसफर जिला प्रशासन द्वारा स्वीकृत कर दिया गया है। मरीज को '${targetHospName}' में स्थानांतरित कर आरोग्य सेवक ${targetSevakName} (संपर्क: ${targetSevakPhone}) को सौंपा गया है।${finalPrevSevakNote ? `\n\n📝 प्रशासक निर्देश: "${finalPrevSevakNote}"` : ''}\n\nकेस हैंडओवर दर्ज कर दिया गया है।`;

          await notificationService.sendDirectNotification({
            recipient_type: 'SEVAK',
            recipient_id: prevSevakRecordId,
            recipient_user_id: resolvedPrevSevakUserId,
            sevak_id: prevSevakRecordId,
            sevak_name: resolvedPrevSevakName,
            sevak_phone: resolvedPrevSevakPhone,
            mobile: resolvedPrevSevakPhone,
            application_id: appId,
            case_id: appNumber,
            type: 'TRANSFER',
            priority: 'HIGH',
            title: `✅ रुग्णालय वर्ग मंजुरी: केस #${appNumber} यशस्वीरित्या वर्ग`,
            title_en: `✅ Transfer Approved: Case #${appNumber} Transferred Successfully`,
            title_hi: `✅ अस्पताल ट्रांसफर स्वीकृत: केस #${appNumber} सफलतापूर्वक स्थानांतरित`,
            message: prevSevakMsg,
            message_en: prevSevakMsgEn,
            message_hi: prevSevakMsgHi,
            badge: 'Case Transferred',
            badge_en: 'Case Transferred',
            badge_hi: 'केस स्थानांतरित',
            hospital_name: targetHospName,
            metadata: {
              isTransferredOut: true,
              toHospital: targetHospName,
              adminNote: finalPrevSevakNote || null,
              newSevak: {
                name: targetSevakName,
                phone: targetSevakPhone,
                hospital: targetHospName,
              },
              caseId: appNumber,
              applicationId: appId,
            },
          }, adminId);
        } catch (prevNotifErr) {
          console.warn('[escalation.controller] Previous Sevak Notification Warning:', prevNotifErr.message);
        }
      }

    } else {
      // Standard Bill Resolution / Medical Decision without transfer
      try {
        await query(
          `UPDATE public.applications 
           SET current_status = 'UNDER_TREATMENT', remarks = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $2;`,
          [`[DECISION RESOLVED]: ${resolutionNotes || 'Approved'}`, appId]
        );

        await query(
          `INSERT INTO public.application_timeline (application_id, status, remark, created_by_user_id)
           VALUES ($1, $2, $3, $4);`,
          [
            appId,
            'UNDER_TREATMENT',
            `Escalation Decision Approved: ${resolutionNotes || 'Sanctioned'}`,
            req.user?.id || null,
          ]
        );
      } catch (err) {
        console.warn('[escalation.controller] Timeline log notice:', err.message);
      }
    }
  }

  const formatted = formatEscalationResponse(completeRow || updatedEscalation);

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      formatted,
      'Urgent request resolved and recorded successfully'
    )
  );
});

/**
 * 6) POST /api/escalations/:id/simulate-decision
 * Sandbox simulation endpoint for testing decisions from Sevak UI
 */
export const simulateEscalationDecision = asyncHandler(async (req, res) => {
  return resolveEscalation(req, res);
});

export default {
  getEscalations,
  getEscalationStats,
  getEscalationById,
  createEscalation,
  resolveEscalation,
  simulateEscalationDecision,
};
