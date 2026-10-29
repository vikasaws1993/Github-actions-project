import { query as dbQuery } from '../config/db.js';
import { ApplicationModel } from '../models/application.model.js';
import { ApplicationDocumentModel } from '../models/applicationDocument.model.js';
import { ApplicationStatusHistoryModel } from '../models/applicationStatusHistory.model.js';
import { ApplicationAssignmentModel } from '../models/applicationAssignment.model.js';
import { ApplicationRemarkModel } from '../models/applicationRemark.model.js';
import { PatientModel } from '../models/patient.model.js';
import { CitizenModel } from '../models/citizen.model.js';
import { AdminModel } from '../models/admin.model.js';
import { SchemeModel } from '../models/scheme.model.js';
import { HospitalModel } from '../models/hospital.model.js';
import { ArogyaSevakModel } from '../models/arogyaSevak.model.js';
import { BackupSevakAssignmentModel } from '../models/backupSevakAssignment.model.js';
import { NotificationModel } from '../models/notification.model.js';
import { notificationService } from './notification.service.js';
import { resolveDistrict, resolveTaluka } from '../utils/locationResolver.util.js';
import { ApiError } from '../utils/ApiError.js';
import { HTTP_STATUS, CASE_STATUS } from '../constants/index.js';

export const isSevakDocName = (_docName) => {
  return false;
};

export const isCaseAssignedOrApproved = (row) => {
  if (!row) return false;
  const status = String(row.current_status || row.status || '').toUpperCase().replace(/[-\s/]+/g, '_');
  const assignedStatuses = [
    'APPROVED',
    'COORDINATED',
    'TREATMENT_STARTED',
    'ASSIGNED',
    'HOSPITAL_SEVAK_ASSIGNED',
    'DISCHARGED',
    'CLOSED',
    'IN_TREATMENT',
    'TREATMENT_IN_PROGRESS',
    'DOCS_VERIFIED',
  ];
  if (assignedStatuses.includes(status)) return true;
  if (row.assigned_hospital_id || row.hospital_id || (row.hospital_name && row.hospital_name !== '—' && row.hospital_name !== '-')) return true;
  if (row.assigned_sevak_id || row.assigned_sevak_user_id || row.active_assignment?.sevak_id || (row.assigned_sevak && row.assigned_sevak !== '—' && row.assigned_sevak !== '-')) return true;
  return false;
};

/**
 * Normalizes raw database row to unified application response compatible with:
 * - Mobile App (SchemeApplication shape)
 * - Admin Website (Case Queue & Detail shape)
 */
export const formatApplicationResponse = (row, sevakContext = null) => {
  if (!row) return null;

  const rawNum = row.application_number || row.id;
  const appNumber = String(rawNum).replace(/-APP-/gi, '-').replace(/APP-/gi, '').replace(/-APP/gi, '');
  const isApproved = ['APPROVED', 'COORDINATED', 'TREATMENT_STARTED'].includes(row.current_status);
  const isDocsRequired = ['DOCS_REQUIRED', 'REVERTED', 'ON_HOLD'].includes(row.current_status);

  // Check if caller is specifically the ACTIVE Sevak vs PREVIOUS Sevak
  const candidateCallerIds = [
    typeof sevakContext === 'string' ? sevakContext : null,
    sevakContext?.id,
    sevakContext?.userId,
    sevakContext?.sevakId,
    sevakContext?.user_id,
    sevakContext?.user?.id,
    ...(Array.isArray(sevakContext?.candidateIds) ? sevakContext.candidateIds : [])
  ].filter(Boolean);

  const callerName = sevakContext?.name || sevakContext?.full_name || sevakContext?.sevakName || sevakContext?.user?.name || null;
  const callerCleanName = callerName ? (callerName.includes('—') ? callerName.split('—')[0].trim() : (callerName.includes('(') ? callerName.split('(')[0].trim() : callerName.trim())) : '';

  let isCallerActiveSevak = false;
  if (row.active_assignment?.assignment_status === 'ASSIGNED' && (candidateCallerIds.length > 0 || callerCleanName)) {
    isCallerActiveSevak = Boolean(
      (candidateCallerIds.length > 0 && (
        candidateCallerIds.includes(row.active_assignment.arogya_sevak_id) ||
        candidateCallerIds.includes(row.active_assignment.sevak_user_id)
      )) ||
      (callerCleanName && row.active_assignment.sevak_name && (
        row.active_assignment.sevak_name.toLowerCase().includes(callerCleanName.toLowerCase()) ||
        callerCleanName.toLowerCase().includes(row.active_assignment.sevak_name.toLowerCase())
      ))
    );
  }

  let isCallerPreviousSevak = false;
  if (!isCallerActiveSevak && (candidateCallerIds.length > 0 || callerCleanName)) {
    if (Array.isArray(row.all_assignments)) {
      const hasPriorAssignment = row.all_assignments.some(a =>
        (candidateCallerIds.length > 0 && (
          candidateCallerIds.includes(a.arogya_sevak_id) ||
          candidateCallerIds.includes(a.sevak_user_id)
        )) ||
        (callerCleanName && a.sevak_name && (
          a.sevak_name.toLowerCase().includes(callerCleanName.toLowerCase()) ||
          callerCleanName.toLowerCase().includes(a.sevak_name.toLowerCase())
        ))
      );
      if (hasPriorAssignment) {
        isCallerPreviousSevak = true;
      }
    }
    if (!isCallerPreviousSevak && Array.isArray(row.escalations)) {
      const hasEscalation = row.escalations.some(e =>
        (candidateCallerIds.length > 0 && (
          candidateCallerIds.includes(e.raised_by_arogya_sevak_id) ||
          candidateCallerIds.includes(e.escalated_to_admin_id) ||
          candidateCallerIds.includes(e.escalated_by_user_id)
        ))
      );
      if (hasEscalation) {
        isCallerPreviousSevak = true;
      }
    }
  }

  const isTransferredOut = isCallerActiveSevak ? false : Boolean(
    row.isTransferredOut ||
    row.is_transferred_out ||
    sevakContext?.isTransferredOut ||
    isCallerPreviousSevak ||
    (row.assignment_status === 'TRANSFERRED' && !isCallerActiveSevak)
  );

  // Status badge display class for WebFrontend
  let statusBadgeClass = 'status-submitted';
  if (isTransferredOut) {
    statusBadgeClass = 'status-transferred';
  } else if (['APPROVED', 'COORDINATED', 'TREATMENT_STARTED'].includes(row.current_status)) {
    statusBadgeClass = 'status-active';
  } else if (row.current_status === 'DOCS_VERIFIED') {
    statusBadgeClass = 'status-verified';
  } else if (isDocsRequired) {
    statusBadgeClass = 'status-docs-required';
  } else if (row.current_status === 'UNDER_REVIEW' || row.current_status === 'IN_REVIEW') {
    statusBadgeClass = 'status-under-review';
  } else if (row.current_status === 'CLOSED') {
    statusBadgeClass = 'status-closed';
  } else if (row.current_status === 'REJECTED') {
    statusBadgeClass = 'status-rejected';
  }

  // Scheme names
  const assignedSchemeName = row.assigned_scheme_full_name || row.assigned_scheme_name || null;
  const suggestedSchemeName = row.suggested_scheme_full_name || row.suggested_scheme_name || null;
  const displayScheme = assignedSchemeName || suggestedSchemeName || null;

  // Timeline formatting
  let timeline = [];
  if (Array.isArray(row.status_history) && row.status_history.length > 0) {
    timeline = row.status_history.map((sh, idx) => ({
      id: sh.id || `step-${idx + 1}`,
      title: sh.new_status,
      description: sh.remark || `Status changed to ${sh.new_status}`,
      date: sh.created_at,
      time: sh.created_at ? new Date(sh.created_at).toLocaleString('en-IN') : 'Just now',
      completed: true,
      by: sh.changed_by_name || 'System',
    }));
  } else {
    timeline = [
      {
        id: 'step-1',
        title: 'Application Submitted / अर्ज सादर केला',
        time: row.submitted_at ? new Date(row.submitted_at).toLocaleString('en-IN') : 'Just now',
        completed: true,
        current: row.current_status === 'SUBMITTED',
      },
    ];
    if (row.current_status !== 'SUBMITTED') {
      timeline.push({
        id: 'step-2',
        title: row.current_status,
        time: row.reviewed_at || row.updated_at ? new Date(row.reviewed_at || row.updated_at).toLocaleString('en-IN') : 'Recent',
        completed: isApproved,
        current: true,
      });
    }
  }

  const activeHospitalName = (row.active_assignment?.hospital_name && row.active_assignment?.hospital_name !== 'Government Hospital' && row.active_assignment?.hospital_name !== '-' && row.active_assignment?.hospital_name !== '—')
    ? row.active_assignment?.hospital_name
    : (row.hospital_name && row.hospital_name !== 'Government Hospital' && row.hospital_name !== '-' && row.hospital_name !== '—'
      ? row.hospital_name
      : (row.empanelled_hospital_name && row.empanelled_hospital_name !== '-' && row.empanelled_hospital_name !== '—' ? row.empanelled_hospital_name : null));

  const activeSevakName = (row.active_assignment?.sevak_name && row.active_assignment?.sevak_name !== 'Unassigned' && row.active_assignment?.sevak_name !== '-')
    ? row.active_assignment?.sevak_name
    : (row.assigned_sevak?.sevak_name || 'Unassigned');

  const resolvedAge = row.patient_age != null
    ? Number(row.patient_age)
    : (row.patient_dob
      ? Math.max(0, new Date().getFullYear() - new Date(row.patient_dob).getFullYear())
      : (row.age != null ? Number(row.age) : null));

  return {
    id: appNumber,
    caseId: appNumber,
    applicationNumber: appNumber,
    uuid: row.id,
    patientId: row.patient_id,
    citizenId: row.submitted_by_citizen_id,

    // Scheme information (Explicit separation: Citizen Suggested vs Admin Assigned)
    suggestedScheme: (row.suggested_scheme_id || row.suggested_scheme_name) ? {
      id: row.suggested_scheme_id,
      name: suggestedSchemeName || row.suggested_scheme_id,
      code: row.suggested_scheme_code || null,
      maxCoverage: row.suggested_scheme_max_coverage != null ? Number(row.suggested_scheme_max_coverage) : null,
    } : null,
    assignedScheme: row.assigned_scheme_id ? {
      id: row.assigned_scheme_id,
      name: assignedSchemeName,
      code: row.assigned_scheme_code || null,
      maxCoverage: row.assigned_scheme_max_coverage != null ? Number(row.assigned_scheme_max_coverage) : null,
    } : null,
    scheme: displayScheme,
    isSchemeAssignedByAdmin: Boolean(row.assigned_scheme_id),

    // Patient & Citizen Info
    patientName: row.patient_name || 'Patient',
    address: row.patient_address || row.patient_address_line || '',
    addressLine: row.patient_address || row.patient_address_line || '',
    village: row.patient_village || '',
    city: row.patient_city || '',
    taluka: row.patient_taluka || '',
    district: row.patient_district || 'Pune',
    pincode: row.patient_pincode || '',
    abha: row.patient_abha || null,
    abhaNumber: row.patient_abha || null,
    patientAbha: row.patient_abha || null,

    patient: {
      name: row.patient_name || 'Patient',
      age: resolvedAge,
      gender: row.patient_gender || 'Male',
      mobile: row.patient_mobile || row.contactMobile || row.citizen_mobile || '—',
      dob: row.patient_dob || null,
      aadhaar: row.patient_aadhaar || null,
      abha: row.patient_abha || null,
      abhaNumber: row.patient_abha || null,
      relationship: row.relationship_with_citizen || 'Self',
      address: row.patient_address || row.patient_address_line || '',
      addressLine: row.patient_address || row.patient_address_line || '',
      village: row.patient_village || '',
      city: row.patient_city || '',
      taluka: row.patient_taluka || '',
      district: row.patient_district || '',
      pincode: row.patient_pincode || '',
    },
    applicant: {
      name: row.citizen_name || 'Citizen',
      mobile: row.citizen_mobile || '—',
      email: row.citizen_email || '',
      address: row.citizen_address || row.citizen_address_line || '',
      addressLine: row.citizen_address || row.citizen_address_line || '',
      city: row.citizen_city || '',
      taluka: row.citizen_taluka || '',
      district: row.citizen_district || '',
      pincode: row.citizen_pincode || '',
    },
    contact: row.patient_mobile || row.citizen_mobile || '—',
    age: resolvedAge,
    gender: row.patient_gender || 'Male',
    district: row.patient_district || row.citizen_district || 'Pune',

    // Relative / Emergency Contact
    relativeName: row.relative_name || null,
    relativePhone: row.relative_phone || null,
    relativeRelation: row.relative_relation || null,
    relativeAddress: row.relative_address || null,
    relativeVillage: row.relative_village || null,
    relativeCity: row.relative_city || null,
    relativeTaluka: row.relative_taluka || null,
    relativeDistrict: row.relative_district || null,
    relativePincode: row.relative_pincode || null,
    relative: row.relative_name ? {
      name: row.relative_name,
      phone: row.relative_phone,
      relation: row.relative_relation,
      address: row.relative_address || null,
      addressLine: row.relative_address || null,
      village: row.relative_village || null,
      city: row.relative_city || null,
      taluka: row.relative_taluka || null,
      district: row.relative_district || null,
      pincode: row.relative_pincode || null,
    } : null,

    // Treatment & Hospital Info
    treatmentType: row.treatment_type || 'OPD',
    type: row.treatment_type || 'OPD',
    caseTypeDesc: activeHospitalName ? `${row.treatment_type || 'OPD'} (${activeHospitalName})` : (row.treatment_type || 'OPD'),
    hospital: activeHospitalName || null,
    hospitalName: activeHospitalName || null,
    assignedHospital: activeHospitalName || null,
    hospitalId: row.active_assignment?.hospital_id || row.hospital_id || null,
    hospitalAddress: row.active_assignment?.hospital_address || row.hospital_address || null,
    hospitalCity: row.active_assignment?.hospital_city || row.hospital_city || null,
    hospitalDistrict: row.active_assignment?.hospital_district || row.hospital_district || null,
    hospitalPhone: row.active_assignment?.hospital_phone || row.hospital_phone || null,
    admissionDate: row.active_assignment?.admission_date || row.admission_date || null,
    visitDate: row.active_assignment?.visit_date || row.active_assignment?.admission_date || row.admission_date || null,
    preferredAdmissionDate: row.active_assignment?.admission_date || row.admission_date || null,

    // Referral details
    referredBy: row.referred_by || row.referral_name || (row.referral_first_name ? `${row.referral_first_name} ${row.referral_last_name || ''}`.trim() : null),
    referralName: row.referral_name || (row.referral_first_name ? `${row.referral_first_name} ${row.referral_last_name || ''}`.trim() : null),
    referralType: row.referral_type || null,
    referralCustomType: row.referral_custom_type || null,
    referralFirstName: row.referral_first_name || null,
    referralLastName: row.referral_last_name || null,

    // Notes & Remarks
    medicalCauseNote: row.medical_cause_note || null,
    condition: row.medical_cause_note || 'Medical assistance required',
    remarks: row.remarks || (Array.isArray(row.admin_remarks) && row.admin_remarks[0]?.remark) || null,
    adminNotes: (Array.isArray(row.admin_remarks) && row.admin_remarks.length > 0)
      ? row.admin_remarks.map(ar => ({
        id: ar.id,
        text: ar.remark || ar.text,
        note: ar.remark || ar.text,
        by: ar.by || ar.author_name || 'Admin (Rohit Patil)',
        date: ar.created_at ? new Date(ar.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recently',
      }))
      : (row.remarks ? [{ id: 'rem-1', text: row.remarks, note: row.remarks, by: 'Admin (Rohit Patil)', date: 'Recently' }] : []),
    notes: (Array.isArray(row.admin_remarks) && row.admin_remarks.length > 0)
      ? row.admin_remarks.map(ar => ar.remark || ar.text)
      : (row.remarks ? [row.remarks] : []),

    // Status & Financials
    status: isTransferredOut ? 'TRANSFERRED' : (row.current_status || 'SUBMITTED'),
    current_status: isTransferredOut ? 'TRANSFERRED' : (row.current_status || 'SUBMITTED'),
    statusClass: statusBadgeClass,
    isOnHold: Boolean(isDocsRequired),
    isDocumentsVerified: ['DOCS_VERIFIED', 'APPROVED', 'COORDINATED', 'TREATMENT_STARTED', 'CLOSED'].includes(row.current_status),
    priority: row.priority || 'REGULAR',
    isUrgentRow: row.priority === 'EMERGENCY' || row.priority === 'CRITICAL' || row.priority === 'HIGH',
    sanctionedAmount: row.sanctioned_amount != null ? `₹${Number(row.sanctioned_amount).toLocaleString('en-IN')}` : null,
    rawSanctionedAmount: row.sanctioned_amount != null ? Number(row.sanctioned_amount) : null,

    // Revert / Document request details
    revertDetails: row.revert_details || null,

    // Reviewer Claim Info
    reviewed_by_admin_id: row.reviewed_by_admin_id || null,
    reviewed_by_admin_name: row.reviewed_by_admin_name || null,
    claimed_at: row.claimed_at || null,
    reviewedByAdminId: row.reviewed_by_admin_id || null,
    reviewedByAdminName: row.reviewed_by_admin_name || null,
    claimedAt: row.claimed_at || null,

    // Assigned Arogya Sevak
    assignedSevak: (activeSevakName && activeSevakName !== 'Unassigned' && activeSevakName !== '-') ? {
      name: activeSevakName.includes('—') ? activeSevakName.split('—')[0].trim() : activeSevakName,
      phone: row.active_assignment?.sevak_mobile || row.active_assignment?.sevak_phone || row.assigned_sevak?.sevak_phone || row.sevak_phone || '9823012345',
      role: row.active_assignment?.role || 'आरोग्य सेवक / समन्वयक',
    } : (activeSevakName || null),
    sevakName: activeSevakName,
    sevak: activeSevakName,
    sevakPhone: row.active_assignment?.sevak_mobile || row.active_assignment?.sevak_phone || row.assigned_sevak?.sevak_phone || row.sevak_phone || null,

    // Documents & Timeline
    documents: Array.isArray(row.documents)
      ? row.documents.map((doc, idx) => {
        const rawDocName = doc.name || doc.file_name || doc.title || '';
        const isDocVerified = (doc.status || doc.document_status) === 'VERIFIED' || Boolean(doc.verified);
        const hasFile = Boolean((doc.file_url && doc.file_url !== '' && doc.file_url !== 'Pending Upload') || (doc.fileUrl && doc.fileUrl !== '' && doc.fileUrl !== 'Pending Upload'));
        const isPendingUpload = !hasFile && ((doc.status || doc.document_status) === 'PENDING_SEVAK_UPLOAD' || (doc.status || doc.document_status) === 'PENDING_CITIZEN_UPLOAD' || doc.file_name === 'Pending Upload' || !doc.file_url);
        const isUploaded = hasFile && !isPendingUpload;
        const isCitizenInitialDoc = rawDocName.startsWith('rn_image_picker') && !doc.is_sevak_upload && doc.uploaded_by_role !== 'AROGYA_SEVAK';
        const isSevakUpload = !isCitizenInitialDoc && Boolean(
          doc.is_sevak_upload ||
          doc.uploaded_by_role === 'AROGYA_SEVAK' ||
          doc.uploaded_by_role === 'SEVAK' ||
          doc.uploaderRole === 'ArogyaSevak' ||
          doc.status === 'PENDING_SEVAK_UPLOAD' ||
          doc.document_status === 'PENDING_SEVAK_UPLOAD' ||
          isSevakDocName(rawDocName)
        );

        const statusText = isDocVerified
          ? 'Verified'
          : (isPendingUpload
            ? (isSevakUpload ? 'Pending ArogyaSevak Upload' : 'Pending Citizen Upload')
            : (isUploaded ? (isSevakUpload ? 'Uploaded by ArogyaSevak (Pending Verification)' : 'Uploaded by Citizen (Pending Verification)') : 'Pending Upload'));

        return {
          id: doc.id || `DOC-${idx + 1}`,
          docId: doc.id || `DOC-${idx + 1}`,
          name: doc.name || doc.file_name || 'Uploaded Document',
          title: doc.file_name || doc.name || `Medical Document ${idx + 1}`,
          fileName: isPendingUpload ? 'Pending Upload' : (doc.file_name || doc.name || 'Document'),
          file: isPendingUpload ? 'Pending Upload' : (doc.file_name || doc.name || 'Document'),
          fileUrl: doc.file_url || doc.fileUrl || '',
          file_url: doc.file_url || doc.fileUrl || '',
          url: doc.file_url || doc.fileUrl || '',
          category: doc.category || (isSevakUpload ? 'ArogyaSevak Clinical Record' : 'Medical Record'),
          type: doc.category || (isSevakUpload ? 'ArogyaSevak Clinical Record' : 'Medical Record'),
          size: isPendingUpload ? '-' : (doc.file_size || doc.size || '1.2 MB'),
          fileSize: isPendingUpload ? '-' : (doc.file_size || doc.size || '1.2 MB'),
          source: isSevakUpload ? 'ArogyaSevak Upload' : (doc.source || 'Citizen Upload'),
          is_sevak_upload: isSevakUpload,
          isSevakUpload: isSevakUpload,
          uploaderRole: isSevakUpload ? 'ArogyaSevak' : 'Citizen',
          status: isDocVerified ? 'VERIFIED' : (isPendingUpload ? (isSevakUpload ? 'PENDING_SEVAK_UPLOAD' : 'PENDING_CITIZEN_UPLOAD') : (isUploaded ? 'UPLOADED' : 'PENDING')),
          document_status: isDocVerified ? 'VERIFIED' : (isPendingUpload ? (isSevakUpload ? 'PENDING_SEVAK_UPLOAD' : 'PENDING_CITIZEN_UPLOAD') : (isUploaded ? 'UPLOADED' : 'PENDING')),
          verified: isDocVerified,
          uploaded: isUploaded,
          statusText,
          verificationRemark: doc.verification_remark || '',
          uploadedAt: doc.uploaded_at,
          date: doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recently',
          verifiedAt: doc.verified_at,
        };
      })
      : [],
    requestedDocuments: (() => {
      const list = [];
      const seenTitles = new Set();
      const rawDocs = Array.isArray(row.documents) ? row.documents : [];

      const uploadedSevakDocs = rawDocs.filter((d) => {
        const hasFile = Boolean(d.file_url && d.file_url !== '' && d.file_url !== 'Pending Upload');
        const isSevak = Boolean(d.is_sevak_upload || d.uploaded_by_role === 'AROGYA_SEVAK');
        return hasFile && isSevak;
      });

      const pendingUploadDocs = rawDocs.filter((d) => {
        const docStatus = String(d.document_status || d.status || '').toUpperCase();
        const hasFile = Boolean(d.file_url && d.file_url !== '' && d.file_url !== 'Pending Upload');
        return !hasFile || docStatus === 'PENDING_SEVAK_UPLOAD' || docStatus === 'PENDING_CITIZEN_UPLOAD' || d.file_name === 'Pending Upload';
      });

      rawDocs.forEach((d, i) => {
        const docStatus = String(d.document_status || d.status || '').toUpperCase();
        const hasFile = Boolean(d.file_url && d.file_url !== '' && d.file_url !== 'Pending Upload');
        const isPending = !hasFile || docStatus === 'PENDING_SEVAK_UPLOAD' || docStatus === 'PENDING_CITIZEN_UPLOAD' || d.file_name === 'Pending Upload';
        const isSevak = Boolean(d.is_sevak_upload || d.uploaded_by_role === 'AROGYA_SEVAK' || docStatus === 'PENDING_SEVAK_UPLOAD' || isPending);

        if (isPending || isSevak) {
          const title = d.file_name || d.name || 'Requested Document';
          if (title && title !== 'Pending Upload' && !seenTitles.has(title.toLowerCase())) {
            seenTitles.add(title.toLowerCase());
            list.push({
              id: d.id || `req-doc-${i + 1}`,
              title,
              description: d.verification_remark || 'Clinical document requested by Admin',
              isRequired: true,
              status: (docStatus === 'VERIFIED') ? 'verified' : (hasFile ? 'uploaded' : 'pending'),
              is_sevak_upload: true,
              requested_from: 'sevak',
              file_url: hasFile ? d.file_url : '',
            });
          }
        }
      });

      const rev = row.revert_details;
      if (rev && (rev.requestedDocName || rev.requested_doc_name)) {
        const title = (rev.requestedDocName || rev.requested_doc_name).trim();
        const isResolved = Boolean(rev.isResolved || rev.is_resolved || uploadedSevakDocs.length > 0);
        if (title && !seenTitles.has(title.toLowerCase())) {
          seenTitles.add(title.toLowerCase());
          const matchingDoc = uploadedSevakDocs[0];
          list.push({
            id: `req-revert-${row.id}`,
            title,
            description: rev.reason || 'Requested by Admin for case verification',
            isRequired: true,
            status: isResolved ? 'uploaded' : 'pending',
            is_sevak_upload: true,
            requested_from: rev.requestedFrom || 'sevak',
            file_url: matchingDoc ? matchingDoc.file_url : '',
          });
        }
      }

      // ONLY check remarks if there is an actual unresolved document request and no uploaded Sevak docs
      const remText = String(row.remarks || '');
      if (remText.includes('Document requested from') || remText.includes('कागदपत्र मागितले')) {
        const match = remText.match(/Document requested from (?:ArogyaSevak|Citizen):\s*([^.]+?)(?:\.|$)/i);
        if (match && match[1]) {
          const docTitle = match[1].trim();
          const isResolved = uploadedSevakDocs.length > 0 || (rev && (rev.isResolved || rev.is_resolved));
          if (docTitle && !seenTitles.has(docTitle.toLowerCase())) {
            seenTitles.add(docTitle.toLowerCase());
            // If already resolved or uploaded, mark as uploaded, otherwise pending only if pendingDbDocs exist
            if (isResolved || pendingUploadDocs.length > 0) {
              const matchingDoc = uploadedSevakDocs[0];
              list.push({
                id: `req-rem-${row.id}`,
                title: docTitle,
                description: remText,
                isRequired: true,
                status: isResolved ? 'uploaded' : 'pending',
                is_sevak_upload: true,
                requested_from: 'sevak',
                file_url: matchingDoc ? matchingDoc.file_url : '',
              });
            }
          }
        }
      }

      // Merge temporary image picker items into canonical requested doc title
      const canonicalItems = list.filter(
        (it) => !it.title.startsWith('rn_image_picker') && !it.title.startsWith('image_picker')
      );
      const tempPickerItems = list.filter(
        (it) => it.title.startsWith('rn_image_picker') || it.title.startsWith('image_picker')
      );

      if (canonicalItems.length > 0 && tempPickerItems.length > 0) {
        canonicalItems.forEach((cItem) => {
          if (cItem.status === 'pending') {
            const tempMatch = tempPickerItems.find((t) => Boolean(t.file_url));
            if (tempMatch) {
              cItem.status = 'uploaded';
              cItem.file_url = tempMatch.file_url;
            }
          }
        });
        return canonicalItems;
      }

      return list;
    })(),
    documentsCount: row.documents_count != null ? Number(row.documents_count) : (Array.isArray(row.documents) ? row.documents.length : 0),
    timeline,

    // Dates & 60-day Reopen calculations
    treatmentStage: isTransferredOut ? 'Transferred' : (row.treatment_stage || 'Admitted'),
    caseProgress: row.case_progress || null,
    sevakReportedStatus: isTransferredOut ? 'Transferred' : (row.sevak_reported_status || row.treatment_stage || 'Admitted'),
    latestWardUpdate: row.latest_ward_update || null,
    sevakLastUpdatedAt: row.sevak_last_updated_at || null,
    clinicalNotes: row.clinical_notes || [],
    updateHistory: row.update_history || (row.latest_ward_update ? [{
      date: 'Recently',
      update: row.latest_ward_update,
      type: `${row.sevak_reported_status || 'Treatment'} Update`,
      by: activeSevakName || 'ArogyaSevak'
    }] : []),

    submittedDate: row.submitted_at ? new Date(row.submitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recently',
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    completedAt: row.completed_at,
    closedAt: row.closed_at,
    rejectedDate: row.closed_at || row.reviewed_at || row.updated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastReminderSentAt: row.last_reminder_sent_at || null,
    reminderCount: row.reminder_count != null ? Number(row.reminder_count) : 0,
    reopenRequested: Boolean(row.reopen_requested),
    reopenRequestedAt: row.reopen_requested_at || null,
    reopenRequestReason: row.reopen_request_reason || '',

    // Reassigned / Transferred metadata & badge (Differentiating Sevak 1 vs Sevak 2)
    ...(() => {
      const remarkStr = String(row.remarks || row.active_assignment?.assignment_remark || '');
      const isReassignedCase = Boolean(
        !isTransferredOut && (
          row.is_reassigned ||
          row.isReassigned ||
          remarkStr.includes('REASSIGNED') ||
          remarkStr.includes('Transferred from') ||
          row.active_assignment?.assignment_remark?.includes('REASSIGNED') ||
          row.active_assignment?.assignment_remark?.includes('Transferred from')
        )
      );

      let parsedFromHospital = null;
      let parsedSpecialty = null;
      let parsedPrevSevakName = null;
      let parsedPrevSevakPhone = null;

      if (isReassignedCase || isTransferredOut || remarkStr.includes('Transferred from')) {
        const fromMatch = remarkStr.match(/Transferred from\s+["']?([^"'\n\r,]+?)["']?\s+(?:due to|to)/i);
        if (fromMatch) parsedFromHospital = fromMatch[1].trim();

        const specMatch = remarkStr.match(/due to\s+["']?([^"'\n\r,]+?)["']?\s+specialty/i) || remarkStr.match(/due to\s+([^\.]+?)\s+unavailable/i);
        if (specMatch) parsedSpecialty = specMatch[1].trim();

        const prevSevakMatch = remarkStr.match(/Previous Sevak:\s+([^\(]+?)\s+\(Ph:\s*([^\)]+?)\)/i);
        if (prevSevakMatch) {
          parsedPrevSevakName = prevSevakMatch[1].trim();
          parsedPrevSevakPhone = prevSevakMatch[2].trim();
        }
      }

      const assignedToNewHospital = activeHospitalName || row.hospital_name || 'Destination Hospital';
      const assignedToNewSevak = (activeSevakName && activeSevakName !== 'Unassigned' && activeSevakName !== '-') ? {
        name: activeSevakName.includes('—') ? activeSevakName.split('—')[0].trim() : activeSevakName,
        phone: row.active_assignment?.sevak_mobile || row.active_assignment?.sevak_phone || '98765 00002',
      } : null;

      if (isTransferredOut) {
        const text_mr = `🚨 रुग्ण वर्ग मंजुरी: केस #${appNumber} (${row.patient_name || 'रुग्ण'}) ची वर्ग विनंती मंजूर झाली आहे. रुग्ण '${assignedToNewHospital}' येथे नवीन आरोग्य सेवक '${assignedToNewSevak?.name || 'आरोग्य सेवक'}' (${assignedToNewSevak?.phone || '—'}) यांच्याकडे वर्ग केला आहे. कृपया रुग्ण नवीन रुग्णालयाकडे रवाना करा.`;
        const text_en = `🚨 Patient Transfer Approved: Case #${appNumber} (${row.patient_name || 'Patient'}) transfer request is approved. Transferred to '${assignedToNewHospital}' under Arogya Sevak '${assignedToNewSevak?.name || 'Arogya Sevak'}' (${assignedToNewSevak?.phone || '—'}). Please dispatch the patient to the new hospital.`;
        const text_hi = `🚨 मरीज स्थानांतरण स्वीकृत: केस #${appNumber} (${row.patient_name || 'मरीज'}) का ट्रांसफर स्वीकृत हो गया है। '${assignedToNewHospital}' में नए आरोग्य सेवक '${assignedToNewSevak?.name || 'आरोग्य सेवक'}' (${assignedToNewSevak?.phone || '—'}) को सौंपा गया है। कृपया मरीज को नए अस्पताल के लिए रवाना करें।`;

        return {
          isTransferredOut: true,
          isReassigned: false,
          reassignedBadge: 'Transferred to Other Hospital',
          status: 'TRANSFERRED',
          treatmentStatus: 'Transferred',
          treatmentStage: 'Transferred',
          sevakReportedStatus: 'Transferred',
          assignedToNewHospital,
          assignedToNewSevak,
          patientMovedStatus: row.patient_moved_status || row.patientMovedStatus || 'PENDING_DISPATCH',
          patientMovedAt: row.patient_moved_at || row.patientMovedAt || null,
          priorityNote: {
            id: `note-transferred-${appNumber}`,
            text: text_en,
            text_en,
            text_hi,
            text_mr,
            adminName: 'District Health Officer / Admin',
            designation: 'Health Dept Supervisor',
            level: 'HIGH',
            title_en: 'PATIENT TRANSFER DIRECTIVE',
            title_hi: 'मरीज स्थानांतरण निर्देश',
            title_mr: 'रुग्ण वर्ग प्रशासकीय आदेश',
            date: 'Today',
            badge: 'Case Transferred',
            badge_en: 'Case Transferred',
            badge_hi: 'केस स्थानांतरित',
            badge_mr: 'रुग्ण वर्ग केला',
            isTransferredOut: true,
          },
        };
      }

      if (isReassignedCase) {
        const text_mr = `🚨 तातडीचे पुनर्नियुक्त प्रकरण: रुग्ण ${row.patient_name || 'रुग्ण'} चे प्रकरण '${parsedFromHospital || 'मागील रुग्णालय'}' येथून '${parsedSpecialty || 'आवश्यक'}' सुविधा उपलब्ध नसल्याने तुमच्याकडे वर्ग केले आहे. मागील आरोग्य सेवक: ${parsedPrevSevakName || 'आरोग्य सेवक'} (${parsedPrevSevakPhone || '—'}). कृपया त्वरित दाखल करून घ्या.`;
        const text_en = `🚨 Urgent Reassigned Case: Patient ${row.patient_name || 'Patient'}'s case has been reassigned to you from '${parsedFromHospital || 'Previous Hospital'}' due to unavailable '${parsedSpecialty || 'Required'}' specialty. Previous Arogya Sevak: ${parsedPrevSevakName || 'Arogya Sevak'} (${parsedPrevSevakPhone || '—'}). Please admit immediately.`;
        const text_hi = `🚨 आपातकालीन पुनर्नियुक्त मामला: मरीज ${row.patient_name || 'मरीज'} का मामला '${parsedFromHospital || 'पिछला अस्पताल'}' से '${parsedSpecialty || 'आवश्यक'}' सुविधा अनुपलब्ध होने के कारण आपको सौंपा गया है। पिछले आरोग्य सेवक: ${parsedPrevSevakName || 'आरोग्य सेवक'} (${parsedPrevSevakPhone || '—'})। कृपया तुरंत भर्ती करें।`;

        return {
          isTransferredOut: false,
          isReassigned: true,
          reassignedBadge: 'Reassigned Case',
          transferredFromHospital: parsedFromHospital || row.transferred_from_hospital || null,
          transferReason: parsedSpecialty ? `${parsedSpecialty} Specialty Unavailable` : (row.transfer_reason || null),
          previousSevak: parsedPrevSevakName ? {
            name: parsedPrevSevakName,
            phone: parsedPrevSevakPhone,
          } : null,
          priorityNote: {
            id: `note-reassigned-${appNumber}`,
            text: text_en,
            text_en,
            text_hi,
            text_mr,
            adminName: 'District Health Officer / Admin',
            designation: 'Health Dept Supervisor',
            level: 'CRITICAL',
            title_en: 'PRIORITY NOTE FROM ADMIN (CRITICAL)',
            title_hi: 'प्रशासक से प्राथमिकता निर्देश (अतिगंभीर)',
            title_mr: 'प्रशासनाकडून प्राधान्य सूचना (अतितातडीचे)',
            date: 'Today',
            badge: 'Reassigned Case',
            badge_en: 'Reassigned Case',
            badge_hi: 'पुनर्निर्देशित प्रकरण',
            badge_mr: 'पुनर्नियुक्त प्रकरण',
            isReassigned: true,
          },
        };
      }

      return {
        isTransferredOut: false,
        isReassigned: false,
        reassignedBadge: null,
        transferredFromHospital: null,
        transferReason: null,
        previousSevak: null,
      };
    })(),

    // 60-day Reopen & Archive status
    reopenInfo: (() => {
      const upperStatus = String(row.current_status || '').toUpperCase();
      const isRejected = upperStatus === 'REJECTED';
      const isArchived = upperStatus === 'ARCHIVED' || upperStatus === 'CLOSED_EXPIRED';
      if (!isRejected && !isArchived) {
        return { isRejected: false, isReopenable: false, isArchived: false, daysRemaining: 0, daysElapsed: 0, reopenRequested: false, reopenRequestReason: '' };
      }
      const closedDate = row.closed_at || row.reviewed_at || row.updated_at || row.created_at;
      const closedTime = closedDate ? new Date(closedDate).getTime() : Date.now();
      const daysElapsed = Math.floor((Date.now() - closedTime) / (1000 * 60 * 60 * 24));
      const daysRemaining = Math.max(0, 60 - daysElapsed);
      const expired = daysElapsed >= 60 || isArchived;
      return {
        isRejected,
        isReopenable: isRejected && !expired,
        isArchived: expired,
        daysRemaining,
        daysElapsed,
        rejectedDate: closedDate,
        reopenRequested: Boolean(row.reopen_requested),
        reopenRequestedAt: row.reopen_requested_at || null,
        reopenRequestReason: row.reopen_request_reason || '',
      };
    })(),
  };
};

/**
 * Application Service Layer
 */
export const applicationService = {
  /**
   * Submit a new scheme application (Citizen flow)
   * Generates sequential ID: AA-<YYYY>-00001
   * Citizen selects suggested scheme; Admin later assigns official scheme.
   */
  async submitApplication(citizenUserId, payload) {
    // 0. Deterministic Master-Data Location Resolution
    const resolvedDistrict = await resolveDistrict(payload.district_id || payload.districtId || payload.district || payload.dist);
    const resolvedTaluka = await resolveTaluka(payload.taluka_id || payload.talukaId || payload.taluka || payload.tal, resolvedDistrict.id || resolvedDistrict.district_code);

    const canonicalDistrictName = resolvedDistrict.nameEnglish || payload.district || 'Pune';
    const canonicalTalukaName = resolvedTaluka.nameEnglish || payload.taluka || null;
    const finalDistrictId = resolvedDistrict.id || null;
    const finalTalukaId = resolvedTaluka.id || null;

    // 1. Resolve or create Citizen Profile
    let citizen = await CitizenModel.findByUserId(citizenUserId);
    if (!citizen) {
      citizen = await CitizenModel.create({
        user_id: citizenUserId,
        address_line: payload.address || null,
        city: payload.villageCity || null,
        taluka: canonicalTalukaName,
        taluka_id: finalTalukaId,
        district: canonicalDistrictName,
        district_id: finalDistrictId,
        pincode: payload.pincode || null,
      });
    } else if (!citizen.district_id && finalDistrictId) {
      await CitizenModel.update(citizen.id, {
        district_id: finalDistrictId,
        taluka_id: finalTalukaId,
      });
    }

    // 2. Create or link Patient Record
    const isSelf = payload.applyingFor === 'self' || payload.applyingFor === 'SELF';
    const patientRel = isSelf ? 'Self' : (payload.relativeRelation || 'Relative');

    const patientAge = (payload.age !== undefined && payload.age !== null && payload.age !== '')
      ? parseInt(String(payload.age), 10)
      : (payload.dateOfBirth ? Math.max(0, new Date().getFullYear() - new Date(payload.dateOfBirth).getFullYear()) : null);

    const calculatedDob = payload.dateOfBirth || (patientAge != null ? new Date(new Date().getFullYear() - patientAge, 0, 1) : null);

    const patient = await PatientModel.create({
      citizen_id: citizen.id,
      full_name: payload.patientName.trim(),
      age: patientAge,
      gender: payload.gender || 'Male',
      relationship_with_citizen: patientRel,
      mobile_number: payload.contactMobile || citizen.mobile_number || null,
      address_line: payload.address || null,
      area: payload.villageCity || null,
      village: payload.villageCity || null,
      city: payload.villageCity || null,
      taluka: canonicalTalukaName,
      district: canonicalDistrictName,
      pincode: payload.pincode || null,
      aadhaar_number: payload.aadhaarNumber ? payload.aadhaarNumber.replace(/\s+/g, '').slice(0, 20) : `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      date_of_birth: calculatedDob,
    });

    // 3. Resolve suggested scheme title
    let suggestedName = payload.suggested_scheme_name;
    if (!suggestedName && payload.suggested_scheme_id) {
      const sc = await SchemeModel.findByCode(payload.suggested_scheme_id) || await SchemeModel.findById(payload.suggested_scheme_id);
      suggestedName = sc?.name || (payload.suggested_scheme_id.toUpperCase() === 'MJPJAY' ? 'Mahatma Jyotirao Phule Jan Arogya Yojana (MJPJAY)' : 'Ayushman Bharat PM-JAY');
    }

    // 4. Generate sequential Application Number: AA-YYYY-00001
    const currentYear = new Date().getFullYear();
    const applicationNumber = await ApplicationModel.generateNextApplicationNumber(currentYear);

    // 5. Create Application Record
    const application = await ApplicationModel.create({
      patient_id: patient.id,
      submitted_by_citizen_id: citizen.id,
      application_number: applicationNumber,
      district_id: finalDistrictId,
      taluka_id: finalTalukaId,
      suggested_scheme_id: payload.suggested_scheme_id || 'mjpjay',
      suggested_scheme_name: suggestedName,
      assigned_scheme_id: null, // Left null until Admin formally approves/assigns
      assigned_scheme_name: null,
      priority: payload.priority || 'MEDIUM',
      treatment_type: payload.treatmentType || 'OPD',
      hospital_name: payload.hospitalName || null,
      hospital_id: payload.hospitalId || null,
      medical_cause_note: payload.medicalCauseNote || null,
      referral_type: payload.referralType || null,
      referral_custom_type: payload.referralCustomType || null,
      referral_name: payload.referralName || payload.referralFullName || (payload.referralFirstName ? `${payload.referralFirstName} ${payload.referralLastName || ''}`.trim() : null),
      referral_first_name: payload.referralFirstName || null,
      referral_last_name: payload.referralLastName || null,
      referred_by: payload.referredBy || null,
      relative_name: payload.relativeName || null,
      relative_phone: payload.relativePhone || null,
      relative_relation: payload.relativeRelation || null,
      remarks: payload.remarks || null,
      current_status: 'SUBMITTED',
    });

    // 6. Save Uploaded Documents
    if (Array.isArray(payload.documents) && payload.documents.length > 0) {
      await ApplicationDocumentModel.batchCreate(application.id, citizenUserId, payload.documents);
    }

    // 7. Record Initial Status History
    await ApplicationStatusHistoryModel.create({
      application_id: application.id,
      old_status: null,
      new_status: 'SUBMITTED',
      remark: 'Application submitted by citizen / नागरिकाकडून अर्ज सादर करण्यात आला.',
      changed_by_user_id: citizenUserId,
    });

    // 8. Fetch complete enriched record and return
    const fullApp = await ApplicationModel.findById(application.id);
    return formatApplicationResponse(fullApp);
  },

  /**
   * Get applications submitted by the logged-in citizen
   */
  async getMyApplications(citizenUserId, filters = {}) {
    let citizen = await CitizenModel.findByUserId(citizenUserId);
    if (!citizen) {
      return { applications: [], total: 0 };
    }

    const rows = await ApplicationModel.findByCitizenId(citizen.id, {
      limit: parseInt(filters.limit, 10) || 50,
      offset: parseInt(filters.offset, 10) || 0,
    });

    return {
      applications: rows.map(formatApplicationResponse),
      total: rows.length,
    };
  },

  /**
   * Get application detail by UUID or Case ID (AA-YYYY-00001)
   */
  async getApplicationDetails(applicationId, userContext = null) {
    const app = await ApplicationModel.findById(applicationId);
    if (!app) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, `Application '${applicationId}' not found.`);
    }

    let sevakContext = userContext;
    if (userContext?.id) {
      try {
        const sevakRec = (await ArogyaSevakModel.findByUserId(userContext.id)) || (await ArogyaSevakModel.findById(userContext.id));
        if (sevakRec) {
          sevakContext = {
            id: sevakRec.id,
            userId: sevakRec.user_id || userContext.id,
            name: sevakRec.full_name || sevakRec.name || userContext.name || userContext.full_name,
            candidateIds: [sevakRec.id, sevakRec.user_id, userContext.id].filter(Boolean),
          };
        }
      } catch (_) {}
    }

    return formatApplicationResponse(app, sevakContext);
  },

  async getApplicationById(applicationId, userContext = null) {
    return this.getApplicationDetails(applicationId, userContext);
  },

  /**
   * Citizen resubmits a requested document when application is REVERTED / DOCS_REQUIRED
   */
  async resubmitRequestedDocument(applicationId, citizenUserId, { document, citizenRemark }) {
    const app = await ApplicationModel.findById(applicationId);
    if (!app) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, `Application '${applicationId}' not found.`);
    }

    // 1. Save resubmitted document
    const newDoc = await ApplicationDocumentModel.create({
      application_id: app.id,
      file_url: document.file_url,
      file_name: document.name || 'Resubmitted_Document.pdf',
      category: document.category || 'other',
      file_size: document.size || '1.2 MB',
      source: document.source || 'device',
      document_status: 'PENDING',
      verification_remark: citizenRemark || 'Resubmitted by citizen for review',
      uploaded_by_user_id: citizenUserId,
    });

    // 2. Resolve revert details
    const existingRevert = app.revert_details || {};
    const updatedRevert = {
      ...existingRevert,
      isResolved: true,
      resubmittedDocId: newDoc.id,
      resubmittedDocName: newDoc.file_name,
      resubmittedRemark: citizenRemark || null,
      resubmittedDate: new Date().toISOString(),
    };

    // 3. Move status from REVERTED to UNDER_REVIEW
    const updated = await ApplicationModel.updateStatus(app.id, 'UNDER_REVIEW', {
      revert_details: updatedRevert,
      remarks: citizenRemark ? `Citizen Remark: ${citizenRemark}` : undefined,
    });

    // 4. Record status transition
    await ApplicationStatusHistoryModel.create({
      application_id: app.id,
      old_status: app.current_status,
      new_status: 'UNDER_REVIEW',
      remark: `Document "${newDoc.file_name}" uploaded by citizen. Case resubmitted for admin review.`,
      changed_by_user_id: citizenUserId,
    });

    // 5. Notify Admin desk about resubmitted document
    try {
      await notificationService.notifyAdminDocResubmitted(app, newDoc, citizenRemark, citizenUserId);
    } catch (notifErr) {
      console.warn('[application.service] notifyAdminDocResubmitted error:', notifErr.message);
    }

    const refreshed = await ApplicationModel.findById(app.id);
    return formatApplicationResponse(refreshed);
  },

  /**
  /**
   * Citizen: Send SLA breach reminder to admin / escalate case
   * POST /api/applications/:id/remind-admin
   */
  async remindAdmin(applicationId, citizenUserId, payload = {}) {
    return this.sendAdminReminder(applicationId, citizenUserId, payload);
  },

  /**
   * Citizen sends an SLA reminder / escalation alert to Admin for pending case
   */
  async sendAdminReminder(applicationId, citizenUserId, payload = {}) {
    const app = await ApplicationModel.findById(applicationId);
    if (!app) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, `Application '${applicationId}' not found.`);
    }

    const reminderNote =
      payload.escalationNote ||
      payload.reason ||
      payload.message ||
      `SLA priority reminder (${app.priority || 'MEDIUM'} priority case) / नागरिकाने तातडीची आठवण पाठवली आहे.`;

    // 1. Record in Status History as reminder log
    await ApplicationStatusHistoryModel.create({
      application_id: app.id,
      old_status: app.current_status,
      new_status: app.current_status,
      remark: `🚨 SLA Escalation Reminder: ${reminderNote}`,
      changed_by_user_id: citizenUserId,
    });

    // 2. Update application last_reminder_sent_at and increment count
    await ApplicationModel.recordReminder(app.id);

    // 3. Update application remarks to flag it
    await ApplicationModel.updateStatus(app.id, app.current_status, {
      remarks: `[SLA REMINDER] ${reminderNote}`,
    });

    // 4. Create live Admin Notification record
    try {
      const { NotificationModel } = await import('../models/notification.model.js');
      const caseCode = app.application_number || app.id;
      const patient = app.patient_name || 'नागरिक / Citizen';
      const prio = (app.priority || 'HIGH').toUpperCase();

      await NotificationModel.create({
        recipient_type: 'ADMIN',
        type: 'SLA_REMINDER',
        priority: prio,
        application_id: app.id,
        case_id: caseCode,
        title: `🚨 तातडीचे स्मरणपत्र: ${caseCode}`,
        title_en: `🚨 Action Required: SLA Reminder for Case ${caseCode}`,
        title_hi: `🚨 त्वरित कार्रवाई: मामला ${caseCode} अनुस्मारक`,
        message: `${patient} यांनी केस #${caseCode} (${prio} Priority) बाबत तातडीचे स्मरणपत्र पाठवले आहे.`,
        message_en: `Citizen ${patient} has sent an urgent SLA reminder for Case #${caseCode} (${prio} Priority). Action required.`,
        message_hi: `नागरिक ${patient} ने केस #${caseCode} (${prio} प्राथमिकता) के लिए स्मरणपत्र भेजा है।`,
        sender: patient,
        sender_en: patient,
        sender_hi: patient,
        action_type: 'VIEW_CASE',
        badge: prio,
        badge_en: prio,
        badge_hi: prio,
        metadata: {
          applicationId: app.id,
          caseId: caseCode,
          patientName: patient,
          priority: prio,
          reminderNote,
          sentAt: new Date().toISOString(),
        },
      });
    } catch (notifErr) {
      console.warn('[ApplicationService] Error creating admin SLA reminder notification:', notifErr.message);
    }

    const refreshed = await ApplicationModel.findById(app.id);
    return formatApplicationResponse(refreshed);
  },

  /**
   * Admin: List all applications with search, status, scheme, priority filters & pagination
   */
  async getAllApplications(filters = {}) {
    const limit = parseInt(filters.limit, 10) || 50;
    const offset = parseInt(filters.offset, 10) || 0;

    const { applications, total } = await ApplicationModel.findAll({
      status: filters.status,
      scheme_id: filters.scheme_id || filters.scheme,
      priority: filters.priority,
      search: filters.search,
      limit,
      offset,
    });

    return {
      applications: applications.map(formatApplicationResponse),
      total,
      limit,
      offset,
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(total / limit) || 1,
    };
  },

  /**
   * Admin: Get application queue metrics / stats
   */
  async getApplicationStats() {
    const stats = await ApplicationModel.getStatistics();
    return {
      totalApplications: Number(stats.total_applications) || 0,
      submittedCount: Number(stats.submitted_count) || 0,
      inReviewCount: Number(stats.in_review_count) || 0,
      revertDocsRequiredCount: Number(stats.revert_docs_required_count) || 0,
      approvedCount: Number(stats.approved_count) || 0,
      rejectedCount: Number(stats.rejected_count) || 0,
      closedCount: Number(stats.closed_count) || 0,
      criticalPriorityCount: Number(stats.critical_count) || 0,
      highPriorityCount: Number(stats.high_count) || 0,
      emergencyPriorityCount: Number(stats.emergency_count ?? stats.critical_count) || 0,
      regularPriorityCount: Number(stats.regular_count) || 0,
    };
  },

  /**
   * Collaborative admin mode: Multi-admin actions allowed with comprehensive audit logging
   */
  async checkReviewerLock(app, adminUserId) {
    // Collaborative permissions enabled: All admins can perform actions and all events are logged to the audit trail
    return;
  },

  /**
   * Admin: Update application status (Approve, Reject, Review, Close)
   * Also officially assigns the Scheme & Hospital when approving!
   */
  async updateApplicationStatus(applicationId, adminUserId, data) {
    const app = await ApplicationModel.findById(applicationId);
    if (!app) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, `Application '${applicationId}' not found.`);
    }

    await this.checkReviewerLock(app, adminUserId);

    let assignedSchemeId = data.assigned_scheme_id || data.scheme_id || data.schemeId;
    let assignedSchemeName = data.assigned_scheme_name || data.assignedScheme || data.scheme || data.schemeName;

    // If approving and admin didn't specify a different scheme, officially confirm the suggested scheme
    if (['APPROVED', 'COORDINATED', 'TREATMENT_STARTED'].includes(data.status.toUpperCase())) {
      if (!assignedSchemeId && app.suggested_scheme_id) {
        assignedSchemeId = app.suggested_scheme_id;
        assignedSchemeName = app.suggested_scheme_name || 'Mahatma Jyotirao Phule Jan Arogya Yojana (MJPJAY)';
      }
    }

    const hospitalName = data.hospital_name || data.hospitalName || data.hospital || null;
    const hospitalId = data.hospital_id || data.hospitalId || null;

    let closedAt = undefined;
    if (['CLOSED', 'REJECTED'].includes(data.status.toUpperCase())) {
      closedAt = new Date();
    }

    const updated = await ApplicationModel.updateStatus(app.id, data.status.toUpperCase(), {
      assigned_scheme_id: assignedSchemeId,
      assigned_scheme_name: assignedSchemeName,
      hospital_id: hospitalId || app.hospital_id,
      hospital_name: hospitalName || app.hospital_name,
      sanctioned_amount: data.sanctioned_amount,
      remarks: data.reason || data.remarks,
      closed_at: closedAt,
    });

    // Record status history
    await ApplicationStatusHistoryModel.create({
      application_id: app.id,
      old_status: app.current_status,
      new_status: data.status.toUpperCase(),
      remark: data.reason || data.remarks || `Status updated to ${data.status} by Admin`,
      changed_by_user_id: adminUserId,
    });

    // If hospital or sevak details were provided with status update, also sync assignment
    if (hospitalName || hospitalId || data.sevak || data.sevakName || data.arogya_sevak_id) {
      try {
        await this.assignCase(app.id, adminUserId, {
          hospital_id: hospitalId,
          hospital_name: hospitalName,
          arogya_sevak_id: data.arogya_sevak_id || data.sevakId,
          sevak_name: data.sevak || data.sevakName,
          scheme: assignedSchemeName,
          scheme_id: assignedSchemeId,
          remark: data.remarks || `Auto-assigned during ${data.status}`
        });
      } catch (assignErr) {
        console.warn('[application.service] Auto-assign in updateStatus warning:', assignErr.message);
      }
    }

    // Trigger push notification to citizen about status change
    try {
      await notificationService.notifyStatusUpdated(
        app,
        data.status,
        {
          assigned_scheme_id: assignedSchemeId,
          assigned_scheme_name: assignedSchemeName,
          sanctioned_amount: data.sanctioned_amount,
          approved_amount: data.sanctioned_amount,
          remarks: data.reason || data.remarks,
        },
        adminUserId
      );
    } catch (notifErr) {
      console.warn('[application.service] notifyStatusUpdated warning:', notifErr.message);
    }

    const refreshed = await ApplicationModel.findById(app.id);
    return formatApplicationResponse(refreshed);
  },

  /**
   * Admin: Request document / revert case back to citizen with alert
   */
  async requestDocument(applicationId, adminUserId, { requestedDocName, requestedDocType, reason, deadlineDays = 3 }) {
    const app = await ApplicationModel.findById(applicationId);
    if (!app) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, `Application '${applicationId}' not found.`);
    }

    await this.checkReviewerLock(app, adminUserId);

    const currentStatus = String(app.current_status || '').toUpperCase().replace(/[-\s/]+/g, '_');
    const isApprovedOrAssigned = ['APPROVED', 'COORDINATED', 'TREATMENT_STARTED', 'ASSIGNED', 'HOSPITAL_SEVAK_ASSIGNED', 'DISCHARGED', 'CLOSED'].includes(currentStatus);

    const revertDetails = {
      requestedDocName,
      requestedDocType: requestedDocType || 'other',
      reason,
      deadlineDays: deadlineDays || 3,
      requestedDate: new Date().toISOString(),
      isResolved: false,
      requestedFrom: isApprovedOrAssigned ? 'sevak' : 'citizen',
    };

    const nextStatus = 'DOCS_REQUIRED';

    await ApplicationModel.updateStatus(app.id, nextStatus, {
      revert_details: revertDetails,
      remarks: `Document requested from ${isApprovedOrAssigned ? 'ArogyaSevak' : 'Citizen'}: ${requestedDocName}. Reason: ${reason}`,
    });

    await ApplicationStatusHistoryModel.create({
      application_id: app.id,
      old_status: app.current_status,
      new_status: nextStatus,
      remark: `Document requested from ${isApprovedOrAssigned ? 'ArogyaSevak' : 'Citizen'}: "${requestedDocName}" — ${reason}`,
      changed_by_user_id: adminUserId,
    });

    // Also persist the pending document record in database if assigned
    try {
      if (isApprovedOrAssigned) {
        await ApplicationDocumentModel.create({
          application_id: app.id,
          document_type: requestedDocType || 'other',
          file_name: requestedDocName,
          file_url: '',
          document_status: 'PENDING_SEVAK_UPLOAD',
          is_sevak_upload: true,
          uploaded_by_role: 'AROGYA_SEVAK',
          verification_remark: reason || 'Requested from ArogyaSevak',
        });
      }
    } catch (docErr) {
      console.warn('[application.service] document record creation notice:', docErr.message);
    }

    // Trigger document request alert & notification to Sevak or Citizen
    try {
      await notificationService.notifyDocRequested(app, revertDetails, adminUserId);
    } catch (notifErr) {
      console.warn('[application.service] notifyDocRequested warning:', notifErr.message);
    }

    const refreshed = await ApplicationModel.findById(app.id);
    const formatted = formatApplicationResponse(refreshed);

    return {
      application_id: app.id,
      case_id: app.application_number || app.id,
      status: nextStatus,
      revert_details: revertDetails,
      ...formatted,
    };
  },

  /**
   * Arogya Sevak / Admin: Upload or fulfill a requested document
   */
  async uploadSevakDocument(applicationId, userId, { docTitle, fileName, fileUrl, category, note, reqDocId } = {}) {
    const app = await ApplicationModel.findById(applicationId);
    if (!app) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, `Application '${applicationId}' not found.`);
    }

    const resolvedTitle = docTitle || fileName || 'Clinical Document';
    const resolvedFileName = fileName || `${resolvedTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}_sevak.pdf`;
    const resolvedUrl = fileUrl || '';

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

    let savedDoc;
    if (existingDoc) {
      savedDoc = await ApplicationDocumentModel.update(existingDoc.id, {
        file_url: resolvedUrl,
        file_name: resolvedTitle,
        category: category || existingDoc.category || 'Clinical Record',
        document_status: 'UPLOADED',
        is_sevak_upload: true,
        uploaded_by_role: 'AROGYA_SEVAK',
        verification_remark: note || 'Uploaded by Arogya Sevak — Ready for Verification',
        uploaded_by_user_id: userId || null,
      });
    } else {
      savedDoc = await ApplicationDocumentModel.create({
        application_id: app.id,
        file_url: resolvedUrl,
        file_name: resolvedTitle,
        category: category || 'Clinical Record',
        file_size: '1.4 MB',
        source: 'ArogyaSevak Upload',
        document_status: 'UPLOADED',
        is_sevak_upload: true,
        uploaded_by_role: 'AROGYA_SEVAK',
        verification_remark: note || 'Uploaded by Arogya Sevak — Ready for Verification',
        uploaded_by_user_id: userId || null,
      });
    }

    // Notify Admin desk that ArogyaSevak uploaded the document
    try {
      await NotificationModel.create({
        recipient_type: 'ADMIN',
        title: `🏥 ArogyaSevak Uploaded Document: "${resolvedTitle}"`,
        message: `ArogyaSevak uploaded clinical record "${resolvedTitle}" for Case ${app.application_number || app.id}. Ready for admin review & verification.`,
        type: 'STATUS_CHANGE',
        priority: 'HIGH',
        application_id: app.id,
        case_id: app.application_number || app.id,
      });
    } catch (notifErr) {
      console.warn('[application.service] notify admin sevak upload error:', notifErr.message);
    }

    const refreshed = await ApplicationModel.findById(app.id);
    return formatApplicationResponse(refreshed);
  },

  /**
   * Admin: Verify or reject an uploaded document
   */
  async verifyDocument(docId, adminUserId, { status = 'VERIFIED', remark = null }) {
    const doc = await ApplicationDocumentModel.findById(docId);
    if (!doc) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, `Document '${docId}' not found.`);
    }

    if (doc.application_id) {
      const app = await ApplicationModel.findById(doc.application_id);
      if (app) {
        await this.checkReviewerLock(app, adminUserId);
      }
    }

    const updated = await ApplicationDocumentModel.updateVerificationStatus(doc.id, {
      document_status: status.toUpperCase(),
      verification_remark: remark || (status.toUpperCase() === 'VERIFIED' ? 'Verified by Admin ✓' : 'Rejected document'),
      verified_by_user_id: adminUserId,
    });

    // When verified, check if all uploaded documents for the application are now verified
    if (doc.application_id && status.toUpperCase() === 'VERIFIED') {
      try {
        const app = await ApplicationModel.findById(doc.application_id);
        if (app) {
          // Notify single doc verified
          notificationService.notifyDocVerified(app, doc, adminUserId).catch(() => { });

          const allDocs = await ApplicationDocumentModel.findByApplicationId(doc.application_id);
          const allVerified = Array.isArray(allDocs) && allDocs.length > 0 && allDocs.every(d => d.document_status === 'VERIFIED' || d.id === doc.id);
          if (allVerified) {
            if (['SUBMITTED', 'UNDER_REVIEW', 'PENDING_REVIEW', 'DOCS_REQUIRED', 'REVERTED'].includes(app.current_status?.toUpperCase())) {
              await ApplicationModel.updateStatus(app.id, 'DOCS_VERIFIED', {
                remarks: 'All documents verified by Admin ✓'
              });
              await ApplicationStatusHistoryModel.create({
                application_id: app.id,
                old_status: app.current_status,
                new_status: 'DOCS_VERIFIED',
                remark: 'All documents verified by Admin ✓',
                changed_by_user_id: adminUserId,
              });

              // Notify all docs verified
              notificationService.notifyStatusUpdated(app, 'DOCS_VERIFIED', {}, adminUserId).catch(() => { });
            }
          }
        }
      } catch (checkErr) {
        console.warn('[application.service] Auto DOCS_VERIFIED status update check error:', checkErr.message);
      }
    }

    return {
      success: true,
      documentId: updated.id,
      documentStatus: updated.document_status,
      remark: updated.verification_remark,
    };
  },

  /**
   * Admin: Assign hospital and/or Arogya Sevak to the case
   */
  async assignCase(applicationId, adminUserId, payload = {}) {
    const app = await ApplicationModel.findById(applicationId);
    if (!app) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, `Application '${applicationId}' not found.`);
    }

    await this.checkReviewerLock(app, adminUserId);

    // Resolve scheme
    let assignedSchemeId = payload.scheme_id || payload.schemeId || null;
    let assignedSchemeName = payload.scheme || payload.scheme_name || payload.schemeName || null;
    if (!assignedSchemeId && !assignedSchemeName && app.suggested_scheme_name) {
      assignedSchemeId = app.suggested_scheme_id;
      assignedSchemeName = app.suggested_scheme_name;
    }

    // Resolve hospital_id (by UUID, code, or name)
    let resolvedHospitalId = payload.hospital_id || payload.hospitalId || null;
    const rawHospName = payload.hospital_name || payload.hospitalName || payload.hospital || null;

    if (resolvedHospitalId) {
      const hosp = await HospitalModel.findById(resolvedHospitalId);
      if (hosp) {
        resolvedHospitalId = hosp.id;
      } else {
        const matchingHosp = await HospitalModel.findAll({ search: resolvedHospitalId });
        if (matchingHosp && matchingHosp.length > 0) {
          resolvedHospitalId = matchingHosp[0].id;
        }
      }
    }
    if (!resolvedHospitalId && rawHospName) {
      const cleanHospSearch = rawHospName.includes(',') ? rawHospName.split(',')[0].trim() : rawHospName.trim();
      let matchingHosp = await HospitalModel.findAll({ search: cleanHospSearch });
      if (!matchingHosp || matchingHosp.length === 0) {
        matchingHosp = await HospitalModel.findAll({ search: rawHospName });
      }
      if (matchingHosp && matchingHosp.length > 0) {
        resolvedHospitalId = matchingHosp[0].id;
      } else {
        const anyH = await HospitalModel.findAll({ limit: 1 });
        if (anyH && anyH.length > 0) {
          resolvedHospitalId = anyH[0].id;
        }
      }
    }

    // Resolve arogya_sevak_id (by UUID, user_id, or name)
    let resolvedSevakId = payload.arogya_sevak_id || payload.sevak_id || payload.sevakId || null;
    const rawSevakName = payload.sevak_name || payload.sevakName || payload.sevak || null;

    if (resolvedSevakId) {
      const sevakRecord = await ArogyaSevakModel.findById(resolvedSevakId);
      if (sevakRecord) {
        resolvedSevakId = sevakRecord.id;
      } else {
        const byUser = await ArogyaSevakModel.findByUserId(resolvedSevakId);
        if (byUser) {
          resolvedSevakId = byUser.id;
        }
      }
    }
    if (!resolvedSevakId && rawSevakName) {
      const cleanName = rawSevakName.includes('—') ? rawSevakName.split('—')[0].trim() : (rawSevakName.includes('(') ? rawSevakName.split('(')[0].trim() : rawSevakName.trim());
      let byName = await ArogyaSevakModel.findByNameOrCode(cleanName);
      if (!byName && cleanName.includes(' ')) {
        byName = await ArogyaSevakModel.findByNameOrCode(cleanName.split(' ')[0]);
      }
      if (byName) {
        resolvedSevakId = byName.id;
      } else {
        resolvedSevakId = null;
      }
    }

    // Resolve admin record ID
    let adminRecordId = null;
    if (adminUserId) {
      const admin = await AdminModel.findByUserId(adminUserId);
      adminRecordId = admin?.id || null;
    }

    const remarkText = payload.remark || payload.assignmentNotes || 'Assigned to coordinator';

    const hosp = resolvedHospitalId ? await HospitalModel.findById(resolvedHospitalId) : null;
    const hospName = hosp?.name || rawHospName || app.hospital_name || 'Assigned Hospital';

    let sevakRecord = null;
    if (resolvedSevakId) {
      try {
        sevakRecord = await ArogyaSevakModel.findById(resolvedSevakId);
      } catch (_) { }
    }
    const finalSevakName = (rawSevakName && !rawSevakName.includes('Unassigned')) ? (rawSevakName.includes('—') ? rawSevakName.split('—')[0].trim() : rawSevakName.trim()) : (sevakRecord?.name || 'आरोग्य मित्र');
    const finalSevakPhone = payload.sevak_phone || payload.sevakPhone || sevakRecord?.mobile || sevakRecord?.contact || '9823012345';
    const finalAdmissionDate = payload.admissionDate || payload.admission_date || payload.visitDate || payload.visit_date || null;

    let assignment = null;
    try {
      assignment = await ApplicationAssignmentModel.create({
        application_id: app.id,
        assigned_by_admin_id: adminRecordId,
        hospital_id: resolvedHospitalId || null,
        hospital_name: hospName,
        arogya_sevak_id: resolvedSevakId || null,
        sevak_name: finalSevakName,
        scheme_id: assignedSchemeId,
        scheme_name: assignedSchemeName,
        admission_date: finalAdmissionDate,
        assignment_status: 'ASSIGNED',
        assignment_remark: remarkText,
      });
    } catch (createErr) {
      console.warn('[application.service] ApplicationAssignmentModel.create notice:', createErr.message);
    }

    // Update hospital, scheme and transition status to COORDINATED on application record
    await ApplicationModel.updateStatus(app.id, 'COORDINATED', {
      assigned_scheme_id: assignedSchemeId || app.assigned_scheme_id || app.suggested_scheme_id,
      assigned_scheme_name: assignedSchemeName || app.assigned_scheme_name || app.suggested_scheme_name,
      hospital_id: resolvedHospitalId || app.hospital_id,
      hospital_name: hospName,
      remarks: remarkText,
    });

    await ApplicationStatusHistoryModel.create({
      application_id: app.id,
      old_status: app.current_status,
      new_status: 'COORDINATED',
      remark: `Coordinated: Assigned to ${hospName} (${finalSevakName})`,
      changed_by_user_id: adminUserId,
    });

    // Auto-resolve any active/on-hold escalation for this application
    try {
      await dbQuery(
        `UPDATE public.case_escalations
         SET status = 'RESOLVED',
             resolution = $1,
             resolved_by_admin_id = $2,
             resolved_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE (application_id = $3 OR application_id = $4)
           AND (status != 'RESOLVED' OR status IS NULL);`,
        [
          `Specialty / Resource transfer completed: Reassigned to ${hospName} (${finalSevakName}). ${remarkText}`,
          adminRecordId,
          app.id,
          app.application_number || app.id
        ]
      );
    } catch (escResErr) {
      console.warn('[application.service] Auto-resolve escalation warning:', escResErr.message);
    }

    // Trigger notification to Citizen and Arogya Sevak about case assignment
    try {
      await notificationService.notifySevakAssigned(
        app,
        {
          sevak_id: resolvedSevakId || sevakRecord?.id,
          sevak_user_id: sevakRecord?.user_id,
          sevak_name: finalSevakName,
          sevak_phone: finalSevakPhone,
          hospital_id: resolvedHospitalId,
          hospital_name: hospName,
          admission_date: finalAdmissionDate,
          visit_date: finalAdmissionDate,
          scheme_id: assignedSchemeId,
          scheme_name: assignedSchemeName || app.assigned_scheme_name,
          patient_name: app.patient_name || app.beneficiary_name || 'रुग्ण',
        },
        adminUserId
      );
    } catch (notifErr) {
      console.warn('[application.service] notifySevakAssigned warning:', notifErr.message);
    }

    const refreshed = await ApplicationModel.findById(app.id);
    return {
      assignment,
      application: formatApplicationResponse(refreshed),
    };
  },

  /**
   * Arogya Sevak: Get all applications assigned to this Sevak
   */
  async getSevakAssignedApplications(sevakUserIdOrId, queryParams = {}) {
    let sevakId = sevakUserIdOrId || queryParams.sevakId || queryParams.sevak_id || null;
    let sevakName = queryParams.sevakName || queryParams.sevak_name || null;
    let sevakRecord = null;
    let userRecord = null;

    try {
      if (sevakId) {
        sevakRecord = await ArogyaSevakModel.findByUserId(sevakId);
        if (!sevakRecord) {
          sevakRecord = await ArogyaSevakModel.findById(sevakId);
        }
        if (!sevakRecord) {
          sevakRecord = await ArogyaSevakModel.findByNameOrCode(sevakId);
        }
      }
    } catch (_) { }

    const sevakUuid = sevakRecord?.id || null;
    const sevakUserId = sevakRecord?.user_id || (typeof sevakUserIdOrId === 'string' ? sevakUserIdOrId : null);

    try {
      if (sevakUserId) {
        const uRes = await dbQuery('SELECT full_name, name, mobile FROM public.users WHERE id = $1;', [sevakUserId]);
        userRecord = uRes.rows[0] || null;
      }
    } catch (_) { }

    // Check if the current user is an active Backup / Temporary Relief Sevak
    let backupAssignment = null;
    let primarySevakProfile = null;
    try {
      if (userRecord?.mobile) {
        backupAssignment = await BackupSevakAssignmentModel.getActiveByMobile(userRecord.mobile);
      }
      if (!backupAssignment && sevakUserId) {
        backupAssignment = await BackupSevakAssignmentModel.getActiveByMobile(sevakUserId);
      }
      if (backupAssignment && backupAssignment.primary_sevak_id) {
        const pId = backupAssignment.primary_sevak_id;
        primarySevakProfile = await ArogyaSevakModel.findById(pId)
          || await ArogyaSevakModel.findByUserId(pId)
          || await ArogyaSevakModel.findByNameOrCode(pId);
      }
    } catch (bErr) {
      console.warn('[application.service] Backup sevak lookup notice:', bErr.message);
    }

    const primaryUuid = primarySevakProfile?.id || null;
    const primaryUserId = primarySevakProfile?.user_id || null;
    const primaryName = primarySevakProfile?.full_name || primarySevakProfile?.name || backupAssignment?.primary_sevak_id || null;

    const candidateIds = [sevakUuid, sevakUserId, sevakUserIdOrId, primaryUuid, primaryUserId].filter(
      (id) => id && typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    );
    const appIdsSet = new Set();

    // 1. Resolve active assigned hospitals (including primary sevak's hospitals)
    let hospIds = [];
    let hospNames = [];
    try {
      const { adminService } = await import('./admin.service.js');
      const targetLookupIds = [sevakUuid || sevakUserId, primaryUuid || primaryUserId].filter(Boolean);
      for (const tId of targetLookupIds) {
        const assignedHosps = await adminService.getSevakAssignedHospitals(tId);
        if (assignedHosps?.active_hospitals?.length > 0) {
          assignedHosps.active_hospitals.forEach((h) => {
            const hId = h.hospital_id || h.id;
            const hName = h.hospital_name || h.name;
            if (hId && !hospIds.includes(hId)) hospIds.push(hId);
            if (hName && !hospNames.includes(hName)) hospNames.push(hName);
          });
        }
      }
    } catch (_) { }

    if (backupAssignment?.hospital_id && !hospNames.includes(backupAssignment.hospital_id)) {
      hospNames.push(backupAssignment.hospital_id);
    }

    // Fallback: check hospital_sevak_assignments table directly
    if (candidateIds.length > 0) {
      try {
        const hsaRes = await dbQuery(
          `SELECT hsa.hospital_id, h.name AS hospital_name 
           FROM public.hospital_sevak_assignments hsa
           LEFT JOIN public.hospitals h ON hsa.hospital_id = h.id
           WHERE hsa.sevak_id = ANY($1::uuid[]) AND (hsa.status = 'ACTIVE' OR hsa.status IS NULL);`,
          [candidateIds]
        );
        hsaRes.rows.forEach((r) => {
          if (r.hospital_id && !hospIds.includes(r.hospital_id)) hospIds.push(r.hospital_id);
          if (r.hospital_name && !hospNames.includes(r.hospital_name)) hospNames.push(r.hospital_name);
        });
      } catch (hsaErr) {
        console.warn('[application.service] hospital_sevak_assignments fallback notice:', hsaErr.message);
      }
    }

    const cleanSevakName = sevakName
      ? (sevakName.includes('—') ? sevakName.split('—')[0].trim() : (sevakName.includes('(') ? sevakName.split('(')[0].trim() : sevakName.trim()))
      : '';

    // 2. Comprehensive Unified SQL Query matching LATEST active assignment, current hospital, and past transferred-out assignments
    try {
      const matchedAppRows = await dbQuery(
        `SELECT DISTINCT a.id 
         FROM public.applications a
         LEFT JOIN (
           SELECT DISTINCT ON (application_id) 
             application_id, 
             arogya_sevak_id, 
             sevak_name, 
             hospital_id, 
             hospital_name, 
             assignment_status,
             assigned_at
           FROM public.application_assignments
           ORDER BY application_id, assigned_at DESC
         ) latest_aa ON a.id = latest_aa.application_id
         LEFT JOIN public.case_escalations ce ON a.id = ce.application_id
         LEFT JOIN public.application_assignments all_aa ON a.id = all_aa.application_id
         WHERE 
           -- Current Sevak ID in latest active assignment
           ($1::uuid[] IS NOT NULL AND array_length($1::uuid[], 1) > 0 AND (
             latest_aa.arogya_sevak_id = ANY($1::uuid[])
           ))

           -- OR Current Sevak Name in latest active assignment
           OR ($2 <> '' AND (
             LOWER(latest_aa.sevak_name) ILIKE $3
           ))

           -- OR Current Assigned Hospital ID
           OR ($4::uuid[] IS NOT NULL AND array_length($4::uuid[], 1) > 0 AND (
             a.hospital_id = ANY($4::uuid[])
             OR latest_aa.hospital_id = ANY($4::uuid[])
           ))

           -- OR Current Assigned Hospital Name
           OR ($5::text[] IS NOT NULL AND array_length($5::text[], 1) > 0 AND (
             LOWER(a.hospital_name) = ANY(SELECT LOWER(unnest($5::text[])))
             OR LOWER(latest_aa.hospital_name) = ANY(SELECT LOWER(unnest($5::text[])))
           ))

           -- OR Transferred out cases (Sevak previously assigned or escalated case)
           OR ($1::uuid[] IS NOT NULL AND array_length($1::uuid[], 1) > 0 AND (
             all_aa.arogya_sevak_id = ANY($1::uuid[])
             OR ce.raised_by_arogya_sevak_id = ANY($1::uuid[])
           ))

           -- OR Previous assignment had Sevak Name
           OR ($2 <> '' AND (
             LOWER(all_aa.sevak_name) ILIKE $3
           ));`,
        [
          candidateIds.length > 0 ? candidateIds : null,
          cleanSevakName,
          cleanSevakName ? `%${cleanSevakName}%` : '',
          hospIds.length > 0 ? hospIds : null,
          hospNames.length > 0 ? hospNames : null
        ]
      );

      matchedAppRows.rows.forEach((r) => {
        if (r.id) appIdsSet.add(r.id);
      });
    } catch (queryErr) {
      console.warn('[application.service] unified application matching query notice:', queryErr.message);
    }

    const sevakContext = {
      id: sevakUuid || sevakId,
      userId: sevakUserId,
      name: sevakName,
    };

    const uniqueAppIds = Array.from(appIdsSet);
    if (uniqueAppIds.length === 0) {
      return [];
    }

    // 4. Batch fetch all applications in a single SQL query
    const apps = await ApplicationModel.findManyByIds(uniqueAppIds);
    return apps.map((app) => formatApplicationResponse(app, sevakContext));
  },

  /**
   * Admin: Add case note / remark
   */
  async addRemark(applicationId, adminUserId, { remark, remark_type = 'ADMIN_NOTE' }) {
    const app = await ApplicationModel.findById(applicationId);
    if (!app) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, `Application '${applicationId}' not found.`);
    }

    const rec = await ApplicationRemarkModel.create({
      application_id: app.id,
      created_by_user_id: adminUserId,
      remark_type,
      remark,
    });

    // Update latest remarks on the application record
    try {
      await ApplicationModel.updateStatus(app.id, app.current_status || 'APPROVED', {
        remarks: remark,
      });
    } catch (upErr) {
      console.warn('[application.service] update remarks notice:', upErr.message);
    }

    // Insert timeline event
    try {
      await ApplicationStatusHistoryModel.create({
        application_id: app.id,
        old_status: app.current_status,
        new_status: app.current_status,
        remark: `Admin Note: ${remark}`,
        changed_by_user_id: adminUserId,
      });
    } catch (_) { }

    // Dispatch notification to the assigned Arogya Sevak
    try {
      const assignment = await ApplicationAssignmentModel.findByApplicationId(app.id);
      const sevakId = assignment?.arogya_sevak_id || app.assigned_sevak_id || null;

      await notificationService.sendDirectNotification(
        {
          target_audience: 'SEVAK',
          sevak_id: sevakId,
          application_id: app.id,
          case_id: app.application_number || app.id,
          title: `📌 New Directive from District Admin — Case ${app.application_number || app.id}`,
          title_en: `📌 New Directive from District Admin — Case ${app.application_number || app.id}`,
          title_hi: `📌 जिल्हा प्रशासनाकडून नवीन सूचना — अर्ज ${app.application_number || app.id}`,
          message: `Admin Note: "${remark}" for patient ${app.patient_name || 'Patient'}. Please review and act accordingly.`,
          message_en: `Admin Note: "${remark}" for patient ${app.patient_name || 'Patient'}. Please review and act accordingly.`,
          message_hi: `प्रशासकीय सूचना: "${remark}". कृपया तपासून आवश्यक कारवाई करा.`,
          priority: 'HIGH',
          type: 'ADMIN_DIRECTIVE',
        },
        adminUserId
      );
    } catch (notifErr) {
      console.warn('[application.service] addRemark Sevak notification notice:', notifErr.message);
    }

    return rec;
  },

  /**
   * Citizen request to reopen a rejected application within the 60-day eligibility window
   * NOTE: Does NOT reopen the case immediately. Case remains REJECTED until Admin approves reopening.
   */
  async requestCaseReopen(applicationId, userContext, reason = '') {
    const app = await ApplicationModel.findById(applicationId);
    if (!app) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, `Application '${applicationId}' not found.`);
    }

    const upperStatus = String(app.current_status || '').toUpperCase();
    if (upperStatus !== 'REJECTED') {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, `Only rejected applications can request reopening. Current status: ${app.current_status}`);
    }

    // Check 60-day window
    const closedDate = app.closed_at || app.reviewed_at || app.updated_at || app.created_at;
    const closedTimestamp = closedDate ? new Date(closedDate).getTime() : Date.now();
    const daysElapsed = Math.floor((Date.now() - closedTimestamp) / (1000 * 60 * 60 * 24));

    if (daysElapsed >= 60) {
      // Mark as ARCHIVED permanently
      await ApplicationModel.updateStatus(app.id, 'ARCHIVED', {
        remarks: '60-day reopen window expired. Application permanently archived / ६० दिवसांची मुदत संपल्यामुळे अर्ज दफ्तरबंद करण्यात आला आहे.',
      });
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'The 60-day reopening window has expired. This application has been archived. Please submit a fresh application / ६० दिवसांची मुदत संपली आहे.');
    }

    const requestReason = reason?.trim() || 'नागरिकाने ६० दिवसांच्या मुदतीत अर्ज फेरविचार करण्याची विनंती केली आहे.';

    // Set reopen_requested to true without changing status
    const updated = await ApplicationModel.requestReopen(app.id, requestReason);

    // Record audit history
    await ApplicationStatusHistoryModel.create({
      application_id: app.id,
      old_status: 'REJECTED',
      new_status: 'REJECTED',
      remark: `[REOPEN REQUESTED BY CITIZEN] ${requestReason}`,
      changed_by_user_id: userContext?.id || userContext?.userId || null,
    });

    // Notify Admin Desk in Admin Inbox
    try {
      const caseNumber = app.application_number || app.id;
      await NotificationModel.create({
        recipient_type: 'ADMIN',
        application_id: app.id,
        case_id: caseNumber,
        mobile: app.contact_mobile,
        type: 'REOPEN_REQUEST',
        priority: 'HIGH',
        title: 'अर्जाचा फेरविचार विनंती प्राप्त झाली 🔄',
        title_en: `Reopen Request: Application ${caseNumber}`,
        title_hi: `आवेदन ${caseNumber} पुनर्विचार अनुरोध प्राप्त`,
        message: `नागरिकाने अर्ज (${caseNumber}) साठी फेरविचार करण्याची विनंती केली आहे. कारण: ${requestReason}`,
        message_en: `Citizen has requested reopening for application ${caseNumber}. Reason: ${requestReason}`,
        message_hi: `नागरिक ने आवेदन ${caseNumber} के पुनर्विचार का अनुरोध किया है। कारण: ${requestReason}`,
        badge: 'फेरविचार विनंती',
        badge_en: 'Reopen Request',
        badge_hi: 'पुनर्विचार अनुरोध',
        sender: 'Citizen Portal / नागरिक',
        action_type: 'REOPEN_REQUEST',
      });
    } catch (notifErr) {
      console.warn('[application.service] reopen request admin notify warning:', notifErr.message);
    }

    return formatApplicationResponse(updated || app);
  },

  /**
   * Reopen a rejected application within the 60-day eligibility window (ADMIN ONLY)
   */
  async reopenApplication(applicationId, userContext, reason = '') {
    const app = await ApplicationModel.findById(applicationId);
    if (!app) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, `Application '${applicationId}' not found.`);
    }

    const upperStatus = String(app.current_status || '').toUpperCase();
    if (upperStatus !== 'REJECTED') {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, `Only rejected applications can be reopened. Current status: ${app.current_status}`);
    }

    // Check 60-day window
    const closedDate = app.closed_at || app.reviewed_at || app.updated_at || app.created_at;
    const closedTimestamp = closedDate ? new Date(closedDate).getTime() : Date.now();
    const daysElapsed = Math.floor((Date.now() - closedTimestamp) / (1000 * 60 * 60 * 24));

    if (daysElapsed >= 60) {
      // Mark as ARCHIVED permanently
      await ApplicationModel.updateStatus(app.id, 'ARCHIVED', {
        remarks: '60-day reopen window expired. Application permanently archived / ६० दिवसांची मुदत संपल्यामुळे अर्ज दफ्तरबंद करण्यात आला आहे.',
      });
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'The 60-day reopening window has expired. This application has been archived. Please submit a fresh application / ६० दिवसांची मुदत संपली आहे.');
    }

    const reopenRemark = reason?.trim() || 'Application reopened by Admin within 60-day window for review / प्रशासनाने ६० दिवसांच्या मुदतीत अर्ज फेरविचारासाठी पुन्हा उघडला.';

    // Reopen and restore to UNDER_REVIEW
    const updated = await ApplicationModel.reopenRejectedApplication(app.id, reopenRemark);

    // Record audit history
    await ApplicationStatusHistoryModel.create({
      application_id: app.id,
      old_status: 'REJECTED',
      new_status: 'UNDER_REVIEW',
      remark: `[REOPENED BY ADMIN] ${reopenRemark}`,
      changed_by_user_id: userContext?.id || userContext?.userId || null,
    });

    // Notify citizen
    try {
      await notificationService.notifyStatusUpdated(
        app,
        'REOPENED',
        { remarks: reopenRemark },
        userContext?.id
      );
    } catch (notifErr) {
      console.warn('[application.service] reopen notify warning:', notifErr.message);
    }

    return formatApplicationResponse(updated || app);
  },

  /**
   * Update Treatment Progress and live ward status for an assigned application
   */
  async updateTreatmentProgress(id, userContext, payload) {
    const app = await ApplicationModel.findById(id);
    if (!app) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, `Application with ID '${id}' not found`);
    }

    let sevakName = userContext?.name || userContext?.full_name || userContext?.username || 'ArogyaSevak';
    const actorId = userContext?.id || userContext?.userId || null;

    // Check if acting user is a Temporary / Relief Arogya Sevak
    if (userContext?.isBackup || userContext?.is_backup) {
      const covering = userContext?.coveringFor || userContext?.primarySevakName || 'Primary Sevak';
      sevakName = `${sevakName} (Temp Sevak for ${covering})`;
    } else if (userContext?.mobile) {
      try {
        const bRec = await BackupSevakAssignmentModel.getActiveByMobile(userContext.mobile);
        if (bRec && bRec.is_active) {
          sevakName = `${sevakName} (Temp Sevak)`;
        }
      } catch (_) {}
    }

    const updated = await ApplicationModel.updateTreatmentProgress(app.id, {
      stage: payload.stage,
      note: payload.note,
      caseProgress: payload.caseProgress,
      status: payload.status,
      sevakName,
      actorId,
    });

    return formatApplicationResponse(updated || app);
  },

  /**
   * Admin claims a case for review
   */
  async claimApplication(id, userContext, payload = {}) {
    const app = await ApplicationModel.findById(id);
    if (!app) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, `Application with ID '${id}' not found`);
    }

    const adminUserId = userContext?.id || userContext?.userId || null;
    let adminRecord = null;
    if (adminUserId) {
      try {
        adminRecord = await AdminModel.findByUserId(adminUserId);
      } catch (_) { }
    }

    let reviewerName = adminRecord?.full_name || userContext?.full_name || userContext?.name || payload.reviewer_name || payload.adminName || 'Admin';
    if (reviewerName === 'Super Administrator' || reviewerName === 'System Administrator') {
      if (adminRecord?.full_name) reviewerName = adminRecord.full_name;
    }
    const reviewerId = adminRecord?.id || adminUserId || null;
    const claimedAt = new Date();

    const updated = await ApplicationModel.updateReviewer(app.id, {
      reviewed_by_admin_id: reviewerId,
      reviewed_by_admin_name: reviewerName,
      claimed_at: claimedAt,
    });

    try {
      await ApplicationStatusHistoryModel.create({
        application_id: app.id,
        old_status: app.current_status,
        new_status: app.current_status,
        remark: `Case claimed for review by ${reviewerName}`,
        changed_by_user_id: adminUserId,
      });
    } catch (_) { }

    return formatApplicationResponse(updated || app);
  },

  /**
   * Admin unclaims / releases a case from review
   */
  async unclaimApplication(id, userContext) {
    const app = await ApplicationModel.findById(id);
    if (!app) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, `Application with ID '${id}' not found`);
    }

    const previousReviewer = app.reviewed_by_admin_name || 'Admin';
    const adminUserId = userContext?.id || userContext?.userId || null;

    const updated = await ApplicationModel.updateReviewer(app.id, {
      reviewed_by_admin_id: null,
      reviewed_by_admin_name: null,
      claimed_at: null,
    });

    try {
      await ApplicationStatusHistoryModel.create({
        application_id: app.id,
        old_status: app.current_status,
        new_status: app.current_status,
        remark: `Case review claim released by ${previousReviewer}`,
        changed_by_user_id: adminUserId,
      });
    } catch (_) { }

    return formatApplicationResponse(updated || app);
  },

  /**
   * Assign a case to a specific Admin reviewer
   */
  async assignReviewer(id, userContext, payload = {}) {
    const app = await ApplicationModel.findById(id);
    if (!app) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, `Application with ID '${id}' not found`);
    }

    const targetAdminId = payload.reviewer_id || payload.adminId || null;
    const targetAdminName = payload.reviewer_name || payload.adminName || 'Admin';
    const adminUserId = userContext?.id || userContext?.userId || null;
    const claimedAt = new Date();

    const updated = await ApplicationModel.updateReviewer(app.id, {
      reviewed_by_admin_id: targetAdminId,
      reviewed_by_admin_name: targetAdminName,
      claimed_at: claimedAt,
    });

    try {
      await ApplicationStatusHistoryModel.create({
        application_id: app.id,
        old_status: app.current_status,
        new_status: app.current_status,
        remark: `Assigned reviewer: ${targetAdminName}`,
        changed_by_user_id: adminUserId,
      });
    } catch (_) { }

    return formatApplicationResponse(updated || app);
  },
};

export default applicationService;
