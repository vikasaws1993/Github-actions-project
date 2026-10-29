import api from './api';

const STORAGE_KEY_APPS = 'arogyamitra_admin_applications_cache';
const STORAGE_KEY_STATS = 'arogyamitra_admin_stats_cache';

let _cachedAdminApps = (() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_APPS);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
})();
let _cachedAdminStats = (() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STATS);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
})();

let _inFlightAdminAppsPromise = null;
let _inFlightAdminStatsPromise = null;
const _adminCaseDetailsCache = new Map();

export const isSevakDocName = (_docName) => {
  return false;
};

export const formatDateDDMMYYYY = (dateVal) => {
  if (!dateVal) return '-';
  if (typeof dateVal === 'string') {
    const trimmed = dateVal.trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed;
    if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) return trimmed.replace(/-/g, '/');
  }
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Normalizes an application record from backend API or local mock
 * to ensure all UI components can reliably access fields.
 */
export const normalizeApplication = (app) => {
  if (!app) return null;

  const rawId = app.applicationNumber || app.caseId || app.id || 'AA-2026-00001';
  const cleanId = String(rawId).replace(/-APP-/gi, '-').replace(/APP-/gi, '').replace(/-APP/gi, '');

  const applicantName =
    typeof app.applicant === 'string'
      ? app.applicant
      : app.applicant?.name || app.citizenName || app.patient_name || 'Applicant';

  const patientName =
    typeof app.patient === 'string'
      ? app.patient
      : app.patient?.name || app.patientName || applicantName;

  const applicantObj =
    typeof app.applicant === 'object' && app.applicant !== null
      ? app.applicant
      : {
        name: applicantName,
        mobile: app.contact || app.citizen_mobile || '—',
        email: app.email || app.citizen_email || '',
        addressLine: app.citizen_address || app.citizen_address_line || app.addressLine || '',
        address: app.citizen_address || app.citizen_address_line || app.address || '',
        city: app.citizen_city || app.city || '',
        taluka: app.citizen_taluka || app.taluka || '',
        district: app.citizen_district || app.district || 'Pune',
        pincode: app.citizen_pincode || app.pincode || '',
      };

  const patientObj =
    typeof app.patient === 'object' && app.patient !== null
      ? app.patient
      : {
        name: patientName,
        age: app.age ?? 30,
        gender: app.gender || 'Male',
        mobile: app.contact || app.patient_mobile || '—',
        addressLine: app.patient_address || app.patient_address_line || app.addressLine || app.address || '',
        address: app.patient_address || app.patient_address_line || app.address || '',
        village: app.patient_village || app.village || '',
        city: app.patient_city || app.city || 'Pune',
        taluka: app.patient_taluka || app.taluka || '',
        district: app.patient_district || app.district || 'Pune',
        pincode: app.patient_pincode || app.pincode || '',
        abha: app.patient_abha || app.abhaNumber || app.abha || null,
        abhaNumber: app.patient_abha || app.abhaNumber || app.abha || null,
      };

  const rawStatus = app.status || app.current_status || 'Submitted';
  let status = rawStatus;
  const sUpper = String(rawStatus).toUpperCase().trim().replace(/[-\s/]+/g, '_');

  const clinicalStages = [
    'POST_OP_RECOVERY', 'POST_OPERATIVE_RECOVERY', 'UNDER_TREATMENT', 'IN_TREATMENT',
    'SURGERY_SCHEDULED', 'ICU_ADMISSION', 'DISCHARGE_PLANNED', 'MEDICATION_STARTED',
    'DIAGNOSTICS_PENDING', 'ROUTINE_CHECKUP', 'RECOVERY'
  ];

  if (sUpper === 'DOCS_VERIFIED' || sUpper === 'DOCUMENTS_VERIFIED' || sUpper === 'DOC_VERIFIED') {
    status = 'Docs Verified';
  } else if (sUpper === 'COORDINATED' || sUpper === 'HOSPITAL_SEVAK_ASSIGNED' || sUpper === 'SEVAK_HOSPITAL_ASSIGNED' || sUpper === 'SEVAK_ASSIGNED' || sUpper === 'ASSIGNED') {
    status = 'Hospital, Sevak Assigned';
  } else if (sUpper === 'TREATMENT_STARTED' || sUpper === 'ACTIVE' || sUpper === 'IN_TREATMENT') {
    status = 'Treatment Started';
  } else if (sUpper === 'APPROVED' || clinicalStages.includes(sUpper)) {
    status = 'Approved';
  } else if (sUpper === 'DOCS_REQUIRED' || sUpper === 'REVERTED' || sUpper === 'ON_HOLD') {
    status = 'Docs Required';
  } else if (sUpper === 'UNDER_REVIEW' || sUpper === 'IN_REVIEW') {
    status = 'Under Review';
  } else if (sUpper === 'SUBMITTED' || sUpper === 'PENDING') {
    status = 'Submitted';
  } else if (sUpper === 'REJECTED') {
    status = 'Rejected';
  } else if (sUpper === 'CLOSED' || sUpper === 'COMPLETED' || sUpper === 'DISCHARGED') {
    status = 'Closed';
  }

  const priority = (app.priority || 'MEDIUM').toUpperCase();

  let statusClass = app.statusClass;
  if (!statusClass) {
    if (status === 'Docs Verified' || sUpper === 'DOCS_VERIFIED' || sUpper === 'DOC_VERIFIED') {
      statusClass = 'status-docs-verified';
    } else if (status === 'Hospital, Sevak Assigned' || sUpper === 'COORDINATED' || sUpper === 'ASSIGNED') {
      statusClass = 'status-assigned';
    } else if (['APPROVED', 'TREATMENT_STARTED', 'ACTIVE'].includes(sUpper) || status === 'Approved') {
      statusClass = 'status-active';
    } else if (['DOCS_REQUIRED', 'REVERTED', 'ON_HOLD'].some((s) => sUpper.includes(s))) {
      statusClass = 'status-docs-required';
    } else if (['UNDER_REVIEW', 'IN_REVIEW', 'SUBMITTED', 'PENDING'].includes(sUpper)) {
      statusClass = 'status-under-review';
    } else if (sUpper === 'REJECTED') {
      statusClass = 'status-rejected';
    } else {
      statusClass = 'status-submitted';
    }
  }

  const city = app.city || app.patient?.district || app.district || 'Pune';

  const rawHospital =
    (typeof app.hospital_name === 'string' ? app.hospital_name : app.hospital_name?.name) ||
    (typeof app.hospitalName === 'string' ? app.hospitalName : app.hospitalName?.name) ||
    (typeof app.hospital === 'string' ? app.hospital : app.hospital?.name) ||
    (typeof app.assignedHospital === 'string' ? app.assignedHospital : app.assignedHospital?.name) ||
    (typeof app.assigned_hospital === 'string' ? app.assigned_hospital : app.assigned_hospital?.name) ||
    (typeof app.active_assignment?.hospital_name === 'string' ? app.active_assignment.hospital_name : '') ||
    '';
  const isDefaultOrEmptyHospital =
    !rawHospital ||
    rawHospital === 'Government Hospital' ||
    rawHospital === 'Empanelled Hospital' ||
    rawHospital === 'Not assigned' ||
    rawHospital === 'Unassigned' ||
    rawHospital === '—' ||
    rawHospital === '-';
  const hospital = isDefaultOrEmptyHospital
    ? (['APPROVED', 'COORDINATED', 'TREATMENT_STARTED', 'CLOSED'].includes(status.toUpperCase()) ? (app.hospital_name || app.hospital || '-') : '-')
    : rawHospital;
  const hospitalShort = hospital === '-' ? '-' : (app.hospitalShort || (typeof hospital === 'string' && hospital.includes(',') ? hospital.split(',')[0].trim() : String(hospital)));

  const rawSevak =
    (typeof app.assigned_sevak === 'string' ? app.assigned_sevak : (app.assigned_sevak?.sevak_name || app.assigned_sevak?.name || app.assigned_sevak?.full_name)) ||
    (typeof app.active_assignment === 'string' ? app.active_assignment : (app.active_assignment?.sevak_name || app.active_assignment?.name)) ||
    (typeof app.assignedSevak === 'string' ? app.assignedSevak : (app.assignedSevak?.sevak_name || app.assignedSevak?.name || app.assignedSevak?.full_name)) ||
    (typeof app.sevakName === 'string' ? app.sevakName : (app.sevakName?.sevak_name || app.sevakName?.name)) ||
    (typeof app.sevak === 'string' ? app.sevak : (app.sevak?.sevak_name || app.sevak?.name || app.sevak?.full_name)) ||
    '';
  const isDefaultOrEmptySevak =
    !rawSevak ||
    rawSevak === 'Not assigned' ||
    rawSevak === 'Unassigned' ||
    rawSevak === '—' ||
    rawSevak === '-';
  const assignedSevak = isDefaultOrEmptySevak
    ? (['APPROVED', 'COORDINATED', 'TREATMENT_STARTED', 'CLOSED'].includes(status.toUpperCase()) ? (rawSevak && rawSevak !== '-' ? String(rawSevak) : 'Akanksha Pawashe') : '-')
    : (typeof rawSevak === 'string' ? rawSevak : (rawSevak?.sevak_name || rawSevak?.name || String(rawSevak)));

  const assignedSevakObj =
    app.assigned_sevak && typeof app.assigned_sevak === 'object'
      ? app.assigned_sevak
      : app.active_assignment && typeof app.active_assignment === 'object'
        ? app.active_assignment
        : typeof app.assignedSevak === 'object' && app.assignedSevak !== null
          ? app.assignedSevak
          : { sevak_name: assignedSevak, sevak_phone: app.sevakPhone || app.assigned_sevak_phone || '' };

  const rawDate = app.submitted_at || app.submittedAt || app.created_at || app.createdAt || app.submittedDate;
  const formattedSubmittedDate = formatDateDDMMYYYY(rawDate);

  return {
    ...app,
    id: cleanId,
    caseId: cleanId,
    applicationNumber: cleanId,
    uuid: app.uuid || app.id,
    applicant: applicantName,
    patient: patientName,
    applicantName,
    patientName,
    applicantObj,
    patientObj,
    contact: app.contact || patientObj.mobile || applicantObj.mobile || '—',
    age: app.age ?? patientObj.age ?? 30,
    gender: app.gender || patientObj.gender || 'Male',
    addressLine: app.addressLine || app.address_line || app.address || patientObj.addressLine || '',
    address: app.address || app.addressLine || app.address_line || patientObj.address || '',
    village: app.village || app.village_city || app.villageCity || patientObj.village || '',
    city: app.city || patientObj.city || city,
    taluka: app.taluka || patientObj.taluka || applicantObj.taluka || '',
    district: app.district || patientObj.district || applicantObj.district || city,
    pincode: app.pincode || patientObj.pincode || applicantObj.pincode || '',
    abhaNumber: app.abhaNumber || app.abha_number || app.abha || app.patientAbha || app.patient_abha || patientObj.abhaNumber || null,
    patientAbha: app.patientAbha || app.patient_abha || app.abhaNumber || app.abha_number || app.abha || patientObj.abhaNumber || null,
    relativeName: app.relativeName || app.relative_name || app.relative?.name || null,
    relativePhone: app.relativePhone || app.relative_phone || app.relative?.phone || app.relativeContact || null,
    relativeContact: app.relativeContact || app.relativePhone || app.relative_phone || app.relative?.phone || null,
    relativeRelation: app.relativeRelation || app.relative_relation || app.relative?.relation || null,
    relativeAddress: app.relativeAddress || app.relative_address || app.relative?.address || null,
    relativeCity: app.relativeCity || app.relative_city || app.relative?.city || null,
    relativeTaluka: app.relativeTaluka || app.relative_taluka || app.relative?.taluka || null,
    relativeDistrict: app.relativeDistrict || app.relative_district || app.relative?.district || null,
    relativePincode: app.relativePincode || app.relative_pincode || app.relative?.pincode || null,
    type: app.type || app.treatmentType || 'OPD',
    treatmentType: app.treatmentType || app.type || 'OPD',
    caseTypeDesc: app.caseTypeDesc || `${app.treatmentType || app.type || 'OPD'} (${hospitalShort})`,
    hospital,
    hospitalShort,
    assignedSevak,
    reviewed_by_admin_id: app.reviewed_by_admin_id || app.reviewedByAdminId || null,
    reviewed_by_admin_name: app.reviewed_by_admin_name || app.reviewedByAdminName || null,
    reviewedByAdminId: app.reviewed_by_admin_id || app.reviewedByAdminId || null,
    reviewedByAdminName: app.reviewed_by_admin_name || app.reviewedByAdminName || null,
    claimed_at: app.claimed_at || app.claimedAt || null,
    claimedAt: app.claimed_at || app.claimedAt || null,
    isClaimed: Boolean(app.reviewed_by_admin_name || app.reviewedByAdminName || app.reviewed_by_admin_id || app.reviewedByAdminId),
    scheme: typeof app.scheme === 'string' ? app.scheme : (app.assignedScheme?.name || app.suggestedScheme?.name || 'MJPJAY'),
    referredBy: app.referredBy || app.referred_by || app.referralFullName || app.referralName || (app.referral_first_name ? `${app.referral_first_name} ${app.referral_last_name || ''}`.trim() : null) || app.referrer || app.referralSource || 'Direct / Self',
    referralName: app.referralFullName || app.referralName || app.referral_name || (app.referral_first_name ? `${app.referral_first_name} ${app.referral_last_name || ''}`.trim() : null),
    referralFullName: app.referralFullName || app.referralName || app.referral_name || (app.referral_first_name ? `${app.referral_first_name} ${app.referral_last_name || ''}`.trim() : null),
    referralType: app.referralType || app.referral_type || null,
    referralCustomType: app.referralCustomType || app.referral_custom_type || null,
    status,
    statusClass,
    priority,
    isUrgentRow: priority === 'CRITICAL' || priority === 'HIGH' || priority === 'URGENT' || Boolean(app.isUrgentRow),
    sanctionedAmount: app.sanctionedAmount,
    submittedDate: formattedSubmittedDate,
    submittedDateShort: formattedSubmittedDate,
    lastUpdate: app.lastUpdate || (app.updatedAt ? formatDateDDMMYYYY(app.updatedAt) : formattedSubmittedDate),
    condition: app.condition || app.medicalCauseNote || 'Medical assistance required',
    documents: (() => {
      const revert = app.revertDetails || app.revert_details || null;
      const baseDocs = Array.isArray(app.documents)
        ? app.documents.map((doc, idx) => {
          const docName = doc.name || doc.file_name || doc.title || 'Uploaded Document';
          const isSevak = Boolean(
            doc.is_sevak_upload === true ||
            doc.isSevakUpload === true ||
            doc.uploaded_by_role === 'AROGYA_SEVAK' ||
            doc.uploaded_by_role === 'SEVAK' ||
            doc.uploaderRole === 'ArogyaSevak' ||
            doc.uploaderRole === 'SEVAK' ||
            doc.uploaderRole === 'sevak' ||
            doc.uploadedBy === 'sevak' ||
            doc.uploadedBy === 'ArogyaSevak' ||
            doc.requestedFrom === 'sevak' ||
            doc.requested_from === 'sevak' ||
            doc.status === 'PENDING_SEVAK_UPLOAD' ||
            doc.document_status === 'PENDING_SEVAK_UPLOAD' ||
            (typeof doc.source === 'string' && (doc.source.toLowerCase() === 'arogyasevak upload' || doc.source.toLowerCase() === 'sevak upload' || doc.source.toLowerCase() === 'hospital_ward'))
          );

          const isPendingSevak = Boolean(
            doc.status === 'PENDING_SEVAK_UPLOAD' ||
            doc.document_status === 'PENDING_SEVAK_UPLOAD' ||
            (isSevak && (doc.requested || doc.uploaded === false || doc.file === 'Pending Upload' || doc.fileName === 'Pending Upload' || (!doc.file_url && !doc.fileUrl)))
          );
          const isPendingCitizen = !isSevak && Boolean(
            doc.file === 'Pending Upload' ||
            doc.fileName === 'Pending Upload' ||
            doc.uploaded === false ||
            doc.status === 'PENDING_CITIZEN_UPLOAD' ||
            doc.document_status === 'PENDING_CITIZEN_UPLOAD' ||
            (doc.requested && !doc.file_url && !doc.fileUrl)
          );
          const isPendingUpload = isPendingSevak || isPendingCitizen;

          const isExplicitlyVerified = Boolean(
            !isPendingUpload && (doc.verified === true || doc.document_status === 'VERIFIED' || doc.status === 'VERIFIED')
          );
          // Case approval only automatically verifies citizen baseline submission docs, NEVER newly requested pending ArogyaSevak docs
          const isDocVerified = isExplicitlyVerified || (!isSevak && !isPendingUpload && ['APPROVED', 'COORDINATED', 'TREATMENT_STARTED', 'TREATMENT STARTED', 'ACTIVE', 'CLOSED'].includes(String(status).toUpperCase()));

          return {
            id: doc.id || doc.docId || `DOC-${idx + 1}`,
            docId: doc.id || doc.docId || `DOC-${idx + 1}`,
            name: docName,
            title: docName,
            fileName: isPendingUpload ? 'Pending Upload' : (doc.file_name || doc.fileName || doc.file || `${docName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`),
            file: isPendingUpload ? 'Pending Upload' : (doc.file || doc.file_name || doc.fileName || `${docName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`),
            fileUrl: doc.file_url || doc.fileUrl || '',
            file_url: doc.file_url || doc.fileUrl || '',
            category: doc.category || (isSevak ? 'ArogyaSevak Clinical Record' : 'General'),
            size: isPendingUpload ? '-' : (doc.file_size || doc.size || '1.2 MB'),
            source: doc.source || (isSevak ? 'ArogyaSevak Upload' : 'Citizen Upload'),
            uploaderRole: isSevak ? 'ArogyaSevak' : 'Citizen',
            isSevakUpload: isSevak,
            is_sevak_upload: isSevak,
            uploadedBy: doc.uploadedBy || (isSevak ? (app.assignedSevak && app.assignedSevak !== 'Not assigned' ? app.assignedSevak : 'Arogya Sevak') : (app.applicantName || app.patientName || 'Citizen')),
            status: isDocVerified ? 'VERIFIED' : (isPendingSevak ? 'PENDING_SEVAK_UPLOAD' : (isPendingCitizen ? 'PENDING_CITIZEN_UPLOAD' : (doc.status || doc.document_status || 'PENDING'))),
            document_status: isDocVerified ? 'VERIFIED' : (isPendingSevak ? 'PENDING_SEVAK_UPLOAD' : (isPendingCitizen ? 'PENDING_CITIZEN_UPLOAD' : (doc.status || doc.document_status || 'PENDING'))),
            verified: isDocVerified,
            uploaded: !isPendingUpload,
            requested: Boolean(doc.requested || isPendingUpload),
            statusText: isDocVerified ? 'Verified ✓' : (isPendingSevak ? 'Pending ArogyaSevak Upload' : (isPendingCitizen ? 'Pending Citizen Upload' : 'Pending Verification')),
            verificationRemark: doc.verification_remark || doc.verificationRemark || '',
            uploadedAt: doc.uploaded_at || doc.uploadedAt || (isPendingUpload ? 'Pending' : 'Recently'),
            verifiedAt: isDocVerified ? (doc.verified_at || doc.verifiedAt || new Date().toISOString()) : null,
          };
        })
        : [];

      // If revertDetails exists, ensure requested doc is included in list
      if (revert && (revert.requestedDocName || revert.requested_doc_name)) {
        const reqName = revert.requestedDocName || revert.requested_doc_name;
        const isResolved = revert.isResolved === true || Boolean(revert.resubmittedDoc);
        const isSevakReq = revert.requestedFrom === 'sevak' || revert.requested_from === 'sevak';

        if (isResolved) {
          const resubDoc = revert.resubmittedDoc || {};
          const resubName = revert.resubmittedDocName || resubDoc.name || reqName;
          const exists = baseDocs.some(d =>
            d.name === resubName ||
            d.file === resubName ||
            d.name === reqName ||
            (resubDoc.id && String(d.id) === String(resubDoc.id))
          );

          if (!exists) {
            baseDocs.push({
              id: revert.resubmittedDocId || resubDoc.id || 'DOC-RESUBMITTED-1',
              docId: revert.resubmittedDocId || resubDoc.id || 'DOC-RESUBMITTED-1',
              name: resubName,
              title: resubName,
              fileName: resubDoc.name || revert.resubmittedDocName || 'resubmitted_doc.pdf',
              file: resubDoc.name || revert.resubmittedDocName || 'resubmitted_doc.pdf',
              fileUrl: resubDoc.file_url || resubDoc.uri || '',
              file_url: resubDoc.file_url || resubDoc.uri || '',
              category: resubDoc.category || revert.requestedDocType || (isSevakReq ? 'ArogyaSevak Clinical Record' : 'Requested Document'),
              size: resubDoc.size || '1.2 MB',
              source: isSevakReq ? 'ArogyaSevak Upload' : 'Citizen Upload (Resubmitted)',
              uploaderRole: isSevakReq ? 'ArogyaSevak' : 'Citizen',
              isSevakUpload: isSevakReq,
              is_sevak_upload: isSevakReq,
              status: 'PENDING',
              document_status: 'PENDING',
              verified: false,
              uploaded: true,
              requested: true,
              statusText: 'Pending Verification',
              verificationRemark: revert.resubmittedRemark || '',
              uploadedAt: revert.resubmittedDate || 'Recently',
              verifiedAt: null,
            });
          }
        } else {
          // Document is requested by Admin, pending upload
          const exists = baseDocs.some(d => d.name === reqName || (d.requested && !d.uploaded));
          if (!exists) {
            baseDocs.push({
              id: isSevakReq ? 'DOC-SEVAK-PENDING' : 'DOC-REQ-PENDING',
              docId: isSevakReq ? 'DOC-SEVAK-PENDING' : 'DOC-REQ-PENDING',
              name: reqName,
              title: reqName,
              fileName: 'Pending Upload',
              file: 'Pending Upload',
              fileUrl: '',
              file_url: '',
              category: revert.requestedDocType || (isSevakReq ? 'ArogyaSevak Clinical Record' : 'Requested Document'),
              size: '-',
              source: isSevakReq ? 'Requested from ArogyaSevak' : 'Requested from Citizen',
              uploaderRole: isSevakReq ? 'ArogyaSevak' : 'Citizen',
              isSevakUpload: isSevakReq,
              is_sevak_upload: isSevakReq,
              status: isSevakReq ? 'PENDING_SEVAK_UPLOAD' : 'PENDING_CITIZEN_UPLOAD',
              document_status: isSevakReq ? 'PENDING_SEVAK_UPLOAD' : 'PENDING_CITIZEN_UPLOAD',
              verified: false,
              uploaded: false,
              requested: true,
              statusText: isSevakReq ? 'Pending ArogyaSevak Upload' : 'Pending Citizen Upload',
              verificationRemark: revert.reason || '',
              uploadedAt: 'Pending',
              verifiedAt: null,
            });
          }
        }
      }

      return baseDocs;
    })(),
    remarks: app.remarks || (Array.isArray(app.adminNotes) && app.adminNotes[0]?.text) || (Array.isArray(app.notes) && app.notes[0]) || null,
    notes: (Array.isArray(app.notes) && app.notes.length > 0)
      ? app.notes
      : (Array.isArray(app.adminNotes) && app.adminNotes.length > 0
        ? app.adminNotes.map(an => an.text || an.note || an)
        : (app.remarks ? [app.remarks] : [])),
    adminNotes: (Array.isArray(app.adminNotes) && app.adminNotes.length > 0)
      ? app.adminNotes
      : (Array.isArray(app.notes) && app.notes.length > 0
        ? app.notes.map((n, i) => ({ id: `an-${i}`, text: typeof n === 'string' ? n : (n.text || n.note), by: (typeof n === 'object' && n.by) || 'Admin (Rohit Patil)', date: 'Recently' }))
        : (app.remarks ? [{ id: 'an-1', text: app.remarks, by: 'Admin (Rohit Patil)', date: 'Recently' }] : [])),
    timeline: Array.isArray(app.timeline) ? app.timeline : [],
    revertDetails: app.revertDetails || null,
    reopenRequested: Boolean(app.reopenRequested || app.reopen_requested || app.reopenInfo?.reopenRequested),
    reopenRequestedAt: app.reopenRequestedAt || app.reopen_requested_at || app.reopenInfo?.reopenRequestedAt || null,
    reopenRequestReason: app.reopenRequestReason || app.reopen_request_reason || app.reopenInfo?.reopenRequestReason || '',
    reopenInfo: app.reopenInfo || null,
    rejectedDate: app.rejectedDate || app.closed_at || app.reviewed_at || app.updated_at || null,
  };
};

/**
 * Checks if hospital and ArogyaSevak are assigned to a case
 */
export const isCaseAssigned = (caseItem) => {
  if (!caseItem) return false;

  const st = String(caseItem.status || '').toUpperCase().replace(/[-\s/]+/g, '_');
  if (['APPROVED', 'TREATMENT_STARTED', 'COORDINATED', 'ASSIGNED', 'HOSPITAL_SEVAK_ASSIGNED', 'DISCHARGED', 'CLOSED'].includes(st)) {
    return true;
  }

  const rawHospital =
    (typeof caseItem.hospital === 'string' ? caseItem.hospital : caseItem.hospital?.name) ||
    (typeof caseItem.hospital_name === 'string' ? caseItem.hospital_name : caseItem.hospital_name?.name) ||
    (typeof caseItem.hospitalName === 'string' ? caseItem.hospitalName : caseItem.hospitalName?.name) ||
    (typeof caseItem.assignedHospital === 'string' ? caseItem.assignedHospital : caseItem.assignedHospital?.name) ||
    (typeof caseItem.assigned_hospital === 'string' ? caseItem.assigned_hospital : caseItem.assigned_hospital?.name) ||
    '';

  const rawSevak =
    (typeof caseItem.assignedSevak === 'string' ? caseItem.assignedSevak : (caseItem.assignedSevak?.sevak_name || caseItem.assignedSevak?.name || caseItem.assignedSevak?.full_name)) ||
    (typeof caseItem.assigned_sevak === 'string' ? caseItem.assigned_sevak : (caseItem.assigned_sevak?.sevak_name || caseItem.assigned_sevak?.name || caseItem.assigned_sevak?.full_name)) ||
    (typeof caseItem.sevakName === 'string' ? caseItem.sevakName : (caseItem.sevakName?.sevak_name || caseItem.sevakName?.name)) ||
    (typeof caseItem.sevak === 'string' ? caseItem.sevak : (caseItem.sevak?.sevak_name || caseItem.sevak?.name || caseItem.sevak?.full_name)) ||
    '';

  const hasHospital = Boolean(
    rawHospital &&
    rawHospital !== '—' &&
    rawHospital !== '-' &&
    rawHospital !== 'Not assigned' &&
    rawHospital !== 'Unassigned' &&
    rawHospital !== 'Government Hospital' &&
    rawHospital !== 'Empanelled Hospital'
  );

  const hasSevak = Boolean(
    rawSevak &&
    rawSevak !== '—' &&
    rawSevak !== '-' &&
    rawSevak !== 'Not assigned' &&
    rawSevak !== 'Unassigned'
  );

  return hasHospital && hasSevak;
};

/**
 * Checks if a case is officially approved or closed.
 * Only approved/completed cases navigate to CaseDetail (/admin/cases/:id).
 * All in-progress review cases (Submitted, Under Review, Docs Verified, Hospital/Sevak Assigned, On Hold, etc.)
 * navigate to Review & Approve screen (/admin/cases/review/:id).
 */
export const isCaseApprovedOnly = (caseItem) => {
  if (!caseItem) return false;
  const rawStatus = String(caseItem.status || caseItem.current_status || '').toUpperCase().trim().replace(/[-\s/]+/g, '_');
  const remarks = String(caseItem.remarks || '').toUpperCase();
  const isEscalationResolved = Boolean(
    caseItem.isTransferred ||
    caseItem.isBillResolved ||
    caseItem.isReassigned ||
    rawStatus.includes('REASSIGNED') ||
    rawStatus.includes('TRANSFERRED') ||
    rawStatus.includes('BILL_RESOLVED') ||
    rawStatus.includes('BILL_LIMIT_RESOLVED') ||
    remarks.includes('REASSIGNED CASE') ||
    remarks.includes('BILL EXCEEDED RESOLUTION') ||
    remarks.includes('ADMIN BILL RESOLUTION') ||
    remarks.includes('[DECISION RESOLVED]')
  );

  return (
    rawStatus === 'APPROVED' ||
    rawStatus === 'TREATMENT_STARTED' ||
    rawStatus === 'CLOSED' ||
    rawStatus === 'COMPLETED' ||
    rawStatus === 'ACTIVE' ||
    Boolean(caseItem.isApproved) ||
    isEscalationResolved
  );
};

/**
 * Returns proper navigation URL for a case:
 * - If approved or closed -> /admin/cases/:id (CaseDetail)
 * - If in review or not yet approved -> /admin/cases/review/:id (ReviewApprove)
 */
export const getCaseTargetUrl = (caseItem) => {
  if (!caseItem) return '/admin/cases';
  const caseId = typeof caseItem === 'object' ? (caseItem.id || caseItem.caseId || caseItem.applicationNumber) : caseItem;
  if (!caseId) return '/admin/cases';

  return isCaseApprovedOnly(caseItem)
    ? `/admin/cases/${caseId}`
    : `/admin/cases/review/${caseId}`;
};

export const applicationService = {
  getCachedApplications: () => _cachedAdminApps || [],
  getCachedApplicationStats: () => _cachedAdminStats || null,
  getCachedApplicationById: (id) => {
    if (!id) return null;
    const cleanId = String(id).toLowerCase().trim();
    if (_adminCaseDetailsCache.has(cleanId)) return _adminCaseDetailsCache.get(cleanId);
    if (_cachedAdminApps && Array.isArray(_cachedAdminApps)) {
      const found = _cachedAdminApps.find((a) => {
        return (
          String(a.id || '').toLowerCase().trim() === cleanId ||
          String(a.caseId || '').toLowerCase().trim() === cleanId ||
          String(a.applicationNumber || '').toLowerCase().trim() === cleanId ||
          String(a.uuid || '').toLowerCase().trim() === cleanId
        );
      });
      if (found) return found;
    }
    return null;
  },
  invalidateApplicationsCache: () => {
    _cachedAdminApps = null;
    _cachedAdminStats = null;
    _inFlightAdminAppsPromise = null;
    _inFlightAdminStatsPromise = null;
    _adminCaseDetailsCache.clear();
    try {
      localStorage.removeItem(STORAGE_KEY_APPS);
      localStorage.removeItem(STORAGE_KEY_STATS);
    } catch (_) { }
  },

  /**
   * Fetch paginated cases / applications queue
   * GET /api/admins/applications
   */
  async fetchApplications(params = {}) {
    const isFiltered = Boolean(params.search || (params.status && params.status !== 'All') || (params.priority && params.priority !== 'ALL') || (params.scheme && params.scheme !== 'All') || params.offset);

    if (!isFiltered && _inFlightAdminAppsPromise) {
      return _inFlightAdminAppsPromise;
    }

    const fetchPromise = (async () => {
      const query = new URLSearchParams();

      if (params.search && params.search.trim()) {
        query.append('search', params.search.trim());
      }

      if (params.status && params.status !== 'All' && params.status !== 'ALL') {
        query.append('status', params.status);
      }

      if (params.priority && params.priority !== 'All' && params.priority !== 'ALL') {
        query.append('priority', params.priority);
      }

      if (params.scheme && params.scheme !== 'All' && params.scheme !== 'ALL') {
        query.append('scheme', params.scheme);
      }

      if (params.limit !== undefined && params.limit !== null) {
        query.append('limit', String(params.limit));
      }

      if (params.offset !== undefined && params.offset !== null) {
        query.append('offset', String(params.offset));
      }

      const qs = query.toString();
      const endpoint = `/admins/applications${qs ? `?${qs}` : ''}`;

      try {
        const res = await api.get(endpoint);
        const dataPayload = res?.data || res;
        const rawList = dataPayload?.applications || (Array.isArray(dataPayload) ? dataPayload : []);
        const total = dataPayload?.total ?? rawList.length;
        const limit = dataPayload?.limit ?? (params.limit || 50);
        const offset = dataPayload?.offset ?? (params.offset || 0);
        const page = dataPayload?.page ?? (Math.floor(offset / limit) + 1);
        const totalPages = dataPayload?.totalPages ?? Math.max(1, Math.ceil(total / limit));

        const normalizedList = rawList.map(normalizeApplication);

        if (!isFiltered) {
          _cachedAdminApps = normalizedList;
          try {
            localStorage.setItem(STORAGE_KEY_APPS, JSON.stringify(normalizedList));
          } catch (_) { }
        }

        return {
          success: true,
          data: normalizedList,
          applications: normalizedList,
          total,
          limit,
          offset,
          page,
          totalPages,
        };
      } catch (err) {
        console.warn('[ApplicationService] fetchApplications API error, falling back:', err.message);
        return {
          success: _cachedAdminApps ? true : false,
          error: err.message,
          data: _cachedAdminApps || [],
          applications: _cachedAdminApps || [],
          total: _cachedAdminApps?.length || 0,
          page: 1,
          totalPages: 1,
        };
      } finally {
        if (!isFiltered) {
          _inFlightAdminAppsPromise = null;
        }
      }
    })();

    if (!isFiltered) {
      _inFlightAdminAppsPromise = fetchPromise;
    }

    return fetchPromise;
  },

  /**
   * Fetch case queue metrics & statistics
   * GET /api/admins/applications/stats
   */
  async fetchApplicationStats() {
    if (_inFlightAdminStatsPromise) {
      return _inFlightAdminStatsPromise;
    }

    const fetchPromise = (async () => {
      try {
        const res = await api.get('/admins/applications/stats');
        const stats = res?.data || res;
        if (stats) {
          _cachedAdminStats = stats;
          try {
            localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats));
          } catch (_) { }
        }
        return {
          success: true,
          data: stats,
        };
      } catch (err) {
        console.warn('[ApplicationService] fetchApplicationStats fallback:', err.message);
        return {
          success: _cachedAdminStats ? true : false,
          error: err.message,
          data: _cachedAdminStats || null,
        };
      } finally {
        _inFlightAdminStatsPromise = null;
      }
    })();

    _inFlightAdminStatsPromise = fetchPromise;
    return fetchPromise;
  },

  /**
   * Get single application dossier by ID or UUID
   * GET /api/admins/applications/:id
   */
  async fetchApplicationById(id) {
    if (!id) throw new Error('Application ID is required');
    const cleanId = String(id).toLowerCase().trim();

    try {
      const res = await api.get(`/admins/applications/${encodeURIComponent(id)}`);
      const app = res?.data || res;
      const normalized = normalizeApplication(app);
      if (normalized) {
        _adminCaseDetailsCache.set(cleanId, normalized);
      }
      return {
        success: true,
        data: normalized,
      };
    } catch (err) {
      console.warn(`[ApplicationService] fetchApplicationById(${id}) error:`, err.message);
      const cached = _adminCaseDetailsCache.get(cleanId);
      if (cached) {
        return { success: true, data: cached };
      }
      throw err;
    }
  },

  /**
   * Update application status (Approve, Reject, Review, Close)
   * PATCH /api/admins/applications/:id/status
   */
  async updateStatus(id, { status, remarks, reason, schemeId, scheme_id, sanctionedAmount, approved_amount, approvedAmount }) {
    const finalSchemeId = scheme_id || schemeId;
    const finalAmount = approved_amount !== undefined ? approved_amount : (sanctionedAmount !== undefined ? sanctionedAmount : approvedAmount);
    const finalRemarks = remarks || reason;

    const payload = {
      status,
      scheme_id: finalSchemeId,
      schemeId: finalSchemeId,
      approved_amount: finalAmount,
      sanctioned_amount: finalAmount,
      sanctionedAmount: finalAmount,
      remarks: finalRemarks,
      reason: finalRemarks,
    };
    this.invalidateApplicationsCache();
    const res = await api.patch(`/admins/applications/${encodeURIComponent(id)}/status`, payload);
    return res?.data || res;
  },

  /**
   * Alias for updateStatus
   */
  async updateApplicationStatus(id, payload) {
    return this.updateStatus(id, payload);
  },

  /**
   * Request document / revert case to citizen with alert
   * POST /api/admins/applications/:id/request-doc
   */
  async requestDocument(id, { documentName, requested_doc_name, requestedDocName, reason, documentCategory, requested_doc_type, requestedDocType, deadline_days, deadlineDays }) {
    const docName = requested_doc_name || requestedDocName || documentName || 'Required Document';
    const docType = requested_doc_type || requestedDocType || documentCategory || 'OTHER';
    const days = deadline_days || deadlineDays || 3;

    const payload = {
      requested_doc_type: docType,
      requested_doc_name: docName,
      requestedDocType: docType,
      requestedDocName: docName,
      documentName: docName,
      reason,
      deadline_days: days,
      deadlineDays: days,
    };
    this.invalidateApplicationsCache();
    const res = await api.post(`/admins/applications/${encodeURIComponent(id)}/request-doc`, payload);
    return res?.data || res;
  },

  /**
   * Verify or reject uploaded document
   * PATCH /api/admins/applications/:id/documents/:docId/verify
   */
  async verifyDocument(id, docId, { status, remark }) {
    const payload = { status, remark };
    this.invalidateApplicationsCache();
    const res = await api.patch(
      `/admins/applications/${encodeURIComponent(id)}/documents/${encodeURIComponent(docId)}/verify`,
      payload
    );
    return res?.data || res;
  },

  /**
   * Assign Hospital and/or Arogya Sevak to case
   * POST /api/admins/applications/:id/assign
   */
  async assignApplication(id, payload = {}) {
    this.invalidateApplicationsCache();
    const finalSevakId = payload.sevak_id || payload.sevakId || payload.sevakUserId || payload.arogya_sevak_id;
    const finalSevakName = payload.sevak_name || payload.sevakName || payload.sevak;
    const finalSevakPhone = payload.sevak_phone || payload.sevakPhone;
    const finalHospId = payload.hospital_id || payload.hospitalId;
    const finalHospName = payload.hospital_name || payload.hospitalName || payload.hospital;
    const finalScheme = payload.scheme || payload.scheme_name || payload.schemeName;
    const finalSchemeId = payload.scheme_id || payload.schemeId;
    const finalAdmissionDate = payload.admissionDate || payload.admission_date || payload.visitDate || payload.visit_date;
    const finalRemarks = payload.assignmentNotes || payload.remarks || payload.instructions || payload.note || payload.remark;

    const requestBody = {
      sevak_id: finalSevakId,
      sevakId: finalSevakId,
      sevak_name: finalSevakName,
      sevakName: finalSevakName,
      sevak_phone: finalSevakPhone,
      sevakPhone: finalSevakPhone,
      hospital_id: finalHospId,
      hospitalId: finalHospId,
      hospital_name: finalHospName,
      hospitalName: finalHospName,
      scheme: finalScheme,
      scheme_name: finalScheme,
      scheme_id: finalSchemeId,
      admissionDate: finalAdmissionDate,
      admission_date: finalAdmissionDate,
      visitDate: finalAdmissionDate,
      visit_date: finalAdmissionDate,
      assignmentNotes: finalRemarks,
      remarks: finalRemarks,
      instructions: finalRemarks,
    };
    const res = await api.post(`/admins/applications/${encodeURIComponent(id)}/assign`, requestBody);
    return res?.data || res;
  },

  /**
   * Admin add case note / directive to application
   * POST /api/admins/applications/:id/remarks
   */
  async addCaseNote(id, remark) {
    const res = await api.post(`/admins/applications/${encodeURIComponent(id)}/remarks`, {
      remark,
      remark_type: 'ADMIN_NOTE',
    });
    return res?.data || res;
  },

  async assignCase(id, payload) {
    return this.assignApplication(id, payload);
  },

  /**
   * Add internal case remark
   * POST /api/admins/applications/:id/remarks
   */
  async addRemark(id, { note, remarkType }) {
    const payload = { note, remarkType };
    const res = await api.post(`/admins/applications/${encodeURIComponent(id)}/remarks`, payload);
    return res?.data || res;
  },

  /**
   * Send custom direct notification to citizen/case
   * POST /api/admins/notifications/send
   */
  async sendDirectNotification(notificationPayload) {
    const res = await api.post('/admins/notifications/send', notificationPayload);
    return res?.data || res;
  },

  /**
   * Broadcast health camp or scheme notice to all citizens
   * POST /api/admins/notifications/broadcast
   */
  async broadcastNotification(broadcastPayload) {
    const res = await api.post('/admins/notifications/broadcast', broadcastPayload);
    return res?.data || res;
  },

  /**
   * Fetch all sent and incoming admin notifications
   * GET /api/admins/notifications
   */
  async fetchAdminNotifications(params = {}) {
    const query = new URLSearchParams();
    if (params.type) query.append('type', params.type);
    if (params.priority) query.append('priority', params.priority);
    if (params.scope) query.append('scope', params.scope);
    if (params.recipient_type) query.append('recipient_type', params.recipient_type);
    if (params.is_read !== undefined) query.append('is_read', String(params.is_read));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.offset) query.append('offset', String(params.offset));

    const qs = query.toString();
    const res = await api.get(`/admins/notifications${qs ? `?${qs}` : ''}`);
    return res?.data || res;
  },

  /**
   * Mark a single notification as read
   * PATCH /api/admins/notifications/:id/read
   */
  async markNotificationRead(notificationId) {
    const res = await api.patch(`/admins/notifications/${notificationId}/read`);
    return res?.data || res;
  },

  /**
   * Mark all notifications as read
   * PATCH /api/admins/notifications/read-all
   */
  async markAllNotificationsRead() {
    const res = await api.patch('/admins/notifications/read-all');
    return res?.data || res;
  },

  /**
   * Clear all seen/read notifications
   * DELETE /api/admins/notifications/seen
   */
  async clearSeenNotifications() {
    const res = await api.delete('/admins/notifications/seen');
    return res?.data || res;
  },

  /**
   * Clear all notifications (full purge)
   * DELETE /api/admins/notifications/all
   */
  async clearAllNotifications() {
    const res = await api.delete('/admins/notifications/all');
    return res?.data || res;
  },

  /**
   * Delete single notification
   * DELETE /api/admins/notifications/:id
   */
  async deleteNotification(id) {
    const res = await api.delete(`/admins/notifications/${id}`);
    return res?.data || res;
  },

  /**
   * Admin claims a case for review
   * POST /api/admins/applications/:id/claim
   */
  async claimCase(caseId, payload = {}) {
    this.invalidateApplicationsCache();
    const res = await api.post(`/admins/applications/${caseId}/claim`, payload);
    return res?.data || res;
  },

  /**
   * Admin unclaims / releases case claim
   * POST /api/admins/applications/:id/unclaim
   */
  async unclaimCase(caseId) {
    this.invalidateApplicationsCache();
    const res = await api.post(`/admins/applications/${caseId}/unclaim`);
    return res?.data || res;
  },

  /**
   * Admin assigns case reviewer to specific Admin
   * POST /api/admins/applications/:id/assign-reviewer
   */
  async assignReviewer(caseId, payload = {}) {
    this.invalidateApplicationsCache();
    const res = await api.post(`/admins/applications/${caseId}/assign-reviewer`, payload);
    return res?.data || res;
  },
};

export default applicationService;
