import AsyncStorage from '@react-native-async-storage/async-storage';
import { SchemeApplication, UploadedDoc, ApplicationStatus, ApplicationTimelineStep, RevertDetails } from '../types/application.types';
import { applicationApi } from '../../api/applicationApi';

const STORAGE_KEY = '@arogyamitra_citizen_applications_v3';

export const INITIAL_APPLICATIONS: SchemeApplication[] = [];

/**
 * Safe date and time helpers that never throw RangeError / Invalid time value in React Native / Hermes
 */
export function safeFormatTime(rawDateOrTime?: any, defaultVal: string = '10:00 AM'): string {
  if (!rawDateOrTime) return defaultVal;
  if (typeof rawDateOrTime === 'string') {
    if (rawDateOrTime.includes('AM') || rawDateOrTime.includes('PM') || (rawDateOrTime.includes(':') && !rawDateOrTime.includes('T') && !rawDateOrTime.includes('-'))) {
      return rawDateOrTime;
    }
  }
  try {
    const d = new Date(rawDateOrTime);
    if (isNaN(d.getTime())) return typeof rawDateOrTime === 'string' ? rawDateOrTime : defaultVal;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return typeof rawDateOrTime === 'string' ? rawDateOrTime : defaultVal;
  }
}

export function safeFormatDate(rawDate?: any, options?: Intl.DateTimeFormatOptions, defaultVal: string = 'Recent'): string {
  if (!rawDate) return defaultVal;
  if (typeof rawDate === 'string') {
    if (rawDate.includes('०') || rawDate.includes('१') || rawDate.includes('२') || (rawDate.includes(' ') && !rawDate.includes('T') && !rawDate.includes('-'))) {
      return rawDate;
    }
  }
  try {
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return typeof rawDate === 'string' ? rawDate : defaultVal;
    return d.toLocaleDateString('mr-IN', options);
  } catch {
    return typeof rawDate === 'string' ? rawDate : defaultVal;
  }
}

/**
 * Normalizes a raw backend response object into SchemeApplication
 */
export function normalizeServerApplication(item: any): SchemeApplication {
  const caseId = item.caseId || item.applicationNumber || item.application_number || item.id || `AA-${Date.now()}`;
  const rawStatus = String(item.status || item.current_status || 'SUBMITTED').toUpperCase();

  let normalizedStatus: ApplicationStatus = 'SUBMITTED';
  if (['COMPLETED', 'CLOSED', 'DISCHARGED'].includes(rawStatus)) {
    normalizedStatus = 'COMPLETED';
  } else if (['TREATMENT_STARTED', 'IN_TREATMENT', 'ACTIVE', 'APPROVED'].includes(rawStatus)) {
    normalizedStatus = 'TREATMENT_STARTED'; // User rule: Admin approve/assign shows "Treatment in Progress"
  } else if (['COORDINATED', 'SEVAK_ASSIGNED', 'HOSPITAL_ASSIGNED'].includes(rawStatus)) {
    normalizedStatus = 'COORDINATED';
  } else if (['DOCS_VERIFIED', 'VERIFIED'].includes(rawStatus)) {
    normalizedStatus = 'DOCS_VERIFIED';
  } else if (['REVERTED', 'DOCS_REQUIRED', 'ACTION_REQUIRED', 'ON_HOLD'].includes(rawStatus)) {
    normalizedStatus = 'REVERTED';
  } else if (['UNDER_REVIEW', 'IN_REVIEW', 'REVIEW', 'IN_PROGRESS', 'PENDING_REVIEW'].includes(rawStatus)) {
    normalizedStatus = 'IN_REVIEW';
  } else if (['ARCHIVED', 'CLOSED_EXPIRED'].includes(rawStatus)) {
    normalizedStatus = 'ARCHIVED';
  } else if (['REJECTED', 'CANCELLED'].includes(rawStatus)) {
    normalizedStatus = 'REJECTED';
  }

  // 60-day Reopen window calculation for REJECTED cases
  let reopenWindow = undefined;
  if (normalizedStatus === 'REJECTED' || normalizedStatus === 'ARCHIVED' || rawStatus === 'REJECTED' || rawStatus === 'ARCHIVED') {
    const rawRejDate = item.rejectedDate || item.rejected_at || item.closed_at || item.closedAt || item.updated_at || item.updatedAt || item.created_at || item.createdAt;
    let rejTime = Date.now() - 2 * 24 * 3600 * 1000;
    if (rawRejDate) {
      try {
        const parsed = new Date(rawRejDate).getTime();
        if (!isNaN(parsed)) rejTime = parsed;
      } catch {
        // ignore
      }
    }
    const daysElapsed = Math.floor((Date.now() - rejTime) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, 60 - daysElapsed);
    const isExpired = daysElapsed >= 60 || rawStatus === 'ARCHIVED';

    if (isExpired) {
      normalizedStatus = 'ARCHIVED';
    }

    let isoDate = new Date().toISOString();
    try {
      if (rawRejDate) {
        const d = new Date(rawRejDate);
        if (!isNaN(d.getTime())) isoDate = d.toISOString();
      }
    } catch {
      // ignore
    }

    const isReopenReq = Boolean(item.reopenRequested || item.reopen_requested || item.reopenInfo?.reopenRequested || item.reopenWindow?.reopenRequested);
    const reopenReqAt = item.reopenRequestedAt || item.reopen_requested_at || item.reopenInfo?.reopenRequestedAt || item.reopenWindow?.reopenRequestedAt || undefined;
    const reopenReqReason = item.reopenRequestReason || item.reopen_request_reason || item.reopenInfo?.reopenRequestReason || item.reopenWindow?.reopenRequestReason || undefined;

    reopenWindow = {
      daysRemaining,
      daysElapsed,
      isReopenable: !isExpired && normalizedStatus !== 'ARCHIVED',
      isExpired,
      rejectedDate: isoDate,
      reopenRequested: isReopenReq,
      reopenRequestedAt: reopenReqAt,
      reopenRequestReason: reopenReqReason,
    };
  }

  // Scheme name resolution
  const schemeName =
    item.assignedScheme?.name ||
    item.assigned_scheme_name ||
    item.suggestedScheme?.name ||
    item.suggested_scheme_name ||
    item.schemeName ||
    item.scheme ||
    (item.suggested_scheme_id === 'mjpjay'
      ? 'महात्मा ज्योतिराव फुले जन आरोग्य योजना (MJPJAY)'
      : 'आयुष्मान भारत PM-JAY योजना');

  const schemeId =
    item.assignedScheme?.id ||
    item.assigned_scheme_id ||
    item.suggestedScheme?.id ||
    item.suggested_scheme_id ||
    item.schemeId ||
    'pmjay';

  // Normalize documents (handling multiple server response structures)
  const rawDocs = Array.isArray(item.documents)
    ? item.documents
    : Array.isArray(item.application_documents)
    ? item.application_documents
    : [];

  const documents: UploadedDoc[] = rawDocs.map((d: any, idx: number) => {
    const docName = String(d.name || d.file_name || d.fileName || d.documentType || `Attached_Doc_${idx + 1}.pdf`);
    const isDocPdf = docName.toLowerCase().endsWith('.pdf') || String(d.file_url || d.uri || '').toLowerCase().endsWith('.pdf');
    return {
      id: String(d.id || d.docId || `doc-${idx + 1}`),
      name: docName,
      size: String(d.size || d.file_size || d.fileSize || '1.2 MB'),
      source: (d.source as any) || 'device',
      timestamp: safeFormatTime(d.timestamp || d.created_at || d.uploaded_at, '10:00 AM'),
      category: (d.category as any) || 'other',
      uri: d.file_url || d.fileUrl || d.uri || '',
      file_url: d.file_url || d.fileUrl || d.uri || '',
      type: d.type || (isDocPdf ? 'application/pdf' : 'image/jpeg'),
      verified: Boolean(d.verified || d.document_status === 'VERIFIED' || d.status === 'VERIFIED'),
    };
  });

  // Normalize revert details
  let revertDetails: RevertDetails | undefined = undefined;
  const rawRevert = item.revertDetails || item.revert_details;
  if (rawRevert) {
    revertDetails = {
      requestedDocName: rawRevert.requestedDocName || rawRevert.requested_doc_name || 'Additional Document',
      requestedDocType: rawRevert.requestedDocType || rawRevert.requested_doc_type || 'other',
      reason: rawRevert.reason || rawRevert.remark || 'Admin requested document clarification.',
      requestedDate: safeFormatDate(rawRevert.requestedDate || rawRevert.requested_at, undefined, 'Recent'),
      isResolved: Boolean(rawRevert.isResolved || rawRevert.is_resolved),
      resubmittedDocName: rawRevert.resubmittedDocName,
      resubmittedRemark: rawRevert.resubmittedRemark,
      resubmittedDate: rawRevert.resubmittedDate,
    };
  }

  // Assigned Sevak & Hospital Resolution
  const sevakName =
    item.assignedSevak?.name ||
    (typeof item.assignedSevak === 'string' && item.assignedSevak !== 'Unassigned' && item.assignedSevak !== '-' ? item.assignedSevak : null) ||
    item.sevak_name ||
    item.sevakName ||
    item.sevak;

  const sevakPhone =
    item.assignedSevak?.phone ||
    item.sevakPhone ||
    item.sevak_phone ||
    item.sevakMobile ||
    item.active_assignment?.sevak_mobile ||
    null;

  const assignedSevak = (sevakName && sevakName !== 'Unassigned' && sevakName !== '-')
    ? {
        name: sevakName.includes('—') ? sevakName.split('—')[0].trim() : sevakName,
        phone: sevakPhone || '9823012345',
        role: item.assignedSevak?.role || 'आरोग्य सेवक / मित्र',
      }
    : undefined;

  const rawHospitalName =
    item.hospitalName ||
    item.hospital ||
    item.assignedHospital ||
    item.assigned_hospital ||
    item.active_assignment?.hospital_name ||
    '';

  const hospitalName =
    (rawHospitalName && rawHospitalName !== '-' && rawHospitalName !== '—' && rawHospitalName !== 'null' && rawHospitalName !== 'undefined' && rawHospitalName !== 'None' && rawHospitalName !== 'Government Hospital')
      ? rawHospitalName.trim()
      : '';

  // Generate dynamic 4-step timeline based on status
  const appliedDateStr = safeFormatDate(item.submittedDate || item.submittedAt || item.createdAt, undefined, 'Recent');
  const isDocsDone = ['DOCS_VERIFIED', 'COORDINATED', 'SEVAK_ASSIGNED', 'TREATMENT_STARTED', 'COMPLETED'].includes(normalizedStatus);
  const isCoordDone = ['COORDINATED', 'SEVAK_ASSIGNED', 'TREATMENT_STARTED', 'COMPLETED'].includes(normalizedStatus);
  const isTreatmentDone = ['TREATMENT_STARTED', 'COMPLETED'].includes(normalizedStatus);

  const timeline: ApplicationTimelineStep[] = [
    {
      id: 'step-1',
      title: 'अर्ज सादर केला',
      titleKey: 'timelineSubmitted',
      description: 'नागरिकाकडून अर्ज सादर करण्यात आला.',
      date: appliedDateStr,
      status: 'COMPLETED',
      completed: true,
    },
    {
      id: 'step-2',
      title: 'कागदपत्र पडताळणी',
      titleKey: 'timelineDocs',
      description:
        normalizedStatus === 'REVERTED'
          ? `प्रशासनाकडून कागदपत्रे प्रलंबित: ${revertDetails?.requestedDocName || 'कागदपत्र हवे आहे'}`
          : isDocsDone
          ? 'सर्व कागदपत्रे प्रशासनाने मंजूर केली आहेत ✓'
          : 'कागदपत्रांची प्राथमिक तपासणी सुरू आहे.',
      status: normalizedStatus === 'REVERTED' ? 'ALERT' : isDocsDone ? 'COMPLETED' : 'IN_PROGRESS',
      completed: isDocsDone,
      current: normalizedStatus === 'SUBMITTED' || normalizedStatus === 'IN_REVIEW' || normalizedStatus === 'REVERTED',
    },
    {
      id: 'step-3',
      title: 'सेवक तपासणी व समन्वय',
      titleKey: 'timelineSevak',
      description: isCoordDone
        ? `आरोग्य मित्र (${assignedSevak?.name || 'नियुक्त'}) व रुग्णालय (${hospitalName || 'नियुक्त'}) समन्वयासाठी उपलब्ध.`
        : isDocsDone
        ? 'कागदपत्रे पडताळली आहेत. आरोग्य सेवक प्रत्यक्ष पडताळणी करतील.'
        : 'कागदपत्रे पूर्ततेनंतर स्थानिक आरोग्य सेवक भेट देतील.',
      status: isCoordDone ? 'COMPLETED' : normalizedStatus === 'DOCS_VERIFIED' ? 'IN_PROGRESS' : 'PENDING',
      completed: isCoordDone,
      current: normalizedStatus === 'DOCS_VERIFIED' || normalizedStatus === 'COORDINATED',
    },
    {
      id: 'step-4',
      title: normalizedStatus === 'COMPLETED' ? 'योजना मंजुरी व उपचार पूर्ण' : 'उपचार व मंजुरी (Treatment in Progress)',
      titleKey: 'timelineApproval',
      description:
        normalizedStatus === 'COMPLETED'
          ? `उपचार यशस्वीरित्या पूर्ण व योजना लाभ मिळाला: ${item.sanctionedAmount || 'कॅशलेस अनुदान'}.`
          : isTreatmentDone
          ? `शासकीय योजनेअंतर्गत कॅशलेस उपचार सुरू आहेत (${hospitalName || 'रुग्णालय'}).`
          : normalizedStatus === 'REJECTED'
          ? `अर्ज नामंजूर: ${item.remarks || item.rejectionReason || 'अटींची पूर्तता न झाल्यामुळे'}`
          : 'अंतिम शासकीय मान्यता व कॅशलेस उपचार.',
      status: normalizedStatus === 'COMPLETED' ? 'COMPLETED' : isTreatmentDone ? 'IN_PROGRESS' : normalizedStatus === 'REJECTED' ? 'ALERT' : 'PENDING',
      completed: normalizedStatus === 'COMPLETED',
      current: isTreatmentDone || normalizedStatus === 'REJECTED',
    },
  ];

  const contactMobile =
    item.contactMobile ||
    item.contact_mobile ||
    item.patientPhone ||
    item.patient_mobile ||
    item.patient?.mobile ||
    item.applicant?.mobile ||
    item.contact ||
    '';

  return {
    id: caseId,
    caseId,
    applicationNumber: item.applicationNumber || caseId,
    uuid: item.uuid || item.id,
    schemeId,
    schemeName,
    suggestedScheme: item.suggestedScheme || null,
    assignedScheme: item.assignedScheme || null,
    isSchemeAssignedByAdmin: Boolean(item.isSchemeAssignedByAdmin || item.assignedScheme),
    applyingFor: item.applyingFor || 'self',
    priority: item.priority || 'MEDIUM',
    abhaNumber: item.abhaNumber || item.patient?.abha || undefined,
    patientName: item.patientName || item.patient?.name || 'नागरिक',
    patientPhone: item.patientPhone || item.contactMobile || item.patient?.mobile || '',
    age: String(item.age != null && item.age !== '' ? item.age : (item.patient?.age != null ? item.patient.age : '')),
    gender: item.gender || item.patient?.gender || 'male',
    contactMobile: item.contactMobile || item.patient?.mobile || item.contact || '',
    address: item.address || item.patient?.address || '',
    villageCity: item.villageCity || item.patient?.village || '',
    taluka: item.taluka || item.patient?.taluka || '',
    district: item.district || item.patient?.district || 'Pune',
    pincode: item.pincode || item.patient?.pincode || '',
    relativeName: item.relativeName || item.relative?.name || undefined,
    relativePhone: item.relativePhone || item.relative?.phone || undefined,
    relativeRelation: item.relativeRelation || item.relative?.relation || undefined,
    treatmentType: item.treatmentType || item.type || 'ipd',
    hospitalName: hospitalName || '',
    hospitalId: item.hospitalId || item.active_assignment?.hospital_id || undefined,
    hospitalAddress: item.hospitalAddress || item.hospital_address || item.active_assignment?.hospital_address || undefined,
    hospitalCity: item.hospitalCity || item.hospital_city || item.active_assignment?.hospital_city || undefined,
    hospitalDistrict: item.hospitalDistrict || item.hospital_district || item.active_assignment?.hospital_district || undefined,
    hospitalPhone: item.hospitalPhone || item.hospital_phone || item.active_assignment?.hospital_phone || undefined,
    admissionDate: item.admissionDate || item.admission_date || item.visitDate || item.visit_date || item.active_assignment?.admission_date || undefined,
    visitDate: item.visitDate || item.visit_date || item.admissionDate || item.admission_date || item.active_assignment?.visit_date || item.active_assignment?.admission_date || undefined,
    preferredAdmissionDate: item.preferredAdmissionDate || item.admissionDate || item.admission_date || item.active_assignment?.admission_date || undefined,
    referralFullName: item.referralFullName || item.referral_name || (item.referralFirstName ? `${item.referralFirstName} ${item.referralLastName || ''}`.trim() : undefined),
    referralType: item.referralType || item.referral_type || undefined,
    referralCustomType: item.referralCustomType || item.referral_custom_type || undefined,
    referralFirstName: item.referralFirstName || undefined,
    referralLastName: item.referralLastName || undefined,
    referredBy: item.referredBy || item.referred_by || undefined,
    medicalCauseNote: item.medicalCauseNote || item.condition || undefined,
    appliedDate: safeFormatDate(item.submittedDate || item.submittedAt || item.createdAt, { day: '2-digit', month: 'long', year: 'numeric' }, 'आज'),
    status: normalizedStatus,
    sanctionedAmount: item.sanctionedAmount || (item.rawSanctionedAmount ? `₹${item.rawSanctionedAmount.toLocaleString('en-IN')}` : undefined),
    rawSanctionedAmount: item.rawSanctionedAmount != null ? Number(item.rawSanctionedAmount) : null,
    assignedSevak,
    timeline,
    documents,
    revertDetails,
    remarks: item.remarks || (Array.isArray(item.notes) && item.notes.length > 0 ? item.notes[0] : undefined),
    adminRemarks: item.adminRemarks || undefined,
    rejectionReason: item.rejectionReason || item.remarks || undefined,
    rejectedDate: item.rejectedDate || item.closed_at || item.closedAt || item.updated_at,
    reopenWindow,
    reopenRequested: Boolean(item.reopenRequested || item.reopen_requested || item.reopenInfo?.reopenRequested || reopenWindow?.reopenRequested),
    reopenRequestedAt: item.reopenRequestedAt || item.reopen_requested_at || item.reopenInfo?.reopenRequestedAt || reopenWindow?.reopenRequestedAt || undefined,
    reopenRequestReason: item.reopenRequestReason || item.reopen_request_reason || item.reopenInfo?.reopenRequestReason || reopenWindow?.reopenRequestReason || undefined,
    submittedAt: item.submittedAt || item.submitted_at || item.createdAt || item.created_at,
    reviewedAt: item.reviewedAt || item.reviewed_at,
    completedAt: item.completedAt || item.completed_at,
    createdAt: item.createdAt || item.created_at,
    updatedAt: item.updatedAt || item.updated_at,
    lastReminderSentAt: item.lastReminderSentAt || item.last_reminder_sent_at || undefined,
    reminderCount: item.reminderCount != null ? Number(item.reminderCount) : (item.reminder_count != null ? Number(item.reminder_count) : 0),
  };
}

class ApplicationStore {
  private cache: SchemeApplication[] | null = null;
  private activeUserId: string | null = null;

  public setActiveUser(userIdentifier: string | null) {
    if (this.activeUserId !== userIdentifier) {
      this.activeUserId = userIdentifier;
      this.cache = null;
    }
  }

  public clearCache() {
    this.cache = null;
    this.activeUserId = null;
  }

  private getStorageKey(): string {
    if (!this.activeUserId) return '@arogyamitra_citizen_applications_guest';
    const cleanId = String(this.activeUserId).replace(/[^\w-]/g, '');
    return `@arogyamitra_citizen_applications_${cleanId}`;
  }

  /**
   * Get applications for the logged-in citizen:
   * 1. Fetches live data from backend API (GET /api/applications/my).
   * 2. Saves to user-scoped AsyncStorage.
   * 3. Falls back to user-scoped AsyncStorage if offline.
   */
  async getApplications(forceRefresh: boolean = false): Promise<SchemeApplication[]> {
    if (!forceRefresh && this.cache && this.cache.length > 0) {
      return this.cache;
    }

    // 1. Try to fetch from Live Backend API
    try {
      const response = await applicationApi.getMyApplications();
      if (response && response.success && response.data) {
        const rawList = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data.applications)
          ? response.data.applications
          : [];

        const serverApps: SchemeApplication[] = rawList.map(normalizeServerApplication);

        this.cache = serverApps;
        await AsyncStorage.setItem(this.getStorageKey(), JSON.stringify(serverApps));
        return serverApps;
      }
    } catch (apiErr) {
      console.warn('[ApplicationStore] Live API fetch notice, reading from offline cache:', apiErr);
    }

    // 2. Offline / Fallback read from user-scoped AsyncStorage
    try {
      const storageKey = this.getStorageKey();
      const stored = await AsyncStorage.getItem(storageKey);
      if (stored) {
        const parsed: SchemeApplication[] = JSON.parse(stored);
        this.cache = parsed;
        return parsed || [];
      }
      this.cache = [];
      return [];
    } catch (err) {
      console.error('[ApplicationStore] Local storage read error:', err);
      return [];
    }
  }

  /**
   * Get single application by ID / Case ID:
   * 1. Fetches latest case details from backend (GET /api/applications/:id).
   * 2. Updates local cache and AsyncStorage.
   * 3. Falls back to cached application if offline.
   */
  async getApplicationById(id: string, forceRefresh: boolean = false): Promise<SchemeApplication | null> {
    if (!id) return null;

    // 1. Try to fetch live detail from Backend API
    try {
      const response = await applicationApi.getApplicationById(id);
      if (response && response.success && response.data) {
        const normalized = normalizeServerApplication(response.data);
        // Update item in cache & storage
        await this.updateCachedApplication(normalized);
        return normalized;
      }
    } catch (apiErr) {
      console.warn(`[ApplicationStore] Live API getApplicationById('${id}') notice:`, apiErr);
    }

    // 2. Fallback to cached list
    const list = await this.getApplications(forceRefresh);
    const target = id.toLowerCase();
    return (
      list.find(
        (app) =>
          app.id.toLowerCase() === target ||
          (app.caseId && app.caseId.toLowerCase() === target) ||
          (app.applicationNumber && app.applicationNumber.toLowerCase() === target)
      ) || null
    );
  }

  /**
   * Add a newly submitted application to the local cache and storage
   */
  async addApplication(newApp: Partial<SchemeApplication>): Promise<SchemeApplication> {
    const list = await this.getApplications();

    const createdDate = new Date().toLocaleDateString('mr-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const caseId = newApp.id || `AA-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const application: SchemeApplication = {
      id: caseId,
      caseId,
      applicationNumber: caseId,
      schemeId: newApp.schemeId || 'pmjay',
      schemeName:
        newApp.schemeName ||
        (newApp.schemeId === 'mjpjay'
          ? 'महात्मा ज्योतिराव फुले जन आरोग्य योजना (MJPJAY)'
          : 'आयुष्मान भारत PM-JAY योजना'),
      patientName: newApp.patientName || 'नागरिक',
      age: newApp.age || '30',
      gender: newApp.gender || 'male',
      contactMobile: newApp.contactMobile || '9876543210',
      address: newApp.address || '',
      villageCity: newApp.villageCity,
      taluka: newApp.taluka,
      district: newApp.district,
      pincode: newApp.pincode,
      relativeName: newApp.relativeName,
      relativePhone: newApp.relativePhone,
      relativeRelation: newApp.relativeRelation,
      treatmentType: newApp.treatmentType || 'ipd',
      hospitalName: newApp.hospitalName || 'शासकीय रुग्णालय',
      medicalCauseNote: newApp.medicalCauseNote,
      referralFullName: newApp.referralFullName || (newApp.referralFirstName ? `${newApp.referralFirstName} ${newApp.referralLastName || ''}`.trim() : undefined),
      referralType: newApp.referralType,
      referralCustomType: newApp.referralCustomType,
      referralFirstName: newApp.referralFirstName,
      referralLastName: newApp.referralLastName,
      referredBy: newApp.referredBy,
      appliedDate: createdDate,
      status: 'SUBMITTED',
      assignedSevak: {
        name: 'सुनिता देशमुख',
        phone: '9823012345',
        role: 'आरोग्य मित्र',
      },
      timeline: [
        {
          id: 'step-1',
          title: 'अर्ज सादर केला',
          titleKey: 'timelineSubmitted',
          description: 'नागरिकाकडून अर्ज सादर करण्यात आला.',
          date: `${createdDate}, ${timeStr}`,
          status: 'COMPLETED',
          completed: true,
        },
        {
          id: 'step-2',
          title: 'कागदपत्र पडताळणी',
          titleKey: 'timelineDocs',
          description: 'कागदपत्रांची प्राथमिक तपासणी सुरू आहे.',
          status: 'IN_PROGRESS',
          current: true,
        },
        {
          id: 'step-3',
          title: 'सेवक तपासणी व शिफारस',
          titleKey: 'timelineSevak',
          description: 'आरोग्य सेवक प्रत्यक्ष पडताळणी करतील.',
          status: 'PENDING',
        },
        {
          id: 'step-4',
          title: 'योजना मंजुरी व पत्र',
          titleKey: 'timelineApproval',
          description: 'अंतिम शासकीय मान्यता.',
          status: 'PENDING',
        },
      ],
      documents: newApp.documents || [],
      remarks: newApp.remarks,
    };

    const updated = [application, ...list.filter((a) => a.id.toLowerCase() !== caseId.toLowerCase())];
    this.cache = updated;
    await AsyncStorage.setItem(this.getStorageKey(), JSON.stringify(updated));
    return application;
  }

  /**
   * Submit requested document when application is REVERTED / DOCS_REQUIRED:
   * 1. Calls POST /api/applications/:id/resubmit-doc on the server.
   * 2. Updates local state and caches result.
   */
  async resolveRevertedCase(
    applicationId: string,
    resubmittedDoc: UploadedDoc,
    citizenRemark?: string
  ): Promise<SchemeApplication | null> {
    const list = await this.getApplications();
    const index = list.findIndex(
      (app) =>
        app.id.toLowerCase() === applicationId.toLowerCase() ||
        (app.caseId && app.caseId.toLowerCase() === applicationId.toLowerCase())
    );

    const nowStr = new Date().toLocaleDateString('mr-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Send to Backend API
    try {
      const response = await applicationApi.resubmitDocument(applicationId, {
        document: {
          name: resubmittedDoc.name,
          file_url: resubmittedDoc.file_url || resubmittedDoc.uri,
          uri: resubmittedDoc.file_url || resubmittedDoc.uri,
          size: resubmittedDoc.size,
          category: resubmittedDoc.category,
          source: resubmittedDoc.source,
          type: resubmittedDoc.type,
        },
        citizenRemark: citizenRemark || undefined,
      });

      if (response && response.success && response.data) {
        const normalized = normalizeServerApplication(response.data);
        await this.updateCachedApplication(normalized);
        return normalized;
      }
    } catch (apiErr) {
      console.warn(`[ApplicationStore] Live resubmitDocument API error for '${applicationId}':`, apiErr);
    }

    // 2. Fallback local state update
    if (index === -1) return null;
    const current = list[index];

    const updatedRevert: RevertDetails = current.revertDetails
      ? {
          ...current.revertDetails,
          isResolved: true,
          resubmittedDoc,
          resubmittedRemark: citizenRemark,
          resubmittedDate: `${nowStr}, ${timeStr}`,
        }
      : {
          requestedDocName: resubmittedDoc.name,
          reason: 'Resubmitted by citizen',
          isResolved: true,
          resubmittedDoc,
          resubmittedRemark: citizenRemark,
          resubmittedDate: `${nowStr}, ${timeStr}`,
        };

    const updatedTimeline = current.timeline.map((step) => {
      if (step.id === 'step-2') {
        return {
          ...step,
          title: 'कागदपत्र पुनर्पडताळणी',
          status: 'IN_PROGRESS' as const,
          description: `नागरिकाने मागितलेले कागदपत्र (${resubmittedDoc.name}) सादर केले. पुनर्पडताळणी सुरू आहे.`,
          date: `${nowStr}, ${timeStr}`,
          completed: false,
          current: true,
        };
      }
      return step;
    });

    const updatedApp: SchemeApplication = {
      ...current,
      status: 'IN_REVIEW',
      revertDetails: updatedRevert,
      timeline: updatedTimeline,
      documents: [...current.documents.filter((d) => d.name !== resubmittedDoc.name), resubmittedDoc],
    };

    list[index] = updatedApp;
    this.cache = [...list];
    await AsyncStorage.setItem(this.getStorageKey(), JSON.stringify(list));
    return updatedApp;
  }

  private async updateCachedApplication(app: SchemeApplication): Promise<void> {
    const list = this.cache || (await this.getApplications());
    const target = app.id.toLowerCase();
    const index = list.findIndex(
      (a) =>
        a.id.toLowerCase() === target ||
        (a.caseId && a.caseId.toLowerCase() === target) ||
        (a.applicationNumber && a.applicationNumber.toLowerCase() === target)
    );

    let updated: SchemeApplication[];
    if (index >= 0) {
      updated = [...list];
      updated[index] = app;
    } else {
      updated = [app, ...list];
    }

    this.cache = updated;
    await AsyncStorage.setItem(this.getStorageKey(), JSON.stringify(updated));
  }

  /**
   * Send escalation reminder to Admin when case SLA has elapsed (e.g. Critical 1hr, High 6hrs)
   */
  async sendAdminReminder(applicationId: string, customMessage?: string): Promise<{ success: boolean; message: string }> {
    const nowIso = new Date().toISOString();
    const nowStr = new Date().toLocaleDateString('mr-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Send live API reminder
    try {
      const res = await applicationApi.remindAdmin(applicationId, {
        message: customMessage || undefined,
      });

      if (res && res.success) {
        // Update local reminder timestamp
        const list = await this.getApplications();
        const index = list.findIndex(
          (app) =>
            app.id.toLowerCase() === applicationId.toLowerCase() ||
            (app.caseId && app.caseId.toLowerCase() === applicationId.toLowerCase())
        );
        if (index >= 0) {
          list[index] = {
            ...list[index],
            lastReminderSentAt: nowIso,
            reminderCount: (list[index].reminderCount || 0) + 1,
          };
          this.cache = [...list];
          await AsyncStorage.setItem(this.getStorageKey(), JSON.stringify(list));
        }

        return {
          success: true,
          message: `स्मरणपत्र प्रशासकास पाठवले आहे (${timeStr}). आमचे अधिकारी त्वरित लक्ष देतील.`,
        };
      }
    } catch (apiErr) {
      console.warn(`[ApplicationStore] remindAdmin API notice:`, apiErr);
    }

    // 2. Offline / local fallback
    const list = await this.getApplications();
    const index = list.findIndex(
      (app) =>
        app.id.toLowerCase() === applicationId.toLowerCase() ||
        (app.caseId && app.caseId.toLowerCase() === applicationId.toLowerCase())
    );
    if (index >= 0) {
      list[index] = {
        ...list[index],
        lastReminderSentAt: nowIso,
        reminderCount: (list[index].reminderCount || 0) + 1,
      };
      this.cache = [...list];
      await AsyncStorage.setItem(this.getStorageKey(), JSON.stringify(list));
    }

    return {
      success: true,
      message: `स्मरणपत्र नोंदवले गेले आहे (${timeStr}).`,
    };
  }

  /**
   * Citizen request to reopen a rejected application within the 60-day window
   * Sends request to Admin Desk. Case remains REJECTED until Admin approves reopening.
   */
  async requestCaseReopen(applicationId: string, reason: string = ''): Promise<{ success: boolean; message: string }> {
    const finalReason = reason.trim() || 'नागरिकाकडून ६० दिवसांच्या मुदतीत अर्ज फेरविचार विनंती दाखल करण्यात आली.';

    // 1. Live API call
    try {
      const res = await applicationApi.requestReopen(applicationId, {
        reason: finalReason,
        remarks: finalReason,
      });

      if (res && res.success) {
        // Invalidate cache to fetch fresh state
        this.cache = null;
        return {
          success: true,
          message: 'अर्ज फेरविचार विनंती प्रशासनाकडे यशस्वीपणे पाठवली आहे (Reopen Request Sent to Admin). प्रशासकीय पडताळणीनंतर अर्ज पुन्हा सुरू केला जाईल.',
        };
      }
    } catch (apiErr: any) {
      console.warn(`[ApplicationStore] requestReopen API notice:`, apiErr?.message || apiErr);
      if (apiErr?.response?.data?.message) {
        return {
          success: false,
          message: apiErr.response.data.message,
        };
      }
    }

    // 2. Offline / local fallback
    const list = await this.getApplications();
    const index = list.findIndex(
      (app) =>
        app.id.toLowerCase() === applicationId.toLowerCase() ||
        (app.caseId && app.caseId.toLowerCase() === applicationId.toLowerCase())
    );

    if (index >= 0) {
      list[index] = {
        ...list[index],
        reopenRequested: true,
        reopenRequestedAt: new Date().toISOString(),
        reopenRequestReason: finalReason,
        remarks: `[REOPEN REQUESTED] ${finalReason}`,
      };
      this.cache = [...list];
      await AsyncStorage.setItem(this.getStorageKey(), JSON.stringify(list));
    }

    return {
      success: true,
      message: 'अर्ज फेरविचार विनंती प्रशासनाकडे यशस्वीपणे पाठवली आहे. प्रशासकीय पडताळणीनंतर अर्ज पुन्हा उघडला जाईल.',
    };
  }

  async resetToDefaults(): Promise<void> {
    this.cache = [];
    await AsyncStorage.removeItem(this.getStorageKey());
  }
}

export const applicationStore = new ApplicationStore();
