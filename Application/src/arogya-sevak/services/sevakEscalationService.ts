import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../../api/client';
import { uploadDocumentToS3 } from '../../api/s3Api';
import { APP_CONFIG } from '../../shared/constants/config';

export interface DynamicEscalationItem {
  id: string; // e.g. "ESC-8912"
  uuid: string;
  caseId: string; // Application Number / Case ID
  applicationId: string;
  patientName: string;
  ageGender: string;
  ward: string;
  scheme: string;
  schemeLimit: string;
  reasonType: 'bill_exceeded' | 'specialty_unavailable' | string;
  reasonTitle: string;
  reasonBadge: string;
  status: 'on_hold' | 'resolved' | string;
  statusLabel: string;
  statusBadge: string;
  requiredSpecialty?: string;
  estimatedBill?: string;
  remarks?: string;
  attachment?: string | null;
  attachmentUrl?: string | null;
  submittedAt: string;
  submittedBy: string;
  assignedHospital?: string;
  sanctionedScheme?: string;
  resolutionNotes?: string;
  putOnHold: boolean;
  hospitalName?: string;
  hospitalDistrict?: string;
  createdAt?: string;
  resolvedAt?: string;
}

export interface EscalationStats {
  all: number;
  onHold: number;
  resolved: number;
  billExceeded: number;
  specialtyUnavailable: number;
}

export const sevakEscalationService = {
  /**
   * Fetch all urgent priority requests for the current Arogya Sevak
   */
  async getEscalations(params?: {
    status?: string;
    search?: string;
    reasonType?: string;
  }): Promise<{
    requests: DynamicEscalationItem[];
    stats: EscalationStats;
    total: number;
  }> {
    let currentProfile: any = null;
    try {
      const userProfileStr = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.USER_PROFILE);
      currentProfile = userProfileStr ? JSON.parse(userProfileStr) : null;
    } catch (_) {}

    const sevakId = currentProfile?.id || currentProfile?.sevakId || '';
    const sevakPhone = currentProfile?.phoneNumber || currentProfile?.mobile || '';
    const sevakName = currentProfile?.name || '';
    const cacheKey = `@arogyamitra_sevak_escalations_cache_${sevakId || sevakPhone || 'default'}`;
    const statsCacheKey = `@arogyamitra_sevak_escalations_stats_cache_${sevakId || sevakPhone || 'default'}`;

    try {
      const queryParams = new URLSearchParams();
      if (params?.status && params.status !== 'ALL') queryParams.append('status', params.status);
      if (params?.search) queryParams.append('search', params.search);
      if (params?.reasonType) queryParams.append('reasonType', params.reasonType);
      if (sevakId) queryParams.append('sevakId', sevakId);
      if (sevakPhone) queryParams.append('sevakPhone', sevakPhone);
      if (sevakName) queryParams.append('sevakName', sevakName);

      const qs = queryParams.toString();
      const endpoint = qs ? `/escalations?${qs}` : '/escalations';

      const res = await apiClient.get(endpoint);
      if (res?.data?.requests && Array.isArray(res.data.requests)) {
        const stats: EscalationStats = res.data.stats || {
          all: res.data.requests.length,
          onHold: res.data.requests.filter((r: any) => r.status === 'on_hold').length,
          resolved: res.data.requests.filter((r: any) => r.status === 'resolved').length,
          billExceeded: res.data.requests.filter((r: any) => r.reasonType === 'bill_exceeded').length,
          specialtyUnavailable: res.data.requests.filter((r: any) => r.reasonType === 'specialty_unavailable').length,
        };

        await AsyncStorage.setItem(cacheKey, JSON.stringify(res.data.requests));
        await AsyncStorage.setItem(statsCacheKey, JSON.stringify(stats));

        return {
          requests: res.data.requests,
          stats,
          total: res.data.total || res.data.requests.length,
        };
      }
    } catch (apiErr) {
      console.warn('[sevakEscalationService] Remote fetch error, reading cache:', apiErr);
    }

    // Fallback to local user-specific cache if offline
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      const cachedStats = await AsyncStorage.getItem(statsCacheKey);
      const requests: DynamicEscalationItem[] = cached ? JSON.parse(cached) : [];
      const stats: EscalationStats = cachedStats
        ? JSON.parse(cachedStats)
        : {
            all: requests.length,
            onHold: requests.filter((r) => r.status === 'on_hold').length,
            resolved: requests.filter((r) => r.status === 'resolved').length,
            billExceeded: requests.filter((r) => r.reasonType === 'bill_exceeded').length,
            specialtyUnavailable: requests.filter((r) => r.reasonType === 'specialty_unavailable').length,
          };

      return {
        requests,
        stats,
        total: requests.length,
      };
    } catch {
      return {
        requests: [],
        stats: { all: 0, onHold: 0, resolved: 0, billExceeded: 0, specialtyUnavailable: 0 },
        total: 0,
      };
    }
  },

  /**
   * Upload supportive bill or specialty document directly via S3 Presigned URL
   */
  async uploadEscalationDocument(
    file: { uri: string; name?: string; type?: string },
    applicationId?: string
  ): Promise<string> {
    const fileName = file.name || `escalation_doc_${Date.now()}.jpg`;
    const fileType = file.type || 'image/jpeg';

    return await uploadDocumentToS3(
      file.uri,
      fileName,
      fileType,
      'escalation_attachments',
      'applications',
      applicationId
    );
  },

  /**
   * Create a new urgent priority request / escalation in PostgreSQL DB
   */
  async createEscalation(payload: {
    applicationId?: string;
    caseId?: string;
    reasonType: 'bill_exceeded' | 'specialty_unavailable' | 'scheme_denial' | 'other';
    escalationReason?: string;
    requiredSpecialty?: string;
    estimatedBill?: string;
    remarks?: string;
    description?: string;
    attachmentName?: string;
    attachmentUrl?: string;
    putOnHold?: boolean;
    sevakId?: string;
    sevakPhone?: string;
    sevakName?: string;
  }): Promise<DynamicEscalationItem> {
    let currentProfile: any = null;
    try {
      const userProfileStr = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.USER_PROFILE);
      currentProfile = userProfileStr ? JSON.parse(userProfileStr) : null;
    } catch (_) {}

    const res = await apiClient.post('/escalations', {
      applicationId: payload.applicationId,
      caseId: payload.caseId,
      reasonType: payload.reasonType,
      escalationReason: payload.escalationReason,
      requiredSpecialty: payload.requiredSpecialty,
      estimatedBill: payload.estimatedBill,
      remarks: payload.remarks,
      description: payload.description || payload.remarks,
      attachmentName: payload.attachmentName,
      attachmentUrl: payload.attachmentUrl,
      putOnHold: payload.putOnHold !== false,
      sevakId: payload.sevakId || currentProfile?.id || currentProfile?.sevakId,
      sevakPhone: payload.sevakPhone || currentProfile?.phoneNumber || currentProfile?.mobile,
      sevakName: payload.sevakName || currentProfile?.name,
    });

    if (res?.data) {
      return res.data;
    }
    throw new Error(res?.message || 'Failed to create urgent request');
  },
};
