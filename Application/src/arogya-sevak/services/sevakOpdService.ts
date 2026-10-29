import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../../api/client';
import { uploadDocumentToS3 } from '../../api/s3Api';
import { storage } from '../../shared/services/storage/storage';
import { APP_CONFIG } from '../../shared/constants/config';
import { UserProfile } from '../../shared/types/common.types';
import {
  OpdVisitEntry,
  OpdStats,
  OpdDepartment,
  OpdVisitType,
  OpdSchemeEligibility,
  OpdPrescriptionDoc,
} from '../types/sevakOpd.types';

const BASE_STORAGE_KEY = '@arogyamitra_sevak_opd_visits_v3';

// In-Memory RAM Cache for Blazing Fast Instant UI Navigation
let memoryOpdVisits: OpdVisitEntry[] | null = null;
let memoryOpdVisitsTimestamp = 0;
const CACHE_TTL_MS = 30000; // 30 seconds

const getStorageKey = async (): Promise<string> => {
  try {
    const user = await storage.getItem<UserProfile>(APP_CONFIG.STORAGE_KEYS.USER_PROFILE);
    if (user?.id) return `${BASE_STORAGE_KEY}_${user.id}`;
    if (user?.phoneNumber) return `${BASE_STORAGE_KEY}_${user.phoneNumber}`;
  } catch (_) {}
  return BASE_STORAGE_KEY;
};

const getTodayString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getNowTimeString = (): string => {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const getFormattedTimestamp = (): string => {
  const d = new Date();
  const dateStr = d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return `${dateStr}, ${timeStr}`;
};

export const INITIAL_OPD_VISITS: OpdVisitEntry[] = [];

/**
 * Normalizes backend visit record into typed OpdVisitEntry
 */
const normalizeVisit = (raw: any): OpdVisitEntry => {
  let prescriptionDoc: OpdPrescriptionDoc | undefined = undefined;
  if (raw.prescriptionDoc) {
    prescriptionDoc = typeof raw.prescriptionDoc === 'string' ? JSON.parse(raw.prescriptionDoc) : raw.prescriptionDoc;
  } else if (raw.prescription_doc_data) {
    prescriptionDoc = typeof raw.prescription_doc_data === 'string' ? JSON.parse(raw.prescription_doc_data) : raw.prescription_doc_data;
  } else if (raw.prescriptionFileUrl || raw.prescription_file_url) {
    prescriptionDoc = {
      id: `rx-${raw.id}`,
      name: 'Prescription_Document.jpg',
      uri: raw.prescriptionFileUrl || raw.prescription_file_url,
      type: 'image/jpeg',
      source: 'device',
      uploadedAt: raw.entryTime || raw.entry_time || 'Prescription',
    };
  }

  const visitDate = raw.date || (raw.visit_date ? String(raw.visit_date).split('T')[0] : getTodayString());

  return {
    id: String(raw.id || `opd-${Date.now()}`),
    tokenNumber: raw.tokenNumber || raw.token_number || 'OPD-101',
    caseId: raw.caseId || raw.case_id || raw.application_number || raw.application_id || 'GENERAL-OPD',
    patientName: raw.patientName || raw.patient_name || 'Patient',
    age: Number(raw.age) || 35,
    gender: (raw.gender || 'Other') as 'Male' | 'Female' | 'Other',
    contactPhone: raw.contactPhone || raw.contact_phone || '',
    abhaId: raw.abhaId || raw.abha_id || undefined,
    department: (raw.department || 'General Medicine') as OpdDepartment,
    consultingDoctor: raw.consultingDoctor || raw.doctor_name || undefined,
    visitType: (raw.visitType || raw.visit_type || 'New Consultation') as OpdVisitType,
    schemeEligibility: (raw.schemeEligibility || raw.scheme_eligibility || 'MJPJAY Eligible') as OpdSchemeEligibility,
    chiefComplaint: raw.chiefComplaint || raw.chief_complaint || raw.diagnosis || undefined,
    nextFollowUpRequired: Boolean(raw.nextFollowUpRequired ?? raw.follow_up_required),
    nextFollowUpTimeline: raw.nextFollowUpTimeline || raw.next_follow_up_timeline || undefined,
    followUpStatus: raw.followUpStatus || raw.follow_up_status || (raw.follow_up_required ? 'PENDING' : 'NOT_REQUIRED'),
    followUpResolvedAt: raw.followUpResolvedAt || raw.follow_up_resolved_at || undefined,
    followUpResolvedByVisitId: raw.followUpResolvedByVisitId || raw.follow_up_resolved_by_visit_id || undefined,
    entryTime: raw.entryTime || raw.entry_time || getNowTimeString(),
    date: visitDate,
    timestampFormatted: raw.timestampFormatted || raw.timestamp_formatted || getFormattedTimestamp(),
    recordedBy: raw.recordedBy || raw.recorded_by_name || 'Arogya Sevak',
    prescriptionDoc,
  };
};

export const sevakOpdService = {
  /**
   * Fetch all OPD visits with instant RAM cache and background refresh
   */
  async getAllOpdVisits(filter: string = 'ALL', search: string = '', forceRefresh = false): Promise<OpdVisitEntry[]> {
    const isBasicQuery = (!filter || filter === 'ALL') && (!search || !search.trim());

    // 1. Instant RAM Cache hit (0ms)
    if (!forceRefresh && isBasicQuery && memoryOpdVisits && memoryOpdVisits.length > 0 && Date.now() - memoryOpdVisitsTimestamp < CACHE_TTL_MS) {
      return memoryOpdVisits;
    }

    const storageKey = await getStorageKey();

    // 2. Read local AsyncStorage immediately if RAM is empty
    let localVisits: OpdVisitEntry[] = [];
    if (isBasicQuery && (!memoryOpdVisits || memoryOpdVisits.length === 0)) {
      try {
        const stored = await AsyncStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            localVisits = parsed;
            memoryOpdVisits = parsed;
            memoryOpdVisitsTimestamp = Date.now();
          }
        }
      } catch (_) {}
    }

    // Background fetch helper
    const fetchFromBackend = async (): Promise<OpdVisitEntry[]> => {
      try {
        const queryParams = new URLSearchParams();
        if (filter && filter !== 'ALL') queryParams.append('filter', filter);
        if (search && search.trim()) queryParams.append('search', search.trim());
        const queryStr = queryParams.toString() ? `?${queryParams.toString()}` : '';

        const res = await apiClient.get(`/opd-visits${queryStr}`);
        if (res?.success && res?.data?.visits && Array.isArray(res.data.visits)) {
          const normalized = res.data.visits.map(normalizeVisit);
          if (isBasicQuery) {
            memoryOpdVisits = normalized;
            memoryOpdVisitsTimestamp = Date.now();
            await AsyncStorage.setItem(storageKey, JSON.stringify(normalized)).catch(() => {});
          }
          return normalized;
        }
      } catch (e) {
        console.warn('[sevakOpdService] Failed to load from backend API, using local storage cache:', e);
      }
      return localVisits;
    };

    // If we have local or RAM data and not force refreshing, return instantly and sync in background
    if (localVisits.length > 0 && !forceRefresh) {
      fetchFromBackend().catch(() => {});
      return localVisits;
    }

    return await fetchFromBackend();
  },

  /**
   * Fetch today's OPD visits
   */
  async getTodayOpdVisits(forceRefresh = false): Promise<OpdVisitEntry[]> {
    const all = await this.getAllOpdVisits('ALL', '', forceRefresh);
    const today = getTodayString();
    return all.filter((v) => v.date === today);
  },

  /**
   * Fetch OPD visit log trace for a specific case (allocated case / application)
   */
  async getVisitsByCaseId(caseId: string): Promise<OpdVisitEntry[]> {
    if (!caseId) return [];

    try {
      const cleanCaseId = encodeURIComponent(caseId.trim());
      const res = await apiClient.get(`/opd-visits/case/${cleanCaseId}`);
      if (res?.success && res?.data?.visits && Array.isArray(res.data.visits)) {
        return res.data.visits.map(normalizeVisit);
      }
    } catch (e) {
      console.warn(`[sevakOpdService] Failed to fetch live trace for case ${caseId}:`, e);
    }

    // Filter from local cache
    const all = await this.getAllOpdVisits();
    return all.filter((v) => {
      if (!v.caseId) return false;
      return (
        v.caseId.toLowerCase() === caseId.toLowerCase() ||
        caseId.toLowerCase().includes(v.caseId.toLowerCase()) ||
        v.caseId.toLowerCase().includes(caseId.toLowerCase())
      );
    });
  },

  /**
   * Record a new OPD visit outcome and synchronize to database
   */
  async logNewOpdVisit(
    data: {
      caseId: string;
      patientName: string;
      age: number;
      gender: 'Male' | 'Female' | 'Other';
      contactPhone: string;
      abhaId?: string;
      department: OpdDepartment;
      consultingDoctor?: string;
      visitType: OpdVisitType;
      schemeEligibility: OpdSchemeEligibility;
      chiefComplaint?: string;
      nextFollowUpRequired: boolean;
      nextFollowUpTimeline?: string;
      recordedBy?: string;
      prescriptionDoc?: OpdPrescriptionDoc;
    }
  ): Promise<OpdVisitEntry> {
    const storageKey = await getStorageKey();
    const today = getTodayString();
    const nowTime = getNowTimeString();
    const nowTimestamp = getFormattedTimestamp();

    let finalPrescriptionDoc = data.prescriptionDoc;
    let prescriptionUrl = data.prescriptionDoc?.uri || null;

    // Direct S3 Upload for local images/documents
    if (finalPrescriptionDoc?.uri && !finalPrescriptionDoc.uri.startsWith('http')) {
      try {
        const s3Url = await uploadDocumentToS3(
          finalPrescriptionDoc.uri,
          finalPrescriptionDoc.name || 'Prescription.jpg',
          finalPrescriptionDoc.type || 'image/jpeg',
          'prescriptions',
          'opd'
        );
        if (s3Url) {
          prescriptionUrl = s3Url;
          finalPrescriptionDoc = {
            ...finalPrescriptionDoc,
            uri: s3Url,
          };
        }
      } catch (s3Err) {
        console.warn('[sevakOpdService] S3 prescription upload notice:', s3Err);
      }
    }

    // Prepare payload for backend API
    const payload = {
      case_id: data.caseId,
      patient_name: data.patientName,
      age: data.age,
      gender: data.gender,
      contact_phone: data.contactPhone,
      abha_id: data.abhaId || null,
      department: data.department,
      doctor_name: data.consultingDoctor?.trim() || null,
      visit_type: data.visitType,
      scheme_eligibility: data.schemeEligibility,
      chief_complaint: data.chiefComplaint?.trim() || null,
      diagnosis: data.chiefComplaint?.trim() || `${data.visitType} at ${data.department}`,
      follow_up_required: data.nextFollowUpRequired,
      next_follow_up_timeline: data.nextFollowUpRequired ? (data.nextFollowUpTimeline || 'In 7 Days') : null,
      follow_up_status: data.nextFollowUpRequired ? 'PENDING' : 'NOT_REQUIRED',
      recorded_by_name: data.recordedBy || 'Arogya Sevak',
      prescription_file_url: prescriptionUrl,
      prescription_doc_data: finalPrescriptionDoc || null,
      date: today,
      entry_time: nowTime,
      timestamp_formatted: nowTimestamp,
    };

    let serverVisit: OpdVisitEntry | null = null;
    try {
      const res = await apiClient.post('/opd-visits', payload);
      const visitData = res?.data?.visit || (res?.data && (res.data.id || res.data.tokenNumber || res.data.token_number) ? res.data : null);
      if (res?.success && visitData) {
        serverVisit = normalizeVisit(visitData);
      }
    } catch (err) {
      console.warn('[sevakOpdService] Error creating visit on backend:', err);
    }

    // Local state calculation
    const allVisits = await this.getAllOpdVisits();
    const tokenNum = 100 + allVisits.filter((v) => v.date === today).length + 1;
    const newVisitId = serverVisit?.id || `opd-${Date.now()}`;

    // Auto-resolve any previous pending follow-ups for this case
    let updatedPreviousVisits = [...allVisits];
    if (data.visitType === 'Follow-Up') {
      updatedPreviousVisits = updatedPreviousVisits.map((v) => {
        if (v.caseId === data.caseId && v.followUpStatus === 'PENDING') {
          return {
            ...v,
            followUpStatus: 'DONE' as const,
            followUpResolvedAt: nowTimestamp,
            followUpResolvedByVisitId: newVisitId,
          };
        }
        return v;
      });
    }

    const finalVisit: OpdVisitEntry = serverVisit || {
      id: newVisitId,
      tokenNumber: `OPD-${tokenNum}`,
      caseId: data.caseId,
      patientName: data.patientName,
      age: data.age,
      gender: data.gender,
      contactPhone: data.contactPhone,
      abhaId: data.abhaId,
      department: data.department,
      consultingDoctor: data.consultingDoctor?.trim() || undefined,
      visitType: data.visitType,
      schemeEligibility: data.schemeEligibility,
      chiefComplaint: data.chiefComplaint?.trim() || undefined,
      nextFollowUpRequired: data.nextFollowUpRequired,
      nextFollowUpTimeline: data.nextFollowUpRequired
        ? data.nextFollowUpTimeline || 'In 7 Days'
        : undefined,
      followUpStatus: data.nextFollowUpRequired ? 'PENDING' : 'NOT_REQUIRED',
      entryTime: nowTime,
      date: today,
      timestampFormatted: nowTimestamp,
      recordedBy: data.recordedBy || 'Arogya Sevak',
      prescriptionDoc: data.prescriptionDoc,
    };

    const finalVisits = [finalVisit, ...updatedPreviousVisits.filter((v) => v.id !== finalVisit.id)];
    memoryOpdVisits = finalVisits;
    memoryOpdVisitsTimestamp = Date.now();
    await AsyncStorage.setItem(storageKey, JSON.stringify(finalVisits)).catch(() => {});

    return finalVisit;
  },

  /**
   * Resolve follow-up status for an OPD visit
   */
  async resolveFollowUp(visitId: string): Promise<boolean> {
    const storageKey = await getStorageKey();
    const nowTimestamp = getFormattedTimestamp();

    try {
      await apiClient.patch(`/opd-visits/${visitId}/resolve-follow-up`, {
        resolvedAt: nowTimestamp,
      });
    } catch (e) {
      console.warn(`[sevakOpdService] Failed to resolve follow-up for visit ${visitId} via API:`, e);
    }

    try {
      const all = await this.getAllOpdVisits();
      const updated = all.map((v) => {
        if (v.id === visitId) {
          return {
            ...v,
            followUpStatus: 'DONE' as const,
            followUpResolvedAt: nowTimestamp,
          };
        }
        return v;
      });
      memoryOpdVisits = updated;
      memoryOpdVisitsTimestamp = Date.now();
      await AsyncStorage.setItem(storageKey, JSON.stringify(updated)).catch(() => {});
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Compute or fetch OPD statistics
   */
  async getOpdStats(): Promise<OpdStats> {
    try {
      const res = await apiClient.get('/opd-visits/stats');
      if (res?.success && res?.data) {
        const d = res.data;
        return {
          totalVisits: Number(d.totalVisits ?? d.total_visits ?? d.total ?? 0),
          todayCount: Number(d.todayCount ?? d.today_count ?? d.today ?? 0),
          followUpRequiredCount: Number(d.followUpRequiredCount ?? d.follow_up_required_count ?? d.pending ?? 0),
          followUpDoneCount: Number(d.followUpDoneCount ?? d.follow_up_done_count ?? d.done ?? 0),
        };
      }
    } catch (_) {}

    const all = await this.getAllOpdVisits();
    const today = getTodayString();

    const todayCount = all.filter((v) => v.date === today || (v.timestampFormatted && v.timestampFormatted.includes(today))).length;
    const followUpRequiredCount = all.filter((v) => v.followUpStatus === 'PENDING').length;
    const followUpDoneCount = all.filter((v) => v.followUpStatus === 'DONE').length;

    return {
      totalVisits: all.length,
      todayCount,
      followUpRequiredCount,
      followUpDoneCount,
    };
  },
};

export default sevakOpdService;
