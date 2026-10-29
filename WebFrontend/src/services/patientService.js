import api from './api';

const getStorageKey = () => {
  try {
    const userStr = localStorage.getItem('ward_arogya_user');
    if (userStr) {
      const u = JSON.parse(userStr);
      const uid = u?.id || u?.user_id || u?.mobile;
      if (uid) return `arogyamitra_patients_data_${uid}`;
    }
  } catch (_) {}
  return 'arogyamitra_patients_data';
};

let _cachedPatients = null;
let _cacheTimestamp = 0;
let _inFlightPatientsPromise = null;
const CACHE_TTL_MS = 30000; // 30s TTL with SWR caching

export const invalidatePatientsCache = () => {
  _cachedPatients = null;
  _cacheTimestamp = 0;
  _inFlightPatientsPromise = null;
};

export const clearPatientsCache = () => {
  _cachedPatients = null;
  _cacheTimestamp = 0;
  _inFlightPatientsPromise = null;
  try {
    const key = getStorageKey();
    localStorage.removeItem(key);
    localStorage.removeItem('arogyamitra_patients_data');
  } catch (_) {}
};

const INITIAL_PATIENTS = [];

function getStoredPatients() {
  const key = getStorageKey();
  const data = localStorage.getItem(key);
  let list = null;
  if (data) {
    try {
      list = JSON.parse(data);
    } catch {
      // Fallback
    }
  }

  if (!list || !Array.isArray(list)) {
    return [];
  }

  // Filter out any legacy mock static cases (e.g. AM-2026-00124, AM-2026-00132, etc.)
  const mockIds = new Set(['am-2026-00124', 'am-2026-00132', 'am-2026-00141', 'am-2026-00147', 'am-2026-00151']);
  const filtered = list
    .filter((p) => p && p.id && !mockIds.has(String(p.id).toLowerCase()))
    .map((p) => normalizeApiApplication(p, p));

  return filtered;
}

function getSevakAuthorName() {
  try {
    const userStr = localStorage.getItem('ward_arogya_user');
    if (userStr) {
      const u = JSON.parse(userStr);
      const name = u?.name || u?.full_name || 'Relief Sevak';
      if (u?.isBackup || u?.is_backup) {
        const covering = u.coveringFor || u.primarySevakName || 'Primary Sevak';
        return `${name} (Temp Sevak for ${covering})`;
      }
      if (u?.name) return `${u.name} (ArogyaSevak)`;
    }
  } catch (_) {}
  return 'ArogyaSevak';
}

function saveStoredPatients(list) {
  _cachedPatients = list;
  _cacheTimestamp = Date.now();
  try {
    const key = getStorageKey();
    localStorage.setItem(key, JSON.stringify(list));
  } catch (_) {}
}

export const CLINICAL_TREATMENT_STAGES_LIST = [
  'Admitted',
  'Diagnostic Stage',
  'Under Treatment',
  'Surgery Scheduled',
  'Post-Op Recovery',
  'On Hold',
  'Discharged',
  'Completed',
];

export const OPD_TREATMENT_STAGES_LIST = [
  'Scheduled',
  'Visited',
  'Follow-up Scheduled',
  'Closure Requested',
  'Closed',
];

export const getStageStatusMapping = (stageLabel, isOpd = false) => {
  const label = (stageLabel || '').toLowerCase();
  
  if (label.includes('transferred')) {
    return {
      status: 'Transferred',
      statusVariant: 'transferred',
      category: 'transferred',
      actionType: 'view',
    };
  } else if (label.includes('closed') || label.includes('completed')) {
    return {
      status: isOpd ? 'Closed' : (label.includes('discharged') ? 'Discharged' : 'Completed'),
      statusVariant: 'success',
      category: 'discharged',
      actionType: 'view',
    };
  } else if (label.includes('closure requested') || label.includes('closure_requested')) {
    return {
      status: 'Closure Requested',
      statusVariant: 'warning',
      category: 'ongoing',
      actionType: 'update',
    };
  } else if (label.includes('not visited') || label.includes('no show')) {
    return {
      status: 'Not Visited',
      statusVariant: 'warning',
      category: 'ongoing',
      actionType: 'update',
    };
  } else if (label.includes('follow-up') || label.includes('followup')) {
    return {
      status: 'Follow-up Scheduled',
      statusVariant: 'opd',
      category: 'ongoing',
      actionType: 'update',
    };
  } else if (label.includes('visited')) {
    return {
      status: 'Visited',
      statusVariant: 'treatment',
      category: 'ongoing',
      actionType: 'update',
    };
  } else if (label.includes('scheduled')) {
    return {
      status: 'Scheduled',
      statusVariant: 'opd',
      category: 'ongoing',
      actionType: 'update',
    };
  } else if (label.includes('discharged')) {
    return {
      status: 'Discharged',
      statusVariant: 'discharged',
      category: 'discharged',
      actionType: 'view',
    };
  } else if (label.includes('on hold') || label.includes('hold')) {
    return {
      status: 'On Hold',
      statusVariant: 'warning',
      category: 'ongoing',
      actionType: 'update',
    };
  } else if (label.includes('surgery') || label.includes('post-op')) {
    return {
      status: stageLabel || 'Surgery Scheduled',
      statusVariant: 'surgery',
      category: 'surgery',
      actionType: 'update',
    };
  } else if (label.includes('diagnostic') || label.includes('diagnosis') || label.includes('lab')) {
    return {
      status: 'Diagnostic Stage',
      statusVariant: 'opd',
      category: 'ongoing',
      actionType: 'update',
    };
  } else if (label.includes('admitted')) {
    return {
      status: 'Admitted',
      statusVariant: 'treatment',
      category: 'ongoing',
      actionType: 'update',
    };
  } else {
    return {
      status: isOpd ? 'Scheduled' : 'Under Treatment',
      statusVariant: isOpd ? 'opd' : 'treatment',
      category: 'ongoing',
      actionType: 'update',
    };
  }
};

export const buildOpdCaseProgress = ({
  stage = 'Scheduled',
  note = '',
  scheduledDate = 'Today',
  visitedDate = '',
  visitedNote = '',
  followUpRequired = false,
  followUpDate = '',
  followUpNote = '',
  isNotVisited = false,
  notVisitedNote = '',
  closureRequested = false,
  closureNote = '',
  isClosed = false,
  closedDate = '',
}) => {
  const todayStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const sLower = String(stage || '').toLowerCase();

  const isStageClosed = isClosed || sLower === 'closed' || sLower === 'completed';
  const isStageClosureReq = closureRequested || sLower.includes('closure') || sLower.includes('request');
  const isStageFollowUp = followUpRequired || sLower.includes('follow');
  const isStageVisited = !isNotVisited && (sLower.includes('visited') || isStageFollowUp || isStageClosureReq || isStageClosed);
  const isStageNotVisited = isNotVisited || sLower.includes('not visited') || sLower.includes('no show');

  const steps = [];

  // Step 1: Scheduled (Default Completed/Checked)
  steps.push({
    label: 'Scheduled',
    state: 'completed',
    date: scheduledDate || 'Today',
    note: 'OPD Appointment Scheduled',
  });

  // Step 2: Visited or Not Visited
  if (isStageNotVisited && !isStageVisited) {
    steps.push({
      label: 'Not Visited',
      state: isStageClosureReq || isStageClosed ? 'completed' : 'active',
      date: visitedDate || todayStr,
      note: notVisitedNote || note || 'Patient did not visit on scheduled date',
    });
  } else {
    steps.push({
      label: 'Visited',
      state: isStageVisited ? (isStageFollowUp || isStageClosureReq || isStageClosed ? 'completed' : 'active') : 'pending',
      date: isStageVisited ? (visitedDate || todayStr) : '',
      note: isStageVisited ? (visitedNote || note || 'Patient visited OPD & consultation done') : '',
    });
  }

  // Step 3: Follow-up (Conditionally included)
  if (isStageFollowUp || followUpDate) {
    const isFollowUpPassed = isStageClosureReq || isStageClosed;
    steps.push({
      label: 'Follow-up',
      state: isFollowUpPassed ? 'completed' : 'active',
      date: followUpDate || 'Upcoming',
      note: followUpNote || 'Follow-up consultation prescribed',
    });
  }

  // Step 4: Closure Requested
  steps.push({
    label: 'Closure Requested',
    state: isStageClosed ? 'completed' : (isStageClosureReq ? 'active' : 'pending'),
    date: isStageClosureReq || isStageClosed ? todayStr : '',
    note: isStageClosureReq ? (closureNote || note || 'Closure requested by Arogya Sevak') : '',
  });

  // Step 5: Closed (Finalized by Admin)
  steps.push({
    label: 'Closed',
    state: isStageClosed ? 'completed' : 'pending',
    date: isStageClosed ? (closedDate || todayStr) : '',
    note: isStageClosed ? 'Case officially closed by Admin' : '',
  });

  return steps;
};

export const buildCaseProgressForStage = (stageName, note = '', admissionDate = 'Today') => {
  const normalizedStage = String(stageName || 'Admitted').trim();
  const targetIdx = CLINICAL_TREATMENT_STAGES_LIST.findIndex(
    (s) => s.toLowerCase() === normalizedStage.toLowerCase()
  );
  const activeIdx = targetIdx >= 0 ? targetIdx : 0;
  const todayStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  // Exclude admin remarks, transfer remarks, or system instructions from progress bar notes
  const isExcludedNote = (txt) => {
    if (!txt || typeof txt !== 'string') return true;
    const lower = txt.toLowerCase();
    return (
      lower.includes('[critical') ||
      lower.includes('reassigned') ||
      lower.includes('transferred from') ||
      lower.includes('[admin note]') ||
      lower.includes('[escalation') ||
      lower.includes('[decision') ||
      lower.includes('🚨')
    );
  };

  const cleanNote = !isExcludedNote(note) ? note.trim() : '';

  return CLINICAL_TREATMENT_STAGES_LIST.map((label, idx) => {
    if (idx < activeIdx) {
      return {
        label,
        state: 'completed',
        date: idx === 0 ? (admissionDate || 'Today') : todayStr,
        note: idx === 0 ? 'Admitted & vitals recorded' : '',
      };
    } else if (idx === activeIdx) {
      const isFinal = label === 'Discharged' || label === 'Completed';
      const isHold = label === 'On Hold';
      return {
        label,
        state: isFinal ? 'completed' : (isHold ? 'hold' : 'active'),
        date: todayStr,
        note: cleanNote || (idx === 0 ? 'Admitted & vitals recorded' : `Current Status: ${label}`),
      };
    } else {
      return {
        label,
        state: 'pending',
        date: '',
        note: '',
      };
    }
  });
};

/**
 * Normalizes backend application or patient assignment object into the rich UI format
 */
export const normalizeApiApplication = (rawApp, localOverrides = {}) => {
  if (!rawApp) return null;
  const app = (rawApp.data && (rawApp.data.id || rawApp.data.patientName || rawApp.data.patient_name || rawApp.data.applicationNumber))
    ? rawApp.data
    : rawApp;
  const appId = app.id || app.caseId || app.applicationNumber || app.uuid || localOverrides.id || localOverrides.caseId;

  let calculatedAge = app.patient?.age != null ? Number(app.patient.age) : (app.age != null ? Number(app.age) : (app.patient_age != null ? Number(app.patient_age) : null));
  if (calculatedAge === null && app.patient?.dob) {
    try {
      const birthYear = new Date(app.patient.dob).getFullYear();
      if (!isNaN(birthYear)) {
        calculatedAge = new Date().getFullYear() - birthYear;
      }
    } catch (_) {}
  }
  if (!calculatedAge) calculatedAge = localOverrides.age || 32;

  const rawGender = app.patient?.gender || app.gender || app.patient_gender || localOverrides.gender || 'Male';
  const normalizedGender = rawGender.charAt(0).toUpperCase() + rawGender.slice(1).toLowerCase();

  const patientName = app.patientName || app.patient_name || app.patient?.name || app.patient?.fullName || app.patient?.full_name || app.name || localOverrides.patientName || localOverrides.name || 'Assigned Patient';
  const hospitalName = app.assignedHospital || app.hospital || app.hospitalName || app.hospital_name || localOverrides.hospital || 'Unassigned Hospital';
  const schemeName = app.assignedScheme?.name || app.suggestedScheme?.name || app.scheme || (typeof app.assignedScheme === 'string' ? app.assignedScheme : '') || localOverrides.scheme || 'Mahatma Jyotirao Phule Jan Arogya Yojana';

  const rawStatus = (app.status || '').toUpperCase();
  let defaultStatus = 'Admitted';
  let defaultStatusVariant = 'treatment';
  let defaultCategory = 'ongoing';

  if (rawStatus === 'COMPLETED' || rawStatus === 'CLOSED') {
    defaultStatus = 'Completed';
    defaultStatusVariant = 'completed';
    defaultCategory = 'discharged';
  } else if (rawStatus === 'DISCHARGED') {
    defaultStatus = 'Discharged';
    defaultStatusVariant = 'discharged';
    defaultCategory = 'discharged';
  } else if (rawStatus.includes('SURGERY') || app.treatmentType === 'SURGERY') {
    defaultStatus = 'Surgery Scheduled';
    defaultStatusVariant = 'surgery';
    defaultCategory = 'surgery';
  } else if (rawStatus === 'DOCS_REQUIRED' || rawStatus === 'REVERTED' || rawStatus === 'ON_HOLD') {
    defaultStatus = 'On Hold';
    defaultStatusVariant = 'warning';
    defaultCategory = 'ongoing';
  } else if (rawStatus === 'UNDER_TREATMENT' || rawStatus === 'TREATMENT_STARTED' || rawStatus === 'TREATMENT_IN_PROGRESS') {
    defaultStatus = 'Under Treatment';
    defaultStatusVariant = 'treatment';
    defaultCategory = 'ongoing';
  }

  const effectiveStage = app.treatmentStage || app.treatment_stage || app.sevakReportedStatus || app.sevak_reported_status || app.status || 'Admitted';
  const stageMapping = getStageStatusMapping(effectiveStage);

  const defaultProgress = [
    { label: 'Admitted', date: app.submittedDate || 'Today', state: 'active', note: 'Admitted & vitals recorded' },
    { label: 'Diagnostic Stage', date: '', state: 'pending', note: '' },
    { label: 'Under Treatment', date: '', state: 'pending', note: '' },
    { label: 'Surgery Scheduled', date: '', state: defaultCategory === 'surgery' ? 'active' : 'pending', note: '' },
    { label: 'Post-Op Recovery', date: '', state: 'pending', note: '' },
    { label: 'On Hold', date: '', state: 'pending', note: '' },
    { label: 'Discharged', date: defaultCategory === 'discharged' ? 'Today' : '', state: defaultCategory === 'discharged' ? 'completed' : 'pending', note: '' },
    { label: 'Completed', date: defaultStatus === 'Completed' ? 'Today' : '', state: defaultStatus === 'Completed' ? 'completed' : 'pending', note: '' },
  ];

  let adminNotesList = [];
  if (Array.isArray(app.adminNotes)) {
    adminNotesList = [...app.adminNotes];
  } else if (Array.isArray(app.admin_notes)) {
    adminNotesList = [...app.admin_notes];
  } else if (Array.isArray(localOverrides.adminNotes)) {
    adminNotesList = [...localOverrides.adminNotes];
  }

  // Also check app.notes array if present
  if (Array.isArray(app.notes)) {
    app.notes.forEach((n, idx) => {
      const nText = typeof n === 'string' ? n : (n?.text || n?.note || n?.remark);
      if (nText && !adminNotesList.some(an => an.text === nText || an.note === nText)) {
        adminNotesList.push({
          id: `ADMIN-N-${idx + 1}`,
          text: nText.replace(/^\[ADMIN NOTE\]\s*/i, '').trim(),
          by: typeof n === 'object' && n?.by ? n.by : 'Admin (Rohit Patil)',
          date: typeof n === 'object' && n?.date ? n.date : 'Recently',
        });
      }
    });
  }

  let priorityNoteObj = null;
  if (app.priorityNote && typeof app.priorityNote === 'object') {
    priorityNoteObj = app.priorityNote;
  } else if (adminNotesList.length > 0) {
    priorityNoteObj = {
      level: 'HIGH',
      title: 'DIRECT INSTRUCTION FROM DISTRICT ADMIN',
      text: adminNotesList[0].text || adminNotesList[0].note,
      by: adminNotesList[0].by || 'Admin (Rohit Patil)',
      date: adminNotesList[0].date || 'Recently',
    };
  } else if (app.priority === 'CRITICAL' || app.priority === 'HIGH' || app.remarks?.includes('URGENT') || app.remarks?.includes('Priority')) {
    const pLevel = app.priority || 'CRITICAL';
    priorityNoteObj = {
      level: pLevel,
      title: `PRIORITY NOTE FROM ADMIN (${pLevel})`,
      text: app.remarks || app.priorityNote || 'URGENT: Patient requires expedited scheme pre-authorization & coordination.',
    };
  } else if (app.remarks && typeof app.remarks === 'string' && app.remarks.trim()) {
    priorityNoteObj = {
      level: 'HIGH',
      title: 'DIRECT INSTRUCTION FROM DISTRICT ADMIN',
      text: app.remarks.replace(/^\[ADMIN NOTE\]\s*/i, '').trim(),
      by: 'Admin (Rohit Patil)',
      date: 'Recently',
    };
  }

  const relName = app.relativeName || app.relative?.name || (app.applicant?.name && app.applicant.name !== patientName ? app.applicant.name : '—');
  const relPhone = app.relativePhone || app.relative?.phone || (app.applicant?.mobile && app.applicant.mobile !== '—' ? app.applicant.mobile : '—');
  const relRelation = app.relativeRelation || app.relative?.relation || (app.patient?.relationship && app.patient.relationship !== 'Self' ? app.patient.relationship : 'Relative');

  const normalizedDocs = Array.isArray(app.documents)
    ? app.documents.map((d, i) => {
        const rawName = String(d.name || d.title || d.fileName || d.file_name || d.file || '');
        const isCitizenInitialDoc =
          rawName.startsWith('rn_image_picker') ||
          d.source === 'Citizen Upload' ||
          d.source === 'device' ||
          d.source === 'camera' ||
          d.uploaded_by_role === 'CITIZEN' ||
          d.uploaderRole === 'Citizen';

        const isSevak = !isCitizenInitialDoc && Boolean(
          d.is_sevak_upload === true ||
          d.isSevakUpload === true ||
          d.uploaded_by_role === 'AROGYA_SEVAK' ||
          d.uploaded_by_role === 'SEVAK' ||
          d.uploaderRole === 'ArogyaSevak' ||
          d.uploaderRole === 'SEVAK' ||
          d.uploaderRole === 'sevak' ||
          d.uploadedBy === 'sevak' ||
          d.status === 'PENDING_SEVAK_UPLOAD' ||
          d.document_status === 'PENDING_SEVAK_UPLOAD' ||
          (typeof d.source === 'string' && (d.source.toLowerCase().includes('sevak') || d.source.toLowerCase().includes('hospital_ward'))) ||
          (typeof d.by === 'string' && d.by.toLowerCase().includes('sevak'))
        );

        const hasFile = Boolean((d.fileUrl && d.fileUrl !== '' && d.fileUrl !== 'Pending Upload') || (d.file_url && d.file_url !== '' && d.file_url !== 'Pending Upload') || (d.url && d.url !== '' && d.url !== 'Pending Upload'));
        const isPendingUpload = !hasFile && (d.status === 'PENDING_SEVAK_UPLOAD' || d.document_status === 'PENDING_SEVAK_UPLOAD' || d.file === 'Pending Upload' || d.fileName === 'Pending Upload' || d.uploaded === false);

        return {
          id: d.id || `DOC-${i + 1}`,
          docId: d.id || `DOC-${i + 1}`,
          title: d.title || d.fileName || d.file_name || d.name || `Medical Document ${i + 1}`,
          name: d.name || d.title || d.fileName || d.file_name || 'Medical Document',
          fileName: isPendingUpload ? 'Pending Upload' : (d.fileName || d.file_name || d.name || d.title || 'Document'),
          file: isPendingUpload ? 'Pending Upload' : (d.file || d.fileName || d.file_name || d.name || 'Document'),
          fileUrl: d.fileUrl || d.file_url || d.url || '',
          file_url: d.file_url || d.fileUrl || d.url || '',
          url: d.url || d.fileUrl || d.file_url || '',
          category: d.category || d.type || (isSevak ? 'ArogyaSevak Clinical Record' : 'Medical Record'),
          type: d.type || d.category || (isSevak ? 'ArogyaSevak Clinical Record' : 'Medical Record'),
          size: isPendingUpload ? '-' : (d.size || d.fileSize || d.file_size || '1.2 MB'),
          fileSize: isPendingUpload ? '-' : (d.fileSize || d.file_size || d.size || '1.2 MB'),
          source: d.source || (isSevak ? 'ArogyaSevak Upload' : 'Citizen Upload'),
          uploaderRole: isSevak ? 'ArogyaSevak' : 'Citizen',
          isSevakUpload: isSevak,
          is_sevak_upload: isSevak,
          isPendingSevakUpload: isPendingUpload && isSevak,
          isPendingUpload: isPendingUpload,
          uploaded: !isPendingUpload && hasFile,
          date: d.date || (d.uploadedAt || d.uploaded_at ? new Date(d.uploadedAt || d.uploaded_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : (isPendingUpload ? 'Pending' : 'Recently')),
          uploadedAt: d.uploadedAt || d.uploaded_at,
          status: isPendingUpload ? (isSevak ? 'PENDING_SEVAK_UPLOAD' : 'PENDING_CITIZEN_UPLOAD') : (d.status || d.document_status || 'PENDING'),
          document_status: isPendingUpload ? (isSevak ? 'PENDING_SEVAK_UPLOAD' : 'PENDING_CITIZEN_UPLOAD') : (d.document_status || d.status || 'PENDING'),
          verified: Boolean(d.verified),
          statusText: d.statusText || (d.verified ? 'Verified' : (isPendingUpload ? (isSevak ? 'Pending ArogyaSevak Upload' : 'Pending Citizen Upload') : 'Pending Verification')),
          verificationRemark: d.verificationRemark || d.verification_remark || d.adminNote || '',
          adminNote: d.adminNote || d.verificationRemark || d.verification_remark || '',
          by: d.by || (isSevak ? 'Arogya Sevak' : (app.applicant?.name || app.patient?.name || 'Citizen Upload')),
          uploadedBy: d.uploadedBy || (isSevak ? 'Arogya Sevak' : (app.applicant?.name || app.patient?.name || 'Citizen')),
        };
      })
    : [];

  const combinedDocs = [...normalizedDocs];
  if (Array.isArray(localOverrides.documents)) {
    localOverrides.documents.forEach((ld) => {
      if (!ld) return;
      const idx = combinedDocs.findIndex(
        (d) => (ld.id && d.id === ld.id) || (ld.title && (d.title === ld.title || d.name === ld.title)) || (ld.name && (d.name === ld.name || d.title === ld.name))
      );
      if (idx !== -1) {
        combinedDocs[idx] = { ...combinedDocs[idx], ...ld };
      } else {
        combinedDocs.push(ld);
      }
    });
  }

  // Deduplicate combinedDocs so that any uploaded document supersedes an empty pending placeholder
  const finalCombinedDocs = combinedDocs.reduce((acc, doc) => {
    const titleKey = (doc.title || doc.name || doc.fileName || '').trim().toLowerCase();
    const hasUploaded = Boolean(
      (doc.fileUrl && doc.fileUrl !== '' && doc.fileUrl !== 'Pending Upload') ||
      (doc.file_url && doc.file_url !== '' && doc.file_url !== 'Pending Upload') ||
      (doc.url && doc.url !== '' && doc.url !== 'Pending Upload') ||
      (doc.uploaded === true && doc.file !== 'Pending Upload' && doc.fileName !== 'Pending Upload')
    );

    const existingIdx = acc.findIndex(
      (d) => (d.title || d.name || d.fileName || '').trim().toLowerCase() === titleKey
    );

    if (existingIdx !== -1) {
      const existing = acc[existingIdx];
      const existingUploaded = Boolean(
        (existing.fileUrl && existing.fileUrl !== '' && existing.fileUrl !== 'Pending Upload') ||
        (existing.file_url && existing.file_url !== '' && existing.file_url !== 'Pending Upload') ||
        (existing.url && existing.url !== '' && existing.url !== 'Pending Upload') ||
        (existing.uploaded === true && existing.file !== 'Pending Upload' && existing.fileName !== 'Pending Upload')
      );
      if (hasUploaded && !existingUploaded) {
        acc[existingIdx] = doc;
      }
    } else {
      acc.push(doc);
    }
    return acc;
  }, []);

  // Derive admin requested documents (only those that are truly pending without an uploaded file)
  const derivedAdminRequestedDocs = (app.requestedDocuments || [])
    .filter((d) => {
      const statusStr = String(d.status || d.document_status || '').toLowerCase();
      if (statusStr === 'uploaded' || statusStr === 'verified' || statusStr === 'approved') return false;
      const hasFile = Boolean(
        (d.file_url && d.file_url !== '' && d.file_url !== 'Pending Upload') ||
        (d.fileUrl && d.fileUrl !== '' && d.fileUrl !== 'Pending Upload') ||
        (d.url && d.url !== '' && d.url !== 'Pending Upload')
      );
      if (hasFile) return false;

      const titleKey = (d.title || d.name || d.file_name || '').trim().toLowerCase();
      if (!titleKey || titleKey === 'pending upload') return false;

      // Check if this document title was already uploaded in finalCombinedDocs
      const isAlreadyUploadedInDocs = finalCombinedDocs.some((fDoc) => {
        const fTitle = (fDoc.title || fDoc.name || fDoc.fileName || '').trim().toLowerCase();
        const fHasFile = Boolean(
          (fDoc.fileUrl && fDoc.fileUrl !== '' && fDoc.fileUrl !== 'Pending Upload') ||
          (fDoc.file_url && fDoc.file_url !== '' && fDoc.file_url !== 'Pending Upload') ||
          (fDoc.url && fDoc.url !== '' && fDoc.url !== 'Pending Upload') ||
          (fDoc.uploaded === true && fDoc.file !== 'Pending Upload' && fDoc.fileName !== 'Pending Upload')
        );
        return fHasFile && (fTitle === titleKey || fTitle.includes(titleKey) || titleKey.includes(fTitle));
      });

      return !isAlreadyUploadedInDocs;
    })
    .concat(
      finalCombinedDocs.filter((d) => {
        const hasFile = Boolean(
          (d.fileUrl && d.fileUrl !== '' && d.fileUrl !== 'Pending Upload') ||
          (d.file_url && d.file_url !== '' && d.file_url !== 'Pending Upload') ||
          (d.url && d.url !== '' && d.url !== 'Pending Upload') ||
          (d.uploaded === true && d.file !== 'Pending Upload' && d.fileName !== 'Pending Upload')
        );
        if (hasFile) return false;

        return Boolean(
          d.isPendingSevakUpload ||
            d.status === 'PENDING_SEVAK_UPLOAD' ||
            d.document_status === 'PENDING_SEVAK_UPLOAD' ||
            (d.is_sevak_upload && !hasFile)
        );
      })
    )
    .reduce((acc, current) => {
      const titleKey = (current.title || current.name || current.file_name || '').trim();
      if (
        titleKey &&
        titleKey.toLowerCase() !== 'pending upload' &&
        !acc.some((x) => (x.title || x.name || '').trim().toLowerCase() === titleKey.toLowerCase())
      ) {
        acc.push({
          id: current.id || `req-doc-${acc.length + 1}`,
          title: titleKey,
          description:
            current.adminNote ||
            current.description ||
            current.verificationRemark ||
            current.verification_remark ||
            'Clinical document requested by Admin',
          status: current.statusText || 'Pending ArogyaSevak Upload',
          doc: current,
        });
      }
      return acc;
    }, []);

  const isCaseOpd = (app.treatmentType || app.treatment_type || app.type || localOverrides.treatmentType || localOverrides.type || '').toUpperCase() === 'OPD';

  const resolvedCaseProgress = (() => {
    const raw = app.caseProgress || app.case_progress;
    const isExcludedNote = (txt) => {
      if (!txt || typeof txt !== 'string') return false;
      const lower = txt.toLowerCase();
      return (
        lower.includes('[critical') ||
        lower.includes('reassigned') ||
        lower.includes('transferred from') ||
        lower.includes('[admin note]') ||
        lower.includes('[escalation') ||
        lower.includes('[decision') ||
        lower.includes('🚨')
      );
    };

    if (isCaseOpd) {
      if (Array.isArray(raw) && raw.length >= 3 && raw.some(s => s.label === 'Scheduled' || s.label === 'Visited' || s.label === 'Not Visited')) {
        return raw.map((step) => {
          if (isExcludedNote(step.note)) {
            return {
              ...step,
              note: step.label === 'Scheduled' ? 'OPD Appointment Scheduled' : (step.label ? `Current Status: ${step.label}` : ''),
            };
          }
          return step;
        });
      }
      return buildOpdCaseProgress({
        stage: effectiveStage,
        note: app.latestWardUpdate || '',
        scheduledDate: app.submittedDate || 'Today',
      });
    }

    if (Array.isArray(raw) && raw.length === 8) {
      const sanitizedRaw = raw.map((step) => {
        if (isExcludedNote(step.note)) {
          return {
            ...step,
            note: step.label === 'Admitted' ? 'Admitted & vitals recorded' : (step.label ? `Current Status: ${step.label}` : ''),
          };
        }
        return step;
      });

      const activeStep = sanitizedRaw.find((s) => s.state === 'active') || sanitizedRaw.filter((s) => s.state === 'completed').slice(-1)[0];
      if (activeStep && activeStep.label?.toLowerCase() === effectiveStage.toLowerCase()) {
        return sanitizedRaw;
      }
    }
    return buildCaseProgressForStage(effectiveStage, app.latestWardUpdate || '', app.submittedDate || 'Today');
  })();

  // Resolve logged-in Sevak user to differentiate Transferring Sevak (Sevak 1) vs Recipient Sevak (Sevak 2)
  let loggedInUser = null;
  try {
    const userStr = localStorage.getItem('ward_arogya_user');
    if (userStr) loggedInUser = JSON.parse(userStr);
  } catch (_) {}

  const loggedInName = (loggedInUser?.name || loggedInUser?.full_name || '').toLowerCase().trim();
  const loggedInPhone = (loggedInUser?.mobile || loggedInUser?.phone || '').trim();

  // Extract previous & assigned Sevak details
  const prevSevakName = String(
    app.previousSevak?.name ||
    app.previousSevak ||
    app.previous_sevak?.name ||
    app.previous_sevak ||
    ''
  ).toLowerCase().trim();
  const prevSevakPhone = String(
    app.previousSevak?.phone ||
    app.previous_sevak?.phone ||
    ''
  ).trim();

  const activeSevakName = String(
    app.assignedSevak?.name ||
    app.assignedSevak ||
    app.assigned_to_new_sevak?.name ||
    app.assigned_to_new_sevak ||
    app.sevakName ||
    ''
  ).toLowerCase().trim();

  const remarkStr = String(app.remarks || app.priorityNote?.text || app.priorityNote?.text_en || '');
  const prevSevakMatch = remarkStr.match(/Previous Sevak:\s+([^\(]+?)\s+\(Ph:\s*([^\)]+?)\)/i);
  const parsedPrevSevakName = prevSevakMatch ? prevSevakMatch[1].toLowerCase().trim() : '';
  const parsedPrevSevakPhone = prevSevakMatch ? prevSevakMatch[2].trim() : '';

  // Parse transferred target hospital and reason if mentioned
  const toMatch = remarkStr.match(/to\s+["']?([^"'\n\r,]+?)["']?\s+(?:due to|\(|$)/i);
  const parsedToHospital = toMatch ? toMatch[1].trim() : (app.assignedToNewHospital || app.toHospital || app.hospitalName || app.hospital || 'Navle hospital');

  const specMatch = remarkStr.match(/due to\s+["']?([^"'\n\r,]+?)["']?\s+specialty/i) || remarkStr.match(/due to\s+([^\.]+?)\s+unavailable/i);
  const parsedReason = specMatch ? `${specMatch[1].trim()} Specialty Unavailable` : (app.transferReason || app.transfer_reason || 'Interventional Cardiology (हृदयरोग कॅथलॅब) Specialty Unavailable');

  const isUserActiveSevak = Boolean(
    app.isAssignedToCaller === true ||
    (loggedInName && activeSevakName && (loggedInName.includes(activeSevakName) || activeSevakName.includes(loggedInName))) ||
    (loggedInPhone && app.sevakPhone && loggedInPhone.includes(app.sevakPhone))
  );

  const isUserPrevSevak = Boolean(
    !isUserActiveSevak && (
      (loggedInName && (
        (prevSevakName && (loggedInName.includes(prevSevakName) || prevSevakName.includes(loggedInName))) ||
        (parsedPrevSevakName && (loggedInName.includes(parsedPrevSevakName) || parsedPrevSevakName.includes(loggedInName)))
      )) ||
      (loggedInPhone && (
        (prevSevakPhone && loggedInPhone.includes(prevSevakPhone)) ||
        (parsedPrevSevakPhone && loggedInPhone.includes(parsedPrevSevakPhone))
      )) ||
      app.isTransferredOut === true
    )
  );

  let isTransferredOutFinal = false;
  let isReassignedFinal = false;

  if (isUserActiveSevak) {
    isTransferredOutFinal = false;
    isReassignedFinal = Boolean(
      app.isReassigned ||
      app.is_reassigned ||
      app.reassignedBadge === 'Reassigned Case' ||
      remarkStr.includes('REASSIGNED') ||
      remarkStr.includes('Transferred from') ||
      localOverrides.isReassigned
    );
  } else if (isUserPrevSevak || app.isTransferredOut || app.treatmentStatus === 'Transferred' || app.status === 'TRANSFERRED') {
    isTransferredOutFinal = true;
    isReassignedFinal = false;
  } else {
    isTransferredOutFinal = false;
    isReassignedFinal = Boolean(app.isReassigned || app.is_reassigned);
  }

  const finalCategory = isTransferredOutFinal ? 'transferred' : (stageMapping.category || defaultCategory);
  const finalStatus = isTransferredOutFinal ? 'Transferred' : effectiveStage;
  const finalStatusVariant = isTransferredOutFinal ? 'transferred' : (stageMapping.statusVariant || defaultStatusVariant);

  let finalPriorityNote = priorityNoteObj;
  if (isTransferredOutFinal) {
    const destHosp = parsedToHospital || app.assignedToNewHospital || 'Navle hospital';
    const destSevakName = app.assignedToNewSevak?.name || app.assignedToNewSevak || 'Sunita Deshmukh (सुनिता देशमुख)';
    const destSevakPhone = app.assignedToNewSevak?.phone ? `(${app.assignedToNewSevak.phone})` : '';
    const text_en = `🚨 Patient Transfer Approved: Case #${appId} (${patientName}) transfer request is approved. Transferred to: ${destHosp} under Arogya Sevak ${destSevakName} ${destSevakPhone}. Please dispatch the patient to the new hospital.`;
    const text_mr = `🚨 रुग्ण वर्ग मंजुरी: केस #${appId} (${patientName}) ची वर्ग विनंती मंजूर झाली आहे. रुग्ण '${destHosp}' येथे नवीन आरोग्य सेवक '${destSevakName}' यांच्याकडे वर्ग केला आहे. कृपया रुग्ण नवीन रुग्णालयाकडे रवाना करा.`;
    const text_hi = `🚨 मरीज स्थानांतरण स्वीकृत: केस #${appId} (${patientName}) का ट्रांसफर स्वीकृत हो गया है। '${destHosp}' में नए आरोग्य सेवक '${destSevakName}' को सौंपा गया है। कृपया मरीज को नए अस्पताल के लिए रवाना करें।`;

    finalPriorityNote = {
      id: `note-transferred-${appId}`,
      text: text_en,
      text_en,
      text_hi,
      text_mr,
      adminName: 'District Health Officer / Admin',
      designation: 'Health Dept Supervisor',
      level: 'HIGH',
      title: 'PATIENT TRANSFER DIRECTIVE',
      title_en: 'PATIENT TRANSFER DIRECTIVE',
      title_hi: 'मरीज स्थानांतरण निर्देश',
      title_mr: 'रुग्ण वर्ग प्रशासकीय आदेश',
      date: 'Today',
      badge: 'Case Transferred',
      badge_en: 'Case Transferred',
      badge_hi: 'केस स्थानांतरित',
      badge_mr: 'रुग्ण वर्ग केला',
      isTransferredOut: true,
      isReassigned: false,
    };
  }

  return {
    id: appId,
    caseId: appId,
    name: patientName,
    patientName: patientName,
    age: calculatedAge,
    gender: normalizedGender,
    mobile: app.patient?.mobile || app.contact || '—',
    phone: app.patient?.mobile || app.contact || '—',
    hospital: hospitalName,
    assignedHospital: hospitalName,
    scheme: schemeName,
    assignedScheme: app.assignedScheme || app.suggestedScheme || { name: schemeName, code: 'MJPJAY' },
    admittedDateFormatted: app.submittedDate || app.admissionDate || '—',
    admissionDate: app.admissionDate || app.submittedDate || '—',
    category: finalCategory,
    status: finalStatus,
    statusVariant: finalStatusVariant,
    treatmentStage: isTransferredOutFinal ? 'Transferred' : effectiveStage,
    treatmentStatus: isTransferredOutFinal ? 'Transferred' : effectiveStage,
    sevakReportedStatus: isTransferredOutFinal ? 'Transferred' : (app.sevakReportedStatus || app.sevak_reported_status || effectiveStage),
    latestWardUpdate: app.latestWardUpdate || app.latest_ward_update || null,
    sevakLastUpdatedAt: app.sevakLastUpdatedAt || app.sevak_last_updated_at || null,
    lastUpdated: app.sevakLastUpdatedAt ? new Date(app.sevakLastUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (localOverrides.lastUpdated || 'Just now'),
    actionType: isTransferredOutFinal ? 'view' : (stageMapping.actionType || 'update'),
    treatmentType: (app.treatmentType || app.treatment_type || app.type || localOverrides.treatmentType || (isCaseOpd ? 'OPD' : 'IPD')).toUpperCase(),
    type: (app.treatmentType || app.treatment_type || app.type || localOverrides.treatmentType || (isCaseOpd ? 'OPD' : 'IPD')).toUpperCase(),
    ward: app.ward || (isCaseOpd ? 'OPD Room' : (app.treatmentType === 'IPD' ? 'IPD Ward' : 'General Ward')),
    diagnosis: app.condition || app.medicalCauseNote || app.diagnosis || 'Clinical Assessment & Support',
    relativeName: relName,
    relativeRelation: relRelation,
    relativePhone: relPhone,
    emergencyAlternate: app.emergencyAlternate || '—',
    residenceDistrict: app.patient?.district ? `${app.patient.district}${app.patient.taluka ? ` - ${app.patient.taluka}` : ''}` : '—',
    doctor: app.doctor || (app.assignedSevak?.name ? `Arogya Sevak: ${app.assignedSevak.name}` : 'Attending Physician'),
    vitals: app.vitals || { bp: '120/80', pulse: '76 bpm', spO2: '98%', temp: '98.6 °F' },
    notes: app.latestWardUpdate || app.remarks || app.notes || 'Patient case assigned via ArogyaMitra system.',
    priorityNote: finalPriorityNote,
    adminNotes: adminNotesList,
    caseProgress: resolvedCaseProgress,
    clinicalNotes: app.clinicalNotes || app.clinical_notes || (app.remarks ? [{ id: 1, date: 'Just now', note: app.remarks, by: 'Admin / ArogyaSevak' }] : []),
    updateHistory: app.updateHistory || app.update_history || localOverrides.updateHistory || [],
    bills: app.bills || [],
    opdVisits: app.opdVisits || [],
    isTransferredOut: isTransferredOutFinal,
    isReassigned: isReassignedFinal,
    assignedToNewHospital: parsedToHospital || app.assignedToNewHospital || app.toHospital || app.assigned_to_new_hospital || localOverrides.assignedToNewHospital || 'Navle hospital',
    assignedToNewSevak: app.assignedToNewSevak || app.assigned_to_new_sevak || app.assignedSevak || localOverrides.assignedToNewSevak || { name: 'Sunita Deshmukh (सुनिता देशमुख)', phone: '2222222222' },
    transferredFromHospital: app.transferredFromHospital || app.fromHospital || app.transferred_from_hospital || localOverrides.transferredFromHospital || null,
    transferReason: parsedReason || app.transferReason || app.transfer_reason || localOverrides.transferReason || null,
    previousSevak: app.previousSevak || app.previous_sevak || localOverrides.previousSevak || null,
    adminRequestedDocs: derivedAdminRequestedDocs,
    documents: finalCombinedDocs,
  };
};

export const computePatientStats = (patients = []) => {
  const activePatients = patients.filter((p) => p.category !== 'discharged' && p.category !== 'transferred' && !p.isTransferredOut);
  const inTreatment = activePatients.length;
  const surgeryCases = patients.filter((p) => p.category === 'surgery' && !p.isTransferredOut).length;
  const ongoingCases = patients.filter((p) => p.category === 'ongoing' && !p.isTransferredOut).length;
  const dischargedThisWeek = patients.filter((p) => p.category === 'discharged').length;
  const transferredCases = patients.filter((p) => p.category === 'transferred' || p.isTransferredOut).length;
  const totalAssigned = patients.length;

  return {
    inTreatment,
    surgeryCases,
    criticalIcu: surgeryCases,
    ongoingCases,
    dischargedThisWeek,
    transferredCases,
    totalAssigned,
  };
};

export const getLocalizedPriorityNote = (note, lang = 'en', t = null) => {
  if (!note) return null;
  const noteObj = typeof note === 'string' ? { text: note } : { ...note };
  const currentLang = (lang || 'en').toLowerCase();

  // 1. Direct multilingual properties
  let title = noteObj.title || '';
  let text = '';

  if (currentLang === 'mr') {
    text = noteObj.text_mr || noteObj.textMr;
    title = noteObj.title_mr || noteObj.titleMr;
  } else if (currentLang === 'hi') {
    text = noteObj.text_hi || noteObj.textHi;
    title = noteObj.title_hi || noteObj.titleHi;
  } else {
    text = noteObj.text_en || noteObj.textEn;
    title = noteObj.title_en || noteObj.titleEn;
  }

  if (!text) {
    text = noteObj.text || noteObj.note || '';
  }

  // 2. Intelligent pattern matching & translation for known administrative alert templates
  if (text && typeof text === 'string') {
    // Reassigned Case Template
    const reassignMatch = text.match(/तातडीचे\s*पुनर्नियुक्त\s*प्रकरण:\s*रुग्ण\s*(.*?)\s*चे\s*प्रकरण\s*'(.*?)'\s*येथून\s*'(.*?)'\s*सुविधा\s*उपलब्ध\s*नसल्याने\s*तुमच्याकडे\s*वर्ग\s*केले\s*आहे\.\s*मागील\s*आरोग्य\s*सेवक:\s*(.*?)\s*\((.*?)\)\.\s*कृपया\s*त्वरित\s*दाखल\s*करून\s*घ्या\./is)
      || text.match(/Urgent\s*Reassigned\s*Case:\s*Patient\s*(.*?)(?:'s|\s+)\s*case\s*has\s*been\s*reassigned\s*to\s*you\s*from\s*'(.*?)'\s*due\s*to\s*unavailable\s*'(.*?)'\s*specialty\.\s*Previous\s*Arogya\s*Sevak:\s*(.*?)\s*\((.*?)\)\.\s*Please\s*admit\s*immediately\./is)
      || text.match(/आपातकालीन\s*पुनर्नियुक्त\s*मामला:\s*मरीज\s*(.*?)\s*का\s*मामला\s*'(.*?)'\s*से\s*'(.*?)'\s*सुविधा\s*अनुपलब्ध\s*होने\s*के\s*कारण\s*आपको\s*सौंपा\s*गया\s*है।\s*पिछले\s*आरोग्य\s*सेवक:\s*(.*?)\s*\((.*?)\)।\s*कृपया\s*तुरंत\s*भर्ती\s*करें।/is);

    if (reassignMatch) {
      const pName = reassignMatch[1]?.trim() || 'Patient';
      const fromHosp = reassignMatch[2]?.trim() || 'Previous Hospital';
      const spec = reassignMatch[3]?.trim() || 'Specialty Care';
      const prevSevak = reassignMatch[4]?.trim() || 'Arogya Sevak';
      const prevPhone = reassignMatch[5]?.trim() || '—';

      if (currentLang === 'mr') {
        text = `🚨 तातडीचे पुनर्नियुक्त प्रकरण: रुग्ण ${pName} चे प्रकरण '${fromHosp}' येथून '${spec}' सुविधा उपलब्ध नसल्याने तुमच्याकडे वर्ग केले आहे. मागील आरोग्य सेवक: ${prevSevak} (${prevPhone}). कृपया त्वरित दाखल करून घ्या.`;
      } else if (currentLang === 'hi') {
        text = `🚨 आपातकालीन पुनर्नियुक्त मामला: मरीज ${pName} का मामला '${fromHosp}' से '${spec}' सुविधा अनुपलब्ध होने के कारण आपको सौंपा गया है। पिछले आरोग्य सेवक: ${prevSevak} (${prevPhone})। कृपया तुरंत भर्ती करें।`;
      } else {
        text = `🚨 Urgent Reassigned Case: Patient ${pName}'s case has been reassigned to you from '${fromHosp}' due to unavailable '${spec}' specialty. Previous Arogya Sevak: ${prevSevak} (${prevPhone}). Please admit immediately.`;
      }
    }

    // Transfer Approval Template
    const transferMatch = text.match(/रुग्ण\s*वर्ग\s*मंजुरी:\s*केस\s*#(.*?)\s*\((.*?)\)\s*ची\s*वर्ग\s*विनंती\s*मंजूर\s*झाली\s*आहे\.\s*रुग्ण\s*'(.*?)'\s*येथे\s*नवीन\s*आरोग्य\s*सेवक\s*'(.*?)'\s*\((.*?)\)\s*यांच्याकडे\s*वर्ग\s*केला\s*आहे\.\s*कृपया\s*रुग्ण\s*नवीन\s*रुग्णालयाकडे\s*रवाना\s*करा\./is)
      || text.match(/Patient\s*Transfer\s*Approved:\s*Case\s*#(.*?)\s*\((.*?)\)\s*transfer\s*request\s*is\s*approved\.\s*Transferred\s*to\s*'(.*?)'\s*under\s*Arogya\s*Sevak\s*'(.*?)'\s*\((.*?)\)\.\s*Please\s*dispatch\s*the\s*patient/is)
      || text.match(/मरीज\s*स्थानांतरण\s*स्वीकृत:\s*केस\s*#(.*?)\s*\((.*?)\)\s*का\s*ट्रांसफर\s*स्वीकृत\s*हो\s*गया\s*है।\s*'(.*?)'\s*में\s*नए\s*आरोग्य\s*सेवक\s*'(.*?)'\s*\((.*?)\)\s*को\s*सौंपा\s*गया\s*है।/is);

    if (transferMatch) {
      const cId = transferMatch[1]?.trim() || '';
      const pName = transferMatch[2]?.trim() || 'Patient';
      const toHosp = transferMatch[3]?.trim() || 'New Hospital';
      const toSevak = transferMatch[4]?.trim() || 'Arogya Sevak';
      const toPhone = transferMatch[5]?.trim() || '—';

      if (currentLang === 'mr') {
        text = `🚨 रुग्ण वर्ग मंजुरी: केस #${cId} (${pName}) ची वर्ग विनंती मंजूर झाली आहे. रुग्ण '${toHosp}' येथे नवीन आरोग्य सेवक '${toSevak}' (${toPhone}) यांच्याकडे वर्ग केला आहे. कृपया रुग्ण नवीन रुग्णालयाकडे रवाना करा.`;
      } else if (currentLang === 'hi') {
        text = `🚨 मरीज स्थानांतरण स्वीकृत: केस #${cId} (${pName}) का ट्रांसफर स्वीकृत हो गया है। '${toHosp}' में नए आरोग्य सेवक '${toSevak}' (${toPhone}) को सौंपा गया है। कृपया मरीज को नए अस्पताल के लिए रवाना करें।`;
      } else {
        text = `🚨 Patient Transfer Approved: Case #${cId} (${pName}) transfer request is approved. Transferred to '${toHosp}' under Arogya Sevak '${toSevak}' (${toPhone}). Please dispatch the patient to the new hospital.`;
      }
    }
  }

  // 3. Localize Title
  const rawLevel = String(noteObj.level || 'CRITICAL').toUpperCase();
  if (!title) {
    if (currentLang === 'mr') {
      title = `प्रशासनाकडून प्राधान्य सूचना (${rawLevel === 'CRITICAL' ? 'अतितातडीचे' : 'तातडीचे'})`;
    } else if (currentLang === 'hi') {
      title = `प्रशासक से प्राथमिकता निर्देश (${rawLevel === 'CRITICAL' ? 'अतिगंभीर' : 'प्राथमिकता'})`;
    } else {
      title = `PRIORITY NOTE FROM ADMIN (${rawLevel})`;
    }
  } else {
    if (title.includes('DIRECT INSTRUCTION') || title.includes('थेट निर्देश') || title.includes('सीधा निर्देश')) {
      if (currentLang === 'mr') title = 'जिल्हा प्रशासनाकडून थेट निर्देश';
      else if (currentLang === 'hi') title = 'जिला प्रशासन से सीधा निर्देश';
      else title = 'DIRECT INSTRUCTION FROM DISTRICT ADMIN';
    } else if (title.includes('PRIORITY NOTE') || title.includes('प्राधान्य सूचना') || title.includes('प्राथमिकता निर्देश')) {
      if (currentLang === 'mr') title = `प्रशासनाकडून प्राधान्य सूचना (${rawLevel === 'CRITICAL' ? 'अतितातडीचे' : 'तातडीचे'})`;
      else if (currentLang === 'hi') title = `प्रशासक से प्राथमिकता निर्देश (${rawLevel === 'CRITICAL' ? 'अतिगंभीर' : 'प्राथमिकता'})`;
      else title = `PRIORITY NOTE FROM ADMIN (${rawLevel})`;
    } else if (title.includes('TRANSFER DIRECTIVE') || title.includes('वर्ग प्रशासकीय आदेश') || title.includes('स्थानांतरण निर्देश')) {
      if (currentLang === 'mr') title = 'रुग्ण वर्ग प्रशासकीय आदेश';
      else if (currentLang === 'hi') title = 'मरीज स्थानांतरण निर्देश';
      else title = 'PATIENT TRANSFER DIRECTIVE';
    }
  }

  return {
    ...noteObj,
    title,
    text,
  };
};

export const patientService = {
  invalidateCache() {
    invalidatePatientsCache();
  },

  getCachedPatients() {
    if (_cachedPatients && Array.isArray(_cachedPatients) && _cachedPatients.length > 0) {
      return _cachedPatients;
    }
    return getStoredPatients();
  },

  getCachedPatientById(id) {
    if (!id) return null;
    const cleanId = String(id).toLowerCase().trim();
    const cleanAlphanum = cleanId.replace(/[^a-zA-Z0-9]/g, '');

    const candidates = _cachedPatients && Array.isArray(_cachedPatients) ? _cachedPatients : getStoredPatients();
    return candidates.find(
      (p) =>
        (p.id && String(p.id).toLowerCase() === cleanId) ||
        (p.caseId && String(p.caseId).toLowerCase() === cleanId) ||
        (p.applicationNumber && String(p.applicationNumber).toLowerCase() === cleanId) ||
        (p.uuid && String(p.uuid).toLowerCase() === cleanId) ||
        (p.id && String(p.id).replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === cleanAlphanum)
    ) || null;
  },

  async getDashboardStats() {
    const patients = await this.getPatients();
    return computePatientStats(patients);
  },

  /**
   * Add direct instruction / note from Admin to the patient record
   */
  async addAdminDirective(id, noteText, adminName = 'Admin (Rohit Patil)') {
    const cleanId = String(id).toLowerCase();
    const patients = getStoredPatients();
    const index = patients.findIndex((p) => p.id?.toLowerCase() === cleanId || p.caseId?.toLowerCase() === cleanId);
    
    const cleanNote = noteText.replace(/^\[ADMIN NOTE\]\s*/i, '').trim();
    const newNoteObj = {
      id: Date.now(),
      text: cleanNote,
      note: cleanNote,
      by: adminName,
      date: 'Just now',
    };

    const newPriorityObj = {
      level: 'HIGH',
      title: 'DIRECT INSTRUCTION FROM DISTRICT ADMIN',
      text: cleanNote,
      by: adminName,
      date: 'Just now',
    };

    if (index !== -1) {
      const existingAdminNotes = patients[index].adminNotes || [];
      patients[index] = {
        ...patients[index],
        adminNotes: [newNoteObj, ...existingAdminNotes],
        priorityNote: newPriorityObj,
        remarks: cleanNote,
      };
      saveStoredPatients(patients);
      return patients[index];
    }
    return null;
  },

  async getPatients(options = {}) {
    const forceRefresh = options === true || options?.forceRefresh === true;

    // Return warm in-memory cache if valid and not force refresh
    if (!forceRefresh && _cachedPatients && Array.isArray(_cachedPatients) && _cachedPatients.length > 0 && (Date.now() - _cacheTimestamp < CACHE_TTL_MS)) {
      return _cachedPatients;
    }

    // Return stored local patients immediately if present and not force refresh
    const localList = getStoredPatients();
    if (!forceRefresh && localList && localList.length > 0 && !_cachedPatients) {
      _cachedPatients = localList;
      _cacheTimestamp = Date.now();
    }

    // Deduplicate in-flight network requests
    if (_inFlightPatientsPromise && !forceRefresh) {
      return _inFlightPatientsPromise;
    }

    _inFlightPatientsPromise = (async () => {
      let remoteApps = null;
      let apiSucceeded = false;
      try {
        const res = await api.get('/applications/sevak/assigned');
        if (Array.isArray(res?.data)) {
          remoteApps = res.data;
          apiSucceeded = true;
        } else if (Array.isArray(res?.data?.applications)) {
          remoteApps = res.data.applications;
          apiSucceeded = true;
        } else if (Array.isArray(res?.data?.data)) {
          remoteApps = res.data.data;
          apiSucceeded = true;
        } else if (Array.isArray(res)) {
          remoteApps = res;
          apiSucceeded = true;
        }
      } catch (e1) {
        try {
          const res2 = await api.get('/patients/assigned');
          if (Array.isArray(res2?.data?.patients)) {
            remoteApps = res2.data.patients;
            apiSucceeded = true;
          } else if (Array.isArray(res2?.data)) {
            remoteApps = res2.data;
            apiSucceeded = true;
          } else if (Array.isArray(res2)) {
            remoteApps = res2;
            apiSucceeded = true;
          }
        } catch (e2) {
          console.warn('[patientService] Remote API notice:', e1.message);
        }
      }

      const currentStored = getStoredPatients();
      const localMap = new Map((currentStored || []).map((p) => [String(p.id || '').toLowerCase(), p]));

      // If remote API succeeded and returned applications (including 0 cases [])
      if (apiSucceeded && Array.isArray(remoteApps)) {
        const liveList = remoteApps.map((app) => {
          const appId = String(app.id || app.caseId || app.applicationNumber || '').toLowerCase();
          const local = localMap.get(appId);
          const normalized = normalizeApiApplication(app, local || {});
          return normalized;
        }).filter(Boolean);

        saveStoredPatients(liveList);
        return liveList;
      }

      // If remote API call completely failed / offline, fallback to user's cached records
      if (currentStored && currentStored.length > 0) {
        _cachedPatients = currentStored;
        _cacheTimestamp = Date.now();
        return currentStored;
      }

      if (Array.isArray(remoteApps)) {
        saveStoredPatients([]);
        return [];
      }

      return currentStored || [];
    })().finally(() => {
      _inFlightPatientsPromise = null;
    });

    return _inFlightPatientsPromise;
  },

  async getPatientById(id) {
    if (!id) return null;
    const cleanId = String(id).toLowerCase();
    const stored = this.getCachedPatients();
    const foundLocal = stored.find(
      (p) =>
        (p.id && p.id.toLowerCase() === cleanId) ||
        (p.caseId && p.caseId.toLowerCase() === cleanId) ||
        (p.id && p.id.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === cleanId.replace(/[^a-zA-Z0-9]/g, ''))
    );

    try {
      const res = await api.get(`/applications/${encodeURIComponent(id)}`);
      const payload = res?.data?.data || res?.data || res;
      if (payload && (payload.id || payload.patientName || payload.patient_name || payload.applicationNumber)) {
        const normalized = normalizeApiApplication(payload, foundLocal || {});
        if (normalized) {
          // Update cached copy
          const idx = stored.findIndex((p) => p.id?.toLowerCase() === cleanId || p.caseId?.toLowerCase() === cleanId);
          if (idx !== -1) {
            stored[idx] = normalized;
          } else {
            stored.push(normalized);
          }
          saveStoredPatients(stored);
          return normalized;
        }
      }
    } catch (_) {
      try {
        const res2 = await api.get(`/patients/${encodeURIComponent(id)}`);
        const payload2 = res2?.data?.data || res2?.data || res2;
        if (payload2 && (payload2.id || payload2.patientName || payload2.patient_name)) {
          const normalized = normalizeApiApplication(payload2, foundLocal || {});
          return normalized;
        }
      } catch (_) {}
    }

    return foundLocal || null;
  },

  /**
   * Fetch documents for a patient/application directly from application_documents table
   */
  async getPatientDocuments(caseId) {
    try {
      const res = await api.get(`/applications/${encodeURIComponent(caseId)}/documents`);
      if (res?.data && Array.isArray(res.data)) {
        return res.data;
      }
    } catch (err) {
      console.warn('[patientService] getPatientDocuments error:', err.message);
    }
    return [];
  },

  /**
   * Update clinical treatment progress and live ward status on the backend
   */
  async updateTreatmentProgress(id, { stage, note, caseProgress, status, category, statusVariant }) {
    let apiSuccess = false;
    let apiResult = null;

    try {
      const res = await api.put(`/applications/${encodeURIComponent(id)}/treatment-progress`, {
        stage,
        note,
        caseProgress,
        status,
        category,
        statusVariant,
      });

      if (res?.data) {
        apiResult = res.data;
        apiSuccess = true;
      }
    } catch (err) {
      console.warn('[patientService] Backend treatment progress update notice:', err.message);
    }

    // Always update local cache for smooth offline and immediate UI reactivity
    const patients = getStoredPatients();
    const index = patients.findIndex((p) => p.id === id || p.id.toLowerCase() === String(id).toLowerCase());
    const nowFormatted = 'Just now';
    const newHistoryItem = note
      ? {
          date: nowFormatted,
          update: note,
          type: `${stage || status || 'Treatment'} Update`,
          typeVariant: statusVariant || 'treatment',
          by: 'Akanksha Pawashe (ArogyaSevak)',
        }
      : null;

    if (index !== -1) {
      const existingHistory = patients[index].updateHistory || [];
      patients[index] = {
        ...patients[index],
        treatmentStage: stage || patients[index].treatmentStage,
        sevakReportedStatus: stage || patients[index].sevakReportedStatus,
        latestWardUpdate: note || patients[index].latestWardUpdate,
        category: category || patients[index].category,
        statusVariant: statusVariant || patients[index].statusVariant,
        caseProgress: caseProgress || patients[index].caseProgress,
        lastUpdated: nowFormatted,
        updateHistory: newHistoryItem ? [newHistoryItem, ...existingHistory] : existingHistory,
      };
      saveStoredPatients(patients);
      return patients[index];
    } else if (apiResult) {
      return normalizeApiApplication(apiResult, {});
    }

    return null;
  },

  async updatePatient(id, updatedFields) {
    // If updating caseProgress or status or notes, call backend
    if (updatedFields.caseProgress || updatedFields.status || updatedFields.notes) {
      const activeStage = updatedFields.caseProgress?.find((s) => s.state === 'active')?.label ||
        updatedFields.status ||
        'Under Treatment';
      
      this.updateTreatmentProgress(id, {
        stage: activeStage,
        note: updatedFields.notes,
        caseProgress: updatedFields.caseProgress,
        status: updatedFields.status,
        category: updatedFields.category,
        statusVariant: updatedFields.statusVariant,
      }).catch((e) => console.warn('[patientService] Background treatment update:', e.message));
    }

    const patients = getStoredPatients();
    const index = patients.findIndex((p) => p.id === id || p.id.toLowerCase() === String(id).toLowerCase());
    if (index !== -1) {
      const nowFormatted = 'Just now';
      const newHistoryItem = updatedFields.notes
        ? {
            date: nowFormatted,
            update: updatedFields.notes,
            type: `${updatedFields.status || patients[index].status} Update`,
            typeVariant: updatedFields.statusVariant || patients[index].statusVariant,
            by: 'Akanksha Pawashe (ArogyaSevak)',
          }
        : null;

      const existingHistory = patients[index].updateHistory || [];

      patients[index] = {
        ...patients[index],
        ...updatedFields,
        lastUpdated: nowFormatted,
        updateHistory: newHistoryItem ? [newHistoryItem, ...existingHistory] : existingHistory,
      };

      saveStoredPatients(patients);
      return patients[index];
    }
    return null;
  },

  async addPatientNote(id, noteText) {
    const patients = getStoredPatients();
    const index = patients.findIndex((p) => p.id === id);
    if (index !== -1) {
      const newNoteObj = {
        id: Date.now(),
        date: 'Just now',
        note: noteText,
        by: getSevakAuthorName(),
      };
      const existingNotes = patients[index].clinicalNotes || [];
      patients[index] = {
        ...patients[index],
        clinicalNotes: [newNoteObj, ...existingNotes],
        notes: noteText,
      };
      saveStoredPatients(patients);
      return patients[index];
    }
    throw new Error('Patient not found');
  },

  async addPatientDocument(id, docData) {
    const cleanFileName = docData.fileName || docData.name || `${(docData.title || 'document').toLowerCase().replace(/[^a-z0-9]/g, '_')}_sevak.pdf`;
    const cleanFileUrl = docData.fileUrl || docData.url || docData.file_url || docData.uri || null;

    let apiDoc = null;
    try {
      const res = await api.post(`/applications/${encodeURIComponent(id)}/documents`, {
        title: docData.title,
        docTitle: docData.title,
        name: docData.title,
        category: docData.type || 'Clinical Record',
        fileUrl: cleanFileUrl,
        fileName: cleanFileName,
        fileSize: docData.size || '1.4 MB',
        notes: docData.note || null,
        reqDocId: docData.reqDocId || null,
      });
      if (res && res.data) {
        apiDoc = res.data.document || res.data;
      }
    } catch (err) {
      console.warn('[patientService] Add document API warning:', err.message);
    }

    const patients = getStoredPatients();
    const index = patients.findIndex((p) => p.id === id || p.caseId === id);
    if (index !== -1) {
      const newDoc = {
        id: apiDoc?.id || `DOC-${Math.floor(1000 + Math.random() * 9000)}`,
        title: docData.title,
        name: docData.title,
        type: docData.type || 'Clinical Record',
        category: docData.type || 'Clinical Record',
        date: 'Just now',
        size: docData.size || '1.4 MB',
        by: docData.by || 'ArogyaSevak',
        fileName: cleanFileName,
        file: cleanFileName,
        fileUrl: cleanFileUrl,
        file_url: cleanFileUrl,
        url: cleanFileUrl,
        uploaded: true,
        isPendingUpload: false,
        isPendingSevakUpload: false,
        is_sevak_upload: true,
        isSevakUpload: true,
        status: 'UPLOADED_PENDING_VERIFICATION',
        document_status: 'UPLOADED_PENDING_VERIFICATION',
        statusText: 'Uploaded by ArogyaSevak — Ready for Verification',
      };
      const existingDocs = patients[index].documents || [];
      patients[index] = {
        ...patients[index],
        documents: [newDoc, ...existingDocs.filter((d) => d.title !== docData.title && d.name !== docData.title && d.id !== docData.reqDocId)],
        adminRequestedDocs: (patients[index].adminRequestedDocs || []).filter((d) => d.title !== docData.title && d.name !== docData.title && d.id !== docData.reqDocId),
      };
      saveStoredPatients(patients);
      return patients[index];
    }
    return null;
  },

  async uploadAdminRequestedDoc(id, reqDocId, docTitle, fileName, fileUrl = null) {
    const cleanFileName = fileName || `${(docTitle || 'document').toLowerCase().replace(/[^a-z0-9]/g, '_')}_sevak.pdf`;
    const cleanFileUrl = fileUrl || null;

    try {
      await api.post(`/applications/${encodeURIComponent(id)}/documents`, {
        docTitle,
        title: docTitle,
        fileName: cleanFileName,
        fileUrl: cleanFileUrl,
        reqDocId,
        category: 'Clinical Record',
      });
    } catch (apiErr) {
      console.warn('[patientService] uploadAdminRequestedDoc live API notice:', apiErr.message);
    }

    const patients = getStoredPatients();
    const index = patients.findIndex((p) => p.id === id || p.caseId === id);
    if (index !== -1) {
      const existingReqDocs = patients[index].adminRequestedDocs || [];
      const updatedReqDocs = existingReqDocs.filter((d) => d.id !== reqDocId && d.title !== docTitle && d.name !== docTitle);

      const existingDocs = patients[index].documents || [];
      let docUpdated = false;
      const updatedDocs = existingDocs.map((d) => {
        if (d.id === reqDocId || d.title === docTitle || d.name === docTitle) {
          docUpdated = true;
          return {
            ...d,
            title: docTitle || d.title || d.name,
            name: docTitle || d.name || d.title,
            file: cleanFileName,
            fileName: cleanFileName,
            fileUrl: cleanFileUrl,
            file_url: cleanFileUrl,
            url: cleanFileUrl,
            uploaded: true,
            isPendingUpload: false,
            isPendingSevakUpload: false,
            is_sevak_upload: true,
            isSevakUpload: true,
            status: 'UPLOADED_PENDING_VERIFICATION',
            document_status: 'UPLOADED_PENDING_VERIFICATION',
            statusText: 'Uploaded by ArogyaSevak — Ready for Verification',
            uploadedAt: new Date().toISOString(),
          };
        }
        return d;
      });

      if (!docUpdated) {
        updatedDocs.unshift({
          id: reqDocId || `DOC-${Math.floor(1000 + Math.random() * 9000)}`,
          title: docTitle || 'Admin Requested Document',
          name: docTitle || 'Admin Requested Document',
          type: 'Clinical Record',
          category: 'Clinical Record',
          date: 'Just now',
          size: '1.4 MB',
          by: 'ArogyaSevak',
          fileName: cleanFileName,
          file: cleanFileName,
          fileUrl: cleanFileUrl,
          file_url: cleanFileUrl,
          url: cleanFileUrl,
          uploaded: true,
          isPendingUpload: false,
          isPendingSevakUpload: false,
          is_sevak_upload: true,
          isSevakUpload: true,
          status: 'UPLOADED_PENDING_VERIFICATION',
          document_status: 'UPLOADED_PENDING_VERIFICATION',
          statusText: 'Uploaded by ArogyaSevak — Ready for Verification',
        });
      }

      patients[index] = {
        ...patients[index],
        adminRequestedDocs: updatedReqDocs,
        documents: updatedDocs,
      };

      saveStoredPatients(patients);
      return patients[index];
    }
    return null;
  },

  async addPatientOPDVisit(id, visitData) {
    const patients = getStoredPatients();
    const index = patients.findIndex((p) => p.id === id);
    if (index !== -1) {
      const nowFormatted = new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }) + ', ' + new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      const newOpdId = `OPD-${Math.floor(100 + Math.random() * 900)}`;

      const newVisit = {
        id: newOpdId,
        visitType: visitData.visitType || 'Follow-Up',
        date: nowFormatted,
        department: visitData.department || 'General Medicine',
        doctor: visitData.doctor || '',
        dueText: visitData.followUpRequired ? `Due: ${visitData.dueDaysText || 'In 7 Days'}` : '',
        dueDaysText: visitData.dueDaysText || 'In 7 Days',
        notes: visitData.notes || 'Routine follow-up consultation.',
      };

      const existingVisits = patients[index].opdVisits || [];
      patients[index] = {
        ...patients[index],
        opdVisits: [newVisit, ...existingVisits],
      };

      saveStoredPatients(patients);
      return patients[index];
    }
    throw new Error('Patient not found');
  },

  async addPatientBill(id, billData) {
    const patients = getStoredPatients();
    const index = patients.findIndex((p) => p.id === id);
    if (index !== -1) {
      const amount = parseFloat(billData.amount) || 0;
      const limit = parseFloat(billData.limit) || 150000;
      const exceeds = amount > limit;
      const excessAmt = exceeds ? amount - limit : 0;

      const newBill = {
        id: `BILL-${Math.floor(1000 + Math.random() * 9000)}`,
        invoiceNo: billData.invoiceNo || `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        category: billData.category || 'Hospital Charges',
        amount: amount,
        limit: limit,
        exceedsLimit: exceeds,
        excessAmount: excessAmt,
        status: exceeds ? 'Pending Admin Approval' : 'Approved (Scheme Covered)',
        statusVariant: exceeds ? 'warning' : 'success',
        remarks: billData.remarks || (exceeds ? `Bill exceeds scheme limit by ₹${excessAmt.toLocaleString('en-IN')}. Sent to District Health Admin for decision.` : 'Within approved scheme limit.'),
        date: 'Just now',
        by: getSevakAuthorName(),
      };
      const existingBills = patients[index].bills || [];
      patients[index] = {
        ...patients[index],
        bills: [newBill, ...existingBills],
      };
      saveStoredPatients(patients);

      // If exceeds limit, post a critical bulletin for Admin!
      if (exceeds) {
        await this.addBulletin({
          type: 'critical',
          title: `Bill Limit Exceeded Approval Request: ${patients[index].name} (${patients[index].id})`,
          description: `Hospital bill of ₹${amount.toLocaleString('en-IN')} exceeds ${patients[index].scheme || 'PM-JAY'} limit (₹${limit.toLocaleString('en-IN')}) by ₹${excessAmt.toLocaleString('en-IN')}. Awaiting District Admin decision.`,
        });
      }

      return patients[index];
    }
    throw new Error('Patient not found');
  },

  async getHospitalStats() {
    try {
      const cache = localStorage.getItem('arogyamitra_daily_updates_cache');
      if (cache) {
        const parsed = JSON.parse(cache);
        if (parsed?.stats) {
          return {
            icuAvailable: parsed.stats.icuAvailable ?? 0,
            icuTotal: parsed.stats.icuTotal ?? 0,
            generalAvailable: parsed.stats.generalAvailable ?? 0,
            generalTotal: parsed.stats.generalTotal ?? 0,
            doctorsOnDuty: parsed.stats.doctorsOnDuty ?? 0,
            opdAdmissionsToday: parsed.stats.admissionsMadeToday ?? 0,
          };
        }
      }
      const data = localStorage.getItem('arogyamitra_hospital_stats');
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // Fallback
    }
    const defaultStats = {
      icuAvailable: 0,
      icuTotal: 0,
      generalAvailable: 0,
      generalTotal: 0,
      doctorsOnDuty: 0,
      opdAdmissionsToday: 0,
    };
    return defaultStats;
  },

  async updateHospitalStats(newStats) {
    const current = await this.getHospitalStats();
    const updated = { ...current, ...newStats };
    localStorage.setItem('arogyamitra_hospital_stats', JSON.stringify(updated));
    return updated;
  },

  async getBulletins() {
    const data = localStorage.getItem('arogyamitra_bulletins');
    if (data) {
      try {
        return JSON.parse(data);
      } catch {
        // Fallback
      }
    }
    const defaultList = [];
    return defaultList;
  },

  async addBulletin(bulletinData) {
    const list = await this.getBulletins();
    const newB = {
      id: Date.now(),
      type: bulletinData.type || 'info',
      title: bulletinData.title,
      time: 'Just now',
      description: bulletinData.description,
      unread: true,
    };
    const updatedList = [newB, ...list];
    localStorage.setItem('arogyamitra_bulletins', JSON.stringify(updatedList));
    return updatedList;
  },

  async getDailyReports() {
    try {
      const cache = localStorage.getItem('arogyamitra_daily_updates_cache');
      if (cache) {
        const parsed = JSON.parse(cache);
        if (Array.isArray(parsed?.reports) && parsed.reports.length > 0) {
          return parsed.reports;
        }
      }
      const data = localStorage.getItem('arogyamitra_daily_reports');
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // Fallback
    }
    return [];
  },

  async submitDailyReport(reportData) {
    const reports = await this.getDailyReports();
    const newReport = {
      id: Date.now(),
      date: 'Just now',
      shift: reportData.shift || 'Morning Shift',
      icuAvailable: parseInt(reportData.icuAvailable, 10) || 0,
      icuTotal: 15,
      generalAvailable: parseInt(reportData.generalAvailable, 10) || 0,
      generalTotal: 85,
      myAdmissions: parseInt(reportData.myAdmissions, 10) || 0,
      doctorsOnDuty: parseInt(reportData.doctorsOnDuty, 10) || 0,
      ventilators: parseInt(reportData.ventilators, 10) || 0,
      oxygenBeds: parseInt(reportData.oxygenBeds, 10) || 0,
      dialysisUnits: parseInt(reportData.dialysisUnits, 10) || 0,
      operationTheatres: parseInt(reportData.operationTheatres, 10) || 0,
      remarks: reportData.remarks || 'No special remarks.',
      submittedBy: getSevakAuthorName(),
    };

    // Update current hospital stats as well
    await this.updateHospitalStats({
      icuAvailable: newReport.icuAvailable,
      generalAvailable: newReport.generalAvailable,
      doctorsOnDuty: newReport.doctorsOnDuty,
      opdAdmissionsToday: newReport.myAdmissions,
    });

    const updatedReports = [newReport, ...reports];
    localStorage.setItem('arogyamitra_daily_reports', JSON.stringify(updatedReports));
    return updatedReports;
  },

  async getUrgentRequests(filters = {}) {
    try {
      const res = await api.get('/escalations');
      if (res?.data?.requests && Array.isArray(res.data.requests) && res.data.requests.length > 0) {
        localStorage.setItem('arogyamitra_urgent_requests', JSON.stringify(res.data.requests));
        return res.data.requests;
      }
    } catch (err) {
      console.warn('[patientService] Remote /api/escalations notice:', err.message);
    }

    const data = localStorage.getItem('arogyamitra_urgent_requests');
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        console.error('Error parsing urgent requests:', e);
      }
    }
    return [];
  },

  async addUrgentRequest(newReqData) {
    try {
      const payload = {
        applicationId: newReqData.caseId || newReqData.id,
        caseId: newReqData.caseId || newReqData.id,
        reasonType: newReqData.reasonType,
        requiredSpecialty: newReqData.requiredSpecialty || null,
        estimatedBill: newReqData.estimatedBill || null,
        remarks: newReqData.remarks || '',
        attachmentName: newReqData.attachment || null,
        attachmentUrl: newReqData.attachmentUrl || null,
        putOnHold: newReqData.putOnHold !== undefined ? newReqData.putOnHold : true,
      };
      const res = await api.post('/escalations', payload);
      if (res?.data) {
        const freshList = await this.getUrgentRequests();
        return freshList;
      }
    } catch (err) {
      console.warn('[patientService] Remote addUrgentRequest notice:', err.message);
    }

    const list = await this.getUrgentRequests();
    const formattedDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }) + `, ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}`;

    const newRequest = {
      id: `ESC-${Math.floor(1000 + Math.random() * 9000)}`,
      caseId: newReqData.caseId || `CAS-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      patientName: newReqData.patientName,
      ageGender: newReqData.ageGender || '45 yrs • Male',
      ward: newReqData.ward || 'General Ward',
      scheme: newReqData.scheme || 'MJPJAY',
      schemeLimit: newReqData.schemeLimit || '₹1.5L',
      reasonType: newReqData.reasonType,
      reasonTitle: newReqData.reasonType === 'bill_exceeded' 
        ? 'Hospital Bill Exceeded Scheme Limit' 
        : 'Facility / Specialty Unavailable',
      reasonBadge: newReqData.reasonType === 'bill_exceeded' ? 'Bill Exceeded' : 'Specialty Unavailable',
      status: 'on_hold',
      statusLabel: 'ON HOLD',
      statusBadge: 'Under Review',
      requiredSpecialty: newReqData.requiredSpecialty || '',
      assignedHospital: newReqData.assignedHospital || '',
      sanctionedScheme: newReqData.sanctionedScheme || '',
      estimatedBill: newReqData.estimatedBill || '1,85,000',
      remarks: newReqData.remarks || 'Urgent intervention requested',
      attachment: newReqData.attachment || null,
      attachmentUrl: newReqData.attachmentUrl || null,
      submittedAt: formattedDate,
      submittedBy: 'Arogya Sevak',
      putOnHold: newReqData.putOnHold !== undefined ? newReqData.putOnHold : true,
    };

    const updatedList = [newRequest, ...list];
    localStorage.setItem('arogyamitra_urgent_requests', JSON.stringify(updatedList));
    return updatedList;
  },

  async resetToDefault() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_PATIENTS));
    localStorage.removeItem('arogyamitra_hospital_stats');
    localStorage.removeItem('arogyamitra_bulletins');
    localStorage.removeItem('arogyamitra_daily_reports');
    localStorage.removeItem('arogyamitra_urgent_requests');
    return INITIAL_PATIENTS;
  },
};

export default patientService;



