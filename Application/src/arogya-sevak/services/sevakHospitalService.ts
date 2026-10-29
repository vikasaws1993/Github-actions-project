import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../../api/client';
import { uploadDocumentToS3 } from '../../api/s3Api';
import { storage } from '../../shared/services/storage/storage';
import { APP_CONFIG } from '../../shared/constants/config';
import { UserProfile } from '../../shared/types/common.types';
import { sevakNotificationService } from './sevakNotificationService';
import {
  HospitalFacilityProfile,
  HospitalCapacityData,
  HospitalDoctor,
  HospitalResourceCount,
  AdditionalHospitalFacility,
  AllocatedPatientCase,
  TreatmentStatus,
  RequestedDocument,
  AdditionalMedicalDocument,
  TreatmentTimelineItem,
  ClinicalCondition,
  SchemePreAuthStatus,
  WardRoundNote,
  CaseAdminEscalation,
  EscalationType,
  EscalationStatus,
} from '../types/sevakHospital.types';

export type {
  HospitalFacilityProfile,
  HospitalCapacityData,
  HospitalDoctor,
  HospitalResourceCount,
  AdditionalHospitalFacility,
  AllocatedPatientCase,
  TreatmentStatus,
  RequestedDocument,
  AdditionalMedicalDocument,
  TreatmentTimelineItem,
  ClinicalCondition,
  SchemePreAuthStatus,
  WardRoundNote,
  CaseAdminEscalation,
  EscalationType,
  EscalationStatus,
};

export const DEFAULT_CAPACITY_DATA: HospitalCapacityData = {
  ipd: {
    noOfWards: '',
    generalBeds: '',
    icuUnits: '',
    nicuBeds: '',
    picuBeds: '',
    isolationBeds: '',
  },
  diagnosis: {
    xray: { available: 'No', count: '' },
    mri: { available: 'No', count: '' },
    ultrasound: { available: 'No', count: '' },
    ctScan: { available: 'No', count: '' },
    ecg: { available: 'No', count: '' },
    endoscopy: { available: 'No', count: '' },
  },
  operative: {
    operationTheatresAvailable: false,
    operationTheatres: '',
    recoveryBedsAvailable: false,
    recoveryBeds: '',
    dialysisUnitsAvailable: false,
    dialysisUnits: '',
  },
  emergency: {
    emergencyBedsAvailable: false,
    emergencyBeds: '',
    ambulancesAvailable: false,
    ambulances: '',
  },
  bloodBank: {
    bloodGroups: {
      'A+': false,
      'A-': false,
      'B+': false,
      'B-': false,
      'AB+': false,
      'AB-': false,
      'O+': false,
      'O-': false,
    },
  },
};

const getHospitalStorageKey = async (): Promise<string> => {
  try {
    const user = await storage.getItem<UserProfile>(APP_CONFIG.STORAGE_KEYS.USER_PROFILE);
    if (user?.id) return `@arogyamitra_sevak_hospital_profile_${user.id}`;
    if (user?.phoneNumber) return `@arogyamitra_sevak_hospital_profile_${user.phoneNumber}`;
  } catch (_) {}
  return '@arogyamitra_sevak_hospital_profile';
};

const STORAGE_KEYS = {
  HOSPITAL_PROFILE: '@arogyamitra_sevak_hospital_profile',
  ALLOCATED_CASES: '@arogyamitra_sevak_allocated_cases',
};

// In-Memory RAM Cache for Blazing Fast Instant UI Navigation (< 1ms)
let memoryAllocatedCases: AllocatedPatientCase[] | null = null;
let lastAllocatedCasesTimestamp = 0;
let memoryHospitalProfile: HospitalFacilityProfile | null = null;
let lastHospitalProfileTimestamp = 0;
const FAST_CACHE_TTL_MS = 30000; // 30 seconds RAM cache TTL

export const INITIAL_HOSPITAL_PROFILE: HospitalFacilityProfile = {
  id: '',
  assignedHospitalId: '',
  hospitalName: '',
  hospitalType: 'Government / Public',
  fullAddress: '',
  streetAddress: '',
  city: '',
  district: '',
  taluka: '',
  pincode: '',
  landmark: '',
  contactHelpline: '',
  is24x7EmergencyAvailable: null,
  isAmbulanceAvailable: null,

  capacity: DEFAULT_CAPACITY_DATA,

  selectedSpecialities: [],
  specializations: [],
  additionalSpecialities: [],

  selectedPackages: [],
  doctorsList: [],
  resourceCount: {
    totalDoctors: '',
    nursingStaff: '',
    paramedicalStaff: '',
    supportStaff: '',
  },

  operations: {
    majorSurgery: null,
    emergencySurgery: null,
    cSection: null,
    fractureOrthoSurgery: null,
    brainNeurosurgery: null,
    heartSurgery: null,
    angioplasty: null,
    cancerTreatment: null,
    dialysisUnit: null,
    otherMajorProcedures: null,
  },

  bedAvailability: {
    totalHospitalBeds: 0,
    availableHospitalBeds: 0,
    totalIcuBeds: 0,
    availableIcuBeds: 0,
    totalEmergencyBeds: 0,
    availableEmergencyBeds: 0,
  },

  criticalResources: {
    icuUnit: { available: null, total: 0 },
    ventilators: { available: null, total: 0 },
    oxygenBeds: { available: null, total: 0 },
    dialysisMachines: { available: null, total: 0 },
    operationTheatres: { available: null, total: 0 },
    bloodBank: { available: null, total: 0 },
    ctScan: { available: null, total: 0 },
    mriMachine: { available: null, total: 0 },
    xRayUnit: { available: null, total: 0 },
    ultrasound: { available: null, total: 0 },
  },

  emergencyCapability: {
    handleCriticalPatients: null,
    performEmergencySurgery: null,
    icuSupport24x7: null,
    ventilatorSupport: null,
    emergencyBloodTransfusion: null,
  },

  currentStatus: {
    operationalStatus: 'Fully Operational',
    acceptingNewPatients: null,
    emergencyLoad: '',
    serviceUnavailable: null,
    verifiedBySevak: false,
    sevakRemarks: '',
    lastUpdated: '',
  },
};

export const EMPTY_HOSPITAL_SURVEY_PROFILE: HospitalFacilityProfile = {
  id: '',
  assignedHospitalId: '',
  hospitalName: '',
  hospitalType: 'Government / Public',
  fullAddress: '',
  streetAddress: '',
  city: '',
  district: '',
  taluka: '',
  pincode: '',
  landmark: '',
  contactHelpline: '',
  is24x7EmergencyAvailable: null,
  isAmbulanceAvailable: null,

  capacity: DEFAULT_CAPACITY_DATA,

  selectedSpecialities: [],
  specializations: [],
  additionalSpecialities: [],

  selectedPackages: [],
  doctorsList: [],
  resourceCount: {
    totalDoctors: '',
    nursingStaff: '',
    paramedicalStaff: '',
    supportStaff: '',
  },

  operations: {
    majorSurgery: null,
    emergencySurgery: null,
    cSection: null,
    fractureOrthoSurgery: null,
    brainNeurosurgery: null,
    heartSurgery: null,
    angioplasty: null,
    cancerTreatment: null,
    dialysisUnit: null,
    otherMajorProcedures: null,
  },

  bedAvailability: {
    totalHospitalBeds: 0,
    availableHospitalBeds: 0,
    totalIcuBeds: 0,
    availableIcuBeds: 0,
    totalEmergencyBeds: 0,
    availableEmergencyBeds: 0,
  },

  criticalResources: {
    icuUnit: { available: null, total: 0 },
    ventilators: { available: null, total: 0 },
    oxygenBeds: { available: null, total: 0 },
    dialysisMachines: { available: null, total: 0 },
    operationTheatres: { available: null, total: 0 },
    bloodBank: { available: null, total: 0 },
    ctScan: { available: null, total: 0 },
    mriMachine: { available: null, total: 0 },
    xRayUnit: { available: null, total: 0 },
    ultrasound: { available: null, total: 0 },
  },

  emergencyCapability: {
    handleCriticalPatients: null,
    performEmergencySurgery: null,
    icuSupport24x7: null,
    ventilatorSupport: null,
    emergencyBloodTransfusion: null,
  },

  currentStatus: {
    operationalStatus: 'Fully Operational',
    acceptingNewPatients: null,
    emergencyLoad: '',
    serviceUnavailable: null,
    verifiedBySevak: false,
    sevakRemarks: '',
    lastUpdated: '',
  },
};

const mapStatusToTreatmentStatus = (status?: string): TreatmentStatus => {
  if (!status) return 'Admitted';
  const clean = status.trim().toUpperCase();
  if (clean === 'TRANSFERRED') return 'Transferred';
  if (clean === 'ADMITTED') return 'Admitted';
  if (clean === 'DIAGNOSTIC' || clean === 'DIAGNOSTIC_STAGE' || clean === 'DIAGNOSTIC STAGE') return 'Diagnostic Stage';
  if (
    clean === 'POST_OP' ||
    clean === 'POST-OP' ||
    clean === 'POST OP' ||
    clean === 'POST_OP_RECOVERY' ||
    clean === 'POST-OP RECOVERY' ||
    clean === 'POST OP RECOVERY' ||
    clean.includes('POST-OP') ||
    clean.includes('POST OP') ||
    clean.includes('POST_OP')
  ) {
    return 'Post-Op Recovery';
  }
  if (clean.includes('SURGERY')) return 'Surgery Scheduled';
  if (clean === 'ON_HOLD' || clean === 'ON HOLD' || clean === 'DOCS_REQUIRED' || clean === 'REVERTED' || clean.includes('HOLD')) return 'On Hold';
  if (clean === 'DISCHARGED') return 'Discharged';
  if (clean === 'COMPLETED' || clean === 'CLOSED') return 'Completed';
  if (clean === 'UNDER_TREATMENT' || clean === 'UNDER TREATMENT' || clean === 'TREATMENT_STARTED' || clean === 'TREATMENT_IN_PROGRESS') return 'Under Treatment';
  // Default status for new / approved / assigned cases is Admitted
  return 'Admitted';
};

const mapSchemeName = (scheme?: any): 'MJPJAY' | 'PM-JAY' | 'RSBY' | 'ESIC' => {
  const name = typeof scheme === 'string' ? scheme : (scheme?.name || scheme?.code || '');
  if (name.includes('PM-JAY') || name.includes('PMJAY') || name.includes('Ayushman')) return 'PM-JAY';
  if (name.includes('RSBY')) return 'RSBY';
  if (name.includes('ESIC')) return 'ESIC';
  return 'MJPJAY';
};

const normalizeBackendApplication = (app: any, existingLocal?: AllocatedPatientCase): AllocatedPatientCase => {
  const appId = app.id || app.caseId || app.applicationNumber || app.uuid || `CAS-${Date.now()}`;
  
  let calculatedAge = app.patient?.age != null ? Number(app.patient.age) : (app.age != null ? Number(app.age) : null);
  if (calculatedAge === null && app.patient?.dob) {
    try {
      const birthYear = new Date(app.patient.dob).getFullYear();
      if (!isNaN(birthYear)) {
        calculatedAge = new Date().getFullYear() - birthYear;
      }
    } catch (_) {}
  }
  if (!calculatedAge) calculatedAge = existingLocal?.age || 35;

  const rawGender = app.patient?.gender || app.gender || existingLocal?.gender || 'Male';
  const normalizedGender: 'Male' | 'Female' | 'Other' =
    rawGender.toLowerCase().startsWith('f') ? 'Female' : (rawGender.toLowerCase().startsWith('o') ? 'Other' : 'Male');

  const patientName =
    (app.patientName && app.patientName !== 'Patient' ? app.patientName : null) ||
    (app.patient_name && app.patient_name !== 'Patient' ? app.patient_name : null) ||
    (app.patient?.name && app.patient?.name !== 'Patient' ? app.patient?.name : null) ||
    (app.patient?.fullName && app.patient?.fullName !== 'Patient' ? app.patient?.fullName : null) ||
    (app.patient?.full_name && app.patient?.full_name !== 'Patient' ? app.patient?.full_name : null) ||
    (app.name && app.name !== 'Patient' ? app.name : null) ||
    existingLocal?.patientName ||
    app.patientName ||
    app.patient_name ||
    'Assigned Patient';

  const contactPhone =
    app.patient?.mobile ||
    app.patient_mobile ||
    app.contactMobile ||
    app.contactPhone ||
    app.patient_phone ||
    app.phone ||
    app.mobile ||
    app.contact ||
    existingLocal?.contactPhone ||
    '—';

  const relativeName =
    app.relativeName ||
    app.relative_name ||
    app.relative?.name ||
    app.applicant?.name ||
    app.citizen_name ||
    existingLocal?.relativeName ||
    '—';

  const relativePhone =
    app.relativePhone ||
    app.relative_phone ||
    app.relative?.mobile ||
    app.relative?.phone ||
    app.applicant?.mobile ||
    app.citizen_mobile ||
    existingLocal?.relativePhone ||
    '—';

  const relativeRelation =
    app.relativeRelation ||
    app.relative_relation ||
    app.relative?.relation ||
    app.relationship_with_citizen ||
    app.patient?.relationship ||
    existingLocal?.relativeRelation ||
    'Relative';

  const abhaId =
    app.patient?.abhaId ||
    app.patient?.abha ||
    app.patient_abha ||
    app.abhaId ||
    app.abha_id ||
    app.abha ||
    existingLocal?.abhaId ||
    '—';

  const schemeName = mapSchemeName(app.assignedScheme || app.schemeName || app.scheme || existingLocal?.schemeName);
  const hospitalName = app.assignedHospital || app.hospitalName || app.hospital_name || existingLocal?.hospitalName || 'City Care Hospital, Pune';
  const assignedWard = app.ward || app.assignedWard || app.assigned_ward || existingLocal?.assignedWard || (app.treatmentType === 'IPD' ? 'IPD Ward' : 'General Ward');
  const bedNumber = app.bedNumber || app.bed_number || existingLocal?.bedNumber || 'GEN-01';
  const admissionDate = app.admissionDate || app.admission_date || app.submittedDate || existingLocal?.admissionDate || 'Today';
  const diagnosis = app.condition || app.diagnosis || app.medicalCauseNote || existingLocal?.diagnosis || 'Clinical Assessment';
  const treatingDoctor = app.treatingDoctor || app.treating_doctor || app.doctor || existingLocal?.treatingDoctor || 'Attending Physician';

  // Check if case is transferred out (transferred to another hospital / sevak)
  const isTransferredOut = Boolean(
    app.isTransferredOut ||
    app.is_transferred_out ||
    app.assignment_status === 'TRANSFERRED' ||
    app.status === 'TRANSFERRED' ||
    existingLocal?.isTransferredOut ||
    existingLocal?.treatmentStatus === 'Transferred'
  );

  const rawTreatmentStage =
    app.treatmentStage ||
    app.treatment_stage ||
    app.sevakReportedStatus ||
    app.sevak_reported_status ||
    app.status ||
    existingLocal?.treatmentStatus;

  const treatmentStatus: TreatmentStatus = isTransferredOut
    ? 'Transferred'
    : mapStatusToTreatmentStatus(rawTreatmentStage);

  // Check if case is reassigned/incoming to this sevak
  const isReassigned = Boolean(
    !isTransferredOut && (
      app.isReassigned ||
      app.is_transferred ||
      app.isTransferred ||
      app.status === 'REASSIGNED_TRANSFER' ||
      app.status === 'REASSIGNED' ||
      app.remarks?.includes('REASSIGNED') ||
      app.remarks?.includes('Transferred from') ||
      existingLocal?.isReassigned
    )
  );

  // Priority Note (Preserve backend-customized Sevak 1 or Sevak 2 note)
  let priorityNote = app.priorityNote || existingLocal?.priorityNote;
  if (!priorityNote && (isReassigned || isTransferredOut || app.priority === 'CRITICAL' || app.priority === 'HIGH' || app.priority === 'URGENT' || app.remarks?.includes('URGENT'))) {
    priorityNote = {
      id: `note-${appId}`,
      text: isTransferredOut
        ? `🚨 रुग्ण वर्ग मंजुरी: केस #${appId} ची वर्ग विनंती मंजूर झाली आहे. रुग्ण '${app.assignedToNewHospital || 'नवीन रुग्णालय'}' येथे नवीन आरोग्य सेवक '${app.assignedToNewSevak?.name || 'आरोग्य सेवक'}' यांच्याकडे वर्ग केला आहे. कृपया रुग्ण नवीन रुग्णालयाकडे रवाना करा.`
        : (app.remarks || (isReassigned ? 'Reassigned & Transferred Case: Priority intake and coordination requested.' : 'Priority attention requested by Admin.')),
      adminName: 'District Health Officer / Admin',
      designation: 'Health Dept Supervisor',
      date: 'Today',
      level: isTransferredOut ? 'HIGH' : 'CRITICAL',
      badge: isTransferredOut ? 'Case Transferred' : (isReassigned ? 'Reassigned Case' : (app.priority || 'CRITICAL')),
      badge_en: isTransferredOut ? 'Case Transferred' : (isReassigned ? 'Reassigned Case' : 'CRITICAL'),
      badge_hi: isTransferredOut ? 'केस स्थानांतरित' : (isReassigned ? 'पुनर्निर्देशित प्रकरण' : 'अति-आवश्यक'),
      isReassigned: !isTransferredOut && isReassigned,
      isTransferredOut,
    };
  }

  // Treatment timeline (Dynamically parsed from Backend updateHistory / clinicalNotes / local cache)
  let treatmentHistory: TreatmentTimelineItem[] = [];

  const rawHistoryList =
    Array.isArray(app.updateHistory) && app.updateHistory.length > 0
      ? app.updateHistory
      : Array.isArray(app.update_history) && app.update_history.length > 0
      ? app.update_history
      : Array.isArray(app.clinicalNotes) && app.clinicalNotes.length > 0
      ? app.clinicalNotes
      : Array.isArray(app.clinical_notes) && app.clinical_notes.length > 0
      ? app.clinical_notes
      : null;

  if (rawHistoryList && rawHistoryList.length > 0) {
    treatmentHistory = rawHistoryList.map((uh: any, idx: number) => {
      const typeStr = typeof uh.type === 'string' ? uh.type : '';
      const noteStr = typeof uh.update === 'string' ? uh.update : (typeof uh.note === 'string' ? uh.note : '');

      let rawCandidate = uh.stage || typeStr.replace(/\s+Update$/i, '') || uh.status;
      if (!rawCandidate || rawCandidate === 'Treatment' || rawCandidate === 'Clinical') {
        if (noteStr.includes('Post-Op') || noteStr.includes('Post Op')) {
          rawCandidate = 'Post-Op Recovery';
        } else if (noteStr.includes('Surgery')) {
          rawCandidate = 'Surgery Scheduled';
        } else if (noteStr.includes('Diagnostic')) {
          rawCandidate = 'Diagnostic Stage';
        } else if (noteStr.includes('Admitted')) {
          rawCandidate = 'Admitted';
        }
      }

      const st = mapStatusToTreatmentStatus(rawCandidate || treatmentStatus);
      const timeDisplay =
        uh.date ||
        (uh.timestamp
          ? new Date(uh.timestamp).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : 'Today');
      return {
        id: `th-${appId}-uh-${idx}-${uh.timestamp || idx}`,
        status: st,
        timestamp: timeDisplay,
        note: uh.update || uh.note || uh.remarks || `Current Status: ${st}`,
        updatedBy: uh.by || uh.sevakName || uh.updatedBy || 'Arogya Sevak',
      };
    });
  } else if (existingLocal?.treatmentHistory?.length) {
    treatmentHistory = existingLocal.treatmentHistory;
  } else {
    // Initial default timeline
    treatmentHistory = [
      {
        id: `th-${appId}-1`,
        status: isTransferredOut ? 'Transferred' : (isReassigned ? 'Admitted' : 'Admitted'),
        timestamp: admissionDate,
        note: isTransferredOut
          ? `🚑 Case transferred to another facility: ${app.assignedToNewHospital || app.toHospital || 'New Hospital'}`
          : isReassigned
          ? `🚨 Reassigned Case transferred to hospital. ${app.remarks || 'Priority patient intake in progress.'}`
          : 'Patient admitted & case assigned to Arogya Sevak.',
        updatedBy: 'Arogya Sevak',
      },
      {
        id: `th-${appId}-2`,
        status: treatmentStatus,
        timestamp: 'Today',
        note: `Current Status: ${treatmentStatus}`,
        updatedBy: 'Arogya Sevak',
      },
    ];
  }

  // Extract Admin Requested Documents first so we can cleanly separate them from additional medical docs
  const rawDocs = app.documents || app.application_documents || app.docs || [];
  const requestedDocsList: RequestedDocument[] = [];
  const addedDocIds = new Set<string>();
  const addedDocTitles = new Set<string>();

  // 1. From app.requestedDocuments (formatted by backend)
  if (Array.isArray(app.requestedDocuments)) {
    app.requestedDocuments.forEach((rd: any, idx: number) => {
      const title = rd.title || rd.name || rd.requestedDocName || 'Requested Document';
      const rdId = String(rd.id || `req-doc-${idx + 1}`);
      addedDocIds.add(rdId.toLowerCase());
      addedDocTitles.add(title.toLowerCase().trim());
      requestedDocsList.push({
        id: rdId,
        title,
        description: rd.description || rd.verification_remark || rd.reason || 'Clinical document requested by Admin',
        isRequired: rd.isRequired ?? true,
        status: (rd.status === 'verified' || rd.status === 'VERIFIED')
          ? 'verified'
          : (rd.status === 'uploaded' || rd.status === 'UPLOADED' || (rd.file_url && rd.file_url !== '' && rd.file_url !== 'Pending Upload'))
          ? 'uploaded'
          : 'pending',
        uploadedDoc: (rd.file_url || rd.fileUrl || rd.url || rd.uri) ? {
          name: rd.file_name || rd.name || 'document.pdf',
          uri: rd.file_url || rd.fileUrl || rd.url || rd.uri,
          size: rd.file_size || rd.size || '1.2 MB',
          timestamp: rd.uploaded_at ? new Date(rd.uploaded_at).toLocaleDateString() : 'Uploaded',
          type: rd.mime_type || (rd.file_url?.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
        } : undefined,
      });
    });
  }

  // 2. From raw app.documents (checking for PENDING_SEVAK_UPLOAD, PENDING_CITIZEN_UPLOAD, or Sevak document requests)
  if (Array.isArray(rawDocs)) {
    rawDocs.forEach((d: any, idx: number) => {
      const docStatus = String(d.document_status || d.status || '').toUpperCase();
      const rawTitle = (d.title || d.file_name || d.name || '').trim();
      const hasFile = Boolean(d.file_url && d.file_url !== '' && d.file_url !== 'Pending Upload');
      const isPending = !hasFile || docStatus === 'PENDING_SEVAK_UPLOAD' || docStatus === 'PENDING_CITIZEN_UPLOAD' || d.file_name === 'Pending Upload';
      const isSevakReq = Boolean(d.is_sevak_upload || d.uploaded_by_role === 'AROGYA_SEVAK' || docStatus === 'PENDING_SEVAK_UPLOAD' || isPending);

      if (isPending || isSevakReq) {
        const dId = String(d.id || d.docId || `req-doc-raw-${idx + 1}`);
        const title = rawTitle && rawTitle !== 'Pending Upload' ? rawTitle : 'Requested Document';
        if (!addedDocIds.has(dId.toLowerCase()) && !addedDocTitles.has(title.toLowerCase())) {
          addedDocIds.add(dId.toLowerCase());
          addedDocTitles.add(title.toLowerCase());
          requestedDocsList.push({
            id: dId,
            title,
            description: d.verification_remark || d.description || d.reason || 'Clinical document requested by Admin',
            isRequired: true,
            status: docStatus === 'VERIFIED' ? 'verified' : (hasFile && !isPending ? 'uploaded' : 'pending'),
            uploadedDoc: (hasFile && !isPending) ? {
              name: d.file_name || d.name || 'document.pdf',
              uri: d.file_url || d.fileUrl || d.url || d.uri,
              size: d.file_size || d.size || '1.2 MB',
              timestamp: d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString() : 'Uploaded',
              type: d.mime_type || (d.file_url?.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
            } : undefined,
          });
        }
      }
    });
  }

  // 3. From app.revert_details / app.revertDetails
  const rev = app.revert_details || app.revertDetails;
  const hasUploadedSevakDocs = (rawDocs || []).some(
    (d: any) => Boolean(d.file_url && d.file_url !== '' && d.file_url !== 'Pending Upload') && (d.is_sevak_upload || d.uploaded_by_role === 'AROGYA_SEVAK')
  );

  if (rev && (rev.requestedDocName || rev.requested_doc_name)) {
    const revName = (rev.requestedDocName || rev.requested_doc_name).trim();
    const revId = `req-revert-${appId}`;
    const isResolved = Boolean(rev.isResolved || rev.is_resolved || hasUploadedSevakDocs);
    if (!addedDocIds.has(revId.toLowerCase()) && !addedDocTitles.has(revName.toLowerCase())) {
      addedDocIds.add(revId.toLowerCase());
      addedDocTitles.add(revName.toLowerCase());
      requestedDocsList.push({
        id: revId,
        title: revName,
        description: rev.reason || 'Requested by Admin for case verification',
        isRequired: true,
        status: isResolved ? 'uploaded' : 'pending',
      });
    }
  }

  // 4. From remarks ONLY if there are genuine pending documents
  const remarkText = String(app.remarks || '');
  if (remarkText.includes('Document requested from') || remarkText.includes('कागदपत्र मागितले')) {
    const match = remarkText.match(/Document requested from (?:ArogyaSevak|Citizen):\s*([^.]+?)(?:\.|$)/i);
    if (match && match[1]) {
      const docNameFromRemark = match[1].trim();
      const remId = `req-rem-${appId}`;
      const isResolved = hasUploadedSevakDocs || (rev && (rev.isResolved || rev.is_resolved));
      if (!addedDocIds.has(remId.toLowerCase()) && !addedDocTitles.has(docNameFromRemark.toLowerCase())) {
        addedDocIds.add(remId.toLowerCase());
        addedDocTitles.add(docNameFromRemark.toLowerCase());
        requestedDocsList.push({
          id: remId,
          title: docNameFromRemark,
          description: remarkText,
          isRequired: true,
          status: isResolved ? 'uploaded' : 'pending',
        });
      }
    }
  }

  // Merge with local existing requestedDocuments
  if (Array.isArray(existingLocal?.requestedDocuments)) {
    existingLocal.requestedDocuments.forEach((localReq) => {
      const matchIndex = requestedDocsList.findIndex(
        r => r.id.toLowerCase() === localReq.id.toLowerCase() || r.title.toLowerCase().trim() === localReq.title.toLowerCase().trim()
      );
      if (matchIndex >= 0) {
        if (localReq.status === 'uploaded' && requestedDocsList[matchIndex].status === 'pending') {
          requestedDocsList[matchIndex] = {
            ...requestedDocsList[matchIndex],
            status: 'uploaded',
            uploadedDoc: localReq.uploadedDoc || requestedDocsList[matchIndex].uploadedDoc,
          };
        }
      } else {
        requestedDocsList.push(localReq);
        addedDocTitles.add(localReq.title.toLowerCase().trim());
      }
    });
  }

  // Deduplicate: If an uploaded document with temporary name exists alongside canonical title, merge them!
  const canonicalReqDocs = requestedDocsList.filter(
    (it) => !it.title.startsWith('rn_image_picker') && !it.title.startsWith('image_picker')
  );
  const tempPickerReqDocs = requestedDocsList.filter(
    (it) => it.title.startsWith('rn_image_picker') || it.title.startsWith('image_picker')
  );

  let finalRequestedDocs = requestedDocsList;
  if (canonicalReqDocs.length > 0 && tempPickerReqDocs.length > 0) {
    canonicalReqDocs.forEach((cDoc) => {
      const tempWithFile = tempPickerReqDocs.find((t) => t.status === 'uploaded' || t.uploadedDoc);
      if (tempWithFile) {
        cDoc.status = 'uploaded';
        cDoc.uploadedDoc = tempWithFile.uploadedDoc || cDoc.uploadedDoc;
      }
    });
    finalRequestedDocs = canonicalReqDocs;
  }

  // Extract and normalize documents from backend (ONLY valid, uploaded files that are not pending requested docs)
  const backendDocs: AdditionalMedicalDocument[] = Array.isArray(rawDocs)
    ? rawDocs
        .filter((d: any) => {
          const docStatus = String(d.document_status || d.status || '').toUpperCase();
          const rawName = (d.title || d.file_name || d.name || '').toLowerCase().trim();
          const hasValidFile = Boolean(d.file_url && d.file_url !== '' && d.file_url !== 'Pending Upload' && !d.file_url.startsWith('undefined'));
          const isPending = docStatus === 'PENDING_SEVAK_UPLOAD' || docStatus === 'PENDING_CITIZEN_UPLOAD' || !hasValidFile;
          // Exclude if it's pending OR if its title matches an unfulfilled requested doc
          const isPendingRequestedDoc = requestedDocsList.some(
            (r) => r.status === 'pending' && r.title.toLowerCase().trim() === rawName
          );
          return hasValidFile && !isPending && !isPendingRequestedDoc;
        })
        .map((d: any, idx: number) => ({
          id: String(d.id || d.docId || `doc-${appId}-${idx}`),
          title: d.title || d.file_name || d.name || d.category || `Medical Document ${idx + 1}`,
          name: d.file_name || d.name || `Document_${idx + 1}.pdf`,
          uri: d.file_url || d.url || d.secure_url || d.fileUrl || d.uri || '',
          size: d.file_size || d.size || '1.2 MB',
          timestamp: d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recently',
          type: d.mime_type || d.type || (d.file_url?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
          note: d.verification_remark || d.note || '',
        }))
    : [];

  // Merge with existing local docs, filtering out empty placeholders or pending requested docs
  const existingDocs = (existingLocal?.additionalMedicalDocs || []).filter((localDoc) => {
    const hasValidUri = Boolean(localDoc.uri && localDoc.uri !== '' && localDoc.uri !== 'Pending Upload');
    const matchesPendingReq = finalRequestedDocs.some(
      (r) => r.status === 'pending' && r.title.toLowerCase().trim() === (localDoc.title || localDoc.name || '').toLowerCase().trim()
    );
    return hasValidUri && !matchesPendingReq;
  });

  const mergedDocs = [...backendDocs];
  existingDocs.forEach((localDoc) => {
    if (!mergedDocs.some((d) => d.id === localDoc.id || (d.uri && d.uri === localDoc.uri))) {
      mergedDocs.push(localDoc);
    }
  });

  return {
    id: appId,
    patientName,
    age: calculatedAge,
    gender: normalizedGender,
    contactPhone,
    relativeName,
    relativePhone,
    relativeRelation,
    abhaId,
    schemeName,
    hospitalName,
    assignedWard,
    bedNumber,
    admissionDate,
    diagnosis,
    treatingDoctor,
    treatmentStatus,
    priorityNote,
    isReassigned,
    reassignedBadge: isReassigned ? 'Reassigned Case' : undefined,
    transferredFromHospital: app.transferredFromHospital || app.transferred_from_hospital || existingLocal?.transferredFromHospital,
    previousSevak: app.previousSevak || app.previous_sevak || existingLocal?.previousSevak,
    transferReason: app.transferReason || app.transfer_reason || existingLocal?.transferReason,
    isTransferredOut,
    patientMovedStatus: app.patientMovedStatus || existingLocal?.patientMovedStatus || (isTransferredOut ? 'PENDING_DISPATCH' : undefined),
    patientMovedAt: app.patientMovedAt || existingLocal?.patientMovedAt,
    patientAdmittedStatus: app.patientAdmittedStatus || existingLocal?.patientAdmittedStatus || (isReassigned ? (existingLocal?.patientAdmittedStatus || 'PENDING_ADMISSION') : 'ADMITTED'),
    patientAdmittedAt: app.patientAdmittedAt || existingLocal?.patientAdmittedAt,
    assignedToNewHospital: app.assignedToNewHospital || app.assigned_hospital_name || app.toHospital || existingLocal?.assignedToNewHospital,
    assignedToNewSevak: app.assignedToNewSevak || app.newSevak || existingLocal?.assignedToNewSevak,
    requestedDocuments: finalRequestedDocs,
    additionalMedicalDocs: mergedDocs,
    treatmentHistory,
    clinicalCondition: existingLocal?.clinicalCondition || 'Stable',
    schemePreAuthStatus: existingLocal?.schemePreAuthStatus || 'Pre-Auth Approved',
    activeEscalation: existingLocal?.activeEscalation,
    escalationHistory: existingLocal?.escalationHistory || [],
  };
};

export const INITIAL_ALLOCATED_CASES: AllocatedPatientCase[] = [];

const parseSpecializationsFromBackend = (
  rawSpecs: any
): { specializations: string[]; additional: AdditionalHospitalFacility[] } => {
  if (!rawSpecs) return { specializations: [], additional: [] };

  const result: string[] = [];
  const additional: AdditionalHospitalFacility[] = [];

  if (Array.isArray(rawSpecs)) {
    rawSpecs.forEach((s) => {
      if (typeof s === 'string' && s.trim()) {
        result.push(s.trim());
      }
    });
    return { specializations: Array.from(new Set(result)), additional: [] };
  }

  if (Array.isArray(rawSpecs.list)) {
    rawSpecs.list.forEach((s: any) => {
      if (typeof s === 'string' && s.trim()) {
        result.push(s.trim());
      }
    });
  }

  if (Array.isArray(rawSpecs.additional)) {
    additional.push(...rawSpecs.additional);
  }

  const keyToDisplayMap: Record<string, string> = {
    generalMedicine: 'General Medicine',
    generalSurgery: 'General Surgery',
    gynecology: 'Obstetrics & Gynecology',
    obstetrics: 'Obstetrics & Gynecology',
    obstetricsGynecology: 'Obstetrics & Gynecology',
    pediatrics: 'Pediatrics',
    orthopedics: 'Orthopedics',
    cardiology: 'Cardiology & Cath Lab',
    cardiologyCathLab: 'Cardiology & Cath Lab',
    neurology: 'Neurology & Neurosurgery',
    neurosurgery: 'Neurology & Neurosurgery',
    neurologyNeurosurgery: 'Neurology & Neurosurgery',
    oncology: 'Oncology (Cancer)',
    cancer: 'Oncology (Cancer)',
    nephrology: 'Nephrology & Dialysis',
    dialysis: 'Nephrology & Dialysis',
    emergency: 'Emergency & Trauma',
    emergencyTrauma: 'Emergency & Trauma',
    pulmonology: 'Pulmonology',
    ophthalmology: 'Ophthalmology (Eye)',
    eye: 'Ophthalmology (Eye)',
    ent: 'ENT (Ear, Nose, Throat)',
    dermatology: 'Dermatology',
    psychiatry: 'Psychiatry',
    urology: 'Urology',
    gastroenterology: 'Gastroenterology',
  };

  if (typeof rawSpecs === 'object') {
    Object.entries(rawSpecs).forEach(([k, v]) => {
      if (k === 'list' || k === 'additional') return;
      if (k === 'otherSpec' || k === 'otherSpecDesc') {
        if (k === 'otherSpec' && typeof v === 'string' && v.trim()) {
          additional.push({
            id: `spec-other-${Date.now()}`,
            name: v.trim(),
            isAvailable: true,
            about: typeof (rawSpecs as any).otherSpecDesc === 'string' ? (rawSpecs as any).otherSpecDesc : undefined,
          });
        }
        return;
      }

      const isSelected =
        v === true ||
        v === 1 ||
        v === 'Yes' ||
        v === 'YES' ||
        v === 'yes' ||
        v === 'true' ||
        (typeof v === 'object' && ((v as any)?.available === true || (v as any)?.available === 'Yes'));

      if (isSelected) {
        if (keyToDisplayMap[k]) {
          result.push(keyToDisplayMap[k]);
        } else {
          result.push(k);
        }
      }
    });
  }

  return { specializations: Array.from(new Set(result)), additional };
};

const parseOperationsFromBackend = (rawOps: any): HospitalFacilityProfile['operations'] => {
  if (!rawOps || typeof rawOps !== 'object') return EMPTY_HOSPITAL_SURVEY_PROFILE.operations;

  const toBool = (val: any): boolean | null => {
    if (val === null || val === undefined || val === '') return null;
    if (val === true || val === 'Yes' || val === 'YES' || val === 'yes' || val === 1 || val === 'true') return true;
    if (val === false || val === 'No' || val === 'NO' || val === 'no' || val === 0 || val === 'false') return false;
    return null;
  };

  return {
    majorSurgery: toBool(rawOps.majorSurgery),
    emergencySurgery: toBool(rawOps.emergencySurgery),
    cSection: toBool(rawOps.cSection),
    fractureOrthoSurgery: toBool(rawOps.fractureOrthoSurgery ?? rawOps.orthoSurgery),
    brainNeurosurgery: toBool(rawOps.brainNeurosurgery),
    heartSurgery: toBool(rawOps.heartSurgery),
    angioplasty: toBool(rawOps.angioplasty),
    cancerTreatment: toBool(rawOps.cancerTreatment),
    dialysisUnit: toBool(rawOps.dialysisUnit ?? rawOps.dialysis),
    otherMajorProcedures: toBool(rawOps.otherMajorProcedures ?? rawOps.otherProcedures),
  };
};

const parseCriticalResourcesFromBackend = (rawRes: any): HospitalFacilityProfile['criticalResources'] => {
  if (!rawRes || typeof rawRes !== 'object') return EMPTY_HOSPITAL_SURVEY_PROFILE.criticalResources;

  const toResource = (obj: any): { available: boolean | null; total: number } => {
    if (!obj) return { available: null, total: 0 };
    const availVal = obj.available ?? obj.isAvailable;
    let available: boolean | null = null;
    if (availVal === true || availVal === 'Yes' || availVal === 'YES' || availVal === 'yes' || availVal === 1) available = true;
    else if (availVal === false || availVal === 'No' || availVal === 'NO' || availVal === 'no' || availVal === 0) available = false;
    return {
      available,
      total: Number(obj.total || obj.count || 0),
    };
  };

  return {
    icuUnit: toResource(rawRes.icuUnit ?? rawRes.icu),
    ventilators: toResource(rawRes.ventilators ?? rawRes.ventilator),
    oxygenBeds: toResource(rawRes.oxygenBeds ?? rawRes.oxygenSupport),
    dialysisMachines: toResource(rawRes.dialysisMachines ?? rawRes.dialysisMachine),
    operationTheatres: toResource(rawRes.operationTheatres ?? rawRes.operationTheatre),
    bloodBank: toResource(rawRes.bloodBank),
    ctScan: toResource(rawRes.ctScan),
    mriMachine: toResource(rawRes.mriMachine ?? rawRes.mri),
    xRayUnit: toResource(rawRes.xRayUnit ?? rawRes.xRay),
    ultrasound: toResource(rawRes.ultrasound),
  };
};

const parseEmergencyCapabilityFromBackend = (rawCap: any): HospitalFacilityProfile['emergencyCapability'] => {
  if (!rawCap || typeof rawCap !== 'object') return EMPTY_HOSPITAL_SURVEY_PROFILE.emergencyCapability;

  const toBool = (val: any): boolean | null => {
    if (val === null || val === undefined || val === '') return null;
    if (val === true || val === 'Yes' || val === 'YES' || val === 'yes' || val === 1 || val === 'true') return true;
    if (val === false || val === 'No' || val === 'NO' || val === 'no' || val === 0 || val === 'false') return false;
    return null;
  };

  return {
    handleCriticalPatients: toBool(rawCap.handleCriticalPatients ?? rawCap.handleEmergency),
    performEmergencySurgery: toBool(rawCap.performEmergencySurgery),
    icuSupport24x7: toBool(rawCap.icuSupport24x7),
    ventilatorSupport: toBool(rawCap.ventilatorSupport),
    emergencyBloodTransfusion: toBool(rawCap.emergencyBloodTransfusion ?? rawCap.bloodTransfusion),
  };
};

export const getCompletedSurveySections = (prof: HospitalFacilityProfile): number[] => {
  if (!prof) return [];
  const completed: number[] = [];

  // Section 1: Hospital Info
  const hasName = !!prof.hospitalName?.trim();
  const hasType = !!prof.hospitalType?.trim();
  const hasAddress = !!prof.fullAddress?.trim() || !!prof.streetAddress?.trim();
  const hasCity = !!prof.city?.trim();
  const hasDistrict = !!prof.district?.trim();
  const hasTaluka = !!prof.taluka?.trim();
  const hasPincode = !!prof.pincode?.trim() && prof.pincode.trim().length === 6;
  const hasHelpline = !!prof.contactHelpline?.trim();
  if (
    hasName &&
    hasType &&
    hasAddress &&
    hasCity &&
    hasDistrict &&
    hasTaluka &&
    hasPincode &&
    hasHelpline
  ) {
    completed.push(1);
  }

  // Section 2: Hospital Capacity
  const hasCapacityData = Boolean(
    prof.capacity?.ipd?.noOfWards &&
    prof.capacity?.ipd?.generalBeds &&
    prof.capacity?.ipd?.icuUnits
  );
  if (hasCapacityData) {
    completed.push(2);
  }

  // Section 3: Specialities
  const hasSpecialities = Boolean(
    (Array.isArray(prof.selectedSpecialities) && prof.selectedSpecialities.length > 0) ||
    (Array.isArray(prof.specializations) && prof.specializations.length > 0)
  );
  if (hasSpecialities) {
    completed.push(3);
  }

  // Section 4: Packages
  const hasPackages = Boolean(
    Array.isArray(prof.selectedPackages) && prof.selectedPackages.length > 0
  );
  if (hasPackages) {
    completed.push(4);
  }

  // Section 5: Doctors
  const hasDoctors = Boolean(
    Array.isArray(prof.doctorsList) && prof.doctorsList.length > 0
  );
  if (hasDoctors) {
    completed.push(5);
  }

  // Section 6: Resource Count
  const hasResourceCount = Boolean(
    prof.resourceCount?.totalDoctors || prof.resourceCount?.nursingStaff
  );
  if (hasResourceCount) {
    completed.push(6);
  }

  // Section 7: Operational Status & Certification
  const cs = prof.currentStatus;
  if (cs) {
    const hasAccepting = cs.acceptingNewPatients !== null && cs.acceptingNewPatients !== undefined;
    const hasEmergencyLoad = !!cs.emergencyLoad;
    const hasServiceUnavail = cs.serviceUnavailable !== null && cs.serviceUnavailable !== undefined;
    const isVerified = cs.verifiedBySevak === true;
    if (isVerified || (hasAccepting && hasEmergencyLoad && hasServiceUnavail)) {
      completed.push(7);
    }
  }

  return completed;
};

export const sevakHospitalService = {
  /**
   * Fetch hospital profile & live bed capacity from backend (with fast in-memory & offline cache)
   */
  async getHospitalProfile(forceRefresh: boolean = false): Promise<HospitalFacilityProfile> {
    // 1. Instant RAM Cache hit (< 0.5ms)
    if (!forceRefresh && memoryHospitalProfile && Date.now() - lastHospitalProfileTimestamp < FAST_CACHE_TTL_MS) {
      return memoryHospitalProfile;
    }

    const storageKey = await getHospitalStorageKey();

    // 2. Read local AsyncStorage immediately
    let localProfile: HospitalFacilityProfile | null = null;
    try {
      const stored = await AsyncStorage.getItem(storageKey);
      if (stored) {
        localProfile = JSON.parse(stored);
        if (!memoryHospitalProfile && localProfile) {
          memoryHospitalProfile = localProfile;
          lastHospitalProfileTimestamp = Date.now();
        }
      }
    } catch (_) {}

    // 3. If we have local profile and didn't explicitly force refresh, return local immediately and sync in background
    if (localProfile && !forceRefresh) {
      // Background revalidation
      this.fetchRemoteHospitalProfile(storageKey).catch(() => {});
      return localProfile;
    }

    // 4. Remote Fetch
    const remote = await this.fetchRemoteHospitalProfile(storageKey);
    return remote || localProfile || EMPTY_HOSPITAL_SURVEY_PROFILE;
  },

  async fetchRemoteHospitalProfile(storageKey: string): Promise<HospitalFacilityProfile | null> {
    try {
      const res = await apiClient.get('/hospital-facilities');
      if (res?.success && res?.data) {
        const d = res.data;
        const hospInfo = d.hospitalInfo || {};

        const parsedSpecs = parseSpecializationsFromBackend(d.specializations);
        const parsedOperations = parseOperationsFromBackend(d.treatmentsOperations || d.operations);
        const parsedResources = parseCriticalResourcesFromBackend(d.criticalResources);
        const parsedEmergency = parseEmergencyCapabilityFromBackend(d.emergencyCapability);

        const profile: HospitalFacilityProfile = {
          id: d.hospitalId || 'hosp-001',
          assignedHospitalId: d.hospitalCode || d.hospitalId || '',
          hospitalName: d.hospitalName || hospInfo.name || '',
          hospitalType: (hospInfo.type || 'Government / Public') as any,
          fullAddress: hospInfo.address || `${hospInfo.city || ''}, ${hospInfo.district || ''}`.trim(),
          streetAddress: hospInfo.address || '',
          city: hospInfo.city || '',
          district: hospInfo.district || '',
          taluka: hospInfo.areaTaluka || hospInfo.taluka || '',
          pincode: hospInfo.pincode || '',
          landmark: hospInfo.nearestLandmark || '',
          contactHelpline: hospInfo.contact || '',
          is24x7EmergencyAvailable: hospInfo.emergency24x7 === 'Yes' ? true : (hospInfo.emergency24x7 === 'No' ? false : null),
          isAmbulanceAvailable: hospInfo.ambulanceAvailable === 'Yes' ? true : (hospInfo.ambulanceAvailable === 'No' ? false : null),

          specializations: parsedSpecs.specializations,
          additionalSpecialities: parsedSpecs.additional,

          operations: parsedOperations,

          bedAvailability: {
            totalHospitalBeds: Number(d.bedAvailability?.totalHospitalBeds || d.bedAvailability?.totalBeds || 0),
            availableHospitalBeds: Number(d.bedAvailability?.availableHospitalBeds || d.bedAvailability?.availableBeds || 0),
            totalIcuBeds: Number(d.bedAvailability?.totalIcuBeds || 0),
            availableIcuBeds: Number(d.bedAvailability?.availableIcuBeds || 0),
            totalEmergencyBeds: Number(d.bedAvailability?.totalEmergencyBeds || 0),
            availableEmergencyBeds: Number(d.bedAvailability?.availableEmergencyBeds || 0),
          },

          criticalResources: parsedResources,
          emergencyCapability: parsedEmergency,

          currentStatus: {
            operationalStatus: d.currentStatus?.operationalStatus || 'Fully Operational',
            acceptingNewPatients: d.currentStatus?.acceptingNewPatients ?? true,
            emergencyLoad: d.currentStatus?.emergencyLoad || 'Low (Manageable)',
            serviceUnavailable: d.currentStatus?.serviceUnavailable ?? false,
            verifiedBySevak: Boolean(d.currentStatus?.verifiedBySevak || d.isFullyCompleted || d.status === 'SUBMITTED'),
            sevakRemarks: d.currentStatus?.sevakRemarks || 'Hospital facility verified.',
            lastUpdated: d.updatedAt || '',
          },
        };

        const completed = getCompletedSurveySections(profile);
        const isSurveySubmitted = Boolean(
          d.isFullyCompleted === true ||
          d.status === 'SUBMITTED' ||
          d.currentStatus?.verifiedBySevak === true ||
          completed.length >= 7
        );

        profile.currentStatus.verifiedBySevak = isSurveySubmitted;
        if (isSurveySubmitted) {
          if (profile.currentStatus.acceptingNewPatients === null) profile.currentStatus.acceptingNewPatients = true;
          if (!profile.currentStatus.emergencyLoad) profile.currentStatus.emergencyLoad = 'Low (Manageable)';
          if (profile.currentStatus.serviceUnavailable === null) profile.currentStatus.serviceUnavailable = false;
        }

        memoryHospitalProfile = profile;
        lastHospitalProfileTimestamp = Date.now();
        await AsyncStorage.setItem(storageKey, JSON.stringify(profile));
        return profile;
      }
    } catch (e) {
      console.warn('[sevakHospitalService] Remote hospital profile fetch notice:', e);
    }
    return null;
  },

  /**
   * Update hospital profile in cache and sync with backend
   */
  async saveHospitalProfile(profile: HospitalFacilityProfile): Promise<HospitalFacilityProfile> {
    const storageKey = await getHospitalStorageKey();
    const isVerifiedSubmission = Boolean(
      profile.currentStatus?.verifiedBySevak === true
    );

    const updated: HospitalFacilityProfile = {
      ...profile,
      currentStatus: {
        ...profile.currentStatus,
        acceptingNewPatients: profile.currentStatus.acceptingNewPatients ?? true,
        emergencyLoad: profile.currentStatus.emergencyLoad || 'Low (Manageable)',
        serviceUnavailable: profile.currentStatus.serviceUnavailable ?? false,
        sevakRemarks: profile.currentStatus.sevakRemarks?.trim() || 'Hospital facility verified by Arogya Sevak.',
        verifiedBySevak: isVerifiedSubmission,
        lastUpdated: new Date().toLocaleString([], {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
    };

    memoryHospitalProfile = updated;
    lastHospitalProfileTimestamp = Date.now();
    await AsyncStorage.setItem(storageKey, JSON.stringify(updated));

    const completed = getCompletedSurveySections(updated);
    const isAllDone = isVerifiedSubmission || completed.length >= 7;
    const completedSectionKeys = isAllDone
      ? ['s1', 's2', 's3', 's4', 's5', 's6', 's7']
      : completed.map((num) => `s${num}`);

    // Sync to backend POST /api/hospital-facilities
    try {
      const payload = {
        hospitalId: profile.id,
        hospitalInfo: {
          name: profile.hospitalName,
          type: profile.hospitalType,
          address: profile.fullAddress || profile.streetAddress,
          city: profile.city,
          district: profile.district,
          areaTaluka: profile.taluka,
          pincode: profile.pincode,
          landmark: profile.landmark,
          contact: profile.contactHelpline,
          emergency24x7: profile.is24x7EmergencyAvailable ? 'Yes' : (profile.is24x7EmergencyAvailable === false ? 'No' : ''),
          ambulanceAvailable: profile.isAmbulanceAvailable ? 'Yes' : (profile.isAmbulanceAvailable === false ? 'No' : ''),
        },
        specializations: {
          list: profile.specializations,
          additional: profile.additionalSpecialities || [],
          ...profile.specializations.reduce((acc, curr) => ({ ...acc, [curr]: true }), {}),
        },
        treatmentsOperations: profile.operations,
        bedAvailability: profile.bedAvailability,
        criticalResources: profile.criticalResources,
        emergencyCapability: profile.emergencyCapability,
        currentStatus: updated.currentStatus,
        completedSections: completedSectionKeys,
        isFullyCompleted: isAllDone,
        status: isAllDone ? 'SUBMITTED' : 'DRAFT',
      };
      await apiClient.post('/hospital-facilities', payload);
    } catch (apiErr) {
      console.warn('[sevakHospitalService] Remote survey save error:', apiErr);
    }

    return updated;
  },

  /**
   * Fetch allocated patient cases from backend (with instant RAM & local cache)
   */
  async getAllocatedCases(forceRefresh: boolean = false): Promise<AllocatedPatientCase[]> {
    // 1. Instant RAM Cache return (< 0.5ms)
    if (!forceRefresh && memoryAllocatedCases && Date.now() - lastAllocatedCasesTimestamp < FAST_CACHE_TTL_MS) {
      return memoryAllocatedCases;
    }

    // 2. Load stored local cases from AsyncStorage
    let localCases: AllocatedPatientCase[] = [];
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.ALLOCATED_CASES);
      if (stored) {
        localCases = JSON.parse(stored);
        if (!memoryAllocatedCases && localCases.length > 0) {
          memoryAllocatedCases = localCases;
          lastAllocatedCasesTimestamp = Date.now();
        }
      }
    } catch (_) {}

    // 3. If not force refreshing and we have local cases, return immediately and sync in background
    if (localCases.length > 0 && !forceRefresh) {
      this.fetchRemoteAllocatedCases(localCases).catch(() => {});
      return localCases;
    }

    // 4. Remote Fetch
    const remote = await this.fetchRemoteAllocatedCases(localCases);
    return remote || localCases;
  },

  async fetchRemoteAllocatedCases(existingLocalList: AllocatedPatientCase[] = []): Promise<AllocatedPatientCase[] | null> {
    let remoteApps: any[] = [];
    try {
      const res = await apiClient.get('/applications/sevak/assigned');
      if (res?.data && Array.isArray(res.data)) {
        remoteApps = res.data;
      } else if (Array.isArray(res)) {
        remoteApps = res as any[];
      }
    } catch (e1) {
      try {
        const res2 = await apiClient.get('/patients/assigned');
        if (res2?.data?.patients && Array.isArray(res2.data.patients)) {
          remoteApps = res2.data.patients;
        } else if (Array.isArray(res2?.data)) {
          remoteApps = res2.data;
        }
      } catch (_) {}
    }

    if (remoteApps.length > 0) {
      const localMap = new Map(existingLocalList.map((c) => [c.id.toLowerCase(), c]));
      const normalizedList = remoteApps.map((app) => {
        const appId = (app.id || app.caseId || app.applicationNumber || app.uuid || '').toLowerCase();
        const existing = localMap.get(appId);
        return normalizeBackendApplication(app, existing);
      });

      memoryAllocatedCases = normalizedList;
      lastAllocatedCasesTimestamp = Date.now();
      await AsyncStorage.setItem(STORAGE_KEYS.ALLOCATED_CASES, JSON.stringify(normalizedList));
      return normalizedList;
    }

    return null;
  },

  /**
   * Fetch single case details with instant local cache + fast parallel background refresh
   */
  async getCaseById(caseId: string, forceRefresh: boolean = false): Promise<AllocatedPatientCase | null> {
    if (!caseId) return null;

    // 1. Instant lookup from RAM / Local storage
    let existingCase: AllocatedPatientCase | null = null;
    if (memoryAllocatedCases) {
      existingCase = memoryAllocatedCases.find((c) => c.id.toLowerCase() === caseId.toLowerCase()) || null;
    }

    if (!existingCase) {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEYS.ALLOCATED_CASES);
        if (stored) {
          const parsed: AllocatedPatientCase[] = JSON.parse(stored);
          existingCase = parsed.find((c) => c.id.toLowerCase() === caseId.toLowerCase()) || null;
        }
      } catch (_) {}
    }

    // 2. If not forcing refresh and existing case is found, return it instantly in 0ms
    if (existingCase && !forceRefresh) {
      // Revalidate in background without blocking screen
      this.refreshCaseDetailsInBackground(caseId, existingCase).catch(() => {});
      return existingCase;
    }

    // 3. Fast Parallel Fetch for Track + Documents
    return await this.refreshCaseDetailsInBackground(caseId, existingCase);
  },

  async refreshCaseDetailsInBackground(caseId: string, existing: AllocatedPatientCase | null): Promise<AllocatedPatientCase | null> {
    let normalized: AllocatedPatientCase | null = existing || null;

    try {
      const [trackRes, docRes] = await Promise.allSettled([
        apiClient.get(`/applications/track/${encodeURIComponent(caseId)}`),
        apiClient.get(`/applications/${encodeURIComponent(caseId)}/documents`),
      ]);

      if (trackRes.status === 'fulfilled' && trackRes.value?.success && trackRes.value?.data) {
        normalized = normalizeBackendApplication(trackRes.value.data, existing || undefined);
      }

      if (!normalized && existing) {
        normalized = existing;
      }

      if (normalized && docRes.status === 'fulfilled' && docRes.value?.data && Array.isArray(docRes.value.data)) {
        const rawDocs = docRes.value.data;
        const remoteAdditionalDocs: AdditionalMedicalDocument[] = [];
        const remoteRequestedDocs: RequestedDocument[] = [...(normalized.requestedDocuments || [])];
        const reqDocIds = new Set(remoteRequestedDocs.map((r) => r.id.toLowerCase()));
        const reqDocTitles = new Set(remoteRequestedDocs.map((r) => r.title.toLowerCase().trim()));

        rawDocs.forEach((d: any, idx: number) => {
          const docStatus = String(d.document_status || d.status || '').toUpperCase();
          const rawFileName = d.file_name || d.name || '';
          const hasFile = Boolean(d.file_url && d.file_url !== '' && d.file_url !== 'Pending Upload');
          const isPending = !hasFile || docStatus === 'PENDING_SEVAK_UPLOAD' || docStatus === 'PENDING_CITIZEN_UPLOAD' || rawFileName === 'Pending Upload';

          if (isPending) {
            const dId = String(d.id || `req-pending-${idx}`);
            const title = rawFileName && rawFileName !== 'Pending Upload' ? rawFileName : (d.document_name || d.category || 'Requested Document');

            if (!reqDocIds.has(dId.toLowerCase()) && !reqDocTitles.has(title.toLowerCase().trim())) {
              reqDocIds.add(dId.toLowerCase());
              reqDocTitles.add(title.toLowerCase().trim());
              remoteRequestedDocs.push({
                id: dId,
                title,
                description: d.verification_remark || 'Clinical document requested by Admin',
                isRequired: true,
                status: 'pending',
              });
            }
          } else {
            remoteAdditionalDocs.push({
              id: d.id || `med-doc-${idx}`,
              title: d.document_name || d.name || d.type || rawFileName || 'Medical Document',
              name: rawFileName || 'document.pdf',
              uri: d.file_url || d.url || d.secure_url || d.uri || '',
              size: d.file_size || d.size || '1.5 MB',
              timestamp: d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString() : 'Uploaded',
              type: d.mime_type || (d.file_url?.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
              note: d.verification_remark || '',
            });
          }
        });

        // Final cleanup: Remove pending requested docs from additionalMedicalDocs
        const cleanAdditionalDocs = (remoteAdditionalDocs.length > 0 ? remoteAdditionalDocs : normalized.additionalMedicalDocs).filter((doc) => {
          const hasValidUri = Boolean(doc.uri && doc.uri !== '' && doc.uri !== 'Pending Upload' && !doc.uri.startsWith('undefined'));
          const isPendingReq = remoteRequestedDocs.some(
            (r) => r.status === 'pending' && r.title.toLowerCase().trim() === (doc.title || doc.name || '').toLowerCase().trim()
          );
          return hasValidUri && !isPendingReq;
        });

        normalized = {
          ...normalized,
          requestedDocuments: remoteRequestedDocs,
          additionalMedicalDocs: cleanAdditionalDocs,
        };
      }

      // Update in-memory cache and AsyncStorage
      if (normalized) {
        if (memoryAllocatedCases) {
          const idx = memoryAllocatedCases.findIndex((c) => c.id.toLowerCase() === caseId.toLowerCase());
          if (idx >= 0) {
            memoryAllocatedCases[idx] = normalized;
          } else {
            memoryAllocatedCases.push(normalized);
          }
          await AsyncStorage.setItem(STORAGE_KEYS.ALLOCATED_CASES, JSON.stringify(memoryAllocatedCases));
        }
      }
    } catch (e) {
      console.warn('[sevakHospitalService] Case detail refresh notice:', e);
    }

    return normalized;
  },

  async updateTreatmentStatus(
    caseId: string,
    newStatus: TreatmentStatus,
    note?: string,
    updatedBy: string = 'Arogya Sevak'
  ): Promise<AllocatedPatientCase | null> {
    const timeStr = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    let backendResponse: any = null;

    const CLINICAL_STAGES_LIST = [
      'Admitted',
      'Diagnostic Stage',
      'Under Treatment',
      'Surgery Scheduled',
      'Post-Op Recovery',
      'On Hold',
      'Discharged',
      'Completed',
    ];
    const targetIdx = CLINICAL_STAGES_LIST.findIndex((s) => s.toLowerCase() === newStatus.toLowerCase());
    const activeIdx = targetIdx >= 0 ? targetIdx : 0;
    const caseProgress = CLINICAL_STAGES_LIST.map((label, idx) => {
      if (idx < activeIdx) {
        return {
          label,
          state: 'completed',
          date: timeStr,
          note: idx === 0 ? 'Admitted & vitals recorded' : '',
        };
      } else if (idx === activeIdx) {
        const isFinal = label === 'Discharged' || label === 'Completed';
        const isHold = label === 'On Hold';
        return {
          label,
          state: isFinal ? 'completed' : (isHold ? 'hold' : 'active'),
          date: timeStr,
          note: note || `Current Status: ${label}`,
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

    try {
      const res = await apiClient.put(`/applications/${encodeURIComponent(caseId)}/treatment-progress`, {
        stage: newStatus,
        note: note || `Current Status: ${newStatus}`,
        caseProgress,
        status: newStatus === 'Discharged' || newStatus === 'Completed' ? 'CLOSED' : 'APPROVED',
        statusVariant: 'treatment',
        updatedBy,
        sevakName: updatedBy,
      });
      if (res?.data) {
        backendResponse = res.data?.data || res.data;
      }
    } catch (apiErr) {
      console.warn('[sevakHospitalService] Remote PUT /treatment-progress notice:', apiErr);
      try {
        await apiClient.patch(`/patients/${encodeURIComponent(caseId)}`, {
          status: newStatus,
          notes: note || `Status updated to ${newStatus}`,
        });
      } catch (_) {}
    }

    const cases = await this.getAllocatedCases();
    const index = cases.findIndex((c) => c.id.toLowerCase() === caseId.toLowerCase());
    if (index === -1) return null;

    const newHistoryItem: TreatmentTimelineItem = {
      id: `th-${Date.now()}`,
      status: newStatus,
      timestamp: timeStr,
      note: note || `Current Status: ${newStatus}`,
      updatedBy,
    };

    const existingHistory = cases[index].treatmentHistory || [];
    cases[index] = {
      ...cases[index],
      treatmentStatus: newStatus,
      treatmentHistory: [...existingHistory, newHistoryItem],
    };

    if (backendResponse) {
      const reNormalized = normalizeBackendApplication(backendResponse, cases[index]);
      cases[index] = {
        ...cases[index],
        ...reNormalized,
        treatmentStatus: newStatus,
        treatmentHistory:
          reNormalized.treatmentHistory.length >= cases[index].treatmentHistory.length
            ? reNormalized.treatmentHistory
            : cases[index].treatmentHistory,
      };
    }

    if (memoryAllocatedCases) {
      const memIdx = memoryAllocatedCases.findIndex((c) => c.id.toLowerCase() === caseId.toLowerCase());
      if (memIdx >= 0) {
        memoryAllocatedCases[memIdx] = cases[index];
      }
    }

    await AsyncStorage.setItem(STORAGE_KEYS.ALLOCATED_CASES, JSON.stringify(cases));
    return cases[index];
  },

  /**
   * Action for Previous Arogya Sevak:
   * Mark patient as dispatched / moved to the newly assigned hospital.
   */
  async markPatientMoved(
    caseId: string,
    remark?: string,
    updatedBy: string = 'Arogya Sevak'
  ): Promise<AllocatedPatientCase | null> {
    const timeStr = new Date().toLocaleString([], {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    try {
      await apiClient.post(`/applications/${encodeURIComponent(caseId)}/remarks`, {
        remarks: `[PATIENT DISPATCHED]: Patient has moved to destination hospital. Note: ${remark || 'Dispatched successfully.'}`,
      });
    } catch (apiErr) {
      console.warn('[sevakHospitalService] Remote dispatch remark notice:', apiErr);
    }

    const cases = await this.getAllocatedCases();
    const index = cases.findIndex((c) => c.id.toLowerCase() === caseId.toLowerCase());
    if (index === -1) return null;

    const targetCase = cases[index];
    const destination = targetCase.assignedToNewHospital || 'new facility';
    const dispatchNote = remark
      ? `🚑 Patient dispatched & moved to ${destination}. Note: "${remark}"`
      : `🚑 Patient dispatched & moved to ${destination} for specialized care.`;

    const newHistoryItem: TreatmentTimelineItem = {
      id: `th-${Date.now()}-moved`,
      status: 'Transferred',
      timestamp: timeStr,
      note: dispatchNote,
      updatedBy,
    };

    const updatedCase: AllocatedPatientCase = {
      ...targetCase,
      isTransferredOut: true,
      treatmentStatus: 'Transferred',
      patientMovedStatus: 'MOVED',
      patientMovedAt: timeStr,
      treatmentHistory: [...targetCase.treatmentHistory, newHistoryItem],
    };

    cases[index] = updatedCase;
    await AsyncStorage.setItem(STORAGE_KEYS.ALLOCATED_CASES, JSON.stringify(cases));
    return updatedCase;
  },

  /**
   * Action for New Arogya Sevak:
   * Confirm patient arrival and admit here at this hospital.
   */
  async confirmPatientAdmitted(
    caseId: string,
    details?: {
      assignedWard?: string;
      bedNumber?: string;
      treatingDoctor?: string;
      note?: string;
    },
    updatedBy: string = 'Arogya Sevak'
  ): Promise<AllocatedPatientCase | null> {
    const timeStr = new Date().toLocaleString([], {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    try {
      await apiClient.patch(`/patients/${encodeURIComponent(caseId)}`, {
        status: 'Admitted',
        ward: details?.assignedWard,
        bedNumber: details?.bedNumber,
        doctor: details?.treatingDoctor,
        notes: details?.note || 'Patient arrival confirmed and admitted.',
      });
      await apiClient.post(`/applications/${encodeURIComponent(caseId)}/remarks`, {
        remarks: `[INTAKE ADMISSION]: Patient arrival confirmed & admitted. Ward: ${details?.assignedWard || 'General'}, Bed: ${details?.bedNumber || 'GEN-01'}. Note: ${details?.note || 'Admitted'}`,
      });
    } catch (apiErr) {
      console.warn('[sevakHospitalService] Remote intake admission notice:', apiErr);
    }

    const cases = await this.getAllocatedCases();
    const index = cases.findIndex((c) => c.id.toLowerCase() === caseId.toLowerCase());
    if (index === -1) return null;

    const targetCase = cases[index];
    const ward = details?.assignedWard || targetCase.assignedWard || 'General Ward';
    const bed = details?.bedNumber || targetCase.bedNumber || 'GEN-01';
    const doc = details?.treatingDoctor || targetCase.treatingDoctor;

    const intakeNote = `📥 Patient arrival confirmed & admitted. Ward: ${ward}, Bed: ${bed}.${details?.note ? ` Note: "${details.note}"` : ''}`;

    const newHistoryItem: TreatmentTimelineItem = {
      id: `th-${Date.now()}-admit`,
      status: 'Admitted',
      timestamp: timeStr,
      note: intakeNote,
      updatedBy,
    };

    const updatedCase: AllocatedPatientCase = {
      ...targetCase,
      treatmentStatus: 'Admitted',
      patientAdmittedStatus: 'ADMITTED',
      patientAdmittedAt: timeStr,
      assignedWard: ward,
      bedNumber: bed,
      treatingDoctor: doc,
      treatmentHistory: [...targetCase.treatmentHistory, newHistoryItem],
    };

    cases[index] = updatedCase;
    await AsyncStorage.setItem(STORAGE_KEYS.ALLOCATED_CASES, JSON.stringify(cases));
    return updatedCase;
  },

  async fulfillRequestedDocument(
    caseId: string,
    requestedDocId: string,
    uploadedDoc: {
      name: string;
      uri: string;
      size: string;
      timestamp: string;
      type: string;
      note?: string;
    }
  ): Promise<AllocatedPatientCase | null> {
    let finalUri = uploadedDoc.uri;

    // 1. Direct Cloudinary Upload if local content/file URI
    if (finalUri && !finalUri.startsWith('http://') && !finalUri.startsWith('https://')) {
      try {
        const s3Url = await uploadDocumentToS3(
          finalUri,
          uploadedDoc.name || 'requested_document.jpg',
          uploadedDoc.type || 'image/jpeg',
          'other'
        );
        if (s3Url) {
          finalUri = s3Url;
        }
      } catch (uploadErr) {
        console.warn('[sevakHospitalService] S3 upload for requested doc:', uploadErr);
      }
    }

    const docWithCloudUrl = {
      ...uploadedDoc,
      uri: finalUri,
    };

    // 2. Synchronize to backend database
    try {
      await apiClient.post(`/applications/${encodeURIComponent(caseId)}/documents`, {
        title: docWithCloudUrl.name || 'Requested Clinical Document',
        fileName: docWithCloudUrl.name,
        file_url: docWithCloudUrl.uri,
        category: docWithCloudUrl.type || 'Clinical Document',
        size: docWithCloudUrl.size,
        note: docWithCloudUrl.note || 'Uploaded by Arogya Sevak in response to Admin document request',
        source: 'ArogyaSevak Upload',
        reqDocId: requestedDocId,
      });
    } catch (apiErr) {
      console.warn('[sevakHospitalService] Error syncing fulfilled doc to backend:', apiErr);
    }

    const cases = await this.getAllocatedCases();
    const index = cases.findIndex((c) => c.id.toLowerCase() === caseId.toLowerCase());
    if (index === -1) return null;

    const targetCase = cases[index];
    const reqDocs = targetCase.requestedDocuments.map((doc) => {
      if (doc.id === requestedDocId) {
        return {
          ...doc,
          status: 'uploaded' as const,
          uploadedDoc: docWithCloudUrl,
        };
      }
      return doc;
    });

    const newAdditionalDoc: AdditionalMedicalDocument = {
      id: `fulfilled-${requestedDocId}-${Date.now()}`,
      title: docWithCloudUrl.name || 'Requested Document',
      name: docWithCloudUrl.name || 'Document.pdf',
      uri: docWithCloudUrl.uri,
      size: docWithCloudUrl.size || '1.5 MB',
      timestamp: docWithCloudUrl.timestamp || new Date().toLocaleDateString(),
      type: docWithCloudUrl.type || 'application/pdf',
      note: 'Uploaded in response to Admin Request',
    };

    cases[index] = {
      ...targetCase,
      requestedDocuments: reqDocs,
      additionalMedicalDocs: [
        newAdditionalDoc,
        ...(targetCase.additionalMedicalDocs || []).filter((d) => d.uri !== finalUri),
      ],
    };

    await AsyncStorage.setItem(STORAGE_KEYS.ALLOCATED_CASES, JSON.stringify(cases));
    return cases[index];
  },

  async addAdditionalMedicalDocument(
    caseId: string,
    newDoc: AdditionalMedicalDocument
  ): Promise<AllocatedPatientCase | null> {
    let finalUri = newDoc.uri;

    // Direct S3 Upload if local content/file URI
    if (finalUri && !finalUri.startsWith('http://') && !finalUri.startsWith('https://')) {
      try {
        const s3Url = await uploadDocumentToS3(
          finalUri,
          newDoc.name || 'document.pdf',
          newDoc.type || 'application/pdf',
          'medical_documents',
          'applications'
        );
        if (s3Url) {
          finalUri = s3Url;
        }
      } catch (s3Err) {
        console.warn('[sevakHospitalService] S3 direct upload notice:', s3Err);
      }
    }

    const docWithCloudUrl: AdditionalMedicalDocument = {
      ...newDoc,
      uri: finalUri,
    };

    // Synchronize to backend database
    try {
      await apiClient.post(`/applications/${encodeURIComponent(caseId)}/documents`, {
        title: docWithCloudUrl.title || docWithCloudUrl.name,
        fileName: docWithCloudUrl.name,
        file_url: docWithCloudUrl.uri,
        category: docWithCloudUrl.type || 'Medical Record',
        size: docWithCloudUrl.size,
        note: docWithCloudUrl.note,
        source: 'ArogyaSevak Upload',
      });
    } catch (apiErr) {
      console.warn('[sevakHospitalService] Error syncing doc to backend:', apiErr);
    }

    const cases = await this.getAllocatedCases();
    const index = cases.findIndex((c) => c.id.toLowerCase() === caseId.toLowerCase());
    if (index === -1) return null;

    cases[index] = {
      ...cases[index],
      additionalMedicalDocs: [docWithCloudUrl, ...cases[index].additionalMedicalDocs],
    };

    await AsyncStorage.setItem(STORAGE_KEYS.ALLOCATED_CASES, JSON.stringify(cases));
    return cases[index];
  },

  async updateIpdStatus(
    caseId: string,
    updates: {
      treatmentStatus?: TreatmentStatus;
      clinicalCondition?: ClinicalCondition;
      assignedWard?: string;
      bedNumber?: string;
      schemePreAuthStatus?: SchemePreAuthStatus;
      plannedDischargeDate?: string;
      wardRoundNote?: string;
      doctorAdvice?: string;
      vitalsSummary?: string;
      updatedBy?: string;
    }
  ): Promise<AllocatedPatientCase | null> {
    const cases = await this.getAllocatedCases();
    const index = cases.findIndex((c) => c.id === caseId);
    if (index === -1) return null;

    const targetCase = cases[index];
    const timeStr = new Date().toLocaleString([], {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const isBedShifted =
      (updates.assignedWard && updates.assignedWard !== targetCase.assignedWard) ||
      (updates.bedNumber && updates.bedNumber !== targetCase.bedNumber);

    const historyItems: TreatmentTimelineItem[] = [...targetCase.treatmentHistory];

    if (updates.treatmentStatus && updates.treatmentStatus !== targetCase.treatmentStatus) {
      historyItems.push({
        id: `th-${Date.now()}-status`,
        status: updates.treatmentStatus,
        timestamp: timeStr,
        note: updates.wardRoundNote || `IPD status updated to ${updates.treatmentStatus}`,
        updatedBy: updates.updatedBy || 'Arogya Sevak',
      });
    } else if (isBedShifted) {
      historyItems.push({
        id: `th-${Date.now()}-bed`,
        status: targetCase.treatmentStatus,
        timestamp: timeStr,
        note: `Bed transferred to ${updates.assignedWard || targetCase.assignedWard}, Bed ${updates.bedNumber || targetCase.bedNumber}`,
        updatedBy: updates.updatedBy || 'Arogya Sevak',
      });
    } else if (updates.wardRoundNote) {
      historyItems.push({
        id: `th-${Date.now()}-round`,
        status: targetCase.treatmentStatus,
        timestamp: timeStr,
        note: `Ward Round Note: ${updates.wardRoundNote}`,
        updatedBy: updates.updatedBy || 'Arogya Sevak',
      });
    }

    const lastWardRound: WardRoundNote | undefined = updates.wardRoundNote
      ? {
          id: `wr-${Date.now()}`,
          timestamp: timeStr,
          doctorAdvice: updates.doctorAdvice,
          vitalsSummary: updates.vitalsSummary,
          sevakRemarks: updates.wardRoundNote,
          updatedBy: updates.updatedBy || 'Arogya Sevak',
        }
      : targetCase.lastWardRound;

    const updatedCase: AllocatedPatientCase = {
      ...targetCase,
      treatmentStatus: updates.treatmentStatus || targetCase.treatmentStatus,
      clinicalCondition: updates.clinicalCondition || targetCase.clinicalCondition,
      assignedWard: updates.assignedWard || targetCase.assignedWard,
      bedNumber: updates.bedNumber || targetCase.bedNumber,
      schemePreAuthStatus: updates.schemePreAuthStatus || targetCase.schemePreAuthStatus,
      plannedDischargeDate: updates.plannedDischargeDate ?? targetCase.plannedDischargeDate,
      lastWardRound,
      treatmentHistory: historyItems,
    };

    cases[index] = updatedCase;
    await AsyncStorage.setItem(STORAGE_KEYS.ALLOCATED_CASES, JSON.stringify(cases));

    // If patient is marked Discharged, increment available bed
    if (updates.treatmentStatus === 'Discharged' && targetCase.treatmentStatus !== 'Discharged') {
      try {
        const hosp = await this.getHospitalProfile();
        const isIcu = targetCase.assignedWard.toLowerCase().includes('icu');
        if (isIcu) {
          hosp.bedAvailability.availableIcuBeds = Math.min(
            hosp.bedAvailability.totalIcuBeds,
            hosp.bedAvailability.availableIcuBeds + 1
          );
        } else {
          hosp.bedAvailability.availableHospitalBeds = Math.min(
            hosp.bedAvailability.totalHospitalBeds,
            hosp.bedAvailability.availableHospitalBeds + 1
          );
        }
        await AsyncStorage.setItem(STORAGE_KEYS.HOSPITAL_PROFILE, JSON.stringify(hosp));
      } catch (e) {
        console.warn('Could not auto-increment bed availability', e);
      }
    }

    return updatedCase;
  },

  async escalateCaseToAdmin(
    caseId: string,
    escalation: {
      type: EscalationType;
      approxBillAmount?: string;
      requiredSpecialty?: string;
      sevakNote: string;
      supportiveDoc?: {
        name: string;
        uri: string;
        size: string;
        timestamp: string;
        type: string;
      };
      holdCase: boolean;
      submittedBy?: string;
    }
  ): Promise<AllocatedPatientCase | null> {
    const cases = await this.getAllocatedCases();
    const index = cases.findIndex((c) => c.id === caseId);
    if (index === -1) return null;

    const targetCase = cases[index];
    const timeStr = new Date().toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    try {
      await apiClient.post(`/applications/${encodeURIComponent(targetCase.id)}/escalate`, {
        escalationType: escalation.type,
        approxBillAmount: escalation.approxBillAmount,
        requiredSpecialty: escalation.requiredSpecialty,
        sevakNote: escalation.sevakNote,
        holdCase: escalation.holdCase,
      });
    } catch (apiErr) {
      console.warn('[sevakHospitalService] Remote escalation notice:', apiErr);
    }

    const newEscalation: CaseAdminEscalation = {
      id: `esc-${Date.now()}`,
      caseId: targetCase.id,
      type: escalation.type,
      title:
        escalation.type === 'BILL_EXCEEDED'
          ? `Hospital Bill Exceeded (${escalation.approxBillAmount || 'Limit Exceeded'})`
          : `Specialty Unavailable (${escalation.requiredSpecialty || 'Transfer Request'})`,
      approxBillAmount: escalation.approxBillAmount,
      requiredSpecialty: escalation.requiredSpecialty,
      sevakNote: escalation.sevakNote,
      supportiveDoc: escalation.supportiveDoc,
      holdCase: escalation.holdCase,
      status: 'PENDING_ADMIN_REVIEW',
      submittedAt: timeStr,
      submittedBy: escalation.submittedBy || 'Arogya Sevak',
    };

    const historyItems: TreatmentTimelineItem[] = [...targetCase.treatmentHistory];
    if (escalation.holdCase) {
      historyItems.push({
        id: `th-${Date.now()}-hold`,
        status: 'On Hold',
        timestamp: timeStr,
        note: `Case put On Hold. Escalated to District Admin for ${
          escalation.type === 'BILL_EXCEEDED' ? 'Bill Ceiling Overrun' : 'Specialty Transfer'
        }. Note: "${escalation.sevakNote}"`,
        updatedBy: escalation.submittedBy || 'Arogya Sevak',
      });
    }

    const updatedCase: AllocatedPatientCase = {
      ...targetCase,
      treatmentStatus: escalation.holdCase ? 'On Hold' : targetCase.treatmentStatus,
      activeEscalation: newEscalation,
      escalationHistory: [newEscalation, ...(targetCase.escalationHistory || [])],
      treatmentHistory: historyItems,
    };

    cases[index] = updatedCase;
    await AsyncStorage.setItem(STORAGE_KEYS.ALLOCATED_CASES, JSON.stringify(cases));
    return updatedCase;
  },

  async resolveAdminEscalation(
    caseId: string,
    response: {
      decision: 'APPROVE_ENHANCEMENT' | 'TRANSFER_AUTHORIZED' | 'CONTINUE' | 'CLOSE';
      note: string;
      adminName?: string;
      designation?: string;
      nextTreatmentStatus?: TreatmentStatus;
    }
  ): Promise<AllocatedPatientCase | null> {
    const cases = await this.getAllocatedCases();
    const index = cases.findIndex((c) => c.id === caseId);
    if (index === -1) return null;

    const targetCase = cases[index];
    if (!targetCase.activeEscalation) return targetCase;

    const timeStr = new Date().toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const resolvedEscalation: CaseAdminEscalation = {
      ...targetCase.activeEscalation,
      status: 'ADMIN_RESOLVED',
      adminResponse: {
        resolvedAt: timeStr,
        adminName: response.adminName || 'Shri Vinayak Kadam',
        designation: response.designation || 'District Nodal Officer (MJPJAY Pune)',
        decision: response.decision,
        note: response.note,
      },
    };

    const nextStatus: TreatmentStatus =
      response.nextTreatmentStatus ||
      (response.decision === 'CLOSE' ? 'Discharged' : 'Under Treatment');

    const historyItems: TreatmentTimelineItem[] = [...targetCase.treatmentHistory];
    historyItems.push({
      id: `th-${Date.now()}-resolved`,
      status: nextStatus,
      timestamp: timeStr,
      note: `Admin Decision: "${response.note}" (${response.decision}). Status resumed to ${nextStatus}.`,
      updatedBy: response.adminName || 'District Admin',
    });

    const updatedCase: AllocatedPatientCase = {
      ...targetCase,
      treatmentStatus: nextStatus,
      activeEscalation: resolvedEscalation,
      treatmentHistory: historyItems,
    };

    cases[index] = updatedCase;
    await AsyncStorage.setItem(STORAGE_KEYS.ALLOCATED_CASES, JSON.stringify(cases));
    return updatedCase;
  },

  /**
   * Clear local hospital profile and cases cache on logout
   */
  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.HOSPITAL_PROFILE);
      await AsyncStorage.removeItem(STORAGE_KEYS.ALLOCATED_CASES);
    } catch (_) {}
  },
};

